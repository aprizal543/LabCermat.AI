"""
Test script — SOP Question Endpoint (Langkah 3 Sprint 8)

Seeds 3 dummy SOP chunks, calls answer_question() directly, prints result,
then cleans up. Does NOT start a web server.

Run from apps/ai-service:
    .\\labcermat\\Scripts\\python.exe scripts/test_sop_question.py
"""

import sys
import time
import os

# Allow importing app modules from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.services import search_service
from app.services.document_service import DocumentChunk
from app.services import sop_service
from app.models.ai_models import SopQuestionRequest

SEP = "=" * 60
TEST_DOC_ID = "test-sop-langkah3-001"

DUMMY_CHUNKS = [
    DocumentChunk(
        chunk_id=f"{TEST_DOC_ID}-chunk-0",
        document_id=TEST_DOC_ID,
        title="SOP Penanganan QC Di Luar Batas",
        section="page_1",
        content=(
            "Prosedur Penanganan QC Di Luar Batas. "
            "Apabila nilai QC berada di luar batas kontrol (mean ± 2SD), analis wajib menghentikan "
            "pemeriksaan sampel, melakukan kalibrasi ulang instrumen, dan menjalankan kontrol baru. "
            "Jika kontrol kedua masih di luar batas, supervisor harus diberitahu segera."
        ),
        source_page=1,
        chunk_index=0,
    ),
    DocumentChunk(
        chunk_id=f"{TEST_DOC_ID}-chunk-1",
        document_id=TEST_DOC_ID,
        title="SOP Kalibrasi Alat Hematologi",
        section="page_2",
        content=(
            "Kalibrasi Alat Hematologi Analyzer. "
            "Kalibrasi rutin dilakukan setiap hari sebelum pemeriksaan pertama dimulai. "
            "Gunakan material kalibrasi standar yang telah disetujui. "
            "Catat hasil kalibrasi di logbook instrumen dan tandatangani oleh analis yang bertugas."
        ),
        source_page=2,
        chunk_index=1,
    ),
    DocumentChunk(
        chunk_id=f"{TEST_DOC_ID}-chunk-2",
        document_id=TEST_DOC_ID,
        title="SOP Interval Pemantauan QC Harian",
        section="page_3",
        content=(
            "Interval Pemantauan QC Harian. "
            "Material kontrol harus dijalankan minimal dua kali sehari: pagi hari sebelum pemeriksaan "
            "dan siang hari setelah shift pertama. Hasil kontrol diplot pada grafik Levey-Jennings "
            "untuk pemantauan tren dan drift jangka panjang."
        ),
        source_page=3,
        chunk_index=2,
    ),
]

TEST_QUERIES = [
    "Apa yang dilakukan jika QC di luar batas kontrol?",
    "kalibrasi alat hematologi",
    "interval pemantauan kontrol harian",
]


def print_response(req_question: str, resp) -> None:
    print(f"\n  Query   : {req_question}")
    print(f"  Mode    : {resp.mode}")
    print(f"  Sources : {len(resp.sources)}")
    print()
    print("  --- Answer ---")
    for line in resp.answer.splitlines():
        print(f"  {line}")
    print()
    print(f"  [Safety] {resp.safety_note[:80]}...")
    if resp.sources:
        print()
        print("  --- Sources ---")
        for s in resp.sources:
            print(f"  [{s.chunk_index}] score={s.score} | page={s.source_page} | {s.title}")
            print(f"       {s.snippet[:80]}...")


def main():
    print(SEP)
    print("LabCermat Sprint 8 — SOP Question Test")
    print(SEP)

    print("\n[Config]")
    print(f"  Search endpoint   : {settings.azure_ai_search_endpoint or '(not set)'}")
    print(f"  Index name        : {settings.azure_ai_search_index_name}")
    print(f"  Search configured : {settings.search_configured}")

    if not settings.search_configured:
        print("\n[SKIP] Azure AI Search not configured — running offline fallback test\n")
        req = SopQuestionRequest(question="prosedur kalibrasi alat")
        resp = sop_service.answer_question(req)
        print(f"  Mode          : {resp.mode}")
        print(f"  Fallback reason: {resp.fallback_reason}")
        print(f"  Answer: {resp.answer}")
        print(f"\n{SEP}\nTest SKIPPED (search not configured).\n{SEP}")
        return

    # Step 1 — Cleanup previous test data
    print(f"\n[Step 1] Cleaning up previous test data (doc_id={TEST_DOC_ID})...")
    result = search_service.delete_document(TEST_DOC_ID)
    print(f"  Deleted: {result.get('deleted', 0)} chunks")

    # Step 2 — Upload dummy chunks
    print(f"\n[Step 2] Uploading {len(DUMMY_CHUNKS)} dummy SOP chunks...")
    result = search_service.upload_chunks(DUMMY_CHUNKS)
    print(f"  Uploaded : {result['uploaded']}")
    print(f"  Failed   : {result['failed']}")
    if result["failed"] > 0:
        print("  [ERROR] Upload failed — aborting test")
        sys.exit(1)

    # Step 3 — Wait for index
    print("\n[Step 3] Waiting 3s for index to settle...")
    time.sleep(3)

    # Step 4 — Run queries
    print("\n[Step 4] Running SOP question queries...")
    all_ok = True
    for question in TEST_QUERIES:
        req = SopQuestionRequest(question=question, top_k=3, document_id=TEST_DOC_ID)
        resp = sop_service.answer_question(req)
        print_response(question, resp)
        if resp.mode not in ("template_bm25", "no_relevant_source"):
            print(f"  [WARN] Unexpected mode: {resp.mode}")
            all_ok = False
        if resp.mode == "template_bm25" and not resp.sources:
            print("  [WARN] template_bm25 mode but no sources")
            all_ok = False

    # Step 5 — Cleanup
    print(f"\n[Step 5] Cleaning up test data...")
    result = search_service.delete_document(TEST_DOC_ID)
    print(f"  Deleted: {result.get('deleted', 0)} chunks")

    print()
    print(SEP)
    if all_ok:
        print("Test PASSED — SOP Question berfungsi.")
    else:
        print("Test COMPLETED WITH WARNINGS — periksa output di atas.")
    print(SEP)


if __name__ == "__main__":
    main()
