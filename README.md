# LabCermat Production

Platform workflow laboratorium klinik — monorepo production.

> **Sprint saat ini:** Sprint 4 — Result Input & Supervisor Review ✅

---

## Daftar Isi

- [Struktur Project](#struktur-project)
- [Prerequisite](#prerequisite)
- [Setup Lokal](#setup-lokal)
- [Menjalankan Setiap Service](#menjalankan-setiap-service)
- [Health Check](#health-check)
- [Database — Migrasi dan Seed](#database--migrasi-dan-seed)
- [TypeCheck](#typecheck)
- [Dokumentasi](#dokumentasi)
- [Sprint Progress](#sprint-progress)

---

## Struktur Project

```
labcermat-production/
├── apps/
│   ├── frontend/          # React + TypeScript + Vite (port 5175)
│   ├── backend/           # NestJS + TypeScript + Prisma (port 3001)
│   └── ai-service/        # Python + FastAPI (port 8000)
├── packages/
│   ├── shared-types/      # Shared TypeScript types (enum + interfaces)
│   └── config/            # Shared tsconfig base
├── docs/                  # Dokumentasi teknis
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   ├── DATABASE_SCHEMA.md
│   └── DEPLOYMENT.md
└── infra/                 # Infrastructure config (Sprint 8)
```

---

## Prerequisite

| Tool | Versi Minimum | Keterangan |
|---|---|---|
| Node.js | >= 20.0.0 | Runtime backend + frontend tooling |
| pnpm | >= 9.0.0 | Package manager monorepo |
| Python | >= 3.11 | Runtime AI service |
| Git | >= 2.40 | Version control |

Install pnpm jika belum:

```powershell
npm install -g pnpm@9
```

---

## Setup Lokal

### 1. Clone repository

```powershell
git clone <repo-url>
cd labcermat-production
```

### 2. Install semua dependencies

```powershell
pnpm install
```

### 3. Konfigurasi environment

Salin `.env.example` ke `.env` di setiap service dan isi nilainya:

```powershell
# Backend
copy apps\backend\.env.example apps\backend\.env

# Frontend
copy apps\frontend\.env.example apps\frontend\.env

# AI Service
copy apps\ai-service\.env.example apps\ai-service\.env
```

> **PENTING:** Jangan pernah commit file `.env` ke repository.

Isi minimal yang wajib diisi di `apps/backend/.env`:

```
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-...:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

> **Catatan password:** Gunakan password yang hanya mengandung huruf dan angka untuk menghindari masalah URL-encoding di connection string.

### 4. Build shared-types

```powershell
cd packages/shared-types
npx tsc
cd ../..
```

### 5. Setup Python virtual environment (AI Service)

```powershell
cd apps/ai-service
python -m venv labcermat
.\labcermat\Scripts\activate
pip install -r requirements.txt
cd ../..
```

### 6. Jalankan database migration dan seed

```powershell
cd apps/backend
npx prisma migrate dev --name init
npx prisma db seed
cd ../..
```

> Lihat [Database — Migrasi dan Seed](#database--migrasi-dan-seed) untuk detail lengkap.

---

## Menjalankan Setiap Service

Buka **3 terminal terpisah**:

**Terminal 1 — Backend (port 3001):**

```powershell
cd apps/backend
pnpm dev
```

**Terminal 2 — Frontend (port 5175):**

```powershell
cd apps/frontend
pnpm dev
```

**Terminal 3 — AI Service (port 8000):**

```powershell
cd apps/ai-service
.\labcermat\Scripts\uvicorn app.main:app --reload --port 8000
```

---

## Health Check

Setelah semua service berjalan, verifikasi dengan:

```powershell
# Backend
Invoke-WebRequest -Uri "http://localhost:3001/api/v1/health" -UseBasicParsing

# AI Service
Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
```

Respons yang diharapkan:

```json
// Backend
{ "status": "ok", "service": "labcermat-backend", "database": "connected" }

// AI Service
{ "status": "ok", "service": "labcermat-ai-service", "mode": "placeholder" }
```

Frontend: buka `http://localhost:5175` — Dashboard menampilkan status sistem secara live.

---

## Auth — Login dan Akun Demo

Sprint 2 mengimplementasikan autentikasi penuh via **Supabase Auth**.

### Environment Variables Wajib

`apps/frontend/.env`:
```
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=<anon key dari Supabase dashboard>
```

`apps/backend/.env` (sudah ada sejak Sprint 1):
```
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key — JANGAN expose ke frontend>
```

> `SUPABASE_ANON_KEY` boleh di frontend. `SUPABASE_SERVICE_ROLE_KEY` hanya boleh di backend.

### Akun Demo Sprint 2

| Email | Role | Password |
|---|---|---|
| `analis@labcermat.demo` | Analis | `demo12345` |
| `supervisor@labcermat.demo` | Supervisor | `demo12345` |

Akun dibuat manual di Supabase Auth dashboard. Ganti password sebelum deployment production.

### Login

Buka `http://localhost:5175` → klik **Masuk sebagai Analis** atau **Masuk sebagai Supervisor**.

### Sync User

Saat login pertama, frontend otomatis memanggil `POST /api/v1/auth/sync-user` untuk membuat record di tabel `public.users`. Proses ini idempotent — aman dipanggil berulang.

### Auth Endpoints

```
POST /api/v1/auth/sync-user   # Sinkronisasi Supabase Auth → public.users
GET  /api/v1/auth/me          # Data user yang sedang login
```

---

## Sample Workflow & Result Input — Sprint 3 + 4

Sprint 3 mengimplementasikan workflow sampel end-to-end. Sprint 4 menambahkan input hasil pemeriksaan dan supervisor review.

### Flow Analis

1. Login sebagai analis → buka sidebar **Sampel**
2. Klik **Tambah Sampel** → isi form → submit
3. Sampel terdaftar dengan status **Menunggu Pemeriksaan**
4. Klik sampel → halaman detail → klik **Mulai Proses**
5. Status berubah ke **Dalam Proses**
6. Di kartu **Hasil Pemeriksaan** → klik **Tambah Hasil** → isi parameterName, nilai, satuan, rentang rujukan (opsional), catatan (opsional)
7. Ulangi untuk setiap parameter yang diperiksa
8. Klik **Kirim ke Review** → status **Menunggu Review** (input hasil dikunci)
9. Setiap perubahan status tercatat di `sample_status_logs` dan `audit_logs`

### Flow Supervisor

1. Login sebagai supervisor → dashboard menampilkan **Menunggu Review**, **Tervalidasi Hari Ini**, **Minta Cek Ulang**
2. Klik **Validasi** di daftar dashboard untuk validasi cepat, atau klik nama sampel untuk detail
3. Di halaman detail → kartu **Hasil Pemeriksaan** tampil read-only
4. Kartu **Aksi Supervisor** tersedia:
   - **Validasi** (teal) — PATCH ke `tervalidasi`
   - **Cek Ulang** (amber) — textarea catatan wajib → PATCH ke `minta_cek_ulang`
   - **Batalkan** (merah) — textarea alasan wajib → PATCH ke `dibatalkan`
5. Status terminal (`tervalidasi` / `dibatalkan`) mengunci semua aksi lebih lanjut

### Endpoint Aktif

```
POST   /api/v1/samples                    # Buat sampel (analis)
GET    /api/v1/samples                    # Daftar sampel (analis + supervisor)
GET    /api/v1/samples/:id                # Detail sampel (analis + supervisor)
PATCH  /api/v1/samples/:id/status         # Update status (analis + supervisor, state machine)
POST   /api/v1/samples/:id/results        # Input hasil pemeriksaan (analis, status dalam_proses)
GET    /api/v1/samples/:id/results        # Lihat hasil pemeriksaan (analis + supervisor)
GET    /api/v1/dashboard/analis           # Dashboard analis
GET    /api/v1/dashboard/supervisor       # Dashboard supervisor
```

### Role Enforcement Backend

| Aksi | Analis | Supervisor |
|---|---|---|
| Buat sampel | ✅ | ❌ 403 |
| Lihat daftar/detail | ✅ | ✅ |
| Input hasil (status `dalam_proses`) | ✅ | ❌ 403 |
| Lihat hasil | ✅ | ✅ |
| Transisi analis (→ `dalam_proses`, → `menunggu_review`) | ✅ | ❌ 403 |
| Validasi / Cek Ulang / Batalkan | ❌ 403 | ✅ |
| Dashboard analis | ✅ | ❌ 403 |
| Dashboard supervisor | ❌ 403 | ✅ |

### State Machine Status Sampel

```
menunggu_pemeriksaan → dalam_proses        (analis)
dalam_proses         → menunggu_review     (analis)
minta_cek_ulang      → dalam_proses        (analis)
menunggu_review      → tervalidasi         (supervisor)
menunggu_review      → minta_cek_ulang     (supervisor, catatan wajib)
non-terminal         → dibatalkan          (supervisor, alasan wajib)
```

Status terminal (`tervalidasi`, `dibatalkan`) — tidak dapat diubah oleh siapapun → **400 Bad Request**.  
Transisi tidak valid → **400 Bad Request**.  
Role salah → **403 Forbidden**.

---

## Database — Migrasi dan Seed

Semua perintah dijalankan dari `apps/backend/`:

```powershell
cd apps/backend

# Migrasi pertama (buat 6 tabel di Supabase)
npx prisma migrate dev --name init

# Seed data awal (4 role + 1 laboratorium dummy)
npx prisma db seed

# Buka Prisma Studio untuk inspeksi data
npx prisma studio

# Generate ulang Prisma Client setelah schema berubah
npx prisma generate
```

> **Windows — jika muncul error "no space left on device":**
> Drive C penuh. Set TEMP ke drive lain sebelum jalankan perintah Prisma:
> ```powershell
> $env:TEMP = "D:\temp-labcermat"
> $env:TMP  = "D:\temp-labcermat"
> ```

---

## TypeCheck

```powershell
# Shared types
cd packages/shared-types && npx tsc --noEmit

# Backend
cd apps/backend && npx tsc --noEmit

# Frontend
cd apps/frontend && npx tsc --noEmit

# Semua sekaligus dari root
pnpm typecheck
```

---

## Dokumentasi

| Dokumen | Deskripsi |
|---|---|
| [PRD.md](docs/PRD.md) | Product Requirements Document |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arsitektur sistem dan keputusan teknis |
| [API_SPEC.md](docs/API_SPEC.md) | Spesifikasi endpoint Backend + AI Service |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Schema database Sprint 1 |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Panduan deployment (Sprint 8) |
| [SPRINT_1_IMPLEMENTATION_PLAN.md](docs/SPRINT_1_IMPLEMENTATION_PLAN.md) | Rencana implementasi Sprint 1 |

---

## Sprint Progress

| Sprint | Status | Deskripsi |
|---|---|---|
| Sprint 1 | ✅ Selesai | Project setup, monorepo, database foundation, semua service berjalan |
| Sprint 2 | ✅ Selesai | Supabase Auth, JWT guard, sync-user, role-based sidebar, protected routes |
| Sprint 3 | ✅ Selesai | Sample workflow (tambah, proses, kirim review), dashboard real data, role enforcement backend |
| Sprint 4 | ✅ Selesai | Input hasil pemeriksaan, supervisor review (validasi/cek ulang/batalkan), dashboard real data |
| Sprint 5 | ⬜ Belum mulai | QC harian digital & audit log |
| Sprint 6 | ⬜ Belum mulai | AI service dasar (rule-based) |
| Sprint 7 | ⬜ Belum mulai | Azure AI integration |
| Sprint 8 | ⬜ Belum mulai | Deployment & monitoring |
