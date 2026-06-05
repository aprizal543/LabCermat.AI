import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';

// ─── Types ─────────────────────────────────────────────────────

export type SopDocumentStatus = 'pending' | 'parsed' | 'indexed' | 'failed';

export interface SopDocument {
  id: string;
  title: string;
  originalFilename: string;
  status: SopDocumentStatus;
  chunkCount: number;
  errorMessage: string | null;
  sizeBytes: number;
  indexedAt: string | null;
  createdAt: string;
  uploadedBy: { fullName: string };
}

export interface UploadSopDocumentInput {
  file: File;
  title?: string;
}

// ─── Query keys ────────────────────────────────────────────────

export const sopDocumentKeys = {
  all: () => ['sop-documents'] as const,
};

// ─── useSopDocuments — list ─────────────────────────────────────

export function useSopDocuments() {
  return useQuery<{ data: SopDocument[] }, AxiosError>({
    queryKey: sopDocumentKeys.all(),
    queryFn: async () => {
      const res = await apiClient.get<{ data: SopDocument[] }>('/sop-documents');
      return res.data;
    },
  });
}

// ─── useUploadSopDocument ───────────────────────────────────────

export function useUploadSopDocument() {
  const queryClient = useQueryClient();

  return useMutation<{ data: SopDocument; message: string }, AxiosError, UploadSopDocumentInput>({
    mutationFn: async ({ file, title }) => {
      const form = new FormData();
      form.append('file', file);
      if (title) form.append('title', title);

      const res = await apiClient.post<{ data: SopDocument; message: string }>(
        '/sop-documents/upload',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sopDocumentKeys.all() });
    },
  });
}

// ─── useDeleteSopDocument ───────────────────────────────────────

export function useDeleteSopDocument() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, AxiosError, string>({
    mutationFn: async (id) => {
      const res = await apiClient.delete<{ message: string }>(`/sop-documents/${id}`);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sopDocumentKeys.all() });
    },
  });
}
