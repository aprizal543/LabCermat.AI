# LabCermat — Architecture

**Versi:** 8.0 — Sprint 8  
**Status:** SOP Assistant (BM25 + Groq) aktif; Azure ML Artifact Inference (Sprint 7) tetap aktif

---

## 1. Gambaran Umum

LabCermat dibangun sebagai **monorepo production** dengan tiga service utama yang dipisahkan berdasarkan tanggung jawab:

```
┌─────────────────────────────────────────────┐
│              Browser / Client               │
│         React + TypeScript + Vite           │
│              localhost:5175                 │
└───────────────────┬─────────────────────────┘
                    │ HTTP REST /api/v1
┌───────────────────▼─────────────────────────┐
│            Backend API Service              │
│         NestJS + TypeScript + Prisma        │
│              localhost:3001                 │
└────────────┬──────────────┬─────────────────┘
             │              │
   Prisma ORM│         HTTP │ (AiModule — Sprint 6)
             │              │
┌────────────▼───┐  ┌───────▼─────────────────┐
│   Supabase     │  │     AI Service          │
│  PostgreSQL    │  │   FastAPI + Python      │
│  (cloud)       │  │   localhost:8000        │
└────────────────┘  └─────────────────────────┘
```

**Prinsip utama:**
- Frontend **tidak pernah** mengakses database secara langsung
- Semua akses data melalui Backend API
- AI Service dipanggil oleh Backend (bukan Frontend)
- Setiap service memiliki environment config sendiri

---

## 2. Monorepo Structure

```
labcermat-production/          # pnpm workspace root
├── apps/
│   ├── frontend/              # Workspace: "frontend"
│   ├── backend/               # Workspace: "backend"
│   └── ai-service/            # Python (bukan pnpm workspace)
├── packages/
│   ├── shared-types/          # Workspace: "@labcermat/shared-types"
│   └── config/                # Workspace: shared tsconfig
├── docs/
├── infra/
├── pnpm-workspace.yaml
└── package.json
```

**Package manager:** pnpm v9 dengan workspaces  
**Turborepo:** opsional, belum dikonfigurasi (Sprint 1)

---

## 3. Frontend

| Aspek | Keputusan | Alasan |
|---|---|---|
| Framework | React 18 + TypeScript | Ekosistem mature, type safety |
| Build tool | Vite 6 | Fast HMR, modern ESM |
| Styling | Tailwind CSS v3 | Utility-first, konsisten |
| UI Components | shadcn/ui style (manual) | Kontrol penuh, tidak ada lock-in |
| State server | TanStack Query v5 | Caching, refetch, loading state |
| Routing | React Router v6 | Standar industri |
| HTTP client | Axios | Interceptors, timeout |
| Port (dev) | 5175 | Konfigurasi di `vite.config.ts` |

**Vite proxy** dikonfigurasi agar request `/api/*` diteruskan ke `localhost:3001` — menghindari CORS issue di development.

**Shared types** di-resolve langsung dari source (`packages/shared-types/src`) via path alias — tidak perlu build dulu saat development frontend.

---

## 4. Backend

| Aspek | Keputusan | Alasan |
|---|---|---|
| Framework | NestJS v10 | Modular, decorator-based, DI |
| Runtime | Node.js v20+ | LTS, performa baik |
| ORM | Prisma v5 | Type-safe queries, migration |
| Validation | class-validator + class-transformer | Dekorator DTO |
| Config | @nestjs/config + Joi | Validasi env saat startup |
| Port | 3001 | Konfigurasi di `PORT` env |
| API prefix | `/api/v1` | Global prefix di `main.ts` |

**Module structure** (domain-based):
```
src/
├── config/          # Env config dan validasi
├── common/          # Filter, guard, decorator global
├── prisma/          # PrismaService (singleton, @Global)
└── modules/
    ├── health/      # Health check endpoint
    ├── auth/        # Supabase Auth sync + JWT guard (Sprint 2)
    ├── samples/     # Sample workflow — CRUD + state machine (Sprint 3+4)
    ├── results/     # Input + list hasil pemeriksaan (Sprint 4)
    ├── dashboard/   # Dashboard aggregasi per role (Sprint 3+4)
    ├── qc/          # QC harian digital (Sprint 5)
    ├── ai/          # AI gateway + log (Sprint 6+8)
    └── sop-documents/ # SOP document upload/list/delete (Sprint 8)
```

**PrismaModule** di-mark `@Global()` — tersedia di semua module tanpa perlu import ulang.

---

## 5. AI Service

| Aspek | Keputusan | Alasan |
|---|---|---|
| Framework | FastAPI | Async, auto docs, Pydantic native |
| Runtime | Python 3.12 | LTS, performa |
| Validation | Pydantic v2 | Request/response schema ketat |
| Config | pydantic-settings | Env var dengan type safety |
| Port | 8000 | Konfigurasi di `APP_PORT` env |
| Mode QC (Sprint 7) | `azure_ml_artifact` atau `rule_based` | Dikontrol via `AI_MODE` env var |
| Mode Generatif (Sprint 8) | `groq` atau `template_fallback` | Dikontrol via `AI_GENERATIVE_PROVIDER` |
| Virtual env | `labcermat/` | Folder di dalam `apps/ai-service/` |

**Endpoint structure:**
```
GET  /health                      # Health check — mode aktif dari AI_MODE
POST /ai/v1/sample-prioritization # Scoring prioritas sampel (rule-based)
POST /ai/v1/result-review         # Flag hasil pemeriksaan (rule-based)
POST /ai/v1/qc-anomaly            # Deteksi anomali QC — Azure ML artifact atau rule-based
POST /ai/v1/supervisor-summary    # Ringkasan shift supervisor (rule-based)
POST /ai/v1/sop-question          # Sprint 8 — SOP tanya jawab BM25 + Groq/template answer
POST /ai/v1/sop-documents/parse-index  # Sprint 8 — Parse PDF + indeks ke Azure AI Search
DELETE /ai/v1/sop-documents/{id}/index # Sprint 8 — Hapus index dokumen dari Azure AI Search
```

**Services (apps/ai-service/app/services/):**
```
prioritization_service.py    # Rule-based score: priority base + age + recheck
result_review_service.py     # Flag out-of-range, extreme, non-numeric
qc_anomaly_service.py        # Westgard T4 — full-series monotonic trend (fallback)
qc_anomaly_ml_service.py     # Sprint 7 — sklearn inference dari Azure ML artifact
supervisor_summary_service.py # Template-based Indonesian summary
document_service.py          # Sprint 8 — Azure Document Intelligence parse + chunk
search_service.py            # Sprint 8 — Azure AI Search BM25/keyword index + query
sop_service.py               # Sprint 8 — BM25 retrieval + delegate ke generative_service
generative_service.py        # Sprint 8 — Groq LLaMA generative answer + template fallback
```

**Mode QC Anomaly (`AI_MODE` env var):**

| `AI_MODE` | Service | Response `mode` |
|---|---|---|
| `azure_ml_artifact` | `qc_anomaly_ml_service` | `azure_ml_artifact` |
| `azure_ml_artifact` (artifact error) | `qc_anomaly_ml_service` → fallback | `fallback_rule_based` |
| `rule_based` (default) | `qc_anomaly_service` | `rule_based` |

**Azure ML Artifact Inference (Sprint 7):**
- Model `qc-anomaly-detector:1` dilatih di Azure ML Compute Cluster
- Artifact di-download dari Azure ML Model Registry via `az ml model download`
- Inference dijalankan in-process (sklearn) — tidak memerlukan Managed Online Endpoint
- `AZURE_ML_MODEL_DIR` menunjuk ke folder artifact hasil download
- Thread-safe lazy loading dengan `threading.Lock()` — artifact dimuat sekali saat startup

**Pola pemanggilan dari Backend:**
- `AiModule` diekspor dan diimpor oleh `ResultsModule` dan `QcModule`
- Hook otomatis (fire-and-forget) dipanggil dari `results.service.ts` dan `qc.service.ts` via private method `.catch()` — tidak pernah memblokir main flow
- `AiService.saveLog()` dibungkus try/catch — tidak pernah throw
- Timeout HTTP ke AI service: 10 detik (AbortController)

---

## 6. Database

| Aspek | Keputusan | Alasan |
|---|---|---|
| Provider | Supabase PostgreSQL | Managed, gratis untuk MVP |
| ORM | Prisma | Type-safe, migration otomatis |
| Connection pooler | Supabase pgBouncer (port 6543) | Untuk runtime Prisma Client |
| Direct connection | Supabase direct (port 5432) | Untuk `prisma migrate dev` |
| Primary key | UUID (`@db.Uuid`) | Kompatibel Supabase, aman untuk distributed |
| RLS | Tidak aktif Sprint 1 | Backend service akses via service role |

**Dua URL wajib di `apps/backend/.env`:**

```
DATABASE_URL  → pooler (port 6543) + ?pgbouncer=true  → Prisma Client runtime
DIRECT_URL    → direct (port 5432)                    → prisma migrate dev
```

Lihat [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) untuk detail tabel.

---

## 7. Shared Types

Package `@labcermat/shared-types` adalah **single source of truth** untuk:

- Enum nilai yang dipakai di frontend dan backend sekaligus
- Interface response API generik

**Aturan penting:**
- Nilai enum string di `shared-types` **harus identik** dengan nilai Prisma enum di `schema.prisma`
- Jangan duplikasi definisi enum di backend atau frontend
- Sprint 1 hanya memuat 5 type — domain types ditambahkan di sprint masing-masing

---

## 8. Authentication (Sprint 2 — Implemented)

Sprint 2 mengimplementasikan autentikasi production penuh:

| Komponen | Implementasi |
|---|---|
| Frontend auth client | `@supabase/supabase-js` dengan anon key |
| Session storage | Supabase `persistSession`, key `labcermat_session` di localStorage |
| Token refresh | `supabase.auth.onAuthStateChange` + auto refresh Supabase |
| Backend JWT guard | `supabase.admin.auth.getUser(token)` via service role key |
| User sync | `POST /api/v1/auth/sync-user` — upsert ke `public.users`, idempotent |
| Role mapping | Hardcoded email → role di `auth.service.ts` (Sprint lanjutan: admin UI) |
| Audit log | `user.sync` dicatat ke `audit_logs` saat login pertama |
| Protected routes | `RequireAuth` + `GuestOnly` guard di React Router |
| Role-based sidebar | `NAV_ANALIS`, `NAV_SUPERVISOR` terpisah berdasarkan `appUser.role.name` |

**Flow auth:**
```
Frontend login (Supabase signInWithPassword)
  → onAuthStateChange SIGNED_IN
  → POST /api/v1/auth/sync-user     # buat/update public.users
  → GET /api/v1/auth/me             # ambil data lengkap
  → AuthContext.appUser terisi
  → Router redirect ke /
```

**Security:**
- `SUPABASE_SERVICE_ROLE_KEY` hanya ada di backend `.env` — tidak pernah dikirim ke frontend
- `SUPABASE_ANON_KEY` di frontend — sesuai desain Supabase untuk client-side
- Semua endpoint kecuali `/health` dilindungi `AuthGuard`

---

## 9. Sample Workflow — Sprint 3

### Role Enforcement

Role enforcement dilakukan di **service layer** (bukan NestJS Guard), menggunakan pola `resolveUser()`:

```typescript
private async resolveUser(currentUser: RequestUser) {
  return this.prisma.user.findUnique({
    where: { authUserId: currentUser.supabaseId },
    include: { role: true },
  });
}
```

Setiap method mutating memanggil `resolveUser()` lalu memeriksa `user.role.name` sebelum logic bisnis. Jika role tidak sesuai → `ForbiddenException` (HTTP 403).

| Endpoint | Analis | Supervisor |
|---|---|---|
| `POST /samples` | ✅ | ❌ 403 |
| `GET /samples` | ✅ | ✅ |
| `GET /samples/:id` | ✅ | ✅ |
| `PATCH /samples/:id/status` | ✅ | ❌ 403 |
| `GET /dashboard/analis` | ✅ | ❌ 403 |
| `GET /dashboard/supervisor` | ❌ 403 | ✅ |

### State Machine

Transisi status dikontrol via tiga konstanta di `samples.service.ts`:

```typescript
// Analis: satu-ke-satu mapping
const ANALIS_TRANSITIONS: Partial<Record<SampleStatus, SampleStatus>> = {
  menunggu_pemeriksaan: dalam_proses,
  dalam_proses:         menunggu_review,
  minta_cek_ulang:      dalam_proses,
};

// Supervisor: satu-ke-banyak dari menunggu_review
const SUPERVISOR_TRANSITIONS: Partial<Record<SampleStatus, SampleStatus[]>> = {
  menunggu_review: [tervalidasi, minta_cek_ulang],
};

// Terminal: tidak dapat diubah siapapun
const TERMINAL_STATUSES: SampleStatus[] = [tervalidasi, dibatalkan];
```

Supervisor juga dapat membatalkan dari status non-terminal apapun (dibatalkan). Role check dilakukan sebelum state machine check: role salah → 403, transisi tidak valid → 400.

### Prisma Transactions

`POST /samples` dan `PATCH /samples/:id/status` menggunakan `prisma.$transaction` untuk menulis atomik ke tiga tabel sekaligus:

```
sample / sample (update)
  + sample_status_logs (buat entry baru)
  + audit_logs (buat entry baru)
```

Partial failure akan di-rollback otomatis.

### sampleCode Generation

Format: `LAB-YYYYMMDD-XXXX` (4 digit, zero-padded). Dibuat dengan menghitung sampel yang sudah ada hari ini (`count`), lalu increment. Jika terjadi race condition (`P2002` unique constraint), retry sekali dengan `count + 1`.

### Frontend Pages — Sprint 3 + 4

| Halaman | Route | Keterangan |
|---|---|---|
| `SamplesPage` | `/samples` | Daftar sampel dengan filter + paginasi |
| `SampleDetailPage` | `/samples/:id` | Detail + hasil pemeriksaan + aksi analis + aksi supervisor |
| `DashboardPage` (Analis) | `/` | Stats real: totalToday, dalamProses, menungguReview, tervalidasiHariIni, topPriority |
| `DashboardPage` (Supervisor) | `/` | Stats real: menungguReview, tervalidasiHariIni, mintaCekUlang, daftar + aksi |
| `SopAssistantPage` | `/sop` | Sprint 8 — Tanya jawab SOP BM25, source citation, safety note |

Components Sprint 3: `StatusBadge`, `PriorityBadge`, `SampleForm`.  
Components Sprint 4: `ResultForm` (modal input hasil), `ResultsSection` (tabel hasil + tombol Tambah).

### Result Input — Sprint 4

`ResultsSection` ditambahkan di `SampleDetailPage` antara kartu Informasi Sampel dan Riwayat Status:

- **Analis, status `dalam_proses`**: tombol Tambah Hasil muncul → membuka `ResultForm` modal
- **Analis, status lain / supervisor**: read-only tabel hasil saja
- `useCreateResult` menginvalidasi `['results', 'sample', id]`, `sampleKeys.detail(id)`, `sampleKeys.all()`, `dashboardKeys.analis()`, `dashboardKeys.supervisor()` setelah sukses

### Supervisor Actions — Sprint 4

`SupervisorActionSection` ditambahkan di `SampleDetailPage` di bawah header sampel:

- Return `null` jika status terminal atau user bukan supervisor
- **Validasi**: PATCH langsung, note opsional
- **Cek Ulang**: inline panel amber, textarea note wajib
- **Batalkan**: inline panel merah, textarea alasan wajib; tersedia dari status non-terminal apapun
- State panel (`null | 'cek_ulang' | 'batalkan'`) + `updateStatus.reset()` saat panel berganti mencegah error state lama tertampil

---

## 10. Keputusan Teknis yang Dicatat

| Keputusan | Alasan |
|---|---|
| UUID untuk semua PK/FK dengan `@db.Uuid` | Kompatibilitas Supabase, safety distributed system |
| `sample_status_logs` dan `audit_logs` append-only | Immutability audit trail — tidak ada UPDATE/DELETE |
| Frontend tidak akses DB langsung | Semua melalui Backend API, konsisten dengan arsitektur production |
| Password DB hanya huruf+angka | Menghindari URL-encoding issue di connection string Supabase |
| `labcermat/` sebagai nama venv | Lebih deskriptif dari `.venv` generik |
| Turborepo tidak dipakai Sprint 1 | Tidak menjadi blocker, dapat ditambahkan Sprint 2+ |
| JWT divalidasi via `supabase.auth.getUser()` | Tidak perlu kelola JWKS, rotasi key otomatis Supabase |
| `POST /auth/sync-user` dipanggil frontend, bukan DB trigger | Eksplisit, mudah debug, tidak bergantung Supabase webhook |
| Email → role mapping hardcoded di service | Sprint 2 hanya 2 demo user; admin UI assign role di sprint lanjutan |
| `bootstrap().catch(console.error)` di main.ts | Startup exception tidak lagi hilang diam-diam |
| Clean build (hapus dist + tsbuildinfo) di `pnpm dev` | Mencegah incremental build yang melewatkan file baru |
| Role enforcement di service layer, bukan NestJS Guard | Lebih sederhana untuk 2 role; Guard infrastructure belum diperlukan Sprint 3 |
| `resolveUser()` query per request mutating | Single source of truth — role dari DB, bukan JWT claim yang bisa stale |
| `prisma.$transaction` untuk sample + statusLog + auditLog | Atomicity — partial write ke 3 tabel tidak mungkin terjadi |
| sampleCode retry on P2002 | Race condition volume rendah cukup ditangani 1 retry tanpa distributed lock |
| Azure ML Managed Online Endpoint → FastAPI artifact inference | `SubscriptionNotRegistered` error pada Azure for Students — endpoint provisioning tidak tersedia; model tetap dilatih dan diregister di Azure ML |
| sklearn inference in-process, bukan REST call ke endpoint | Latensi <10ms vs ~100–300ms; tidak memerlukan endpoint key; model dari Azure ML Registry tetap valid |
| `AI_MODE` env var memilih service per-request | Memungkinkan switch rule_based↔azure_ml_artifact tanpa deploy ulang; default `rule_based` aman jika artifact belum di-download |
| Thread-safe lazy loading untuk model artifact | FastAPI multi-worker — `threading.Lock()` menjamin artifact dimuat sekali; `_load_error` sentinel mencegah retry I/O berulang |
| Azure OpenAI / AI Foundry → Groq sebagai generative provider | Azure for Students region policy memblokir model deployment di region yang tersedia; Groq API (gratis, tanpa region restriction) dipakai sebagai pengganti |
| BM25-only search, embedding/vector search ditunda | Azure OpenAI embedding endpoint tidak tersedia; BM25 dengan Indonesian Lucene analyzer (`id.lucene`) cukup untuk MVP use case keyword query SOP |
| `AI_GENERATIVE_PROVIDER` env var memilih provider | Switch antara `groq` dan `template_fallback` tanpa restart jika hot-reload aktif; default `template_fallback` aman tanpa API key |
| Template BM25 sebagai tiga-tier fallback generatif | Endpoint selalu merespons: `groq_llm` → `fallback_template_bm25` → `template_bm25`; tidak ada single point of failure di layer generatif |
| SOP chunks disimpan di Azure AI Search, bukan database | Search index dioptimalkan untuk full-text BM25; `sop_documents` di Prisma hanya menyimpan metadata (status, chunk count, timestamps) |

---

## 11. Rencana Perubahan Arsitektur Sprint Berikutnya

| Sprint | Perubahan |
|---|---|
| Sprint 2 | ✅ Supabase Auth, JWT guard, sync-user, role-based sidebar, protected routes |
| Sprint 3 | ✅ Sample workflow state machine, status log service, dashboard aggregasi, role enforcement backend |
| Sprint 4 | ✅ Input hasil pemeriksaan (`sample_results`), supervisor review (validasi/cek ulang/batalkan), dashboard real data Sprint 4 |
| Sprint 5 | ✅ QC harian digital, audit log service, riwayat aktivitas |
| Sprint 6 | ✅ AI service rule-based baseline, AiModule backend, ai_analysis_logs, frontend AI components |
| Sprint 7 | ✅ Azure ML custom model (QC anomaly), artifact inference via FastAPI, frontend mode badge |
| Sprint 8 | ✅ SOP Assistant (BM25 + Groq), Document Upload/Parse/Index, Azure AI Search, sop_documents tabel |
| Sprint 9 | CI/CD GitHub Actions, Azure deployment, Application Insights |
