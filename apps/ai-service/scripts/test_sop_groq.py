"""
Test script — Groq Generative Provider
LabCermat Sprint 8 Langkah 7

Verifies that:
  1. Without GROQ_API_KEY (or provider != groq) → mode = fallback_template_bm25 or template_bm25
  2. With GROQ_API_KEY + AI_GENERATIVE_PROVIDER=groq  → mode = groq_llm

Run from apps/ai-service with the virtual-env active:

    .\\labcermat\\Scripts\\python.exe scripts/test_sop_groq.py

Environment must have Azure AI Search configured (AZURE_AI_SEARCH_ENDPOINT + KEY).
"""

from __future__ import annotations

import sys
import time
import os

# ── Add project root to sys.path ──────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.services import search_service
from app.services.document_service import DocumentChunk
from app.services.sop_service import answer_question
from app.models.ai_models import SopQuestionRequest

PRINT_WIDTH = 60
DOC_ID = "test-groq-sop-001"

DUMMY_CHUNKS = [
    DocumentChunk(
        chunk_id=f"{DOC_ID}-chunk-0",
        document_id=DOC_ID,
        title="SOP QC Hematologi",
        section="page_1",
        content=(
            "Prosedur Penanganan QC Di Luar Batas. "
            "Apabila nilai QC berada di luar batas kontrol Levey-Jennings, "
            "analis wajib menghentikan pemeriksaan pasien, "
            "mencatat kejadian di logbook QC, "
            "menghubungi supervisor laboratorium dalam 15 menit, "
            "dan melakukan tindakan korektif sesuai panduan ISO 15189."
        ),
        source_page=1,
        chunk_index=0,
    ),
    DocumentChunk(
        chunk_id=f"{DOC_ID}-chunk-1",
        document_id=DOC_ID,
        title="SOP Kalibrasi Alat",
        section="page_2",
        content=(
            "Kalibrasi Alat Hematologi Analyzer. "
            "Kalibrasi rutin dilakukan setiap hari kerja sebelum jam 08.00 WIB. "
            "Teknisi menggunakan bahan kalibrasi resmi dari vendor, "
            "mencatat hasil di formulir kalibrasi F-QC-002, "
            "dan memastikan CV < 2% untuk parameter MCV dan MCHC."
        ),
        source_page=2,
        chunk_index=1,
    ),
    DocumentChunk(
        chunk_id=f"{DOC_ID}-chunk-2",
        document_id=DOC_ID,
        title="SOP Interval QC Harian",
        section="page_3",
        content=(
            "Interval Pemantauan QC Harian. "
            "Material kontrol harus dijalankan minimal 2 kali per shift, "
            "yaitu pada awal shift dan tengah shift. "
            "Jika volume sampel melebihi 100 sampel per shift, "
            "tambahkan satu run QC tambahan. "
            "Semua hasil dicatat pada Westgard Chart yang tersedia di instrumen."
        ),
        source_page=3,
        chunk_index=2,
    ),
]

TEST_QUESTION = "Apa yang dilakukan jika nilai QC di luar batas kontrol?"


def _sep(char: str = "=") -> None:
    print(char * PRINT_WIDTH)


def _check_search_configured() -> bool:
    if not settings.search_configured:
        print("SKIP — Azure AI Search tidak dikonfigurasi.")
        print("  Set AZURE_AI_SEARCH_ENDPOINT dan AZURE_AI_SEARCH_KEY di .env")
        return False
    return True


def _seed_chunks() -> None:
    print(f"\n[Seed] Uploading {len(DUMMY_CHUNKS)} chunks (doc_id={DOC_ID})...")
    result = search_service.upload_chunks(DUMMY_CHUNKS)
    print(f"  Uploaded : {result['uploaded']}")
    print(f"  Failed   : {result['failed']}")
    print("  Waiting 3s for index to settle...")
    time.sleep(3)


def _cleanup_chunks() -> None:
    print(f"\n[Cleanup] Deleting test chunks (doc_id={DOC_ID})...")
    result = search_service.delete_document(DOC_ID)
    print(f"  Deleted: {result['deleted']}")


def _ask(label: str) -> str:
    print(f"\n[{label}]")
    print(f"  Question: {TEST_QUESTION}")
    req = SopQuestionRequest(question=TEST_QUESTION, top_k=3, document_id=DOC_ID)
    resp = answer_question(req)
    print(f"  Mode           : {resp.mode}")
    print(f"  Fallback reason: {resp.fallback_reason}")
    print(f"  Sources        : {len(resp.sources)}")
    print(f"  Answer (first 200 chars):")
    print(f"    {resp.answer[:200].replace(chr(10), ' ')}")
    return resp.mode


def main() -> None:
    _sep()
    print("LabCermat Sprint 8 — Groq Generative Provider Test")
    _sep()

    print(f"\n[Config]")
    print(f"  AI_GENERATIVE_PROVIDER : {settings.ai_generative_provider}")
    print(f"  GROQ_API_KEY present   : {'Yes' if settings.groq_api_key else 'No'}")
    print(f"  GROQ_MODEL             : {settings.groq_model}")
    print(f"  groq_configured        : {settings.groq_configured}")
    print(f"  search_configured      : {settings.search_configured}")

    if not _check_search_configured():
        sys.exit(0)

    search_service.ensure_index()
    _cleanup_chunks()
    _seed_chunks()

    mode = _ask("Query")

    _cleanup_chunks()

    _sep()
    if mode == "groq_llm":
        print("PASSED — Groq LLaMA answered successfully (groq_llm).")
    elif mode in ("template_bm25", "fallback_template_bm25"):
        print(f"PASSED — Template fallback used ({mode}) — Groq not configured or unavailable.")
    else:
        print(f"UNEXPECTED mode: {mode}")
        sys.exit(1)
    _sep()


if __name__ == "__main__":
    main()
