# Sprint 8 — Final Summary
# SOP Assistant, Document Parsing, Azure Search & Groq

**Tanggal selesai:** 2026-05-20  
**Status:** ✅ SELESAI — semua 7 langkah selesai dan live-tested  
**Sprint sebelumnya:** Sprint 7 ✅ (Azure ML QC Anomaly Detector aktif)

---

## 1. Fitur yang Selesai

| Fitur | Deskripsi |
|---|---|
| **SOP Document Upload** | Upload PDF SOP via frontend, simpan metadata ke `sop_documents` tabel |
| **PDF Parsing** | Azure AI Document Intelligence `prebuilt-layout` extract text + tabel per halaman |
| **Chunk Indexing** | 1500 chars/chunk, 150 overlap, diindeks ke Azure AI Search dengan `id.lucene` analyzer |
| **BM25 Retrieval** | Full-text keyword search Bahasa Indonesia, top-K chunks dikembalikan dengan score |
| **SOP Assistant Q&A** | Pertanyaan → BM25 retrieval → Groq/template answer → source citation + safety note |
| **Groq Generative Answer** | Groq LLaMA (`llama-3.1-8b-instant`), grounded pada retrieved chunks, Bahasa Indonesia |
| **Template Fallback** | Jika Groq tidak tersedia atau gagal → template BM25 otomatis, endpoint tidak pernah crash |
| **Backend Gateway** | `POST /api/v1/ai/sop-question` + `sop-documents` CRUD (upload/list/delete) |
| **Frontend /sop** | Q&A form, SopAnswerCard (mode badge, answer, sources, safety note), DocumentUploadForm, SopDocumentList |
| **AI Analysis Log** | Setiap query SOP dicatat ke `ai_analysis_logs` dengan `analysis_type = sop_question` |

---

## 2. Azure Resources yang Digunakan

| Resource | Nama | Region | Tier | Dipakai untuk |
|---|---|---|---|---|
| Azure AI Document Intelligence | `docint-labcermat` | japanwest | Free F0 | Parse PDF SOP |
| Azure AI Search | `search-labcermat` | eastasia | Free | Index + BM25 keyword search |
| Azure ML Workspace (Sprint 7) | `mlw-labcermat` | eastasia | — | QC anomaly model artifact |

> **Azure OpenAI / AI Foundry tidak dipakai di Sprint 8.** Resource dibuat (`aoai-labcermat`) tetapi tidak dapat di-deploy model karena Azure for Students memblokir quota dan region untuk model deployment.

---

## 3. Alasan Azure Foundry/OpenAI Tidak Dipakai

Azure for Students subscription membatasi akses `Microsoft.CognitiveServices/accounts` untuk resource quota di semua region yang tersedia (`eastasia`, `japanwest`, `indonesiacentral`, `centralindia`, `malaysiawest`). Percobaan deployment `gpt-4o-mini` dan `text-embedding-3-small` menghasilkan `QuotaExceeded` atau `ResourceNotFound` di semua region.

Groq dipilih sebagai pengganti karena:
- Gratis (free tier cukup untuk demo)
- Tidak ada region restriction
- API kompatibel dengan OpenAI Chat Completions format
- Model `llama-3.1-8b-instant` cepat (<1s) dan cukup untuk SOP Q&A

---

## 4. Alasan Embedding/Vector Search Ditunda

Embedding Azure OpenAI (`text-embedding-3-small`) bergantung pada Azure OpenAI endpoint yang sama — tidak tersedia di Sprint 8. Hybrid/vector search direncanakan di Sprint 9 jika akses Azure OpenAI tersedia, atau dengan alternatif embedding model (Sentence Transformers lokal atau Groq dengan embedding API).

BM25 Indonesian Lucene analyzer (`id.lucene`) terbukti cukup baik untuk MVP use case keyword query SOP.

---

## 5. Fallback Architecture

```
POST /ai/v1/sop-question
  ↓
search_service.search() — Azure AI Search BM25
  ├── search not configured → mode: search_unavailable
  ├── search error          → mode: search_error
  └── hits found
       ↓
       generative_service.generate_sop_answer()
         ├── AI_GENERATIVE_PROVIDER != "groq"  → mode: template_bm25
         ├── GROQ_API_KEY kosong               → mode: fallback_template_bm25
         ├── Groq timeout / HTTP error         → mode: fallback_template_bm25
         └── Groq 200 OK                       → mode: groq_llm

Endpoint TIDAK PERNAH raise exception ke caller.
safety_note SELALU disertakan dalam setiap response.
```

---

## 6. File Utama yang Berubah/Dibuat

### AI Service

| File | Status |
|---|---|
| `app/services/document_service.py` | Dibuat — Azure Document Intelligence parse + chunk |
| `app/services/search_service.py` | Dibuat — Azure AI Search BM25 index + query |
| `app/services/sop_service.py` | Dibuat + diperbarui — BM25 retrieval, delegate ke generative_service |
| `app/services/generative_service.py` | Dibuat — Groq provider + template fallback (Langkah 7) |
| `app/api/v1/sop.py` | Dibuat — `POST /ai/v1/sop-question` |
| `app/api/v1/sop_documents.py` | Dibuat — parse-index + delete-index |
| `app/api/v1/router.py` | Diperbarui — register sop + sop_documents router |
| `app/models/ai_models.py` | Diperbarui — SopQuestionRequest/Response/Source, ParseIndexResponse |
| `app/core/config.py` | Diperbarui — Azure Search, Doc Intel, Groq settings |
| `.env.example` | Diperbarui — dokumentasi semua env var baru |
| `requirements.txt` | Diperbarui — azure-ai-documentintelligence, azure-search-documents, httpx |
| `scripts/test_document_search.py` | Dibuat — test Langkah 2 |
| `scripts/test_sop_question.py` | Dibuat — test Langkah 3 |
| `scripts/test_sop_groq.py` | Dibuat — test Langkah 7 |

### Backend

| File | Status |
|---|---|
| `prisma/schema.prisma` | Diperbarui — `SopDocument` model + `SopDocumentStatus` enum |
| `prisma/migrations/20260520051043_add_sop_documents/` | Dibuat — migration |
| `src/modules/sop-documents/` | Dibuat — controller, service, module, DTO |
| `src/modules/ai/ai.service.ts` | Diperbarui — `askSopQuestion()` method |
| `src/modules/ai/ai.controller.ts` | Diperbarui — `POST /ai/sop-question` endpoint |
| `src/modules/ai/dto/sop-question.dto.ts` | Dibuat — SopQuestionDto, SopQuestionAiResponse |
| `src/app.module.ts` | Diperbarui — SopDocumentsModule registered |

### Frontend

| File | Status |
|---|---|
| `src/pages/SopAssistantPage.tsx` | Dibuat — Q&A form + document management |
| `src/components/sop/SopAnswerCard.tsx` | Dibuat — answer card dengan mode badge, sources, safety note |
| `src/components/sop/DocumentUploadForm.tsx` | Dibuat — drag-drop PDF upload |
| `src/components/sop/SopDocumentList.tsx` | Dibuat — document list + status badge + delete |
| `src/hooks/useSop.ts` | Dibuat — `useAskSopQuestion()` mutation |
| `src/hooks/useSopDocuments.ts` | Dibuat — `useSopDocuments`, `useUploadSopDocument`, `useDeleteSopDocument` |
| `src/components/layout/Sidebar.tsx` | Diperbarui — tambah "SOP Assistant" nav item |
| `src/router/index.tsx` | Diperbarui — route `/sop` |

---

## 7. API Endpoints Baru

### AI Service

| Method | Path | Keterangan |
|---|---|---|
| `POST` | `/ai/v1/sop-question` | BM25 retrieval + Groq/template answer |
| `POST` | `/ai/v1/sop-documents/parse-index` | Parse PDF + indeks ke Azure AI Search |
| `DELETE` | `/ai/v1/sop-documents/{document_id}/index` | Hapus index dari Azure AI Search |

### Backend

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| `POST` | `/api/v1/ai/sop-question` | analis, supervisor | SOP Q&A gateway |
| `POST` | `/api/v1/sop-documents/upload` | analis, supervisor | Upload PDF SOP |
| `GET` | `/api/v1/sop-documents` | analis, supervisor | List dokumen SOP lab |
| `DELETE` | `/api/v1/sop-documents/:id` | analis, supervisor | Hapus dokumen + index |

---

## 8. Frontend Pages/Components Baru

| Komponen | Route/Path | Keterangan |
|---|---|---|
| `SopAssistantPage` | `/sop` | Halaman utama SOP Assistant |
| `SopAnswerCard` | — | Card jawaban dengan mode badge, sumber, safety note |
| `DocumentUploadForm` | — | Drag-drop PDF upload form (max 5 MB) |
| `SopDocumentList` | — | List dokumen dengan status badge + delete |

**Mode badge di SopAnswerCard:**

| Mode | Badge | Warna |
|---|---|---|
| `groq_llm` | Groq LLaMA | default (teal) |
| `template_bm25` | Template + Azure Search | default |
| `fallback_template_bm25` | Fallback Template | warning (amber) |
| `no_relevant_source` | Tidak ada sumber | secondary |
| `search_unavailable` | Search unavailable | warning |
| `search_error` | Search error | destructive |

---

## 9. Cara Menjalankan Mode Groq

```bash
# apps/ai-service/.env

# Aktifkan Groq:
AI_GENERATIVE_PROVIDER=groq
GROQ_API_KEY=<api-key-dari-https://console.groq.com/keys>
GROQ_MODEL=llama-3.1-8b-instant

# Timeout Groq API call (detik):
AI_GENERATIVE_TIMEOUT_SECONDS=20
```

Mode tanpa Groq (default aman — tidak perlu API key):
```bash
AI_GENERATIVE_PROVIDER=template_fallback
```

---

## 10. Cara Mengetes Upload PDF

```powershell
# 1. Start semua service
# Terminal 1: cd apps/backend; pnpm dev
# Terminal 2: cd apps/frontend; pnpm dev
# Terminal 3: cd apps/ai-service; .\labcermat\Scripts\uvicorn app.main:app --reload

# 2. Login
$login = Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3001/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"analis@lab.com","password":"password123"}'
$token = $login.data.access_token

# 3. Upload PDF
$form = [System.Net.Http.MultipartFormDataContent]::new()
$fileBytes = [System.IO.File]::ReadAllBytes("C:\path\to\sop.pdf")
$fc = [System.Net.Http.ByteArrayContent]::new($fileBytes)
$fc.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new("application/pdf")
$form.Add($fc, "file", "sop.pdf")
$form.Add([System.Net.Http.StringContent]::new("Judul SOP"), "title")
$client = [System.Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.Add("Authorization", "Bearer $token")
$client.PostAsync("http://localhost:3001/api/v1/sop-documents/upload", $form).Result.Content.ReadAsStringAsync().Result
```

---

## 11. Cara Mengetes SOP Question

```powershell
# Test via Backend (authenticated)
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3001/api/v1/ai/sop-question" `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body '{"question":"Apa prosedur kalibrasi hematology analyzer?","topK":5}'

# Test via AI Service langsung (Langkah 7 test script)
cd apps/ai-service
.\labcermat\Scripts\python.exe scripts/test_sop_groq.py
```

---

## 12. Known Limitations

| Limitation | Keterangan | Sprint Target |
|---|---|---|
| Tidak ada per-lab document isolation | Semua lab menggunakan satu index `labcermat-sop-index` | Sprint 9 |
| Tidak ada vector/semantic search | BM25 keyword-only; query harus menggunakan kata kunci yang ada di dokumen | Sprint 9 (jika Azure OpenAI tersedia) |
| Free tier Document Intelligence (500 hal/bulan) | Cukup untuk demo; perlu upgrade untuk production | Sprint 9 |
| Free tier Azure AI Search (50 MB, 1 index) | Cukup untuk MVP; perlu upgrade untuk multi-lab | Sprint 9 |
| AI Explanation card tidak diimplementasi | Fitur penjelasan AI untuk QC/result/summary bergantung pada Azure OpenAI | Sprint 9 |
| PDF scan/gambar tidak didukung | Azure Document Intelligence `prebuilt-layout` memerlukan PDF dengan teks terseleksi | Dokumentasikan di user guide |
| Groq rate limit (free tier) | Free tier Groq: ~30 req/menit | Cukup untuk demo; upgrade untuk production |

---

## 13. Persiapan Sprint 9

| Item | Prioritas | Keterangan |
|---|---|---|
| CI/CD GitHub Actions | Tinggi | Build + test pipeline, deploy ke staging |
| Azure deployment | Tinggi | Container Apps atau App Service untuk backend + AI service |
| Application Insights | Tinggi | Monitoring, error tracking, performance |
| Per-lab document isolation | Sedang | Filter `laboratory_id` di Azure AI Search |
| Embedding/vector search | Sedang | Aktifkan jika Azure OpenAI tersedia atau gunakan alternatif |
| AI Explanation card | Sedang | Bergantung pada Azure OpenAI atau Groq explanation endpoint |
| PDF scan support | Rendah | Azure Document Intelligence `prebuilt-read` atau OCR |
| Admin role UI | Rendah | Assign role via UI, gantikan hardcoded email mapping |

---

## 14. Safety & Security Notes

- **Tidak ada diagnosis medis.** Semua response AI menyertakan `safety_note` yang menyatakan output adalah bantuan operasional workflow laboratorium, bukan diagnosis medis.
- **Source-grounded.** Jawaban Groq hanya berdasarkan retrieved SOP chunks. System prompt secara eksplisit melarang informasi di luar sumber.
- **Tidak ada secret di repository.** `.env`, `.pkl`, `model.pkl`, `scaler.pkl` semua masuk `.gitignore` dan tidak pernah di-commit.
- **Azure key tidak pernah di-commit.** Hanya `.env.example` dengan value kosong yang masuk repository.
- **Sprint 7 azure_ml_artifact tidak diubah.** `qc_anomaly_ml_service.py` dan artifact inference tetap berfungsi secara independen dari Sprint 8.
