import type { AppConfig, MarketplacePreset, WearPart } from '../engine/types';
import { uid } from '../db';

const STORAGE_KEY = 'custo3d.config.v1';

export function defaultConfig(): AppConfig {
  return {
    kwhPriceCentavos: 95, // R$ 0,95 / kWh
    printerWatts: 150,
    wearParts: [
      { id: uid(), name: 'Bico (nozzle)', costCentavos: 2500, lifespanHours: 500 },
      { id: uid(), name: 'Placa / correias', costCentavos: 12000, lifespanHours: 2000 },
    ],
    laborRateCentavos: 2000, // R$ 20,00 / hora
    marketplaces: [
      { id: uid(), name: 'Mercado Livre Clássico', ratePercent: 12 },
      { id: uid(), name: 'Mercado Livre Premium', ratePercent: 17 },
      { id: uid(), name: 'Shopee', ratePercent: 20 },
    ],
    tags: ['Decoração', 'Utilidade', 'Presente', 'Cliente', 'Protótipo'],
  };
}

function load(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig();
    const parsed = JSON.parse(raw) as Partial<AppConfig> & {
      hoursPerMonth?: number;
      wearParts?: (WearPart & { intervalMonths?: number })[];
    };
    const base = defaultConfig();
    // migra peças de desgaste do modelo antigo (meses + horas/mês) para vida útil em horas
    const legacyHpm = parsed.hoursPerMonth || 120;
    const wearParts = (parsed.wearParts ?? base.wearParts).map((p) => ({
      id: p.id,
      name: p.name,
      costCentavos: p.costCentavos,
      lifespanHours:
        p.lifespanHours ?? (p.intervalMonths ? p.intervalMonths * legacyHpm : 1000),
    }));
    return {
      ...base,
      ...parsed,
      wearParts,
      marketplaces: parsed.marketplaces ?? base.marketplaces,
      tags: parsed.tags ?? base.tags,
    };
  } catch {
    return defaultConfig();
  }
}

// Singleton reativo (Svelte 5 runes) persistido em localStorage.
export const settings = $state<AppConfig>(load());

export function persistSettings(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage cheio / indisponível — ignora
  }
}

// Auto-persiste qualquer mudança (incl. edição aninhada via bind:value).
let started = false;
export function startSettingsPersistence(): void {
  if (started) return;
  started = true;
  $effect.root(() => {
    $effect(() => {
      // leitura profunda cria dependência de todos os campos
      JSON.stringify(settings);
      persistSettings();
    });
  });
}

/** Substitui toda a config (usado no import de backup). */
export function replaceSettings(next: AppConfig): void {
  Object.assign(settings, defaultConfig(), next);
  persistSettings();
}

export function addWearPart(): void {
  settings.wearParts.push({ id: uid(), name: '', costCentavos: 0, lifespanHours: 1000 });
  persistSettings();
}

export function removeWearPart(id: string): void {
  const i = settings.wearParts.findIndex((p: WearPart) => p.id === id);
  if (i >= 0) settings.wearParts.splice(i, 1);
  persistSettings();
}

export function addMarketplace(): void {
  settings.marketplaces.push({ id: uid(), name: '', ratePercent: 0 });
  persistSettings();
}

export function removeMarketplace(id: string): void {
  const i = settings.marketplaces.findIndex((m: MarketplacePreset) => m.id === id);
  if (i >= 0) settings.marketplaces.splice(i, 1);
  persistSettings();
}

export function addTag(name: string): void {
  const t = name.trim();
  if (!t) return;
  if (!settings.tags.some((x: string) => x.toLowerCase() === t.toLowerCase())) {
    settings.tags.push(t);
    persistSettings();
  }
}

export function removeTag(name: string): void {
  const i = settings.tags.indexOf(name);
  if (i >= 0) settings.tags.splice(i, 1);
  persistSettings();
}
