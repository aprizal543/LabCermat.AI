# UI Reference — LabCermat Prototype

## Visual Tone

LabCermat menggunakan tampilan medical-clean professional dashboard dengan nuansa putih, teal, biru klinis, slate, soft card, rounded corner, dan shadow ringan. UI harus terasa bersih, rapi, tenang, dan cocok untuk sistem operasional laboratorium.

## Sidebar Layout

Sidebar berada di sisi kiri, fixed, dengan background putih. Bagian atas berisi brand card LabCermat dengan icon laboratorium, nama produk, dan subtitle "Lab Management System".

Di bawah brand terdapat shift card:
- Shift Pagi
- Status Aktif
- Lab Klinik Sentosa
- Ringkasan jumlah sampel masuk dan QC perlu perhatian

Menu sidebar menggunakan icon kecil di kiri, label menu di kanan, dan active state berwarna teal.

Bagian bawah sidebar berisi user card:
- Nama user
- Email user
- Role user
- Tombol Keluar berwarna merah lembut

## Sidebar Analis

Menu untuk role analis:

1. Dashboard
2. Sampel
3. Persiapan Sampel
4. Analisis Hasil
5. QC Harian
6. Dokumen Lab
7. Riwayat
8. SOP Lab

## Sidebar Supervisor

Menu untuk role supervisor:

1. Dashboard
2. Review Hasil
3. QC Harian
4. Sampel
5. Riwayat
6. Dokumen Lab
7. SOP Lab

## Dashboard Analis Reference

Dashboard analis menampilkan:
- Topbar dengan subtitle "Ringkasan kerja analis dan supervisor lab"
- Title "Dashboard Operasional Laboratorium"
- Badge "Internal Lab Use"
- Nama user di kanan atas
- Card statistik operasional
- Section "Sampel Prioritas"
- Section "Aktivitas Terbaru"

Sampel prioritas menampilkan card sampel dengan:
- ID sampel
- Jenis pemeriksaan
- Jenis sampel dan departemen
- Jam masuk
- Status badge seperti "Menunggu Review", "Dalam Proses", "Menunggu Pemeriksaan"
- Badge prioritas seperti "Stat" atau "Tinggi"
- Catatan singkat

Aktivitas terbaru menampilkan timeline/card aktivitas seperti:
- Urutan sampel dioptimalkan
- Anomali hasil WBC terdeteksi
- Draft QC dibuat otomatis
- Worksheet hematologi diproses

## Dashboard Supervisor Reference

Dashboard supervisor menampilkan:
- Card statistik:
  - Menunggu Review
  - Tervalidasi
  - Minta Cek Ulang
  - Menunggu Pemeriksaan
- Section "Daftar Review Hasil"
- Section "Ringkasan Supervisor"
- Tombol "Validasi" dan "Cek Ulang" pada item review, tetapi untuk Sprint 2 masih placeholder/disabled

Dashboard supervisor fokus pada validasi dan review, bukan input sampel.

## Sprint 2 Scope

Pada Sprint 2, UI boleh mengikuti tampilan prototype, tetapi data masih placeholder.

Yang boleh dikerjakan:
- role-based sidebar
- user card di sidebar
- tombol logout
- dashboard analis placeholder
- dashboard supervisor placeholder
- route placeholder untuk menu yang belum dikerjakan

Yang tidak boleh dikerjakan:
- sample workflow fungsional
- validasi supervisor fungsional
- QC fungsional
- AI logic
- Azure integration