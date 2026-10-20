import { liveQuery } from 'dexie';
import { db, ensureDefaultCostItems } from './db';
import { settings, replaceSettings } from './stores/settings.svelte';
import { supabase } from './supabase';
import { auth } from './stores/auth.svelte';

type Status = 'idle' | 'syncing' | 'synced' | 'error';

export const syncState = $state<{ status: Status; error: string | null; at: number | null }>({
  status: 'idle',
  error: null,
  at: null,
});

let applying = false; // evita que a aplicação de um pull dispare um push
let autoStarted = false;
let realtimeStarted = false;
let lastLocalPush = 0; // timestamp do último push local (ignora o eco no realtime)
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function exportSnapshot() {
  const [filaments, history, costItems, transactions, stock] = await Promise.all([
    db.filaments.toArray(),
    db.history.toArray(),
    db.costItems.toArray(),
    db.transactions.toArray(),
    db.stock.toArray(),
  ]);
  return {
    v: 1,
    config: JSON.parse(JSON.stringify(settings)),
    filaments,
    history,
    costItems,
    transactions,
    stock,
  };
}

async function applySnapshot(data: any): Promise<void> {
  applying = true;
  try {
    if (data.config) replaceSettings(data.config);
    await db.transaction('rw', db.filaments, db.history, db.costItems, db.transactions, db.stock, async () => {
      await Promise.all([
        db.filaments.clear(),
        db.history.clear(),
        db.costItems.clear(),
        db.transactions.clear(),
        db.stock.clear(),
      ]);
      if (data.filaments?.length) await db.filaments.bulkPut(data.filaments);
      if (data.history?.length) await db.history.bulkPut(data.history);
      if (data.costItems?.length) await db.costItems.bulkPut(data.costItems);
      if (data.transactions?.length) await db.transactions.bulkPut(data.transactions);
      if (data.stock?.length) await db.stock.bulkPut(data.stock);
    });
  } finally {
    setTimeout(() => {
      applying = false;
    }, 400);
  }
}

export async function push(): Promise<void> {
  if (!auth.user) return;
  syncState.status = 'syncing';
  const snapshot = await exportSnapshot();
  const { error } = await supabase
    .from('user_data')
    .upsert({ user_id: auth.user.id, data: snapshot, updated_at: new Date().toISOString() });
  if (error) {
    syncState.status = 'error';
    syncState.error = error.message;
    return;
  }
  lastLocalPush = Date.now();
  syncState.status = 'synced';
  syncState.at = Date.now();
  syncState.error = null;
}

export async function pull(): Promise<void> {
  if (!auth.user) return;
  syncState.status = 'syncing';
  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) {
    syncState.status = 'error';
    syncState.error = error.message;
    return;
  }
  if (data?.data) await applySnapshot(data.data);
  syncState.status = 'synced';
  syncState.at = Date.now();
  syncState.error = null;
}

/** Chamado ao logar: nuvem com dados -> baixa; nuvem vazia -> envia o local. */
export async function syncOnLogin(): Promise<void> {
  if (!auth.user) return;
  syncState.status = 'syncing';
  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) {
    syncState.status = 'error';
    syncState.error = error.message;
    return;
  }
  if (data?.data) await applySnapshot(data.data);
  // garante os custos padrão mesmo após baixar dados antigos da nuvem
  await ensureDefaultCostItems();
  await push(); // persiste o estado mesclado (nuvem + custos padrão)
  syncState.status = 'synced';
  syncState.at = Date.now();
  syncState.error = null;
  startAutoPush();
  startRealtime();
}

/** Sync em tempo real: aplica mudanças feitas em outros aparelhos. */
function startRealtime(): void {
  if (realtimeStarted || !auth.user) return;
  realtimeStarted = true;
  const userId = auth.user.id;
  supabase
    .channel('user_data_' + userId)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'user_data', filter: `user_id=eq.${userId}` },
      (payload: { new: { data?: unknown } }) => {
        // ignora o eco do nosso próprio push recente
        if (applying || Date.now() - lastLocalPush < 4000) return;
        const next = payload.new?.data;
        if (next) void applySnapshot(next);
      }
    )
    .subscribe();
}

function schedulePush(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void push(), 1500);
}

/** Envia automaticamente (debounced) sempre que algo local muda e há usuário logado. */
function startAutoPush(): void {
  if (autoStarted) return;
  autoStarted = true;

  const obs = liveQuery(() =>
    Promise.all([
      db.filaments.toArray(),
      db.history.toArray(),
      db.costItems.toArray(),
      db.transactions.toArray(),
    ])
  );
  obs.subscribe(() => {
    if (applying || !auth.user) return;
    schedulePush();
  });

  $effect.root(() => {
    $effect(() => {
      JSON.stringify(settings); // cria dependência de todos os campos
      if (applying || !auth.user) return;
      schedulePush();
    });
  });
}
