"""
Generative AI Service — SOP Answer Generation
LabCermat Sprint 8 Langkah 7

Provider: Groq (llama-3.1-8b-instant) with template_bm25 fallback.

Flow:
  1. If AI_GENERATIVE_PROVIDER != "groq"  → template_bm25 (no LLM)
  2. If GROQ_API_KEY is empty              → fallback_template_bm25
  3. If sources list is empty             → caller must NOT call this service
  4. If Groq call fails/timeout/error     → fallback_template_bm25 (never raises)

Answer modes returned:
  "groq_llm"             — Groq answered successfully
  "template_bm25"        — template provider (no LLM requested)
  "fallback_template_bm25" — Groq was attempted but failed; template used

SAFETY:
  System prompt explicitly forbids medical diagnosis.
  Answer is grounded exclusively on retrieved chunks — the prompt lists each
  chunk with a [S1] / [S2] label so the model can cite them.
  Temperature 0.2 keeps answers deterministic and close to the source text.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Optional

import httpx

from app.core.config import settings
from app.core.logging import logger

# ---------------------------------------------------------------------------
# Groq API constants
# ---------------------------------------------------------------------------

_GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
_MAX_TOKENS     = 600
_TEMPERATURE    = 0.2

# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

@dataclass
class GenerativeResult:
    text: str
    mode: str           # "groq_llm" | "template_bm25" | "fallback_template_bm25"
    fallback_reason: Optional[str] = None

# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
Kamu adalah asisten prosedur operasional standar (SOP) untuk laboratorium klinik.
Tugasmu menjawab pertanyaan berdasarkan HANYA konten SOP yang diberikan dalam konteks.

ATURAN KETAT:
1. Jawab HANYA berdasarkan sumber SOP yang tercantum di bawah. Jangan tambahkan informasi lain.
2. Jika sumber tidak cukup, katakan: "Informasi ini tidak ditemukan dalam SOP yang tersedia."
3. Jangan membuat diagnosis medis atau interpretasi klinis.
4. Tulis dalam Bahasa Indonesia yang profesional dan ringkas.
5. Gunakan format poin bernomor (1. 2. 3.) maksimal 5 poin.
6. Di akhir setiap poin, cantumkan referensi sumber: [S1], [S2], dst.
7. Tutup dengan kalimat: "Untuk detail lebih lanjut, rujuk dokumen SOP asli atau supervisor laboratorium."\
"""


def _build_user_message(question: str, sources: list[dict]) -> str:
    source_lines = []
    for i, s in enumerate(sources, 1):
        page_info = f" hal. {s['source_page']}" if s.get("source_page") else ""
        source_lines.append(
            f"[S{i}] {s['title']}{page_info}:\n{s['content'][:500]}"
        )
    sources_block = "\n\n".join(source_lines)
    return f"SUMBER SOP:\n{sources_block}\n\nPERTANYAAN:\n{question}"


# ---------------------------------------------------------------------------
# Template answer builder (unchanged from sop_service original)
# ---------------------------------------------------------------------------

_SNIPPET_MAX = 300
_POINTS_MAX  = 3


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


def _build_template_answer(question: str, hits: list[dict]) -> str:
    top = hits[:_POINTS_MAX]
    intro = (
        f"Berdasarkan SOP yang tersedia, berikut informasi yang relevan "
        f"dengan pertanyaan: \"{question.strip()}\":"
    )
    points = []
    for i, hit in enumerate(top, 1):
        snippet = _make_snippet(hit["content"])
        page_ref = f"(SOP: {hit['title']}, hal. {hit['source_page']})"
        points.append(f"{i}. {snippet} {page_ref}")
    closing = (
        "Untuk tindakan lebih lanjut, rujuk langsung ke dokumen SOP terkait "
        "atau konsultasikan dengan supervisor laboratorium."
    )
    return "\n".join([intro, ""] + points + ["", closing])


# ---------------------------------------------------------------------------
# Groq call
# ---------------------------------------------------------------------------

def _call_groq(question: str, sources: list[dict]) -> str:
    """Call Groq chat completion API. Raises on any failure."""
    payload = {
        "model":       settings.groq_model,
        "temperature": _TEMPERATURE,
        "max_tokens":  _MAX_TOKENS,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": _build_user_message(question, sources)},
        ],
    }

    with httpx.Client(timeout=settings.ai_generative_timeout_seconds) as client:
        resp = client.post(
            _GROQ_CHAT_URL,
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type":  "application/json",
            },
            content=json.dumps(payload),
        )

    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_sop_answer(question: str, hits: list[dict]) -> GenerativeResult:
    """Generate a source-grounded SOP answer.

    Args:
        question: User's question string.
        hits:     BM25 search hits from search_service.search() — each dict
                  must have keys: title, content, source_page.

    Returns a GenerativeResult with text, mode, and optional fallback_reason.
    Never raises.
    """
    # ── Provider not Groq → pure template ────────────────────
    provider = settings.ai_generative_provider.strip().lower()
    if provider != "groq":
        return GenerativeResult(
            text=_build_template_answer(question, hits),
            mode="template_bm25",
        )

    # ── Groq key missing → fallback ──────────────────────────
    if not settings.groq_api_key:
        logger.warning("generative_service: GROQ_API_KEY not set — using template fallback")
        return GenerativeResult(
            text=_build_template_answer(question, hits),
            mode="fallback_template_bm25",
            fallback_reason="GROQ_API_KEY not configured",
        )

    # ── Attempt Groq ─────────────────────────────────────────
    try:
        answer = _call_groq(question, hits)
        logger.info(
            "generative_service: groq answered question='%s' model=%s",
            question[:60], settings.groq_model,
        )
        return GenerativeResult(text=answer, mode="groq_llm")

    except httpx.TimeoutException as exc:
        reason = f"Groq timeout ({settings.ai_generative_timeout_seconds}s)"
        logger.warning("generative_service: %s — %s", reason, exc)
    except httpx.HTTPStatusError as exc:
        reason = f"Groq HTTP {exc.response.status_code}"
        logger.warning("generative_service: %s — %s", reason, exc)
    except Exception as exc:
        reason = f"Groq error: {exc}"
        logger.warning("generative_service: %s", reason)

    return GenerativeResult(
        text=_build_template_answer(question, hits),
        mode="fallback_template_bm25",
        fallback_reason=reason,  # type: ignore[possibly-undefined]
    )
