<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Check, Spool, Clock, Receipt, DollarSign, Package, Calculator as CalcIcon, type Icon } from 'lucide-svelte';
  import CurrencyInput from '../components/CurrencyInput.svelte';
  import NumberInput from '../components/NumberInput.svelte';
  import { settings, tagColor } from '../lib/stores/settings.svelte';
  import { listFilaments, listCostItems, saveHistory, updateHistory, historyLabelExists } from '../lib/db';
  import { ui, editState } from '../lib/stores/ui.svelte';
  import { computeBreakdown } from '../lib/engine/pricing';
  import { filamentCostCentavos, wearCostCentavos } from '../lib/engine/costs';
  import type { JobInputs } from '../lib/engine/types';
  import { formatBRL } from '../lib/money';

  type Breakdown = ReturnType<typeof computeBreakdown>;

  const filaments = liveQuery(() => listFilaments());
  const costItems = liveQuery(() => listCostItems());

  function emptyFilament() {
    return { profileId: '', name: '', grams: 0, pricePerKgCentavos: 0 };
  }

  // marcas dos filamentos cadastrados (com grupo "Sem marca")
  const brands = $derived.by(() => {
    const set = new Set<string>();
    let hasNone = false;
    for (const p of $filaments ?? []) {
      const b = p.brand?.trim();
      if (b) set.add(b);
      else hasNone = true;
    }
    const arr = [...set].sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
    if (hasNone) arr.push('Sem marca');
    return arr;
  });
  function filamentsOfBrand(brand: string) {
    return ($filaments ?? []).filter((p) => (p.brand?.trim() || 'Sem marca') === brand);
  }
  // tipos distintos dos filamentos de uma marca
  function typesOfBrand(brand: string) {
    const set = new Set<string>();
    for (const p of filamentsOfBrand(brand)) if (p.type?.trim()) set.add(p.type.trim());
    return [...set].sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  }
  function filamentsOfBrandAndType(brand: string, type: string) {
    return filamentsOfBrand(brand).filter((p) => (p.type?.trim() || '') === type);
  }

  // estado de UI por filamento (marca/tipo/modo) — espelha job.plates[pi].filaments[fi]
  type FilUI = { mode: 'cadastrado' | 'manual'; brand: string; type: string };
  function newFilUI(): FilUI {
    return { mode: brands.length ? 'cadastrado' : 'manual', brand: brands[0] ?? '', type: '' };
  }
  function newPlate() {
    return { filaments: [emptyFilament()] };
  }

  let job = $state<JobInputs>({
    filaments: [],
    plates: [newPlate()],
    printHours: 0,
    laborMode: 'hourly',
    laborHours: 0,
    laborFixedCentavos: 0,
    misc: [],
    useWear: true,
    priceMode: 'margin',
    marginPercent: 50,
    fixedPriceCentavos: 0,
    marketplaceId: null,
  });

  // UI por placa -> por filamento
  let pui = $state<FilUI[][]>([[newFilUI()]]);
  // confirmação por placa
  let plateOk = $state<boolean[]>([false]);
  let plateConf = $state<string[]>(['']);
  let plateErr = $state<string[]>(['']);

  function allPlates() { return job.plates ?? []; }

  function setFilMode(pi: number, fi: number, mode: 'cadastrado' | 'manual') {
    pui[pi][fi].mode = mode;
    const f = allPlates()[pi].filaments[fi];
    if (mode === 'manual') {
      f.profileId = '';
    } else if (!pui[pi][fi].brand) {
      pui[pi][fi].brand = brands[0] ?? '';
    }
  }
  function onPickBrand(pi: number, fi: number, brand: string) {
    pui[pi][fi].brand = brand;
    pui[pi][fi].type = '';
    const f = allPlates()[pi].filaments[fi];
    f.profileId = ''; f.name = ''; f.pricePerKgCentavos = 0;
  }
  function onPickType(pi: number, fi: number, type: string) {
    pui[pi][fi].type = type;
    const f = allPlates()[pi].filaments[fi];
    f.profileId = ''; f.name = ''; f.pricePerKgCentavos = 0;
  }

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
  let calcMsg = $state('');

  // ---- confirmação por seção ----
  // assinaturas de cada seção; ao mudar, a confirmação cai
  function sigFilaments() { return JSON.stringify(job.plates); }
  function sigLabor() { return JSON.stringify([hh, mm, job.laborMode, laborHh, laborMm, job.laborFixedCentavos, job.useWear]); }
  function sigMisc() { return JSON.stringify(job.misc); }
  function sigPrice() { return JSON.stringify([job.priceMode, job.marginPercent, job.fixedPriceCentavos, job.marketplaceId]); }
  function sigAll() { return sigFilaments() + sigLabor() + sigMisc() + sigPrice(); }

  const curL = $derived(sigLabor());
  const curP = $derived(sigPrice());
  const curAll = $derived(sigAll());

  let okL = $state(false);
  let okP = $state(false);
  let confL = $state('');
  let confP = $state('');

  // filamentos OK = há placas e todas confirmadas
  let okF = $derived(allPlates().length > 0 && allPlates().every((_, i) => plateOk[i]));

  // editar uma placa derruba a confirmação dela
  $effect(() => {
    const ps = job.plates ?? [];
    for (let i = 0; i < ps.length; i++) {
      if (plateOk[i] && JSON.stringify(ps[i].filaments) !== plateConf[i]) plateOk[i] = false;
    }
  });
  // editar uma seção derruba a confirmação dela
  $effect(() => { if (okL && curL !== confL) okL = false; });
  $effect(() => { if (okP && curP !== confP) okP = false; });

  let errL = $state('');
  let errP = $state('');

  function validarPlaca(pi: number): string {
    const fils = allPlates()[pi].filaments;
    for (let fi = 0; fi < fils.length; fi++) {
      const f = fils[fi];
      const u = pui[pi][fi];
      if (u.mode === 'cadastrado') {
        if (!u.brand) return `Filamento #${fi + 1}: selecione a marca.`;
        if (!u.type) return `Filamento #${fi + 1}: selecione o tipo.`;
        if (!f.profileId) return `Filamento #${fi + 1}: selecione o filamento.`;
      } else {
        if (!f.name.trim()) return `Filamento #${fi + 1}: informe o nome.`;
        if (!(f.pricePerKgCentavos > 0)) return `Filamento #${fi + 1}: informe o preço/kg.`;
      }
      if (!(f.grams > 0)) return `Filamento #${fi + 1}: informe os gramas.`;
    }
    return '';
  }
  function validarTempo(): string {
    if (!(job.printHours > 0)) return 'Informe o tempo de impressão.';
    if (job.laborMode === 'fixed' && !(job.laborFixedCentavos > 0)) return 'Informe o valor fixo de mão de obra.';
    return '';
  }
  function validarPreco(): string {
    if (job.priceMode === 'fixed' && !(job.fixedPriceCentavos > 0)) return 'Informe o valor de venda.';
    return '';
  }

  function togglePlate(pi: number) {
    if (!plateOk[pi]) {
      const e = validarPlaca(pi);
      if (e) { plateErr[pi] = e; return; }
    }
    plateErr[pi] = '';
    plateOk[pi] = !plateOk[pi];
    if (plateOk[pi]) plateConf[pi] = JSON.stringify(allPlates()[pi].filaments);
  }
  function toggleL() {
    if (!okL) {
      const e = validarTempo();
      if (e) { errL = e; return; }
    }
    errL = '';
    okL = !okL;
    if (okL) confL = sigLabor();
  }
  function toggleP() {
    if (!okP) {
      const e = validarPreco();
      if (e) { errP = e; return; }
    }
    errP = '';
    okP = !okP;
    if (okP) confP = sigPrice();
  }

  // ---- resultado (só após clicar Calcular) ----
  let result = $state<Breakdown | null>(null);
  let resultSig = $state('');
  // qualquer edição após calcular invalida o resultado
  $effect(() => { if (result && curAll !== resultSig) result = null; });

  let lucro = $derived(result ? result.priceWithMarginCentavos - result.totalCostCentavos : 0);
  let desgaste = $derived(wearCostCentavos(settings, job.printHours));

  function calcular() {
    const faltam: string[] = [];
    if (!okF) faltam.push('Placas / filamentos');
    if (!okL) faltam.push('Tempo & mão de obra');
    if (!okP) faltam.push('Preço de venda');
    if (faltam.length) {
      result = null;
      calcMsg = `Confirme antes de calcular: ${faltam.join(', ')}.`;
      return;
    }
    calcMsg = '';
    // achata as placas no campo filaments (compat + engine)
    job.filaments = allPlates().flatMap((p) => p.filaments);
    result = computeBreakdown(settings, job);
    resultSig = sigAll();
  }

  // edição de um cálculo salvo
  let editingId = $state<string | null>(null);
  let editingCreatedAt = 0;

  const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

  // carrega um registro do histórico quando a tela de Histórico pede edição
  $effect(() => {
    const rec = editState.record;
    if (!rec) return;
    // registros antigos têm só job.filaments (sem placas): embrulha em 1 placa
    const srcPlates = rec.job.plates && rec.job.plates.length
      ? clone(rec.job.plates)
      : [{ filaments: rec.job.filaments.length ? clone(rec.job.filaments) : [emptyFilament()] }];
    job.plates = srcPlates;
    job.filaments = srcPlates.flatMap((pl) => pl.filaments);
    pui = srcPlates.map((pl) =>
      pl.filaments.map((f) => {
        if (f.profileId) {
          const p = ($filaments ?? []).find((x) => x.id === f.profileId);
          return { mode: 'cadastrado' as const, brand: p ? p.brand?.trim() || 'Sem marca' : '', type: p?.type?.trim() || '' };
        }
        return { mode: 'manual' as const, brand: '', type: '' };
      })
    );
    plateOk = srcPlates.map(() => true);
    plateConf = srcPlates.map((pl) => JSON.stringify(pl.filaments));
    plateErr = srcPlates.map(() => '');
    job.laborMode = rec.job.laborMode;
    job.laborHours = rec.job.laborHours;
    job.laborFixedCentavos = rec.job.laborFixedCentavos;
    job.misc = clone(rec.job.misc);
    job.useWear = rec.job.useWear ?? true;
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
    // ao editar, confirma tudo e já mostra o resultado salvo
    confL = sigLabor(); confP = sigPrice();
    okL = okP = true;
    result = clone(rec.breakdown);
    resultSig = sigAll();
    calcMsg = '';
    editState.record = null; // consumido
  });

  function resetCalc() {
    job.plates = [newPlate()];
    job.filaments = [];
    pui = [[newFilUI()]];
    plateOk = [false]; plateConf = ['']; plateErr = [''];
    job.laborMode = 'hourly';
    job.laborHours = 0;
    job.laborFixedCentavos = 0;
    job.misc = [];
    job.useWear = true;
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
    okL = okP = false;
    result = null;
    calcMsg = '';
    savedMsg = '';
  }

  const MAX_PLATES = 12;
  const MAX_FILAMENTS = 12;

  function setPlateCount(n: number) {
    const target = Math.min(MAX_PLATES, Math.max(1, n));
    const ps = allPlates();
    while (ps.length < target) {
      ps.push(newPlate());
      pui.push([newFilUI()]);
      plateOk.push(false); plateConf.push(''); plateErr.push('');
    }
    while (ps.length > target) {
      ps.pop(); pui.pop(); plateOk.pop(); plateConf.pop(); plateErr.pop();
    }
  }

  function setFilamentCount(pi: number, n: number) {
    const target = Math.min(MAX_FILAMENTS, Math.max(1, n));
    const fils = allPlates()[pi].filaments;
    while (fils.length < target) { fils.push(emptyFilament()); pui[pi].push(newFilUI()); }
    while (fils.length > target) { fils.pop(); pui[pi].pop(); }
  }

  function onPickProfile(pi: number, fi: number, profileId: string) {
    const f = allPlates()[pi].filaments[fi];
    f.profileId = profileId;
    const p = ($filaments ?? []).find((x) => x.id === profileId);
    if (p) { f.name = p.name; f.pricePerKgCentavos = p.pricePerKgCentavos; }
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

  let tagsAtivas = $derived(new Set(parseTags(saveTags).map((t) => t.toLowerCase())));
  function toggleTag(tag: string) {
    const cur = parseTags(saveTags);
    const i = cur.findIndex((t) => t.toLowerCase() === tag.toLowerCase());
    if (i >= 0) cur.splice(i, 1);
    else cur.push(tag);
    saveTags = cur.join(', ');
  }

  async function cadastrar() {
    if (!result) return; // só cadastra após calcular
    const label = saveLabel.trim();
    if (!label) {
      savedMsg = 'Dê um nome ao projeto antes de cadastrar.';
      setTimeout(() => (savedMsg = ''), 3500);
      return;
    }
    // nome único obrigatório
    if (await historyLabelExists(label, editingId ?? undefined)) {
      savedMsg = `Já existe um projeto chamado "${label}". Escolha outro nome.`;
      setTimeout(() => (savedMsg = ''), 4500);
      return;
    }
    const tags = parseTags(saveTags);
    if (editingId) {
      if (!confirm(`Tem certeza que deseja atualizar o projeto "${label}"?`)) return;
      await updateHistory({
        id: editingId,
        createdAt: editingCreatedAt,
        label,
        tags,
        job: clone(job),
        configSnapshot: clone(settings),
        breakdown: clone(result),
      });
      savedMsg = 'Projeto atualizado ✓';
      editingId = null;
    } else {
      if (!confirm(`Tem certeza que deseja cadastrar o projeto "${label}"?`)) return;
      await saveHistory({
        label,
        tags,
        job: clone(job),
        configSnapshot: clone(settings),
        breakdown: clone(result),
      });
      savedMsg = 'Projeto cadastrado ✓';
    }
    resetCalc();
    ui.tab = 'history';
  }
</script>

{#snippet okToggle(on: boolean, toggle: () => void)}
  <button
    type="button"
    class="flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors {on
      ? 'bg-emerald-500 text-white'
      : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}"
    onclick={toggle}
  >
    {#if on}<Check size={14} /> OK{:else}Confirmar{/if}
  </button>
{/snippet}

{#snippet head(IconC: typeof Icon, grad: string, title: string)}
  <div class="flex items-center gap-2.5">
    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br {grad} text-white shadow-md">
      <IconC size={18} />
    </span>
    <h2 class="font-semibold text-slate-100">{title}</h2>
  </div>
{/snippet}

<div class="space-y-4 p-4 pb-24">
  <div class="flex items-center justify-between gap-2">
    <h1 class="text-xl font-bold">{editingId ? 'Editar cálculo' : 'Calcular custo da impressão'}</h1>
    {#if editingId}
      <button class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300" onclick={resetCalc}>
        Novo cálculo
      </button>
    {/if}
  </div>
  {#if editingId}
    <div class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800">
      Editando um cálculo salvo. Ao cadastrar, o registro no histórico será atualizado.
    </div>
  {/if}

  <!-- Nome do projeto -->
  <section class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    <div class="mb-3">{@render head(Package, 'from-sky-500 to-cyan-500', 'Projeto')}</div>
    <label class="block">
      <span class="mb-1 block text-sm font-semibold text-sky-400">Nome do projeto</span>
      <input
        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        placeholder="Ex: Suporte de fone"
        maxlength="60"
        bind:value={saveLabel}
      />
    </label>
    <div class="mt-3">
      <div class="mb-2 flex items-center gap-1.5">
        <span class="text-sm font-semibold text-sky-600 dark:text-sky-400">Tags</span>
        <button
          type="button"
          class="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-600 dark:bg-sky-500/20 dark:text-sky-300"
          aria-label="As tags são cadastradas na aba Configurações."
          title="As tags são cadastradas na aba Configurações."
        >i</button>
      </div>
      {#if settings.tags.length}
        <div class="flex flex-wrap gap-2">
          {#each settings.tags ?? [] as tag (tag)}
            {@const ativo = tagsAtivas.has(tag.toLowerCase())}
            <button
              type="button"
              class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={ativo ? `background:${tagColor(tag)};color:#fff` : `background:${tagColor(tag)}22;color:${tagColor(tag)}`}
              onclick={() => toggleTag(tag)}
            >{tag}</button>
          {/each}
        </div>
      {:else}
        <p class="text-xs text-slate-400">Nenhuma tag cadastrada. Adicione em Configurações → Tags dos projetos.</p>
      {/if}
    </div>
  </section>

  <!-- Placas e filamentos -->
  <section class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    <div class="mb-3">{@render head(Spool, 'from-violet-500 to-purple-500', 'Placas e filamentos')}</div>

    <!-- Quantidade de placas -->
    <div class="mb-4">
      <span class="mb-1 block text-xs text-slate-500">Quantidade de placas</span>
      <div class="flex gap-2">
        {#each [1, 2, 3, 4] as n (n)}
          <button
            class="flex-1 rounded-lg py-1.5 text-sm font-medium {allPlates().length === n ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
            onclick={() => setPlateCount(n)}>{n}</button>
        {/each}
        <button
          class="flex-1 rounded-lg py-1.5 text-sm font-medium {allPlates().length >= 5 ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
          onclick={() => setPlateCount(Math.max(5, allPlates().length))}>5+</button>
      </div>
      {#if allPlates().length >= 5}
        <div class="mt-2 flex items-center justify-center gap-4">
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300"
            disabled={allPlates().length <= 5}
            onclick={() => setPlateCount(allPlates().length - 1)}>−</button>
          <span class="w-8 text-center text-lg font-bold">{allPlates().length}</span>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300"
            disabled={allPlates().length >= MAX_PLATES}
            onclick={() => setPlateCount(allPlates().length + 1)}>+</button>
        </div>
      {/if}
    </div>

    <!-- Uma placa por vez -->
    <div class="space-y-4">
      {#each allPlates() as plate, pi (pi)}
        <div class="rounded-xl border border-violet-300/30 bg-violet-500/5 p-3">
          <div class="mb-2 flex items-center justify-between gap-2">
            <span class="rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">Placa {pi + 1}</span>
            {@render okToggle(plateOk[pi], () => togglePlate(pi))}
          </div>
          {#if plateErr[pi]}<p class="mb-2 text-xs font-medium text-amber-400">{plateErr[pi]}</p>{/if}

          <div class="mb-3">
            <span class="mb-1 block text-xs text-slate-500">Filamentos nesta placa</span>
            <div class="flex gap-2">
              {#each [1, 2, 3, 4] as n (n)}
                <button
                  class="flex-1 rounded-lg py-1.5 text-sm font-medium {plate.filaments.length === n ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
                  onclick={() => setFilamentCount(pi, n)}>{n}</button>
              {/each}
              <button
                class="flex-1 rounded-lg py-1.5 text-sm font-medium {plate.filaments.length >= 5 ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
                onclick={() => setFilamentCount(pi, Math.max(5, plate.filaments.length))}>5+</button>
            </div>
            {#if plate.filaments.length >= 5}
              <div class="mt-2 flex items-center justify-center gap-4">
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300"
                  disabled={plate.filaments.length <= 5}
                  onclick={() => setFilamentCount(pi, plate.filaments.length - 1)}>−</button>
                <span class="w-8 text-center text-lg font-bold">{plate.filaments.length}</span>
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300"
                  disabled={plate.filaments.length >= MAX_FILAMENTS}
                  onclick={() => setFilamentCount(pi, plate.filaments.length + 1)}>+</button>
              </div>
            {/if}
          </div>

          <div class="space-y-3">
            {#each plate.filaments as f, fi (fi)}
              <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div class="mb-2 flex items-center gap-2">
                  <span class="shrink-0 text-xs font-medium text-slate-400">#{fi + 1}</span>
                  <div class="flex flex-1 gap-1.5">
                    <button
                      type="button"
                      class="flex-1 rounded-lg py-1 text-xs font-medium {pui[pi][fi].mode === 'cadastrado' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
                      onclick={() => setFilMode(pi, fi, 'cadastrado')}
                    >Cadastrado</button>
                    <button
                      type="button"
                      class="flex-1 rounded-lg py-1 text-xs font-medium {pui[pi][fi].mode === 'manual' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
                      onclick={() => setFilMode(pi, fi, 'manual')}
                    >Manual</button>
                  </div>
                </div>
                {#if pui[pi][fi].mode === 'cadastrado'}
                  {#if brands.length}
                    <div class="mb-2 grid grid-cols-2 gap-2">
                      <select
                        class="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
                        value={pui[pi][fi].brand}
                        onchange={(e) => onPickBrand(pi, fi, (e.target as HTMLSelectElement).value)}
                      >
                        <option value="" disabled>Selecione a marca</option>
                        {#each brands as b (b)}<option value={b}>{b}</option>{/each}
                      </select>
                      <select
                        class="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900 disabled:opacity-50"
                        value={pui[pi][fi].type}
                        disabled={!pui[pi][fi].brand}
                        onchange={(e) => onPickType(pi, fi, (e.target as HTMLSelectElement).value)}
                      >
                        <option value="">Selecione o tipo</option>
                        {#each typesOfBrand(pui[pi][fi].brand) as t (t)}<option value={t}>{t}</option>{/each}
                      </select>
                    </div>
                    <select
                      class="mb-2 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900 disabled:opacity-50"
                      value={f.profileId}
                      disabled={!pui[pi][fi].type}
                      onchange={(e) => onPickProfile(pi, fi, (e.target as HTMLSelectElement).value)}
                    >
                      <option value="">Selecione o filamento</option>
                      {#each filamentsOfBrandAndType(pui[pi][fi].brand, pui[pi][fi].type) as p (p.id)}<option value={p.id}>{p.colorLabel || p.name}</option>{/each}
                    </select>
                  {:else}
                    <p class="mb-2 text-xs text-slate-400">Nenhum filamento cadastrado. Use Manual ou cadastre na aba Filamentos.</p>
                  {/if}
                {:else}
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

          <p class="mt-2 text-right text-xs font-medium text-slate-400">
            Subtotal da placa: {formatBRL(plate.filaments.reduce((s, f) => s + filamentCostCentavos(f.grams, f.pricePerKgCentavos), 0))}
          </p>
        </div>
      {/each}
    </div>
  </section>

  <!-- Tempo + mão de obra -->
  <section class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      {@render head(Clock, 'from-amber-500 to-orange-500', 'Tempo & mão de obra')}
      {@render okToggle(okL, toggleL)}
    </div>
    {#if errL}<p class="mb-2 text-xs font-medium text-amber-400">{errL}</p>{/if}
    <div class="mb-3">
      <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Tempo de impressão</span>
      <div class="grid grid-cols-2 gap-2">
        <NumberInput bind:value={hh} suffix="h" decimals={0} />
        <NumberInput bind:value={mm} suffix="min" decimals={0} />
      </div>
    </div>

    <!-- Desgaste da máquina (opcional) -->
    <label class="mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
      <div class="min-w-0">
        <span class="text-sm font-medium text-slate-200">Usar desgaste da máquina</span>
        <p class="text-xs text-slate-400">
          {job.useWear !== false ? '+' : ''}{formatBRL(desgaste)} pelo tempo de impressão
        </p>
      </div>
      <input
        type="checkbox"
        class="h-5 w-5 shrink-0 accent-sky-500"
        checked={job.useWear !== false}
        onchange={(e) => (job.useWear = e.currentTarget.checked)}
      />
    </label>

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
  <section class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      {@render head(Receipt, 'from-rose-500 to-pink-500', 'Custos avulsos')}
      <span class="text-xs text-slate-400">opcional</span>
    </div>
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
  <section class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      {@render head(DollarSign, 'from-emerald-500 to-teal-500', 'Preço de venda')}
      {@render okToggle(okP, toggleP)}
    </div>
    {#if errP}<p class="mb-2 text-xs font-medium text-amber-400">{errP}</p>{/if}
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
          {#each settings.marketplaces ?? [] as mp (mp.id)}
            <option value={mp.id}>{mp.name} ({mp.ratePercent}%)</option>
          {/each}
        </select>
      </label>
    </div>
  </section>

  <!-- Ações: calcular + cadastrar -->
  <section class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    <div class="mb-3">{@render head(CalcIcon, 'from-sky-500 to-violet-500', 'Resultado')}</div>
    <button
      class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-sky-500 bg-sky-500/10 px-3 py-3 text-base font-bold uppercase tracking-wide text-sky-300 transition-colors hover:bg-sky-500/20 active:scale-95"
      onclick={calcular}
    >
      <CalcIcon size={20} /> Calcular
    </button>
    {#if calcMsg}<p class="mt-2 text-center text-sm font-medium text-amber-600 dark:text-amber-400">{calcMsg}</p>{/if}

    {#if result}
      <!-- Custo total destacado (gasto = vermelho) -->
      <div class="mt-4 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 p-4 text-center text-white shadow-lg shadow-red-500/25">
        <p class="text-xs font-semibold uppercase tracking-wide text-white/80">Custo total (gasto)</p>
        <p class="mt-1 text-3xl font-extrabold">{formatBRL(result.totalCostCentavos)}</p>
      </div>
      <div class="mt-3 grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 p-3 text-center text-white shadow-md shadow-sky-500/20">
          <p class="text-xs font-medium text-white/80">Preço de venda</p>
          <p class="mt-0.5 text-xl font-bold">{formatBRL(result.finalPriceCentavos)}</p>
        </div>
        <div class="rounded-2xl p-3 text-center text-white shadow-md {lucro >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/20' : 'bg-gradient-to-br from-rose-500 to-red-600 shadow-red-500/20'}">
          <p class="text-xs font-medium text-white/80">Lucro</p>
          <p class="mt-0.5 text-xl font-bold">{formatBRL(lucro)}</p>
        </div>
      </div>
      <ul class="mt-3 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
        <li class="flex justify-between"><span>Filamento</span><span>{formatBRL(result.filamentCentavos)}</span></li>
        <li class="flex justify-between"><span>Energia</span><span>{formatBRL(result.energyCentavos)}</span></li>
        <li class="flex justify-between"><span>Desgaste</span><span>{formatBRL(result.wearCentavos)}</span></li>
        <li class="flex justify-between"><span>Mão de obra</span><span>{formatBRL(result.laborCentavos)}</span></li>
        <li class="flex justify-between"><span>Avulsos</span><span>{formatBRL(result.miscCentavos)}</span></li>
        <li class="flex justify-between border-t border-slate-200 pt-0.5 font-medium dark:border-slate-700"><span>{job.priceMode === 'fixed' ? 'Preço informado' : 'Com margem'}</span><span>{formatBRL(result.priceWithMarginCentavos)}</span></li>
        {#if result.marketplaceName}
          <li class="flex justify-between"><span>+ {result.marketplaceName} ({result.marketplaceRatePercent}%)</span><span>{formatBRL(result.finalPriceCentavos - result.priceWithMarginCentavos)}</span></li>
        {/if}
      </ul>
    {/if}

    <div class="mt-4">
      <button
        class="w-full rounded-xl px-3 py-2.5 font-semibold text-white shadow-md transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 {editingId ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-orange-500/25' : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25'}"
        disabled={!result}
        onclick={cadastrar}
      >
        {editingId ? 'Atualizar projeto' : 'Cadastrar projeto'}
      </button>
      {#if !result}
        <p class="mt-1 text-center text-xs text-slate-400">Calcule primeiro para liberar o cadastro.</p>
      {/if}
    </div>
    {#if savedMsg}<p class="mt-1 text-center text-sm text-emerald-600 dark:text-emerald-400">{savedMsg}</p>{/if}
  </section>
</div>
