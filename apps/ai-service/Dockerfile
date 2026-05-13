# ============================================================
# LabCermat AI Service — Dockerfile
# Sprint 1: skeleton only
# ============================================================

FROM python:3.11-slim

WORKDIR /app

# Install dependencies dulu (layer di-cache jika requirements tidak berubah)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY app/ ./app/

# Port yang diekspos
EXPOSE 8000

# Jalankan dengan uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
