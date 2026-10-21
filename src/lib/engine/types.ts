// Tipos centrais. Todo valor monetário é em CENTAVOS inteiros.

export interface WearPart {
  id: string;
  name: string;
  costCentavos: number; // custo da peça/manutenção
  lifespanHours: number; // vida útil em horas de impressão
}

export interface MarketplacePreset {
  id: string;
  name: string;
  ratePercent: number; // taxa % sobre o preço de venda
}

export interface AppConfig {
  kwhPriceCentavos: number; // R$/kWh
  printerWatts: number; // potência da impressora (W)
  wearParts: WearPart[];
  laborRateCentavos: number; // R$/hora de mão de obra padrão
  marketplaces: MarketplacePreset[];
  tags: string[]; // tags pré-definidas para os projetos
  tagColors: Record<string, string>; // cor (hex) por nome de tag
  costCategories: string[]; // categorias de custo (Outros custos)
}

export interface JobFilament {
  profileId?: string;
  name: string;
  grams: number;
  pricePerKgCentavos: number; // R$/kg
}

export type LaborMode = 'hourly' | 'fixed';

export interface JobMiscItem {
  label: string;
  costCentavos: number;
  ref?: string; // id do custo cadastrado, '__outro__' p/ manual, ou vazio
}

export type PriceMode = 'margin' | 'fixed';

export interface JobInputs {
  filaments: JobFilament[]; // até 4
  printHours: number; // tempo total de impressão em horas (decimal)
  laborMode: LaborMode;
  laborHours: number;
  laborFixedCentavos: number;
  misc: JobMiscItem[];
  priceMode: PriceMode; // 'margin' = por margem de lucro; 'fixed' = valor de venda informado
  marginPercent: number;
  fixedPriceCentavos: number; // usado quando priceMode === 'fixed'
  marketplaceId: string | null; // null = não aplicável
}

export interface CostBreakdown {
  filamentCentavos: number;
  energyCentavos: number;
  wearCentavos: number;
  laborCentavos: number;
  miscCentavos: number;
  totalCostCentavos: number;
  priceWithMarginCentavos: number;
  marketplaceRatePercent: number; // 0 se não aplicável
  marketplaceName: string | null;
  finalPriceCentavos: number;
}
