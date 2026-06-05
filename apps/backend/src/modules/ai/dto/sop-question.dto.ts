import { IsInt, IsOptional, IsString, MaxLength, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SopQuestionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  question!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  topK?: number;

  @IsOptional()
  @IsString()
  documentId?: string;
}

// ─── AI Service response shape (snake_case from FastAPI) ─────────────────────

export interface SopSourceRaw {
  document_id: string;
  title: string;
  section: string | null;
  source_page: number | null;
  chunk_index: number;
  score: number | null;
  snippet: string;
}

export interface SopQuestionAiResponse {
  answer: string;
  sources: SopSourceRaw[];
  mode: string;
  safety_note: string;
  fallback_reason: string | null;
  processed_at: string;
}
