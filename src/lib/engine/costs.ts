import type { AppConfig, JobFilament, JobInputs } from './types';

/** Custo de 1 filamento em centavos: gramas * (R$/kg) / 1000. */
export function filamentCostCentavos(grams: number, pricePerKgCentavos: number): number {
  return Math.round((grams * pricePerKgCentavos) / 1000);
}

/** Todos os filamentos do job: achata as placas; cai no flat antigo se não houver placas. */
export function jobFilaments(job: JobInputs): JobFilament[] {
  if (job.plates && job.plates.length) return job.plates.flatMap((p) => p.filaments ?? []);
  return job.filaments ?? [];
}

/** Soma do custo de todos os filamentos do job (todas as placas). */
export function totalFilamentCentavos(job: JobInputs): number {
  return jobFilaments(job).reduce(
    (sum, f) => sum + filamentCostCentavos(f.grams, f.pricePerKgCentavos),
    0
  );
}

/** Energia: (W / 1000) * horas * (R$/kWh em centavos). */
export function energyCostCentavos(config: AppConfig, printHours: number): number {
  const kwh = (config.printerWatts / 1000) * printHours;
  return Math.round(kwh * config.kwhPriceCentavos);
}

/** Desgaste por hora = Σ(custo da peça / vida útil em horas). */
export function wearPerHourCentavos(config: AppConfig): number {
  return config.wearParts.reduce((sum, p) => {
    if (!p.lifespanHours || p.lifespanHours <= 0) return sum;
    return sum + p.costCentavos / p.lifespanHours;
  }, 0);
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
