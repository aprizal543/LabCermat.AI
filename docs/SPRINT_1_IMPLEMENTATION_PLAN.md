# LabCermat — Sprint 1 Implementation Plan (v2)
## Project Setup & Database Foundation

**Versi:** 2.0  
**Sprint Duration:** 2 minggu  
**Tim:** AI Engineer, Data Science, Fullstack Developer  
**Revisi:** Konsistensi API prefix, RLS strategy, shared-types minimal, scope enforcement

---

## 1. Sprint 1 Objective

> Membangun **fondasi sistem production LabCermat** yang solid: monorepo terstruktur, environment terkonfigurasi, database schema awal terdefinisi, koneksi Supabase aktif, dan semua service (Backend, AI Service, Frontend) sudah bisa berjalan dalam mode minimal dengan health check yang dapat diverifikasi oleh seluruh tim.

Sprint 1 **bukan** tentang fitur. Sprint 1 adalah tentang **memastikan semua orang di tim bisa mulai bekerja di atas fondasi yang sama, konsisten, dan stabil.**

---

## 2. Sprint 1 Scope

### ✅ In Scope

- Inisialisasi monorepo dengan `pnpm workspaces`
- Konfigurasi environment (`.env`, `.env.example`) untuk semua service
- Setup Supabase project + koneksi database via Prisma
- Database schema awal: `roles`, `laboratories`, `users`, `samples`, `sample_status_logs`, `audit_logs`
- Prisma schema + migrasi pertama
- NestJS backend: global prefix `/api/v1`, health check, auth/me placeholder, samples placeholder
- FastAPI AI service: health check + 4 placeholder AI endpoints
- React frontend: scaffolding, routing dasar, AppShell layout, placeholder halaman
- `packages/shared-types` — minimal types saja
- Dokumentasi: `README.md`, `ARCHITECTURE.md`, `API_SPEC.md` awal, `.env.example`
- GitHub repository + branch strategy

### ❌ Out of Scope Sprint 1

- Login / autentikasi yang sepenuhnya fungsional
- Integrasi Supabase Auth ke frontend
- Sample workflow logic (mulai proses, kirim ke review, dll.)
- Input hasil pemeriksaan
- Review supervisor
- QC harian
- Azure integration (apapun)
- AI logic / model
- Dashboard yang fungsional dengan data nyata
- Tabel database selain 6 tabel fondasi

---

## 3. Struktur Folder Production

```
labcermat-production/
│
├── apps/
│   ├── frontend/                          # React + TypeScript + Vite
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   │   ├── ui/                    # shadcn/ui components
│   │   │   │   └── layout/
│   │   │   │       ├── AppShell.tsx
│   │   │   │       └── Sidebar.tsx
│   │   │   ├── features/                  # Feature-based modules (placeholder)
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   └── samples/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts          # Axios base config + interceptors
│   │   │   │   └── query-client.ts        # TanStack Query config
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx          # Placeholder
│   │   │   │   ├── DashboardPage.tsx      # Placeholder
│   │   │   │   └── NotFoundPage.tsx
│   │   │   ├── router/
│   │   │   │   └── index.tsx              # React Router config
│   │   │   ├── types/                     # Local type re-exports dari shared-types
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── .env.example
│   │   ├── index.html
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   ├── backend/                           # NestJS + TypeScript + Prisma
│   │   ├── src/
│   │   │   ├── common/
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts
│   │   │   │   └── guards/
│   │   │   │       └── auth.guard.ts      # Placeholder Sprint 1
│   │   │   ├── config/
│   │   │   │   └── configuration.ts       # Env config loader + validation
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   └── auth.module.ts
│   │   │   │   ├── health/
│   │   │   │   │   ├── health.controller.ts
│   │   │   │   │   └── health.module.ts
│   │   │   │   └── samples/
│   │   │   │       ├── samples.controller.ts
│   │   │   │       ├── samples.service.ts
│   │   │   │       ├── samples.module.ts
│   │   │   │       └── dto/
│   │   │   │           └── create-sample.dto.ts
│   │   │   ├── prisma/
│   │   │   │   └── prisma.service.ts
│   │   │   └── app.module.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts                    # Seed roles + lab dummy
│   │   │   └── migrations/               # Auto-generated oleh Prisma
│   │   ├── .env.example
│   │   ├── nest-cli.json
│   │   └── tsconfig.json
│   │
│   └── ai-service/                        # Python + FastAPI
│       ├── app/
│       │   ├── api/
│       │   │   └── v1/
│       │   │       ├── health.py
│       │   │       ├── sample_prioritization.py
│       │   │       ├── result_review.py
│       │   │       ├── qc_anomaly.py
│       │   │       ├── supervisor_summary.py
│       │   │       └── router.py
│       │   ├── core/
│       │   │   ├── config.py              # Pydantic BaseSettings
│       │   │   └── logging.py
│       │   ├── models/                    # Pydantic request/response models
│       │   │   ├── health.py
│       │   │   └── ai_models.py
│       │   └── main.py
│       ├── .env.example
│       ├── requirements.txt               # Versi terkunci
│       └── Dockerfile
│
├── packages/
│   ├── shared-types/                      # Shared TypeScript types (minimal)
│   │   ├── src/
│   │   │   ├── index.ts                   # Re-export semua
│   │   │   ├── role.types.ts              # UserRole enum
│   │   │   ├── sample.types.ts            # SampleStatus, SamplePriority enum
│   │   │   └── api.types.ts               # ApiResponse<T>, PaginatedResponse<T>
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                            # Shared config
│       └── tsconfig/
│           └── base.json                  # Base tsconfig untuk semua apps
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md                        # Diisi Sprint 1
│   ├── DATABASE_SCHEMA.md
│   └── DEPLOYMENT.md                      # Placeholder Sprint 8
│
├── infra/
│   ├── azure/
│   │   └── .gitkeep                       # Placeholder Sprint 8
│   └── github-actions/
│       └── ci.yml                         # Lint + type check
│
├── .env.example                           # Root-level env reference
├── .gitignore
├── package.json                           # Root workspace
├── pnpm-workspace.yaml
└── README.md
```

> **Turborepo** (`turbo.json`) bersifat **opsional** dan tidak menjadi blocker Sprint 1. Dapat ditambahkan setelah monorepo berjalan stabil.

---

## 4. Database Schema Awal

### Prinsip Desain Sprint 1

- Hanya 6 tabel fondasi. Tabel lain (`sample_results`, `qc_records`, `documents`, `sop_documents`, `ai_analysis_logs`) masuk sprint berikutnya.
- Semua primary key menggunakan UUID untuk kompatibilitas Supabase dan kemudahan migrasi ke Azure PostgreSQL.
- Semua tabel menggunakan `created_at` dengan default `now()`. Tabel yang bisa diupdate menambahkan `updated_at`.
- `sample_status_logs` dan `audit_logs` bersifat **append-only** — tidak ada `UPDATE` atau `DELETE`.

---

### 4.1 Tabel `roles`

Dibuat pertama karena `users` memiliki foreign key ke sini.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | Primary key |
| `name` | VARCHAR(50) | NOT NULL, UNIQUE | `analis`, `supervisor`, `admin`, `auditor` |
| `description` | TEXT | nullable | Deskripsi role |
| `permissions` | JSONB | NOT NULL, default `'[]'` | Array string permission |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Seed data wajib:** `analis`, `supervisor`, `admin`, `auditor`

---

### 4.2 Tabel `laboratories`

Dirancang multi-lab dari awal meski MVP hanya satu lab.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | UUID | PK | Primary key |
| `name` | VARCHAR(255) | NOT NULL | Nama laboratorium |
| `type` | VARCHAR(100) | NOT NULL | `klinik`, `rumah_sakit`, `farmasi`, `mandiri` |
| `address` | TEXT | nullable | Alamat lengkap |
| `contact` | VARCHAR(100) | nullable | Nomor kontak |
| `is_active` | BOOLEAN | NOT NULL, default `true` | |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Auto-update |

---

### 4.3 Tabel `users`

Profil pengguna aplikasi. Terhubung ke Supabase Auth via `auth_user_id`.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | UUID | PK | Primary key internal |
| `auth_user_id` | UUID | NOT NULL, UNIQUE | Supabase Auth `user.id` |
| `full_name` | VARCHAR(255) | NOT NULL | Nama lengkap |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email |
| `role_id` | UUID | NOT NULL, FK → `roles.id` | Role pengguna |
| `laboratory_id` | UUID | NOT NULL, FK → `laboratories.id` | Lab tempat bertugas |
| `status` | VARCHAR(20) | NOT NULL, default `'active'` | `active`, `inactive` |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Auto-update |

---

### 4.4 Tabel `samples`

Inti workflow. Setiap sampel memiliki lifecycle status yang terdokumentasi.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | UUID | PK | Primary key |
| `sample_code` | VARCHAR(50) | NOT NULL, UNIQUE | e.g. `LAB-20250512-001` |
| `laboratory_id` | UUID | NOT NULL, FK → `laboratories.id` | Lab asal |
| `sample_type` | VARCHAR(100) | NOT NULL | darah, urin, dll |
| `requested_test` | VARCHAR(255) | NOT NULL | Pemeriksaan yang diminta |
| `department` | VARCHAR(100) | nullable | Departemen pengirim |
| `priority` | VARCHAR(20) | NOT NULL, default `'rutin'` | `rutin`, `urgent`, `cito` |
| `status` | VARCHAR(50) | NOT NULL, default `'menunggu_pemeriksaan'` | Lihat enum di bawah |
| `received_at` | TIMESTAMPTZ | nullable | Waktu sampel diterima |
| `created_by` | UUID | NOT NULL, FK → `users.id` | Analis pencatat |
| `notes` | TEXT | nullable | Catatan tambahan |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Auto-update |

**Status lifecycle:**
```
menunggu_pemeriksaan
  → dalam_proses
    → menunggu_review
      → tervalidasi
      → minta_cek_ulang → dalam_proses (dapat loop)
  → dibatalkan  (dari status manapun, kecuali tervalidasi)
```

---

### 4.5 Tabel `sample_status_logs`

Append-only. Tidak ada `updated_at`. Mencatat setiap perubahan status sampel.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | UUID | PK | Primary key |
| `sample_id` | UUID | NOT NULL, FK → `samples.id` | Sampel yang berubah |
| `previous_status` | VARCHAR(50) | nullable | Null hanya untuk entri pertama |
| `new_status` | VARCHAR(50) | NOT NULL | Status baru |
| `changed_by` | UUID | NOT NULL, FK → `users.id` | User yang mengubah |
| `note` | TEXT | nullable | Catatan perubahan |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

---

### 4.6 Tabel `audit_logs`

Append-only. General audit trail untuk semua aktivitas penting di sistem.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | UUID | PK | Primary key |
| `user_id` | UUID | nullable, FK → `users.id` | Null untuk system action |
| `action` | VARCHAR(100) | NOT NULL | `CREATE_SAMPLE`, `UPDATE_STATUS`, `LOGIN`, dll |
| `entity_type` | VARCHAR(50) | nullable | `sample`, `user`, dll |
| `entity_id` | UUID | nullable | ID entitas yang terlibat |
| `metadata` | JSONB | nullable | Detail tambahan (old/new value, IP, dll) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Aturan:** Hanya `INSERT` dari backend service. Tidak ada `UPDATE` atau `DELETE` pada tabel ini.

---

## 5. Prisma Schema Awal

File: `apps/backend/prisma/schema.prisma`

```prisma
// ============================================================
// LabCermat — Prisma Schema v1.0
// Sprint 1: Foundation Tables Only
// ============================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  // DATABASE_URL  → pakai connection pooler Supabase (port 6543)
  // DIRECT_URL    → koneksi langsung untuk prisma migrate (port 5432)
}

// ============================================================
// ENUMS
// ============================================================

enum UserStatus {
  active
  inactive
}

enum SampleStatus {
  menunggu_pemeriksaan
  dalam_proses
  menunggu_review
  tervalidasi
  minta_cek_ulang
  dibatalkan
}

enum SamplePriority {
  rutin
  urgent
  cito
}

enum LaboratoryType {
  klinik
  rumah_sakit
  farmasi
  mandiri
}

// ============================================================
// MODEL: Role
// ============================================================

model Role {
  id          String   @id @default(uuid())
  name        String   @unique @db.VarChar(50)
  description String?
  permissions Json     @default("[]")
  createdAt   DateTime @default(now()) @map("created_at")

  users User[]

  @@map("roles")
}

// ============================================================
// MODEL: Laboratory
// ============================================================

model Laboratory {
  id        String         @id @default(uuid())
  name      String         @db.VarChar(255)
  type      LaboratoryType
  address   String?
  contact   String?        @db.VarChar(100)
  isActive  Boolean        @default(true) @map("is_active")
  createdAt DateTime       @default(now()) @map("created_at")
  updatedAt DateTime       @updatedAt @map("updated_at")

  users   User[]
  samples Sample[]

  @@map("laboratories")
}

// ============================================================
// MODEL: User
// ============================================================

model User {
  id           String     @id @default(uuid())
  authUserId   String     @unique @map("auth_user_id") @db.Uuid
  fullName     String     @map("full_name") @db.VarChar(255)
  email        String     @unique @db.VarChar(255)
  status       UserStatus @default(active)
  roleId       String     @map("role_id")
  laboratoryId String     @map("laboratory_id")
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  role       Role       @relation(fields: [roleId], references: [id])
  laboratory Laboratory @relation(fields: [laboratoryId], references: [id])

  samplesCreated    Sample[]          @relation("SampleCreatedBy")
  statusLogsChanged SampleStatusLog[] @relation("StatusChangedBy")
  auditLogs         AuditLog[]

  @@map("users")
}

// ============================================================
// MODEL: Sample
// ============================================================

model Sample {
  id            String         @id @default(uuid())
  sampleCode    String         @unique @map("sample_code") @db.VarChar(50)
  laboratoryId  String         @map("laboratory_id")
  sampleType    String         @map("sample_type") @db.VarChar(100)
  requestedTest String         @map("requested_test") @db.VarChar(255)
  department    String?        @db.VarChar(100)
  priority      SamplePriority @default(rutin)
  status        SampleStatus   @default(menunggu_pemeriksaan)
  receivedAt    DateTime?      @map("received_at")
  createdBy     String         @map("created_by")
  notes         String?
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")

  laboratory Laboratory        @relation(fields: [laboratoryId], references: [id])
  creator    User              @relation("SampleCreatedBy", fields: [createdBy], references: [id])
  statusLogs SampleStatusLog[]

  @@map("samples")
}

// ============================================================
// MODEL: SampleStatusLog
// ============================================================

model SampleStatusLog {
  id             String        @id @default(uuid())
  sampleId       String        @map("sample_id")
  previousStatus SampleStatus? @map("previous_status")
  newStatus      SampleStatus  @map("new_status")
  changedBy      String        @map("changed_by")
  note           String?
  createdAt      DateTime      @default(now()) @map("created_at")

  sample        Sample @relation(fields: [sampleId], references: [id])
  changedByUser User   @relation("StatusChangedBy", fields: [changedBy], references: [id])

  @@map("sample_status_logs")
}

// ============================================================
// MODEL: AuditLog
// ============================================================

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?  @map("user_id")
  action     String   @db.VarChar(100)
  entityType String?  @map("entity_type") @db.VarChar(50)
  entityId   String?  @map("entity_id") @db.Uuid
  metadata   Json?
  createdAt  DateTime @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id])

  @@map("audit_logs")
}
```

---

## 6. Supabase RLS Strategy

### Strategi Sprint 1

**Backend NestJS mengakses database melalui Prisma menggunakan `DATABASE_URL` (service-level connection). Frontend tidak boleh mengakses tabel Supabase secara langsung. Semua akses data dikontrol melalui backend API.**

Konsekuensi untuk Sprint 1:

- RLS **tidak perlu diaktifkan** untuk tabel yang dikelola Prisma di Sprint 1.
- Migrasi Prisma berjalan menggunakan `DIRECT_URL` (koneksi langsung, bukan pooler) — tidak terpengaruh RLS.
- Supabase Auth akan diintegrasikan di Sprint 2. Sprint 1 hanya menyiapkan kolom `auth_user_id` di tabel `users` sebagai foreign key placeholder.

### Catatan untuk Production (Sprint 7+)

Saat sistem siap masuk production dan Supabase Auth diaktifkan penuh, RLS dapat dikonfigurasi dengan policy:

```sql
-- Contoh policy masa depan (BUKAN untuk Sprint 1)
-- Backend menggunakan service role key yang bypass RLS
-- RLS hanya berlaku jika ada akses langsung dari klien (tidak dipakai di arsitektur ini)
```

**Kesimpulan Sprint 1:** Fokus pada koneksi Prisma yang berjalan. RLS tidak menjadi bagian dari task Sprint 1.

---

## 7. Shared Types — Minimal

File: `packages/shared-types/src/`

Hanya 4 type definitions yang dibutuhkan Sprint 1:

```typescript
// role.types.ts
export enum UserRole {
  ANALIS = 'analis',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
  AUDITOR = 'auditor',
}

// sample.types.ts
export enum SampleStatus {
  MENUNGGU_PEMERIKSAAN = 'menunggu_pemeriksaan',
  DALAM_PROSES = 'dalam_proses',
  MENUNGGU_REVIEW = 'menunggu_review',
  TERVALIDASI = 'tervalidasi',
  MINTA_CEK_ULANG = 'minta_cek_ulang',
  DIBATALKAN = 'dibatalkan',
}

export enum SamplePriority {
  RUTIN = 'rutin',
  URGENT = 'urgent',
  CITO = 'cito',
}

// api.types.ts
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// index.ts — re-export semua
export * from './role.types';
export * from './sample.types';
export * from './api.types';
```

> **Aturan Sprint 1:** Jangan tambahkan domain types lain (UserProfile, SampleDetail, dll.) di Sprint 1. Types tersebut menyusul di sprint fitur masing-masing.

---

## 8. API Contract — Backend (NestJS)

**Global prefix: `/api/v1`**  
Base URL lokal: `http://localhost:3001`

Semua endpoint menggunakan prefix `/api/v1`. Tidak ada campur aduk antara `/api` dan `/api/v1`.

---

### 8.1 Health Check

```
GET /api/v1/health

Response 200:
{
  "status": "ok",
  "service": "labcermat-backend",
  "version": "1.0.0",
  "timestamp": "2025-05-12T10:00:00.000Z",
  "database": "connected"
}

Response 503 (jika DB tidak tersambung):
{
  "status": "error",
  "service": "labcermat-backend",
  "version": "1.0.0",
  "timestamp": "2025-05-12T10:00:00.000Z",
  "database": "disconnected"
}
```

---

### 8.2 Auth — Get Current User (Placeholder)

```
GET /api/v1/auth/me
Headers: Authorization: Bearer <supabase_jwt>

Response 200 (placeholder — belum validasi JWT sungguhan):
{
  "data": {
    "id": "uuid",
    "authUserId": "uuid",
    "fullName": "Rina Analis",
    "email": "rina@lab.id",
    "role": {
      "id": "uuid",
      "name": "analis"
    },
    "laboratory": {
      "id": "uuid",
      "name": "Lab Klinik Utama"
    }
  }
}

Response 401:
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Invalid or missing token",
  "timestamp": "2025-05-12T10:00:00.000Z",
  "path": "/api/v1/auth/me"
}
```

---

### 8.3 Samples — Placeholder Endpoints

```
GET /api/v1/samples
Headers: Authorization: Bearer <token>
Query params: ?page=1&limit=10&status=menunggu_pemeriksaan

Response 200:
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0
  }
}

─────────────────────────────────────────────

POST /api/v1/samples
Headers: Authorization: Bearer <token>
Body:
{
  "sampleType": "darah",
  "requestedTest": "Darah Lengkap",
  "department": "IGD",
  "priority": "rutin",
  "receivedAt": "2025-05-12T08:00:00.000Z",
  "notes": ""
}

Response 201:
{
  "data": {
    "id": "uuid",
    "sampleCode": "LAB-20250512-001",
    "status": "menunggu_pemeriksaan",
    "priority": "rutin",
    "createdAt": "2025-05-12T08:00:00.000Z"
  }
}

─────────────────────────────────────────────

GET /api/v1/samples/:id
Response 200 | 404

─────────────────────────────────────────────

PATCH /api/v1/samples/:id/status
Body:
{
  "status": "dalam_proses",
  "note": "Mulai diproses"
}
Response 200 | 400 | 403 | 404
```

### Standard Error Response (semua endpoint)

```json
{
  "statusCode": 400,
  "message": "Deskripsi error yang jelas",
  "error": "Bad Request",
  "timestamp": "2025-05-12T10:00:00.000Z",
  "path": "/api/v1/samples"
}
```

---

## 9. API Contract — AI Service (FastAPI)

**Base URL lokal:** `http://localhost:8000`  
**Prefix AI endpoints:** `/ai/v1/`

---

### 9.1 Health Check

```
GET /health

Response 200:
{
  "status": "ok",
  "service": "labcermat-ai-service",
  "version": "1.0.0",
  "timestamp": "2025-05-12T10:00:00.000Z",
  "mode": "placeholder"
}
```

---

### 9.2 Sample Prioritization (Placeholder)

```
POST /ai/v1/sample-prioritization
Content-Type: application/json

Body:
{
  "samples": [
    {
      "id": "uuid",
      "sampleType": "darah",
      "requestedTest": "Darah Lengkap",
      "priority": "rutin",
      "receivedAt": "2025-05-12T08:00:00.000Z",
      "status": "menunggu_pemeriksaan"
    }
  ]
}

Response 200:
{
  "ranked_samples": [
    {
      "id": "uuid",
      "rank": 1,
      "score": 0.0,
      "reason": "[PLACEHOLDER] Prioritization not yet implemented",
      "estimated_duration_minutes": null
    }
  ],
  "mode": "placeholder",
  "processed_at": "2025-05-12T10:00:00.000Z"
}
```

---

### 9.3 Result Review (Placeholder)

```
POST /ai/v1/result-review

Body:
{
  "sample_id": "uuid",
  "results": [
    {
      "parameter_name": "Hemoglobin",
      "value": 12.5,
      "unit": "g/dL",
      "reference_min": 12.0,
      "reference_max": 16.0
    }
  ]
}

Response 200:
{
  "sample_id": "uuid",
  "flag_status": "normal",
  "reason": "[PLACEHOLDER] Result review not yet implemented",
  "recommendation": null,
  "mode": "placeholder",
  "processed_at": "2025-05-12T10:00:00.000Z"
}

// flag_status: "normal" | "perlu_perhatian" | "perlu_review_supervisor"
```

---

### 9.4 QC Anomaly Detection (Placeholder)

```
POST /ai/v1/qc-anomaly

Body:
{
  "instrument_id": "uuid",
  "control_type": "level_1",
  "control_value": 5.2,
  "unit": "mg/dL",
  "lower_limit": 4.5,
  "upper_limit": 6.0,
  "history": []
}

Response 200:
{
  "status": "stabil",
  "reason": "[PLACEHOLDER] QC anomaly detection not yet implemented",
  "suggestion": null,
  "mode": "placeholder",
  "processed_at": "2025-05-12T10:00:00.000Z"
}

// status: "stabil" | "perlu_perhatian" | "potensi_drift"
```

---

### 9.5 Supervisor Summary (Placeholder)

```
POST /ai/v1/supervisor-summary

Body:
{
  "laboratory_id": "uuid",
  "shift_start": "2025-05-12T07:00:00.000Z",
  "shift_end": "2025-05-12T15:00:00.000Z"
}

Response 200:
{
  "summary": "[PLACEHOLDER] Supervisor summary not yet implemented",
  "stats": {},
  "focus_recommendations": [],
  "mode": "placeholder",
  "processed_at": "2025-05-12T10:00:00.000Z"
}
```

> Semua AI endpoint mengembalikan `"mode": "placeholder"` sebagai sinyal eksplisit bahwa AI logic belum aktif. Ini dipakai oleh backend dan frontend sebagai indikator.

---

## 10. Task Breakdown

### 10.1 Backend Tasks

| ID | Task | Estimasi | Prioritas |
|---|---|---|---|
| BE-01 | Inisialisasi NestJS project + TypeScript strict | 2 jam | P1 |
| BE-02 | Setup `ConfigModule` + env validation (Joi/Zod) | 1 jam | P1 |
| BE-03 | Setup Prisma + koneksi Supabase (`DATABASE_URL` + `DIRECT_URL`) | 2 jam | P1 |
| BE-04 | Buat `prisma.service.ts` sebagai singleton | 1 jam | P1 |
| BE-05 | Tulis Prisma schema (6 tabel) + jalankan `prisma migrate dev` | 3 jam | P1 |
| BE-06 | Buat `prisma/seed.ts` — seed roles + 1 laboratorium dummy | 1 jam | P1 |
| BE-07 | Set global prefix `/api/v1` di `main.ts` | 15 menit | P1 |
| BE-08 | Setup CORS untuk development | 30 menit | P1 |
| BE-09 | Buat `HealthModule` + `GET /api/v1/health` (cek DB) | 1 jam | P1 |
| BE-10 | Setup global `HttpExceptionFilter` (standard error response) | 1 jam | P2 |
| BE-11 | Buat `AuthModule` placeholder + `GET /api/v1/auth/me` | 2 jam | P2 |
| BE-12 | Buat `SamplesModule` placeholder + 4 endpoint | 3 jam | P2 |

**Total Estimasi Backend: ~17,75 jam**

---

### 10.2 Frontend Tasks

| ID | Task | Estimasi | Prioritas |
|---|---|---|---|
| FE-01 | Inisialisasi Vite + React + TypeScript | 1 jam | P1 |
| FE-02 | Setup Tailwind CSS | 1 jam | P1 |
| FE-03 | Setup shadcn/ui (init + Button, Card, Badge) | 1,5 jam | P1 |
| FE-04 | Setup TanStack Query + `query-client.ts` | 1 jam | P1 |
| FE-05 | Setup `api-client.ts` (base URL `/api/v1`, headers, interceptor) | 1,5 jam | P1 |
| FE-06 | Setup React Router — definisi routes dasar | 1 jam | P1 |
| FE-07 | Buat `AppShell.tsx` — layout sidebar + main area | 2 jam | P2 |
| FE-08 | Buat `LoginPage.tsx` — placeholder UI | 1 jam | P2 |
| FE-09 | Buat `DashboardPage.tsx` — placeholder UI | 1 jam | P2 |
| FE-10 | Buat `NotFoundPage.tsx` | 30 menit | P3 |
| FE-11 | Panggil `GET /api/v1/health` → tampilkan status koneksi | 1 jam | P2 |

**Total Estimasi Frontend: ~12,5 jam**

---

### 10.3 AI Service Tasks

| ID | Task | Estimasi | Prioritas |
|---|---|---|---|
| AI-01 | Inisialisasi FastAPI project structure | 1 jam | P1 |
| AI-02 | Setup Pydantic `BaseSettings` untuk config | 1 jam | P1 |
| AI-03 | Buat Pydantic models — semua request + response Sprint 1 | 3 jam | P1 |
| AI-04 | Buat `GET /health` endpoint | 30 menit | P1 |
| AI-05 | Buat placeholder: `POST /ai/v1/sample-prioritization` | 1 jam | P2 |
| AI-06 | Buat placeholder: `POST /ai/v1/result-review` | 1 jam | P2 |
| AI-07 | Buat placeholder: `POST /ai/v1/qc-anomaly` | 1 jam | P2 |
| AI-08 | Buat placeholder: `POST /ai/v1/supervisor-summary` | 1 jam | P2 |
| AI-09 | Setup logging dasar + error handling middleware | 1 jam | P2 |
| AI-10 | Buat `requirements.txt` versi terkunci + `Dockerfile` dasar | 1 jam | P2 |

**Total Estimasi AI Service: ~11,5 jam**

---

### 10.4 Database Tasks

| ID | Task | Estimasi | Prioritas |
|---|---|---|---|
| DB-01 | Buat Supabase project baru | 30 menit | P1 |
| DB-02 | Simpan `DATABASE_URL` (pooler) + `DIRECT_URL` (direct) di `.env` | 15 menit | P1 |
| DB-03 | Verifikasi `prisma migrate dev` berhasil di Supabase | 30 menit | P1 |
| DB-04 | Jalankan seed — verifikasi roles + lab tersedia | 30 menit | P1 |
| DB-05 | Verifikasi tabel via Supabase Table Editor / `prisma studio` | 15 menit | P1 |
| DB-06 | Dokumentasi schema di `docs/DATABASE_SCHEMA.md` | 1 jam | P2 |

**Total Estimasi Database: ~3 jam**

---

### 10.5 DevOps / Config Tasks

| ID | Task | Estimasi | Prioritas |
|---|---|---|---|
| OPS-01 | Setup monorepo `pnpm workspaces` + `pnpm-workspace.yaml` | 1,5 jam | P1 |
| OPS-02 | Buat `packages/config/tsconfig/base.json` | 30 menit | P1 |
| OPS-03 | Buat `.env.example` untuk root, frontend, backend, ai-service | 1 jam | P1 |
| OPS-04 | Buat root `.gitignore` (mencakup semua service + .env) | 30 menit | P1 |
| OPS-05 | Setup GitHub repo + branch `main` + `develop` + branch protection | 1 jam | P1 |
| OPS-06 | Buat `packages/shared-types` — types minimal | 1,5 jam | P2 |
| OPS-07 | Buat `README.md` root — instruksi setup lokal | 1 jam | P2 |
| OPS-08 | Buat `infra/github-actions/ci.yml` — lint + typecheck | 1,5 jam | P3 |
| OPS-09 | *(Opsional)* Setup Turborepo `turbo.json` | 2 jam | P3 — Opsional |

**Total Estimasi DevOps: ~9,5 jam (tanpa Turborepo)**

---

### Ringkasan Estimasi

| Area | Estimasi |
|---|---|
| Backend | ~17,75 jam |
| Frontend | ~12,5 jam |
| AI Service | ~11,5 jam |
| Database | ~3 jam |
| DevOps/Config | ~9,5 jam |
| **Total** | **~54,25 jam** |

> Untuk tim 3 orang selama 2 minggu sprint, ini target yang realistis. Fullstack mengerjakan BE + FE. AI Engineer mengerjakan AI Service + DB setup + shared-types.

---

## 11. Acceptance Criteria Sprint 1

Sprint 1 dianggap selesai jika **semua kriteria berikut terpenuhi dan dapat diverifikasi:**

### Monorepo & Config
- [ ] `pnpm install` dari root berhasil menginstall semua dependencies
- [ ] `.env.example` tersedia di root, `apps/frontend`, `apps/backend`, `apps/ai-service`
- [ ] Tidak ada secret atau credential di dalam file yang di-push ke repository

### Database
- [ ] Supabase project aktif dan connection string dapat digunakan
- [ ] `prisma migrate dev` berhasil tanpa error menggunakan `DIRECT_URL`
- [ ] 6 tabel tersedia: `roles`, `laboratories`, `users`, `samples`, `sample_status_logs`, `audit_logs`
- [ ] Seed data tersedia: 4 roles + 1 laboratorium dummy
- [ ] `prisma studio` atau Supabase Table Editor menampilkan tabel dengan benar

### Backend
- [ ] `GET /api/v1/health` mengembalikan `status: "ok"` dan `database: "connected"`
- [ ] `GET /api/v1/auth/me` mengembalikan response placeholder yang konsisten
- [ ] `GET /api/v1/samples` mengembalikan `{ data: [], meta: { total: 0, ... } }`
- [ ] Semua error response menggunakan format standar yang konsisten
- [ ] Tidak ada endpoint yang menggunakan prefix `/api` tanpa `/v1`

### Frontend
- [ ] Aplikasi React berjalan di `localhost:5173` tanpa error di console
- [ ] Navigasi ke `/` dan `/login` berfungsi tanpa error
- [ ] `AppShell.tsx` menampilkan layout dasar (sidebar + main area)
- [ ] `api-client.ts` dikonfigurasi dengan base URL `/api/v1`
- [ ] Frontend berhasil memanggil `GET /api/v1/health` dan menampilkan status

### AI Service
- [ ] FastAPI berjalan di `localhost:8000`
- [ ] `GET /health` mengembalikan `status: "ok"` dan `mode: "placeholder"`
- [ ] 4 placeholder AI endpoints menerima valid request dan mengembalikan response dengan `mode: "placeholder"`
- [ ] Pydantic menolak request tidak valid dengan response 422

### Shared Types
- [ ] `packages/shared-types` dapat di-import dari `apps/frontend` dan `apps/backend`
- [ ] 4 types tersedia dan terekspor: `UserRole`, `SampleStatus`, `SamplePriority`, `ApiResponse<T>`, `PaginatedResponse<T>`

---

## 12. Risks and Mitigation

| # | Risiko | Dampak | Probabilitas | Mitigasi |
|---|---|---|---|---|
| R-01 | Prisma + Supabase connection pooler bermasalah | Tinggi | Sedang | Gunakan `DATABASE_URL` dengan `?pgbouncer=true&connection_limit=1` untuk pooler, `DIRECT_URL` tanpa pooler untuk migrasi. Dokumentasikan perbedaan ini di `.env.example`. |
| R-02 | Tim belum familiar dengan pnpm workspaces | Sedang | Sedang | Buat `README.md` setup yang sangat detail dengan contoh perintah. Sesi hands-on 30 menit di hari pertama. |
| R-03 | API prefix tidak konsisten menyebabkan 404 | Sedang | Tinggi | Set `app.setGlobalPrefix('api/v1')` di `main.ts` sejak pertama kali. Verifikasi semua route di acceptance criteria. |
| R-04 | Enum Prisma dan enum shared-types tidak sinkron | Sedang | Sedang | `shared-types` adalah single source of truth untuk nilai string. Prisma enum menggunakan nilai yang sama persis. |
| R-05 | `.env` tidak terkonfigurasi → service crash tanpa pesan jelas | Tinggi | Sedang | Tambahkan validasi env di startup NestJS (`ConfigModule` + Joi). FastAPI gunakan Pydantic `BaseSettings`. Fail fast dengan pesan yang jelas. |
| R-06 | CORS error saat frontend memanggil backend | Rendah | Tinggi | Setup CORS di NestJS di `main.ts` sebelum frontend mulai development. |
| R-07 | Scope creep — mulai implement fitur Sprint 2+ | Tinggi | Sedang | Sprint 1 hanya boleh mengerjakan yang ada di section 2. Jika ada yang mau menambah fitur, masuk backlog Sprint 2. |

---

## 13. Definition of Done — Sprint 1

Sprint 1 dianggap **Done** jika:

1. Semua **acceptance criteria** di section 11 terpenuhi dan dapat didemonstrasikan
2. Tidak ada service yang crash saat dijalankan dengan `.env` yang benar
3. `prisma migrate dev` dapat dijalankan ulang dari database kosong tanpa error
4. Semua environment variable terdokumentasi di `.env.example` masing-masing service
5. `README.md` root berisi instruksi setup lokal yang dapat diikuti anggota tim baru
6. Tidak ada hardcoded secret di dalam kode yang masuk ke repository
7. Branch `develop` merefleksikan state akhir Sprint 1 yang stabil
8. Sprint review dilakukan dan hasilnya didokumentasikan

---

## 14. Urutan Implementasi yang Paling Aman

```
HARI 1–2 │ FONDASI MONOREPO & CONFIG
──────────────────────────────────────────────────
[OPS-01] Setup pnpm workspaces + pnpm-workspace.yaml
[OPS-05] Buat GitHub repo + branch main + develop
[OPS-04] Buat root .gitignore
[OPS-02] Buat packages/config/tsconfig/base.json
[OPS-03] Buat .env.example semua service
[DB-01]  Buat Supabase project, simpan credentials di .env lokal
         ✓ Checkpoint: pnpm install dari root berhasil

HARI 3–4 │ DATABASE & SCHEMA
──────────────────────────────────────────────────
[BE-01]  Init NestJS project
[BE-02]  Setup ConfigModule + env validation
[BE-03]  Setup Prisma + DATABASE_URL + DIRECT_URL
[BE-04]  Buat prisma.service.ts
[BE-05]  Tulis Prisma schema 6 tabel → prisma migrate dev
[DB-03]  Verifikasi migrasi di Supabase
[BE-06]  Buat seed.ts → jalankan prisma db seed
[DB-05]  Verifikasi tabel via Supabase Table Editor
         ✓ Checkpoint: database tersambung, 6 tabel tersedia, seed berhasil

HARI 5–6 │ BACKEND HEALTH & SKELETON
──────────────────────────────────────────────────
[BE-07]  Set global prefix /api/v1 di main.ts
[BE-08]  Setup CORS
[BE-09]  Buat HealthModule + GET /api/v1/health (cek DB aktif)
[BE-10]  Setup global HttpExceptionFilter
         ✓ Checkpoint: curl GET /api/v1/health mengembalikan status ok

HARI 7–8 │ AI SERVICE SKELETON
──────────────────────────────────────────────────
[AI-01]  Init FastAPI project
[AI-02]  Setup Pydantic BaseSettings
[AI-03]  Buat semua Pydantic models
[AI-04]  Buat GET /health
         ✓ Checkpoint: curl GET /health AI service mengembalikan status ok

HARI 9–10 │ PLACEHOLDER ENDPOINTS & SHARED TYPES
──────────────────────────────────────────────────
[OPS-06] Buat packages/shared-types — 4 types minimal
[BE-11]  Buat AuthModule placeholder + GET /api/v1/auth/me
[BE-12]  Buat SamplesModule placeholder + 4 endpoint
[AI-05 ~ AI-08] 4 placeholder AI endpoints
         ✓ Checkpoint: semua placeholder endpoint merespons dengan benar

HARI 11–12 │ FRONTEND SCAFFOLD & INTEGRASI
──────────────────────────────────────────────────
[FE-01]  Init Vite + React + TypeScript
[FE-02]  Setup Tailwind
[FE-03]  Setup shadcn/ui
[FE-04]  Setup TanStack Query
[FE-05]  Setup api-client.ts (base URL /api/v1)
[FE-06]  Setup React Router
[FE-07]  Buat AppShell.tsx
[FE-08]  Buat LoginPage.tsx placeholder
[FE-09]  Buat DashboardPage.tsx placeholder
[FE-11]  Panggil GET /api/v1/health dari frontend
         ✓ Checkpoint: frontend berjalan, terhubung ke backend

HARI 13–14 │ DOKUMENTASI, CI, REVIEW
──────────────────────────────────────────────────
[AI-09]  Setup logging AI service
[AI-10]  requirements.txt + Dockerfile
[OPS-07] README.md root — instruksi setup lokal
[DB-06]  docs/DATABASE_SCHEMA.md
[OPS-08] GitHub Actions ci.yml (P3 — jika waktu cukup)
         Verifikasi semua acceptance criteria
         Sprint review & retrospective
```

---

## 15. Claude VS Code Execution Rules

> Section ini wajib dibaca dan diikuti oleh Claude VS Code sebelum mulai mengeksekusi Sprint 1.

### 15.1 Baca Dulu, Baru Eksekusi

Sebelum membuat atau mengubah file apapun, Claude VS Code **wajib**:

1. Membaca dokumen Sprint 1 Implementation Plan ini secara penuh
2. Membaca `PRD_LabCermat_Production.md` sebagai konteks domain
3. Memahami scope Sprint 1 — apa yang boleh dan tidak boleh dikerjakan

### 15.2 Tampilkan Rencana Sebelum Bertindak

Sebelum mulai mengimplementasikan satu area (misalnya Backend atau Database), Claude VS Code **harus menampilkan terlebih dahulu** daftar file dan folder yang akan dibuat atau diubah, lalu menunggu konfirmasi. Contoh:

```
Saya akan membuat file-file berikut untuk Backend skeleton:
- apps/backend/src/app.module.ts
- apps/backend/src/main.ts
- apps/backend/src/config/configuration.ts
- apps/backend/src/modules/health/health.controller.ts
- apps/backend/src/modules/health/health.module.ts
- apps/backend/prisma/schema.prisma

Lanjutkan?
```

### 15.3 Implementasi Bertahap

Claude VS Code **tidak boleh** mengimplementasikan semua area sekaligus dalam satu langkah. Ikuti urutan di section 14:

- Selesaikan satu checkpoint dulu
- Verifikasi hasilnya
- Baru lanjut ke checkpoint berikutnya

### 15.4 Jalankan Build/Typecheck Setelah Setiap Area

Setelah setiap area selesai, jalankan:

```bash
# Backend
cd apps/backend && npx tsc --noEmit

# Frontend
cd apps/frontend && npx tsc --noEmit

# Shared types
cd packages/shared-types && npx tsc --noEmit
```

Jika typecheck gagal, perbaiki sebelum lanjut ke area berikutnya.

### 15.5 Jangan Simpan Secret ke Repository

- Semua nilai sensitif (database URL, API key, JWT secret) hanya boleh ada di file `.env` lokal
- File `.env` **wajib** ada di `.gitignore`
- Hanya file `.env.example` berisi placeholder yang boleh di-commit

### 15.6 Jangan Keluar dari Scope Sprint 1

Claude VS Code tidak boleh mengerjakan item yang ada di **Out of Scope** section 2, meskipun secara teknis memungkinkan. Jika ada kebutuhan yang belum tercakup, catat sebagai catatan untuk Sprint 2 — jangan langsung dikerjakan.

### 15.7 Naming Convention Branch

```
feat/BE-01-nestjs-init
feat/FE-01-vite-setup
feat/AI-01-fastapi-init
feat/DB-01-supabase-setup
feat/OPS-01-monorepo-setup
```

---

## Catatan Tim

**Fullstack Developer:** Prioritaskan health check yang benar-benar cek koneksi DB (bukan hanya response statik). Global prefix `/api/v1` harus diset di `main.ts` sebelum membuat controller apapun.

**AI Engineer:** Pydantic models di Sprint 1 adalah kontrak antara backend dan AI service untuk Sprint 6+. Buat dengan teliti. Nilai `"mode": "placeholder"` di setiap response adalah sinyal penting bagi sistem bahwa AI belum aktif.

**Semua Tim:** `packages/shared-types` adalah single source of truth untuk enum dan types yang dipakai bersama. Jangan duplikasi definisi yang sama di backend atau frontend.

---

*LabCermat — Sprint 1 Implementation Plan v2.0*  
*Revisi: 12 Mei 2025 | Siap dieksekusi di Claude VS Code*
