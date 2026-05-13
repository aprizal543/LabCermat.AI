-- CreateTable
CREATE TABLE "sample_results" (
    "id" UUID NOT NULL,
    "sample_id" UUID NOT NULL,
    "parameter_name" VARCHAR(255) NOT NULL,
    "value" VARCHAR(100) NOT NULL,
    "unit" VARCHAR(50),
    "reference_min" VARCHAR(50),
    "reference_max" VARCHAR(50),
    "note" TEXT,
    "input_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sample_results_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sample_results" ADD CONSTRAINT "sample_results_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "samples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_results" ADD CONSTRAINT "sample_results_input_by_fkey" FOREIGN KEY ("input_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
