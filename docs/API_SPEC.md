# LabCermat — API Specification

**Versi:** 5.0 — Sprint 5  
**Status:** QC Harian Digital & Audit Log aktif

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
  - [AI Endpoints (Placeholder)](#ai-endpoints-placeholder)
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

AI Service berjalan di port 8000, **terpisah** dari Backend. Semua endpoint AI mengembalikan `"mode": "placeholder"` — logic AI real diimplementasikan di Sprint 6+.

---

### Health

#### `GET /health`

Cek status AI Service.

**Auth:** Tidak diperlukan

**Response 200:**

```json
{
  "status": "ok",
  "service": "labcermat-ai-service",
  "version": "1.0.0",
  "mode": "placeholder",
  "timestamp": "2026-05-12T06:00:00.000Z"
}
```

---

### AI Endpoints (Placeholder)

Semua AI endpoint menggunakan prefix `/ai/v1`.

---

#### `POST /ai/v1/sample-prioritization`

Rekomendasi urutan prioritas pemrosesan sampel.

**Request Body:**

```json
{
  "samples": [
    {
      "sample_id": "uuid-string",
      "sample_code": "LAB-20260512-0001",
      "priority": "cito",
      "test_types": ["hematologi"],
      "registered_at": "2026-05-12T06:00:00.000Z"
    }
  ],
  "laboratory_id": "uuid-string"
}
```

**Response 200:**

```json
{
  "mode": "placeholder",
  "recommended_order": ["uuid-string"],
  "reasoning": "Placeholder — rule-based prioritization akan diimplementasikan Sprint 6"
}
```

---

#### `POST /ai/v1/result-review`

Review otomatis hasil pemeriksaan laboratorium.

**Request Body:**

```json
{
  "sample_id": "uuid-string",
  "test_type": "hematologi",
  "results": {
    "hemoglobin": 12.5,
    "hematokrit": 38.0,
    "leukosit": 8500
  },
  "patient_info": {
    "age": 35,
    "gender": "L"
  }
}
```

**Response 200:**

```json
{
  "mode": "placeholder",
  "flagged": false,
  "flags": [],
  "recommendation": "Placeholder — AI review akan diimplementasikan Sprint 6",
  "confidence": 0.0
}
```

---

#### `POST /ai/v1/qc-anomaly`

Deteksi anomali pada data Quality Control.

**Request Body:**

```json
{
  "laboratory_id": "uuid-string",
  "qc_date": "2026-05-12",
  "control_level": "level_1",
  "measurements": {
    "hemoglobin": [12.1, 12.3, 12.0, 12.4]
  }
}
```

**Response 200:**

```json
{
  "mode": "placeholder",
  "anomaly_detected": false,
  "anomalies": [],
  "summary": "Placeholder — anomaly detection akan diimplementasikan Sprint 6"
}
```

---

#### `POST /ai/v1/supervisor-summary`

Ringkasan harian untuk supervisor.

**Request Body:**

```json
{
  "laboratory_id": "uuid-string",
  "date": "2026-05-12",
  "include_sections": ["sample_stats", "qc_summary", "pending_reviews"]
}
```

**Response 200:**

```json
{
  "mode": "placeholder",
  "date": "2026-05-12",
  "summary": {
    "sample_stats": "Placeholder",
    "qc_summary": "Placeholder",
    "pending_reviews": "Placeholder"
  },
  "generated_at": "2026-05-12T06:00:00.000Z"
}
```

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
| 403 | User tidak punya akses (Sprint 2) |
| 404 | Resource tidak ditemukan |
| 500 | Error server tidak terduga |
