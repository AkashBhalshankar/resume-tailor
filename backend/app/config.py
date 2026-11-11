import os

from dotenv import load_dotenv

load_dotenv()

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
MAX_PDF_MB = int(os.getenv("MAX_PDF_MB", "5"))
LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "120"))

# All providers speak the OpenAI-compatible chat API, so one client handles them all.
# Model names change often, so by default the app asks each provider which models it
# currently serves and picks a good one. Set *_MODEL in .env only if you want to pin one.
PROVIDERS = {
    "groq": ("https://api.groq.com/openai/v1/chat/completions", "GROQ_API_KEY", "GROQ_MODEL"),
    "gemini": ("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", "GEMINI_API_KEY", "GEMINI_MODEL"),
    "nvidia": ("https://integrate.api.nvidia.com/v1/chat/completions", "NVIDIA_API_KEY", "NVIDIA_MODEL"),
    "openrouter": ("https://openrouter.ai/api/v1/chat/completions", "OPENROUTER_API_KEY", "OPENROUTER_MODEL"),
}
ORDER = [p.strip() for p in os.getenv("LLM_PROVIDERS", "groq,gemini,nvidia,openrouter").split(",") if p.strip()]


def active_providers() -> list[dict]:
    """Providers that have a key set, in fallback order."""
    out = []
    for name in ORDER:
        if name not in PROVIDERS:
            continue
        url, key_env, model_env = PROVIDERS[name]
        key = os.getenv(key_env, "").strip()
        if key:
            out.append({"name": name, "url": url, "key": key, "model": os.getenv(model_env, "").strip() or None})
    return out