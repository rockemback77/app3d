<script lang="ts">
  import { liveQuery } from 'dexie';
  import CurrencyInput from '../components/CurrencyInput.svelte';
  import NumberInput from '../components/NumberInput.svelte';
  import { settings } from '../lib/stores/settings.svelte';
  import { listFilaments, listCostItems, saveHistory, updateHistory } from '../lib/db';
  import { editState } from '../lib/stores/ui.svelte';
  import { computeBreakdown } from '../lib/engine/pricing';
  import { filamentCostCentavos } from '../lib/engine/costs';
  import type { JobInputs } from '../lib/engine/types';
  import { formatBRL } from '../lib/money';

  const filaments = liveQuery(() => listFilaments());
  const costItems = liveQuery(() => listCostItems());

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
    priceMode: 'margin',
    marginPercent: 50,
    fixedPriceCentavos: 0,
    marketplaceId: null,
  });

  // tempo em horas + minutos
  let hh = $state(0);
  let mm = $state(0);
  $effect(() => {
    job.printHours = (hh || 0) + (mm || 0) / 60;
  });

  // mão de obra em horas + minutos
  let laborHh = $state(0);
  let laborMm = $state(0);
  $effect(() => {
    job.laborHours = (laborHh || 0) + (laborMm || 0) / 60;
  });

  let saveLabel = $state('');
  let saveTags = $state('');
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
    job.priceMode = rec.job.priceMode ?? 'margin';
    job.marginPercent = rec.job.marginPercent;
    job.fixedPriceCentavos = rec.job.fixedPriceCentavos ?? 0;
    job.marketplaceId = rec.job.marketplaceId;
    hh = Math.floor(rec.job.printHours);
    mm = Math.round((rec.job.printHours - hh) * 60);
    laborHh = Math.floor(rec.job.laborHours);
    laborMm = Math.round((rec.job.laborHours - laborHh) * 60);
    saveLabel = rec.label;
    saveTags = (rec.tags ?? []).join(', ');
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
    job.priceMode = 'margin';
    job.marginPercent = 50;
    job.fixedPriceCentavos = 0;
    job.marketplaceId = null;
    hh = 0;
    mm = 0;
    laborHh = 0;
    laborMm = 0;
    saveLabel = '';
    saveTags = '';
    editingId = null;
  }

  let breakdown = $derived(computeBreakdown(settings, job));
  // lucro = o que sobra pro vendedor (preço após margem, já líquido da taxa de marketplace) menos o custo
  let lucro = $derived(breakdown.priceWithMarginCentavos - breakdown.totalCostCentavos);

  function setFilamentCount(n: number) {
    const target = Math.min(4, Math.max(1, n));
    while (job.filaments.length < target) job.filaments.push(emptyFilament());
    while (job.filaments.length > target) job.filaments.pop();
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
    job.misc.push({ label: '', costCentavos: 0, ref: '' });
  }
  function removeMisc(i: number) {
    job.misc.splice(i, 1);
  }
  function onPickMisc(i: number, ref: string) {
    const m = job.misc[i];
    m.ref = ref;
    if (ref === '__outro__') {
      m.label = '';
      m.costCentavos = 0;
    } else if (ref === '') {
      m.label = '';
      m.costCentavos = 0;
    } else {
      const c = ($costItems ?? []).find((x) => x.id === ref);
      if (c) {
        m.label = c.name;
        m.costCentavos = c.costCentavos;
      }
    }
  }

  function parseTags(s: string): string[] {
    return s
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 10);
  }

  async function salvarHistorico() {
    const label = saveLabel.trim();
    if (!label) {
      savedMsg = 'Dê um nome à peça antes de salvar.';
      setTimeout(() => (savedMsg = ''), 3500);
      return;
    }
    const tags = parseTags(saveTags);
    if (editingId) {
      if (!confirm('Atualizar esta peça salva com os valores atuais?')) return;
      await updateHistory({
        id: editingId,
        createdAt: editingCreatedAt,
        label,
        tags,
        job: clone(job),
        configSnapshot: clone(settings),
        breakdown: clone(breakdown),
      });
      savedMsg = 'Cálculo atualizado ✓';
      editingId = null;
      saveLabel = '';
      saveTags = '';
    } else {
      if (!confirm(`Cadastrar a peça "${label}" no histórico?`)) return;
      await saveHistory({
        label,
        tags,
        job: clone(job),
        configSnapshot: clone(settings),
        breakdown: clone(breakdown),
      });
      savedMsg = 'Cálculo salvo no histórico ✓';
      saveLabel = '';
      saveTags = '';
    }
    setTimeout(() => (savedMsg = ''), 3500);
  }
</script>

<div class="space-y-4 p-4 pb-24">
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

  <!-- Nome da peça -->
  <section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
    <label class="block">
      <span class="mb-1 block text-sm font-semibold text-sky-600 dark:text-sky-400">Nome da peça</span>
      <input
        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        placeholder="Ex: suporte de fone"
        maxlength="60"
        bind:value={saveLabel}
      />
    </label>
    <label class="mt-3 block">
      <span class="mb-1 block text-sm font-semibold text-sky-600 dark:text-sky-400">Tags</span>
      <input
        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        placeholder="Ex: decoração, cliente X (separe por vírgula)"
        maxlength="120"
        bind:value={saveTags}
      />
    </label>
  </section>

  <!-- Filamentos -->
  <section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
    <h2 class="mb-2 font-semibold text-sky-600 dark:text-sky-400">Filamentos</h2>
    <div class="mb-3">
      <span class="mb-1 block text-xs text-slate-500">Quantidade de filamentos</span>
      <div class="flex gap-2">
        {#each [1, 2, 3, 4] as n (n)}
          <button
            class="flex-1 rounded-lg py-1.5 text-sm font-medium {job.filaments.length === n ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
            onclick={() => setFilamentCount(n)}>{n}</button>
        {/each}
      </div>
    </div>
    <div class="space-y-3">
      {#each job.filaments as f, i (i)}
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div class="mb-2 flex items-center gap-2">
            <span class="shrink-0 text-xs font-medium text-slate-400">#{i + 1}</span>
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
          </div>
          {#if !f.profileId}
            <input
              class="mb-2 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="Nome do filamento"
              maxlength="60"
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
      <div class="block">
        <span class="mb-1 block text-xs text-slate-500">Tempo de trabalho (× {formatBRL(settings.laborRateCentavos)}/h)</span>
        <div class="grid grid-cols-2 gap-2">
          <NumberInput bind:value={laborHh} suffix="h" decimals={0} />
          <NumberInput bind:value={laborMm} suffix="min" decimals={0} />
        </div>
      </div>
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
    <div class="space-y-3">
      {#each job.misc as m, i (i)}
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div class="mb-2 flex items-center gap-2">
            <select
              class="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
              value={m.ref ?? ''}
              onchange={(e) => onPickMisc(i, (e.target as HTMLSelectElement).value)}
            >
              <option value="">— Selecione —</option>
              {#each $costItems ?? [] as c (c.id)}
                <option value={c.id}>{c.name}</option>
              {/each}
              <option value="__outro__">Outro</option>
            </select>
            <button class="shrink-0 text-red-500" onclick={() => removeMisc(i)}>✕</button>
          </div>
          {#if m.ref === '__outro__'}
            <input
              class="mb-2 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="Descreva o custo"
              maxlength="60"
              bind:value={m.label}
            />
          {/if}
          {#if m.ref}
            <label class="block">
              <span class="mb-1 block text-xs text-slate-500">Valor</span>
              <CurrencyInput bind:value={m.costCentavos} />
            </label>
          {/if}
        </div>
      {/each}
      <button class="text-sm font-medium text-sky-600" onclick={addMisc}>+ Adicionar custo</button>
    </div>
  </section>

  <!-- Preço de venda -->
  <section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
    <h2 class="mb-3 font-semibold text-sky-600 dark:text-sky-400">Preço de venda</h2>
    <div class="mb-3 flex gap-2">
      <button
        class="flex-1 rounded-lg py-1.5 text-sm font-medium {job.priceMode === 'margin' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
        onclick={() => (job.priceMode = 'margin')}>Por margem</button>
      <button
        class="flex-1 rounded-lg py-1.5 text-sm font-medium {job.priceMode === 'fixed' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
        onclick={() => (job.priceMode = 'fixed')}>Valor fixo</button>
    </div>
    <div class="grid grid-cols-2 gap-3">
      {#if job.priceMode === 'margin'}
        <label class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Margem de lucro</span>
          <NumberInput bind:value={job.marginPercent} suffix="%" decimals={1} />
        </label>
      {:else}
        <label class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Valor de venda</span>
          <CurrencyInput bind:value={job.fixedPriceCentavos} />
        </label>
      {/if}
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

  <!-- Resultado -->
  <section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
    <!-- Custo total destacado (gasto = vermelho) -->
    <div class="rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 p-4 text-center text-white shadow-lg shadow-red-500/25">
      <p class="text-xs font-semibold uppercase tracking-wide text-white/80">Custo total (gasto)</p>
      <p class="mt-1 text-3xl font-extrabold">{formatBRL(breakdown.totalCostCentavos)}</p>
    </div>
    <div class="mt-3 grid grid-cols-2 gap-3">
      <div class="rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 p-3 text-center text-white shadow-md shadow-sky-500/20">
        <p class="text-xs font-medium text-white/80">Preço de venda</p>
        <p class="mt-0.5 text-xl font-bold">{formatBRL(breakdown.finalPriceCentavos)}</p>
      </div>
      <div class="rounded-2xl p-3 text-center text-white shadow-md {lucro >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/20' : 'bg-gradient-to-br from-rose-500 to-red-600 shadow-red-500/20'}">
        <p class="text-xs font-medium text-white/80">Lucro</p>
        <p class="mt-0.5 text-xl font-bold">{formatBRL(lucro)}</p>
      </div>
    </div>
    <ul class="mt-3 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
      <li class="flex justify-between"><span>Filamento</span><span>{formatBRL(breakdown.filamentCentavos)}</span></li>
      <li class="flex justify-between"><span>Energia</span><span>{formatBRL(breakdown.energyCentavos)}</span></li>
      <li class="flex justify-between"><span>Desgaste</span><span>{formatBRL(breakdown.wearCentavos)}</span></li>
      <li class="flex justify-between"><span>Mão de obra</span><span>{formatBRL(breakdown.laborCentavos)}</span></li>
      <li class="flex justify-between"><span>Avulsos</span><span>{formatBRL(breakdown.miscCentavos)}</span></li>
      <li class="flex justify-between border-t border-slate-200 pt-0.5 font-medium dark:border-slate-700"><span>{job.priceMode === 'fixed' ? 'Preço informado' : 'Com margem'}</span><span>{formatBRL(breakdown.priceWithMarginCentavos)}</span></li>
      {#if breakdown.marketplaceName}
        <li class="flex justify-between"><span>+ {breakdown.marketplaceName} ({breakdown.marketplaceRatePercent}%)</span><span>{formatBRL(breakdown.finalPriceCentavos - breakdown.priceWithMarginCentavos)}</span></li>
      {/if}
    </ul>
    <div class="mt-4">
      <button class="w-full rounded-xl px-3 py-2.5 font-semibold text-white shadow-md transition-transform active:scale-95 {editingId ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-orange-500/25' : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25'}" onclick={salvarHistorico}>{editingId ? 'Atualizar cálculo' : 'Salvar no histórico'}</button>
    </div>
    {#if savedMsg}<p class="mt-1 text-center text-sm text-emerald-600">{savedMsg}</p>{/if}
  </section>
</div>
