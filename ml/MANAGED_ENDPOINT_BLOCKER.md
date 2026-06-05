# Managed Online Endpoint — Deployment Blocker

**Tanggal:** 2026-05-14  
**Status:** Blocked — fallback ke FastAPI inference diterapkan

---

## Error yang Ditemui

```
(SubscriptionNotRegistered) Resource provider [N/A] isn't registered
with Subscription [N/A]
Code: SubscriptionNotRegistered
```

Error muncul saat menjalankan:

```bash
az ml online-endpoint create \
  --file ml/config/endpoint.yml \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat
```

---

## Langkah Troubleshooting yang Sudah Dilakukan

| Langkah | Hasil |
|---|---|
| Daftar semua resource provider di subscription | Semua provider relevan (Microsoft.MachineLearningServices, Microsoft.Compute, Microsoft.Network, Microsoft.Storage, Microsoft.ContainerRegistry, Microsoft.KeyVault) sudah **Registered** |
| Hapus endpoint yang gagal dan coba ulang | Error tetap sama |
| Workspace, compute cluster, training job | ✅ Berhasil |
| Data Asset, Model Registry | ✅ Berhasil |
| Training job `kind_station_vbbwfvrsff` | ✅ Completed |

---

## Kesimpulan

**Azure for Students / subscription tier** kemungkinan membatasi pembuatan
Managed Online Endpoint (fitur inferensi real-time Azure ML). Ini adalah
keterbatasan infrastruktur subscription, bukan bug kode.

Resource provider `[N/A]` dalam pesan error mengindikasikan bahwa endpoint
provisioning service tidak tersedia di subscription ini, terlepas dari
status registrasi provider yang sudah `Registered`.

---

## Fallback Architecture: FastAPI Artifact Inference

Karena model tetap **berhasil dilatih dan diregister di Azure ML**, bukti
pipeline ML end-to-end tetap valid untuk hackathon:

```
Azure ML Training Job  ✅ (kind_station_vbbwfvrsff)
  → Model artifacts: model.pkl, scaler.pkl, feature_names.json, label_mapping.json
  → Azure ML Model Registry: qc-anomaly-detector:1  ✅

FastAPI AI Service (mode: azure_ml_artifact)
  → Load artifacts dari AZURE_ML_MODEL_DIR (path lokal setelah az ml model download)
  → Inference menggunakan sklearn Pipeline yang sama
  → mode = "azure_ml_artifact"
  → Fallback ke rule_based jika artifact tidak ditemukan
```

**Yang berbeda dari rencana awal:**

| Aspek | Rencana Awal | Fallback |
|---|---|---|
| Serving | Azure ML Managed Online Endpoint | FastAPI AI Service lokal |
| Inference | REST call ke Azure endpoint | sklearn in-process |
| Auth | Endpoint key | Tidak perlu (lokal) |
| Latency | ~100–300ms network | <10ms lokal |
| Model source | Azure ML endpoint | Artifact dari Azure ML Registry |

**Yang tetap sama (bukti Azure ML end-to-end):**

- Dataset dihasilkan oleh Azure ML Job ✅
- Training berjalan di Azure ML Compute Cluster ✅
- Model diregister di Azure ML Model Registry ✅
- Artifact di-download dari Azure ML (`az ml model download`) ✅
- Mode response `azure_ml_artifact` mencatat bahwa model berasal dari Azure ML ✅

---

## Command Download Artifact dari Azure ML Registry

```bash
# Download model artifact dari registry ke folder lokal
az ml model download \
  --name qc-anomaly-detector \
  --version 1 \
  --download-path ./ml-model-download \
  --resource-group rg-labcermat-ml-eastasia \
  --workspace-name mlw-labcermat

# Artifacts tersimpan di: ./ml-model-download/qc-anomaly-detector/1/
# Salin ke path yang dikonfigurasi di AZURE_ML_MODEL_DIR
```
