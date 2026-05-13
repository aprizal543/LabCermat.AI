import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import { SamplePriority, SampleStatus } from '@labcermat/shared-types';
import type { ApiResponse, PaginatedResponse } from '@labcermat/shared-types';

// ─── Types ─────────────────────────────────────────────────────

export interface SampleSummary {
  id: string;
  sampleCode: string;
  sampleType: string;
  requestedTest: string;
  department: string | null;
  priority: SamplePriority;
  status: SampleStatus;
  notes: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; fullName: string };
}

export interface StatusLogEntry {
  id: string;
  previousStatus: SampleStatus | null;
  newStatus: SampleStatus;
  note: string | null;
  createdAt: string;
  changedByUser: { fullName: string };
}

export interface SampleDetail extends SampleSummary {
  laboratory: { id: string; name: string };
  statusLogs: StatusLogEntry[];
}

export interface SamplesQuery {
  page?: number;
  limit?: number;
  status?: SampleStatus;
  priority?: SamplePriority;
}

export interface CreateSampleInput {
  sampleType: string;
  requestedTest: string;
  department?: string;
  priority?: SamplePriority;
  notes?: string;
}

export interface UpdateStatusInput {
  id: string;
  status: SampleStatus;
  note?: string;
}

// ─── Query keys ────────────────────────────────────────────────

export const sampleKeys = {
  all:    () => ['samples'] as const,
  list:   (query: SamplesQuery) => ['samples', 'list', query] as const,
  detail: (id: string) => ['samples', 'detail', id] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────

export function useSamples(query: SamplesQuery = {}) {
  return useQuery<PaginatedResponse<SampleSummary>, AxiosError>({
    queryKey: sampleKeys.list(query),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query.page)     params.set('page',     String(query.page));
      if (query.limit)    params.set('limit',    String(query.limit));
      if (query.status)   params.set('status',   query.status);
      if (query.priority) params.set('priority', query.priority);

      const res = await apiClient.get<PaginatedResponse<SampleSummary>>(
        `/samples?${params.toString()}`,
      );
      return res.data;
    },
  });
}

export function useSampleDetail(id: string | undefined) {
  return useQuery<ApiResponse<SampleDetail>, AxiosError>({
    queryKey: sampleKeys.detail(id ?? ''),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<SampleDetail>>(`/samples/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateSample() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<SampleSummary>, AxiosError, CreateSampleInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiResponse<SampleSummary>>('/samples', input);
      return res.data;
    },
    onSuccess: () => {
      // Refresh daftar sampel dan dashboard analis
      void queryClient.invalidateQueries({ queryKey: sampleKeys.all() });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'analis'] });
    },
  });
}

export function useUpdateSampleStatus() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<Pick<SampleSummary, 'id' | 'sampleCode' | 'status' | 'updatedAt'>>, AxiosError, UpdateStatusInput>({
    mutationFn: async ({ id, status, note }) => {
      const res = await apiClient.patch<ApiResponse<Pick<SampleSummary, 'id' | 'sampleCode' | 'status' | 'updatedAt'>>>(
        `/samples/${id}/status`,
        { status, note },
      );
      return res.data;
    },
    onSuccess: (_data, variables) => {
      // Refresh daftar, detail sampel yang berubah, dan kedua dashboard
      void queryClient.invalidateQueries({ queryKey: sampleKeys.all() });
      void queryClient.invalidateQueries({ queryKey: sampleKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'analis'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'supervisor'] });
    },
  });
}
