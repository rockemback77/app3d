<script lang="ts">
  import CurrencyInput from '../components/CurrencyInput.svelte';
  import NumberInput from '../components/NumberInput.svelte';
  import {
    settings,
    persistSettings,
    addWearPart,
    removeWearPart,
    addMarketplace,
    removeMarketplace,
  } from '../lib/stores/settings.svelte';
  import { wearPerHourCentavos } from '../lib/engine/costs';
  import { formatBRL } from '../lib/money';
  import { exportBackup, importBackup } from '../lib/backup';

  let importMsg = $state('');
  let fileInput: HTMLInputElement;

  let wearHour = $derived(wearPerHourCentavos(settings));

  async function onImportFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const r = await importBackup(file);
      importMsg = `Importado: ${r.filaments} filamento(s), ${r.history} cálculo(s).`;
    } catch (err) {
      importMsg = 'Falha ao importar: arquivo inválido.';
    }
    (e.target as HTMLInputElement).value = '';
    setTimeout(() => (importMsg = ''), 5000);
  }
</script>

<div class="space-y-6 p-4 pb-8">
  <h1 class="text-xl font-bold">Configurações</h1>

  <!-- Energia / Impressora -->
  <section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
    <h2 class="mb-3 font-semibold text-sky-600 dark:text-sky-400">Energia & Impressora</h2>
    <div class="space-y-3">
      <label class="block">
        <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Preço do kWh</span>
        <CurrencyInput bind:value={settings.kwhPriceCentavos} />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Potência da impressora</span>
        <NumberInput bind:value={settings.printerWatts} suffix="W" decimals={0} />
      </label>
    </div>
  </section>

  <!-- Desgaste -->
  <section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
    <h2 class="mb-1 font-semibold text-sky-600 dark:text-sky-400">Desgaste da máquina</h2>
    <p class="mb-3 text-xs text-slate-500">Peças de troca e a cada quantos meses. Rateado pelas horas de impressão/mês.</p>
    <div class="space-y-3">
      {#each settings.wearParts as part (part.id)}
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div class="mb-2 flex items-center justify-between gap-2">
            <input
              class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="Nome da peça"
              bind:value={part.name}
              oninput={persistSettings}
            />
            <button class="shrink-0 text-red-500" onclick={() => removeWearPart(part.id)}>Remover</button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <label class="block">
              <span class="mb-1 block text-xs text-slate-500">Custo</span>
              <CurrencyInput bind:value={part.costCentavos} />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-slate-500">Troca a cada</span>
              <NumberInput bind:value={part.intervalMonths} suffix="mês" decimals={0} />
            </label>
          </div>
        </div>
      {/each}
      <button class="text-sm font-medium text-sky-600" onclick={addWearPart}>+ Adicionar peça</button>
    </div>
    <div class="mt-3">
      <label class="block">
        <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Horas de impressão por mês</span>
        <NumberInput bind:value={settings.hoursPerMonth} suffix="h" decimals={0} />
      </label>
      <p class="mt-2 text-sm text-slate-500">
        Desgaste calculado: <span class="font-semibold text-slate-700 dark:text-slate-200">{formatBRL(Math.round(wearHour))}/hora</span>
      </p>
    </div>
  </section>

  <!-- Mão de obra -->
  <section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
    <h2 class="mb-3 font-semibold text-sky-600 dark:text-sky-400">Mão de obra</h2>
    <label class="block">
      <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Valor por hora (padrão)</span>
      <CurrencyInput bind:value={settings.laborRateCentavos} />
    </label>
  </section>

  <!-- Marketplaces -->
  <section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
    <h2 class="mb-1 font-semibold text-sky-600 dark:text-sky-400">Marketplaces</h2>
    <p class="mb-3 text-xs text-slate-500">Taxa % aplicada sobre o preço de venda.</p>
    <div class="space-y-2">
      {#each settings.marketplaces as mp (mp.id)}
        <div class="flex items-center gap-2">
          <input
            class="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
            placeholder="Nome"
            bind:value={mp.name}
            oninput={persistSettings}
          />
          <div class="w-24 shrink-0">
            <NumberInput bind:value={mp.ratePercent} suffix="%" decimals={1} />
          </div>
          <button class="shrink-0 text-red-500" onclick={() => removeMarketplace(mp.id)}>✕</button>
        </div>
      {/each}
      <button class="text-sm font-medium text-sky-600" onclick={addMarketplace}>+ Adicionar marketplace</button>
    </div>
  </section>

  <!-- Backup -->
  <section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
    <h2 class="mb-3 font-semibold text-sky-600 dark:text-sky-400">Backup dos dados</h2>
    <div class="flex gap-2">
      <button
        class="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
        onclick={() => exportBackup()}>Exportar JSON</button>
      <button
        class="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
        onclick={() => fileInput.click()}>Importar JSON</button>
      <input bind:this={fileInput} type="file" accept="application/json,.json" class="hidden" onchange={onImportFile} />
    </div>
    {#if importMsg}
      <p class="mt-2 text-sm text-emerald-600">{importMsg}</p>
    {/if}
  </section>
</div>
