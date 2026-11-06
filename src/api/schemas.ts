import { z } from 'zod';

/* ───────────────────────── Enums (PRD §10.2) ───────────────────────── */

export const Severity = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
export type Severity = z.infer<typeof Severity>;

export const IncidentStatus = z.enum([
  'PENDING_VALIDATION',
  'INITIATED',
  'DISPATCHING',
  'ACTIVE',
  'TERMINATED',
  'CLOSED',
  'CANCELLED',
  'REJECTED',
]);
export type IncidentStatus = z.infer<typeof IncidentStatus>;

export const UpdateType = z.enum([
  'INITIAL',
  'UPDATE',
  'AEOC_ACTIVATION',
  'TERMINATION',
  'IGNORE',
  'CUSTOM',
  'BROADCAST',
]);
export type UpdateType = z.infer<typeof UpdateType>;

export const Channel = z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'IVRS', 'PUSH']);
export type Channel = z.infer<typeof Channel>;

export const RecipientStatus = z.enum(['NOT_NOTIFIED', 'NOTIFIED', 'ACKNOWLEDGED', 'NO_RESPONSE', 'FAILED']);
export type RecipientStatus = z.infer<typeof RecipientStatus>;

export const ResponderStatus = z.enum(['ACKNOWLEDGED', 'RESPONDING', 'ON_SCENE', 'UNABLE']);
export type ResponderStatus = z.infer<typeof ResponderStatus>;

export const TaskStatus = z.enum(['PENDING', 'COMPLETED', 'SKIPPED', 'CANCELLED']);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const DeptStatus = z.enum(['PENDING', 'IN_PROGRESS', 'DEPLOYED', 'COMPLETED']);
export type DeptStatus = z.infer<typeof DeptStatus>;

export const FieldReportStatus = z.enum(['PENDING', 'BROADCAST', 'REJECTED']);
export type FieldReportStatus = z.infer<typeof FieldReportStatus>;

export const Permission = z.enum([
  'incident.view.all',
  'incident.ack',
  'responder.status',
  'checklist.execute',
  'fieldreport.create',
  'fieldreport.validate',
  'incident.update',
  'incident.ignore',
  'incident.broadcast',
  'command.view',
  'command.view.dept',
  'statement.approve',
]);
export type Permission = z.infer<typeof Permission>;

/* ───────────────────────── Shared shapes ───────────────────────── */

const isoDate = z.string().min(1);

export const PersonRef = z.object({
  id: z.string(),
  name: z.string(),
  designation: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});
export type PersonRef = z.infer<typeof PersonRef>;

export const DepartmentRef = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});
export type DepartmentRef = z.infer<typeof DepartmentRef>;

export const GeoPoint = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().nullable().optional(),
});
export type GeoPoint = z.infer<typeof GeoPoint>;

export const Attachment = z.object({
  id: z.string(),
  mime: z.string(),
  url: z.string(),
  thumbnailUrl: z.string().nullable().optional(),
  takenAt: isoDate.nullable().optional(),
  uploadedBy: PersonRef.nullable().optional(),
  caption: z.string().nullable().optional(),
});
export type Attachment = z.infer<typeof Attachment>;

/* ───────────────────────── Session / profile ───────────────────────── */

export const TokenPair = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  /** Seconds until access token expiry. */
  expiresIn: z.number(),
});
export type TokenPair = z.infer<typeof TokenPair>;

/** Each sign-in response either grants the session or names the step still owed. */
export const LoginResult = z.union([
  TokenPair,
  z.object({ mfaRequired: z.literal(true), challenge: z.string() }),
  z.object({ passwordChangeRequired: z.literal(true), challenge: z.string() }),
]);
export type LoginResult = z.infer<typeof LoginResult>;

export const ContactPoint = z.object({
  type: z.enum(['EMAIL', 'MOBILE', 'WHATSAPP']),
  value: z.string(),
  verified: z.boolean(),
});

export const Me = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    employeeId: z.string().nullable(),
    designation: z.string().nullable(),
    department: DepartmentRef.nullable(),
    roles: z.array(z.string()),
    adManaged: z.boolean(),
  }),
  permissions: z.array(z.string()).transform((list) =>
    list.filter((p): p is Permission => Permission.safeParse(p).success),
  ),
  contactPoints: z.array(ContactPoint),
  whatsappOptIn: z.boolean(),
  whatsappOptInAt: isoDate.nullable(),
  onDuty: z.boolean(),
  settings: z.object({
    airportName: z.string(),
    aoccPhone: z.string(),
    appLockMinutes: z.number().int().positive(),
    ackDeadlineSeconds: z.number().int().positive(),
    restrictOnCompromisedDevice: z.boolean(),
  }),
});
export type Me = z.infer<typeof Me>;

/* ───────────────────────── Incidents ───────────────────────── */

export const MyIncidentState = z.object({
  recipientStatus: RecipientStatus,
  responderStatus: ResponderStatus.nullable(),
  /** The stage the user is expected to acknowledge, if any. */
  pendingAckUpdateId: z.string().nullable(),
  ackedAt: isoDate.nullable(),
  ackChannel: Channel.nullable(),
  unableReason: z.string().nullable(),
});
export type MyIncidentState = z.infer<typeof MyIncidentState>;

export const IncidentSummary = z.object({
  id: z.string(),
  displayId: z.string(),
  title: z.string(),
  emergencyType: z.string(),
  messageType: z.string(),
  department: DepartmentRef,
  severity: Severity,
  status: IncidentStatus,
  aeocActive: z.boolean(),
  isDrill: z.boolean(),
  sensitive: z.boolean(),
  location: z.string().nullable(),
  createdAt: isoDate,
  lastActivityAt: isoDate,
  lastUpdateType: UpdateType,
  my: MyIncidentState,
  ack: z.object({ notified: z.number().int(), acknowledged: z.number().int() }),
  tasks: z.object({ done: z.number().int(), total: z.number().int() }).nullable(),
});
export type IncidentSummary = z.infer<typeof IncidentSummary>;

export const Flight = z.object({
  number: z.string(),
  operator: z.string().nullable(),
  aircraftType: z.string().nullable(),
  sector: z.string().nullable(),
  scheduledAt: isoDate.nullable(),
  personsOnBoard: z.number().int().nullable(),
});
export type Flight = z.infer<typeof Flight>;

export const TimelineEntry = z.object({
  id: z.string(),
  kind: z.enum(['STAGE', 'BROADCAST', 'FIELD_UPDATE', 'CHECKLIST', 'STATUS']),
  updateType: UpdateType.nullable(),
  title: z.string(),
  body: z.string().nullable(),
  at: isoDate,
  by: PersonRef.nullable(),
  channels: z.array(Channel).nullable(),
  ackRequired: z.boolean().optional(),
});
export type TimelineEntry = z.infer<typeof TimelineEntry>;

export const DepartmentProgress = z.object({
  department: DepartmentRef,
  deptStatus: DeptStatus,
  done: z.number().int(),
  total: z.number().int(),
  spoc: PersonRef.nullable(),
});
export type DepartmentProgress = z.infer<typeof DepartmentProgress>;

export const IncidentDetail = IncidentSummary.extend({
  heading: z.string(),
  body: z.string(),
  facts: z.array(z.object({ label: z.string(), value: z.string() })),
  flight: Flight.nullable(),
  incidentCommander: PersonRef.nullable(),
  timeline: z.array(TimelineEntry),
  attachments: z.array(Attachment),
  departments: z.array(DepartmentProgress),
  sourceFieldReportId: z.string().nullable(),
  terminatedAt: isoDate.nullable(),
  closedAt: isoDate.nullable(),
  /** Template levels the operator may send next (PRD FR-UPD-03). */
  availableStages: z
    .array(z.object({ levelNo: z.number().int(), updateType: UpdateType, name: z.string() }))
    .default([]),
});
export type IncidentDetail = z.infer<typeof IncidentDetail>;

export const Home = z.object({
  serverTime: isoDate,
  drillActive: z.boolean(),
  onDuty: z.boolean(),
  pendingAck: z.array(IncidentSummary),
  active: z.array(IncidentSummary),
  recent: z.array(IncidentSummary),
  pendingFieldReports: z.number().int().nullable(),
});
export type Home = z.infer<typeof Home>;

export const Page = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });

export const Recipient = z.object({
  id: z.string(),
  name: z.string(),
  designation: z.string().nullable(),
  department: DepartmentRef.nullable(),
  external: z.boolean(),
  status: RecipientStatus,
  responderStatus: ResponderStatus.nullable(),
  ackAt: isoDate.nullable(),
  ackChannel: Channel.nullable(),
  phone: z.string().nullable(),
  channelsAttempted: z.array(Channel),
  unableReason: z.string().nullable(),
});
export type Recipient = z.infer<typeof Recipient>;

export const CommandSummary = z.object({
  incident: IncidentSummary,
  incidentCommander: PersonRef.nullable(),
  progress: z.object({ done: z.number().int(), total: z.number().int() }),
  departments: z.array(DepartmentProgress),
  ack: z.object({
    notified: z.number().int(),
    acknowledged: z.number().int(),
    responding: z.number().int(),
    onScene: z.number().int(),
    unable: z.number().int(),
    noResponse: z.number().int(),
    failed: z.number().int(),
    pending: z.number().int(),
  }),
  ackByDepartment: z.array(
    z.object({ department: DepartmentRef, notified: z.number().int(), acknowledged: z.number().int() }),
  ),
  nonResponders: z.array(Recipient),
  closeAllowed: z.boolean(),
});
export type CommandSummary = z.infer<typeof CommandSummary>;

/* ───────────────────────── Acknowledgement ───────────────────────── */

export const AckResult = z.object({
  notificationId: z.string(),
  my: MyIncidentState,
});
export type AckResult = z.infer<typeof AckResult>;

/* ───────────────────────── Checklists ───────────────────────── */

export const Task = z.object({
  id: z.string(),
  order: z.number().int(),
  text: z.string(),
  mandatory: z.boolean(),
  photoRequired: z.boolean(),
  assigneeRole: z.string().nullable(),
  estMinutes: z.number().int().nullable(),
  tip: z.string().nullable(),
  status: TaskStatus,
  remarks: z.string().nullable(),
  completedBy: PersonRef.nullable(),
  completedAt: isoDate.nullable(),
  skipReason: z.string().nullable(),
  skipApprovedBy: PersonRef.nullable(),
  attachments: z.array(Attachment),
  adHoc: z.boolean(),
  version: z.number().int(),
});
export type Task = z.infer<typeof Task>;

export const IncidentChecklist = z.object({
  id: z.string(),
  title: z.string(),
  incident: IncidentSummary,
  department: DepartmentRef,
  deptStatus: DeptStatus,
  tasks: z.array(Task),
});
export type IncidentChecklist = z.infer<typeof IncidentChecklist>;

export const ChecklistListItem = z.object({
  id: z.string(),
  title: z.string(),
  incident: IncidentSummary,
  department: DepartmentRef,
  deptStatus: DeptStatus,
  done: z.number().int(),
  total: z.number().int(),
  mandatoryOpen: z.number().int(),
});
export type ChecklistListItem = z.infer<typeof ChecklistListItem>;

/* ───────────────────────── Field reports ───────────────────────── */

export const FieldReport = z.object({
  id: z.string(),
  displayId: z.string(),
  source: z.enum(['AIRLINE', 'AIRPORT']),
  airline: z.string().nullable(),
  flightNumber: z.string().nullable(),
  sector: z.string().nullable(),
  personsOnBoard: z.number().int().nullable(),
  emergencyType: z.object({ id: z.string(), name: z.string() }),
  severity: Severity,
  headline: z.string(),
  who: z.string(),
  what: z.string(),
  where: z.string(),
  when: z.string(),
  why: z.string(),
  location: z.object({ text: z.string(), pointId: z.string().nullable(), geo: GeoPoint.nullable() }),
  scope: z.enum(['DEFAULT', 'ALL_STATION']),
  status: FieldReportStatus,
  notificationId: z.string().nullable(),
  notificationDisplayId: z.string().nullable(),
  rejectReason: z.string().nullable(),
  reporter: PersonRef.extend({ department: DepartmentRef.nullable() }),
  attachments: z.array(Attachment),
  createdAt: isoDate,
  validationDueAt: isoDate.nullable(),
});
export type FieldReport = z.infer<typeof FieldReport>;

/* ───────────────────────── Reference data ───────────────────────── */

export const CatalogEmergencyType = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  category: z.enum(['AIRCRAFT', 'AIRPORT', 'OVERLAPPED']),
  defaultSeverity: Severity,
  sensitive: z.boolean(),
});
export type CatalogEmergencyType = z.infer<typeof CatalogEmergencyType>;

export const LocationPoint = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['RUNWAY', 'TAXIWAY', 'STAND', 'GATE', 'TERMINAL', 'APRON', 'BUILDING', 'OTHER']),
  geo: GeoPoint.nullable(),
});
export type LocationPoint = z.infer<typeof LocationPoint>;

export const Catalog = z.object({
  emergencyTypes: z.array(CatalogEmergencyType),
  airlines: z.array(z.object({ iata: z.string(), icao: z.string(), name: z.string() })),
  locations: z.array(LocationPoint),
  departments: z.array(DepartmentRef),
});
export type Catalog = z.infer<typeof Catalog>;

export const ManualTag = z.object({
  key: z.string(),
  label: z.string(),
  mandatory: z.boolean(),
  /** Prefill derived server-side from the field report or prior stage. */
  value: z.string().nullable(),
});
export type ManualTag = z.infer<typeof ManualTag>;

export const TemplateLevel = z.object({
  levelNo: z.number().int(),
  updateType: UpdateType,
  name: z.string(),
  ackRequired: z.boolean(),
  channels: z.array(Channel),
  heading: z.string(),
  body: z.string(),
  manualTags: z.array(ManualTag),
});
export type TemplateLevel = z.infer<typeof TemplateLevel>;

export const ScenarioTemplate = z.object({
  id: z.string(),
  version: z.number().int(),
  department: DepartmentRef,
  emergencyType: z.object({ id: z.string(), name: z.string() }),
  messageType: z.object({ id: z.string(), name: z.string() }),
  severity: Severity,
  levels: z.array(TemplateLevel),
});
export type ScenarioTemplate = z.infer<typeof ScenarioTemplate>;

export const DispatchPreview = z.object({
  recipientCount: z.number().int(),
  byDepartment: z.array(z.object({ department: DepartmentRef, count: z.number().int() })),
  channels: z.array(Channel),
  renderedHeading: z.string(),
  renderedBody: z.string(),
  missingMandatory: z.array(z.string()),
});
export type DispatchPreview = z.infer<typeof DispatchPreview>;

/* ───────────────────────── Broadcasts ───────────────────────── */

export const Broadcast = z.object({
  id: z.string(),
  notificationId: z.string(),
  incidentDisplayId: z.string(),
  incidentTitle: z.string(),
  severity: Severity,
  isDrill: z.boolean(),
  text: z.string(),
  channels: z.array(Channel),
  sentBy: PersonRef,
  sentAt: isoDate,
});
export type Broadcast = z.infer<typeof Broadcast>;

/* ───────────────────────── Devices ───────────────────────── */

export const Device = z.object({
  id: z.string(),
  platform: z.enum(['ios', 'android']),
  model: z.string().nullable(),
  osVersion: z.string().nullable(),
  appVersion: z.string().nullable(),
  verifiedAt: isoDate.nullable(),
  lastSeen: isoDate.nullable(),
  degraded: z.boolean(),
  current: z.boolean(),
});
export type Device = z.infer<typeof Device>;

export const TestAlert = z.object({
  testId: z.string(),
  status: z.enum(['DISPATCHED', 'DELIVERED', 'ACKNOWLEDGED', 'FAILED']),
  sentAt: isoDate,
});
export type TestAlert = z.infer<typeof TestAlert>;

export const UploadTicket = z.object({
  attachmentId: z.string(),
  uploadUrl: z.string(),
  method: z.enum(['PUT', 'POST']),
  headers: z.record(z.string(), z.string()),
});
export type UploadTicket = z.infer<typeof UploadTicket>;

export const ApiErrorBody = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
