import type { AppConfig, CostBreakdown, JobInputs } from './types';
import {
  energyCostCentavos,
  laborCostCentavos,
  miscCostCentavos,
  totalFilamentCentavos,
  wearCostCentavos,
} from './costs';

/**
 * Preço de venda a partir do custo, margem e taxa de marketplace.
 * Fórmula correta: a taxa de marketplace incide sobre o PREÇO de venda, não sobre o custo.
 *   preçoComMargem = custo / (1 - margem%)
 *   preçoFinal     = preçoComMargem / (1 - taxa%)
 */
export function computeBreakdown(config: AppConfig, job: JobInputs): CostBreakdown {
  const filamentCentavos = totalFilamentCentavos(job);
  const energyCentavos = energyCostCentavos(config, job.printHours);
  const wearCentavos = wearCostCentavos(config, job.printHours);
  const laborCentavos = laborCostCentavos(config, job);
  const miscCentavos = miscCostCentavos(job);

  const totalCostCentavos =
    filamentCentavos + energyCentavos + wearCentavos + laborCentavos + miscCentavos;

  const margin = clampPercent(job.marginPercent);
  const priceWithMarginCentavos =
    job.priceMode === 'fixed'
      ? Math.max(0, Math.round(job.fixedPriceCentavos || 0))
      : margin >= 100
        ? totalCostCentavos
        : Math.round(totalCostCentavos / (1 - margin / 100));

  const mp = job.marketplaceId
    ? config.marketplaces.find((m) => m.id === job.marketplaceId) ?? null
    : null;
  const rate = mp ? clampPercent(mp.ratePercent) : 0;

  const finalPriceCentavos =
    rate > 0 && rate < 100
      ? Math.round(priceWithMarginCentavos / (1 - rate / 100))
      : priceWithMarginCentavos;

  return {
    filamentCentavos,
    energyCentavos,
    wearCentavos,
    laborCentavos,
    miscCentavos,
    totalCostCentavos,
    priceWithMarginCentavos,
    marketplaceRatePercent: rate,
    marketplaceName: mp ? mp.name : null,
    finalPriceCentavos,
  };
}

function clampPercent(p: number): number {
  if (!isFinite(p) || p < 0) return 0;
  return p;
}
