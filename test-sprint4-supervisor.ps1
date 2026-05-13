# ============================================================
# LabCermat - Sprint 4 Test Script: Supervisor Transitions
# Sample ID dari Langkah 1: 1b3f1341-f2d0-464e-ac90-ea5d35245e68
# ============================================================

$SUPABASE_URL      = "https://dfxmpditdnprkwkakkhl.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeG1wZGl0ZG5wcmt3a2Fra2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NjAwNzksImV4cCI6MjA5NDEzNjA3OX0.vZXFXI6JUA15NJJXHRS6r1HnJ90UERqBZ2LSi6z_qGo"
$BASE_URL          = "http://localhost:3001/api/v1"
$SAMPLE_ID         = "1b3f1341-f2d0-464e-ac90-ea5d35245e68"

# ─── Login ───────────────────────────────────────────────────
Write-Host "`n=== LOGIN ===" -ForegroundColor Cyan
$analisLogin = @{ email = "analis@labcermat.demo"; password = "demo12345" } | ConvertTo-Json
$ANALIS_TOKEN = (Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/token?grant_type=password" `
  -Method Post -Body $analisLogin -ContentType "application/json" `
  -Headers @{ apikey = $SUPABASE_ANON_KEY }).access_token

$supLogin = @{ email = "supervisor@labcermat.demo"; password = "demo12345" } | ConvertTo-Json
$SUP_TOKEN = (Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/token?grant_type=password" `
  -Method Post -Body $supLogin -ContentType "application/json" `
  -Headers @{ apikey = $SUPABASE_ANON_KEY }).access_token
Write-Host "Login berhasil" -ForegroundColor Green

# ─── Helper ──────────────────────────────────────────────────
function Patch-Status($token, $id, $body, $label, $expectCode) {
  Write-Host "`n=== $label ===" -ForegroundColor Cyan
  try {
    $res = Invoke-RestMethod -Uri "$BASE_URL/samples/$id/status" -Method Patch `
      -Body ($body | ConvertTo-Json) -ContentType "application/json" `
      -Headers @{ Authorization = "Bearer $token" }
    if ($expectCode -eq 200) {
      Write-Host "PASS: status=$($res.data.status)  msg=$($res.message)" -ForegroundColor Green
    } else {
      Write-Host "FAIL: diharapkan $expectCode tapi berhasil 200" -ForegroundColor Red
    }
    return $res
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    $detail = ($_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue).message
    if ($code -eq $expectCode) {
      Write-Host "PASS: $code - $detail" -ForegroundColor Green
    } else {
      Write-Host "FAIL: diharapkan $expectCode, dapat $code - $detail" -ForegroundColor Red
    }
    return $null
  }
}

# ─── Setup: pastikan sampel ada di menunggu_review ───────────
Write-Host "`n=== CEK STATUS AWAL SAMPLE ===" -ForegroundColor Cyan
$s = Invoke-RestMethod -Uri "$BASE_URL/samples/$SAMPLE_ID" `
  -Headers @{ Authorization = "Bearer $ANALIS_TOKEN" }
Write-Host "Sample: $($s.data.sampleCode)  Status: $($s.data.status)"
if ($s.data.status -ne "menunggu_review") {
  Write-Host "Status bukan menunggu_review - setup ulang..." -ForegroundColor Yellow
  # Reset ke dalam_proses dulu jika minta_cek_ulang
  if ($s.data.status -eq "minta_cek_ulang") {
    Patch-Status $ANALIS_TOKEN $SAMPLE_ID @{ status = "dalam_proses" } "reset ke dalam_proses" 200 | Out-Null
  }
  Patch-Status $ANALIS_TOKEN $SAMPLE_ID @{ status = "menunggu_review" } "kirim ke menunggu_review" 200 | Out-Null
}

# ─── Test 1: Analis tidak boleh validasi (expect 403) ────────
Patch-Status $ANALIS_TOKEN $SAMPLE_ID @{ status = "tervalidasi" } `
  "Analis -> tervalidasi (expect 403)" 403

# ─── Test 2: Analis tidak boleh minta_cek_ulang (expect 403) ─
Patch-Status $ANALIS_TOKEN $SAMPLE_ID @{ status = "minta_cek_ulang"; note = "test" } `
  "Analis -> minta_cek_ulang (expect 403)" 403

# ─── Test 3: Analis tidak boleh batalkan (expect 403) ────────
Patch-Status $ANALIS_TOKEN $SAMPLE_ID @{ status = "dibatalkan"; note = "test" } `
  "Analis -> dibatalkan (expect 403)" 403

# ─── Test 4: Supervisor minta_cek_ulang tanpa note (expect 400) ──
Patch-Status $SUP_TOKEN $SAMPLE_ID @{ status = "minta_cek_ulang" } `
  "Supervisor -> minta_cek_ulang tanpa note (expect 400)" 400

# ─── Test 5: Supervisor minta_cek_ulang dengan note (expect 200) ─
Patch-Status $SUP_TOKEN $SAMPLE_ID @{ status = "minta_cek_ulang"; note = "Nilai leukosit perlu konfirmasi ulang" } `
  "Supervisor -> minta_cek_ulang dengan note (expect 200)" 200

# ─── Test 6: Analis kembali proses setelah minta_cek_ulang ───
Patch-Status $ANALIS_TOKEN $SAMPLE_ID @{ status = "dalam_proses" } `
  "Analis -> dalam_proses (minta_cek_ulang) (expect 200)" 200

# Kirim ke review lagi
Patch-Status $ANALIS_TOKEN $SAMPLE_ID @{ status = "menunggu_review" } `
  "Analis -> menunggu_review lagi (expect 200)" 200

# ─── Test 7: Supervisor batalkan tanpa note (expect 400) ─────
Patch-Status $SUP_TOKEN $SAMPLE_ID @{ status = "dibatalkan" } `
  "Supervisor -> dibatalkan tanpa note (expect 400)" 400

# ─── Test 8: Supervisor tidak boleh transisi analis (expect 403) ─
Patch-Status $SUP_TOKEN $SAMPLE_ID @{ status = "dalam_proses" } `
  "Supervisor -> dalam_proses (expect 403)" 403

Patch-Status $SUP_TOKEN $SAMPLE_ID @{ status = "menunggu_review" } `
  "Supervisor -> menunggu_review (expect 403)" 403

# ─── Test 9: Supervisor validasi (expect 200) ────────────────
Patch-Status $SUP_TOKEN $SAMPLE_ID @{ status = "tervalidasi"; note = "Semua parameter normal" } `
  "Supervisor -> tervalidasi (expect 200)" 200

# ─── Test 10: Status terminal tidak bisa diubah lagi (expect 400) ─
Patch-Status $SUP_TOKEN $SAMPLE_ID @{ status = "minta_cek_ulang"; note = "test" } `
  "tervalidasi -> minta_cek_ulang (expect 400, terminal)" 400

Patch-Status $ANALIS_TOKEN $SAMPLE_ID @{ status = "dalam_proses" } `
  "tervalidasi -> dalam_proses (expect 400, terminal)" 400

# ─── Test 11: Batalkan dari status non-terminal ──────────────
Write-Host "`n=== SETUP SAMPEL BARU UNTUK TEST BATALKAN ===" -ForegroundColor Cyan
$newBody = @{ sampleType = "Urin"; requestedTest = "Urinalisis"; priority = "rutin" } | ConvertTo-Json
$newSample = Invoke-RestMethod -Uri "$BASE_URL/samples" -Method Post `
  -Body $newBody -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $ANALIS_TOKEN" }
$NEW_ID = $newSample.data.id
Write-Host "Sampel baru: $($newSample.data.sampleCode) status=$($newSample.data.status)"

Patch-Status $SUP_TOKEN $NEW_ID @{ status = "dibatalkan"; note = "Sampel rusak saat pengiriman" } `
  "Supervisor batalkan dari menunggu_pemeriksaan (expect 200)" 200

# ─── Test 12: Batalkan yang sudah dibatalkan (expect 400, terminal) ─
Patch-Status $SUP_TOKEN $NEW_ID @{ status = "dibatalkan"; note = "coba lagi" } `
  "dibatalkan -> dibatalkan lagi (expect 400, terminal)" 400

Write-Host "`n=== LANGKAH 2 SELESAI ===" -ForegroundColor Cyan
Write-Host "Sample tervalidasi: $SAMPLE_ID"
Write-Host "Sample dibatalkan : $NEW_ID"
