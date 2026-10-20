<script lang="ts">
  import { liveQuery } from 'dexie';
  import CurrencyInput from '../components/CurrencyInput.svelte';
  import { listFilaments, saveFilament, deleteFilament, type FilamentProfile } from '../lib/db';
  import { formatBRL } from '../lib/money';

  const TYPES = ['PLA', 'PETG', 'ABS', 'TPU', 'Resina', 'Outro'];

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
    editing = { name: '', type: 'PLA', color: '#38bdf8', colorLabel: '', brand: '', pricePerKgCentavos: 0 };
  }

  function editar(f: FilamentProfile) {
    editing = { ...f };
  }

  async function salvar() {
    if (!editing || !editing.name?.trim()) return;
    const acao = editing.id ? 'Atualizar' : 'Cadastrar';
    if (!confirm(`${acao} o filamento "${editing.name.trim()}"?`)) return;
    await saveFilament({
      id: editing.id,
      name: editing.name.trim(),
      type: editing.type || 'Outro',
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
    <h1 class="text-xl font-bold">Filamentos</h1>
    <button class="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-400" onclick={novo}>
      + Novo
    </button>
  </div>

  {#if editing}
    <div class="glass p-4 ring-1 ring-sky-300/60 dark:ring-sky-500/40">
      <h2 class="mb-3 font-semibold">{editing.id ? 'Editar' : 'Novo'} filamento</h2>
      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Nome *</span>
          <input class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" bind:value={editing.name} placeholder="Ex: PLA Azul Voolt" maxlength="60" />
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Tipo</span>
            <select class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" bind:value={editing.type}>
              {#each TYPES as t}<option value={t}>{t}</option>{/each}
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Cor</span>
            <div class="flex items-center gap-2">
              <input type="color" class="h-10 w-12 rounded border border-slate-300 dark:border-slate-600" bind:value={editing.color} />
              <input class="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" bind:value={editing.colorLabel} placeholder="rótulo" maxlength="30" />
            </div>
          </label>
        </div>
        <label class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Marca (opcional)</span>
          <input class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" bind:value={editing.brand} placeholder="Ex: Voolt, 3D Lab" maxlength="40" list="marcas-cadastradas" />
          <datalist id="marcas-cadastradas">
            {#each marcas as m (m)}<option value={m}></option>{/each}
          </datalist>
        </label>
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
