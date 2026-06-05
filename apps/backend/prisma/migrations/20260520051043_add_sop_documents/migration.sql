-- CreateEnum
CREATE TYPE "SopDocumentStatus" AS ENUM ('pending', 'parsed', 'indexed', 'failed');

-- CreateTable
CREATE TABLE "sop_documents" (
    "id" UUID NOT NULL,
    "laboratory_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "status" "SopDocumentStatus" NOT NULL DEFAULT 'pending',
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "uploaded_by_id" UUID NOT NULL,
    "indexed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sop_documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sop_documents" ADD CONSTRAINT "sop_documents_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "laboratories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sop_documents" ADD CONSTRAINT "sop_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
