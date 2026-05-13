-- CreateEnum
CREATE TYPE "QcStatus" AS ENUM ('stabil', 'perlu_perhatian');

-- CreateTable
CREATE TABLE "qc_instruments" (
    "id" UUID NOT NULL,
    "laboratory_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "serial_number" VARCHAR(100),
    "department" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qc_instruments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qc_records" (
    "id" UUID NOT NULL,
    "instrument_id" UUID NOT NULL,
    "laboratory_id" UUID NOT NULL,
    "control_type" VARCHAR(100) NOT NULL,
    "control_value" DECIMAL(10,4) NOT NULL,
    "unit" VARCHAR(50),
    "lower_limit" DECIMAL(10,4) NOT NULL,
    "upper_limit" DECIMAL(10,4) NOT NULL,
    "status" "QcStatus" NOT NULL,
    "recorded_by" UUID NOT NULL,
    "notes" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qc_records_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "qc_instruments" ADD CONSTRAINT "qc_instruments_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "laboratories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_records" ADD CONSTRAINT "qc_records_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "qc_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_records" ADD CONSTRAINT "qc_records_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "laboratories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_records" ADD CONSTRAINT "qc_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
