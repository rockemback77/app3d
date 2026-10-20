<script lang="ts">
  import { liveQuery } from 'dexie';
  import CurrencyInput from '../components/CurrencyInput.svelte';
  import NumberInput from '../components/NumberInput.svelte';
  import { settings } from '../lib/stores/settings.svelte';
  import { listFilaments, saveHistory, updateHistory } from '../lib/db';
  import { editState } from '../lib/stores/ui.svelte';
  import { computeBreakdown } from '../lib/engine/pricing';
  import { filamentCostCentavos } from '../lib/engine/costs';
  import type { JobInputs } from '../lib/engine/types';
  import { formatBRL } from '../lib/money';

  const filaments = liveQuery(() => listFilaments());

  function emptyFilament() {
    return { profileId: '', name: '', grams: 0, pricePerKgCentavos: 0 };
  }

  let job = $state<JobInputs>({
    filaments: [emptyFilament()],
    printHours: 0,
    laborMode: 'hourly',
    laborHours: 0,
    laborFixedCentavos: 0,
    misc: [],
    marginPercent: 50,
    marketplaceId: null,
  });

  // tempo em horas + minutos
  let hh = $state(0);
  let mm = $state(0);
  $effect(() => {
    job.printHours = (hh || 0) + (mm || 0) / 60;
  });

  let saveLabel = $state('');
  let savedMsg = $state('');

  // edição de um cálculo salvo
  let editingId = $state<string | null>(null);
  let editingCreatedAt = 0;

  const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

  // carrega um registro do histórico quando a tela de Histórico pede edição
  $effect(() => {
    const rec = editState.record;
    if (!rec) return;
    job.filaments = rec.job.filaments.length ? clone(rec.job.filaments) : [emptyFilament()];
    job.laborMode = rec.job.laborMode;
    job.laborHours = rec.job.laborHours;
    job.laborFixedCentavos = rec.job.laborFixedCentavos;
    job.misc = clone(rec.job.misc);
    job.marginPercent = rec.job.marginPercent;
    job.marketplaceId = rec.job.marketplaceId;
    hh = Math.floor(rec.job.printHours);
    mm = Math.round((rec.job.printHours - hh) * 60);
    saveLabel = rec.label;
    editingId = rec.id;
    editingCreatedAt = rec.createdAt;
    editState.record = null; // consumido
  });

  function resetCalc() {
    job.filaments = [emptyFilament()];
    job.laborMode = 'hourly';
    job.laborHours = 0;
    job.laborFixedCentavos = 0;
    job.misc = [];
    job.marginPercent = 50;
    job.marketplaceId = null;
    hh = 0;
    mm = 0;
    saveLabel = '';
    editingId = null;
  }

  let breakdown = $derived(computeBreakdown(settings, job));

  function addFilament() {
    if (job.filaments.length < 4) job.filaments.push(emptyFilament());
  }
  function removeFilament(i: number) {
    job.filaments.splice(i, 1);
    if (job.filaments.length === 0) job.filaments.push(emptyFilament());
  }

  function onPickProfile(i: number, profileId: string) {
    const f = job.filaments[i];
    f.profileId = profileId;
    const list = $filaments ?? [];
    const p = list.find((x) => x.id === profileId);
    if (p) {
      f.name = p.name;
      f.pricePerKgCentavos = p.pricePerKgCentavos;
    }
  }

  function addMisc() {
    job.misc.push({ label: '', costCentavos: 0 });
  }
  function removeMisc(i: number) {
    job.misc.splice(i, 1);
  }

  async function salvarHistorico() {
    const label = saveLabel.trim() || new Date().toLocaleString('pt-BR');
    if (editingId) {
      await updateHistory({
        id: editingId,
        createdAt: editingCreatedAt,
        label,
        job: clone(job),
        configSnapshot: clone(settings),
        breakdown: clone(breakdown),
      });
      savedMsg = 'Cálculo atualizado ✓';
      editingId = null;
      saveLabel = '';
    } else {
      await saveHistory({
        label,
        job: clone(job),
        configSnapshot: clone(settings),
        breakdown: clone(breakdown),
      });
      savedMsg = 'Cálculo salvo no histórico ✓';
      saveLabel = '';
    }
    setTimeout(() => (savedMsg = ''), 3500);
  }
</script>

<div class="space-y-4 p-4 pb-40">
  <div class="flex items-center justify-between gap-2">
    <h1 class="text-xl font-bold">{editingId ? 'Editar cálculo' : 'Calcular impressão'}</h1>
    {#if editingId}
      <button class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300" onclick={resetCalc}>
        Novo cálculo
      </button>
    {/if}
  </div>
  {#if editingId}
    <div class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800">
      Editando um cálculo salvo. Ao salvar, o registro no histórico será atualizado.
    </div>
  {/if}

  <!-- Filamentos -->
  <section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
    <div class="mb-2 flex items-center justify-between">
      <h2 class="font-semibold text-sky-600 dark:text-sky-400">Filamentos</h2>
      <span class="text-xs text-slate-400">{job.filaments.length}/4</span>
    </div>
    <div class="space-y-3">
      {#each job.filaments as f, i (i)}
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div class="mb-2 flex items-center justify-between gap-2">
            <select
              class="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
              value={f.profileId}
              onchange={(e) => onPickProfile(i, (e.target as HTMLSelectElement).value)}
            >
              <option value="">— Manual —</option>
              {#each $filaments ?? [] as p (p.id)}
                <option value={p.id}>{p.name}</option>
              {/each}
            </select>
            {#if job.filaments.length > 1}
              <button class="shrink-0 text-red-500" onclick={() => removeFilament(i)}>✕</button>
            {/if}
          </div>
          {#if !f.profileId}
            <input
              class="mb-2 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="Nome do filamento"
              bind:value={f.name}
            />
          {/if}
          <div class="grid grid-cols-2 gap-2">
            <label class="block">
              <span class="mb-1 block text-xs text-slate-500">Gramas</span>
              <NumberInput bind:value={f.grams} suffix="g" decimals={1} />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-slate-500">Preço/kg</span>
              <CurrencyInput bind:value={f.pricePerKgCentavos} />
            </label>
          </div>
          <p class="mt-2 text-right text-xs text-slate-500">
            = {formatBRL(filamentCostCentavos(f.grams, f.pricePerKgCentavos))}
          </p>
        </div>
      {/each}
      {#if job.filaments.length < 4}
        <button class="text-sm font-medium text-sky-600" onclick={addFilament}>+ Adicionar filamento</button>
      {/if}
    </div>
  </section>

  <!-- Tempo + mão de obra -->
  <section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
    <h2 class="mb-3 font-semibold text-sky-600 dark:text-sky-400">Tempo & mão de obra</h2>
    <div class="mb-3">
      <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Tempo de impressão</span>
      <div class="grid grid-cols-2 gap-2">
        <NumberInput bind:value={hh} suffix="h" decimals={0} />
        <NumberInput bind:value={mm} suffix="min" decimals={0} />
      </div>
    </div>

    <div class="mb-2 flex gap-2">
      <button
        class="flex-1 rounded-lg py-1.5 text-sm font-medium {job.laborMode === 'hourly' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
        onclick={() => (job.laborMode = 'hourly')}>Por hora</button>
      <button
        class="flex-1 rounded-lg py-1.5 text-sm font-medium {job.laborMode === 'fixed' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
        onclick={() => (job.laborMode = 'fixed')}>Valor fixo</button>
    </div>
    {#if job.laborMode === 'hourly'}
      <label class="block">
        <span class="mb-1 block text-xs text-slate-500">Horas de trabalho (× {formatBRL(settings.laborRateCentavos)}/h)</span>
        <NumberInput bind:value={job.laborHours} suffix="h" decimals={2} />
      </label>
    {:else}
      <label class="block">
        <span class="mb-1 block text-xs text-slate-500">Valor fixo de mão de obra</span>
        <CurrencyInput bind:value={job.laborFixedCentavos} />
      </label>
    {/if}
  </section>

  <!-- Custos avulsos -->
  <section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
    <h2 class="mb-3 font-semibold text-sky-600 dark:text-sky-400">Custos avulsos</h2>
    <div class="space-y-2">
      {#each job.misc as m, i (i)}
        <div class="flex items-center gap-2">
          <input class="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900" placeholder="Ex: embalagem, frete" bind:value={m.label} />
          <div class="w-32 shrink-0"><CurrencyInput bind:value={m.costCentavos} /></div>
          <button class="shrink-0 text-red-500" onclick={() => removeMisc(i)}>✕</button>
        </div>
      {/each}
      <button class="text-sm font-medium text-sky-600" onclick={addMisc}>+ Adicionar custo</button>
    </div>
  </section>

  <!-- Preço de venda -->
  <section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
    <h2 class="mb-3 font-semibold text-sky-600 dark:text-sky-400">Preço de venda</h2>
    <div class="grid grid-cols-2 gap-3">
      <label class="block">
        <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Margem de lucro</span>
        <NumberInput bind:value={job.marginPercent} suffix="%" decimals={1} />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Marketplace</span>
        <select class="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" bind:value={job.marketplaceId}>
          <option value={null}>Não aplicável</option>
          {#each settings.marketplaces as mp (mp.id)}
            <option value={mp.id}>{mp.name} ({mp.ratePercent}%)</option>
          {/each}
        </select>
      </label>
    </div>
  </section>
</div>

<!-- Resultado fixo no rodapé -->
<div class="fixed inset-x-0 bottom-16 z-20 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
  <div class="mx-auto max-w-md">
    <div class="flex items-end justify-between">
      <div>
        <p class="text-xs text-slate-500">Custo total</p>
        <p class="text-lg font-semibold">{formatBRL(breakdown.totalCostCentavos)}</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-slate-500">Preço de venda</p>
        <p class="text-3xl font-extrabold text-sky-600 dark:text-sky-400">{formatBRL(breakdown.finalPriceCentavos)}</p>
      </div>
    </div>
    <details class="mt-2 text-xs text-slate-600 dark:text-slate-300">
      <summary class="cursor-pointer text-sky-600">Ver detalhamento</summary>
      <ul class="mt-2 space-y-0.5">
        <li class="flex justify-between"><span>Filamento</span><span>{formatBRL(breakdown.filamentCentavos)}</span></li>
        <li class="flex justify-between"><span>Energia</span><span>{formatBRL(breakdown.energyCentavos)}</span></li>
        <li class="flex justify-between"><span>Desgaste</span><span>{formatBRL(breakdown.wearCentavos)}</span></li>
        <li class="flex justify-between"><span>Mão de obra</span><span>{formatBRL(breakdown.laborCentavos)}</span></li>
        <li class="flex justify-between"><span>Avulsos</span><span>{formatBRL(breakdown.miscCentavos)}</span></li>
        <li class="flex justify-between border-t border-slate-200 pt-0.5 font-medium dark:border-slate-700"><span>Com margem</span><span>{formatBRL(breakdown.priceWithMarginCentavos)}</span></li>
        {#if breakdown.marketplaceName}
          <li class="flex justify-between"><span>+ {breakdown.marketplaceName} ({breakdown.marketplaceRatePercent}%)</span><span>{formatBRL(breakdown.finalPriceCentavos - breakdown.priceWithMarginCentavos)}</span></li>
        {/if}
      </ul>
      <div class="mt-3 flex gap-2">
        <input class="w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-900" placeholder="Nome da peça (opcional)" bind:value={saveLabel} />
        <button class="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500" onclick={salvarHistorico}>{editingId ? 'Atualizar' : 'Salvar'}</button>
      </div>
      {#if savedMsg}<p class="mt-1 text-emerald-600">{savedMsg}</p>{/if}
    </details>
  </div>
</div>
