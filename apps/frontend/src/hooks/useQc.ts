import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import { QcStatus } from '@labcermat/shared-types';
import type { ApiResponse, PaginatedResponse } from '@labcermat/shared-types';

// ─── Types ─────────────────────────────────────────────────────

export interface QcInstrument {
  id: string;
  name: string;
  serialNumber: string | null;
  department: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QcRecord {
  id: string;
  instrumentId: string;
  controlType: string;
  controlValue: string;
  unit: string | null;
  lowerLimit: string;
  upperLimit: string;
  status: QcStatus;
  notes: string | null;
  recordedAt: string;
  createdAt: string;
  instrument: { name: string; department: string | null };
  recorder: { fullName: string };
}

export interface QcRecordDetail extends QcRecord {
  laboratoryId: string;
  instrument: { id: string; name: string; department: string | null };
  recorder: { id: string; fullName: string };
}

export interface CreateQcInput {
  instrumentId: string;
  controlType: string;
  controlValue: string;
  unit?: string;
  lowerLimit: string;
  upperLimit: string;
  notes?: string;
  recordedAt?: string;
}

export interface GetQcRecordsQuery {
  instrumentId?: string;
  status?: QcStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ─── Query keys ────────────────────────────────────────────────

export const qcKeys = {
  instruments:  () => ['qc', 'instruments'] as const,
  records:      () => ['qc', 'records'] as const,
  recordsList:  (query: GetQcRecordsQuery) => ['qc', 'records', 'list', query] as const,
  recordDetail: (id: string) => ['qc', 'records', 'detail', id] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────

export function useQcInstruments() {
  return useQuery<ApiResponse<QcInstrument[]>, AxiosError>({
    queryKey: qcKeys.instruments(),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<QcInstrument[]>>('/qc-instruments');
      return res.data;
    },
  });
}

export function useQcRecords(query: GetQcRecordsQuery = {}) {
  return useQuery<PaginatedResponse<QcRecord>, AxiosError>({
    queryKey: qcKeys.recordsList(query),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query.instrumentId) params.set('instrumentId', query.instrumentId);
      if (query.status)       params.set('status',       query.status);
      if (query.dateFrom)     params.set('dateFrom',     query.dateFrom);
      if (query.dateTo)       params.set('dateTo',       query.dateTo);
      if (query.page)         params.set('page',         String(query.page));
      if (query.limit)        params.set('limit',        String(query.limit));

      const res = await apiClient.get<PaginatedResponse<QcRecord>>(
        `/qc-records?${params.toString()}`,
      );
      return res.data;
    },
  });
}

export function useQcRecord(id: string | undefined) {
  return useQuery<ApiResponse<QcRecordDetail>, AxiosError>({
    queryKey: qcKeys.recordDetail(id ?? ''),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<QcRecordDetail>>(`/qc-records/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateQcRecord() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<QcRecord>, AxiosError, CreateQcInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiResponse<QcRecord>>('/qc-records', input);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qcKeys.records() });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'analis'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'supervisor'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}
