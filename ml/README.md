# LabCermat — ML Pipeline (Sprint 7)

**Model:** QC Anomaly Detection  
**Training target:** Azure Machine Learning  
**Fallback:** Rule-based logic (Sprint 6)

---

## Tujuan

Sprint 7 melatih satu model ML custom menggunakan **Azure Machine Learning** untuk
mendeteksi anomali pada data QC harian laboratorium, lalu men-deploy-nya sebagai
**Managed Online Endpoint**. AI Service LabCermat memanggil endpoint ini dengan
fallback otomatis ke rule-based jika endpoint tidak tersedia.

Tujuan hackathon: membuktikan pipeline ML end-to-end di atas infrastruktur Azure —
data → training → model registry → endpoint → integrasi aplikasi.

---

## Arsitektur Azure ML

```
ml/data/generate_dataset.py
        │
        ▼ (10.000 baris CSV)
Azure ML Data Asset  (qc-anomaly-dataset v1)
        │
        ▼
Azure ML Training Job  ← ml/train/train.py
  (Compute Cluster: cpu-cluster-dev)
        │
        ▼ (outputs/model.pkl, scaler.pkl, metrics.json, …)
Azure ML Model Registry  (qc-anomaly-detector v1)
        │
        ▼
Azure ML Managed Online Endpoint  ← ml/score/score.py
  (ep-qc-anomaly)
        │
        ▼ REST HTTPS
apps/ai-service/app/services/qc_anomaly_service.py
  mode: azure_ml  (fallback: rule_based)
        │
        ▼ HTTP (existing AiModule)
Backend → ai_analysis_logs (response_data menyimpan confidence + model_version)
        │
        ▼
Frontend AiAnomalyBadge  (badge + confidence %)
```

---

## Local Smoke Test vs Azure Final Run

| Tahap | Lokal | Azure |
|---|---|---|
| Generate dataset | ✅ `python ml/data/generate_dataset.py` | — |
| Training smoke test | ✅ `python ml/train/train.py --local` dengan subset kecil (500 baris) | — |
| Training final | — | ✅ Azure ML Job di Compute Cluster |
| Scoring test | ✅ `python ml/score/score.py --test` | — |
| Endpoint test | — | ✅ `az ml online-endpoint invoke` |

Training lokal hanya untuk verifikasi syntax dan logika script sebelum submit job ke Azure.
Dataset final dan model artifact disimpan di Azure, bukan di repo.

---

## Urutan Pipeline

```
1. Dataset Generation
   └── python ml/data/generate_dataset.py
   └── Output: ml/data/qc_synthetic.csv  (tidak di-commit)

2. Data Asset Registration  ✅ (qc-anomaly-synthetic v1, job: shy_steelpan_qcl349kpr2)
   └── az ml data create --name qc-anomaly-synthetic --version 1 ...
   └── Data tersimpan di Azure ML default datastore

3. Training Job  ← Langkah 4
   └── az ml job create --file ml/config/training_job.yml ...
   └── Monitor: az ml job show --name <run-id> ...
   └── Output artifacts: model.pkl, scaler.pkl, metrics.json, ...

4. Model Registration  ✅ (qc-anomaly-detector v1, job: kind_station_vbbwfvrsff)
   └── az ml model create --name qc-anomaly-detector --version 1 ...

5. Model Download & FastAPI Artifact Inference  ✅ (Langkah 7B)
   └── az ml model download --name qc-anomaly-detector --version 1 ...
   └── Set AZURE_ML_MODEL_DIR ke path hasil download
   └── Set AI_MODE=azure_ml_artifact
   └── Restart AI service — inference via sklearn in-process

6. (Blocked) Managed Online Endpoint  ← SubscriptionNotRegistered
   └── Lihat ml/MANAGED_ENDPOINT_BLOCKER.md untuk detail
```

---

## Cost Guardrail (~$100 Azure Credit)

| Resource | Estimasi Biaya | Catatan |
|---|---|---|
| Compute Cluster (Standard_DS2_v2, 2 core) | ~$0.10/jam | Scale to zero saat idle — wajib set `min-instances 0`, `max-instances 1` |
| Training job (estimasi 15–30 menit) | ~$0.05–$0.10 | Satu kali run |
| Managed Online Endpoint (Standard_DS2_v2) | ~$0.10/jam | Hapus endpoint setelah demo selesai |
| Storage (dataset + artifacts ~50 MB) | < $0.01 | Negligible |
| **Total estimasi aktif** | **~$3–$5/hari** | Selama endpoint hidup |
| **Total estimasi 3 minggu** | **~$30–$50** | Dengan endpoint dihapus di luar demo |

**Aturan cost guardrail:**
1. Compute Cluster `min-instances` wajib `0` — jangan biarkan node idle berbayar.
2. Matikan / hapus Managed Online Endpoint segera setelah demo jika tidak digunakan.
3. Jangan gunakan GPU VM — Random Forest tidak membutuhkan GPU.
4. Gunakan curated environment Azure ML (tidak perlu build Docker image sendiri).

---

## Azure CLI Commands — Setup Awal

Jalankan perintah di bawah secara berurutan dari terminal dengan Azure CLI terinstall
dan sudah `az login`.

### Prasyarat

```powershell
# Install Azure CLI jika belum ada
winget install Microsoft.AzureCLI

# Install Azure ML extension
az extension add --name ml

# Login
az login

# Set default subscription (ganti dengan ID subscription Anda)
az account set --subscription "<SUBSCRIPTION_ID>"
```

### Resource Group

```powershell
az group create `
  --name rg-labcermat-ml-eastasia `
  --location eastasia
```

### Azure ML Workspace

```powershell
az ml workspace create `
  --name mlw-labcermat `
  --resource-group rg-labcermat-ml-eastasia `
  --location eastasia
```

> Workspace creation membuat Storage Account, Key Vault, Application Insights, dan
> Container Registry secara otomatis. Proses ~3–5 menit.

```powershell
# Verifikasi
az ml workspace show `
  --name mlw-labcermat `
  --resource-group rg-labcermat-ml-eastasia
```

### Compute Cluster (Training)

```powershell
# Preferred: Standard_DS2_v2 (2 core / 7 GB) — lebih hemat credit
az ml compute create `
  --name cpu-cluster-dev `
  --type amlcompute `
  --size Standard_DS2_v2 `
  --min-instances 0 `
  --max-instances 1 `
  --resource-group rg-labcermat-ml-eastasia `
  --workspace-name mlw-labcermat

# Fallback jika Standard_DS2_v2 tidak tersedia di region:
# az ml compute create --name cpu-cluster-dev --type amlcompute `
#   --size Standard_DS3_v2 --min-instances 0 --max-instances 1 ...
```

```powershell
# Verifikasi
az ml compute show `
  --name cpu-cluster-dev `
  --resource-group rg-labcermat-ml-eastasia `
  --workspace-name mlw-labcermat
```

### Data Asset — Download Job Output dan Register

```bash
# 1. Download semua output dari generate job (jalankan di Cloud Shell atau terminal)
#    Ganti <run-id> dengan job name yang dikembalikan oleh az ml job create
az ml job download \
  --name shy_steelpan_qcl349kpr2 \
  --all \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat
# Output tersimpan di: ./shy_steelpan_qcl349kpr2/named-outputs/dataset_dir/qc_synthetic.csv
# (nama folder default mengikuti job name)

# 2. Register Data Asset
#
#    Opsi A — dari file hasil download (sesuaikan path ke lokasi download):
az ml data create \
  --name qc-anomaly-synthetic \
  --version 1 \
  --type uri_file \
  --description "Synthetic QC anomaly dataset for LabCermat hackathon" \
  --path ./job-downloads/named-outputs/dataset_dir/qc_synthetic.csv \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat

#    Opsi B — langsung dari output job (tanpa download terlebih dahulu):
az ml data create \
  --name qc-anomaly-synthetic \
  --version 1 \
  --type uri_file \
  --description "Synthetic QC anomaly dataset for LabCermat hackathon" \
  --path "azureml://jobs/shy_steelpan_qcl349kpr2/outputs/dataset_dir/qc_synthetic.csv" \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat

# 3. Verify Data Asset
az ml data show \
  --name qc-anomaly-synthetic \
  --version 1 \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat

# Expected output field: "id": "azureml:qc-anomaly-synthetic:1"
```

> **PENTING:** File CSV hasil download **jangan di-commit** ke repository.
> `ml/data/*.csv` sudah masuk `.gitignore`.

---

### Training Job — Submit, Monitor, dan Download Artifacts

**Metrics target yang harus dipenuhi sebelum register model:**

| Metric | Target Minimum |
|---|---|
| Accuracy (test split) | ≥ 0.85 |
| F1-score macro (test split) | ≥ 0.80 |
| Precision `potensi_drift` | ≥ 0.75 |
| Recall `potensi_drift` | ≥ 0.70 |

> **Training final wajib berjalan di Azure ML Compute Cluster.**
> Jangan jalankan `train.py` tanpa `--smoke-test` di laptop lokal untuk dataset penuh.
> Pipeline Azure ML menjamin reproducibility dan menyimpan artifacts di datastore.

```bash
# 1. Submit training job
az ml job create \
  --file ml/config/training_job.yml \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat
# Catat <run-id> dari output (field "name")

# 2. Monitor status
az ml job show \
  --name <run-id> \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat

# 3. Stream logs secara live (opsional — berguna saat job baru berjalan)
az ml job stream \
  --name <run-id> \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat

# 4. Download artifacts setelah job Completed
az ml job download \
  --name <run-id> \
  --outputs \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat
# Artifacts tersimpan di: ./<run-id>/named-outputs/model_dir/
# File: model.pkl, scaler.pkl, feature_names.json,
#       label_mapping.json, metrics.json, confusion_matrix.json
```

> Artifacts lokal hasil download **jangan di-commit** ke repository.
> `*.pkl`, `*.joblib`, `ml/outputs/` sudah masuk `.gitignore`.

---

### Model Registration — Register, Verify, dan List

**Training job yang menghasilkan model:** `kind_station_vbbwfvrsff`  
**Metrics (test split):** RF accuracy=1.0000, macro_f1=1.0000 | LR accuracy=0.7567, macro_f1=0.7323  
**Catatan:** Skor sempurna wajar pada synthetic dataset — validasi ulang dengan data QC riil diperlukan sebelum production.

```bash
# 1. Register model dari output training job (Opsi A — tanpa download lokal)
az ml model create \
  --name qc-anomaly-detector \
  --version 1 \
  --type custom_model \
  --description "Custom QC anomaly detection model trained on Azure ML synthetic dataset" \
  --path azureml://jobs/kind_station_vbbwfvrsff/outputs/model_dir \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat

# 2. Register dari artifact hasil download lokal (Opsi B — path Cloud Shell)
az ml model create \
  --name qc-anomaly-detector \
  --version 1 \
  --type custom_model \
  --description "Custom QC anomaly detection model trained on Azure ML synthetic dataset" \
  --path /home/aprizal/training-downloads/named-outputs/model_dir \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat

# 3. Verify model ter-register
az ml model show \
  --name qc-anomaly-detector \
  --version 1 \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat
# Expected: "id": "azureml:qc-anomaly-detector:1"

# 4. List semua versi model
az ml model list \
  --name qc-anomaly-detector \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat
```

> Artifact model (.pkl) **jangan di-commit** ke repository.
> `*.pkl` dan `ml/outputs/` sudah masuk `.gitignore`.

---

### Scoring Script — Local Smoke Test

```powershell
# 1. Generate smoke dataset dan train lokal dulu (untuk mendapatkan artifacts)
d:\labcermat-production\apps\ai-service\labcermat\Scripts\activate

python ml/data/generate_dataset.py --rows 500 --output ml/data/smoke_train.csv
python ml/train/train.py --data ml/data/smoke_train.csv --output-dir ml/outputs/smoke --smoke-test

# 2. Jalankan scoring smoke test (model dir otomatis fallback ke ml/outputs/smoke)
python ml/score/score.py --test

# 3. Atau dengan model dir eksplisit
python ml/score/score.py --test --model-dir ml/outputs/smoke

# 4. Bersihkan setelah verifikasi
Remove-Item ml/data/smoke_train.csv
Remove-Item -Recurse ml/outputs/smoke
```

Output yang diharapkan (3 baris untuk stabil / perlu_perhatian / potensi_drift):
```
--- Input hint: stabil ---
  status      : stabil
  confidence  : 1.0
  mode        : azure_ml
  reason      : Nilai QC terlihat stabil berdasarkan model.
  suggestion  : Tidak diperlukan tindakan segera. Lanjutkan pemantauan rutin.

--- Input hint: perlu_perhatian ---
  status      : perlu_perhatian
  ...

--- Input hint: potensi_drift ---
  status      : potensi_drift
  ...
```

---

### Model Download — Azure ML Artifact untuk FastAPI Inference

Karena Managed Online Endpoint tidak tersedia di subscription ini (lihat
`ml/MANAGED_ENDPOINT_BLOCKER.md`), inference dijalankan in-process oleh FastAPI
menggunakan artifact model yang di-download dari Azure ML Model Registry.

```bash
# Download artifacts dari Azure ML Model Registry ke folder lokal
az ml model download \
  --name qc-anomaly-detector \
  --version 1 \
  --download-path ./ml-model-download \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat

# Artifacts tersimpan di: ./ml-model-download/qc-anomaly-detector/1/
#   model.pkl, scaler.pkl, feature_names.json,
#   label_mapping.json, metrics.json, confusion_matrix.json
```

Setelah download, set environment variables di `apps/ai-service/.env`:

```
AI_MODE=azure_ml_artifact
AZURE_ML_MODEL_DIR=./ml-model-download/qc-anomaly-detector/1
```

Restart AI service. Endpoint `/v1/qc-anomaly` akan merespons dengan `"mode": "azure_ml_artifact"`.
Jika artifact tidak ditemukan (path salah atau AZURE_ML_MODEL_DIR kosong), service otomatis
fallback ke rule-based dengan `"mode": "fallback_rule_based"`.

> Folder `ml-model-download/` dan `*.pkl` sudah masuk `.gitignore` — jangan di-commit.

---

### Endpoint & Deployment — Create, Test, Delete

> **BLOCKED** — Managed Online Endpoint tidak tersedia di subscription ini.
> Lihat `ml/MANAGED_ENDPOINT_BLOCKER.md`. Commands di bawah disimpan untuk referensi
> jika subscription di-upgrade di masa mendatang.

```bash
# 1. Create endpoint (tanpa deployment)
az ml online-endpoint create \
  --file ml/config/endpoint.yml \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat

# 2. Check endpoint status
az ml online-endpoint show \
  --name ep-qc-anomaly \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat
# Expected: "provisioning_state": "Succeeded"

# 3. Create deployment (routes 100% traffic ke "blue")
az ml online-deployment create \
  --file ml/config/deployment.yml \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat \
  --all-traffic

# 4. Check deployment status
az ml online-deployment show \
  --name blue \
  --endpoint-name ep-qc-anomaly \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat
# Expected: "provisioning_state": "Succeeded"

# 5. Get endpoint key (simpan ke .env — jangan commit)
az ml online-endpoint get-credentials \
  --name ep-qc-anomaly \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat

# 6. Test invoke endpoint dengan sample_request.json
az ml online-endpoint invoke \
  --name ep-qc-anomaly \
  --request-file ml/score/sample_request.json \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat

# 7. Lihat deployment logs jika ada error
az ml online-deployment get-logs \
  --name blue \
  --endpoint-name ep-qc-anomaly \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat

# 8. DELETE endpoint setelah demo untuk hemat credit (~$0.10/jam)
az ml online-endpoint delete \
  --name ep-qc-anomaly \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat \
  --yes
```

---

### Set Default Config (opsional, mempersingkat perintah selanjutnya)

```powershell
az configure --defaults group=rg-labcermat-ml-eastasia workspace=mlw-labcermat
```

---

## Struktur Folder

```
ml/
├── data/
│   ├── .gitkeep
│   └── generate_dataset.py      # (Langkah 2)
├── train/
│   ├── train.py                 # (Langkah 4)
│   └── requirements.txt         # (Langkah 4)
├── score/
│   ├── score.py                 # (Langkah 6) ✅
│   └── sample_request.json      # (Langkah 6) ✅ — sample payload for invoke test
├── config/
│   ├── dataset.yml              # (Langkah 3) ✅
│   ├── generate_job.yml         # (Langkah 2) ✅
│   ├── training_job.yml         # (Langkah 4) ✅
│   ├── model.yml                # (Langkah 5) ✅
│   ├── endpoint.yml             # (Langkah 6) ✅
│   └── deployment.yml           # (Langkah 6) ✅
├── outputs/
│   └── .gitkeep                 # direktori lokal untuk smoke test artifacts
├── README.md                    # file ini
└── MODEL_CARD.md
```

---

## Environment Variables (AI Service)

Tambahkan ke `apps/ai-service/.env` (jangan commit):

```
# Mode azure_ml_artifact — in-process inference dari artifact Azure ML
AI_MODE=azure_ml_artifact
AZURE_ML_MODEL_DIR=./ml-model-download/qc-anomaly-detector/1

# Mode rule_based (default, tidak perlu artifact)
# AI_MODE=rule_based
# AZURE_ML_MODEL_DIR=
```

`AI_MODE=rule_based` digunakan selama artifact belum di-download atau untuk
development/testing tanpa Azure credentials.
