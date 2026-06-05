"""
SOP Assistant Service — BM25 Retrieval + Generative Answer
LabCermat Sprint 8 Langkah 7

Retrieves relevant SOP chunks from Azure AI Search (BM25/keyword),
then delegates answer generation to generative_service which:
  - Uses Groq LLaMA if AI_GENERATIVE_PROVIDER=groq and GROQ_API_KEY is set
  - Falls back to template_bm25 if Groq is unavailable or fails

Mode returned:
  "groq_llm"               — Groq answered successfully
  "template_bm25"          — template provider (no LLM requested)
  "fallback_template_bm25" — Groq failed; template used
  "no_relevant_source"     — query returned no results (Groq never called)
  "search_unavailable"     — Azure AI Search not configured or error
  "search_error"           — search call raised an exception

SAFETY: No medical diagnoses. All output is workflow decision support.
        safety_note is appended to every response.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from app.core.logging import logger
from app.models.ai_models import SopQuestionRequest, SopQuestionResponse, SopSource
from app.services import search_service
from app.services.generative_service import generate_sop_answer
from app.core.config import settings

# ---------------------------------------------------------------------------
# Safety note — appended to every response
# ---------------------------------------------------------------------------

_SAFETY_NOTE = (
    "Output ini adalah bantuan operasional workflow laboratorium, "
    "bukan diagnosis medis. Keputusan klinis tetap sepenuhnya berada "
    "di tangan tenaga medis yang berwenang."
)

# ---------------------------------------------------------------------------
# Snippet helper (used for source list regardless of answer mode)
# ---------------------------------------------------------------------------

_SNIPPET_MAX = 300


def _make_snippet(content: str, max_chars: int = _SNIPPET_MAX) -> str:
    content = content.strip().replace("\n", " ")
    if len(content) <= max_chars:
        return content
    truncated = content[:max_chars]
    for sep in (". ", ", ", " "):
        idx = truncated.rfind(sep)
        if idx > max_chars // 2:
            return truncated[:idx + 1].rstrip() + "..."
    return truncated.rstrip() + "..."


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def answer_question(request: SopQuestionRequest) -> SopQuestionResponse:
    """Answer a SOP question using BM25 retrieval + generative answer.

    Retrieval is always BM25 via Azure AI Search.
    Answer generation is delegated to generative_service which handles
    Groq / template / fallback logic transparently.

    Never raises — all errors are converted to fallback responses.
    """
    now = datetime.now(timezone.utc).isoformat()
    question = request.question.strip()

    # ── Guard: empty question ────────────────────────────────
    if not question:
        return SopQuestionResponse(
            answer="Pertanyaan tidak boleh kosong.",
            sources=[],
            mode="validation_error",
            safety_note=_SAFETY_NOTE,
            fallback_reason="question is empty",
            processed_at=now,
        )

    # ── Guard: search not configured ─────────────────────────
    if not settings.search_configured:
        logger.warning("sop_service: Azure AI Search not configured")
        return SopQuestionResponse(
            answer=(
                "SOP Assistant sementara tidak tersedia karena layanan pencarian "
                "belum dikonfigurasi. Hubungi administrator sistem."
            ),
            sources=[],
            mode="search_unavailable",
            safety_note=_SAFETY_NOTE,
            fallback_reason="AZURE_AI_SEARCH_ENDPOINT or KEY not configured",
            processed_at=now,
        )

    # ── Retrieve ─────────────────────────────────────────────
    try:
        hits = search_service.search(
            query=question,
            top_k=request.top_k,
            document_id=request.document_id,
        )
    except Exception as exc:
        logger.warning("sop_service: search error — %s", exc)
        return SopQuestionResponse(
            answer=(
                "Terjadi kesalahan saat mencari SOP. "
                "Coba lagi atau hubungi administrator sistem."
            ),
            sources=[],
            mode="search_error",
            safety_note=_SAFETY_NOTE,
            fallback_reason=str(exc),
            processed_at=now,
        )

    # ── No results → do NOT call generative service ──────────
    if not hits:
        logger.info("sop_service: no results for query='%s'", question[:60])
        return SopQuestionResponse(
            answer=(
                "Saya tidak menemukan SOP yang relevan dengan pertanyaan ini. "
                "Pastikan dokumen SOP sudah diunggah dan diindeks, "
                "atau coba ubah kata kunci pertanyaan Anda."
            ),
            sources=[],
            mode="no_relevant_source",
            safety_note=_SAFETY_NOTE,
            fallback_reason=None,
            processed_at=now,
        )

    # ── Generate answer ───────────────────────────────────────
    gen = generate_sop_answer(question, hits)

    sources = [
        SopSource(
            document_id=h["document_id"],
            title=h["title"],
            section=h.get("section"),
            source_page=h.get("source_page"),
            chunk_index=h["chunk_index"],
            score=round(h["score"], 4) if h.get("score") is not None else None,
            snippet=_make_snippet(h["content"], max_chars=200),
        )
        for h in hits
    ]

    logger.info(
        "sop_service: answered query='%s' | hits=%d | mode=%s",
        question[:60], len(hits), gen.mode,
    )

    return SopQuestionResponse(
        answer=gen.text,
        sources=sources,
        mode=gen.mode,
        safety_note=_SAFETY_NOTE,
        fallback_reason=gen.fallback_reason,
        processed_at=now,
    )
