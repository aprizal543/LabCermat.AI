import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@labcermat/shared-types';

// ─── Types ─────────────────────────────────────────────────────

export interface AuditLogUser {
  id: string;
  fullName: string;
  email: string;
  role: { name: string };
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: AuditLogUser | null;
}

export interface GetAuditLogsQuery {
  action?: string;
  entityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ─── Query keys ────────────────────────────────────────────────

export const auditLogKeys = {
  all:  () => ['audit-logs'] as const,
  list: (query: GetAuditLogsQuery) => ['audit-logs', 'list', query] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────

export function useAuditLogs(query: GetAuditLogsQuery = {}) {
  return useQuery<PaginatedResponse<AuditLog>, AxiosError>({
    queryKey: auditLogKeys.list(query),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query.action)     params.set('action',     query.action);
      if (query.entityType) params.set('entityType', query.entityType);
      if (query.userId)     params.set('userId',     query.userId);
      if (query.dateFrom)   params.set('dateFrom',   query.dateFrom);
      if (query.dateTo)     params.set('dateTo',     query.dateTo);
      if (query.page)       params.set('page',       String(query.page));
      if (query.limit)      params.set('limit',      String(query.limit));

      const res = await apiClient.get<PaginatedResponse<AuditLog>>(
        `/audit-logs?${params.toString()}`,
      );
      return res.data;
    },
  });
}
