import Dexie, { type EntityTable } from 'dexie';
import type { AppConfig, CostBreakdown, JobInputs } from './engine/types';

export interface FilamentProfile {
  id: string;
  name: string;
  type: string; // PLA, PETG, ABS, TPU, Resina, Outro
  color: string; // hex
  colorLabel?: string;
  brand?: string;
  pricePerKgCentavos: number;
  createdAt: number;
}

export interface HistoryRecord {
  id: string;
  createdAt: number;
  label: string;
  job: JobInputs;
  configSnapshot: AppConfig; // snapshot da config no momento do cálculo
  breakdown: CostBreakdown;
}

const db = new Dexie('calculadora-custo-3d') as Dexie & {
  filaments: EntityTable<FilamentProfile, 'id'>;
  history: EntityTable<HistoryRecord, 'id'>;
};

// v1: perfis de filamento. v2: histórico.
db.version(1).stores({
  filaments: 'id, createdAt, name',
});
db.version(2).stores({
  filaments: 'id, createdAt, name',
  history: 'id, createdAt',
});

export { db };

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

// ---- Perfis de filamento ----
export async function listFilaments(): Promise<FilamentProfile[]> {
  return db.filaments.orderBy('createdAt').reverse().toArray();
}

export async function saveFilament(
  p: Omit<FilamentProfile, 'id' | 'createdAt'> & { id?: string }
): Promise<string> {
  const id = p.id ?? uid();
  const existing = p.id ? await db.filaments.get(p.id) : undefined;
  await db.filaments.put({
    id,
    name: p.name,
    type: p.type,
    color: p.color,
    colorLabel: p.colorLabel,
    brand: p.brand,
    pricePerKgCentavos: p.pricePerKgCentavos,
    createdAt: existing?.createdAt ?? Date.now(),
  });
  return id;
}

export async function deleteFilament(id: string): Promise<void> {
  await db.filaments.delete(id);
}

// ---- Histórico ----
export async function listHistory(): Promise<HistoryRecord[]> {
  return db.history.orderBy('createdAt').reverse().limit(100).toArray();
}

export async function saveHistory(rec: Omit<HistoryRecord, 'id' | 'createdAt'>): Promise<string> {
  const id = uid();
  await db.history.put({ ...rec, id, createdAt: Date.now() });
  // mantém no máximo 100 entradas
  const all = await db.history.orderBy('createdAt').reverse().toArray();
  if (all.length > 100) {
    const excess = all.slice(100).map((r) => r.id);
    await db.history.bulkDelete(excess);
  }
  return id;
}

export async function deleteHistory(id: string): Promise<void> {
  await db.history.delete(id);
}
