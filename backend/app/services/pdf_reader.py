import pymupdf as fitz
from fastapi import HTTPException


def extract_text(data: bytes) -> str:
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception:
        raise HTTPException(400, "That file isn't a readable PDF.")

    parts, links = [], []
    for page in doc:
        parts.append(page.get_text("text", sort=True))
        links += [l["uri"] for l in page.get_links() if l.get("uri")]

    text = "\n".join(parts).strip()
    if len(text) < 80:
        raise HTTPException(422, "No text found. Scanned or image-only PDFs aren't supported. Export a text-based PDF and retry.")
    if links:
        text += "\n\nLINKS FOUND IN PDF:\n" + "\n".join(dict.fromkeys(links))
    return text[:20000]
