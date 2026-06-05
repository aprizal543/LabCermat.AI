-- CreateTable
CREATE TABLE "ai_analysis_logs" (
    "id" UUID NOT NULL,
    "laboratory_id" UUID NOT NULL,
    "analysis_type" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "request_data" JSONB NOT NULL,
    "response_data" JSONB NOT NULL,
    "mode" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analysis_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ai_analysis_logs" ADD CONSTRAINT "ai_analysis_logs_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "laboratories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
