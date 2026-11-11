from fastapi import APIRouter, File, HTTPException, Response, UploadFile

from app import config, llm
from app.schemas import AnalyzeIn, CoverIn, RenderIn, ShortenIn, RefineIn, RenderTextIn
from app.services import pdf_builder, pdf_reader, tailor

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


@router.post("/analyze")
async def analyze(body: AnalyzeIn):
    return await tailor.analyze(body.resume, body.jd)


@router.post("/render")
def render(body: RenderIn):
    pdf, pages, size = pdf_builder.build_pdf(body.resume.model_dump())
    return Response(pdf, media_type="application/pdf",
                    headers={"X-Pages": str(pages), "X-Font-Size": str(size), "Access-Control-Expose-Headers": "X-Pages, X-Font-Size"})


@router.post("/cover-letter")
async def cover_letter(body: CoverIn):
    note = await tailor.cover_note(body.resume, body.jd, body.company, body.role, body.tone, body.highlights, body.format_type)
    return {"note": note}


@router.post("/shorten")
async def shorten(body: ShortenIn):
    return {"bullets": await tailor.shorten_bullets(body.bullets)}


@router.post("/refine-note")
async def refine_note(body: RefineIn):
    # Log the received body to debug the 422 error
    print(f"DEBUG: refine_note body: {body.model_dump()}")
    note = await tailor.refine_note(body.note, body.instructions, body.tone)
    return {"note": note}


@router.post("/render-note")
def render_note(body: RenderTextIn):
    pdf = tailor.render_text_to_pdf(body.text)
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=note.pdf"})


@router.get("/providers/test")
async def providers_test():
    """Open http://localhost:8000/api/providers/test to see which AI providers and models work."""
    return await llm.test_providers()
