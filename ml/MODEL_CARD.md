# Model Card — QC Anomaly Detection Model

**Model name:** `qc-anomaly-detector`  
**Version:** 1.0 (Sprint 7)  
**Registry:** Azure ML Model Registry (`mlw-labcermat`)  
**Last updated:** 2026-05-13  

---

## Purpose

Model ini membantu analis laboratorium mengidentifikasi pola anomali pada data
Quality Control (QC) harian alat laboratorium. Output model digunakan sebagai
**decision support untuk workflow operasional** — membantu analis menentukan apakah
perlu tindakan lanjutan pada alat QC, bukan sebagai dasar keputusan klinis.

**Model ini tidak memberi diagnosis medis dan tidak boleh digunakan sebagai satu-satunya
dasar keputusan klinis.**

---

## Input Features

Model menerima 16 fitur numerik per satu record QC:

| Fitur | Tipe | Deskripsi |
|---|---|---|
| `control_value` | float | Nilai kontrol QC yang diukur |
| `lower_limit` | float | Batas bawah kontrol |
| `upper_limit` | float | Batas atas kontrol |
| `mean_limit` | float | Tengah rentang: `(lower + upper) / 2` |
| `range_limit` | float | Lebar rentang: `upper - lower` |
| `deviation_from_mean` | float | `control_value - mean_limit` |
| `deviation_pct` | float | `deviation_from_mean / range_limit` |
| `in_range` | int (0/1) | 1 jika `lower ≤ value ≤ upper` |
| `hist_1` | float | Nilai QC sebelumnya (t-1), 0 jika tidak ada |
| `hist_2` | float | Nilai QC sebelumnya (t-2), 0 jika tidak ada |
| `hist_3` | float | Nilai QC sebelumnya (t-3), 0 jika tidak ada |
| `hist_delta_1` | float | `control_value - hist_1` |
| `hist_delta_2` | float | `hist_1 - hist_2` |
| `hist_delta_3` | float | `hist_2 - hist_3` |
| `trend_sign` | int (-1/0/1) | 1=naik monoton, -1=turun monoton, 0=tidak monoton |
| `history_count` | int (0–3) | Jumlah titik historis yang tersedia |

---

## Output Labels

Model mengklasifikasikan setiap record QC ke salah satu dari tiga kelas:

| Label | Nilai int | Deskripsi Operasional |
|---|---|---|
| `stabil` | 0 | Nilai kontrol dalam batas, tidak ada tren yang perlu ditindaklanjuti |
| `perlu_perhatian` | 1 | Nilai di luar batas kontrol — analis perlu mengecek alat |
| `potensi_drift` | 2 | Tren naik atau turun terdeteksi — alat mungkin perlu kalibrasi |

Output endpoint juga menyertakan `confidence` (probabilitas kelas prediksi, 0.0–1.0).

---

## Dataset

### Sumber Data

Dataset yang digunakan untuk training adalah **data sintetis** yang dibuat dengan
script `ml/data/generate_dataset.py`. Tidak menggunakan data pasien atau data klinis
nyata.

Data sintetis dirancang agar distribusi statistiknya realistis untuk parameter
laboratorium umum: hemoglobin, leukosit, trombosit, ureum, dan kreatinin.

### Ukuran dan Split

| Split | Jumlah | Proporsi |
|---|---|---|
| Training | 7.000 | 70% |
| Validation | 1.500 | 15% |
| Test | 1.500 | 15% |
| **Total** | **10.000** | — |

Split dilakukan dengan stratifikasi berdasarkan label untuk menjaga distribusi kelas.

### Distribusi Label

| Label | Proporsi | Alasan |
|---|---|---|
| `stabil` (0) | 60% | Mayoritas data QC laboratorium adalah normal |
| `perlu_perhatian` (1) | 30% | Kejadian umum — nilai sesekali di luar batas |
| `potensi_drift` (2) | 10% | Langka — tren drift tidak sering terjadi |

---

## Model Architecture

**Model utama:** Random Forest Classifier (scikit-learn)

| Parameter | Nilai |
|---|---|
| `n_estimators` | 100 |
| `max_depth` | None (fully grown, pruned by min_samples) |
| `min_samples_split` | 5 |
| `class_weight` | `balanced` — menangani class imbalance `potensi_drift` |
| `random_state` | 42 |

**Preprocessing:** StandardScaler pada semua 16 fitur numerik.

**Baseline pembanding:** Logistic Regression (dilatih dan dievaluasi bersama untuk referensi).

---

## Metrics Target

| Metric | Target Minimum | Alasan |
|---|---|---|
| Accuracy (overall) | ≥ 0.85 | Performa keseluruhan |
| F1-score (macro avg) | ≥ 0.80 | Penting karena imbalance — `potensi_drift` hanya 10% |
| Precision `potensi_drift` | ≥ 0.75 | False positive drift tidak boleh terlalu sering |
| Recall `potensi_drift` | ≥ 0.70 | Lebih penting tangkap drift daripada miss |

Confusion matrix disimpan sebagai artifact training untuk review manual.

---

## Actual Training Results

**Training job:** `kind_station_vbbwfvrsff`  
**Model Registry:** `qc-anomaly-detector` v1  
**Dataset:** `qc-anomaly-synthetic:1` (10 000 rows, synthetic)

### Logistic Regression — Baseline

| Metric | Nilai |
|---|---|
| Test Accuracy | 0.7567 |
| Test Macro F1 | 0.7323 |

### Random Forest — Model Utama

| Metric | Nilai |
|---|---|
| Test Accuracy | **1.0000** |
| Test Macro F1 | **1.0000** |

> **Catatan penting — skor sempurna pada dataset sintetis:**
>
> Accuracy dan F1 = 1.000 adalah **wajar dan diharapkan** pada dataset yang dibuat secara
> programatik dengan aturan deterministik (stabil wajib `in_range=1`, potensi_drift wajib
> `trend_sign ≠ 0`, dll.). Random Forest mampu mempelajari boundary yang langsung
> mencerminkan aturan generator.
>
> Ini **bukan tanda overfitting yang berbahaya** untuk tujuan hackathon, namun menjadi
> catatan penting:
>
> **Model ini wajib divalidasi ulang dengan data QC laboratorium riil sebelum digunakan
> di lingkungan produksi.** Performa pada data nyata kemungkinan lebih rendah karena
> noise, variasi alat, dan pola yang tidak tercakup dalam generator sintetis.

---

## Artifacts

Artifact disimpan di Azure ML default datastore (training job `kind_station_vbbwfvrsff`).  
**Jangan commit file artifact ke repository — `*.pkl` dan `ml/outputs/` ada di `.gitignore`.**

| File | Deskripsi |
|---|---|
| `model.pkl` | Random Forest pipeline (StandardScaler + RandomForestClassifier) |
| `scaler.pkl` | StandardScaler standalone untuk `score.py` |
| `feature_names.json` | Urutan 16 nama fitur — wajib diikuti saat scoring |
| `label_mapping.json` | `{"0": "stabil", "1": "perlu_perhatian", "2": "potensi_drift"}` |
| `metrics.json` | Full evaluation metrics: accuracy, F1, precision, recall, confusion matrix |
| `confusion_matrix.json` | Confusion matrix test split (convenience copy) |

**Registered path di Azure ML:**
```
azureml://subscriptions/5089eded-0b0e-4136-8520-befea262c26a/resourceGroups/
rg-labcermat-ml-eastasia/workspaces/mlw-labcermat/datastores/
workspaceblobstore/paths/LocalUpload/
0e8e05a39b2cfc73785a0081e29ea6734411f439f7646b502f6ad0ad3a712a52/model_dir
```

---

## Limitations

1. **Data sintetis:** Model dilatih pada data yang dibuat secara programatik, bukan
   data QC laboratorium nyata. Performa di produksi nyata belum tervalidasi secara klinis.

2. **Minimal history:** Jika laboratorium baru memulai, `history_count` akan rendah
   (0–1) sehingga fitur trend kurang informatif. Model tetap berjalan, namun dengan
   konfidence lebih rendah.

3. **Parameter spesifik:** Model tidak mengetahui nama parameter QC (hemoglobin vs
   trombosit). Semua parameter diperlakukan sama berdasarkan nilai relatif terhadap
   limit.

4. **Tren linier saja:** Deteksi drift hanya berdasarkan delta antar titik —
   tidak mendeteksi pola non-linier atau siklus.

5. **Tidak belajar secara online:** Model tidak diperbarui secara otomatis dari data
   produksi. Retraining dilakukan manual jika diperlukan.

---

## Deployment Architecture (Sprint 7)

Azure ML Managed Online Endpoint tidak tersedia di subscription ini (Azure for Students —
`SubscriptionNotRegistered`). Arsitektur inference yang digunakan:

```
Azure ML Model Registry (qc-anomaly-detector:1)
  ↓ az ml model download
FastAPI AI Service — sklearn in-process inference
  mode: azure_ml_artifact
```

Lihat `ml/MANAGED_ENDPOINT_BLOCKER.md` untuk detail blocker dan justifikasi fallback.

## Fallback

Jika artifact tidak tersedia (`AZURE_ML_MODEL_DIR` tidak di-set atau direktori tidak ada)
atau terjadi inference error, AI Service otomatis menggunakan **rule-based logic Sprint 6**
(Westgard T4 full-series detection). Respons menyertakan
`"mode": "fallback_rule_based"` dan `"fallback_reason"` untuk transparansi.

---

## Safety Note

> Model ini adalah **alat bantu workflow operasional laboratorium**, bukan alat
> diagnosis medis.
>
> Output model (`stabil`, `perlu_perhatian`, `potensi_drift`) hanya merefleksikan
> kondisi **alat QC** — bukan kondisi pasien. Keputusan klinis tetap sepenuhnya
> berada di tangan tenaga medis yang berwenang.
>
> Sistem tidak menyimpan atau memproses data identitas pasien.

---

## Deployment Info

| Parameter | Nilai |
|---|---|
| Inference mode | FastAPI in-process (sklearn artifact) |
| Artifact source | Azure ML Model Registry `qc-anomaly-detector:1` |
| Download command | `az ml model download --name qc-anomaly-detector --version 1 ...` |
| Env var | `AZURE_ML_MODEL_DIR` — path ke folder artifact hasil download |
| `AI_MODE` | `azure_ml_artifact` untuk mengaktifkan mode ini |
| Scoring script (tersedia, endpoint blocked) | `ml/score/score.py` |
| Endpoint config (tersedia, endpoint blocked) | `ml/config/endpoint.yml`, `ml/config/deployment.yml` |

---

## Intended Use

- **Pengguna yang dituju:** Analis laboratorium klinik menggunakan aplikasi LabCermat
- **Penggunaan yang dimaksud:** Menyoroti record QC yang perlu perhatian lebih lanjut
- **Penggunaan yang tidak dimaksud:** Diagnosis klinis, keputusan pengobatan,
  evaluasi kondisi pasien
