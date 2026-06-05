"""
Document Intelligence Service — Azure AI Document Intelligence
LabCermat Sprint 8

Parses PDF/file bytes using Azure AI Document Intelligence prebuilt-layout.
Extracts text per page and tables, then chunks text into segments for indexing.

Returns a structured ParsedDocument with pages, tables, and chunks.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from typing import Optional

from app.core.config import settings
from app.core.logging import logger

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class PageContent:
    page_number: int
    content: str


@dataclass
class TableContent:
    page_number: int
    row_count: int
    column_count: int
    text: str           # cells joined as readable text


@dataclass
class DocumentChunk:
    chunk_id: str
    document_id: str
    title: str
    section: str        # "page_N" or "table_page_N"
    content: str
    source_page: int
    chunk_index: int


@dataclass
class ParsedDocument:
    document_id: str
    title: str
    page_count: int
    pages: list[PageContent] = field(default_factory=list)
    tables: list[TableContent] = field(default_factory=list)
    chunks: list[DocumentChunk] = field(default_factory=list)
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Chunking config
# ---------------------------------------------------------------------------

_MAX_CHUNK_CHARS = 1500   # ~500 tokens at avg 3 chars/token
_OVERLAP_CHARS   = 150


def _chunk_text(
    text: str,
    document_id: str,
    title: str,
    section: str,
    source_page: int,
    start_index: int = 0,
) -> list[DocumentChunk]:
    """Split text into overlapping chunks of _MAX_CHUNK_CHARS characters."""
    text = text.strip()
    if not text:
        return []

    chunks: list[DocumentChunk] = []
    pos = 0
    i = start_index

    while pos < len(text):
        end = pos + _MAX_CHUNK_CHARS
        segment = text[pos:end].strip()
        if segment:
            chunks.append(DocumentChunk(
                chunk_id=f"{document_id}_{i}",
                document_id=document_id,
                title=title,
                section=section,
                content=segment,
                source_page=source_page,
                chunk_index=i,
            ))
            i += 1
        pos += _MAX_CHUNK_CHARS - _OVERLAP_CHARS

    return chunks


# ---------------------------------------------------------------------------
# Table → text serialization
# ---------------------------------------------------------------------------

def _table_to_text(cells: list[dict]) -> str:
    """Convert Document Intelligence table cells to a readable text block."""
    if not cells:
        return ""
    # Group by row
    rows: dict[int, dict[int, str]] = {}
    for cell in cells:
        r = cell.get("rowIndex", 0)
        c = cell.get("columnIndex", 0)
        content = cell.get("content", "").strip()
        rows.setdefault(r, {})[c] = content

    lines: list[str] = []
    for row_idx in sorted(rows):
        row = rows[row_idx]
        line = " | ".join(row.get(c, "") for c in sorted(row))
        lines.append(line)
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main parse function
# ---------------------------------------------------------------------------

def parse_document(
    file_bytes: bytes,
    filename: str,
    document_id: Optional[str] = None,
    mime_type: Optional[str] = None,
) -> ParsedDocument:
    """Parse a PDF document using Azure AI Document Intelligence.

    Falls back gracefully if the service is not configured or unavailable.
    """
    doc_id = document_id or str(uuid.uuid4())
    title = filename
    effective_mime = mime_type or "application/pdf"

    if not file_bytes:
        return ParsedDocument(
            document_id=doc_id,
            title=title,
            page_count=0,
            error="file_bytes is empty",
        )

    if not settings.document_intelligence_configured:
        logger.warning("document_service: Document Intelligence not configured — fallback")
        return ParsedDocument(
            document_id=doc_id,
            title=title,
            page_count=0,
            error="AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT or KEY not configured",
        )

    try:
        from azure.ai.documentintelligence import DocumentIntelligenceClient
        from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
        from azure.core.credentials import AzureKeyCredential

        client = DocumentIntelligenceClient(
            endpoint=settings.azure_document_intelligence_endpoint,
            credential=AzureKeyCredential(settings.azure_document_intelligence_key),
        )

        logger.info(
            "document_service: analysing '%s' | mime=%s | size=%d bytes | model=prebuilt-layout",
            filename, effective_mime, len(file_bytes),
        )

        # body=AnalyzeDocumentRequest(bytes_source=...) + content_type="application/json"
        # instructs the SDK to send the file as a base64-encoded JSON payload.
        poller = client.begin_analyze_document(
            "prebuilt-layout",
            body=AnalyzeDocumentRequest(bytes_source=file_bytes),
            content_type="application/json",
        )
        result = poller.result()

        pages: list[PageContent] = []
        tables: list[TableContent] = []
        chunks: list[DocumentChunk] = []
        chunk_index = 0

        # ── Extract pages ────────────────────────────────────────
        for page in (result.pages or []):
            page_num = page.page_number or 1
            lines = [l.content for l in (page.lines or []) if l.content]
            page_text = "\n".join(lines)
            pages.append(PageContent(page_number=page_num, content=page_text))

            new_chunks = _chunk_text(
                text=page_text,
                document_id=doc_id,
                title=title,
                section=f"page_{page_num}",
                source_page=page_num,
                start_index=chunk_index,
            )
            chunks.extend(new_chunks)
            chunk_index += len(new_chunks)

        # ── Extract tables ────────────────────────────────────────
        for table in (result.tables or []):
            page_num = (
                table.bounding_regions[0].page_number
                if table.bounding_regions
                else 1
            )
            cells = [
                {
                    "rowIndex": c.row_index,
                    "columnIndex": c.column_index,
                    "content": c.content,
                }
                for c in (table.cells or [])
            ]
            table_text = _table_to_text(cells)
            tables.append(TableContent(
                page_number=page_num,
                row_count=table.row_count or 0,
                column_count=table.column_count or 0,
                text=table_text,
            ))

            # Index table as its own chunk(s)
            new_chunks = _chunk_text(
                text=table_text,
                document_id=doc_id,
                title=title,
                section=f"table_page_{page_num}",
                source_page=page_num,
                start_index=chunk_index,
            )
            chunks.extend(new_chunks)
            chunk_index += len(new_chunks)

        logger.info(
            "document_service: '%s' parsed — %d pages, %d tables, %d chunks",
            filename, len(pages), len(tables), len(chunks),
        )

        return ParsedDocument(
            document_id=doc_id,
            title=title,
            page_count=len(pages),
            pages=pages,
            tables=tables,
            chunks=chunks,
        )

    except Exception as exc:
        logger.warning("document_service: parse failed — %s", exc)
        return ParsedDocument(
            document_id=doc_id,
            title=title,
            page_count=0,
            error=str(exc),
        )
