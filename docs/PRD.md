# PRD — LabCermat Production System

## 1. Ringkasan Produk

**LabCermat** adalah platform digital untuk membantu laboratorium klinik, rumah sakit, dan fasilitas farmasi mengelola workflow operasional laboratorium secara lebih terstruktur. Sistem ini membantu analis dan supervisor dalam proses pencatatan sampel, pemantauan status pemeriksaan, input hasil, review supervisor, QC harian, dokumen laboratorium, SOP, riwayat aktivitas, dan bantuan analisis berbasis AI.

LabCermat **bukan aplikasi diagnosis medis**. Sistem ini hanya membantu workflow internal laboratorium, pengecekan awal, dokumentasi, prioritas kerja, review hasil, dan pencatatan QC. Keputusan akhir tetap dilakukan oleh analis atau supervisor laboratorium.

---

## 2. Latar Belakang Masalah

Banyak laboratorium masih mengandalkan pencatatan manual, spreadsheet, dokumen terpisah, dan komunikasi langsung antar staf untuk memantau sampel dan hasil pemeriksaan. Kondisi ini menyebabkan beberapa masalah:

- status sampel sulit dipantau secara real-time;
- sampel prioritas berpotensi terlambat diproses;
- hasil yang perlu perhatian bisa terlewat;
- dokumentasi QC tidak rapi;
- riwayat aktivitas sulit ditelusuri;
- supervisor harus mengecek banyak sumber untuk melakukan review;
- proses audit dan akreditasi menjadi lebih berat.

LabCermat hadir untuk menyatukan proses tersebut dalam satu sistem digital yang mudah digunakan oleh analis, supervisor, admin, dan auditor.

---

## 3. Visi Produk

Menjadi platform workflow laboratorium yang membantu tim lab bekerja lebih cepat, rapi, terpantau, dan siap audit melalui kombinasi **Lab Automation**, **AI Analytics**, dan **Digital Lab Management System**.

---

## 4. Tujuan Produk

Tujuan utama LabCermat:

1. Membantu analis mencatat dan memproses sampel secara terstruktur.
2. Membantu supervisor meninjau dan memvalidasi hasil secara lebih cepat.
3. Memastikan setiap perubahan status sampel tercatat dalam audit log.
4. Membantu pencatatan QC harian secara digital.
5. Menyediakan dashboard role-based untuk analis, supervisor, admin, dan auditor.
6. Menggunakan AI untuk membantu prioritas sampel, review hasil, deteksi QC, pembacaan dokumen, pencarian SOP, dan ringkasan supervisor.
7. Menyediakan fondasi production-ready yang dapat berkembang ke integrasi Azure.

---

## 5. Non-Goals

LabCermat tidak bertujuan untuk:

- memberikan diagnosis medis;
- menggantikan keputusan analis atau supervisor;
- menggantikan sistem HIS/LIS rumah sakit secara penuh pada tahap awal;
- mengubah hasil pemeriksaan lab;
- memberikan rekomendasi terapi atau tindakan klinis kepada pasien;
- menjadi aplikasi pasien atau aplikasi konsultasi kesehatan.

---

## 6. Target Pengguna

### 6.1 Analis Laboratorium

Pengguna utama yang mencatat sampel, memproses pemeriksaan, menginput hasil, mengisi QC harian, dan mengirim hasil ke supervisor.

### 6.2 Supervisor Laboratorium

Pengguna yang bertugas meninjau hasil, melakukan validasi, meminta cek ulang, memantau QC, dan melihat ringkasan shift.

### 6.3 Admin Laboratorium

Pengguna yang mengelola user, role, data lab, master parameter pemeriksaan, alat, reagen, dan SOP.

### 6.4 Auditor / Viewer

Pengguna yang hanya melihat riwayat aktivitas, dokumen, SOP, dan laporan QC tanpa mengubah data operasional.

---

## 7. User Personas

### 7.1 Persona 1 — Analis Lab

**Nama:** Rina  
**Peran:** Analis Laboratorium  
**Kebutuhan utama:** mencatat sampel, memproses pemeriksaan, menginput hasil, dan mengirim hasil ke supervisor.  
**Masalah utama:** sulit memantau banyak sampel jika masih memakai catatan manual atau spreadsheet.  
**Nilai dari LabCermat:** setiap sampel memiliki status yang jelas dan alur kerja lebih mudah dipantau.

### 7.2 Persona 2 — Supervisor Lab

**Nama:** Doni  
**Peran:** Supervisor Laboratorium  
**Kebutuhan utama:** meninjau hasil pemeriksaan, memvalidasi hasil, dan memantau QC.  
**Masalah utama:** harus bertanya langsung ke analis atau membuka banyak file untuk mengetahui status sampel.  
**Nilai dari LabCermat:** daftar sampel yang perlu review tampil dalam satu dashboard.

### 7.3 Persona 3 — Admin Lab

**Nama:** Sari  
**Peran:** Admin Laboratorium  
**Kebutuhan utama:** mengelola user, role, SOP, parameter pemeriksaan, dan konfigurasi lab.  
**Masalah utama:** konfigurasi data lab sering tersebar dan tidak terdokumentasi rapi.  
**Nilai dari LabCermat:** konfigurasi sistem dikelola dari satu tempat.

### 7.4 Persona 4 — Auditor

**Nama:** Budi  
**Peran:** Auditor Internal  
**Kebutuhan utama:** melihat riwayat aktivitas, QC, dokumen, dan SOP.  
**Masalah utama:** sulit menelusuri perubahan status sampel dan riwayat QC.  
**Nilai dari LabCermat:** semua aktivitas penting tercatat otomatis.

---

## 8. Opportunity Area

### 8.1 Lab Automation

Membantu otomatisasi alur kerja lab, seperti prioritas sampel, status workflow, checklist proses, dan draft catatan QC.

### 8.2 AI Analytics

Membantu mendeteksi hasil yang perlu perhatian, QC yang tidak stabil, dan membuat ringkasan operasional.

### 8.3 Digital Lab Management System

Menyediakan sistem digital terpusat untuk sampel, hasil, QC, dokumen, SOP, user, role, dan audit log.

---

## 9. Solusi yang Ditawarkan

LabCermat menyediakan satu sistem terpadu untuk mengelola workflow laboratorium dari awal hingga akhir:

1. Analis menambahkan sampel.
2. Sistem memberi status awal **Menunggu Pemeriksaan**.
3. Analis memulai pemeriksaan.
4. Status berubah menjadi **Dalam Proses**.
5. Analis menginput hasil.
6. Analis mengirim hasil ke supervisor.
7. Status berubah menjadi **Menunggu Review**.
8. Supervisor melakukan review.
9. Supervisor memilih **Validasi** atau **Cek Ulang**.
10. Status berubah menjadi **Tervalidasi** atau **Minta Cek Ulang**.
11. Semua aktivitas tercatat ke audit log.

---

## 10. Arsitektur Production

```txt
React Frontend
Azure Static Web Apps
        ↓
NestJS Backend API
Node.js + TypeScript + Prisma
        ↓
Supabase PostgreSQL + Supabase Auth
        ↓
FastAPI AI Service
Python + Pandas + Scikit-learn + Azure SDK
        ↓
Azure AI Services
Azure OpenAI
Azure Document Intelligence
Azure AI Search
Azure Machine Learning
Azure Blob Storage
Azure Application Insights
Azure Key Vault
```

---

## 11. Tech Stack

### 11.1 Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Recharts
- TanStack Query
- React Hook Form
- Zod
- React Router

### 11.2 Frontend Hosting

- Azure Static Web Apps

### 11.3 Backend Utama

- Node.js
- NestJS
- TypeScript
- Prisma
- REST API

### 11.4 AI Service

- Python
- FastAPI
- Pandas
- NumPy
- Scikit-learn
- Azure SDK

### 11.5 Database

- Supabase PostgreSQL untuk tahap awal
- Desain tetap disiapkan agar bisa dimigrasikan ke Azure Database for PostgreSQL

### 11.6 Authentication

- Supabase Auth untuk MVP production awal
- Azure AD B2C / Microsoft Entra External ID untuk enterprise version

### 11.7 Azure Services

- Azure OpenAI
- Azure Document Intelligence
- Azure AI Search
- Azure Machine Learning
- Azure Blob Storage
- Azure Application Insights
- Azure Key Vault

---

## 12. UI/UX Direction

LabCermat menggunakan tone visual medis yang bersih, profesional, modern, dan mudah digunakan. Tampilan produk harus memberi kesan rapi, terpercaya, dan tenang seperti sistem operasional laboratorium klinis.

### 12.1 Tema Visual

Tema utama UI adalah **medical-clean professional dashboard** dengan nuansa:

- bersih;
- klinis;
- terstruktur;
- mudah dibaca;
- tidak terlalu ramai;
- tidak terlalu teknis untuk pengguna akhir.

### 12.2 Palet Warna

Warna utama yang digunakan:

- **Putih** untuk kesan bersih dan steril.
- **Teal** untuk nuansa kesehatan, ketenangan, dan kepercayaan.
- **Biru klinis** untuk kesan profesional dan modern.
- **Slate/abu gelap** untuk teks utama.
- **Hijau lembut** untuk status aman atau tervalidasi.
- **Amber** untuk status perlu perhatian.
- **Merah** hanya untuk kondisi kritis atau error.

### 12.3 Gaya Komponen

Komponen UI utama menggunakan:

- sidebar kiri;
- soft card;
- rounded corner;
- shadow ringan;
- badge status;
- tabel ringkas;
- form sederhana;
- grafik yang mudah dibaca;
- layout dashboard yang lega dan tidak padat.

### 12.4 Prinsip Bahasa UI

Bahasa dalam aplikasi harus sederhana, operasional, dan mudah dipahami oleh analis serta supervisor laboratorium.

Hindari istilah teknis yang terlalu dominan di UI seperti:

- inference;
- machine learning model;
- anomaly detection;
- explainable AI;
- Azure service;
- confidence score, kecuali di halaman teknis/admin.

Gunakan istilah yang lebih mudah dipahami seperti:

- **Analisis Hasil**;
- **Hasil Perlu Perhatian**;
- **QC Perlu Dicek**;
- **Prioritas Sampel**;
- **Ringkasan Shift**;
- **Alasan Sistem Menandai**;
- **Dokumen Terbaca**;
- **Saran Tindak Lanjut**.

### 12.5 Prinsip Desain

Desain LabCermat harus mengikuti prinsip berikut:

1. **Clarity first** — pengguna harus cepat memahami status sampel dan pekerjaan yang perlu dilakukan.
2. **Role-focused** — tampilan analis, supervisor, admin, dan auditor harus disesuaikan dengan kebutuhan masing-masing.
3. **Calm interface** — hindari visual yang terlalu ramai agar pengguna tidak merasa terbebani.
4. **Action-oriented** — tombol aksi utama seperti “Mulai Proses”, “Kirim ke Review”, “Validasi”, dan “Cek Ulang” harus mudah ditemukan.
5. **Audit-friendly** — status, riwayat, dan catatan aktivitas harus mudah ditelusuri.
6. **Non-diagnostic** — UI tidak boleh memberi kesan bahwa sistem memberikan diagnosis medis.

### 12.6 Referensi Mood UI

Mood visual yang diharapkan:

- calm;
- clinical;
- trustworthy;
- organized;
- assistive;
- professional.

Mood yang harus dihindari:

- terlalu futuristik;
- terlalu gelap;
- terlalu ramai;
- terlalu teknis;
- terlalu seperti aplikasi diagnosis pasien.

---

## 13. Struktur Repository

```txt
labcermat-production/
├── apps/
│   ├── frontend/
│   ├── backend/
│   └── ai-service/
│
├── packages/
│   ├── shared-types/
│   └── config/
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   ├── DATABASE_SCHEMA.md
│   └── DEPLOYMENT.md
│
├── infra/
│   ├── azure/
│   └── github-actions/
│
├── .env.example
├── package.json
└── README.md
```

---

## 14. Role dan Hak Akses

### 14.1 Analis Lab

Analis dapat:

- login;
- melihat dashboard analis;
- menambah sampel;
- melihat daftar sampel;
- memulai proses pemeriksaan;
- menginput hasil pemeriksaan;
- mengirim sampel ke review;
- mengisi QC harian;
- mengunggah dokumen lab;
- melihat SOP;
- melihat riwayat aktivitas sendiri.

### 14.2 Supervisor Lab

Supervisor dapat:

- login;
- melihat dashboard supervisor;
- melihat sampel menunggu review;
- memvalidasi hasil;
- meminta cek ulang;
- melihat QC harian;
- meninjau dokumen lab;
- melihat riwayat aktivitas tim;
- melihat ringkasan shift.

### 14.3 Admin Lab

Admin dapat:

- mengelola user;
- mengelola role;
- mengelola data laboratorium;
- mengelola master parameter pemeriksaan;
- mengelola alat dan reagen;
- mengelola SOP;
- melihat audit log.

### 14.4 Auditor / Viewer

Auditor dapat:

- melihat riwayat aktivitas;
- melihat dokumen;
- melihat laporan QC;
- melihat SOP;
- tidak dapat mengubah data operasional.

---

## 15. Workflow Sampel

```txt
Sampel ditambahkan oleh analis
        ↓
Status: Menunggu Pemeriksaan
        ↓
Analis klik Mulai Proses
        ↓
Status: Dalam Proses
        ↓
Analis input hasil pemeriksaan
        ↓
Analis klik Kirim ke Review
        ↓
Status: Menunggu Review
        ↓
Supervisor review
        ↓
Supervisor klik Validasi atau Cek Ulang
        ↓
Status: Tervalidasi / Minta Cek Ulang
```

### 15.1 Status Sampel

- **Menunggu Pemeriksaan**
- **Dalam Proses**
- **Menunggu Review**
- **Tervalidasi**
- **Minta Cek Ulang**
- **Dibatalkan**

Setiap perubahan status wajib tercatat di:

- `sample_status_logs`
- `audit_logs`

---

## 16. Fitur Utama

### 16.1 Login Multi-Role

Pengguna dapat login menggunakan akun sesuai role. Setelah login, sistem menampilkan dashboard dan menu sesuai hak akses.

**Priority:** Must Have

**Acceptance Criteria:**

- User dapat login.
- User mendapat role.
- Sidebar berubah berdasarkan role.
- Route dilindungi dari user yang belum login.

### 16.2 Dashboard Analis

Dashboard analis menampilkan ringkasan pekerjaan operasional.

Konten utama:

- jumlah sampel hari ini;
- sampel menunggu pemeriksaan;
- sampel dalam proses;
- sampel menunggu review;
- sampel prioritas;
- QC harian;
- aktivitas terbaru.

**Priority:** Must Have

**Acceptance Criteria:**

- Analis dapat melihat ringkasan sampel.
- Data dashboard berasal dari backend.
- Dashboard menampilkan status terbaru.

### 16.3 Dashboard Supervisor

Dashboard supervisor menampilkan fokus review dan validasi.

Konten utama:

- jumlah sampel menunggu review;
- jumlah sampel tervalidasi;
- jumlah sampel minta cek ulang;
- QC perlu perhatian;
- daftar review hasil;
- ringkasan shift.

**Priority:** Must Have

**Acceptance Criteria:**

- Supervisor dapat melihat daftar sampel menunggu review.
- Supervisor dapat melakukan validasi atau cek ulang.
- Ringkasan dashboard sesuai data terbaru.

### 16.4 Manajemen Sampel

Analis dapat menambah, melihat, dan mengubah status sampel.

**Priority:** Must Have

**Acceptance Criteria:**

- Analis dapat membuat sampel baru.
- Status awal otomatis **Menunggu Pemeriksaan**.
- Sampel tersimpan di database.
- Semua perubahan status tercatat.

### 16.5 Input Hasil Pemeriksaan

Analis dapat menginput hasil pemeriksaan untuk sampel.

Data minimal:

- parameter pemeriksaan;
- nilai hasil;
- satuan;
- rentang rujukan;
- catatan teknis.

**Priority:** Must Have

**Acceptance Criteria:**

- Analis dapat menambah hasil pemeriksaan.
- Nilai hasil tervalidasi.
- Hasil terhubung dengan sampel.
- Hasil dapat dilihat supervisor.

### 16.6 Review Supervisor

Supervisor dapat meninjau hasil dengan status **Menunggu Review**.

Aksi:

- Validasi;
- Cek Ulang;
- Tambahkan catatan.

**Priority:** Must Have

**Acceptance Criteria:**

- Supervisor hanya melihat sampel menunggu review.
- Tombol Validasi mengubah status menjadi **Tervalidasi**.
- Tombol Cek Ulang mengubah status menjadi **Minta Cek Ulang**.
- Keputusan supervisor masuk audit log.

### 16.7 QC Harian Digital

Analis dapat mencatat QC harian alat atau reagen.

Data minimal:

- instrumen;
- jenis kontrol;
- nilai kontrol;
- satuan;
- batas bawah;
- batas atas;
- status QC;
- catatan.

**Priority:** Must Have

**Acceptance Criteria:**

- Analis dapat input QC.
- Sistem menandai QC stabil atau perlu perhatian.
- Supervisor dapat melihat status QC.
- QC tercatat dalam audit log.

### 16.8 Dokumen Lab

Pengguna dapat mengunggah dokumen lab seperti worksheet, label sampel, form QC, atau laporan.

**Priority:** Should Have

**Acceptance Criteria:**

- User dapat upload dokumen.
- Metadata dokumen tersimpan.
- File tersimpan di storage.
- Dokumen dapat diproses oleh Document Reader AI.

### 16.9 SOP Lab

Admin dapat mengunggah dan mengelola SOP. Analis dan supervisor dapat membaca SOP.

**Priority:** Should Have

**Acceptance Criteria:**

- SOP dapat diunggah.
- SOP dapat dikategorikan.
- SOP dapat dicari.
- SOP dapat dipakai oleh SOP Assistant AI.

### 16.10 Audit Log

Sistem mencatat semua aktivitas penting.

Aktivitas yang dicatat:

- login;
- tambah sampel;
- update status;
- input hasil;
- validasi;
- cek ulang;
- input QC;
- upload dokumen;
- update SOP.

**Priority:** Must Have

**Acceptance Criteria:**

- Setiap aksi penting tercatat.
- Audit log memiliki user, action, entity, metadata, dan timestamp.
- Auditor dapat melihat audit log.
- User biasa tidak dapat menghapus audit log.

---

## 17. AI Requirements

### 17.1 Sample Prioritization AI

**Fungsi:**  
Menyarankan urutan pengerjaan sampel berdasarkan prioritas, waktu masuk, jenis sampel, jenis pemeriksaan, kondisi sampel, dan estimasi durasi.

**Input:**

- daftar sampel;
- prioritas;
- waktu masuk;
- jenis pemeriksaan;
- estimasi durasi;
- status sampel.

**Output:**

- ranking sampel;
- alasan prioritas;
- estimasi pengerjaan.

**Priority:** Should Have

### 17.2 Lab Result Review AI

**Fungsi:**  
Menandai hasil pemeriksaan yang perlu perhatian sebelum supervisor melakukan validasi.

**Input:**

- nilai hasil;
- satuan;
- rentang rujukan;
- jenis pemeriksaan;
- jenis sampel;
- status QC terkait.

**Output:**

- Normal;
- Perlu Perhatian;
- Perlu Review Supervisor;
- alasan penandaan;
- rekomendasi tindakan awal.

**Priority:** Must Have

### 17.3 QC Anomaly Detection AI

**Fungsi:**  
Mendeteksi apakah hasil QC alat atau reagen stabil atau perlu perhatian.

**Input:**

- nilai QC;
- batas bawah;
- batas atas;
- instrumen;
- jenis kontrol;
- riwayat QC.

**Output:**

- QC Stabil;
- QC Perlu Perhatian;
- Potensi drift alat;
- saran tindakan awal.

**Priority:** Must Have

### 17.4 Document Reader AI

**Fungsi:**  
Membaca label sampel, worksheet, form QC, dan dokumen lab dari PDF atau gambar.

**Teknologi:**

- Azure Document Intelligence;
- Azure Blob Storage.

**Output:**

- data terstruktur dari dokumen;
- status ekstraksi;
- confidence score;
- field yang perlu dicek manual.

**Priority:** Should Have

### 17.5 SOP Assistant AI

**Fungsi:**  
Membantu user mencari SOP yang relevan dan menampilkan ringkasan prosedur kerja.

**Teknologi:**

- Azure AI Search;
- Azure OpenAI.

**Output:**

- SOP relevan;
- ringkasan langkah kerja;
- referensi dokumen.

**Priority:** Should Have

### 17.6 Supervisor Summary AI

**Fungsi:**  
Membuat ringkasan shift untuk supervisor.

**Output:**

- jumlah sampel masuk;
- sampel selesai;
- sampel menunggu review;
- QC bermasalah;
- hasil yang perlu perhatian;
- rekomendasi fokus supervisor.

**Priority:** Should Have

### 17.7 Strategi Pengembangan Model AI

Pengembangan AI LabCermat dilakukan secara bertahap. Pada tahap awal, sistem menggunakan rule-based baseline dan data sintetis untuk memvalidasi alur kerja AI tanpa menggunakan data sensitif pengguna.

Model machine learning tidak langsung dilatih dari database operasional LabCermat. Dataset awal berasal dari sumber open-source dan data sintetis. Database operasional hanya digunakan untuk menjalankan workflow aplikasi, menyimpan status sampel, hasil pemeriksaan, QC harian, audit log, dan output analisis AI.

Jika pada tahap lanjutan data operasional ingin digunakan untuk training, maka harus melalui proses izin, anonimisasi, validasi etik, dan tata kelola data yang jelas.
---

## 18. Data Requirements

Data yang dibutuhkan sistem:

- data user;
- data role;
- data laboratorium;
- data sampel;
- hasil pemeriksaan;
- status sampel;
- QC harian;
- instrumen;
- dokumen;
- SOP;
- audit log;
- hasil analisis AI.

### 18.1 Data Training AI

Pada tahap awal, LabCermat tidak menggunakan data operasional pengguna sebagai data training model AI. Data training awal menggunakan kombinasi dataset open-source dan data sintetis yang dibuat untuk merepresentasikan workflow laboratorium.

Sumber data awal yang digunakan meliputi:

- dataset open-source healthcare atau laboratory jika tersedia,
- data sintetis hasil pemeriksaan laboratorium,
- data sintetis QC harian,
- data sintetis workflow sampel,
- template dokumen sintetis untuk worksheet, form QC, dan label sampel,
- dokumen SOP sintetis untuk pengujian SOP Assistant.

Database LabCermat digunakan untuk menyimpan data operasional aplikasi seperti data sampel, hasil pemeriksaan, status sampel, QC harian, audit log, dokumen, dan hasil analisis AI. Data operasional pengguna tidak digunakan untuk training model tanpa izin, proses anonimisasi, dan tata kelola data yang jelas.

Pendekatan awal AI menggunakan:

- rule-based baseline untuk prioritas sampel,
- rule-based dan statistical detection untuk review hasil pemeriksaan,
- rule-based dan statistical detection untuk QC anomaly detection,
- synthetic data generator untuk simulasi workflow laboratorium,
- Azure OpenAI untuk ringkasan dan penjelasan natural language,
- Azure Document Intelligence untuk pembacaan dokumen,
- Azure AI Search untuk pencarian SOP.

Pendekatan lanjutan AI meliputi:

- training model machine learning menggunakan dataset open-source dan/atau data sintetis,
- evaluasi model menggunakan metrik yang sesuai,
- deployment model melalui FastAPI AI Service atau Azure Machine Learning,
- model registry dan versioning melalui Azure Machine Learning jika sudah masuk tahap production enterprise.

Data sensitif harus diperlakukan dengan prinsip:

- minimisasi data;
- akses berbasis role;
- audit trail;
- enkripsi;
- tidak menggunakan data pasien untuk output diagnosis.

---

## 19. Database Design Overview

### 19.1 Tabel Utama

```txt
users
roles
laboratories
samples
sample_results
sample_status_logs
qc_records
qc_instruments
documents
sop_documents
audit_logs
notifications
ai_analysis_logs
```

### 19.2 `users`

```txt
id
auth_user_id
full_name
email
role_id
laboratory_id
status
created_at
updated_at
```

### 19.3 `roles`

```txt
id
name
description
permissions
```

### 19.4 `laboratories`

```txt
id
name
type
address
contact
created_at
updated_at
```

### 19.5 `samples`

```txt
id
sample_code
laboratory_id
sample_type
requested_test
department
priority
status
received_at
created_by
notes
created_at
updated_at
```

### 19.6 `sample_results`

```txt
id
sample_id
parameter_name
value
unit
reference_min
reference_max
flag_status
input_by
reviewed_by
review_note
created_at
updated_at
```

### 19.7 `sample_status_logs`

```txt
id
sample_id
previous_status
new_status
changed_by
note
created_at
```

### 19.8 `qc_records`

```txt
id
instrument_id
laboratory_id
control_type
control_value
unit
lower_limit
upper_limit
status
recorded_by
reviewed_by
notes
created_at
```

### 19.9 `qc_instruments`

```txt
id
laboratory_id
name
serial_number
department
status
created_at
updated_at
```

### 19.10 `documents`

```txt
id
laboratory_id
sample_id
document_type
file_name
file_url
uploaded_by
ocr_status
extracted_data
created_at
```

### 19.11 `sop_documents`

```txt
id
laboratory_id
title
category
file_url
content_text
version
status
uploaded_by
created_at
updated_at
```

### 19.12 `audit_logs`

```txt
id
user_id
action
entity_type
entity_id
metadata
created_at
```

### 19.13 `notifications`

```txt
id
user_id
title
message
type
read_status
created_at
```

### 19.14 `ai_analysis_logs`

```txt
id
entity_type
entity_id
ai_module
input_payload
output_payload
confidence_score
created_at
```

---

## 20. API Requirement Overview

Base URL:

```txt
/api/v1
```

### 20.1 Auth

```txt
GET    /auth/me
POST   /auth/sync-user
POST   /auth/logout
```

### 20.2 Users

```txt
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id
```

### 20.3 Samples

```txt
GET    /samples
GET    /samples/:id
POST   /samples
PATCH  /samples/:id
PATCH  /samples/:id/status
DELETE /samples/:id
```

### 20.4 Sample Results

```txt
GET    /samples/:id/results
POST   /samples/:id/results
PATCH  /sample-results/:id
DELETE /sample-results/:id
```

### 20.5 Supervisor Review

```txt
GET    /reviews/pending
POST   /reviews/:sampleId/validate
POST   /reviews/:sampleId/request-recheck
```

### 20.6 QC

```txt
GET    /qc-records
GET    /qc-records/:id
POST   /qc-records
PATCH  /qc-records/:id
POST   /qc-records/:id/review
```

### 20.7 Documents

```txt
GET    /documents
POST   /documents/upload
GET    /documents/:id
DELETE /documents/:id
POST   /documents/:id/process
```

### 20.8 SOP

```txt
GET    /sop
POST   /sop
GET    /sop/:id
PATCH  /sop/:id
DELETE /sop/:id
POST   /sop/search
```

### 20.9 AI Gateway

```txt
POST /ai/prioritize-samples
POST /ai/review-result
POST /ai/analyze-qc
POST /ai/read-document
POST /ai/search-sop
POST /ai/supervisor-summary
```

---

## 21. AI Service API

Base URL:

```txt
/ai/v1
```

### 21.1 Sample Prioritization

```txt
POST /ai/v1/sample-prioritization
```

### 21.2 Result Review

```txt
POST /ai/v1/result-review
```

### 21.3 QC Anomaly

```txt
POST /ai/v1/qc-anomaly
```

### 21.4 Document Reader

```txt
POST /ai/v1/document-reader
```

### 21.5 SOP Assistant

```txt
POST /ai/v1/sop-assistant
```

### 21.6 Supervisor Summary

```txt
POST /ai/v1/supervisor-summary
```

---

## 22. Non-Functional Requirements

### 22.1 Performance

- Dashboard utama harus load kurang dari 3 detik.
- Update status sampel harus selesai kurang dari 1 detik.
- AI response awal ditargetkan kurang dari 5 detik untuk request sederhana.
- Upload dokumen harus memiliki progress indicator.

### 22.2 Availability

- Sistem harus tersedia untuk penggunaan internal lab selama jam operasional.
- Health check tersedia untuk frontend, backend, dan AI service.

### 22.3 Scalability

- Backend dan AI service harus dapat dipisah scaling-nya.
- Database schema harus mendukung multi-lab.

### 22.4 Maintainability

- Kode harus modular.
- Backend memakai module per domain.
- AI service memakai module per fitur AI.
- API terdokumentasi.

### 22.5 Usability

- UI harus sederhana untuk pengguna non-teknis.
- Status sampel harus jelas secara visual.
- Role-based menu harus mengurangi kompleksitas.

---

## 23. Security and Access Control

### 23.1 Authentication

MVP production memakai Supabase Auth.

Enterprise version dapat memakai Azure AD B2C / Microsoft Entra External ID.

### 23.2 Authorization

Setiap endpoint harus memeriksa role user.

Contoh:

- Analis tidak boleh memvalidasi hasil.
- Supervisor tidak boleh menghapus user.
- Auditor tidak boleh mengubah data.
- Admin dapat mengelola master data.

### 23.3 Data Protection

- Secret disimpan di environment variable atau Azure Key Vault.
- File dokumen disimpan di storage aman.
- API dilindungi token auth.
- Audit log tidak boleh dihapus oleh user biasa.

---

## 24. Audit Log Requirement

Audit log wajib mencatat:

- user ID;
- action;
- entity type;
- entity ID;
- metadata;
- timestamp.

Aktivitas yang wajib masuk audit log:

- user login;
- tambah sampel;
- update status sampel;
- input hasil;
- validasi supervisor;
- cek ulang;
- input QC;
- upload dokumen;
- update SOP;
- panggilan AI penting;
- perubahan role user.

---

## 25. Notification Requirement

Notifikasi digunakan untuk memberi tanda kepada user.

Contoh notifikasi:

- sampel baru ditambahkan;
- sampel menunggu review;
- supervisor meminta cek ulang;
- QC perlu perhatian;
- dokumen selesai diproses;
- AI menandai hasil perlu perhatian.

---

## 26. Feature Priority

### 26.1 Must Have

- Login multi-role
- Role-based dashboard
- Manajemen sampel
- Status workflow sampel
- Input hasil pemeriksaan
- Review supervisor
- QC harian
- Audit log
- Backend API
- Database Supabase

### 26.2 Should Have

- AI prioritas sampel
- AI review hasil
- AI deteksi QC
- Supervisor summary
- Dokumen lab
- SOP digital
- Notifikasi

### 26.3 Could Have

- Document Reader AI lanjutan
- SOP Assistant AI lanjutan
- Export PDF
- Integrasi barcode scanner
- Integrasi LIS / HIS
- Azure AD B2C enterprise

---

## 27. Success Metrics

### 27.1 Operasional

- Waktu pencatatan sampel berkurang.
- Sampel yang statusnya tidak jelas berkurang.
- Supervisor lebih cepat menemukan hasil yang perlu review.
- QC harian lebih rapi dan terdokumentasi.

### 27.2 Product Metrics

- Jumlah sampel yang diproses per hari.
- Rata-rata waktu dari sampel masuk ke review.
- Rata-rata waktu dari review ke validasi.
- Jumlah hasil yang diminta cek ulang.
- Jumlah QC perlu perhatian.
- Jumlah dokumen yang berhasil diproses.
- Jumlah query SOP.

### 27.3 Technical Metrics

- API latency.
- Error rate.
- AI response time.
- Upload success rate.
- Deployment success rate.

---

## 28. Development Roadmap

## Sprint 1 — Project Setup dan Database Foundation

### Objective

Membangun fondasi project production.

### Deliverables

- Monorepo production
- Frontend React setup
- Backend NestJS setup
- AI Service FastAPI setup
- Supabase project
- Database schema awal
- Environment config

### Backend Tasks

- Setup NestJS
- Setup Prisma
- Setup Supabase connection
- Setup global validation
- Setup API prefix `/api/v1`
- Setup health check endpoint

### Frontend Tasks

- Setup React + Vite
- Setup Tailwind
- Setup shadcn/ui
- Setup routing
- Setup layout dasar
- Setup TanStack Query

### AI Service Tasks

- Setup FastAPI
- Setup health check endpoint
- Setup folder modules
- Setup Pydantic schemas

### Database Tasks

- Create `users`
- Create `roles`
- Create `laboratories`
- Create `samples`
- Create `sample_status_logs`
- Create `audit_logs`

### Acceptance Criteria

- Frontend berjalan lokal.
- Backend berjalan lokal.
- AI service berjalan lokal.
- Backend terhubung ke Supabase.
- Health check semua service aktif.

---

## Sprint 2 — Auth, Role, dan User Management

### Objective

Membangun login production dan role-based access.

### Deliverables

- Supabase Auth
- Role Analis, Supervisor, Admin, Auditor
- Protected routes
- User profile
- Role-based sidebar

### Backend Tasks

- Sync Supabase user ke tabel `users`
- Middleware auth
- Guard role-based access
- Endpoint `/auth/me`
- Endpoint user management

### Frontend Tasks

- Login page
- Logout
- Protected route
- Role-based dashboard redirect
- Role-based sidebar

### Acceptance Criteria

- User bisa login.
- User mendapatkan role.
- Analis melihat menu analis.
- Supervisor melihat menu supervisor.
- Admin melihat menu admin.

---

## Sprint 3 — Sample Workflow

### Objective

Memindahkan workflow sampel ke backend dan database.

### Deliverables

- Form tambah sampel
- Daftar sampel
- Update status sampel
- Kirim ke review
- Status log
- Audit log

### Backend Tasks

- `POST /samples`
- `GET /samples`
- `GET /samples/:id`
- `PATCH /samples/:id/status`
- Create sample status log
- Create audit log

### Frontend Tasks

- Halaman Sampel
- Form Tambah Sampel
- Button Mulai Proses
- Button Kirim ke Review
- Status badge
- Filter status

### Database Tasks

- `samples`
- `sample_status_logs`
- `audit_logs`

### Acceptance Criteria

- Analis dapat menambah sampel.
- Status awal **Menunggu Pemeriksaan**.
- Analis dapat mengubah status menjadi **Dalam Proses**.
- Analis dapat mengirim ke **Menunggu Review**.
- Semua perubahan status tersimpan di database.

---

## Sprint 4 — Result Input dan Supervisor Review

### Objective

Membangun input hasil pemeriksaan dan review supervisor.

### Deliverables

- Input hasil pemeriksaan
- Review hasil oleh supervisor
- Validasi
- Cek ulang
- Catatan supervisor

### Backend Tasks

- `POST /samples/:id/results`
- `GET /samples/:id/results`
- `GET /reviews/pending`
- `POST /reviews/:sampleId/validate`
- `POST /reviews/:sampleId/request-recheck`

### Frontend Tasks

- Form input hasil
- Halaman Review Hasil
- Button Validasi
- Button Cek Ulang
- Catatan supervisor
- Dashboard Supervisor

### Database Tasks

- `sample_results`
- Review fields
- `audit_logs`

### Acceptance Criteria

- Analis dapat input hasil pemeriksaan.
- Supervisor melihat sampel **Menunggu Review**.
- Supervisor dapat **Validasi**.
- Supervisor dapat **Cek Ulang**.
- Status berubah sesuai keputusan supervisor.

---

## Sprint 5 — QC Harian dan Audit Log

### Objective

Membangun modul QC digital dan audit trail.

### Deliverables

- Form QC Harian
- Daftar QC
- Status QC
- Grafik tren QC
- Audit log page

### Backend Tasks

- `POST /qc-records`
- `GET /qc-records`
- `PATCH /qc-records/:id`
- `POST /qc-records/:id/review`
- `GET /audit-logs`

### Frontend Tasks

- Halaman QC Harian
- Form input QC
- Status QC badge
- Grafik tren QC
- Halaman Riwayat/Audit

### Database Tasks

- `qc_records`
- `qc_instruments`
- `audit_logs`

### Acceptance Criteria

- Analis dapat input QC.
- Supervisor dapat melihat QC.
- QC dapat diberi status stabil/perlu perhatian.
- Aktivitas penting tercatat di audit log.

---

## Sprint 6 — AI Service Dasar

### Objective

Membangun semua modul AI versi awal.

### Deliverables

- Sample Prioritization AI
- Lab Result Review AI
- QC Anomaly Detection AI
- Supervisor Summary AI
- AI logs

### AI Service Tasks

- `POST /ai/v1/sample-prioritization`
- `POST /ai/v1/result-review`
- `POST /ai/v1/qc-anomaly`
- `POST /ai/v1/supervisor-summary`
- Rule-based baseline
- Pydantic validation

### Backend Tasks

- AI gateway module
- Call FastAPI service
- Save `ai_analysis_logs`
- Expose AI result to frontend

### Frontend Tasks

- Show AI priority reason
- Show result review flag
- Show QC warning
- Show supervisor summary

### Acceptance Criteria

- Backend dapat memanggil AI service.
- AI service mengembalikan hasil konsisten.
- Frontend menampilkan hasil AI.
- Semua AI output tersimpan di `ai_analysis_logs`.

---

## Sprint 7 — Azure AI Integration

### Objective

Menghubungkan AI service ke Azure.

### Deliverables

- Azure OpenAI integration
- Azure Document Intelligence integration
- Azure AI Search integration
- Azure Blob Storage integration

### AI Service Tasks

- Azure OpenAI client
- Document Intelligence client
- AI Search client
- Blob Storage client
- Prompt templates
- Error handling

### Backend Tasks

- Document upload API
- Store file metadata
- Trigger document processing
- Store extracted data

### Frontend Tasks

- Upload dokumen
- Show OCR result
- SOP search interface
- AI summary card

### Acceptance Criteria

- User dapat upload dokumen.
- Dokumen tersimpan di storage.
- Dokumen dapat diproses.
- SOP dapat dicari.
- Ringkasan AI dapat ditampilkan.

---

## Sprint 8 — Deployment dan Monitoring

### Objective

Deploy sistem ke cloud dan siapkan monitoring.

### Deliverables

- Frontend deployed
- Backend deployed
- AI service deployed
- CI/CD GitHub Actions
- Application Insights
- Environment variables
- Production documentation

### Deployment Plan

- Frontend → Azure Static Web Apps
- Backend → Azure App Service / Azure Container Apps
- AI Service → Azure Container Apps
- Database → Supabase
- Storage → Azure Blob Storage
- Monitoring → Application Insights

### Acceptance Criteria

- Frontend bisa diakses publik.
- Backend API aktif.
- AI service aktif.
- CI/CD berjalan dari GitHub.
- Monitoring aktif.
- Dokumentasi deployment tersedia.

---

## 29. Risks and Mitigation

### Risiko 1 — Scope terlalu besar

**Mitigasi:**  
Bangun berdasarkan sprint. Jangan mulai dari semua AI sekaligus tanpa workflow dan database yang stabil.

### Risiko 2 — AI menghasilkan output yang dianggap diagnosis

**Mitigasi:**  
Semua output AI diberi batasan sebagai bantuan workflow internal. Tidak boleh memberi diagnosis pasien.

### Risiko 3 — Data belum cukup untuk training AI

**Mitigasi:**  
Mulai dengan rule-based baseline. Setelah data historis terkumpul, lanjutkan ke model ML.

### Risiko 4 — Integrasi Azure kompleks

**Mitigasi:**  
Buat wrapper service per Azure service. Gunakan fallback jika Azure API gagal.

### Risiko 5 — Role access tidak konsisten

**Mitigasi:**  
Terapkan guard backend dan protected route frontend. Jangan hanya mengandalkan UI.

### Risiko 6 — Data sensitif tidak aman

**Mitigasi:**  
Gunakan auth, RBAC, audit log, environment secret, storage policy, dan enkripsi.

### Risiko 7 — Data training AI belum merepresentasikan kondisi lab nyata

**Dampak:**  
Model AI awal berpotensi belum sepenuhnya sesuai dengan variasi data laboratorium nyata.

**Mitigasi:**  
Gunakan kombinasi dataset open-source, data sintetis, rule-based baseline, dan evaluasi manual oleh analis atau supervisor. Data operasional pengguna tidak digunakan untuk training tanpa izin dan anonimisasi.
---

## 30. Open Questions

1. Apakah MVP production hanya untuk satu laboratorium atau multi-lab?
2. Apakah data pasien akan disimpan atau hanya data sampel anonim?
3. Apakah integrasi dengan LIS/HIS diperlukan pada fase awal?
4. Apakah Supabase Auth cukup untuk fase pilot?
5. Apakah Azure AD B2C akan langsung disiapkan atau masuk fase enterprise?
6. Apakah laporan PDF menjadi fitur wajib di MVP?
7. Apakah barcode scanner dibutuhkan sejak awal?
8. Dataset apa yang akan digunakan untuk validasi awal AI result review?
9. Apakah SOP tersedia dalam format PDF, DOCX, atau teks?
10. Siapa yang berwenang menghapus atau membatalkan sampel?

---

## 31. Definition of Done

Satu fitur dianggap selesai jika:

- API backend tersedia;
- database terhubung;
- frontend terintegrasi dengan API;
- validasi input tersedia;
- role access diterapkan;
- audit log tercatat;
- error state tersedia;
- loading state tersedia;
- acceptance criteria terpenuhi;
- dokumentasi singkat tersedia.

---

## 32. Prioritas Implementasi

Urutan implementasi paling aman:

1. Database dan auth
2. Role-based access
3. Sample workflow
4. Supervisor review
5. QC harian
6. Audit log
7. AI service dasar
8. Azure AI integration
9. Deployment
10. Monitoring

Alasannya: AI membutuhkan data operasional. Workflow dan database harus stabil lebih dulu sebelum AI digunakan secara serius.

---

## 33. Kesimpulan PRD

LabCermat akan dikembangkan sebagai sistem production yang menggabungkan **workflow management**, **AI analytics**, dan **digital lab management**. Fokus utama tahap production adalah memindahkan prototype dari localStorage ke backend dan database, membangun role-based workflow yang stabil, lalu menambahkan AI service dan integrasi Azure secara bertahap.

Arsitektur final yang digunakan:

```txt
React Frontend
→ NestJS Backend
→ Supabase PostgreSQL
→ FastAPI AI Service
→ Azure AI Services
```

LabCermat harus tetap diposisikan sebagai sistem pendukung operasional laboratorium, bukan sistem diagnosis medis.
