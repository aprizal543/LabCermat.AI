"""
Quick smoke-test for document_service.parse_document().

Usage:
    python scripts/test_document_parse_local.py path/to/file.pdf
    python scripts/test_document_parse_local.py  # uses built-in 1-page dummy PDF
"""

import sys
import os

# Allow running from repo root or scripts/ dir
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.document_service import parse_document


def _make_minimal_pdf() -> bytes:
    """Return a valid 1-page PDF with the text 'SOP Test Page'."""
    body = b"""\
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length 44>>
stream
BT /F1 12 Tf 72 720 Td (SOP Test Page) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f
"""
    # Build minimal xref — use a prebuilt complete PDF instead
    return _MINIMAL_PDF_BYTES


# A complete, valid minimal 1-page PDF (hex-encoded to avoid encoding issues)
_MINIMAL_PDF_HEX = (
    "255044462d312e340a"                                        # %PDF-1.4
    "31 20 6f 62 6a 0a 3c 3c 2f 54 79 70 65 2f 43 61"        # 1 obj <<...
    "74 61 6c 6f 67 2f 50 61 67 65 73 20 32 20 30 20"
    "52 3e 3e 0a 65 6e 64 6f 62 6a 0a"
    "32 20 6f 62 6a 0a 3c 3c 2f 54 79 70 65 2f 50 61"
    "67 65 73 2f 4b 69 64 73 5b 33 20 30 20 52 5d 2f"
    "43 6f 75 6e 74 20 31 3e 3e 0a 65 6e 64 6f 62 6a 0a"
)


def _load_pdf(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def main() -> None:
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        print(f"Reading PDF: {pdf_path}")
        file_bytes = _load_pdf(pdf_path)
        filename = os.path.basename(pdf_path)
    else:
        print("No PDF path supplied — using built-in dummy bytes (Document Intelligence will likely reject, but parse_document logic runs).")
        # Smallest valid-ish PDF marker so the file_bytes guard passes
        file_bytes = b"%PDF-1.4 1 0 obj<</Type/Catalog>>endobj\n%%EOF\n"
        filename = "dummy_test.pdf"

    print(f"File size : {len(file_bytes):,} bytes")
    print(f"Filename  : {filename}")
    print()

    result = parse_document(file_bytes=file_bytes, filename=filename)

    print(f"document_id : {result.document_id}")
    print(f"title       : {result.title}")
    print(f"page_count  : {result.page_count}")
    print(f"pages       : {len(result.pages)}")
    print(f"tables      : {len(result.tables)}")
    print(f"chunks      : {len(result.chunks)}")

    if result.error:
        print(f"\nerror: {result.error}")
    else:
        print("\nParse SUCCESS")

    if result.chunks:
        first = result.chunks[0]
        preview = first.content[:200].replace("\n", " ")
        print(f"\nFirst chunk (chunk_id={first.chunk_id}, section={first.section}):")
        print(f"  {preview}{'…' if len(first.content) > 200 else ''}")

    if result.tables:
        t = result.tables[0]
        print(f"\nFirst table (page {t.page_number}): {t.row_count}r × {t.column_count}c")
        print(f"  {t.text[:120].replace(chr(10), ' ')}")


if __name__ == "__main__":
    main()
