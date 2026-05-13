import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import type { SamplePriority, SampleStatus } from '@labcermat/shared-types';
import type { ApiResponse } from '@labcermat/shared-types';

// ─── Types ─────────────────────────────────────────────────────

export interface TopPrioritySample {
  id: string;
  sampleCode: string;
  sampleType: string;
  requestedTest: string;
  department: string | null;
  priority: SamplePriority;
  status: SampleStatus;
}

export interface AnalisDashboard {
  totalToday: number;
  dalamProses: number;
  menungguReview: number;
  tervalidasiHariIni: number;
  topPriority: TopPrioritySample[];
  qcHariIni: {
    stabil: number;
    perluPerhatian: number;
  };
}

export interface SupervisorSampleItem {
  id: string;
  sampleCode: string;
  sampleType: string;
  requestedTest: string;
  department: string | null;
  priority: SamplePriority;
  createdAt: string;
  creator: { id: string; fullName: string };
}

export interface SupervisorDashboard {
  menungguReview: number;
  tervalidasiHariIni: number;
  mintaCekUlang: number;
  sampelMenungguReview: SupervisorSampleItem[];
  qcPerluPerhatian: number;
}

// ─── Query keys ────────────────────────────────────────────────

export const dashboardKeys = {
  analis:     () => ['dashboard', 'analis'] as const,
  supervisor: () => ['dashboard', 'supervisor'] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────

export function useAnalysisDashboard() {
  return useQuery<ApiResponse<AnalisDashboard>, AxiosError>({
    queryKey: dashboardKeys.analis(),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<AnalisDashboard>>('/dashboard/analis');
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

export function useSupervisorDashboard() {
  return useQuery<ApiResponse<SupervisorDashboard>, AxiosError>({
    queryKey: dashboardKeys.supervisor(),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<SupervisorDashboard>>('/dashboard/supervisor');
      return res.data;
    },
    refetchInterval: 30_000,
  });
}
