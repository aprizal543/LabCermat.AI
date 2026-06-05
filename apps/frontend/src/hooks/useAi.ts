import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import { qcKeys } from '@/hooks/useQc';
import { sampleKeys } from '@/hooks/useSamples';
import { dashboardKeys } from '@/hooks/useDashboard';

// ─── Types ─────────────────────────────────────────────────────

export interface RankedSample {
  id: string;
  rank: number;
  score: number;
  reason: string;
  estimated_duration_minutes: number | null;
}

export interface PrioritizationResult {
  ranked_samples: RankedSample[];
  mode: string;
  processed_at: string;
}

export type FlagStatus = 'normal' | 'perlu_perhatian' | 'perlu_review_supervisor';

export interface ResultReviewResult {
  sample_id: string;
  flag_status: FlagStatus;
  reason: string;
  recommendation: string | null;
  mode: string;
  processed_at: string;
}

export type QcAiStatus = 'stabil' | 'perlu_perhatian' | 'potensi_drift';

export type QcAiMode = 'rule_based' | 'azure_ml_artifact' | 'fallback_rule_based' | (string & {});

export interface QcAnomalyResult {
  status: QcAiStatus;
  reason: string;
  suggestion: string | null;
  mode: QcAiMode;
  processed_at: string;
  // Azure ML artifact fields — present when mode=azure_ml_artifact, null otherwise
  confidence: number | null;
  probabilities: Record<string, number> | null;
  model_version: string | null;
  fallback_reason: string | null;
}

export interface SupervisorSummaryResult {
  summary: string;
  stats: {
    total_samples: number;
    validated: number;
    recheck: number;
    qc_issues: number;
    validation_rate: number;
    analis_bertugas?: string[];
  };
  focus_recommendations: string[];
  mode: string;
  processed_at: string;
}

export interface AiLog {
  id: string;
  analysisType: string;
  entityType: string | null;
  entityId: string | null;
  responseData: unknown;
  mode: string;
  createdAt: string;
}

// ─── Query keys ────────────────────────────────────────────────

export const aiKeys = {
  log:      (entityId: string, type?: string) => ['ai', 'log', entityId, type ?? ''] as const,
  priority: () => ['ai', 'priority'] as const,
  summary:  () => ['ai', 'summary'] as const,
};

// ─── useAiLog — fetch latest AI log for an entity ──────────────

export function useAiLog(entityId: string | undefined, analysisType?: string) {
  return useQuery<{ data: AiLog }, AxiosError>({
    queryKey: aiKeys.log(entityId ?? '', analysisType),
    queryFn: async () => {
      const params = analysisType ? `?type=${analysisType}` : '';
      const res = await apiClient.get<{ data: AiLog }>(`/ai/logs/${entityId}${params}`);
      return res.data;
    },
    enabled: Boolean(entityId),
    // 404 is expected when no log exists yet — treat as empty, not error
    retry: (failureCount, error) => {
      if (error.response?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

// ─── useTriggerPrioritization ──────────────────────────────────

export function useTriggerPrioritization() {
  const queryClient = useQueryClient();

  return useMutation<{ data: PrioritizationResult; message: string }, AxiosError>({
    mutationFn: async () => {
      const res = await apiClient.post<{ data: PrioritizationResult; message: string }>(
        '/ai/prioritize',
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.priority() });
    },
  });
}

// ─── useTriggerResultReview ────────────────────────────────────

export function useTriggerResultReview(sampleId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<{ data: ResultReviewResult; message: string }, AxiosError>({
    mutationFn: async () => {
      const res = await apiClient.post<{ data: ResultReviewResult; message: string }>(
        `/ai/review/${sampleId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      if (sampleId) {
        void queryClient.invalidateQueries({ queryKey: aiKeys.log(sampleId, 'result_review') });
        void queryClient.invalidateQueries({ queryKey: sampleKeys.detail(sampleId) });
      }
    },
  });
}

// ─── useTriggerQcAnomaly ───────────────────────────────────────

export function useTriggerQcAnomaly(recordId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<{ data: QcAnomalyResult; message: string }, AxiosError>({
    mutationFn: async () => {
      const res = await apiClient.post<{ data: QcAnomalyResult; message: string }>(
        `/ai/qc-anomaly/${recordId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      if (recordId) {
        void queryClient.invalidateQueries({ queryKey: aiKeys.log(recordId, 'qc_anomaly') });
        void queryClient.invalidateQueries({ queryKey: qcKeys.records() });
      }
    },
  });
}

// ─── useTriggerSupervisorSummary ───────────────────────────────

export function useTriggerSupervisorSummary() {
  const queryClient = useQueryClient();

  return useMutation<
    { data: SupervisorSummaryResult; message: string },
    AxiosError,
    { shiftHours?: number }
  >({
    mutationFn: async (vars) => {
      const res = await apiClient.post<{ data: SupervisorSummaryResult; message: string }>(
        '/ai/supervisor-summary',
        { shiftHours: vars.shiftHours ?? 8 },
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.summary() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.supervisor() });
    },
  });
}
