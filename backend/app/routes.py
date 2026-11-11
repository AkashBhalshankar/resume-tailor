from fastapi import APIRouter, File, HTTPException, Response, UploadFile

from . import config, llm
from .schemas import AnalyzeIn, CoverIn, RenderIn, ShortenIn
from .services import pdf_builder, pdf_reader, tailor

router = APIRouter(prefix="/api")


@router.post("/parse")
async def parse(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Please upload a PDF file.")
    data = await file.read()
    if len(data) > config.MAX_PDF_MB * 1024 * 1024:
        raise HTTPException(413, f"PDF must be under {config.MAX_PDF_MB} MB.")
    text = pdf_reader.extract_text(data)
    return {"resume": await tailor.structure_resume(text)}


@router.post("/parse-jd")
async def parse_jd(body: dict):
    return await tailor.parse_jd(body.get("jd", ""))


@router.post("/render")
def render(body: RenderIn):
    pdf, pages, size = pdf_builder.build_pdf(body.resume.model_dump())
    return Response(pdf, media_type="application/pdf",
                    headers={"X-Pages": str(pages), "X-Font-Size": str(size), "Access-Control-Expose-Headers": "X-Pages, X-Font-Size"})


@router.post("/cover-letter")
async def cover_letter(body: CoverIn):
    note = await tailor.cover_note(body.resume, body.jd, body.company, body.role, body.tone, body.highlights)
    return {"note": note}


@router.post("/shorten")
async def shorten(body: ShortenIn):
    return {"bullets": await tailor.shorten_bullets(body.bullets)}


@router.get("/providers/test")
async def providers_test():
    """Open http://localhost:8000/api/providers/test to see which AI providers and models work."""
    return await llm.test_providers()