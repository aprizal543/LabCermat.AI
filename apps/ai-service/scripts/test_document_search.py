"""
Test script — Document Search (keyword/BM25 only)
LabCermat Sprint 8 Langkah 2

Membuat 3 chunk SOP dummy, mengindeks ke Azure AI Search,
lalu menjalankan query keyword dan menampilkan hasil.

Jalankan dari folder apps/ai-service:
    python scripts/test_document_search.py

Pastikan .env sudah terisi:
    AZURE_AI_SEARCH_ENDPOINT
    AZURE_AI_SEARCH_KEY
    AZURE_AI_SEARCH_INDEX_NAME=labcermat-sop-index
"""

import os
import sys

# Add parent dir to path so app imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import settings
from app.services.document_service import DocumentChunk
from app.services.search_service import delete_document, ensure_index, search, upload_chunks

# ---------------------------------------------------------------------------
# Dummy SOP chunks
# ---------------------------------------------------------------------------

DOC_ID = "test-sop-qc-001"
TITLE = "SOP-QC-Hematologi.pdf"

DUMMY_CHUNKS = [
    DocumentChunk(
        chunk_id=f"{DOC_ID}_0",
        document_id=DOC_ID,
        title=TITLE,
        section="page_1",
        content=(
            "Prosedur Penanganan QC Di Luar Batas. "
            "Apabila nilai QC berada di luar batas kontrol (melebihi upper limit atau "
            "di bawah lower limit), analis harus segera menghentikan penggunaan alat untuk "
            "pemeriksaan pasien. Langkah pertama adalah mengulang pengukuran dengan material "
            "kontrol yang sama untuk memastikan apakah penyimpangan bersifat acak atau sistematis."
        ),
        source_page=1,
        chunk_index=0,
    ),
    DocumentChunk(
        chunk_id=f"{DOC_ID}_1",
        document_id=DOC_ID,
        title=TITLE,
        section="page_2",
        content=(
            "Kalibrasi Alat Hematologi Analyzer. "
            "Kalibrasi rutin dilakukan setiap hari sebelum alat digunakan untuk pemeriksaan. "
            "Gunakan material kalibrasi yang telah disertifikasi oleh produsen alat. "
            "Catat semua hasil kalibrasi dalam logbook pemeliharaan alat. "
            "Jika kalibrasi tidak berhasil dalam 3 percobaan, hubungi teknisi resmi."
        ),
        source_page=2,
        chunk_index=1,
    ),
    DocumentChunk(
        chunk_id=f"{DOC_ID}_2",
        document_id=DOC_ID,
        title=TITLE,
        section="page_3",
        content=(
            "Interval Pemantauan QC Harian. "
            "Material kontrol harus dijalankan minimal sekali setiap shift kerja, atau setiap "
            "20 sampel pasien, mana yang lebih dahulu tercapai. "
            "Gunakan dua level kontrol: Level 1 (normal) dan Level 2 (abnormal). "
            "Hasil QC dicatat dalam sistem dan diverifikasi oleh supervisor setiap akhir shift."
        ),
        source_page=3,
        chunk_index=2,
    ),
]

# ---------------------------------------------------------------------------
# Test runner
# ---------------------------------------------------------------------------

def run():
    print("=" * 60)
    print("LabCermat Sprint 8 — Document Search Test")
    print("=" * 60)

    # Config check
    print(f"\n[Config]")
    print(f"  Search endpoint    : {settings.azure_ai_search_endpoint or '(not set)'}")
    print(f"  Index name         : {settings.azure_ai_search_index_name}")
    print(f"  Search configured  : {settings.search_configured}")

    if not settings.search_configured:
        print("\n[ERROR] AZURE_AI_SEARCH_ENDPOINT or AZURE_AI_SEARCH_KEY not set in .env")
        print("  Set these values and re-run.")
        sys.exit(1)

    # Step 1: Ensure index
    print(f"\n[Step 1] Ensure index '{settings.azure_ai_search_index_name}'...")
    ok = ensure_index()
    print(f"  Result: {'OK' if ok else 'FAILED'}")
    if not ok:
        print("  Check Azure portal — Search service may not be running.")
        sys.exit(1)

    # Step 2: Clean up previous test data
    print(f"\n[Step 2] Cleaning up previous test data (doc_id={DOC_ID})...")
    result = delete_document(DOC_ID)
    print(f"  Deleted: {result.get('deleted', 0)} chunks")

    # Step 3: Upload dummy chunks
    print(f"\n[Step 3] Uploading {len(DUMMY_CHUNKS)} dummy SOP chunks...")
    result = upload_chunks(DUMMY_CHUNKS)
    print(f"  Uploaded : {result['uploaded']}")
    print(f"  Failed   : {result['failed']}")
    if result["failed"] > 0:
        print(f"  Error    : {result.get('error', 'unknown')}")
        sys.exit(1)

    # Step 4: Wait a moment for indexing to settle
    import time
    print("\n[Step 4] Waiting 3s for index to settle...")
    time.sleep(3)

    # Step 5: Run test queries
    queries = [
        "Apa yang dilakukan jika QC di luar batas?",
        "kalibrasi alat hematologi",
        "interval pemantauan kontrol harian",
    ]

    print("\n[Step 5] Running test queries...")
    for query in queries:
        print(f"\n  Query: \"{query}\"")
        hits = search(query, top_k=3)
        if not hits:
            print("  (no results)")
        else:
            for i, hit in enumerate(hits, 1):
                print(f"  [{i}] score={hit['score']:.4f} | page={hit['source_page']} | section={hit['section']}")
                print(f"       {hit['content'][:120].replace(chr(10), ' ')}...")

    # Step 6: Cleanup
    print(f"\n[Step 6] Cleaning up test data...")
    result = delete_document(DOC_ID)
    print(f"  Deleted: {result.get('deleted', 0)} chunks")

    print("\n" + "=" * 60)
    print("Test PASSED — Document Search berfungsi.")
    print("=" * 60)


if __name__ == "__main__":
    run()
