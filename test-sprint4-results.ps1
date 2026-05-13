# ============================================================
# LabCermat - Sprint 4 Test Script: Results Endpoints
# Jalankan backend terlebih dahulu: cd apps/backend && pnpm dev
# ============================================================

$SUPABASE_URL  = "https://dfxmpditdnprkwkakkhl.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeG1wZGl0ZG5wcmt3a2Fra2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NjAwNzksImV4cCI6MjA5NDEzNjA3OX0.vZXFXI6JUA15NJJXHRS6r1HnJ90UERqBZ2LSi6z_qGo"
$BASE_URL      = "http://localhost:3001/api/v1"

# ─── Step 1: Login analis ────────────────────────────────────
Write-Host "`n=== LOGIN ANALIS ===" -ForegroundColor Cyan
$loginBody = @{ email = "analis@labcermat.demo"; password = "demo12345" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/token?grant_type=password" `
  -Method Post -Body $loginBody -ContentType "application/json" `
  -Headers @{ "apikey" = $SUPABASE_ANON_KEY }
$ANALIS_TOKEN = $loginRes.access_token
Write-Host "Analis token: $($ANALIS_TOKEN.Substring(0,30))..." -ForegroundColor Green

# ─── Step 2: Login supervisor ────────────────────────────────
Write-Host "`n=== LOGIN SUPERVISOR ===" -ForegroundColor Cyan
$loginBody2 = @{ email = "supervisor@labcermat.demo"; password = "demo12345" } | ConvertTo-Json
$loginRes2 = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/token?grant_type=password" `
  -Method Post -Body $loginBody2 -ContentType "application/json" `
  -Headers @{ "apikey" = $SUPABASE_ANON_KEY }
$SUPERVISOR_TOKEN = $loginRes2.access_token
Write-Host "Supervisor token: $($SUPERVISOR_TOKEN.Substring(0,30))..." -ForegroundColor Green

# ─── Step 3: GET /samples - ambil sampel dalam_proses ────────
Write-Host "`n=== GET SAMPLES (status=dalam_proses) ===" -ForegroundColor Cyan
$samplesRes = Invoke-RestMethod -Uri "$BASE_URL/samples?status=dalam_proses&limit=1" `
  -Method Get -Headers @{ Authorization = "Bearer $ANALIS_TOKEN" }
Write-Host "Total dalam_proses: $($samplesRes.meta.total)"

if ($samplesRes.data.Count -eq 0) {
  Write-Host "Tidak ada sampel dalam_proses. Buat sampel baru dulu:" -ForegroundColor Yellow
  $newSample = @{
    sampleType    = "Darah Vena"
    requestedTest = "Hematologi Lengkap"
    department    = "Penyakit Dalam"
    priority      = "rutin"
  } | ConvertTo-Json
  $createRes = Invoke-RestMethod -Uri "$BASE_URL/samples" -Method Post `
    -Body $newSample -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $ANALIS_TOKEN" }
  $SAMPLE_ID = $createRes.data.id
  Write-Host "Sampel dibuat: $($createRes.data.sampleCode) (id: $SAMPLE_ID)"

  # Update ke dalam_proses
  $statusBody = @{ status = "dalam_proses" } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BASE_URL/samples/$SAMPLE_ID/status" -Method Patch `
    -Body $statusBody -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $ANALIS_TOKEN" } | Out-Null
  Write-Host "Status diupdate ke dalam_proses" -ForegroundColor Green
} else {
  $SAMPLE_ID = $samplesRes.data[0].id
  Write-Host "Menggunakan sampel: $($samplesRes.data[0].sampleCode) (id: $SAMPLE_ID)"
}

# ─── Step 4: POST /samples/:id/results (analis, status dalam_proses) ─────
Write-Host "`n=== POST /samples/:id/results (analis) ===" -ForegroundColor Cyan
$resultBody = @{
  parameterName = "Hemoglobin"
  value         = "12.5"
  unit          = "g/dL"
  referenceMin  = "12.0"
  referenceMax  = "16.0"
  note          = "Sampel jernih"
} | ConvertTo-Json

try {
  $createResult = Invoke-RestMethod -Uri "$BASE_URL/samples/$SAMPLE_ID/results" -Method Post `
    -Body $resultBody -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $ANALIS_TOKEN" }
  Write-Host "PASS: Hasil dibuat - id: $($createResult.data.id)" -ForegroundColor Green
  Write-Host "  parameterName : $($createResult.data.parameterName)"
  Write-Host "  value         : $($createResult.data.value) $($createResult.data.unit)"
  Write-Host "  referenceMin  : $($createResult.data.referenceMin)"
  Write-Host "  referenceMax  : $($createResult.data.referenceMax)"
  Write-Host "  inputter      : $($createResult.data.inputter.fullName)"
  Write-Host "  message       : $($createResult.message)"
  $RESULT_ID = $createResult.data.id
} catch {
  Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# ─── Step 5: POST results kedua (Leukosit) ───────────────────
Write-Host "`n=== POST /samples/:id/results kedua (Leukosit) ===" -ForegroundColor Cyan
$resultBody2 = @{
  parameterName = "Leukosit"
  value         = "8500"
  unit          = "/uL"
  referenceMin  = "4000"
  referenceMax  = "11000"
} | ConvertTo-Json
try {
  $res2 = Invoke-RestMethod -Uri "$BASE_URL/samples/$SAMPLE_ID/results" -Method Post `
    -Body $resultBody2 -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $ANALIS_TOKEN" }
  Write-Host "PASS: $($res2.data.parameterName) = $($res2.data.value) $($res2.data.unit)" -ForegroundColor Green
} catch {
  Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# ─── Step 6: GET /samples/:id/results (analis) ───────────────
Write-Host "`n=== GET /samples/:id/results (analis) ===" -ForegroundColor Cyan
try {
  $resultsGet = Invoke-RestMethod -Uri "$BASE_URL/samples/$SAMPLE_ID/results" `
    -Method Get -Headers @{ Authorization = "Bearer $ANALIS_TOKEN" }
  Write-Host "PASS: $($resultsGet.data.Count) hasil ditemukan" -ForegroundColor Green
  $resultsGet.data | ForEach-Object {
    Write-Host "  - $($_.parameterName): $($_.value) $($_.unit) [ref: $($_.referenceMin)-$($_.referenceMax)]"
  }
} catch {
  Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# ─── Step 7: GET /samples/:id/results (supervisor) ───────────
Write-Host "`n=== GET /samples/:id/results (supervisor) ===" -ForegroundColor Cyan
try {
  $supervisorGet = Invoke-RestMethod -Uri "$BASE_URL/samples/$SAMPLE_ID/results" `
    -Method Get -Headers @{ Authorization = "Bearer $SUPERVISOR_TOKEN" }
  Write-Host "PASS: Supervisor dapat baca $($supervisorGet.data.Count) hasil" -ForegroundColor Green
} catch {
  Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# ─── Step 8: POST results oleh supervisor (harus 403) ────────
Write-Host "`n=== POST results oleh supervisor (expect 403) ===" -ForegroundColor Cyan
try {
  Invoke-RestMethod -Uri "$BASE_URL/samples/$SAMPLE_ID/results" -Method Post `
    -Body $resultBody -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $SUPERVISOR_TOKEN" }
  Write-Host "FAIL: Seharusnya 403 tapi berhasil" -ForegroundColor Red
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -eq 403) {
    Write-Host "PASS: 403 Forbidden - supervisor ditolak input hasil" -ForegroundColor Green
  } else {
    Write-Host "FAIL: Unexpected status $statusCode - $($_.Exception.Message)" -ForegroundColor Red
  }
}

# ─── Step 9: POST results setelah status menunggu_review (harus 400) ─────
Write-Host "`n=== POST results setelah kirim ke review (expect 400) ===" -ForegroundColor Cyan
$moveToReview = @{ status = "menunggu_review" } | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE_URL/samples/$SAMPLE_ID/status" -Method Patch `
  -Body $moveToReview -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $ANALIS_TOKEN" } | Out-Null
Write-Host "Status diupdate ke menunggu_review"

$trombositBody = @{ parameterName = "Trombosit"; value = "250000" } | ConvertTo-Json
try {
  Invoke-RestMethod -Uri "$BASE_URL/samples/$SAMPLE_ID/results" -Method Post `
    -Body $trombositBody -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $ANALIS_TOKEN" }
  Write-Host "FAIL: Seharusnya 400 tapi berhasil" -ForegroundColor Red
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -eq 400) {
    Write-Host "PASS: 400 Bad Request - tidak bisa input hasil setelah menunggu_review" -ForegroundColor Green
  } else {
    Write-Host "FAIL: Unexpected status $statusCode" -ForegroundColor Red
  }
}

Write-Host "`n=== LANGKAH 1 SELESAI ===" -ForegroundColor Cyan
Write-Host "Sample ID untuk Langkah 2 (supervisor transitions): $SAMPLE_ID"
Write-Host "Status saat ini: menunggu_review - siap untuk test Langkah 2"
