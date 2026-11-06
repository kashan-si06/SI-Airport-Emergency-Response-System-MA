import { z } from 'zod';

import { request } from './client';
import {
  AckResult,
  Broadcast,
  Catalog,
  ChecklistListItem,
  CommandSummary,
  DeptStatus,
  Device,
  DispatchPreview,
  FieldReport,
  GeoPoint,
  Home,
  IncidentChecklist,
  IncidentDetail,
  IncidentSummary,
  LoginResult,
  Me,
  Page,
  Recipient,
  ResponderStatus,
  ScenarioTemplate,
  Task,
  TestAlert,
  TokenPair,
  UploadTicket,
  type Channel,
  type Severity,
  type UpdateType,
} from './schemas';

/* PRD §11.1 — versioned mobile surface plus shared incident resources. */

export const authApi = {
  login: (body: { username: string; password: string }) =>
    request('/mobile/v1/auth/login', { method: 'POST', body, schema: LoginResult, auth: false }),
  verifyMfa: (body: { challenge: string; code: string }) =>
    request('/mobile/v1/auth/login/mfa', { method: 'POST', body, schema: LoginResult, auth: false }),
  setNewPassword: (body: { challenge: string; newPassword: string }) =>
    request('/mobile/v1/auth/login/password', { method: 'POST', body, schema: LoginResult, auth: false }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request('/mobile/v1/auth/password', { method: 'POST', body, schema: TokenPair }),
  logout: (refreshToken: string) =>
    request('/mobile/v1/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }),
};

export const meApi = {
  get: () => request('/mobile/v1/me', { schema: Me }),
  setDuty: (onDuty: boolean, key: string) =>
    request('/mobile/v1/me/duty', { method: 'PATCH', body: { onDuty }, schema: Me, idempotencyKey: key }),
  setWhatsappOptIn: (optIn: boolean) =>
    request('/mobile/v1/me/whatsapp', { method: 'PATCH', body: { optIn }, schema: Me }),
  feedback: (body: { message: string; logs: unknown[] | null; device: Record<string, unknown> }) =>
    request('/mobile/v1/feedback', { method: 'POST', body }),
};

export type DeviceRegistration = {
  installationId: string;
  platform: 'ios' | 'android';
  pushToken: string | null;
  pushProvider: 'apns' | 'fcm' | null;
  model: string | null;
  osVersion: string | null;
  appVersion: string;
  permissions: {
    notifications: boolean;
    criticalAlerts: boolean | null;
    dndBypass: boolean | null;
    batteryUnrestricted: boolean | null;
    location: boolean;
    camera: boolean;
  };
};

export const deviceApi = {
  register: (body: DeviceRegistration) =>
    request('/mobile/v1/devices', { method: 'POST', body, schema: Device }),
  list: () => request('/mobile/v1/devices', { schema: z.array(Device) }),
  revoke: (id: string) => request(`/mobile/v1/devices/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  pushReceipt: (body: { notificationId: string; updateId: string | null; event: 'DELIVERED' | 'OPENED'; at: string }) =>
    request('/mobile/v1/push-receipts', { method: 'POST', body }),
  sendTestAlert: () => request('/mobile/v1/test-alert', { method: 'POST', schema: TestAlert }),
  getTestAlert: (id: string) => request(`/mobile/v1/test-alert/${encodeURIComponent(id)}`, { schema: TestAlert }),
  ackTestAlert: (id: string) =>
    request(`/mobile/v1/test-alert/${encodeURIComponent(id)}/ack`, { method: 'POST', schema: TestAlert }),
};

export const incidentApi = {
  home: () => request('/mobile/v1/home', { schema: Home }),
  history: (params: { q?: string; cursor?: string | null; days?: number }) =>
    request('/mobile/v1/incidents', {
      query: { scope: 'history', q: params.q, cursor: params.cursor, days: params.days },
      schema: Page(IncidentSummary),
    }),
  active: () => request('/mobile/v1/incidents', { query: { scope: 'active' }, schema: Page(IncidentSummary) }),
  detail: (id: string) => request(`/notifications/${encodeURIComponent(id)}`, { schema: IncidentDetail }),
  recipients: (id: string, scope: 'mine' | 'all') =>
    request(`/notifications/${encodeURIComponent(id)}/recipients`, { query: { department: scope }, schema: z.array(Recipient) }),
  command: (id: string) => request(`/notifications/${encodeURIComponent(id)}/command`, { schema: CommandSummary }),
  ack: (
    body: {
      notificationId: string;
      updateId: string | null;
      status: ResponderStatus;
      reason?: string | null;
      location?: GeoPoint | null;
      occurredAt: string;
    },
    key: string,
  ) => request('/mobile/v1/acks', { method: 'POST', body, schema: AckResult, idempotencyKey: key }),
};

export const checklistApi = {
  list: (scope: 'active' | 'resolved') =>
    request('/mobile/v1/checklists', { query: { scope }, schema: z.array(ChecklistListItem) }),
  forIncident: (notificationId: string) =>
    request(`/notifications/${encodeURIComponent(notificationId)}/checklists`, { schema: z.array(IncidentChecklist) }),
  updateTask: (
    taskId: string,
    body: {
      action: 'COMPLETE' | 'SKIP' | 'REOPEN';
      remarks?: string | null;
      skipReason?: string | null;
      attachmentIds?: string[];
      occurredAt: string;
      expectedVersion: number;
    },
    key: string,
  ) => request(`/tasks/${encodeURIComponent(taskId)}`, { method: 'PATCH', body, schema: Task, idempotencyKey: key }),
  setDeptStatus: (checklistId: string, body: { status: DeptStatus; occurredAt: string }, key: string) =>
    request(`/incident-checklists/${encodeURIComponent(checklistId)}/status`, {
      method: 'PATCH',
      body,
      schema: IncidentChecklist,
      idempotencyKey: key,
    }),
};

export const attachmentApi = {
  createUpload: (body: {
    ownerType: 'TASK' | 'FIELD_REPORT' | 'INCIDENT';
    ownerId: string | null;
    mime: string;
    size: number;
    takenAt: string | null;
  }) => request('/attachments', { method: 'POST', body, schema: UploadTicket }),
  confirm: (attachmentId: string) =>
    request(`/attachments/${encodeURIComponent(attachmentId)}/complete`, { method: 'POST' }),
};

export type FieldReportInput = {
  source: 'AIRLINE' | 'AIRPORT';
  airline: string | null;
  flightNumber: string | null;
  sector: string | null;
  personsOnBoard: number | null;
  emergencyTypeId: string;
  severity: Severity;
  headline: string;
  who: string;
  what: string;
  where: string;
  when: string;
  why: string;
  location: { text: string; pointId: string | null; geo: GeoPoint | null };
  scope: 'DEFAULT' | 'ALL_STATION';
  attachmentIds: string[];
  occurredAt: string;
};

export const fieldReportApi = {
  catalog: () => request('/mobile/v1/catalog', { schema: Catalog }),
  create: (body: FieldReportInput, key: string) =>
    request('/field-reports', { method: 'POST', body, schema: FieldReport, idempotencyKey: key }),
  mine: () => request('/field-reports', { query: { mine: true }, schema: z.array(FieldReport) }),
  pending: () => request('/field-reports', { query: { status: 'PENDING' }, schema: z.array(FieldReport) }),
  get: (id: string) => request(`/field-reports/${encodeURIComponent(id)}`, { schema: FieldReport }),
  templates: (emergencyTypeId: string) =>
    request('/mobile/v1/templates', { query: { emergencyTypeId }, schema: z.array(ScenarioTemplate) }),
  validate: (
    id: string,
    body: { templateId: string; severity: Severity; placeholderValues: Record<string, string>; scope: 'DEFAULT' | 'ALL_STATION' },
    key: string,
  ) =>
    request(`/field-reports/${encodeURIComponent(id)}/validate`, {
      method: 'POST',
      body,
      schema: IncidentSummary,
      idempotencyKey: key,
    }),
  reject: (id: string, reason: string, key: string) =>
    request(`/field-reports/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: { reason },
      schema: FieldReport,
      idempotencyKey: key,
    }),
};

export const opsApi = {
  incidentTemplate: (notificationId: string) =>
    request(`/notifications/${encodeURIComponent(notificationId)}/template`, { schema: ScenarioTemplate }),
  preview: (body: {
    templateId: string;
    notificationId: string | null;
    levelNo: number;
    channels: Channel[];
    placeholderValues: Record<string, string>;
    scope: 'DEFAULT' | 'ALL_STATION';
  }) => request('/notifications/preview', { method: 'POST', body, schema: DispatchPreview }),
  sendUpdate: (
    notificationId: string,
    body: { type: UpdateType; levelNo: number; channels: Channel[]; placeholderValues: Record<string, string> },
    key: string,
  ) =>
    request(`/notifications/${encodeURIComponent(notificationId)}/updates`, {
      method: 'POST',
      body,
      schema: IncidentDetail,
      idempotencyKey: key,
    }),
  ignore: (notificationId: string, body: { reason: 'FALSE_ALARM' | 'SENT_IN_ERROR' | 'DUPLICATE'; note: string | null }, key: string) =>
    request(`/notifications/${encodeURIComponent(notificationId)}/ignore`, {
      method: 'POST',
      body,
      schema: IncidentDetail,
      idempotencyKey: key,
    }),
  broadcast: (
    notificationId: string,
    body: { text: string; channels: Channel[]; audience: 'INVOLVED' | 'ALL' },
    key: string,
  ) =>
    request(`/notifications/${encodeURIComponent(notificationId)}/broadcasts`, {
      method: 'POST',
      body,
      schema: Broadcast,
      idempotencyKey: key,
    }),
  renotify: (notificationId: string, body: { recipientIds: string[]; channels: Channel[] }, key: string) =>
    request(`/notifications/${encodeURIComponent(notificationId)}/renotify`, {
      method: 'POST',
      body,
      idempotencyKey: key,
    }),
};

export const broadcastApi = {
  feed: (cursor?: string | null) =>
    request('/mobile/v1/broadcasts', { query: { cursor }, schema: Page(Broadcast) }),
};
