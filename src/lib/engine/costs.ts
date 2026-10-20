import type { AppConfig, JobInputs } from './types';

/** Custo de 1 filamento em centavos: gramas * (R$/kg) / 1000. */
export function filamentCostCentavos(grams: number, pricePerKgCentavos: number): number {
  return Math.round((grams * pricePerKgCentavos) / 1000);
}

/** Soma do custo de todos os filamentos do job. */
export function totalFilamentCentavos(job: JobInputs): number {
  return job.filaments.reduce(
    (sum, f) => sum + filamentCostCentavos(f.grams, f.pricePerKgCentavos),
    0
  );
}

/** Energia: (W / 1000) * horas * (R$/kWh em centavos). */
export function energyCostCentavos(config: AppConfig, printHours: number): number {
  const kwh = (config.printerWatts / 1000) * printHours;
  return Math.round(kwh * config.kwhPriceCentavos);
}

/** Custo mensal de desgaste = Σ(custo da peça / intervalo em meses). */
export function monthlyWearCentavos(config: AppConfig): number {
  return config.wearParts.reduce((sum, p) => {
    if (!p.intervalMonths || p.intervalMonths <= 0) return sum;
    return sum + p.costCentavos / p.intervalMonths;
  }, 0);
}

/** Desgaste por hora = custo mensal / horas de impressão por mês. */
export function wearPerHourCentavos(config: AppConfig): number {
  if (!config.hoursPerMonth || config.hoursPerMonth <= 0) return 0;
  return monthlyWearCentavos(config) / config.hoursPerMonth;
}

/** Custo de desgaste do job = desgaste/hora * horas da impressão. */
export function wearCostCentavos(config: AppConfig, printHours: number): number {
  return Math.round(wearPerHourCentavos(config) * printHours);
}

/** Mão de obra: por hora (taxa padrão × horas) ou valor fixo. */
export function laborCostCentavos(config: AppConfig, job: JobInputs): number {
  if (job.laborMode === 'fixed') return Math.round(job.laborFixedCentavos);
  return Math.round(config.laborRateCentavos * job.laborHours);
}

/** Soma dos custos avulsos. */
export function miscCostCentavos(job: JobInputs): number {
  return job.misc.reduce((sum, m) => sum + (m.costCentavos || 0), 0);
}
