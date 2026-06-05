# LabCermat — API Specification

**Versi:** 8.1 — Sprint 8 Langkah 6  
**Status:** Azure ML Artifact Inference aktif (QC Anomaly)

---

## Daftar Isi

- [Konvensi Umum](#konvensi-umum)
- [Backend API — localhost:3001](#backend-api--localhost3001)
  - [Health](#health)
  - [Auth](#auth)
  - [Samples](#samples)
  - [Results](#results)
  - [Dashboard](#dashboard)
  - [QC Instruments](#qc-instruments)
  - [QC Records](#qc-records)
  - [Audit Logs](#audit-logs)
- [AI Service — localhost:8000](#ai-service--localhost8000)
  - [Health](#health-1)
  - [AI Endpoints (Rule-Based)](#ai-endpoints-rule-based)
- [Backend API — AI Gateway](#backend-api--ai-gateway)
- [Error Response Format](#error-response-format)

---

## Konvensi Umum

### Base URL

| Service | Development |
|---|---|
| Backend API | `http://localhost:3001/api/v1` |
| AI Service | `http://localhost:8000` |

### Headers

```
Content-Type: application/json
Authorization: Bearer <token>   # Wajib untuk endpoint yang dijaga (Sprint 2)
```

Sprint 1 menggunakan **placeholder auth guard** — hanya memeriksa keberadaan header `Authorization: Bearer`, tanpa validasi JWT.

### Format Response Sukses

```json
{
  "data": { ... },
  "message": "optional string"
}
```

### Format Response Paginasi

```json
{
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Format Error

Lihat [Error Response Format](#error-response-format) di bawah.

---

## Backend API — localhost:3001

Semua endpoint Backend menggunakan prefix `/api/v1`.

---

### Health

#### `GET /api/v1/health`

Cek status layanan backend dan koneksi database.

**Auth:** Tidak diperlukan  
**Guard:** Tidak ada

**Response 200:**

```json
{
  "status": "ok",
  "service": "labcermat-backend",
  "version": "1.0.0",
  "timestamp": "2026-05-12T06:00:00.000Z",
  "database": "connected"
}
```

**Response 200 (database error):**

```json
{
  "status": "ok",
  "service": "labcermat-backend",
  "version": "1.0.0",
  "timestamp": "2026-05-12T06:00:00.000Z",
  "database": "disconnected"
}
```

> Health endpoint selalu mengembalikan HTTP 200. Status database ada di field `database`.

---

### Auth

#### `POST /api/v1/auth/sync-user`

Sinkronisasi Supabase Auth user ke `public.users`. Idempotent — aman dipanggil berulang.

**Auth:** Bearer JWT (AuthGuard)

**Response 200:** data user yang tersinkron (id, email, fullName, role, laboratory)

---

#### `GET /api/v1/auth/me`

Mengembalikan data user yang sedang login dari `public.users`.

**Auth:** Bearer JWT (AuthGuard)

**Response 200:**

```json
{
  "data": {
    "id": "uuid",
    "authUserId": "uuid",
    "email": "analis@labcermat.demo",
    "fullName": "Rina Analis",
    "status": "active",
    "role": { "id": "uuid", "name": "analis", "description": "..." },
    "laboratory": { "id": "uuid", "name": "Lab Klinik Utama" },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### Samples

#### `GET /api/v1/samples`

Daftar sampel dengan paginasi. Hasil difilter otomatis per `laboratoryId` user yang login.

**Auth:** Bearer JWT (AuthGuard) — analis dan supervisor

**Query Parameters:**

| Parameter | Tipe | Default | Keterangan |
|---|---|---|---|
| `page` | number | 1 | Nomor halaman (min: 1) |
| `limit` | number | 20 | Jumlah item per halaman (min: 1, max: 100) |
| `status` | string | — | Filter berdasarkan status sampel |
| `priority` | string | — | Filter berdasarkan prioritas |

**Nilai `status` yang valid:**
- `menunggu_pemeriksaan`
- `dalam_proses`
- `menunggu_review`
- `tervalidasi`
- `minta_cek_ulang`
- `dibatalkan`

**Nilai `priority` yang valid:**
- `rutin`
- `urgent`
- `cito`

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid-string",
      "sampleCode": "LAB-20260512-0001",
      "sampleType": "Darah Vena",
      "requestedTest": "Hematologi Lengkap",
      "department": "Penyakit Dalam",
      "priority": "rutin",
      "status": "menunggu_pemeriksaan",
      "notes": null,
      "receivedAt": "2026-05-12T06:00:00.000Z",
      "createdAt": "2026-05-12T06:00:00.000Z",
      "updatedAt": "2026-05-12T06:00:00.000Z",
      "creator": { "id": "uuid-string", "fullName": "Rina Analis" }
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

#### `POST /api/v1/samples`

Mendaftarkan sampel baru. `sampleCode` digenerate otomatis format `LAB-YYYYMMDD-XXXX`. `laboratoryId` diambil dari data user yang login — tidak perlu disertakan di request body. Membuat `SampleStatusLog` (null → menunggu_pemeriksaan) dan `AuditLog` (action: `sample.create`) dalam satu Prisma transaction.

**Auth:** Bearer JWT (AuthGuard) — **hanya role analis** (supervisor → 403)

**Request Body:**

```json
{
  "sampleType": "Darah Vena",
  "requestedTest": "Hematologi Lengkap",
  "department": "Penyakit Dalam",
  "priority": "rutin",
  "notes": "Opsional — catatan tambahan"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `sampleType` | string | Ya | Jenis sampel (maks 100 karakter) |
| `requestedTest` | string | Ya | Jenis pemeriksaan yang diminta (maks 255 karakter) |
| `department` | string | Tidak | Departemen pengirim (maks 100 karakter) |
| `priority` | `"rutin"` \| `"urgent"` \| `"cito"` | Tidak | Default: `rutin` |
| `notes` | string | Tidak | Catatan tambahan |

**Response 201:**

```json
{
  "data": {
    "id": "uuid-baru",
    "sampleCode": "LAB-20260512-0001",
    "sampleType": "Darah Vena",
    "requestedTest": "Hematologi Lengkap",
    "department": "Penyakit Dalam",
    "priority": "rutin",
    "status": "menunggu_pemeriksaan",
    "notes": null,
    "receivedAt": "2026-05-12T06:00:00.000Z",
    "createdAt": "2026-05-12T06:00:00.000Z",
    "updatedAt": "2026-05-12T06:00:00.000Z"
  },
  "message": "Sampel berhasil didaftarkan"
}
```

**Response 400 (validasi gagal):**

```json
{
  "statusCode": 400,
  "message": ["sampleType should not be empty", "requestedTest should not be empty"],
  "error": "Bad Request",
  "timestamp": "2026-05-12T06:00:00.000Z",
  "path": "/api/v1/samples"
}
```

---

#### `GET /api/v1/samples/:id`

Detail satu sampel. Include `statusLogs` (timeline), `creator`, dan `laboratory`.

**Auth:** Bearer JWT (AuthGuard) — analis dan supervisor

**Path Parameters:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `id` | UUID string | ID sampel |

**Response 200:**

```json
{
  "data": {
    "id": "uuid-string",
    "sampleCode": "LAB-20260512-0001",
    "sampleType": "Darah Vena",
    "requestedTest": "Hematologi Lengkap",
    "department": "Penyakit Dalam",
    "priority": "rutin",
    "status": "dalam_proses",
    "notes": null,
    "receivedAt": "2026-05-12T06:00:00.000Z",
    "createdAt": "2026-05-12T06:00:00.000Z",
    "updatedAt": "2026-05-12T06:30:00.000Z",
    "laboratory": { "id": "uuid-string", "name": "Lab Klinik Utama" },
    "creator": { "id": "uuid-string", "fullName": "Rina Analis" },
    "statusLogs": [
      {
        "id": "uuid-string",
        "previousStatus": null,
        "newStatus": "menunggu_pemeriksaan",
        "note": "Sampel didaftarkan",
        "createdAt": "2026-05-12T06:00:00.000Z",
        "changedByUser": { "fullName": "Rina Analis" }
      },
      {
        "id": "uuid-string",
        "previousStatus": "menunggu_pemeriksaan",
        "newStatus": "dalam_proses",
        "note": null,
        "createdAt": "2026-05-12T06:30:00.000Z",
        "changedByUser": { "fullName": "Rina Analis" }
      }
    ]
  }
}
```

**Response 404:**

```json
{
  "statusCode": 404,
  "message": "Sampel tidak ditemukan",
  "error": "Not Found",
  "timestamp": "2026-05-12T06:00:00.000Z",
  "path": "/api/v1/samples/uuid-string"
}
```

---

#### `PATCH /api/v1/samples/:id/status`

Update status sampel dengan state machine enforcement. Membuat `SampleStatusLog` dan `AuditLog` dalam satu Prisma transaction.

**Auth:** Bearer JWT (AuthGuard) — analis dan supervisor (role enforcement di service layer)

**Path Parameters:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `id` | UUID string | ID sampel |

**Request Body:**

```json
{
  "status": "dalam_proses",
  "note": "Opsional untuk analis; wajib untuk minta_cek_ulang dan dibatalkan"
}
```

**Transisi yang diizinkan per role:**

| From | To | Role | Note | Audit Action |
|---|---|---|---|---|
| `menunggu_pemeriksaan` | `dalam_proses` | analis | opsional | `sample.status_change` |
| `dalam_proses` | `menunggu_review` | analis | opsional | `sample.status_change` |
| `minta_cek_ulang` | `dalam_proses` | analis | opsional | `sample.status_change` |
| `menunggu_review` | `tervalidasi` | supervisor | opsional | `supervisor.validate` |
| `menunggu_review` | `minta_cek_ulang` | supervisor | **wajib** | `supervisor.request_recheck` |
| non-terminal | `dibatalkan` | supervisor | **wajib** | `supervisor.cancel` |

**Rules:**
- Status terminal (`tervalidasi`, `dibatalkan`) tidak dapat diubah siapapun → **400**
- Analis mencoba transisi supervisor → **403**
- Supervisor mencoba transisi analis → **403**
- Transisi tidak valid → **400** `"Transisi status tidak valid: X → Y"`

**Response 200:**

```json
{
  "data": {
    "id": "uuid-string",
    "sampleCode": "LAB-20260512-0001",
    "status": "tervalidasi",
    "updatedAt": "2026-05-13T08:00:00.000Z"
  },
  "message": "Status sampel diperbarui"
}
```

---

### Results

#### `POST /api/v1/samples/:id/results`

Input satu parameter hasil pemeriksaan untuk sampel. Membuat `SampleResult` dan `AuditLog` (action: `result.create`) dalam satu Prisma transaction.

**Auth:** Bearer JWT — **hanya role analis** (supervisor → 403)

**Syarat tambahan:** status sampel harus `dalam_proses` → **400** jika bukan

**Path Parameters:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `id` | UUID string | ID sampel |

**Request Body:**

```json
{
  "parameterName": "Hemoglobin",
  "value": "12.5",
  "unit": "g/dL",
  "referenceMin": "12.0",
  "referenceMax": "16.0",
  "note": "Sampel jernih"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `parameterName` | string | Ya | Nama parameter (maks 255 karakter) |
| `value` | string | Ya | Nilai hasil — disimpan sebagai string untuk mendukung nilai non-numerik (maks 100 karakter) |
| `unit` | string | Tidak | Satuan (maks 50 karakter) |
| `referenceMin` | string | Tidak | Batas bawah rujukan (maks 50 karakter) |
| `referenceMax` | string | Tidak | Batas atas rujukan (maks 50 karakter) |
| `note` | string | Tidak | Catatan observasi |

**Response 201:**

```json
{
  "data": {
    "id": "uuid-string",
    "sampleId": "uuid-string",
    "parameterName": "Hemoglobin",
    "value": "12.5",
    "unit": "g/dL",
    "referenceMin": "12.0",
    "referenceMax": "16.0",
    "note": "Sampel jernih",
    "inputBy": "uuid-string",
    "createdAt": "2026-05-13T07:00:00.000Z",
    "updatedAt": "2026-05-13T07:00:00.000Z",
    "inputter": { "fullName": "Rina Analis" }
  },
  "message": "Hasil pemeriksaan berhasil disimpan"
}
```

---

#### `GET /api/v1/samples/:id/results`

Ambil semua hasil pemeriksaan untuk satu sampel, diurutkan berdasarkan `createdAt` ascending.

**Auth:** Bearer JWT — analis dan supervisor

**Path Parameters:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `id` | UUID string | ID sampel |

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid-string",
      "sampleId": "uuid-string",
      "parameterName": "Hemoglobin",
      "value": "12.5",
      "unit": "g/dL",
      "referenceMin": "12.0",
      "referenceMax": "16.0",
      "note": "Sampel jernih",
      "inputBy": "uuid-string",
      "createdAt": "2026-05-13T07:00:00.000Z",
      "updatedAt": "2026-05-13T07:00:00.000Z",
      "inputter": { "fullName": "Rina Analis" }
    }
  ]
}

---

### Dashboard

#### `GET /api/v1/dashboard/analis`

Aggregasi data operasional harian untuk analis.

**Auth:** Bearer JWT — **hanya role analis** (supervisor → 403)

**Response 200:**

```json
{
  "data": {
    "totalToday": 5,
    "dalamProses": 2,
    "menungguReview": 1,
    "tervalidasiHariIni": 3,
    "topPriority": [
      {
        "id": "uuid",
        "sampleCode": "LAB-20260512-0001",
        "sampleType": "Darah Vena",
        "requestedTest": "Hematologi Lengkap",
        "department": "Penyakit Dalam",
        "priority": "cito",
        "status": "menunggu_pemeriksaan"
      }
    ]
  }
}
```

- `tervalidasiHariIni` — sampel dengan `status = tervalidasi` dan `updatedAt >= 00:00 hari ini`
- `topPriority` — maks 3 sampel aktif (bukan `tervalidasi`/`dibatalkan`), diurutkan `cito → urgent → rutin`
- `qcHariIni.stabil` — jumlah `qc_records` dengan `status = stabil` dan `recordedAt >= 00:00 hari ini`
- `qcHariIni.perluPerhatian` — jumlah `qc_records` dengan `status = perlu_perhatian` dan `recordedAt >= 00:00 hari ini`

**Response 200 (Sprint 5):**

```json
{
  "data": {
    "totalToday": 5,
    "dalamProses": 2,
    "menungguReview": 1,
    "tervalidasiHariIni": 3,
    "topPriority": [],
    "qcHariIni": {
      "stabil": 1,
      "perluPerhatian": 1
    }
  }
}
```

---

#### `GET /api/v1/dashboard/supervisor`

Aggregasi data review untuk supervisor.

**Auth:** Bearer JWT — **hanya role supervisor** (analis → 403)

**Response 200:**

```json
{
  "data": {
    "menungguReview": 3,
    "tervalidasiHariIni": 5,
    "mintaCekUlang": 2,
    "sampelMenungguReview": [
      {
        "id": "uuid",
        "sampleCode": "LAB-20260512-0003",
        "sampleType": "Darah Vena",
        "requestedTest": "Kimia Darah",
        "department": "Bedah",
        "priority": "urgent",
        "createdAt": "2026-05-13T...",
        "creator": { "id": "uuid", "fullName": "Rina Analis" }
      }
    ]
  }
}
```

- `tervalidasiHariIni` — sampel dengan `status = tervalidasi` dan `updatedAt >= 00:00 hari ini`
- `mintaCekUlang` — semua sampel aktif dengan `status = minta_cek_ulang` (tanpa filter tanggal, merepresentasikan backlog saat ini)
- `sampelMenungguReview` — maks 5 sampel dengan status `menunggu_review`, diurutkan prioritas tertinggi lalu terlama masuk
- `qcPerluPerhatian` — jumlah seluruh `qc_records` dengan `status = perlu_perhatian` (semua waktu, bukan hanya hari ini)

**Response 200 (Sprint 5):**

```json
{
  "data": {
    "menungguReview": 3,
    "tervalidasiHariIni": 5,
    "mintaCekUlang": 2,
    "sampelMenungguReview": [],
    "qcPerluPerhatian": 1
  }
}
```

---

### QC Instruments

#### `GET /api/v1/qc-instruments`

Daftar alat QC aktif milik laboratorium user yang login.

**Auth:** Bearer JWT — analis dan supervisor

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Hematology Analyzer XN-1000",
      "serialNumber": "XN-001",
      "department": "Hematologi",
      "isActive": true,
      "createdAt": "2026-05-13T...",
      "updatedAt": "2026-05-13T..."
    }
  ]
}
```

---

### QC Records

#### `POST /api/v1/qc-records`

Buat catatan QC baru. Status (`stabil`/`perlu_perhatian`) dihitung otomatis backend berdasarkan `controlValue` vs `lowerLimit`–`upperLimit`. Membuat `AuditLog` (action: `qc.create`) dalam satu Prisma transaction.

**Auth:** Bearer JWT — **hanya role analis** (supervisor → 403)

**Request Body:**

```json
{
  "instrumentId": "uuid",
  "controlType": "Level 1",
  "controlValue": "12.5",
  "unit": "g/dL",
  "lowerLimit": "11.0",
  "upperLimit": "13.0",
  "notes": "Opsional",
  "recordedAt": "2026-05-13T08:00:00.000Z"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `instrumentId` | UUID string | Ya | ID alat QC |
| `controlType` | string | Ya | Tipe kontrol (maks 100 karakter) |
| `controlValue` | string (numerik) | Ya | Nilai kontrol yang diukur |
| `unit` | string | Tidak | Satuan pengukuran (maks 50 karakter) |
| `lowerLimit` | string (numerik) | Ya | Batas bawah kontrol |
| `upperLimit` | string (numerik) | Ya | Batas atas kontrol (`lowerLimit ≤ upperLimit`) |
| `notes` | string | Tidak | Catatan tambahan |
| `recordedAt` | ISO string | Tidak | Waktu pencatatan — default: `new Date()` |

**Rules:**
- `lowerLimit > upperLimit` → **400**
- `instrumentId` bukan milik lab user → **403**
- Alat tidak aktif → **400**
- Status dihitung: `lowerLimit ≤ controlValue ≤ upperLimit` → `stabil`, selainnya → `perlu_perhatian`

**Response 201:**

```json
{
  "data": {
    "id": "uuid",
    "instrumentId": "uuid",
    "controlType": "Level 1",
    "controlValue": "12.5000",
    "unit": "g/dL",
    "lowerLimit": "11.0000",
    "upperLimit": "13.0000",
    "status": "stabil",
    "notes": null,
    "recordedAt": "2026-05-13T08:00:00.000Z",
    "createdAt": "2026-05-13T08:00:00.000Z",
    "instrument": { "name": "Hematology Analyzer XN-1000" },
    "recorder": { "fullName": "Analis Analis" }
  },
  "message": "Catatan QC berhasil disimpan"
}
```

---

#### `GET /api/v1/qc-records`

Daftar QC records dengan paginasi. Difilter otomatis per `laboratoryId`.

**Auth:** Bearer JWT — analis dan supervisor

**Query Parameters:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `instrumentId` | UUID | Filter per alat |
| `status` | `stabil` \| `perlu_perhatian` | Filter per status |
| `dateFrom` | ISO date string | Filter `recordedAt >= dateFrom` |
| `dateTo` | ISO date string | Filter `recordedAt <= dateTo` |
| `page` | number | Default: 1 |
| `limit` | number | Default: 20, maks: 100 |

**Response 200:** format paginasi standar, setiap item berisi semua field `QcRecord` + `instrument.name`, `instrument.department`, `recorder.fullName`

---

#### `GET /api/v1/qc-records/:id`

Detail satu QC record.

**Auth:** Bearer JWT — analis dan supervisor

**Response 200:** sama dengan item di list + `laboratory.id`, `instrument.id`, `recorder.id`

---

### Audit Logs

#### `GET /api/v1/audit-logs`

Riwayat aktivitas sistem. Scoping per role:
- **analis** → hanya log `userId = diri sendiri` (filter `userId` dari query diabaikan)
- **supervisor** → semua log dalam lab yang sama; filter `userId` diperbolehkan (harus dalam lab yang sama → 403 jika beda lab)
- **admin/auditor** → semua log (filter `userId` diteruskan langsung)

**Auth:** Bearer JWT — analis, supervisor, admin, auditor

**Query Parameters:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `action` | string | Filter partial case-insensitive (contoh: `qc.create`) |
| `entityType` | string | Filter exact (contoh: `qc_records`, `samples`) |
| `userId` | UUID | Filter per user (supervisor only; analis diabaikan) |
| `dateFrom` | ISO date string | Filter `createdAt >= dateFrom` |
| `dateTo` | ISO date string | Filter `createdAt <= dateTo` |
| `page` | number | Default: 1 |
| `limit` | number | Default: 20, maks: 100 |

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "action": "qc.create",
      "entityType": "qc_records",
      "entityId": "uuid",
      "metadata": {
        "instrumentId": "uuid",
        "instrumentName": "Hematology Analyzer XN-1000",
        "controlType": "Level 1",
        "controlValue": "12.5",
        "status": "stabil"
      },
      "createdAt": "2026-05-13T08:00:00.000Z",
      "user": {
        "id": "uuid",
        "fullName": "Analis Analis",
        "email": "analis@labcermat.demo",
        "role": { "name": "analis" }
      }
    }
  ],
  "meta": { "total": 22, "page": 1, "limit": 20, "totalPages": 2 }
}
```

**Konvensi `action`:**

| Action | Siapa | Keterangan |
|---|---|---|
| `sample.create` | analis | Sampel baru didaftarkan |
| `sample.status_change` | analis | Transisi status oleh analis |
| `result.create` | analis | Input hasil pemeriksaan |
| `qc.create` | analis | Catat QC harian |
| `supervisor.validate` | supervisor | Sampel divalidasi |
| `supervisor.request_recheck` | supervisor | Minta cek ulang |
| `supervisor.cancel` | supervisor | Sampel dibatalkan |

---

## AI Service — localhost:8000

AI Service berjalan di port 8000, **terpisah** dari Backend. Semua endpoint dipanggil oleh Backend (bukan langsung dari Frontend).

Mode aktif dikontrol via env var `AI_MODE`:
- `rule_based` — rule-based logic Sprint 6 (default)
- `azure_ml_artifact` — in-process inference menggunakan artifact dari Azure ML Model Registry

> **Catatan:** Endpoint AI Service **tidak menerima Authorization header** — dipanggil server-to-server oleh Backend.

---

### Health

#### `GET /health`

Cek status AI Service.

**Auth:** Tidak diperlukan

**Response 200 (`AI_MODE=rule_based`):**

```json
{
  "status": "ok",
  "service": "labcermat-ai-service",
  "version": "1.0.0",
  "mode": "rule_based",
  "timestamp": "2026-05-13T06:00:00.000Z"
}
```

**Response 200 (`AI_MODE=azure_ml_artifact`):**

```json
{
  "status": "ok",
  "service": "labcermat-ai-service",
  "version": "1.0.0",
  "mode": "azure_ml_artifact",
  "timestamp": "2026-05-13T06:00:00.000Z"
}
```

---

### AI Endpoints

Semua AI endpoint menggunakan prefix `/ai/v1`.

---

#### `POST /ai/v1/sample-prioritization`

Hitung skor prioritas sampel aktif menggunakan rule-based scoring.

**Request Body:**

```json
{
  "samples": [
    {
      "id": "uuid-string",
      "sample_code": "LAB-20260513-0001",
      "priority": "cito",
      "status": "dalam_proses",
      "requested_test": "Hematologi Lengkap",
      "received_at": "2026-05-13T06:00:00.000Z",
      "minta_cek_ulang": false
    }
  ]
}
```

**Response 200:**

```json
{
  "mode": "rule_based",
  "ranked_samples": [
    {
      "id": "uuid-string",
      "rank": 1,
      "score": 140,
      "reason": "CITO · Hematologi Lengkap · 3 jam lalu",
      "estimated_duration_minutes": 30
    }
  ],
  "processed_at": "2026-05-13T09:00:00.000Z"
}
```

**Scoring rules:**
- Base priority: `cito` = 100, `urgent` = 60, `rutin` = 20
- Age bonus: +2 per jam sejak `received_at`, maks +40
- Recheck bonus: +20 jika `minta_cek_ulang = true`

---

#### `POST /ai/v1/result-review`

Flag hasil pemeriksaan berdasarkan rentang rujukan.

**Request Body:**

```json
{
  "sample_id": "uuid-string",
  "results": [
    {
      "parameter_name": "Hemoglobin",
      "value": "7.2",
      "unit": "g/dL",
      "reference_min": "12.0",
      "reference_max": "16.0"
    }
  ]
}
```

**Response 200:**

```json
{
  "mode": "rule_based",
  "flag_status": "perlu_review_supervisor",
  "reason": "Hemoglobin sangat di bawah batas bawah (7.2 vs min 12.0)",
  "recommendation": "Hasil memerlukan review supervisor sebelum dilaporkan",
  "processed_at": "2026-05-13T09:00:00.000Z"
}
```

**Nilai `flag_status`:**

| Nilai | Kondisi |
|---|---|
| `normal` | Semua nilai dalam rentang rujukan atau non-numerik |
| `perlu_perhatian` | ≥1 nilai di luar rentang rujukan |
| `perlu_review_supervisor` | ≥2 nilai di luar rentang, ATAU 1 nilai ekstrem (>2× ref_max atau <0.5× ref_min untuk ref_min positif) |

---

#### `POST /ai/v1/qc-anomaly`

Deteksi anomali QC. Mode inference tergantung `AI_MODE` env var:
- `rule_based` — Westgard T4 full-series monotonic trend detection
- `azure_ml_artifact` — Random Forest classifier dari Azure ML Model Registry

**Request Body:**

```json
{
  "instrument_id": "uuid-string",
  "control_type": "Level 1",
  "control_value": 12.8,
  "lower_limit": 11.0,
  "upper_limit": 13.0,
  "unit": "g/dL",
  "history": [
    { "value": 11.5, "recorded_at": "2026-05-12T..." },
    { "value": 11.8, "recorded_at": "2026-05-12T..." },
    { "value": 12.1, "recorded_at": "2026-05-13T..." }
  ]
}
```

**Response 200 (`mode=rule_based`):**

```json
{
  "status": "potensi_drift",
  "reason": "Tren naik terdeteksi pada 4 titik data berturut-turut",
  "suggestion": null,
  "mode": "rule_based",
  "processed_at": "2026-05-13T09:00:00.000Z",
  "confidence": null,
  "probabilities": null,
  "model_version": null,
  "fallback_reason": null
}
```

**Response 200 (`mode=azure_ml_artifact`):**

```json
{
  "status": "potensi_drift",
  "reason": "Model Azure ML mendeteksi potensi drift pada data QC — pertimbangkan kalibrasi alat.",
  "suggestion": "Lakukan pengecekan kalibrasi alat. Konsultasikan dengan supervisor.",
  "mode": "azure_ml_artifact",
  "processed_at": "2026-05-13T09:00:00.000Z",
  "confidence": 0.9312,
  "probabilities": {
    "stabil": 0.0401,
    "perlu_perhatian": 0.0287,
    "potensi_drift": 0.9312
  },
  "model_version": "qc-anomaly-detector:1",
  "fallback_reason": null
}
```

**Response 200 (`mode=fallback_rule_based` — artifact error):**

```json
{
  "status": "stabil",
  "reason": "Nilai dalam batas kontrol, tidak ada tren signifikan.",
  "suggestion": null,
  "mode": "fallback_rule_based",
  "processed_at": "2026-05-13T09:00:00.000Z",
  "confidence": null,
  "probabilities": null,
  "model_version": null,
  "fallback_reason": "azure_ml_artifact_unavailable: AZURE_ML_MODEL_DIR not set or directory does not exist"
}
```

**Nilai `status`:**

| Nilai | Kondisi |
|---|---|
| `stabil` | Nilai dalam batas dan tidak ada anomali terdeteksi |
| `perlu_perhatian` | Nilai di luar batas kontrol — perlu pengecekan alat |
| `potensi_drift` | Tren naik/turun terdeteksi — alat mungkin perlu kalibrasi |

**Nilai `mode`:**

| Nilai | Keterangan |
|---|---|
| `azure_ml_artifact` | Inference berhasil dari Azure ML artifact |
| `fallback_rule_based` | Azure ML artifact tidak tersedia; digunakan rule-based |
| `rule_based` | `AI_MODE=rule_based` — rule-based dipilih eksplisit |

> `potensi_drift` adalah output AI saja — tidak disimpan ke enum `QcStatus` di database. Disimpan di `ai_analysis_logs.response_data`.  
> Output ini adalah **decision support workflow operasional**, bukan diagnosis medis.

---

#### `POST /ai/v1/supervisor-summary`

Ringkasan shift supervisor berbasis template.

**Request Body:**

```json
{
  "laboratory_id": "uuid-string",
  "shift_hours": 8,
  "total_samples": 12,
  "validated_count": 8,
  "recheck_count": 2,
  "qc_issues_count": 1,
  "analis_list": ["Rina Analis", "Budi Analis"]
}
```

**Response 200:**

```json
{
  "mode": "rule_based",
  "summary": "Dalam 8 jam terakhir, Lab Klinik Utama memproses 12 sampel. 8 sampel telah divalidasi (67%). Terdapat 2 sampel yang perlu cek ulang dan 1 masalah QC yang perlu ditangani.",
  "stats": {
    "total_samples": 12,
    "validated": 8,
    "recheck": 2,
    "qc_issues": 1,
    "validation_rate": 0.67,
    "analis_bertugas": ["Rina Analis", "Budi Analis"]
  },
  "focus_recommendations": [
    "Selesaikan 2 sampel yang menunggu cek ulang",
    "Tindak lanjuti 1 masalah QC yang terdeteksi"
  ],
  "processed_at": "2026-05-13T09:00:00.000Z"
}
```

---

## Backend API — AI Gateway

Endpoint AI di Backend (`/api/v1/ai/*`) bertindak sebagai gateway: mengambil data dari database, memanggil AI Service, dan menyimpan log ke `ai_analysis_logs`.

**Auth:** Bearer JWT (AuthGuard) untuk semua endpoint di bawah.

---

#### `POST /api/v1/ai/prioritize`

Trigger prioritasi sampel aktif.

**Auth:** analis dan supervisor

**Response 200:**

```json
{
  "data": {
    "mode": "rule_based",
    "ranked_samples": [ ... ],
    "processed_at": "2026-05-13T09:00:00.000Z"
  }
}
```

Log disimpan ke `ai_analysis_logs` dengan `analysis_type = sample_prioritization`, `entity_type = laboratory`.

---

#### `POST /api/v1/ai/review/:sampleId`

Trigger review hasil pemeriksaan satu sampel.

**Auth:** analis dan supervisor

**Path Parameters:** `sampleId` — UUID sampel

**Response 200:** respons AI service mentah

Log disimpan ke `ai_analysis_logs` dengan `analysis_type = result_review`, `entity_type = sample`, `entity_id = sampleId`.

---

#### `POST /api/v1/ai/qc-anomaly/:recordId`

Trigger deteksi anomali QC satu record.

**Auth:** analis dan supervisor

**Path Parameters:** `recordId` — UUID QC record

**Response 200:** respons AI service mentah

Log disimpan ke `ai_analysis_logs` dengan `analysis_type = qc_anomaly`, `entity_type = qc_record`, `entity_id = recordId`.

---

#### `POST /api/v1/ai/supervisor-summary`

Trigger ringkasan shift supervisor.

**Auth:** supervisor saja (analis → 403)

**Request Body (opsional):**

```json
{ "shiftHours": 8 }
```

| Field | Tipe | Default | Keterangan |
|---|---|---|---|
| `shiftHours` | integer | 8 | Window waktu ringkasan (1–24 jam) |

**Response 200:** respons AI service mentah

Log disimpan ke `ai_analysis_logs` dengan `analysis_type = supervisor_summary`, `entity_type = laboratory`.

---

#### `POST /api/v1/ai/sop-question`

Tanya jawab SOP laboratorium berbasis BM25 retrieval + template answer.

**Auth:** analis dan supervisor

**Request Body:**

```json
{
  "question": "Apa yang dilakukan jika QC di luar batas?",
  "topK": 5,
  "documentId": null
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `question` | string | Ya | 3–500 karakter |
| `topK` | integer | Tidak | Default 5, range 1–10. Jumlah chunk SOP yang diambil |
| `documentId` | string | Tidak | Filter ke satu dokumen SOP tertentu (document_id di index) |

**Response 200:**

```json
{
  "data": {
    "answer": "Berdasarkan SOP yang tersedia, berikut informasi yang relevan dengan pertanyaan: \"Apa yang dilakukan jika QC di luar batas?\":\n\n1. Prosedur Penanganan QC Di Luar Batas. Apabila nilai QC berada di luar batas kontrol, analis wajib menghentikan pemeriksaan sampel... (SOP: SOP Penanganan QC Di Luar Batas, hal. 1)\n\nUntuk tindakan lebih lanjut, rujuk langsung ke dokumen SOP terkait atau konsultasikan dengan supervisor laboratorium.",
    "sources": [
      {
        "document_id": "sop-hematologi-001",
        "title": "SOP Penanganan QC Di Luar Batas",
        "section": "page_1",
        "source_page": 1,
        "chunk_index": 0,
        "score": 7.3698,
        "snippet": "Prosedur Penanganan QC Di Luar Batas. Apabila nilai QC berada di luar batas kontrol..."
      }
    ],
    "mode": "template_bm25",
    "safety_note": "Output ini adalah bantuan operasional workflow laboratorium, bukan diagnosis medis. Keputusan klinis tetap sepenuhnya berada di tangan tenaga medis yang berwenang.",
    "fallback_reason": null,
    "processed_at": "2026-05-20T10:00:00+00:00"
  },
  "message": "SOP question berhasil dijawab"
}
```

**Mode values:**

| Mode | Keterangan |
|---|---|
| `groq_llm` | Groq LLaMA menjawab berdasarkan chunks yang diretrieval |
| `template_bm25` | Template BM25 digunakan (AI_GENERATIVE_PROVIDER != groq) |
| `fallback_template_bm25` | Groq dipilih tetapi gagal/timeout — template BM25 dipakai sebagai fallback |
| `no_relevant_source` | Tidak ada hasil retrieval — kata kunci tidak cocok atau SOP belum diindeks |
| `search_unavailable` | Azure AI Search tidak dikonfigurasi di AI Service |
| `search_error` | Error saat memanggil Azure AI Search |
| `validation_error` | Pertanyaan kosong atau tidak valid |

> **Safety:** Response selalu menyertakan `safety_note`. Tidak ada diagnosis medis — output adalah bantuan operasional workflow laboratorium.

Log disimpan ke `ai_analysis_logs` dengan `analysis_type = sop_question`, `entity_type = laboratory`, `entity_id = laboratoryId`.

---

### SOP Documents

#### `POST /api/v1/sop-documents/upload`

Upload PDF SOP, parse via Azure Document Intelligence, index ke Azure AI Search.

**Auth:** analis dan supervisor  
**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `file` | File (PDF) | Ya | Maks. 5 MB |
| `title` | string | Tidak | Judul dokumen. Default: nama file tanpa `.pdf` |

**Response 200:**

```json
{
  "data": {
    "id": "uuid",
    "title": "SOP Penanganan QC",
    "originalFilename": "sop-qc-v2.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 102400,
    "status": "indexed",
    "chunkCount": 24,
    "errorMessage": null,
    "uploadedById": "uuid",
    "indexedAt": "2026-05-20T10:00:00.000Z",
    "createdAt": "2026-05-20T10:00:00.000Z",
    "updatedAt": "2026-05-20T10:00:00.000Z",
    "uploadedBy": { "fullName": "Budi Analis" }
  },
  "message": "Dokumen SOP berhasil diparse dan diindeks"
}
```

Status lifecycle: `pending` → `indexed` (sukses) / `failed` (error)

**Response 503:** jika AI Service gagal parse/index — status dokumen di DB diset ke `failed`

---

#### `GET /api/v1/sop-documents`

List semua dokumen SOP milik laboratorium current user.

**Auth:** analis dan supervisor

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "SOP Penanganan QC",
      "originalFilename": "sop-qc-v2.pdf",
      "status": "indexed",
      "chunkCount": 24,
      "errorMessage": null,
      "sizeBytes": 102400,
      "indexedAt": "2026-05-20T10:00:00.000Z",
      "createdAt": "2026-05-20T10:00:00.000Z",
      "uploadedBy": { "fullName": "Budi Analis" }
    }
  ]
}
```

---

#### `DELETE /api/v1/sop-documents/:id`

Hapus metadata dokumen dan index chunks-nya dari Azure AI Search.

**Auth:** analis dan supervisor  
**Path:** `id` — UUID SopDocument

**Response 200:**

```json
{ "message": "Dokumen SOP berhasil dihapus" }
```

> Index delete di AI Service bersifat best-effort. Jika gagal, metadata tetap dihapus dari DB dan error hanya di-log.

---

### AI Service Internal Endpoints (Sprint 8)

#### `POST /ai/v1/sop-documents/parse-index`

Parse PDF + index ke Azure AI Search. Dipanggil oleh backend saat upload.

**Content-Type:** `multipart/form-data`

| Field | Tipe | Keterangan |
|---|---|---|
| `document_id` | string | UUID SopDocument dari backend DB |
| `title` | string | Judul dokumen |
| `file` | File (PDF) | File bytes |

**Response 200:**

```json
{
  "document_id": "uuid",
  "title": "SOP Penanganan QC",
  "status": "indexed",
  "chunk_count": 24,
  "pages_count": 8,
  "tables_count": 3,
  "indexed_count": 24,
  "processed_at": "2026-05-20T10:00:00+00:00"
}
```

#### `DELETE /ai/v1/sop-documents/{document_id}/index`

Hapus semua chunks untuk satu `document_id` dari Azure AI Search.

**Response 200:**

```json
{ "document_id": "uuid", "deleted": 24, "status": "deleted" }
```

---

#### `GET /api/v1/ai/logs/:entityId`

Ambil log AI terakhir untuk satu entitas.

**Auth:** analis dan supervisor

**Path Parameters:** `entityId` — UUID entitas (sample ID, QC record ID, atau laboratory ID)

**Query Parameters:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `type` | string | Filter `analysis_type` (contoh: `qc_anomaly`, `result_review`) |

**Response 200:**

```json
{
  "data": {
    "id": "uuid",
    "analysisType": "qc_anomaly",
    "entityType": "qc_record",
    "entityId": "uuid",
    "responseData": {
      "status": "stabil",
      "reason": "Nilai QC terlihat stabil berdasarkan model Azure ML.",
      "suggestion": "Tidak diperlukan tindakan segera. Lanjutkan pemantauan rutin.",
      "mode": "azure_ml_artifact",
      "processed_at": "2026-05-13T09:00:00.000Z",
      "confidence": 0.9847,
      "probabilities": { "stabil": 0.9847, "perlu_perhatian": 0.0103, "potensi_drift": 0.005 },
      "model_version": "qc-anomaly-detector:1",
      "fallback_reason": null
    },
    "mode": "azure_ml_artifact",
    "createdAt": "2026-05-13T09:00:00.000Z"
  }
}
```

**Response 404:** jika belum ada log untuk entitas tersebut (normal — bukan error kritis)

---

## Error Response Format

Semua error dari Backend menggunakan format standar berikut:

```json
{
  "statusCode": 400,
  "message": "Deskripsi error atau array string untuk validasi",
  "error": "Bad Request",
  "timestamp": "2026-05-12T06:00:00.000Z",
  "path": "/api/v1/endpoint"
}
```

| Field | Tipe | Keterangan |
|---|---|---|
| `statusCode` | number | HTTP status code |
| `message` | string \| string[] | Pesan error. Array untuk validasi DTO |
| `error` | string | HTTP status text |
| `timestamp` | string (ISO) | Waktu error terjadi |
| `path` | string | URL path yang menghasilkan error |

### Status Code yang Digunakan

| Code | Situasi |
|---|---|
| 400 | Validasi request body gagal |
| 401 | Header `Authorization` tidak ada |
| 403 | User tidak punya akses |
| 404 | Resource tidak ditemukan |
| 500 | Error server tidak terduga |
| 503 | AI Service tidak dapat dihubungi (timeout atau down) |
