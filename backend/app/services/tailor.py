import json
import re
from io import BytesIO

from fastapi import HTTPException
from pydantic import ValidationError

from .. import llm
from ..schemas import Analysis, Resume

PARSE_SYSTEM = """You convert raw resume text into JSON. Reply with ONLY a JSON object:
{"name": str,
 "title": str,
 "contact": {"email": str, "phone": str, "location": str, "links": [{"label": str, "url": str}]},
 "summary": str,
 "education": [{"school": str, "degree": str, "location": str, "dates": str}],
 "experience": [{"company": str, "role": str, "location": str, "dates": str, "bullets": [str]}],
 "projects": [{"name": str, "tech": str, "dates": str, "bullets": [str]}],
 "skills": [{"category": str, "items": [str]}],
 "certifications": [str],
 "leadership": [str]}
Rules: keep bullet wording exactly as written; merge lines wrapped by the PDF into one bullet; ignore page numbers;
internships and jobs go in experience; put certifications in certifications, and achievements and leadership in leadership;
use LINKS FOUND IN PDF for contact links (label like LinkedIn or GitHub); use "" for anything missing; never invent facts.
Extract a short professional summary/profile if present, else generate a tight 3-4 line summary for an AI/LLM Engineer (~2 years experience) using ONLY facts from the resume. 
The summary must state "~2 years of experience". Keep it concise, ATS-friendly, no buzzwords fluff."""


ANALYZE_SYSTEM = """You are a meticulous resume coach and ATS expert. Compare the RESUME with the JOB DESCRIPTION.
Reply with ONLY a JSON object:
{"match_score": int 0-100 (honest current alignment),
 "summary": "one short sentence naming the biggest gap",
 "keywords": [{"term": str, "tier": "must"|"nice", "matched": bool}],
 "suggestions": [{"id": "s1", "kind": "add"|"swap"|"skill",
   "target": {"section": "experience"|"projects"|"skills", "index": int, "bullet_index": int|null},
   "text": str, "why": str, "jd_line": str, "keywords": [str], "impact": int 1-8,
   "needs_metric": bool, "verified": bool}]}
Rules:
- Keywords: 10-18 concrete skills, tools or requirements from the JD. matched=true only if the resume already shows it.
- Suggestions: 5-8 suggestions, highest impact first.
- Action Verbs: ALL suggestions MUST start with a strong action verb (e.g., Engineered, Orchestrated, Optimized, Architected, Spearheaded, Developed, Deployed).
- Weak Verb Improvement: Analyze ALL bullet points in experience and projects. If a bullet uses a weak verb (e.g., "worked", "helped", "assisted", "managed") or lacks a strong action verb, suggest a swap to a powerful action verb.
- Metric-Driven: If a suggestion involves performance or results, it MUST include a placeholder metric (e.g., [X]%).
- Swap: Rewrite the existing bullet at bullet_index to fit the JD or improve the verb, using strong verbs and including metrics, without changing facts (verified=true).
- Add: A new bullet appended to that role/project; verified=true only if the resume clearly supports it, else false.
- Never invent employers, titles, numbers or tools. If a metric would help but is unknown, write a placeholder such as [X]% and set needs_metric=true.
- Bullets: Strong action verb first, at most 28 words, no first person.
- jd_line: the short exact JD phrase (max 20 words) that motivated the suggestion, or "Verb Improvement" if the suggestion is to improve the action verb.
- Total impact of all suggestions must not exceed 100 - match_score."""

COVER_SYSTEM = """You write {format_type} from a job candidate to a recruiter or hiring manager.
Write 3 short paragraphs (150 words max in total), separated by blank lines.
Focus on: who I am and why this role, concrete strengths drawn from the resume and highlights, and a polite call to action.
Use ONLY facts in the resume. No placeholders, no clichés, no subject line, plain text only."""


SHORTEN_SYSTEM = """You shorten resume bullets. Rewrite each bullet in at most 24 words.
Rules:
- Start with a strong action verb (e.g., Engineered, Orchestrated, Optimized).
- Keep every fact, number and tool name.
- No first person, no filler words.
- Do not add anything new.
- If a metric exists, preserve it. If it doesn't, add a placeholder [X]% if applicable.
Reply with ONLY JSON: {"bullets": [str]} with exactly the same number of items in the same order."""

def _indexed_view(r: Resume) -> str:
    lines = []
    for i, e in enumerate(r.experience):
        lines.append(f"experience[{i}] {e.role} @ {e.company} ({e.dates})")
        lines += [f"  bullet[{j}] {b}" for j, b in enumerate(e.bullets)]
    for i, p in enumerate(r.projects):
        lines.append(f"projects[{i}] {p.name} | {p.tech}")
        lines += [f"  bullet[{j}] {b}" for j, b in enumerate(p.bullets)]
    for i, g in enumerate(r.skills):
        lines.append(f"skills[{i}] {g.category}: {', '.join(g.items)}")
    for e in r.education:
        lines.append(f"education: {e.degree}, {e.school}")
    lines += [f"leadership: {a}" for a in r.leadership]
    return "\n".join(lines)


def _validate(model, data: dict):
    try:
        return model.model_validate(data)
    except ValidationError:
        raise HTTPException(502, "The AI returned data in an unexpected shape. Please try again.")


async def structure_resume(text: str) -> dict:
    data = await llm.ask_json(PARSE_SYSTEM, f"RESUME TEXT:\n{text}", max_tokens=4000)
    return _validate(Resume, data).model_dump()


async def analyze(resume: Resume, jd: str) -> dict:
    user = f"RESUME (indexed):\n{_indexed_view(resume)}\n\nJOB DESCRIPTION:\n{jd[:8000]}"
    a = _validate(Analysis, await llm.ask_json(ANALYZE_SYSTEM, user, max_tokens=4000))

    score = max(0, min(100, a.match_score))
    valid = []
    for s in a.suggestions:
        t = s.target
        if not s.text.strip():
            continue
        if t.section == "skills":
            if s.kind != "skill" or not 0 <= t.index < len(resume.skills):
                continue
            t.bullet_index = None
        else:
            seq = getattr(resume, t.section)
            if s.kind == "skill" or not 0 <= t.index < len(seq):
                continue
            bullets = seq[t.index].bullets
            if s.kind == "swap" and t.bullet_index is not None and 0 <= t.bullet_index < len(bullets):
                s.original = bullets[t.bullet_index]
            else:
                s.kind, t.bullet_index = "add", None
        s.impact = max(1, min(8, s.impact))
        s.id = f"s{len(valid) + 1}"
        valid.append(s)

    budget, total = 100 - score, sum(s.impact for s in valid)
    if total > budget:
        for s in valid:
            s.impact = max(1, round(s.impact * budget / total)) if budget > 0 else 0

    return {"match_score": score, "summary": a.summary, "keywords": [k.model_dump() for k in a.keywords],
            "suggestions": [s.model_dump() for s in valid]}


async def cover_note(resume: Resume, jd: str, company: str, role: str, tone: str, highlights: list[str], format_type: str) -> str:
    user = (f"Tone: {tone}\nCompany: {company or 'unknown'}\nRole: {role or 'unknown'}\n\n"
            f"RESUME:\n{_indexed_view(resume)}\n\nCANDIDATE-APPROVED HIGHLIGHTS:\n" + "\n".join(f"- {h}" for h in highlights)
            + f"\n\nJOB DESCRIPTION:\n{jd[:6000]}")
    prompt = COVER_SYSTEM.format(format_type=format_type)
    return await llm.ask_text(prompt, user)


async def shorten_bullets(bullets: list[str]) -> list[str]:
    def check(d):
        if not isinstance(d.get("bullets"), list) or len(d["bullets"]) != len(bullets):
            raise ValueError("wrong number of bullets")

    data = await llm.ask_json(SHORTEN_SYSTEM, json.dumps({"bullets": bullets}), max_tokens=2000, check=check)
    return [str(new).strip() or old for new, old in zip(data["bullets"], bullets)]



REFINE_SYSTEM = """You are an expert resume/cover letter editor.
Refine the provided note based on the user's manual instructions, while maintaining the required format and facts.
Reply with ONLY the refined note text."""

async def refine_note(note: str, instructions: str, tone: str) -> str:
    user = f"Tone: {tone}\nInstructions: {instructions}\n\nORIGINAL NOTE:\n{note}"
    return await llm.ask_text(REFINE_SYSTEM, user)

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def render_text_to_pdf(text: str) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    text_object = c.beginText(50, height - 50)
    text_object.setFont("Helvetica", 12)
    for line in text.split('\n'):
        text_object.textLine(line)
    c.drawText(text_object)
    c.showPage()
    c.save()
    return buf.getvalue()

PARSE_JD_SYSTEM = """You are a smart job description parser.
Extract the company name and job role from the provided Job Description text.
Reply with ONLY a compact, valid JSON object: {"company": "...", "role": "..."}
Do not add any whitespace, newlines, or extra text.
If a field cannot be found, use ""."""

async def parse_jd(jd: str) -> dict:
    data = await llm.ask_json(PARSE_JD_SYSTEM, f"JOB DESCRIPTION:\n{jd[:6000]}", max_tokens=2000)
    return {"company": str(data.get("company", "")).strip(), "role": str(data.get("role", "")).strip()}
