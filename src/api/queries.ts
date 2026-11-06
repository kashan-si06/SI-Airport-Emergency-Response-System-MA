import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { pushSupported } from '@/notifications/setup';

import {
  broadcastApi,
  checklistApi,
  deviceApi,
  fieldReportApi,
  incidentApi,
  meApi,
  opsApi,
} from './endpoints';

export const qk = {
  me: ['me'] as const,
  home: ['home'] as const,
  activeIncidents: ['incident', 'active'] as const,
  history: (q: string) => ['history', q] as const,
  incident: (id: string) => ['incident', id] as const,
  recipients: (id: string, scope: 'mine' | 'all') => ['incident', id, 'recipients', scope] as const,
  command: (id: string) => ['command', id] as const,
  checklists: (scope: 'active' | 'resolved') => ['checklists', scope] as const,
  incidentChecklists: (id: string) => ['checklist', id] as const,
  catalog: ['catalog'] as const,
  myReports: ['fieldReports', 'mine'] as const,
  pendingReports: ['fieldReports', 'pending'] as const,
  report: (id: string) => ['fieldReports', id] as const,
  templates: (emergencyTypeId: string) => ['templates', emergencyTypeId] as const,
  incidentTemplate: (id: string) => ['templates', 'incident', id] as const,
  broadcasts: ['broadcasts'] as const,
  devices: ['devices'] as const,
};

/* Live screens poll while visible: push is the wake-up signal, fetch is the
   source of truth (PRD §11.3 "push + fetch for mobile"). */
const LIVE_MS = 10_000;
/** Without push, polling is the only way a new alert is noticed. */
const HOME_MS = pushSupported ? LIVE_MS : 4_000;
const COMMAND_MS = 5_000;

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: meApi.get, staleTime: 60_000 });

export const useHome = () =>
  useQuery({ queryKey: qk.home, queryFn: incidentApi.home, refetchInterval: HOME_MS });

export const useActiveIncidents = (enabled = true) =>
  useQuery({
    queryKey: qk.activeIncidents,
    queryFn: async () => (await incidentApi.active()).items,
    refetchInterval: LIVE_MS,
    enabled,
  });

export const useIncident = (id: string) =>
  useQuery({ queryKey: qk.incident(id), queryFn: () => incidentApi.detail(id), refetchInterval: LIVE_MS });

export const useRecipients = (id: string, scope: 'mine' | 'all', enabled = true) =>
  useQuery({
    queryKey: qk.recipients(id, scope),
    queryFn: () => incidentApi.recipients(id, scope),
    refetchInterval: LIVE_MS,
    enabled,
  });

export const useCommand = (id: string, enabled = true) =>
  useQuery({ queryKey: qk.command(id), queryFn: () => incidentApi.command(id), refetchInterval: COMMAND_MS, enabled });

export const useChecklists = (scope: 'active' | 'resolved') =>
  useQuery({ queryKey: qk.checklists(scope), queryFn: () => checklistApi.list(scope), refetchInterval: scope === 'active' ? LIVE_MS : false });

export const useIncidentChecklists = (id: string, enabled = true) =>
  useQuery({
    queryKey: qk.incidentChecklists(id),
    queryFn: () => checklistApi.forIncident(id),
    refetchInterval: LIVE_MS,
    enabled,
  });

export const useCatalog = () =>
  useQuery({ queryKey: qk.catalog, queryFn: fieldReportApi.catalog, staleTime: 6 * 60 * 60 * 1000 });

export const useMyReports = () =>
  useQuery({ queryKey: qk.myReports, queryFn: fieldReportApi.mine, refetchInterval: LIVE_MS });

export const usePendingReports = (enabled: boolean) =>
  useQuery({ queryKey: qk.pendingReports, queryFn: fieldReportApi.pending, refetchInterval: LIVE_MS, enabled });

export const useFieldReport = (id: string) =>
  useQuery({ queryKey: qk.report(id), queryFn: () => fieldReportApi.get(id), refetchInterval: LIVE_MS });

export const useTemplates = (emergencyTypeId: string | null) =>
  useQuery({
    queryKey: qk.templates(emergencyTypeId ?? ''),
    queryFn: () => fieldReportApi.templates(emergencyTypeId!),
    enabled: !!emergencyTypeId,
  });

export const useIncidentTemplate = (id: string) =>
  useQuery({ queryKey: qk.incidentTemplate(id), queryFn: () => opsApi.incidentTemplate(id) });

export const useBroadcasts = () =>
  useInfiniteQuery({
    queryKey: qk.broadcasts,
    queryFn: ({ pageParam }) => broadcastApi.feed(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: LIVE_MS,
  });

export const useHistory = (q: string) =>
  useInfiniteQuery({
    queryKey: qk.history(q),
    queryFn: ({ pageParam }) => incidentApi.history({ q: q || undefined, cursor: pageParam, days: q ? undefined : 90 }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

export const useDevices = () => useQuery({ queryKey: qk.devices, queryFn: deviceApi.list });
