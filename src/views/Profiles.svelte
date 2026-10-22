<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Spool } from 'lucide-svelte';
  import CurrencyInput from '../components/CurrencyInput.svelte';
  import { listFilaments, saveFilament, deleteFilament, filamentLabel, type FilamentProfile } from '../lib/db';
  import { formatBRL } from '../lib/money';

  const TYPES_BASE = ['PLA', 'PETG', 'ABS', 'TPU', 'Resina'];

  // tipo: escolher um conhecido ou "Outro" (digita texto livre em editing.type)
  let customTipo = $state(false);
  function onPickTipo(value: string) {
    if (!editing) return;
    if (value === 'Outro') {
      customTipo = true;
      editing.type = '';
    } else {
      customTipo = false;
      editing.type = value;
    }
  }

  const PRESET_COLORS = [
    { label: 'Preto', hex: '#1f2937' },
    { label: 'Branco', hex: '#f8fafc' },
    { label: 'Cinza', hex: '#9ca3af' },
    { label: 'Vermelho', hex: '#ef4444' },
    { label: 'Laranja', hex: '#f97316' },
    { label: 'Amarelo', hex: '#facc15' },
    { label: 'Verde', hex: '#22c55e' },
    { label: 'Azul', hex: '#3b82f6' },
    { label: 'Roxo', hex: '#8b5cf6' },
    { label: 'Rosa', hex: '#ec4899' },
  ];
  let customCor = $state(false);
  function pickPreset(c: { label: string; hex: string }) {
    if (!editing) return;
    editing.color = c.hex;
    editing.colorLabel = c.label;
    customCor = false;
  }

  // marca: usar uma já cadastrada (select) ou digitar manual
  let marcaMode = $state<'cadastrada' | 'manual'>('cadastrada');
  function setMarcaMode(m: 'cadastrada' | 'manual') {
    marcaMode = m;
    if (m === 'cadastrada' && editing && marcas.length && !marcas.includes(editing.brand ?? '')) {
      editing.brand = marcas[0];
    }
  }

  const filaments = liveQuery(() => listFilaments());

  // agrupa por marca (a lista já vem ordenada por marca)
  let grupos = $derived.by(() => {
    const list = $filaments ?? [];
    const out: { brand: string; items: FilamentProfile[] }[] = [];
    for (const f of list) {
      const b = f.brand?.trim() || 'Sem marca';
      let g = out[out.length - 1];
      if (!g || g.brand !== b) {
        g = { brand: b, items: [] };
        out.push(g);
      }
      g.items.push(f);
    }
    return out;
  });

  let marcaFiltro = $state<string | null>(null);

  // marcas já cadastradas (para sugerir no form e filtrar a lista)
  let marcas = $derived.by(() => {
    const set = new Set<string>();
    for (const f of $filaments ?? []) {
      const b = f.brand?.trim();
      if (b) set.add(b);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  });

  let gruposFiltrados = $derived(
    marcaFiltro ? grupos.filter((g) => g.brand === marcaFiltro) : grupos
  );

  let editing = $state<Partial<FilamentProfile> | null>(null);

  function novo() {
    const temMarcas = marcas.length > 0;
    editing = {
      name: '',
      type: 'PLA',
      color: '#3b82f6',
      colorLabel: 'Azul',
      brand: temMarcas ? marcas[0] : '',
      pricePerKgCentavos: 0,
    };
    customCor = false;
    customTipo = false;
    marcaMode = temMarcas ? 'cadastrada' : 'manual';
  }

  function editar(f: FilamentProfile) {
    editing = { ...f };
    customCor = !PRESET_COLORS.some((c) => c.hex.toLowerCase() === (f.color ?? '').toLowerCase());
    customTipo = !TYPES_BASE.includes(f.type);
    marcaMode = f.brand && marcas.includes(f.brand) ? 'cadastrada' : 'manual';
  }

  async function salvar() {
    if (!editing || !editing.type?.trim()) return;
    const label = filamentLabel(editing.type, editing.colorLabel);
    const acao = editing.id ? 'Atualizar' : 'Cadastrar';
    if (!confirm(`${acao} o filamento "${label}"?`)) return;
    await saveFilament({
      id: editing.id,
      type: editing.type.trim(),
      color: editing.color || '#38bdf8',
      colorLabel: editing.colorLabel,
      brand: editing.brand,
      pricePerKgCentavos: editing.pricePerKgCentavos || 0,
    });
    editing = null;
  }

  async function remover(f: FilamentProfile) {
    if (confirm(`Excluir o filamento "${f.name}"?`)) await deleteFilament(f.id);
  }
</script>

<div class="space-y-4 p-4 pb-8">
  <div class="flex items-center justify-between">
    <h1 class="flex items-center gap-2.5 text-xl font-bold">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-md"><Spool size={18} /></span>
      Filamentos
    </h1>
    <button class="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-400" onclick={novo}>
      + Novo
    </button>
  </div>

  {#if editing}
    <div class="glass p-4 ring-1 ring-sky-300/60 dark:ring-sky-500/40">
      <h2 class="mb-3 font-semibold">{editing.id ? 'Editar' : 'Novo'} filamento</h2>
      <div class="space-y-3">
        <div class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Marca</span>
          <div class="mb-2 flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-lg py-1.5 text-sm font-medium disabled:opacity-40 {marcaMode === 'cadastrada' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
              disabled={!marcas.length}
              onclick={() => setMarcaMode('cadastrada')}
            >Já cadastrada</button>
            <button
              type="button"
              class="flex-1 rounded-lg py-1.5 text-sm font-medium {marcaMode === 'manual' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
              onclick={() => setMarcaMode('manual')}
            >Manual</button>
          </div>
          {#if marcaMode === 'cadastrada' && marcas.length}
            <select class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" bind:value={editing.brand}>
              {#each marcas as m (m)}<option value={m}>{m}</option>{/each}
            </select>
          {:else}
            <input class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" bind:value={editing.brand} placeholder="Ex: Voolt, 3D Lab" maxlength="40" list="marcas-cadastradas" />
            <datalist id="marcas-cadastradas">
              {#each marcas as m (m)}<option value={m}></option>{/each}
            </datalist>
          {/if}
        </div>
        <div class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Tipo *</span>
          <select
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
            value={customTipo ? 'Outro' : editing.type}
            onchange={(e) => onPickTipo((e.target as HTMLSelectElement).value)}
          >
            {#each TYPES_BASE as t}<option value={t}>{t}</option>{/each}
            <option value="Outro">Outro</option>
          </select>
          {#if customTipo}
            <input
              class="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
              bind:value={editing.type}
              placeholder="Digite o tipo (ex: Nylon, PC)"
              maxlength="30"
            />
          {/if}
        </div>
        <div class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Cor</span>
          <div class="flex flex-wrap items-center gap-2">
            {#each PRESET_COLORS as c (c.hex)}
              <button
                type="button"
                title={c.label}
                aria-label={c.label}
                class="h-8 w-8 rounded-full ring-2 transition {!customCor && (editing.color ?? '').toLowerCase() === c.hex.toLowerCase() ? 'ring-sky-500' : 'ring-black/10 dark:ring-white/15'}"
                style="background:{c.hex}"
                onclick={() => pickPreset(c)}
              ></button>
            {/each}
            <button
              type="button"
              class="flex h-8 items-center rounded-full px-3 text-xs font-medium ring-2 transition {customCor ? 'bg-sky-500 text-white ring-sky-500' : 'text-slate-600 ring-black/10 dark:text-slate-300 dark:ring-white/15'}"
              onclick={() => (customCor = true)}
            >Personalizada</button>
          </div>
          <div class="mt-2 flex items-center gap-2">
            {#if customCor}
              <input type="color" class="h-10 w-12 shrink-0 rounded border border-slate-300 dark:border-slate-600" bind:value={editing.color} />
            {/if}
            <input class="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" bind:value={editing.colorLabel} placeholder="Nome da cor" maxlength="30" />
          </div>
        </div>
        <label class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Preço por kg *</span>
          <CurrencyInput bind:value={editing.pricePerKgCentavos} />
        </label>
      </div>
      <div class="mt-4 flex gap-2">
        <button class="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium dark:bg-slate-700" onclick={() => (editing = null)}>Cancelar</button>
        <button class="flex-1 rounded-lg bg-sky-500 py-2 text-sm font-semibold text-white hover:bg-sky-400" onclick={salvar}>Salvar</button>
      </div>
    </div>
  {/if}

  {#if $filaments && $filaments.length > 0}
    {#if marcas.length}
      <div class="flex flex-wrap gap-2">
        <button
          class="rounded-full px-3 py-1 text-xs font-medium transition-colors {marcaFiltro === null ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
          onclick={() => (marcaFiltro = null)}>Todas</button>
        {#each marcas as m (m)}
          <button
            class="rounded-full px-3 py-1 text-xs font-medium transition-colors {marcaFiltro === m ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
            onclick={() => (marcaFiltro = marcaFiltro === m ? null : m)}>{m}</button>
        {/each}
      </div>
    {/if}
    <div class="space-y-4">
      {#each gruposFiltrados as g (g.brand)}
        <div>
          <h3 class="mb-1.5 flex items-center gap-2 px-1">
            <span class="rounded-full bg-gradient-to-r from-violet-500 to-sky-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">{g.brand}</span>
            <span class="text-[10px] text-slate-400">{g.items.length} {g.items.length === 1 ? 'filamento' : 'filamentos'}</span>
            <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700"></span>
          </h3>
          <div class="space-y-2">
            {#each g.items as f (f.id)}
              <div class="flex items-center gap-3 glass p-3">
                <span class="h-8 w-8 shrink-0 rounded-full ring-1 ring-black/10" style="background:{f.color}"></span>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium">{f.name}</p>
                  <p class="text-xs text-slate-500">{f.type} · {formatBRL(f.pricePerKgCentavos)}/kg</p>
                </div>
                <button class="text-sm text-sky-600" onclick={() => editar(f)}>Editar</button>
                <button class="text-sm text-red-500" onclick={() => remover(f)}>Excluir</button>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {:else if !editing}
    <p class="glass p-6 text-center text-sm text-slate-500">
      Nenhum filamento salvo. Toque em <span class="font-semibold">+ Novo</span> para cadastrar os que você mais usa.
    </p>
  {/if}
</div>
