# LabCermat — Database Schema

**Versi:** 5.0 — Sprint 5  
**Provider:** Supabase PostgreSQL  
**ORM:** Prisma v5

---

## Daftar Isi

- [Ringkasan Tabel](#ringkasan-tabel)
- [Enum](#enum)
- [Tabel Detail](#tabel-detail)
  - [roles](#roles)
  - [laboratories](#laboratories)
  - [users](#users)
  - [samples](#samples)
  - [sample_status_logs](#sample_status_logs)
  - [audit_logs](#audit_logs)
- [Relasi Antar Tabel](#relasi-antar-tabel)
- [Aturan Penting](#aturan-penting)
- [Koneksi Database](#koneksi-database)

---

## Ringkasan Tabel

| Tabel | Keterangan | Sprint |
|---|---|---|
| `roles` | Daftar role pengguna | 1 |
| `laboratories` | Data laboratorium | 1 |
| `users` | Akun pengguna (sync dari Supabase Auth Sprint 2) | 1 |
| `samples` | Sampel pemeriksaan laboratorium | 1 |
| `sample_status_logs` | Log perubahan status sampel (append-only) | 1 |
| `audit_logs` | Log aktivitas sistem (append-only) | 1 |
| `sample_results` | Hasil pemeriksaan per parameter per sampel | 4 |
| `qc_instruments` | Master alat QC per laboratorium | 5 |
| `qc_records` | Catatan QC harian per alat (append-only) | 5 |

**Total tabel Sprint 5: 9**

---

## Enum

Enum didefinisikan di Prisma schema dan nilai string-nya **identik** dengan `@labcermat/shared-types`.

### QcStatus

```prisma
enum QcStatus {
  stabil
  perlu_perhatian
}
```

| Nilai | Keterangan |
|---|---|
| `stabil` | Nilai kontrol dalam batas `lowerLimit ≤ value ≤ upperLimit` |
| `perlu_perhatian` | Nilai kontrol di luar batas kontrol |

### UserRole

```prisma
enum UserRole {
  analis
  supervisor
  admin
  auditor
}
```

| Nilai | Keterangan |
|---|---|
| `analis` | Analis laboratorium — input hasil |
| `supervisor` | Supervisor — review dan validasi |
| `admin` | Admin laboratorium — manajemen user |
| `auditor` | Auditor — akses read-only audit log |

### SampleStatus

```prisma
enum SampleStatus {
  menunggu_pemeriksaan
  dalam_proses
  menunggu_review
  tervalidasi
  minta_cek_ulang
  dibatalkan
}
```

| Nilai | Keterangan |
|---|---|
| `menunggu_pemeriksaan` | Sampel baru didaftarkan, belum diproses |
| `dalam_proses` | Analis sedang mengerjakan |
| `menunggu_review` | Selesai, menunggu validasi supervisor |
| `tervalidasi` | Sudah divalidasi supervisor |
| `minta_cek_ulang` | Supervisor minta diperiksa ulang |
| `dibatalkan` | Sampel dibatalkan |

### SamplePriority

```prisma
enum SamplePriority {
  rutin
  urgent
  cito
}
```

| Nilai | Keterangan |
|---|---|
| `rutin` | Pemeriksaan standar |
| `urgent` | Perlu penanganan lebih cepat |
| `cito` | Prioritas tertinggi, darurat |

### Gender

```prisma
enum Gender {
  L
  P
}
```

---

## Tabel Detail

### `roles`

Daftar role yang tersedia dalam sistem. Diisi via seed — tidak berubah di runtime.

| Kolom | Tipe DB | Prisma Type | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `uuid` | `String` | PK, `@db.Uuid` | UUID auto-generated |
| `name` | `user_role` (enum) | `UserRole` | `UNIQUE NOT NULL` | Nilai role |
| `description` | `text` | `String?` | NULLABLE | Deskripsi role |
| `created_at` | `timestamptz` | `DateTime` | `DEFAULT now()` | Waktu dibuat |

**Index:** `UNIQUE(name)`

**Seed data:**

| id | name | description |
|---|---|---|
| *(uuid)* | `analis` | Analis laboratorium |
| *(uuid)* | `supervisor` | Supervisor laboratorium |
| *(uuid)* | `admin` | Admin laboratorium |
| *(uuid)* | `auditor` | Auditor (read-only) |

---

### `laboratories`

Data laboratorium klinik yang terdaftar.

| Kolom | Tipe DB | Prisma Type | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `uuid` | `String` | PK, `@db.Uuid` | UUID auto-generated |
| `name` | `text` | `String` | `NOT NULL` | Nama laboratorium |
| `address` | `text` | `String?` | NULLABLE | Alamat |
| `phone` | `text` | `String?` | NULLABLE | Nomor telepon |
| `is_active` | `boolean` | `Boolean` | `DEFAULT true` | Status aktif |
| `created_at` | `timestamptz` | `DateTime` | `DEFAULT now()` | Waktu dibuat |
| `updated_at` | `timestamptz` | `DateTime` | `@updatedAt` | Waktu update terakhir |

**Seed data:**

| id | name |
|---|---|
| `00000000-0000-0000-0000-000000000001` | Lab Klinik Utama |

---

### `users`

Akun pengguna sistem. Sprint 2 akan sync dari Supabase Auth.

| Kolom | Tipe DB | Prisma Type | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `uuid` | `String` | PK, `@db.Uuid` | UUID — akan match Supabase Auth UUID (Sprint 2) |
| `email` | `text` | `String` | `UNIQUE NOT NULL` | Email pengguna |
| `full_name` | `text` | `String` | `NOT NULL` | Nama lengkap |
| `role_id` | `uuid` | `String` | `FK → roles.id, @db.Uuid` | Role pengguna |
| `laboratory_id` | `uuid` | `String` | `FK → laboratories.id, @db.Uuid` | Lab tempat bertugas |
| `is_active` | `boolean` | `Boolean` | `DEFAULT true` | Status aktif akun |
| `created_at` | `timestamptz` | `DateTime` | `DEFAULT now()` | Waktu dibuat |
| `updated_at` | `timestamptz` | `DateTime` | `@updatedAt` | Waktu update terakhir |

**Index:** `UNIQUE(email)`

**Relasi:**
- `role_id` → `roles.id` (N:1)
- `laboratory_id` → `laboratories.id` (N:1)

---

### `samples`

Sampel pemeriksaan yang didaftarkan.

| Kolom | Tipe DB | Prisma Type | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `uuid` | `String` | PK, `@db.Uuid` | UUID auto-generated |
| `sample_code` | `varchar(50)` | `String` | `UNIQUE NOT NULL` | Kode unik: `LAB-YYYYMMDD-XXXX` |
| `sample_type` | `varchar(100)` | `String` | `NOT NULL` | Jenis sampel (contoh: Darah Vena) |
| `requested_test` | `varchar(255)` | `String` | `NOT NULL` | Jenis pemeriksaan yang diminta |
| `department` | `varchar(100)` | `String?` | NULLABLE | Departemen pengirim |
| `priority` | `sample_priority` (enum) | `SamplePriority` | `DEFAULT rutin` | Prioritas |
| `status` | `sample_status` (enum) | `SampleStatus` | `DEFAULT menunggu_pemeriksaan` | Status saat ini |
| `laboratory_id` | `uuid` | `String` | `FK → laboratories.id, @db.Uuid` | Lab pemilik sampel |
| `created_by` | `uuid` | `String` | `FK → users.id, @db.Uuid` | Analis yang mendaftarkan |
| `notes` | `text` | `String?` | NULLABLE | Catatan tambahan |
| `received_at` | `timestamptz` | `DateTime` | `NOT NULL` | Waktu sampel diterima |
| `created_at` | `timestamptz` | `DateTime` | `DEFAULT now()` | Waktu dibuat |
| `updated_at` | `timestamptz` | `DateTime` | `@updatedAt` | Waktu update terakhir (dipakai untuk `tervalidasiHariIni`) |

**Index:** `UNIQUE(sample_code)`

**Format `sample_code`:** `LAB-{YYYYMMDD}-{4 digit sequence zero-padded}`  
Contoh: `LAB-20260512-0001`, `LAB-20260512-0042`

**Relasi:**
- `laboratory_id` → `laboratories.id` (N:1)
- `created_by` → `users.id` (N:1)
- `results` → `sample_results[]` (1:N)

---

### `sample_status_logs`

Log setiap perubahan status sampel. **Append-only — tidak ada UPDATE atau DELETE.**

| Kolom | Tipe DB | Prisma Type | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `uuid` | `String` | PK, `@db.Uuid` | UUID auto-generated |
| `sample_id` | `uuid` | `String` | `FK → samples.id, @db.Uuid` | Sampel yang berubah |
| `from_status` | `sample_status` (enum) | `SampleStatus?` | NULLABLE | Status sebelum (null = pendaftaran pertama) |
| `to_status` | `sample_status` (enum) | `SampleStatus` | `NOT NULL` | Status sesudah |
| `changed_by_id` | `uuid` | `String` | `FK → users.id, @db.Uuid` | User yang mengubah |
| `notes` | `text` | `String?` | NULLABLE | Catatan perubahan |
| `created_at` | `timestamptz` | `DateTime` | `DEFAULT now()` | Waktu perubahan |

**Tidak ada `updated_at`** — baris tidak pernah diupdate.

**Relasi:**
- `sample_id` → `samples.id` (N:1)
- `changed_by_id` → `users.id` (N:1)

---

### `audit_logs`

Log aktivitas sistem untuk keperluan audit. **Append-only — tidak ada UPDATE atau DELETE.**

| Kolom | Tipe DB | Prisma Type | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `uuid` | `String` | PK, `@db.Uuid` | UUID auto-generated |
| `user_id` | `uuid` | `String?` | `FK → users.id NULLABLE, @db.Uuid` | User pelaku (null = sistem) |
| `action` | `text` | `String` | `NOT NULL` | Nama aksi (e.g. `sample.create`) |
| `entity` | `text` | `String` | `NOT NULL` | Nama entitas (e.g. `samples`) |
| `entity_id` | `uuid` | `String?` | NULLABLE, `@db.Uuid` | ID entitas yang terpengaruh |
| `metadata` | `jsonb` | `Json?` | NULLABLE | Data tambahan (payload, diff, dll) |
| `ip_address` | `text` | `String?` | NULLABLE | IP address request |
| `created_at` | `timestamptz` | `DateTime` | `DEFAULT now()` | Waktu kejadian |

**Tidak ada `updated_at`** — baris tidak pernah diupdate.

**Konvensi `action`:** `{entity}.{verb}`  
Contoh: `sample.create`, `sample.status_change`, `user.login`

**Relasi:**
- `user_id` → `users.id` (N:1, nullable)

---

---

### `sample_results`

Hasil pemeriksaan per parameter untuk satu sampel. Satu sampel dapat memiliki banyak baris (satu per parameter). Nilai disimpan sebagai string untuk mendukung nilai non-numerik (contoh: "Positif", ">200", "1:320").

| Kolom | Tipe DB | Prisma Type | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `uuid` | `String` | PK, `@db.Uuid` | UUID auto-generated |
| `sample_id` | `uuid` | `String` | `FK → samples.id, @db.Uuid` | Sampel pemilik hasil |
| `parameter_name` | `varchar(255)` | `String` | `NOT NULL` | Nama parameter (contoh: Hemoglobin) |
| `value` | `varchar(100)` | `String` | `NOT NULL` | Nilai hasil (string) |
| `unit` | `varchar(50)` | `String?` | NULLABLE | Satuan (contoh: g/dL) |
| `reference_min` | `varchar(50)` | `String?` | NULLABLE | Batas bawah nilai rujukan |
| `reference_max` | `varchar(50)` | `String?` | NULLABLE | Batas atas nilai rujukan |
| `note` | `text` | `String?` | NULLABLE | Catatan observasi |
| `input_by` | `uuid` | `String` | `FK → users.id, @db.Uuid` | Analis yang menginput |
| `created_at` | `timestamptz` | `DateTime` | `DEFAULT now()` | Waktu input |
| `updated_at` | `timestamptz` | `DateTime` | `@updatedAt` | Waktu update |

**Relasi:**
- `sample_id` → `samples.id` (N:1)
- `input_by` → `users.id` (N:1, named relation `"ResultInputBy"`)

**Kenapa `value` sebagai string?** Nilai lab tidak selalu numerik: "Positif", "Negatif", ">200", "1:320". Flagging dan validasi rentang rujukan dilakukan di layer aplikasi (Sprint 6+).

---

### `qc_instruments`

Master alat QC per laboratorium. Diisi via seed/admin — tidak diubah oleh analis.

| Kolom | Tipe DB | Prisma Type | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `uuid` | `String` | PK, `@db.Uuid` | UUID auto-generated |
| `laboratory_id` | `uuid` | `String` | `FK → laboratories.id` | Lab pemilik alat |
| `name` | `varchar(255)` | `String` | `NOT NULL` | Nama alat |
| `serial_number` | `varchar(100)` | `String?` | NULLABLE | Nomor seri alat |
| `department` | `varchar(100)` | `String?` | NULLABLE | Departemen pengguna alat |
| `is_active` | `boolean` | `Boolean` | `DEFAULT true` | Alat aktif/tidak aktif |
| `created_at` | `timestamptz` | `DateTime` | `DEFAULT now()` | Waktu dibuat |
| `updated_at` | `timestamptz` | `DateTime` | `@updatedAt` | Waktu update terakhir |

**Seed data:**

| id | name | serialNumber | department |
|---|---|---|---|
| `00000000-0000-0000-0000-000000000010` | Hematology Analyzer XN-1000 | XN-001 | Hematologi |

---

### `qc_records`

Catatan QC harian per alat. **Append-only — tidak ada UPDATE atau DELETE.**

| Kolom | Tipe DB | Prisma Type | Constraint | Keterangan |
|---|---|---|---|---|
| `id` | `uuid` | `String` | PK, `@db.Uuid` | UUID auto-generated |
| `instrument_id` | `uuid` | `String` | `FK → qc_instruments.id` | Alat yang diukur |
| `laboratory_id` | `uuid` | `String` | `FK → laboratories.id` | Lab pemilik |
| `control_type` | `varchar(100)` | `String` | `NOT NULL` | Tipe kontrol (Level 1, Level 2, dll.) |
| `control_value` | `decimal(10,4)` | `Decimal` | `NOT NULL` | Nilai kontrol yang diukur |
| `unit` | `varchar(50)` | `String?` | NULLABLE | Satuan (g/dL, IU/L, dll.) |
| `lower_limit` | `decimal(10,4)` | `Decimal` | `NOT NULL` | Batas bawah kontrol |
| `upper_limit` | `decimal(10,4)` | `Decimal` | `NOT NULL` | Batas atas kontrol |
| `status` | `QcStatus` (enum) | `QcStatus` | `NOT NULL` | `stabil` atau `perlu_perhatian` — dihitung backend |
| `recorded_by` | `uuid` | `String` | `FK → users.id` | Analis yang mencatat |
| `notes` | `text` | `String?` | NULLABLE | Catatan tambahan |
| `recorded_at` | `timestamptz` | `DateTime` | `NOT NULL` | Waktu pencatatan QC (bisa backfill) |
| `created_at` | `timestamptz` | `DateTime` | `DEFAULT now()` | Waktu row dibuat |

**Tidak ada `updated_at`** — baris tidak pernah diupdate.

**Cara hitung status:**
- `lower_limit ≤ control_value ≤ upper_limit` → `stabil`
- Selainnya → `perlu_perhatian`
- Perbandingan menggunakan `Prisma.Decimal` methods (`.gte()`, `.lte()`) untuk presisi aman.

---

## Relasi Antar Tabel

```
laboratories ──< users >──────── roles
     │               │
     └──────────< samples
                     │
        ┌────────────┼──────────────┐
        │            │              │
sample_status_logs  audit_logs  sample_results
(via sample_id)  (via entity_id) (via sample_id)
```

**Ringkasan FK:**

| Tabel | FK Column | References |
|---|---|---|
| `users` | `role_id` | `roles.id` |
| `users` | `laboratory_id` | `laboratories.id` |
| `samples` | `laboratory_id` | `laboratories.id` |
| `samples` | `created_by` | `users.id` |
| `sample_status_logs` | `sample_id` | `samples.id` |
| `sample_status_logs` | `changed_by` | `users.id` |
| `audit_logs` | `user_id` | `users.id` (nullable) |
| `sample_results` | `sample_id` | `samples.id` |
| `sample_results` | `input_by` | `users.id` |

---

## Aturan Penting

1. **Semua PK dan FK menggunakan tipe UUID** dengan anotasi `@db.Uuid` di Prisma schema.
2. **`sample_status_logs` dan `audit_logs` adalah append-only** — tidak pernah ada operasi UPDATE atau DELETE pada tabel ini.
3. **Nilai enum Prisma harus identik dengan `@labcermat/shared-types`** — jangan duplikasi atau beda kapitalisasi.
4. **RLS (Row Level Security) tidak aktif** di Sprint 1 — backend menggunakan service role key yang melewati RLS.
5. **Cascade delete tidak dikonfigurasi** — relasi menggunakan default `RESTRICT` (tidak bisa hapus parent jika ada child).

---

## Koneksi Database

Dua URL diperlukan di `apps/backend/.env`:

```
# Prisma Client runtime — melalui connection pooler Supabase (pgBouncer)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-...:6543/postgres?pgbouncer=true

# prisma migrate dev — koneksi langsung, tidak melalui pooler
DIRECT_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

**Mengapa dua URL?**
- PgBouncer (pooler) tidak mendukung `SET` statement yang dipakai Prisma saat migrasi
- Prisma Client runtime menggunakan pooler agar efisien (Sprint 1 pakai `connection_limit=1` karena serverless-style)
- `prisma migrate dev` **harus** koneksi langsung ke port 5432

**Perintah database:**

```powershell
cd apps/backend

# Jalankan migrasi
npx prisma migrate dev --name init

# Seed data awal
npx prisma db seed

# Buka Prisma Studio
npx prisma studio

# Generate ulang Prisma Client (setelah schema berubah)
npx prisma generate
```

> **Windows — Drive C penuh:** Set TEMP sebelum perintah Prisma:
> ```powershell
> $env:TEMP = "D:\temp-labcermat"
> $env:TMP  = "D:\temp-labcermat"
> ```
