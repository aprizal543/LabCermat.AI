import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';

// ─── Types ─────────────────────────────────────────────────────

export interface SopSource {
  document_id: string;
  title: string;
  section: string | null;
  source_page: number | null;
  chunk_index: number;
  score: number | null;
  snippet: string;
}

export interface SopQuestionResult {
  answer: string;
  sources: SopSource[];
  mode: string;
  safety_note: string;
  fallback_reason: string | null;
  processed_at: string;
}

export interface SopQuestionRequest {
  question: string;
  topK?: number;
  documentId?: string;
}

// ─── useAskSopQuestion ─────────────────────────────────────────

export function useAskSopQuestion() {
  return useMutation<
    { data: SopQuestionResult; message: string },
    AxiosError,
    SopQuestionRequest
  >({
    mutationFn: async (vars) => {
      const res = await apiClient.post<{ data: SopQuestionResult; message: string }>(
        '/ai/sop-question',
        {
          question:   vars.question,
          topK:       vars.topK ?? 5,
          ...(vars.documentId ? { documentId: vars.documentId } : {}),
        },
      );
      return res.data;
    },
  });
}
