import Dexie, { type EntityTable } from 'dexie';
import type { AppConfig, CostBreakdown, JobInputs } from './engine/types';
import { computeBreakdown } from './engine/pricing';

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

export interface CostItem {
  id: string;
  name: string; // ex: Embalagem, Frete, Etiqueta
  costCentavos: number;
  createdAt: number;
}

export interface HistoryRecord {
  id: string;
  createdAt: number;
  label: string;
  tags?: string[];
  job: JobInputs;
  configSnapshot: AppConfig; // snapshot da config no momento do cálculo
  breakdown: CostBreakdown;
}

export interface StockItem {
  id: string; // = pieceId (uma linha por peça)
  pieceId: string;
  quantity: number;
  createdAt: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string; // Filamento, Bico, Placa, Correia, Mesa/Base, Peça, Outro
  quantity: number;
  createdAt: number;
}

export type TxType = 'receita' | 'despesa';

export interface Transaction {
  id: string;
  createdAt: number;
  type: TxType;
  date: string; // 'YYYY-MM-DD'
  label: string; // o que foi (peça / custo / filamento)
  refId?: string; // id do item cadastrado de origem
  quantity: number; // quantidade vendida/comprada
  unitCentavos: number; // valor unitário (snapshot, editável)
}

const db = new Dexie('calculadora-custo-3d') as Dexie & {
  filaments: EntityTable<FilamentProfile, 'id'>;
  history: EntityTable<HistoryRecord, 'id'>;
  costItems: EntityTable<CostItem, 'id'>;
  transactions: EntityTable<Transaction, 'id'>;
  stock: EntityTable<StockItem, 'id'>;
  inventory: EntityTable<InventoryItem, 'id'>;
};

// v1: perfis de filamento. v2: histórico. v3: outros custos.
db.version(1).stores({
  filaments: 'id, createdAt, name',
});
db.version(2).stores({
  filaments: 'id, createdAt, name',
  history: 'id, createdAt',
});
db.version(3).stores({
  filaments: 'id, createdAt, name',
  history: 'id, createdAt',
  costItems: 'id, createdAt, name',
});
db.version(4).stores({
  filaments: 'id, createdAt, name',
  history: 'id, createdAt',
  costItems: 'id, createdAt, name',
  transactions: 'id, createdAt, date, type',
});
db.version(5).stores({
  filaments: 'id, createdAt, name',
  history: 'id, createdAt',
  costItems: 'id, createdAt, name',
  transactions: 'id, createdAt, date, type',
  stock: 'id, pieceId',
});
db.version(6).stores({
  filaments: 'id, createdAt, name',
  history: 'id, createdAt',
  costItems: 'id, createdAt, name',
  transactions: 'id, createdAt, date, type',
  stock: 'id, pieceId',
  inventory: 'id, createdAt, category',
});

export { db };

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

// ---- Perfis de filamento ----
export async function listFilaments(): Promise<FilamentProfile[]> {
  const all = await db.filaments.toArray();
  // ordena por marca (sem marca por último), depois por nome
  return all.sort((a, b) => {
    const ka = a.brand?.trim() || 'zzzz';
    const kb = b.brand?.trim() || 'zzzz';
    return (
      ka.localeCompare(kb, 'pt', { sensitivity: 'base' }) ||
      a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' })
    );
  });
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

/** Semeia 10 filamentos comuns (PLA, cores mais usadas) na primeira execução. */
export async function seedFilamentsIfEmpty(): Promise<void> {
  const count = await db.filaments.count();
  if (count > 0) return;
  const defaults: Array<Omit<FilamentProfile, 'id' | 'createdAt'>> = [
    { name: 'PLA Preto', type: 'PLA', color: '#1a1a1a', colorLabel: 'Preto', brand: 'Voolt', pricePerKgCentavos: 11000 },
    { name: 'PLA Branco', type: 'PLA', color: '#f5f5f5', colorLabel: 'Branco', brand: 'Voolt', pricePerKgCentavos: 11000 },
    { name: 'PLA Cinza', type: 'PLA', color: '#808080', colorLabel: 'Cinza', brand: '3D Lab', pricePerKgCentavos: 10500 },
    { name: 'PLA Vermelho', type: 'PLA', color: '#e11d48', colorLabel: 'Vermelho', brand: '3D Lab', pricePerKgCentavos: 10500 },
    { name: 'PLA Azul', type: 'PLA', color: '#2563eb', colorLabel: 'Azul', brand: '3DFila', pricePerKgCentavos: 10900 },
    { name: 'PLA Verde', type: 'PLA', color: '#16a34a', colorLabel: 'Verde', brand: '3DFila', pricePerKgCentavos: 10900 },
    { name: 'PLA Amarelo', type: 'PLA', color: '#facc15', colorLabel: 'Amarelo', brand: 'Voolt', pricePerKgCentavos: 10900 },
    { name: 'PLA Laranja', type: 'PLA', color: '#f97316', colorLabel: 'Laranja', brand: 'Voolt', pricePerKgCentavos: 10900 },
    { name: 'PLA Roxo', type: 'PLA', color: '#7c3aed', colorLabel: 'Roxo', brand: '3D Lab', pricePerKgCentavos: 11200 },
    { name: 'PLA Natural', type: 'PLA', color: '#e5e7eb', colorLabel: 'Natural', brand: '3DFila', pricePerKgCentavos: 9900 },
  ];
  const now = Date.now();
  await db.filaments.bulkPut(
    defaults.map((f, i) => ({ ...f, id: uid(), createdAt: now + i }))
  );
}

// ---- Outros custos (embalagem, frete, etc.) ----
export async function listCostItems(): Promise<CostItem[]> {
  return db.costItems.orderBy('createdAt').reverse().toArray();
}

export async function saveCostItem(
  c: Omit<CostItem, 'id' | 'createdAt'> & { id?: string }
): Promise<string> {
  const id = c.id ?? uid();
  const existing = c.id ? await db.costItems.get(c.id) : undefined;
  await db.costItems.put({
    id,
    name: c.name,
    costCentavos: c.costCentavos,
    createdAt: existing?.createdAt ?? Date.now(),
  });
  return id;
}

export async function deleteCostItem(id: string): Promise<void> {
  await db.costItems.delete(id);
}

// custos padrão com valor sugerido (centavos)
const DEFAULT_COST_ITEMS: { name: string; cost: number }[] = [
  { name: 'Embalagem', cost: 150 },
  { name: 'Frete', cost: 1500 },
  { name: 'Etiqueta', cost: 30 },
  { name: 'Acabamento', cost: 200 },
  { name: 'Cola', cost: 50 },
  { name: 'Lixa', cost: 100 },
  { name: 'Parafusos / ímãs', cost: 150 },
  { name: 'Tinta / pintura', cost: 300 },
  { name: 'Álcool isopropílico', cost: 50 },
  { name: 'Manutenção', cost: 200 },
];

/**
 * Garante os custos padrão: adiciona os que faltam (com valor sugerido) e
 * preenche o valor dos que existem zerados — sem sobrescrever valores já definidos.
 */
export async function ensureDefaultCostItems(): Promise<void> {
  const all = await db.costItems.toArray();
  const byName = new Map(all.map((c) => [c.name.toLowerCase(), c]));
  const toAdd: CostItem[] = [];
  const now = Date.now();
  let i = 0;
  for (const d of DEFAULT_COST_ITEMS) {
    const ex = byName.get(d.name.toLowerCase());
    if (!ex) {
      toAdd.push({ id: uid(), name: d.name, costCentavos: d.cost, createdAt: now + i++ });
    } else if ((ex.costCentavos || 0) === 0 && d.cost > 0) {
      await db.costItems.update(ex.id, { costCentavos: d.cost });
    }
  }
  if (toAdd.length) await db.costItems.bulkPut(toAdd);
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

export async function updateHistory(rec: HistoryRecord): Promise<void> {
  await db.history.put(rec);
}

/** Semeia uma peça de exemplo já calculada na primeira execução (histórico vazio). */
export async function seedExamplePieceIfEmpty(config: AppConfig): Promise<void> {
  const count = await db.history.count();
  if (count > 0) return;
  const job: JobInputs = {
    filaments: [{ profileId: '', name: 'PLA Preto', grams: 35, pricePerKgCentavos: 11000 }],
    printHours: 2.5,
    laborMode: 'hourly',
    laborHours: 0.25,
    laborFixedCentavos: 0,
    misc: [{ label: 'Embalagem', costCentavos: 200, ref: '__outro__' }],
    priceMode: 'margin',
    marginPercent: 60,
    fixedPriceCentavos: 0,
    marketplaceId: null,
  };
  const breakdown = computeBreakdown(config, job);
  await db.history.put({
    id: uid(),
    createdAt: Date.now(),
    label: 'Suporte de celular (exemplo)',
    job,
    configSnapshot: JSON.parse(JSON.stringify(config)),
    breakdown,
  });
}

export async function deleteHistory(id: string): Promise<void> {
  await db.history.delete(id);
}

/** Conta quantas peças usam uma tag (case-insensitive). */
export async function countHistoryWithTag(tag: string): Promise<number> {
  const t = tag.toLowerCase();
  const all = await db.history.toArray();
  return all.filter((r) => (r.tags ?? []).some((x) => x.toLowerCase() === t)).length;
}

/** Remove uma tag de todas as peças que a possuem. Retorna quantas foram alteradas. */
export async function removeTagFromAllHistory(tag: string): Promise<number> {
  const t = tag.toLowerCase();
  const all = await db.history.toArray();
  const afetadas = all.filter((r) => (r.tags ?? []).some((x) => x.toLowerCase() === t));
  for (const rec of afetadas) {
    rec.tags = (rec.tags ?? []).filter((x) => x.toLowerCase() !== t);
    await db.history.put(rec);
  }
  return afetadas.length;
}

// ---- Vendas (receitas e despesas) ----
export async function listTransactions(): Promise<Transaction[]> {
  return db.transactions.orderBy('date').reverse().toArray();
}

export async function saveTransaction(
  t: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }
): Promise<string> {
  const id = t.id ?? uid();
  const existing = t.id ? await db.transactions.get(t.id) : undefined;
  await db.transactions.put({
    id,
    type: t.type,
    date: t.date,
    label: t.label,
    refId: t.refId,
    quantity: t.quantity,
    unitCentavos: t.unitCentavos,
    createdAt: existing?.createdAt ?? Date.now(),
  });
  return id;
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

// ---- Estoque (quantas peças cadastradas há em estoque) ----
export async function listStock(): Promise<StockItem[]> {
  return db.stock.toArray();
}

export async function setStock(pieceId: string, quantity: number): Promise<void> {
  if (!(quantity > 0)) {
    await db.stock.delete(pieceId);
    return;
  }
  const ex = await db.stock.get(pieceId);
  await db.stock.put({
    id: pieceId,
    pieceId,
    quantity: Math.round(quantity),
    createdAt: ex?.createdAt ?? Date.now(),
  });
}

// ---- Inventário (insumos e peças de reposição) ----
export async function listInventory(): Promise<InventoryItem[]> {
  return db.inventory.orderBy('createdAt').reverse().toArray();
}

export async function saveInventory(
  it: Omit<InventoryItem, 'id' | 'createdAt'> & { id?: string }
): Promise<string> {
  const id = it.id ?? uid();
  const existing = it.id ? await db.inventory.get(it.id) : undefined;
  await db.inventory.put({
    id,
    name: it.name,
    category: it.category,
    quantity: Math.max(0, Math.round(it.quantity)),
    createdAt: existing?.createdAt ?? Date.now(),
  });
  return id;
}

export async function setInventoryQty(id: string, quantity: number): Promise<void> {
  const ex = await db.inventory.get(id);
  if (!ex) return;
  await db.inventory.update(id, { quantity: Math.max(0, Math.round(quantity)) });
}

export async function deleteInventory(id: string): Promise<void> {
  await db.inventory.delete(id);
}
