import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@labcermat/shared-types';
import { sampleKeys } from './useSamples';
import { dashboardKeys } from './useDashboard';

// ─── Types ─────────────────────────────────────────────────────

export interface SampleResult {
  id: string;
  sampleId: string;
  parameterName: string;
  value: string;
  unit: string | null;
  referenceMin: string | null;
  referenceMax: string | null;
  note: string | null;
  inputBy: string;
  createdAt: string;
  updatedAt: string;
  inputter: { fullName: string };
}

export interface CreateResultInput {
  parameterName: string;
  value: string;
  unit?: string;
  referenceMin?: string;
  referenceMax?: string;
  note?: string;
}

// ─── Query keys ────────────────────────────────────────────────

export const resultKeys = {
  bySample: (sampleId: string) => ['results', 'sample', sampleId] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────

export function useSampleResults(sampleId: string | undefined) {
  return useQuery<ApiResponse<SampleResult[]>, AxiosError>({
    queryKey: resultKeys.bySample(sampleId ?? ''),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<SampleResult[]>>(
        `/samples/${sampleId}/results`,
      );
      return res.data;
    },
    enabled: Boolean(sampleId),
  });
}

export function useCreateResult(sampleId: string) {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<SampleResult>, AxiosError, CreateResultInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiResponse<SampleResult>>(
        `/samples/${sampleId}/results`,
        input,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resultKeys.bySample(sampleId) });
      void queryClient.invalidateQueries({ queryKey: sampleKeys.detail(sampleId) });
      void queryClient.invalidateQueries({ queryKey: sampleKeys.all() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.analis() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.supervisor() });
    },
  });
}
