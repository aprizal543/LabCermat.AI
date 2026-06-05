# Sprint 8 — SOP Assistant, Document Parsing, Azure Search & Groq

**Tanggal dibuat:** 2026-05-14  
**Tanggal selesai:** 2026-05-20  
**Status:** ✅ SELESAI — semua 7 langkah selesai dan live-tested  
**Sprint sebelumnya:** Sprint 7 ✅ (Azure ML QC Anomaly, azure_ml_artifact inference aktif)

> **Region policy:** Subscription Azure for Students hanya mengizinkan `eastasia`,
> `indonesiacentral`, `centralindia`, `japanwest`, `malaysiawest`. Default: `eastasia`.
> Jangan hardcode `eastus` atau region lain. Lihat `docs/SPRINT_8_AZURE_RESOURCES.md`.
>
> **Managed Online Endpoint:** Tetap blocked (`SubscriptionNotRegistered`).
> Tidak dicoba ulang di Sprint 8. QC anomaly inference tetap `azure_ml_artifact` via FastAPI.
> Lihat `ml/MANAGED_ENDPOINT_BLOCKER.md`.

---

## 1. Objective Sprint 8

Mengintegrasikan **Azure AI Foundry / Azure OpenAI** untuk menghasilkan penjelasan bahasa alami pada tiga fitur utama (supervisor summary, result review, QC anomaly), serta membangun **SOP Assistant** berbasis RAG menggunakan Azure AI Document Intelligence + Azure AI Search.

Tujuan hackathon: membuktikan pipeline AI generatif end-to-end di atas infrastruktur Azure — dokumen SOP → parsing → indexing → retrieval → answer generation — semuanya grounded pada sumber yang dapat dikutip, tanpa output diagnosis medis.

---

## 2. Scope Sprint 8

| Area | Yang Dikerjakan |
|---|---|
| Azure OpenAI | Supervisor summary, result review explanation, QC anomaly explanation |
| Azure AI Document Intelligence | Parse PDF SOP/lab, extract text + table |
| Azure AI Search | Index hasil parsing, hybrid search, vector search |
| SOP Assistant (RAG) | Tanya jawab grounded pada SOP yang sudah diindeks |
| Frontend | SOP Assistant page, parsed docs list, AI explanation cards, source citation |
| Backend | Endpoint document upload, SOP QA, explanation trigger |
| AI Service | 4 service baru: openai_service, document_service, search_service, sop_service |
| Sprint 7 dipertahankan | azure_ml_artifact QC anomaly inference tetap aktif |

---

## 3. Out of Scope Sprint 8

- Training model ML baru (Sprint 7 cukup)
- Managed Online Endpoint Azure ML (masih blocked)
- Supabase schema migration yang kompleks — hanya 1 tabel baru jika diperlukan
- Document management enterprise (versioning, approval workflow)
- Multi-laboratorium document isolation (satu lab satu index — cukup untuk MVP)
- Real-time streaming response (non-streaming fetch cukup untuk hackathon)
- Azure Blob Storage untuk file binary — upload langsung ke Document Intelligence tanpa simpan blob permanen
- Perubahan auth flow
- Fitur di luar 4 area utama di atas

---

## 4. Azure Services Used

| Service | Penggunaan | Sprint |
|---|---|---|
| **Azure OpenAI** (via AI Foundry) | GPT-4o-mini untuk summary, explanation, SOP QA | Sprint 8 baru |
| **Azure AI Document Intelligence** | Parse PDF SOP → markdown/text + tables | Sprint 8 baru |
| **Azure AI Search** | Index SOP chunks, hybrid search (BM25 + vector) | Sprint 8 baru |
| **Azure ML artifact inference** | QC anomaly Random Forest classifier | Sprint 7 — dipertahankan |
| **Supabase PostgreSQL** | Database + auth — tidak berubah | Sprint 1–7 |

### Model Azure OpenAI yang Direkomendasikan

| Kebutuhan | Model | Alasan |
|---|---|---|
| Supervisor summary | `gpt-4o-mini` | Teks panjang, hemat token, cukup untuk template-augmented |
| Result review explanation | `gpt-4o-mini` | Penjelasan singkat, low latency |
| QC anomaly explanation | `gpt-4o-mini` | Augment hasil ML dengan bahasa alami |
| SOP Assistant RAG | `gpt-4o-mini` | RAG answer generation, grounded pada retrieved chunks |
| Embedding untuk search | `text-embedding-3-small` | 1536 dimensi, hemat quota, cukup untuk MVP |

---

## 5. Azure Resources Needed

```
Resource Group: rg-labcermat-ml-eastasia (existing)

Baru Sprint 8:
├── Azure AI Foundry Hub / Azure OpenAI resource
│     deployment: gpt-4o-mini
│     deployment: text-embedding-3-small
├── Azure AI Document Intelligence
│     tier: Free (F0) — 500 pages/bulan gratis
│     atau Standard (S0) jika F0 kuotanya habis
└── Azure AI Search
      tier: Free (1 index, 50 MB) — cukup untuk MVP
      atau Basic jika perlu lebih dari 1 index
```

**Cost guardrail:**
- OpenAI: gpt-4o-mini ~$0.15/1M input token — estimasi <$2 untuk hackathon demo
- Document Intelligence: Free tier cukup untuk demo (<500 halaman)
- AI Search: Free tier cukup (1 index, <50 MB dokumen SOP)
- **Total estimasi Sprint 8: <$5 selama demo**

---

## 6. Environment Variables

Tambahkan ke `apps/ai-service/.env` (jangan commit):

```bash
# ── Azure OpenAI (AI Foundry) ──────────────────────────────────
AZURE_OPENAI_ENDPOINT=https://[resource-name].openai.azure.com/
AZURE_OPENAI_API_KEY=<key dari Azure portal>
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small
AZURE_OPENAI_API_VERSION=2024-02-01

# ── Azure AI Document Intelligence ────────────────────────────
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://[resource-name].cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=<key dari Azure portal>

# ── Azure AI Search ───────────────────────────────────────────
AZURE_AI_SEARCH_ENDPOINT=https://[resource-name].search.windows.net
AZURE_AI_SEARCH_KEY=<key dari Azure portal>
AZURE_AI_SEARCH_INDEX=labcermat-sop

# ── Sprint 7 (tetap) ──────────────────────────────────────────
AI_MODE=azure_ml_artifact
AZURE_ML_MODEL_DIR=./app/qc-anomaly-detector
```

Field baru yang ditambahkan ke `apps/ai-service/app/core/config.py`:

```python
azure_openai_api_version: str = "2024-02-01"
azure_openai_embedding_deployment: str = "text-embedding-3-small"
azure_document_intelligence_endpoint: str = ""
azure_document_intelligence_key: str = ""
azure_ai_search_endpoint: str = ""
azure_ai_search_key: str = ""
azure_ai_search_index: str = "labcermat-sop"
```

---

## 7. Data Flow Architecture

### 7a. SOP Document Parsing & Indexing

```
Supervisor uploads PDF (via Frontend)
  ↓ POST /api/v1/documents/parse (Backend)
  ↓ Backend → POST /ai/v1/documents/parse (AI Service)
  ↓ AI Service → Azure AI Document Intelligence
        returns: text blocks + tables + page metadata
  ↓ AI Service chunks text (500 token / chunk, 50 token overlap)
  ↓ AI Service → Azure OpenAI text-embedding-3-small
        returns: vector per chunk
  ↓ AI Service → Azure AI Search: upsert documents
        fields: chunk_id, doc_id, title, page, content, content_vector
  ↓ AI Service → return parse result summary to Backend
  ↓ Backend saves sop_documents record to Supabase
  ↓ Frontend shows parsed doc in list
```

### 7b. SOP Assistant RAG

```
User types question (Frontend SOP Assistant page)
  ↓ POST /api/v1/ai/sop-question (Backend)
  ↓ Backend → POST /ai/v1/sop-question (AI Service)
  ↓ AI Service → Azure OpenAI embed question
  ↓ AI Service → Azure AI Search hybrid search
        returns: top 5 chunks (content + source metadata)
  ↓ if no chunks found → fallback: "SOP tidak ditemukan"
  ↓ AI Service → Azure OpenAI GPT-4o-mini
        system prompt: grounded SOP assistant
        context: retrieved chunks + sources
        returns: answer + source citations
  ↓ AI Service → return { answer, sources, mode }
  ↓ Backend saves log to ai_analysis_logs
  ↓ Frontend renders answer + source citation cards
```

### 7c. AI Explanation (OpenAI-augmented)

```
Existing rule_based / azure_ml_artifact result
  ↓ Backend already called AI Service (hook)
  ↓ User clicks "Lihat Penjelasan AI" di Frontend
  ↓ POST /api/v1/ai/explain/:logId (Backend)
  ↓ Backend reads existing ai_analysis_logs responseData
  ↓ Backend → POST /ai/v1/explain (AI Service)
        payload: { type, result_data, context }
  ↓ AI Service → Azure OpenAI GPT-4o-mini
        returns: explanation text (bahasa Indonesia, workflow-focused)
  ↓ Backend saves explanation log
  ↓ Frontend renders AiExplanationCard
```

---

## 8. Backend Changes

### Modul Baru

**`src/modules/documents/`** — document parsing & metadata

```
documents.module.ts
documents.controller.ts   POST /documents/parse, GET /documents
documents.service.ts      call AI Service, save to sop_documents table
dto/parse-document.dto.ts
```

### Perubahan pada Modul yang Ada

**`src/modules/ai/ai.controller.ts`** — tambah 2 endpoint baru:
```
POST /ai/sop-question     → SOP RAG QA
POST /ai/explain/:logId   → AI explanation dari existing log
```

**`src/modules/ai/ai.service.ts`** — tambah:
```typescript
async sopQuestion(question: string, currentUser: RequestUser)
async explainLog(logId: string, currentUser: RequestUser)
```

**`src/app.module.ts`** — import `DocumentsModule`

### Tidak Berubah
- `auth`, `samples`, `results`, `qc`, `dashboard`, `audit-logs` module
- Semua existing AI endpoint Sprint 6/7

---

## 9. AI Service Changes

### File Baru

```
apps/ai-service/app/services/
├── openai_service.py        # Azure OpenAI client wrapper (chat + embed)
├── document_service.py      # Azure Document Intelligence parsing + chunking
├── search_service.py        # Azure AI Search upsert + hybrid query
└── sop_service.py           # RAG pipeline: retrieve + generate + cite

apps/ai-service/app/api/v1/
├── documents.py             # POST /ai/v1/documents/parse
├── sop.py                   # POST /ai/v1/sop-question
└── explain.py               # POST /ai/v1/explain
```

### Perubahan pada File yang Ada

**`app/api/v1/router.py`** — include 3 router baru  
**`app/models/ai_models.py`** — tambah request/response models baru  
**`app/core/config.py`** — tambah field Azure OpenAI, Doc Intel, Search  
**`app/main.py`** — log startup tampilkan status Azure services  

### Tidak Berubah (Sprint 7 dipertahankan)
- `qc_anomaly_ml_service.py`
- `qc_anomaly_service.py` (fallback)
- `qc_anomaly.py` router

### Fallback Pattern (sama dengan Sprint 7)

Setiap service Azure baru harus punya fallback:

```python
# openai_service.py
try:
    result = await call_openai(...)
    return {"text": result, "mode": "azure_openai"}
except Exception as e:
    logger.warning("openai fallback: %s", e)
    return {"text": fallback_template(...), "mode": "fallback_template"}
```

---

## 10. Frontend Changes

### Halaman Baru

**`/sop`** — SOP Assistant page
```
src/pages/SopAssistantPage.tsx
  ├── Question input + submit button
  ├── Answer display dengan source citation cards
  ├── Parsed documents list (sidebar atau tab)
  └── Upload SOP PDF (supervisor only)
```

### Komponen Baru

```
src/components/ai/
├── AiExplanationCard.tsx    # Expandable card untuk AI explanation
├── SopAnswerCard.tsx        # RAG answer + source citation chips
└── SopDocumentList.tsx      # List dokumen SOP yang sudah diparsing

src/components/documents/
└── DocumentUploadForm.tsx   # File input + progress + status
```

### Perubahan Komponen yang Ada

**`AiAnomalyBadge.tsx`** — tambah tombol/link "Lihat Penjelasan" jika explanation tersedia  
**`SampleDetailPage.tsx`** — tambah `AiExplanationCard` di kartu Tinjauan AI  
**`DashboardPage.tsx`** — AiSummaryCard menggunakan response OpenAI jika tersedia  

### Hooks Baru

```
src/hooks/useSop.ts          # useAskSop, useSopDocuments, useUploadSop
src/hooks/useAiExplain.ts    # useAiExplanation(logId)
```

### Routing

```typescript
// src/router.tsx — tambah:
{ path: '/sop', element: <SopAssistantPage /> }
```

### Sidebar

Tambah item navigasi "SOP Assistant" di sidebar untuk role analis dan supervisor.

---

## 11. Database Changes

### Tabel Baru: `sop_documents`

Satu tabel baru untuk menyimpan metadata dokumen SOP yang sudah diparsing. Konten/chunks **tidak** disimpan di Supabase — hanya di Azure AI Search index.

```sql
CREATE TABLE sop_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES laboratories(id),
  title         TEXT NOT NULL,
  filename      TEXT NOT NULL,
  page_count    INT,
  chunk_count   INT,
  parse_status  TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'processing' | 'completed' | 'failed'
  parse_error   TEXT,
  uploaded_by   UUID REFERENCES users(id),
  parsed_at     TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Prisma schema tambahan:**
```prisma
model SopDocument {
  id          String    @id @default(uuid()) @db.Uuid
  laboratoryId String   @db.Uuid
  title       String
  filename    String
  pageCount   Int?
  chunkCount  Int?
  parseStatus String    @default("pending")
  parseError  String?
  uploadedBy  String?   @db.Uuid
  parsedAt    DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  laboratory  Laboratory @relation(fields: [laboratoryId], references: [id])
  uploader    User?      @relation("SopUploader", fields: [uploadedBy], references: [id])

  @@map("sop_documents")
}
```

**Migration:** 1 migration baru `add_sop_documents`.  
**`ai_analysis_logs`** tidak perlu diubah — log SOP QA disimpan dengan `analysis_type = "sop_question"`.

---

## 12. API Contract

### AI Service Endpoints Baru

#### `POST /ai/v1/documents/parse`

```json
// Request
{
  "doc_id": "uuid",
  "filename": "SOP-Hematologi.pdf",
  "file_base64": "<base64 encoded PDF>"
}

// Response
{
  "doc_id": "uuid",
  "page_count": 12,
  "chunk_count": 47,
  "mode": "azure_document_intelligence",
  "parsed_at": "2026-05-14T10:00:00Z"
}
```

#### `POST /ai/v1/sop-question`

```json
// Request
{
  "question": "Apa prosedur kalibrasi hematology analyzer?",
  "laboratory_id": "uuid",
  "top_k": 5
}

// Response
{
  "answer": "Berdasarkan SOP Lab, prosedur kalibrasi hematology analyzer adalah...",
  "sources": [
    {
      "doc_title": "SOP-Hematologi.pdf",
      "page": 4,
      "chunk_excerpt": "Kalibrasi dilakukan setiap hari sebelum..."
    }
  ],
  "mode": "azure_openai_rag",
  "model": "gpt-4o-mini",
  "retrieval_count": 3,
  "fallback_reason": null
}
```

#### `POST /ai/v1/explain`

```json
// Request
{
  "analysis_type": "qc_anomaly",
  "result_data": {
    "status": "perlu_perhatian",
    "confidence": 0.87,
    "mode": "azure_ml_artifact",
    "reason": "..."
  },
  "context": {
    "instrument_name": "Sysmex XN-1000",
    "control_type": "Level 1",
    "control_value": 14.2,
    "lower_limit": 11.0,
    "upper_limit": 13.0
  }
}

// Response
{
  "explanation": "Nilai kontrol 14.2 g/dL berada di atas batas atas 13.0 g/dL...",
  "recommendation": "Langkah yang disarankan: 1) Periksa larutan kontrol...",
  "mode": "azure_openai",
  "model": "gpt-4o-mini",
  "fallback_reason": null
}
```

### Backend Endpoints Baru

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| `POST` | `/api/v1/documents/parse` | supervisor | Upload + trigger parsing SOP PDF |
| `GET` | `/api/v1/documents` | analis, supervisor | List SOP documents milik lab |
| `POST` | `/api/v1/ai/sop-question` | analis, supervisor | Tanya SOP Assistant |
| `POST` | `/api/v1/ai/explain/:logId` | analis, supervisor | Minta penjelasan dari log AI |

---

## 13. Prompt Design

### 13a. Supervisor Summary Prompt

```
SYSTEM:
Kamu adalah asisten ringkasan operasional untuk laboratorium klinik.
Tugasmu: buat ringkasan shift yang singkat, faktual, dan berdasarkan data yang diberikan.
Jangan membuat diagnosis medis. Jangan menyebut nama pasien.
Output harus berupa workflow decision support untuk supervisor laboratorium.
Tulis dalam Bahasa Indonesia yang profesional. Maksimal 3 paragraf.

USER:
Data shift laboratorium {lab_name} selama {shift_hours} jam terakhir:
- Total sampel masuk: {total_samples}
- Sampel tervalidasi: {validated_count} ({validation_rate}%)
- Sampel minta cek ulang: {recheck_count}
- Masalah QC terdeteksi: {qc_issues_count}
- Analis bertugas: {analis_list}

Buat ringkasan operasional shift dan rekomendasi prioritas untuk supervisor.
```

### 13b. Result Review Explanation Prompt

```
SYSTEM:
Kamu adalah asisten penjelasan hasil pemeriksaan laboratorium untuk analis.
Tugasmu: jelaskan flag hasil pemeriksaan dalam konteks operasional laboratorium.
Jangan membuat interpretasi klinis atau diagnosis medis.
Fokus pada: apakah nilai di dalam/luar rentang rujukan, seberapa jauh deviasi, dan
langkah operasional yang disarankan (cek ulang, verifikasi metode, dll).
Tulis dalam Bahasa Indonesia yang jelas dan singkat.

USER:
Hasil flag AI untuk sampel {sample_code}:
- Flag status: {flag_status}
- Alasan: {reason}
- Parameter yang bermasalah: {flagged_parameters}

Berikan penjelasan singkat tentang temuan ini dan langkah operasional yang disarankan.
```

### 13c. QC Anomaly Explanation Prompt

```
SYSTEM:
Kamu adalah asisten penjelasan anomali QC untuk analis laboratorium.
Tugasmu: jelaskan hasil deteksi anomali QC dalam konteks operasional alat.
Jangan membuat diagnosis medis atau interpretasi hasil pasien.
Fokus pada: kondisi alat QC, tren nilai kontrol, dan langkah kalibrasi/pemeliharaan.
Tulis dalam Bahasa Indonesia yang singkat dan dapat dipahami analis.

USER:
Deteksi anomali QC untuk {instrument_name}, kontrol {control_type}:
- Nilai kontrol: {control_value} {unit}
- Rentang kontrol: {lower_limit} – {upper_limit} {unit}
- Status AI: {status} (confidence: {confidence_pct}%)
- Mode: {mode}
- Alasan: {reason}

Berikan penjelasan tentang kondisi ini dan langkah operasional yang disarankan.
```

### 13d. SOP Assistant Prompt

```
SYSTEM:
Kamu adalah asisten SOP laboratorium klinik. Tugasmu menjawab pertanyaan berdasarkan
dokumen SOP yang sudah diindeks dari laboratorium ini.

ATURAN KETAT:
1. Jawab HANYA berdasarkan konten SOP yang diberikan dalam konteks.
2. Jika konten SOP tidak mencukupi untuk menjawab, katakan:
   "Informasi ini tidak ditemukan dalam SOP yang tersedia."
3. Jangan menambahkan informasi dari pengetahuan umum.
4. Jangan membuat diagnosis medis.
5. Selalu sebutkan sumber SOP (nama dokumen + halaman) di akhir jawaban.
6. Tulis dalam Bahasa Indonesia yang profesional.

KONTEKS SOP (hasil retrieval):
{retrieved_chunks_with_sources}

USER:
{question}
```

---

## 14. Document Parsing Design

### Input
- Format: PDF (utama), maksimal 20 halaman per dokumen untuk Free tier
- Upload: multipart form-data via Backend, di-forward ke AI Service sebagai base64
- Tidak disimpan permanen di server — hanya diproses in-memory

### Extraction (Azure AI Document Intelligence)
```python
# Menggunakan model "prebuilt-layout"
# Output: AnalyzeResult dengan pages, tables, paragraphs

result = {
    "pages": [
        {
            "page_number": 1,
            "content": "teks paragraf...",
            "tables": [
                {
                    "row_count": 3,
                    "column_count": 2,
                    "cells": [...]
                }
            ]
        }
    ]
}
```

### Chunking
- Strategi: sliding window per paragraf, max 500 token per chunk
- Overlap: 50 token antar chunk (untuk konteks lintas paragraf)
- Metadata per chunk: `doc_id`, `doc_title`, `page_number`, `chunk_index`
- Table cells digabung sebagai teks sebelum di-chunk

### Indexing ke Azure AI Search

```python
# Schema index "labcermat-sop"
{
  "fields": [
    {"name": "chunk_id",        "type": "Edm.String", "key": True},
    {"name": "doc_id",          "type": "Edm.String", "filterable": True},
    {"name": "laboratory_id",   "type": "Edm.String", "filterable": True},
    {"name": "doc_title",       "type": "Edm.String", "searchable": True},
    {"name": "page_number",     "type": "Edm.Int32"},
    {"name": "chunk_index",     "type": "Edm.Int32"},
    {"name": "content",         "type": "Edm.String", "searchable": True},
    {"name": "content_vector",  "type": "Collection(Edm.Single)",
     "dimensions": 1536, "vectorSearchProfile": "hnsw-profile"}
  ]
}
```

### Metadata di Supabase (`sop_documents`)
- `parse_status`: `pending` → `processing` → `completed` / `failed`
- `chunk_count`: jumlah chunk yang berhasil diindeks
- `page_count`: jumlah halaman dokumen

---

## 15. SOP Assistant RAG Design

### Retrieval
```python
# Hybrid search: BM25 (keyword) + vector (semantic)
search_results = search_client.search(
    search_text=question,          # BM25
    vector_queries=[{
        "vector": question_embedding,
        "fields": "content_vector",
        "k": top_k,
    }],
    filter=f"laboratory_id eq '{laboratory_id}'",  # isolasi per lab
    top=top_k,   # default 5
    select=["chunk_id", "doc_title", "page_number", "content"]
)
```

### Answer Generation
- Input: question + top-5 retrieved chunks (total ~2000 token context)
- Model: gpt-4o-mini, max_tokens=500, temperature=0.1
- Format output: jawaban teks + list sumber

### Source Citation
```json
{
  "sources": [
    {
      "doc_title": "SOP-Hematologi-v2.pdf",
      "page": 4,
      "chunk_excerpt": "Kalibrasi dilakukan setiap hari sebelum operasi..."
    }
  ]
}
```

### Fallback Scenarios

| Kondisi | Response |
|---|---|
| Azure AI Search tidak tersedia | `mode: "fallback_no_search"`, pesan: "SOP Assistant sementara tidak tersedia." |
| Retrieval count = 0 | `mode: "no_results"`, pesan: "Informasi ini tidak ditemukan dalam SOP yang tersedia." |
| Azure OpenAI tidak tersedia | `mode: "fallback_retrieval_only"`, kembalikan chunks tanpa generated answer |
| Dokumen belum diupload | Pesan: "Belum ada dokumen SOP yang diindeks untuk laboratorium ini." |

---

## 16. Safety Guardrails

### No Diagnosis
- System prompt semua endpoint OpenAI secara eksplisit melarang diagnosis medis
- Output AI selalu diberi label `"mode": "azure_openai"` atau `"fallback_*"` — bukan keputusan klinis
- Frontend menampilkan disclaimer kecil di bawah setiap AI output: "Output AI adalah bantuan operasional, bukan diagnosis medis."

### Source-Grounded SOP Answer
- SOP Assistant **hanya** menjawab berdasarkan retrieved chunks
- Jika `retrieval_count = 0`, jawaban fallback yang sudah ditetapkan
- Source citation wajib ditampilkan — user dapat verifikasi ke dokumen asli
- `laboratory_id` filter di Azure AI Search — lab A tidak bisa membaca SOP lab B

### No Hallucinated SOP
- Prompt mewajibkan model menyebutkan keterbatasan jika konteks tidak cukup
- Temperature rendah (0.1) untuk mengurangi variasi/kreasi bebas
- Backend tidak meneruskan ke OpenAI jika `retrieval_count = 0` — langsung fallback

### Fallback jika Azure Service Unavailable
- Semua service Azure dibungkus try/except dengan fallback yang jelas
- Mode string di response selalu mengindikasikan apakah Azure berhasil atau fallback
- QC anomaly (Sprint 7) tidak terpengaruh — sudah punya fallback sendiri

---

## 17. Acceptance Criteria

| Kriteria | Cara Verifikasi |
|---|---|
| Azure OpenAI resource berhasil dibuat | `az cognitiveservices account show ...` → status Succeeded |
| Deployment gpt-4o-mini tersedia | `az cognitiveservices account deployment show ...` |
| Document Intelligence resource tersedia | Test parse 1 PDF SOP sederhana |
| AI Search index `labcermat-sop` dibuat | `az search index show ...` |
| Upload PDF SOP via frontend berhasil | parse_status = "completed" di Supabase |
| Chunks terindeks di Azure AI Search | Query langsung ke Search index |
| SOP Assistant menjawab pertanyaan | Response punya `sources` ≥ 1 |
| Source citation tampil di frontend | Chip/card sumber muncul di bawah jawaban |
| Jawaban SOP tidak ada diagnosis medis | Review manual 5 pertanyaan test |
| Fallback SOP (tidak ada dokumen) | Response `mode: "no_results"` dengan pesan yang benar |
| Supervisor summary pakai OpenAI | Response `mode: "azure_openai"` di AiSummaryCard |
| Result review explanation tersedia | AiExplanationCard muncul di SampleDetailPage |
| QC anomaly explanation tersedia | Explanation dapat dipanggil dari AiAnomalyBadge |
| Sprint 7 QC anomaly tetap jalan | `mode: "azure_ml_artifact"` + confidence masih muncul |
| Typecheck 0 error (semua package) | `npx tsc --noEmit` + Python AST check |
| Tidak ada secret di git | `git status` tidak ada `.env`, key, atau credential |

---

## 18. Risks and Mitigation

| Risiko | Kemungkinan | Mitigasi |
|---|---|---|
| Azure OpenAI quota habis saat demo | Sedang | Pakai gpt-4o-mini (hemat), batasi max_tokens=500, tambah fallback template |
| Document Intelligence Free tier 500 halaman habis | Rendah | Upload hanya dokumen demo kecil (<10 halaman), pakai Standard jika perlu |
| AI Search Free tier 1 index penuh | Rendah | Hanya 1 index untuk MVP, satu lab satu index |
| Latency OpenAI terlalu tinggi | Sedang | Non-streaming, timeout 30s, fallback ke template jika timeout |
| PDF parsing gagal (format tidak standar) | Sedang | Hanya support PDF text-based (bukan scan), validasi di frontend |
| Azure for Students restriction baru | Rendah | Semua service di atas didukung Azure for Students kecuali Managed Endpoint |
| Hallucination SOP assistant | Sedang | Temperature 0.1, strict system prompt, fallback jika retrieval_count=0 |
| Sprint 7 QC inference rusak | Rendah | Tidak menyentuh `qc_anomaly_ml_service.py` sama sekali |

---

## 19. Cost Control

| Item | Kontrol |
|---|---|
| gpt-4o-mini tokens | max_tokens=500 per call, tidak ada streaming, tidak ada retry loop |
| Embedding calls | Hanya saat parsing dokumen (bukan saat setiap query) |
| Document Intelligence | Free tier F0, maksimal 10 halaman per dokumen demo |
| AI Search | Free tier, 1 index, tidak ada replicas |
| OpenAI deployment | Pakai `gpt-4o-mini` bukan `gpt-4o` — 15× lebih murah |
| Monitoring | Log semua token usage ke console, alert jika >100K token/hari |

**Estimasi total Sprint 8 demo: < $5**

---

## 20. Implementation Steps

Urutan aman — setiap langkah independen dan dapat diverifikasi sebelum lanjut:

### Langkah 1 — Azure Resources Setup ✅
- Buat Azure OpenAI resource di AI Foundry (`aoai-labcermat`, region eastasia)
- Deploy `gpt-4o-mini` dan `text-embedding-3-small`
- Buat Azure AI Document Intelligence resource (`docint-labcermat`, Free F0)
- Buat Azure AI Search resource (`search-labcermat`, Free tier)
- Update `.env.example` dengan semua env var Sprint 8 baru
- Update `config.py` dengan field + `openai_configured` / `search_configured` properties
- Dokumen resource: `docs/SPRINT_8_AZURE_RESOURCES.md`
- Verifikasi: `python -c "from app.core.config import settings; print(settings.openai_configured)"`

### Langkah 2 — Document Intelligence + AI Search Keyword ✅
- `document_service.py`: parse PDF via prebuilt-layout, chunk 1500 char / 150 overlap
- `search_service.py`: BM25/keyword only (`id.lucene` analyzer), ensure_index, upload, search, delete
- `scripts/test_document_search.py`: 3 chunk dummy, create index, upload, query, cleanup
- `docs/SPRINT_8_DOCUMENT_SEARCH.md`: panduan lengkap setup + troubleshooting
- **Catatan:** Embedding / vector search **ditunda** — Azure OpenAI embedding tidak tersedia di subscription
- **Catatan:** Document Intelligence region `japanwest` (bukan `eastasia`) — berfungsi normal

### Langkah 3 — Template-based SOP Answer Service (AI Service) ✅
> **Catatan adaptasi:** Azure OpenAI tidak tersedia (region policy + 504 timeout).
> Langkah 3 diubah menjadi SOP template answer berbasis BM25 retrieval saja (tanpa LLM).
> OpenAI / Gemini / Groq dapat ditambahkan sebagai provider opsional di masa mendatang.

- `sop_service.py`: retrieve BM25 chunks → build template answer → return with citations
- `app/api/v1/sop.py`: router `POST /ai/v1/sop-question`
- Update `router.py`: register `sop_router` di `ai_router`
- `scripts/test_sop_question.py`: seed 3 chunk dummy, tanya 3 pertanyaan, print jawaban + sumber, cleanup
- Modes: `template_bm25`, `no_relevant_source`, `search_unavailable`, `search_error`, `validation_error`
- Safety note wajib di setiap response — tidak ada diagnosis medis
- Verifikasi: `.\labcermat\Scripts\python.exe scripts/test_sop_question.py`

### Langkah 4 — Document Intelligence + Chunking (AI Service)
- Buat `document_service.py`: parse PDF, chunk text, embed chunks
- Buat `documents.py` router: `POST /ai/v1/documents/parse`
- Smoke test dengan 1 PDF SOP sederhana
- Verifikasi: parse berhasil, chunk_count > 0

### Langkah 5 — Azure AI Search Indexing (AI Service)
- Buat `search_service.py`: create index schema, upsert docs, hybrid search
- Integrasikan dengan `document_service.py`
- Verifikasi: query Azure Search portal, chunks muncul

### Langkah 6 — Backend Documents Module
- Buat `documents.module.ts`, `documents.controller.ts`, `documents.service.ts`
- Prisma migration `add_sop_documents`
- Endpoint: `POST /api/v1/documents/parse`, `GET /api/v1/documents`
- Verifikasi: upload PDF via Postman, record muncul di Supabase

### Langkah 7 — SOP Assistant RAG (AI Service + Backend)
- Buat `sop_service.py`: retrieve + generate + cite
- Buat `sop.py` router: `POST /ai/v1/sop-question`
- Backend: tambah `sopQuestion()` ke `ai.service.ts`
- Backend: tambah `POST /ai/sop-question` endpoint ke controller
- Verifikasi: pertanyaan tentang SOP yang sudah diupload mendapat jawaban dengan sumber

### Langkah 8 — Frontend SOP Assistant Page
- Buat `SopAssistantPage.tsx`, `SopAnswerCard.tsx`, `SopDocumentList.tsx`
- Buat `useSop.ts` hook
- Tambah route `/sop` dan sidebar navigation
- Verifikasi: tanya pertanyaan dari UI, jawaban + sumber muncul

### Langkah 9 — Frontend AI Explanation Cards
- Buat `AiExplanationCard.tsx`
- Update `SampleDetailPage.tsx`, `AiAnomalyBadge.tsx`
- Buat `useAiExplain.ts` hook
- Verifikasi: klik "Lihat Penjelasan" pada AI result, card muncul

### Langkah 10 — Finalisasi Sprint 8
- Typecheck semua package: 0 error
- Review semua AI output: tidak ada diagnosis medis
- Review semua fallback: tidak ada hard crash
- Update docs: ARCHITECTURE.md v8.0, API_SPEC.md v8.0, README.md
- Sprint 8 summary

---

## File / Folder yang Dibuat atau Diubah

### Dibuat (Baru)

```
apps/ai-service/app/services/
├── openai_service.py
├── document_service.py
├── search_service.py
└── sop_service.py

apps/ai-service/app/api/v1/
├── documents.py
├── sop.py
└── explain.py

apps/backend/src/modules/documents/
├── documents.module.ts
├── documents.controller.ts
├── documents.service.ts
└── dto/parse-document.dto.ts

apps/frontend/src/pages/
└── SopAssistantPage.tsx

apps/frontend/src/components/ai/
├── AiExplanationCard.tsx
└── SopAnswerCard.tsx

apps/frontend/src/components/documents/
├── SopDocumentList.tsx
└── DocumentUploadForm.tsx

apps/frontend/src/hooks/
├── useSop.ts
└── useAiExplain.ts

apps/backend/prisma/migrations/
└── [timestamp]_add_sop_documents/

docs/SPRINT_8_PLAN.md   ← file ini
```

### Diubah (Existing)

```
apps/ai-service/app/core/config.py          # field baru Azure services
apps/ai-service/app/api/v1/router.py        # include 3 router baru
apps/ai-service/app/models/ai_models.py     # model request/response baru
apps/ai-service/app/api/v1/supervisor_summary.py  # OpenAI integration
apps/ai-service/app/main.py                 # log startup Azure services
apps/ai-service/.env                        # key baru (tidak di-commit)
apps/ai-service/.env.example               # dokumentasi key baru

apps/backend/src/app.module.ts              # import DocumentsModule
apps/backend/src/modules/ai/ai.controller.ts   # 2 endpoint baru
apps/backend/src/modules/ai/ai.service.ts     # sopQuestion, explainLog
apps/backend/prisma/schema.prisma           # SopDocument model

apps/frontend/src/App.tsx (atau router)    # route /sop
apps/frontend/src/components/layout/Sidebar.tsx  # nav item SOP Assistant
apps/frontend/src/components/ai/AiAnomalyBadge.tsx  # link ke explanation
apps/frontend/src/pages/SampleDetailPage.tsx # AiExplanationCard
apps/frontend/src/pages/DashboardPage.tsx   # AiSummaryCard OpenAI response
apps/frontend/src/hooks/useAi.ts           # type baru untuk explain + sop

docs/ARCHITECTURE.md    → v8.0
docs/API_SPEC.md        → v8.0
README.md               # Sprint 8 section
```

### Tidak Berubah (Sprint 7 dipertahankan)

```
apps/ai-service/app/services/qc_anomaly_ml_service.py  ← JANGAN DIUBAH
apps/ai-service/app/services/qc_anomaly_service.py     ← JANGAN DIUBAH
apps/ai-service/app/api/v1/qc_anomaly.py               ← JANGAN DIUBAH
apps/ai-service/app/qc-anomaly-detector/               ← JANGAN DIHAPUS
ml/                                                    ← JANGAN DIUBAH
```

---

## Acceptance Criteria Final (Checklist)

```
Azure Resources:
[ ] Azure OpenAI gpt-4o-mini deployment aktif
[ ] Azure OpenAI text-embedding-3-small deployment aktif
[ ] Azure AI Document Intelligence resource aktif
[ ] Azure AI Search index "labcermat-sop" dibuat dengan schema yang benar

AI Service:
[ ] openai_service.py: chat + embed berfungsi
[ ] document_service.py: parse PDF + chunk berfungsi
[ ] search_service.py: upsert + hybrid search berfungsi
[ ] sop_service.py: RAG pipeline end-to-end berfungsi
[ ] Semua endpoint baru merespons dengan benar
[ ] Semua fallback tidak crash

Backend:
[ ] DocumentsModule terdaftar di AppModule
[ ] POST /api/v1/documents/parse berhasil
[ ] GET /api/v1/documents mengembalikan list dokumen
[ ] POST /api/v1/ai/sop-question berhasil
[ ] POST /api/v1/ai/explain/:logId berhasil
[ ] Migration sop_documents berhasil

Frontend:
[ ] /sop route dapat diakses
[ ] Upload PDF SOP berhasil dari UI
[ ] SOP Assistant menjawab pertanyaan dengan sumber
[ ] AiExplanationCard muncul di SampleDetailPage
[ ] AiSummaryCard supervisor menampilkan OpenAI response
[ ] Tidak ada error TypeScript (npx tsc --noEmit)

Safety:
[ ] Tidak ada output diagnosis medis di semua prompt
[ ] Source citation muncul di semua SOP answer
[ ] Fallback message tepat jika tidak ada dokumen
[ ] Disclaimer "bantuan operasional" muncul di UI

Sprint 7 Tidak Rusak:
[ ] QC anomaly masih mode: "azure_ml_artifact"
[ ] Confidence masih muncul di AiAnomalyBadge
[ ] Fallback ke rule_based jika artifact error masih berfungsi
```

---

## Checklist Sebelum Mulai Implementasi Langkah 1

```
[ ] Azure for Students subscription masih aktif dan punya sisa credit
[ ] az login sudah dilakukan di terminal
[ ] az account show menunjukkan subscription yang benar
[ ] Konfirmasi region yang tersedia untuk Azure OpenAI
      (eastasia, southeastasia, atau eastus — tergantung quota Azure for Students)
[ ] Konfirmasi Azure AI Document Intelligence tersedia di subscription
[ ] Konfirmasi Azure AI Search Free tier tersedia di subscription
[ ] Sprint 7 AI service masih berjalan normal
      (test: POST /ai/v1/qc-anomaly → mode: "azure_ml_artifact")
[ ] .env file AI service sudah ada dan AZURE_ML_MODEL_DIR terisi
[ ] pnpm install sudah dijalankan
[ ] Python venv aktif di apps/ai-service
[ ] pip install openai azure-ai-documentintelligence azure-search-documents
      (cek requirements.txt dulu sebelum install)
```

---

## 20. Catatan Implementasi Final — 2026-05-20

### Deviasi dari Rencana Awal

| Rencana Awal | Implementasi Aktual | Alasan |
|---|---|---|
| Azure OpenAI GPT-4o-mini sebagai generative provider | **Groq LLaMA (`llama-3.1-8b-instant`)** | Azure for Students memblokir model deployment di semua region yang tersedia (`quota exceeded` / `region policy`). Groq gratis, tanpa region restriction. |
| Hybrid search BM25 + vector (Azure OpenAI embedding) | **BM25-only** (`id.lucene` Indonesian analyzer) | Azure OpenAI embedding endpoint tidak dapat dibuat karena quota / region policy yang sama. BM25 cukup untuk MVP use case keyword query SOP. |
| `POST /ai/v1/documents/parse` (base64 body) | **`POST /ai/v1/sop-documents/parse-index`** (multipart form-data) | Multipart lebih efisien untuk file besar; tidak perlu encode/decode base64. |
| AI Explanation card (QC, result review, supervisor summary) | **Tidak diimplementasi Sprint 8** | Azure OpenAI tidak tersedia; fitur ini bergantung sepenuhnya pada OpenAI. Dijadwalkan Sprint 9 jika akses Azure tersedia. |
| `laboratory_id` filter di Azure AI Search | **Tidak diimplementasi** | Single-tenant MVP — satu lab satu index cukup untuk hackathon demo. |

### Yang Selesai (Sprint 8 Aktual)

| Langkah | Deskripsi | Status |
|---|---|---|
| 1 | Azure resources setup (Document Intelligence + AI Search) | ✅ |
| 2 | `search_service.py` + `document_service.py` + test end-to-end | ✅ |
| 3 | `sop_service.py` + `POST /ai/v1/sop-question` + template answer | ✅ |
| 4 | Backend gateway `POST /api/v1/ai/sop-question` | ✅ |
| 5 | Frontend `SopAssistantPage` + `SopAnswerCard` + `useSop.ts` | ✅ |
| 6 | Document upload/parse/index/delete pipeline end-to-end | ✅ |
| 7 | Groq generative provider + `generative_service.py` + 3-tier fallback | ✅ |

### Komponen yang Tidak Berubah (Sprint 7 dipertahankan)

- `qc_anomaly_ml_service.py` — Azure ML artifact inference
- `qc_anomaly_service.py` — Rule-based Westgard fallback
- `qc_anomaly.py` router
- Semua auth, samples, results, QC, dashboard, audit-logs module
