import { db, type FilamentProfile, type HistoryRecord } from './db';
import { settings, replaceSettings } from './stores/settings.svelte';
import type { AppConfig } from './engine/types';

interface BackupFile {
  app: 'calculadora-custo-3d';
  version: 1;
  exportedAt: string;
  config: AppConfig;
  filaments: FilamentProfile[];
  history: HistoryRecord[];
}

/** Pede ao navegador para persistir o armazenamento (evita eviction no iOS). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      if (already) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* ignore */
  }
  return false;
}

export async function exportBackup(): Promise<void> {
  const filaments = await db.filaments.toArray();
  const history = await db.history.toArray();
  const data: BackupFile = {
    app: 'calculadora-custo-3d',
    version: 1,
    exportedAt: new Date().toISOString(),
    config: JSON.parse(JSON.stringify(settings)),
    filaments,
    history,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `backup-custo3d-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<{ filaments: number; history: number }> {
  const text = await file.text();
  const data = JSON.parse(text) as BackupFile;
  if (!data || typeof data !== 'object' || data.app !== 'calculadora-custo-3d') {
    throw new Error('Arquivo de backup inválido.');
  }
  const filaments = Array.isArray(data.filaments) ? data.filaments : [];
  const history = Array.isArray(data.history) ? data.history : [];
  if (data.config && typeof data.config === 'object') replaceSettings(data.config);
  await db.transaction('rw', db.filaments, db.history, async () => {
    await db.filaments.clear();
    await db.history.clear();
    if (filaments.length) await db.filaments.bulkPut(filaments);
    if (history.length) await db.history.bulkPut(history);
  });
  return { filaments: filaments.length, history: history.length };
}
