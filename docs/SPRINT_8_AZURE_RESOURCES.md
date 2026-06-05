# Sprint 8 — Azure Resources Setup

**Tanggal dibuat:** 2026-05-14  
**Status:** Langkah 1 — Resources belum dibuat, panduan ini untuk setup manual

---

## Region Policy

Subscription Azure for Students hanya mengizinkan beberapa region Asia.
Gunakan urutan prioritas berikut saat membuat resource:

| Prioritas | Region | Kode | Catatan |
|---|---|---|---|
| 1 | East Asia | `eastasia` | **Default** — konsisten dengan Sprint 7 resource group |
| 2 | Indonesia Central | `indonesiacentral` | Alternatif jika eastasia quota habis |
| 3 | Central India | `centralindia` | Alternatif kedua |
| 4 | Japan West | `japanwest` | Alternatif ketiga |
| 5 | Malaysia West | `malaysiawest` | Terakhir |

> **Catatan:** Azure OpenAI ketersediaannya terbatas per region. Jika deployment model
> gagal di `eastasia`, coba `centralindia` atau `japaneast` (jika tersedia di subscription).
> Periksa ketersediaan di:
> [Azure OpenAI model availability](https://learn.microsoft.com/azure/ai-services/openai/concepts/models)

---

## Naming Convention

| Resource | Nama yang Direkomendasikan | Tipe |
|---|---|---|
| Resource Group (baru) | `rg-labcermat-ai-eastasia` | Resource Group |
| Azure OpenAI | `aoai-labcermat` | Azure OpenAI / AI Foundry |
| GPT deployment | `gpt-4o-mini` | Model Deployment |
| Embedding deployment | `text-embedding-3-small` | Model Deployment |
| Document Intelligence | `docint-labcermat` | Cognitive Services |
| AI Search Service | `search-labcermat` | Search Service |
| AI Search Index | `labcermat-sop-index` | Search Index |

> Resource Group dapat dijadikan satu dengan `rg-labcermat-ml-eastasia` (Sprint 7)
> jika ingin menyederhanakan. Memisahkan RG memudahkan cleanup per sprint.

---

## 1. Azure OpenAI / AI Foundry

### Via Azure Portal (Direkomendasikan untuk Subscription Terbatas)

1. Buka [portal.azure.com](https://portal.azure.com)
2. Search: **"Azure OpenAI"** → klik **Create**
3. Isi:
   - **Subscription:** pilih Azure for Students
   - **Resource Group:** `rg-labcermat-ai-eastasia` (buat baru)
   - **Region:** `East Asia` (atau alternatif jika tidak tersedia)
   - **Name:** `aoai-labcermat`
   - **Pricing tier:** `Standard S0`
4. Klik **Review + Create** → **Create**
5. Tunggu hingga deployment selesai (~2–3 menit)

### Deploy Model GPT

1. Buka resource `aoai-labcermat` → klik **Go to Azure AI Foundry portal**
   (atau [ai.azure.com](https://ai.azure.com))
2. Di AI Foundry: **Deployments** → **+ Deploy model**
3. Pilih model: **gpt-4o-mini** → **Deploy**
   - Deployment name: `gpt-4o-mini`
   - Version: pilih yang terbaru
   - Tokens per minute: sesuaikan (default 10K cukup untuk hackathon)
4. Ulangi untuk embedding:
   - Model: **text-embedding-3-small**
   - Deployment name: `text-embedding-3-small`

### Ambil Credentials

1. Buka resource `aoai-labcermat` → **Keys and Endpoint**
2. Catat:
   - **Endpoint:** `https://aoai-labcermat.openai.azure.com/`
   - **Key 1:** (salin ke `.env` sebagai `AZURE_OPENAI_API_KEY`)

### Via Azure CLI

```bash
# Buat resource group (skip jika sudah ada)
az group create \
  --name rg-labcermat-ai-eastasia \
  --location eastasia

# Buat Azure OpenAI resource
az cognitiveservices account create \
  --name aoai-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --location eastasia \
  --kind OpenAI \
  --sku S0 \
  --yes

# Ambil endpoint
az cognitiveservices account show \
  --name aoai-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --query "properties.endpoint" \
  --output tsv

# Ambil key
az cognitiveservices account keys list \
  --name aoai-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --query "key1" \
  --output tsv

# Deploy model gpt-4o-mini
az cognitiveservices account deployment create \
  --name aoai-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --deployment-name gpt-4o-mini \
  --model-name gpt-4o-mini \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard

# Deploy model text-embedding-3-small
az cognitiveservices account deployment create \
  --name aoai-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --deployment-name text-embedding-3-small \
  --model-name text-embedding-3-small \
  --model-version "1" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard
```

> **Catatan:** Jika region `eastasia` mengembalikan error quota/availability untuk
> model tertentu, ganti `--location` ke `centralindia` atau `japaneast`.

### Verifikasi

```bash
# Cek status resource
az cognitiveservices account show \
  --name aoai-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --query "properties.provisioningState"
# Expected: "Succeeded"

# List deployments
az cognitiveservices account deployment list \
  --name aoai-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --query "[].{name:name, model:properties.model.name, status:properties.provisioningState}"
# Expected: gpt-4o-mini + text-embedding-3-small, keduanya "Succeeded"
```

---

## 2. Azure AI Document Intelligence

### Via Azure Portal

1. Search: **"Document Intelligence"** → klik **Create**
2. Isi:
   - **Subscription:** Azure for Students
   - **Resource Group:** `rg-labcermat-ai-eastasia`
   - **Region:** `East Asia`
   - **Name:** `docint-labcermat`
   - **Pricing tier:** `Free F0` (500 pages/bulan, cukup untuk hackathon)
     - Jika F0 sudah ada di subscription, pilih `Standard S0`
3. Klik **Review + Create** → **Create**

### Ambil Credentials

1. Buka resource `docint-labcermat` → **Keys and Endpoint**
2. Catat:
   - **Endpoint:** `https://docint-labcermat.cognitiveservices.azure.com/`
   - **Key 1:** (salin ke `.env` sebagai `AZURE_DOCUMENT_INTELLIGENCE_KEY`)

### Via Azure CLI

```bash
# Buat Document Intelligence resource (Free tier)
az cognitiveservices account create \
  --name docint-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --location eastasia \
  --kind FormRecognizer \
  --sku F0 \
  --yes

# Jika F0 sudah terpakai di subscription:
# --sku S0

# Ambil endpoint
az cognitiveservices account show \
  --name docint-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --query "properties.endpoint" \
  --output tsv

# Ambil key
az cognitiveservices account keys list \
  --name docint-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --query "key1" \
  --output tsv
```

### Verifikasi

```bash
az cognitiveservices account show \
  --name docint-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --query "properties.provisioningState"
# Expected: "Succeeded"
```

---

## 3. Azure AI Search

### Via Azure Portal

1. Search: **"AI Search"** (atau "Azure Cognitive Search") → klik **Create**
2. Isi:
   - **Subscription:** Azure for Students
   - **Resource Group:** `rg-labcermat-ai-eastasia`
   - **Service name:** `search-labcermat`
   - **Location:** `East Asia`
   - **Pricing tier:** `Free` (1 index, 50 MB, cukup untuk MVP)
3. Klik **Review + Create** → **Create** (~3–5 menit)

> **Catatan Free tier:** Hanya 1 Search service Free per subscription.
> Jika sudah ada Free service lain di subscription, gunakan tier `Basic`.

### Ambil Credentials

1. Buka resource `search-labcermat` → **Overview** → catat **Url**
   - Format: `https://search-labcermat.search.windows.net`
2. Buka **Keys** → catat **Primary admin key**
   (salin ke `.env` sebagai `AZURE_AI_SEARCH_KEY`)

### Via Azure CLI

```bash
# Buat AI Search service (Free tier)
az search service create \
  --name search-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --location eastasia \
  --sku free

# Jika Free tier tidak tersedia:
# --sku basic

# Ambil endpoint (URL)
az search service show \
  --name search-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --query "hostingMode"
# URL format: https://search-labcermat.search.windows.net

# Ambil admin key
az search admin-key show \
  --service-name search-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --query "primaryKey" \
  --output tsv
```

### Index Schema

Index `labcermat-sop-index` akan dibuat **otomatis oleh AI service** saat pertama kali
dokumen diindeks (Langkah 5 implementasi). Schema yang akan digunakan:

```json
{
  "name": "labcermat-sop-index",
  "fields": [
    { "name": "chunk_id",       "type": "Edm.String",                   "key": true,  "filterable": true  },
    { "name": "doc_id",         "type": "Edm.String",                   "filterable": true                },
    { "name": "laboratory_id",  "type": "Edm.String",                   "filterable": true                },
    { "name": "doc_title",      "type": "Edm.String",  "searchable": true                                 },
    { "name": "page_number",    "type": "Edm.Int32"                                                       },
    { "name": "chunk_index",    "type": "Edm.Int32"                                                       },
    { "name": "content",        "type": "Edm.String",  "searchable": true                                 },
    {
      "name": "content_vector",
      "type": "Collection(Edm.Single)",
      "dimensions": 1536,
      "vectorSearchProfile": "hnsw-profile"
    }
  ],
  "vectorSearch": {
    "profiles": [{ "name": "hnsw-profile", "algorithm": "hnsw-config" }],
    "algorithms": [{ "name": "hnsw-config", "kind": "hnsw" }]
  }
}
```

### Verifikasi

```bash
az search service show \
  --name search-labcermat \
  --resource-group rg-labcermat-ai-eastasia \
  --query "status"
# Expected: "running"
```

---

## 4. Cost Control

| Resource | Tier | Estimasi Biaya | Kontrol |
|---|---|---|---|
| Azure OpenAI | Standard S0 | ~$0.15/1M input token (gpt-4o-mini) | max_tokens=500 per call, tidak ada retry loop |
| Azure OpenAI Embedding | Standard S0 | ~$0.02/1M token | Hanya saat indexing (bukan setiap query) |
| Document Intelligence | Free F0 | Gratis (500 hal/bln) | Upload hanya dokumen demo <10 halaman |
| AI Search | Free | Gratis | 1 index, <50 MB |
| **Total estimasi hackathon demo** | — | **< $3** | — |

**Aturan cost guardrail:**
1. Gunakan `gpt-4o-mini` — 15× lebih hemat dari `gpt-4o`
2. Jangan loop / batch call OpenAI saat testing
3. Hapus resource setelah demo jika tidak diperlukan
4. Monitor usage di Azure Portal → OpenAI resource → Metrics → Token usage

---

## 5. Checklist Verifikasi Resource

Jalankan setelah semua resource dibuat, sebelum mulai Langkah 2 (openai_service.py):

```
Azure OpenAI:
[ ] Resource aoai-labcermat: provisioningState = "Succeeded"
[ ] Deployment gpt-4o-mini: provisioningState = "Succeeded"
[ ] Deployment text-embedding-3-small: provisioningState = "Succeeded"
[ ] AZURE_OPENAI_ENDPOINT terisi di .env (https://aoai-labcermat.openai.azure.com/)
[ ] AZURE_OPENAI_API_KEY terisi di .env
[ ] AZURE_OPENAI_API_VERSION = "2024-02-01"
[ ] AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-4o-mini"
[ ] AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME = "text-embedding-3-small"

Document Intelligence:
[ ] Resource docint-labcermat: provisioningState = "Succeeded"
[ ] AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT terisi di .env
[ ] AZURE_DOCUMENT_INTELLIGENCE_KEY terisi di .env

AI Search:
[ ] Service search-labcermat: status = "running"
[ ] AZURE_AI_SEARCH_ENDPOINT terisi di .env (https://search-labcermat.search.windows.net)
[ ] AZURE_AI_SEARCH_KEY terisi di .env
[ ] AZURE_AI_SEARCH_INDEX_NAME = "labcermat-sop-index"

Config & Env:
[ ] apps/ai-service/.env sudah diisi semua field baru
[ ] apps/ai-service/app/core/config.py syntax check OK
[ ] Sprint 7 tidak rusak: POST /ai/v1/qc-anomaly → mode: "azure_ml_artifact"

Quick smoke test (setelah .env diisi):
[ ] python -c "from app.core.config import settings; print(settings.openai_configured)"
    → True
[ ] python -c "from app.core.config import settings; print(settings.document_intelligence_configured)"
    → True
[ ] python -c "from app.core.config import settings; print(settings.search_configured)"
    → True
```

---

## 6. Managed Online Endpoint — Tetap Blocked

Managed Online Endpoint Azure ML (`ep-qc-anomaly`) **tidak dicoba ulang** di Sprint 8.
Blocker `SubscriptionNotRegistered` terdokumentasi di `ml/MANAGED_ENDPOINT_BLOCKER.md`.
QC anomaly inference tetap menggunakan `azure_ml_artifact` mode via FastAPI in-process.

---

## 7. Referensi

- [Azure OpenAI model availability by region](https://learn.microsoft.com/azure/ai-services/openai/concepts/models#model-summary-table-and-region-availability)
- [Document Intelligence pricing](https://azure.microsoft.com/pricing/details/ai-document-intelligence/)
- [Azure AI Search tiers](https://azure.microsoft.com/pricing/details/search/)
- [Azure AI Foundry portal](https://ai.azure.com)
