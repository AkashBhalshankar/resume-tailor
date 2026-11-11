import json
import logging
import re

import httpx
from fastapi import HTTPException

from . import config

log = logging.getLogger("llm")

# Which model to prefer on each provider, best first. Matched against the provider's live model list.
PREFER = {
    "groq": [r"^openai/gpt-oss-120b$", r"gpt-oss-120b", r"llama-3\.3-70b", r"gpt-oss-20b", r"llama.*70b"],
    "gemini": [r"^gemini-2\.\d+-flash$", r"^gemini-3\.8-flash$", r"^gemini-3\.\d+-flash$", r"^gemini-\d+(\.\d+)?-flash$", r"flash"],
    "nvidia": [r"^openai/gpt-oss-120b$", r"llama-3\.3-70b", r"nemotron.*(super|ultra)", r"llama-3\.1-70b", r"instruct"],
    "openrouter": [r"gpt-oss-120b:free$", r"llama-3\.3-70b.*:free$", r"gpt-oss-20b:free$", r":free$"],
}
# Models that cannot do plain text chat.
SKIP = re.compile(r"embed|tts|whisper|guard|safety|vision|image|audio|moderation|rerank|parse|clip|imagen|veo|live|transcri|speech|-vl\b|ocr|translat|compound", re.I)

_chosen: dict[str, str] = {}  # provider name -> model currently in use


def _http() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=config.LLM_TIMEOUT)


def _headers(p: dict) -> dict:
    return {"Authorization": f"Bearer {p['key']}", "Content-Type": "application/json"}


async def _list_models(p: dict) -> list[str]:
    async with _http() as client:
        res = await client.get(p["url"].replace("/chat/completions", "/models"), headers=_headers(p))
    res.raise_for_status()
    body = res.json()
    items = body.get("data") or body.get("models") or []
    return sorted({(m.get("id") or m.get("name") or "").removeprefix("models/") for m in items} - {""})


def _pick(ids: list[str], name: str, exclude=()) -> str | None:
    usable = [i for i in ids if i not in exclude and not SKIP.search(i)]
    for rx in PREFER[name]:
        for i in usable:
            if re.search(rx, i, re.I):
                return i
    return usable[0] if usable else None


async def _resolve(p: dict, exclude=()) -> str:
    if p["model"]:  # pinned in .env
        return p["model"]
    if _chosen.get(p["name"]) and _chosen[p["name"]] not in exclude:
        return _chosen[p["name"]]
    model = _pick(await _list_models(p), p["name"], exclude)
    if not model:
        raise ValueError("no usable chat model found")
    _chosen[p["name"]] = model
    log.info("provider %s: using model %s", p["name"], model)
    return model


async def _post(p: dict, model: str, system: str, user: str, max_tokens: int, temperature: float) -> str:
    reasoning = p["name"] == "gemini" or "gpt-oss" in model  # these think first, so give them room and ask for light thinking
    payload = {"model": model, "temperature": temperature, "max_tokens": max_tokens + (2000 if reasoning else 0),
               "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    if reasoning:
        payload["reasoning_effort"] = "low"
    async with _http() as client:
        res = await client.post(p["url"], headers=_headers(p), json=payload)
        if res.status_code == 400 and reasoning:  # provider doesn't accept reasoning_effort
            payload.pop("reasoning_effort")
            res = await client.post(p["url"], headers=_headers(p), json=payload)
    res.raise_for_status()
    text = (res.json()["choices"][0]["message"].get("content") or "").strip()
    if not text:
        raise ValueError("empty response")
    return text


async def _chat(p: dict, system: str, user: str, max_tokens: int, temperature: float) -> str:
    tried: set[str] = set()
    for _ in range(3):
        model = await _resolve(p, tried)
        try:
            return await _post(p, model, system, user, max_tokens, temperature)
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (404, 410) and not p["model"]:  # model retired: pick another one
                tried.add(model)
                _chosen.pop(p["name"], None)
                continue
            raise
    raise ValueError("no working model found")


def _extract_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    return json.loads(text[text.find("{") : text.rfind("}") + 1])


def _reason(e: Exception) -> str:
    if isinstance(e, httpx.HTTPStatusError):
        return f"{e.response.status_code} {e.response.text[:150]}".strip()
    return f"{type(e).__name__} {e}".strip()


async def _run(system: str, user: str, max_tokens: int, temperature: float, parse=None):
    """Tries each configured provider in order and returns the first usable result."""
    providers = config.active_providers()
    if not providers:
        raise HTTPException(500, "No AI provider key found. Add at least one key (GROQ_API_KEY, GEMINI_API_KEY, NVIDIA_API_KEY, OPENROUTER_API_KEY) to backend/.env and restart.")
    errors = []
    for p in providers:
        try:
            text = await _chat(p, system, user, max_tokens, temperature)
            return parse(text) if parse else text
        except Exception as e:  # network, auth, rate limit, bad JSON...
            reason = _reason(e)
            log.warning("provider %s failed: %s", p["name"], reason)
            errors.append(f"{p['name']} ({reason[:60]})")
    raise HTTPException(502, "All AI providers failed: " + "; ".join(errors))


def _parse_json(text: str, check) -> dict:
    data = _extract_json(text)
    if check:
        check(data)  # raise ValueError to make the next provider try again
    return data


async def ask_json(system: str, user: str, max_tokens: int = 4000, check=None) -> dict:
    return await _run(system + "\nReply with valid JSON only, no commentary.", user, max_tokens, 0.2,
                      parse=lambda t: _parse_json(t, check))


async def ask_text(system: str, user: str, max_tokens: int = 900) -> str:
    return await _run(system, user, max_tokens, 0.6)


async def test_providers() -> list[dict]:
    """Sends a tiny request to every configured provider so you can see what works."""
    results = []
    for p in config.active_providers():
        try:
            await _chat(p, "Reply with the single word OK.", "ping", 10, 0)
            results.append({"provider": p["name"], "model": p["model"] or _chosen.get(p["name"]), "ok": True})
        except Exception as e:
            results.append({"provider": p["name"], "model": p["model"] or _chosen.get(p["name"]), "ok": False, "error": _reason(e)})
    return results