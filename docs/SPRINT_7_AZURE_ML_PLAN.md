# Sprint 7 — Azure ML Training & Deployment for QC Anomaly Detection

**Versi:** Planning 1.0  
**Tanggal:** 2026-05-13  
**Status:** Draft — belum diimplementasikan

---

## 1. Objective

Melatih satu model ML custom menggunakan **Azure Machine Learning** untuk mendeteksi anomali QC, men-deploy-nya sebagai **Managed Online Endpoint**, dan mengintegrasikannya ke AI Service LabCermat dengan fallback ke rule-based logic dari Sprint 6.

Tujuan hackathon: membuktikan kemampuan **training + deployment ML di atas infrastruktur Azure end-to-end**.

---

## 2. Scope

| Area | Yang Dikerjakan |
|---|---|
| Data | Generate synthetic QC dataset, register sebagai Azure ML Data Asset |
| Training | Script training di Azure ML Compute Cluster, evaluate, register model |
| Deployment | Deploy ke Azure ML Managed Online Endpoint |
| AI Service | Panggil Azure ML endpoint untuk `qc_anomaly`, mode `azure_ml`, fallback ke `rule_based` |
| Backend | Tidak berubah struktur — tetap AiModule, tetap simpan ke `ai_analysis_logs` |
| Frontend | Badge `AiAnomalyBadge` menampilkan mode + confidence jika tersedia |
| Config | Environment variables baru untuk Azure ML endpoint |

---

## 3. Out of Scope

- Tidak melatih model untuk fitur lain seperti result review, prioritization, atau supervisor summary.
- Tidak mengubah auth flow.
- Tidak membuat admin panel untuk retrain.
- Tidak deployment ke production Azure penuh.
- Tidak integrasi Azure Document Intelligence.
- Tidak integrasi Azure AI Search.
- Tidak memberi diagnosis medis.
- Tidak menyimpan Azure key ke repository.
- Tidak menambah migration baru kecuali benar-benar diperlukan.
- Tidak menghapus rule-based fallback.

---

## 4. Azure Architecture

```txt
┌─────────────────────────────────────────────────┐
│              Azure Machine Learning             │
│                                                 │
│  ┌─────────────┐    ┌─────────────────────────┐ │
│  │ Data Asset  │    │     Training Job         │ │
│  │ Synthetic   │───▶│   Compute Cluster        │ │
│  │ QC Data     │    │   train.py               │ │
│  └─────────────┘    └────────────┬────────────┘ │
│                                  │              │
│                       ┌──────────▼───────────┐  │
│                       │   Registered Model   │  │
│                       │ qc-anomaly-detector  │  │
│                       └──────────┬───────────┘  │
│                                  │              │
│                       ┌──────────▼───────────┐  │
│                       │ Managed Online       │  │
│                       │ Endpoint             │  │
│                       │ score.py             │  │
│                       └──────────┬───────────┘  │
└──────────────────────────────────┼──────────────┘
                                   │ REST
                    ┌──────────────▼──────────────┐
                    │       AI Service FastAPI     │
                    │       qc_anomaly.py          │
                    │       mode: azure_ml         │
                    │       fallback: rule_based   │
                    └──────────────┬──────────────┘
                                   │ HTTP
                    ┌──────────────▼──────────────┐
                    │   Backend NestJS AiModule    │
                    │   ai_analysis_logs           │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Frontend AiAnomalyBadge    │
                    │   mode badge + confidence    │
                    └─────────────────────────────┘