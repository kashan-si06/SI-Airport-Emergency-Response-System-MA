import { create } from 'zustand';

import type { GeoPoint, Severity } from '@/api/schemas';
import { readJSON, secureCache, writeJSON } from '@/lib/storage';
import type { LocalAttachment } from '@/offline/outbox';

export type RaiseDraft = {
  source: 'AIRLINE' | 'AIRPORT' | null;
  emergencyTypeId: string | null;
  airline: string | null;
  flightNumber: string;
  sector: string;
  personsOnBoard: string;
  severity: Severity | null;
  headline: string;
  who: string;
  what: string;
  where: string;
  when: string;
  why: string;
  locationText: string;
  pointId: string | null;
  geo: GeoPoint | null;
  scope: 'DEFAULT' | 'ALL_STATION';
  photos: LocalAttachment[];
};

export const emptyDraft = (): RaiseDraft => ({
  source: null,
  emergencyTypeId: null,
  airline: null,
  flightNumber: '',
  sector: '',
  personsOnBoard: '',
  severity: null,
  headline: '',
  who: '',
  what: '',
  where: '',
  when: '',
  why: '',
  locationText: '',
  pointId: null,
  geo: null,
  scope: 'DEFAULT',
  photos: [],
});

const KEY = 'ens.raiseDraft.v1';

type State = {
  draft: RaiseDraft;
  set: (patch: Partial<RaiseDraft>) => void;
  reset: () => void;
  load: () => void;
};

/** Survives app restarts so an interrupted report is never lost. */
export const useRaiseDraft = create<State>((set, get) => ({
  draft: emptyDraft(),
  set: (patch) => {
    const draft = { ...get().draft, ...patch };
    writeJSON(secureCache(), KEY, draft);
    set({ draft });
  },
  reset: () => {
    secureCache().remove(KEY);
    set({ draft: emptyDraft() });
  },
  load: () => set({ draft: readJSON<RaiseDraft>(secureCache(), KEY) ?? emptyDraft() }),
}));

export function draftStarted(d: RaiseDraft): boolean {
  return !!(d.source || d.emergencyTypeId || d.headline || d.what || d.photos.length);
}

/* ───────────── step validation ───────────── */

export function step1Errors(d: RaiseDraft): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.source) e.source = 'Choose aircraft or airport.';
  if (!d.emergencyTypeId) e.type = 'Choose the emergency type.';
  if (d.source === 'AIRLINE') {
    if (!d.airline) e.airline = 'Choose the airline.';
    if (!/^[A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?$/.test(d.flightNumber.trim().toUpperCase())) e.flightNumber = 'Enter a flight number like AI 101 or 6E2134.';
    if (d.personsOnBoard && !/^\d{1,3}$/.test(d.personsOnBoard)) e.personsOnBoard = 'Persons on board must be a number.';
  }
  return e;
}

export function step2Errors(d: RaiseDraft): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.severity) e.severity = 'Choose a severity.';
  if (d.headline.trim().length < 5) e.headline = 'Headline needs at least 5 characters.';
  for (const k of ['who', 'what', 'where', 'when', 'why'] as const) {
    if (!d[k].trim()) e[k] = 'Required.';
  }
  return e;
}

export function step3Errors(d: RaiseDraft): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.pointId && d.locationText.trim().length < 3) e.location = 'Pick a location or describe it.';
  return e;
}
