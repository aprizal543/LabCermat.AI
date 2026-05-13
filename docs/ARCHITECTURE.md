# LabCermat — Architecture

**Versi:** 5.0 — Sprint 5  
**Status:** QC Harian Digital & Audit Log aktif

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
   Prisma ORM│         HTTP │ (Sprint 6+)
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
    └── dashboard/   # Dashboard aggregasi per role (Sprint 3+4)
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
| Mode saat ini | `placeholder` | Logic AI belum aktif (Sprint 6+) |
| Virtual env | `labcermat/` | Folder di dalam `apps/ai-service/` |

**Endpoint structure:**
```
GET  /health                      # Health check
POST /ai/v1/sample-prioritization # Sprint 6
POST /ai/v1/result-review         # Sprint 6
POST /ai/v1/qc-anomaly            # Sprint 6
POST /ai/v1/supervisor-summary    # Sprint 6
```

Semua AI endpoint mengembalikan `"mode": "placeholder"` sampai Sprint 6 diimplementasikan.

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

---

## 11. Rencana Perubahan Arsitektur Sprint Berikutnya

| Sprint | Perubahan |
|---|---|
| Sprint 2 | ✅ Supabase Auth, JWT guard, sync-user, role-based sidebar, protected routes |
| Sprint 3 | ✅ Sample workflow state machine, status log service, dashboard aggregasi, role enforcement backend |
| Sprint 4 | ✅ Input hasil pemeriksaan (`sample_results`), supervisor review (validasi/cek ulang/batalkan), dashboard real data Sprint 4 |
| Sprint 5 | QC harian digital, audit log service, riwayat aktivitas |
| Sprint 6 | AI service rule-based logic, backend AI gateway |
| Sprint 7 | Azure OpenAI, Document Intelligence, AI Search, Blob Storage |
| Sprint 8 | CI/CD GitHub Actions, Azure deployment, Application Insights |
