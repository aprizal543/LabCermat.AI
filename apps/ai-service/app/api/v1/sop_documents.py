"""
SOP Documents Router — Parse + Index + Delete
LabCermat Sprint 8 Langkah 6

POST /ai/v1/sop-documents/parse-index
    Receive PDF file via multipart, parse with Document Intelligence,
    chunk, index to Azure AI Search, return summary.

DELETE /ai/v1/sop-documents/{document_id}/index
    Remove all index chunks for a document_id from Azure AI Search.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.logging import logger
from app.services import search_service
from app.services.document_service import parse_document

router = APIRouter()


# ─── Response models ──────────────────────────────────────────────────────────

class ParseIndexResponse(BaseModel):
    document_id: str
    title: str
    status: str
    chunk_count: int
    pages_count: int
    tables_count: int
    indexed_count: int
    processed_at: str


class DeleteIndexResponse(BaseModel):
    document_id: str
    deleted: int
    status: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post(
    "/sop-documents/parse-index",
    response_model=ParseIndexResponse,
    tags=["AI — SOP Documents"],
    summary="Parse PDF SOP dan index ke Azure AI Search",
)
async def parse_and_index(
    document_id: str = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
) -> ParseIndexResponse:
    """
    Parse a PDF SOP file via Azure Document Intelligence, chunk the content,
    and upload all chunks to Azure AI Search.

    The document_id should be the UUID of the SopDocument record in the backend DB.
    """
    now = datetime.now(timezone.utc).isoformat()

    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(
            status_code=400,
            detail=f"Hanya file PDF yang diizinkan, diterima: {file.content_type}",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="File kosong")

    logger.info(
        "sop_documents: parsing document_id=%s title='%s' size=%d bytes",
        document_id, title, len(file_bytes),
    )

    # Parse
    parsed = parse_document(
        file_bytes=file_bytes,
        filename=file.filename or f"{document_id}.pdf",
        document_id=document_id,
    )
    parsed.title = title  # override with user-supplied title

    if parsed.error:
        logger.warning("sop_documents: parse error for %s — %s", document_id, parsed.error)
        raise HTTPException(status_code=502, detail=f"Gagal parsing dokumen: {parsed.error}")

    if not parsed.chunks:
        raise HTTPException(
            status_code=422,
            detail="Dokumen tidak menghasilkan chunk — pastikan PDF berisi teks (bukan scan gambar)",
        )

    # Re-tag title on every chunk to match user-supplied title
    for chunk in parsed.chunks:
        chunk.title = title

    # Upload chunks to Azure AI Search
    upload_result = search_service.upload_chunks(parsed.chunks)
    indexed_count = upload_result.get("uploaded", 0)

    logger.info(
        "sop_documents: indexed %d/%d chunks for document_id=%s",
        indexed_count, len(parsed.chunks), document_id,
    )

    return ParseIndexResponse(
        document_id=document_id,
        title=title,
        status="indexed" if indexed_count > 0 else "failed",
        chunk_count=len(parsed.chunks),
        pages_count=len(parsed.pages),
        tables_count=len(parsed.tables),
        indexed_count=indexed_count,
        processed_at=now,
    )


@router.delete(
    "/sop-documents/{document_id}/index",
    response_model=DeleteIndexResponse,
    tags=["AI — SOP Documents"],
    summary="Hapus semua index chunks untuk satu dokumen",
)
async def delete_index(document_id: str) -> DeleteIndexResponse:
    """Remove all indexed chunks for the given document_id from Azure AI Search."""
    result = search_service.delete_document(document_id)
    deleted = result.get("deleted", 0)

    logger.info(
        "sop_documents: deleted %d chunks for document_id=%s",
        deleted, document_id,
    )

    return DeleteIndexResponse(
        document_id=document_id,
        deleted=deleted,
        status="deleted" if deleted >= 0 else "error",
    )
