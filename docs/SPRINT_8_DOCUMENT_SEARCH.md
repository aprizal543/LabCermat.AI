# Sprint 8 — Document Intelligence & AI Search (Keyword/BM25)

**Tanggal:** 2026-05-14  
**Status:** Langkah 6 selesai — upload PDF + parse-index + list + delete aktif end-to-end  
**Mode search:** Keyword / BM25 only (vector/embedding ditunda — quota Azure tidak tersedia)

---

## Overview

Pipeline parsing dan indexing SOP dokumen:

```
PDF bytes
  ↓  Azure AI Document Intelligence (prebuilt-layout)
     extract text per halaman + tabel
  ↓  Chunking (1500 char / chunk, 150 char overlap)
  ↓  Azure AI Search (BM25 keyword index)
     upsert chunks → labcermat-sop-index
  ↓  Search (BM25 full-text, Indonesian Lucene analyzer)
     return top-K chunks + source metadata
```

---

## Resource Setup

| Resource | Nama | Region | Tier |
|---|---|---|---|
| Document Intelligence | `docint-labcermat` | japanwest | Free F0 |
| AI Search Service | `search-labcermat` | eastasia | Free |
| AI Search Index | `labcermat-sop-index` | — | — |

### Catatan Region
Document Intelligence `japanwest` karena `eastasia` tidak tersedia di subscription.
AI Search `eastasia` konsisten dengan resource group Sprint 7.
Keduanya berfungsi lintas region — tidak ada dependency region antara keduanya.

---

## Environment Variables

```bash
# apps/ai-service/.env

AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://docint-labcermat.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=<key dari Azure portal>

AZURE_AI_SEARCH_ENDPOINT=https://search-labcermat.search.windows.net
AZURE_AI_SEARCH_KEY=<admin key dari Azure portal>
AZURE_AI_SEARCH_INDEX_NAME=labcermat-sop-index
```

---

## Index Schema

Index dibuat **otomatis** oleh `search_service.ensure_index()` saat pertama kali dipanggil.

```json
{
  "name": "labcermat-sop-index",
  "fields": [
    { "name": "id",           "type": "Edm.String",  "key": true,  "filterable": true  },
    { "name": "document_id",  "type": "Edm.String",  "filterable": true                },
    { "name": "title",        "type": "Edm.String",  "searchable": true                },
    { "name": "section",      "type": "Edm.String",  "filterable": true                },
    { "name": "content",      "type": "Edm.String",  "searchable": true,
      "analyzer": "id.lucene"                                                           },
    { "name": "source_page",  "type": "Edm.Int32",   "filterable": true, "sortable": true },
    { "name": "chunk_index",  "type": "Edm.Int32",   "sortable": true                  }
  ]
}
```

**Analyzer `id.lucene`:** Indonesian Lucene analyzer — mendukung stemming bahasa Indonesia
(kalibrasi → kalibrasi, kalibrasi, dll.) untuk hasil BM25 yang lebih relevan.

---

## Install Dependencies

```powershell
cd apps/ai-service
.\labcermat\Scripts\activate

pip install azure-ai-documentintelligence==1.0.0
pip install "azure-search-documents==11.6.0b9"
pip install azure-core==1.32.0
```

Atau install semua sekaligus dari requirements.txt:

```powershell
pip install -r requirements.txt
```

---

## Test Script

```powershell
# Jalankan dari folder apps/ai-service
cd apps/ai-service
.\labcermat\Scripts\python.exe scripts/test_document_search.py
```

### Expected Output

```
============================================================
LabCermat Sprint 8 — Document Search Test
============================================================

[Config]
  Search endpoint    : https://search-labcermat.search.windows.net
  Index name         : labcermat-sop-index
  Search configured  : True

[Step 1] Ensure index 'labcermat-sop-index'...
  Result: OK

[Step 2] Cleaning up previous test data (doc_id=test-sop-qc-001)...
  Deleted: 0 chunks

[Step 3] Uploading 3 dummy SOP chunks...
  Uploaded : 3
  Failed   : 0

[Step 4] Waiting 3s for index to settle...

[Step 5] Running test queries...

  Query: "Apa yang dilakukan jika QC di luar batas?"
  [1] score=X.XXXX | page=1 | section=page_1
       Prosedur Penanganan QC Di Luar Batas. Apabila nilai QC berada di luar batas kontrol...

  Query: "kalibrasi alat hematologi"
  [1] score=X.XXXX | page=2 | section=page_2
       Kalibrasi Alat Hematologi Analyzer. Kalibrasi rutin dilakukan setiap hari...

  Query: "interval pemantauan kontrol harian"
  [1] score=X.XXXX | page=3 | section=page_3
       Interval Pemantauan QC Harian. Material kontrol harus dijalankan minimal...

[Step 6] Cleaning up test data...
  Deleted: 3 chunks

============================================================
Test PASSED — Document Search berfungsi.
============================================================
```

---

## Chunking Design

| Parameter | Nilai | Alasan |
|---|---|---|
| Max chunk chars | 1500 | ~500 token @ 3 char/token — sesuai BM25, tidak perlu token precision |
| Overlap chars | 150 | Konteks lintas paragraf untuk query yang menyentuh batas chunk |
| Section format | `page_N` atau `table_page_N` | Membedakan text vs tabel, memudahkan filter |
| Analyzer | `id.lucene` | Stemming bahasa Indonesia — relevansi BM25 lebih baik |

---

## Document Intelligence Models

| Model | Kegunaan | Sprint 8 |
|---|---|---|
| `prebuilt-layout` | Extract teks + tabel + struktur halaman | ✅ Dipakai |
| `prebuilt-read` | Hanya teks, lebih cepat/murah | Alternatif jika tabel tidak diperlukan |
| `prebuilt-document` | Key-value pairs + tabel | Terlalu kompleks untuk SOP PDF umum |

---

## Troubleshooting

### `ResourceNotFoundError` saat ensure_index
- Cek `AZURE_AI_SEARCH_ENDPOINT` — pastikan tidak ada trailing slash
- Cek `AZURE_AI_SEARCH_KEY` — gunakan **Admin key**, bukan Query key
- Cek apakah service `search-labcermat` status = `running` di portal

### `AuthenticationError` Document Intelligence
- Cek `AZURE_DOCUMENT_INTELLIGENCE_KEY` — salin ulang dari portal
- Pastikan endpoint = `https://docint-labcermat.cognitiveservices.azure.com/`

### `InvalidOperationError: analyzer 'id.lucene' not found`
- Ganti `"analyzer": "id.lucene"` ke `"analyzer": "standard.lucene"` di `search_service.py`
- `id.lucene` (Indonesian) tersedia di Free tier, namun ada beberapa region yang tidak mendukungnya

### Score semua 0 atau hasil tidak relevan
- BM25 bekerja berdasarkan term overlap — pastikan query menggunakan kata kunci yang ada di konten
- Jika dokumen baru diindeks, tunggu 3–5 detik sebelum query

### `QuotaExceeded` Document Intelligence
- Free tier F0: 500 halaman/bulan
- Jika habis: upgrade ke S0 di portal, atau upload dokumen lebih kecil

---

---

## SOP Question API Contract (Langkah 3)

**Endpoint:** `POST /ai/v1/sop-question`

### Request

```json
{
  "question": "Apa prosedur kalibrasi hematology analyzer?",
  "top_k": 5,
  "document_id": "optional-filter-by-doc-id"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `question` | `string` | Ya | 3–500 karakter |
| `top_k` | `int` | Tidak | Default 5, range 1–20 |
| `document_id` | `string` | Tidak | Filter hasil ke satu dokumen saja |

### Response

```json
{
  "answer": "Berdasarkan SOP yang tersedia, berikut informasi yang relevan...\n\n1. Kalibrasi rutin dilakukan setiap hari... (SOP: SOP Kalibrasi, hal. 2)\n\nUntuk tindakan lebih lanjut, rujuk langsung ke dokumen SOP...",
  "sources": [
    {
      "document_id": "sop-hematologi-001",
      "title": "SOP Kalibrasi Alat Hematologi",
      "section": "page_2",
      "source_page": 2,
      "chunk_index": 1,
      "score": 3.3421,
      "snippet": "Kalibrasi Alat Hematologi Analyzer. Kalibrasi rutin dilakukan setiap hari..."
    }
  ],
  "mode": "template_bm25",
  "safety_note": "Output ini adalah bantuan operasional workflow laboratorium, bukan diagnosis medis...",
  "fallback_reason": null,
  "processed_at": "2026-05-20T10:00:00+00:00"
}
```

### Mode Values

| Mode | Keterangan |
|---|---|
| `groq_llm` | Groq LLaMA menjawab berdasarkan chunks yang diretrieval |
| `template_bm25` | Template BM25 digunakan (AI_GENERATIVE_PROVIDER != groq) |
| `fallback_template_bm25` | Groq dipilih tetapi gagal/timeout — template BM25 dipakai sebagai fallback |
| `no_relevant_source` | Query tidak mengembalikan hasil — dokumen belum diindeks atau kata kunci tidak cocok |
| `search_unavailable` | Azure AI Search tidak dikonfigurasi |
| `search_error` | Terjadi error saat memanggil Azure AI Search |
| `validation_error` | Pertanyaan kosong atau tidak valid |

### Test Script

```powershell
cd apps/ai-service
.\labcermat\Scripts\python.exe scripts/test_sop_question.py
```

---

---

## Upload PDF Flow (Langkah 6)

```
User uploads PDF via Frontend SopAssistantPage
  ↓ POST /api/v1/sop-documents/upload (Backend NestJS)
  ↓ Validasi: mimetype=application/pdf, size<=5MB
  ↓ Prisma: CREATE sop_documents status=pending
  ↓ fetch multipart → POST /ai/v1/sop-documents/parse-index (AI Service)
      ↓ document_service.parse_document() via Azure Document Intelligence
            extract text per page + tables
      ↓ search_service.upload_chunks() → Azure AI Search BM25 index
  ↓ Backend: UPDATE sop_documents status=indexed, chunk_count=N, indexed_at=now
  ↓ Response: SopDocument metadata + message
```

Jika AI Service gagal (timeout/error):
```
  ↓ Backend: UPDATE sop_documents status=failed, error_message=...
  ↓ Response: 503 ServiceUnavailable
```

### Delete Flow

```
User klik hapus di SopDocumentList
  ↓ DELETE /api/v1/sop-documents/:id (Backend)
  ↓ Best-effort: DELETE /ai/v1/sop-documents/{id}/index (AI Service)
        search_service.delete_document(document_id) → Azure AI Search
  ↓ Prisma: DELETE sop_documents WHERE id=:id
  ↓ Response: { message }
```

### Test Upload PDF Manual (PowerShell)

```powershell
# 1. Login
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3001/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"analis@lab.com","password":"password123"}'
$token = $login.data.access_token

# 2. Upload PDF SOP
$form = [System.Net.Http.MultipartFormDataContent]::new()
$fileBytes = [System.IO.File]::ReadAllBytes("C:\path\to\sop.pdf")
$fileContent = [System.Net.Http.ByteArrayContent]::new($fileBytes)
$fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new("application/pdf")
$form.Add($fileContent, "file", "sop-qc.pdf")
$form.Add([System.Net.Http.StringContent]::new("SOP Penanganan QC"), "title")

$client = [System.Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.Add("Authorization", "Bearer $token")
$response = $client.PostAsync("http://localhost:3001/api/v1/sop-documents/upload", $form).Result
$response.Content.ReadAsStringAsync().Result

# 3. List dokumen
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/sop-documents" `
  -Headers @{ Authorization = "Bearer $token" }
```

### Troubleshooting Upload

| Error | Penyebab | Solusi |
|---|---|---|
| `Hanya file PDF yang diizinkan` | File bukan PDF | Pastikan file berekstensi .pdf |
| `Ukuran file maksimal 5 MB` | File terlalu besar | Compress PDF atau split per bab |
| `Dokumen tidak menghasilkan chunk` | PDF scan/gambar bukan teks | Gunakan PDF dengan teks terseleksi |
| `Azure Document Intelligence not configured` | `.env` belum diisi | Set `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` dan `KEY` |
| `Azure AI Search not configured` | `.env` belum diisi | Set `AZURE_AI_SEARCH_ENDPOINT` dan `KEY` |
| `502` dari AI Service | Parse gagal | Cek log AI Service — kemungkinan quota Document Intelligence habis (F0: 500 hal/bulan) |

---

## Groq Generative Provider (Langkah 7)

Provider generatif untuk jawaban SOP. Retrieval tetap BM25, Groq hanya dipanggil jika chunks tersedia.

### Konfigurasi

```bash
# apps/ai-service/.env

# Pilih "groq" untuk mengaktifkan Groq LLaMA, "template_fallback" untuk template saja
AI_GENERATIVE_PROVIDER=groq
AI_GENERATIVE_TIMEOUT_SECONDS=20

# Dapatkan API key gratis dari https://console.groq.com → API Keys
GROQ_API_KEY=<api-key-dari-groq>
GROQ_MODEL=llama-3.1-8b-instant
```

### Fallback Chain

```
AI_GENERATIVE_PROVIDER != "groq"   →  mode = template_bm25
GROQ_API_KEY kosong                →  mode = fallback_template_bm25
Groq timeout / HTTP error          →  mode = fallback_template_bm25
Groq berhasil                      →  mode = groq_llm
```

Endpoint `/ai/v1/sop-question` selalu mengembalikan jawaban — tidak pernah raise exception ke caller.

### Test Script

```powershell
# Tanpa GROQ_API_KEY — expected: template_bm25 atau fallback_template_bm25
cd apps/ai-service
.\labcermat\Scripts\python.exe scripts/test_sop_groq.py

# Dengan GROQ_API_KEY di .env dan AI_GENERATIVE_PROVIDER=groq — expected: groq_llm
```

---

## File yang Terlibat

```
apps/ai-service/app/services/document_service.py   # Parse + chunk
apps/ai-service/app/services/search_service.py     # Index + search BM25
apps/ai-service/app/services/sop_service.py        # BM25 retrieval + delegate ke generative_service
apps/ai-service/app/services/generative_service.py # Groq provider + template fallback (Langkah 7)
apps/ai-service/app/api/v1/sop.py                  # Router POST /ai/v1/sop-question
apps/ai-service/app/api/v1/router.py               # Register sop_router
apps/ai-service/app/models/ai_models.py            # SopQuestionRequest/Response/Source
apps/ai-service/scripts/test_document_search.py    # Test Langkah 2
apps/ai-service/scripts/test_sop_question.py       # Test Langkah 3
apps/ai-service/scripts/test_sop_groq.py           # Test Langkah 7 — Groq provider
apps/ai-service/requirements.txt                   # Dependencies baru
apps/ai-service/.env.example                       # Env var dokumentasi
apps/ai-service/app/core/config.py                 # Settings fields

# Langkah 6 — Upload/Parse/Index/Delete Pipeline
apps/backend/prisma/schema.prisma                  # SopDocument model + SopDocumentStatus enum
apps/backend/src/modules/sop-documents/            # NestJS module upload/list/delete
apps/backend/src/app.module.ts                     # SopDocumentsModule registered
apps/ai-service/app/api/v1/sop_documents.py        # parse-index + delete index endpoints
apps/frontend/src/hooks/useSopDocuments.ts         # useSopDocuments, useUploadSopDocument, useDeleteSopDocument
apps/frontend/src/components/sop/DocumentUploadForm.tsx   # PDF drag-drop upload form
apps/frontend/src/components/sop/SopDocumentList.tsx      # document list + status badge + delete
apps/frontend/src/pages/SopAssistantPage.tsx       # Updated — collapsible document section
```
