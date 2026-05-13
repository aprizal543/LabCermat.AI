# LabCermat — Deployment Guide

**Versi:** 1.0 — Sprint 8 (placeholder)  
**Status:** Belum diimplementasikan — Sprint 8

---

> **Catatan:** Dokumen ini adalah placeholder untuk panduan deployment yang akan diimplementasikan di Sprint 8.
> Saat ini sistem hanya berjalan di lingkungan development lokal.

---

## Rencana Sprint 8

Sprint 8 akan mengimplementasikan:

- CI/CD pipeline via GitHub Actions
- Deployment ke Azure (App Service / Container Apps)
- Monitoring via Azure Application Insights
- Environment production terpisah dari development

---

## Target Infrastruktur (Sprint 8)

| Komponen | Platform | Keterangan |
|---|---|---|
| Backend API | Azure App Service / Container Apps | NestJS containerized |
| Frontend | Azure Static Web Apps | React build output |
| AI Service | Azure Container Apps | FastAPI containerized |
| Database | Supabase PostgreSQL (cloud) | Sudah aktif sejak Sprint 1 |
| Storage | Azure Blob Storage | Dokumen hasil lab (Sprint 7) |
| AI | Azure OpenAI + AI Search | Sprint 7 |
| Monitoring | Azure Application Insights | Sprint 8 |

---

## Environment Variables Production (Draft)

Variabel tambahan yang diperlukan untuk production:

```
# Backend
NODE_ENV=production
PORT=3001
JWT_SECRET=...                    # Sprint 2
ALLOWED_ORIGINS=https://app.labcermat.example.com

# Azure (Sprint 7-8)
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_API_KEY=...
AZURE_STORAGE_CONNECTION_STRING=...
APPLICATIONINSIGHTS_CONNECTION_STRING=...
```

---

## CI/CD Pipeline (Draft)

```yaml
# .github/workflows/deploy.yml (Sprint 8)
# Trigger: push ke branch main
# Jobs:
#   1. Typecheck semua package
#   2. Build backend + frontend
#   3. Run tests
#   4. Deploy ke Azure
```

---

*Dokumen ini akan diperbarui lengkap di Sprint 8.*
