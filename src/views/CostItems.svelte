<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Receipt } from 'lucide-svelte';
  import CurrencyInput from '../components/CurrencyInput.svelte';
  import { listCostItems, saveCostItem, deleteCostItem, type CostItem } from '../lib/db';
  import { settings } from '../lib/stores/settings.svelte';
  import { formatBRL } from '../lib/money';

  const items = liveQuery(() => listCostItems());

  let editing = $state<Partial<CostItem> | null>(null);

  function novo() {
    editing = { name: '', costCentavos: 0, category: settings.costCategories?.[0] ?? '' };
  }

  function editar(c: CostItem) {
    editing = { ...c };
  }

  async function salvar() {
    if (!editing || !editing.name?.trim()) return;
    const acao = editing.id ? 'Atualizar' : 'Cadastrar';
    if (!confirm(`${acao} o custo "${editing.name.trim()}"?`)) return;
    await saveCostItem({
      id: editing.id,
      name: editing.name.trim(),
      costCentavos: editing.costCentavos || 0,
      category: editing.category || undefined,
    });
    editing = null;
  }

  async function remover(c: CostItem) {
    if (confirm(`Excluir o custo "${c.name}"?`)) await deleteCostItem(c.id);
  }

  // agrupa por categoria, na ordem cadastrada em Configurações (demais no fim)
  let grupos = $derived.by(() => {
    const list = $items ?? [];
    const map = new Map<string, CostItem[]>();
    for (const c of list) {
      const k = c.category?.trim() || 'Sem categoria';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    const ordem = settings.costCategories ?? [];
    const rank = (cat: string) => {
      const i = ordem.indexOf(cat);
      return i >= 0 ? i : cat === 'Sem categoria' ? 9999 : 9000;
    };
    return [...map.entries()]
      .map(([cat, its]) => ({ cat, items: its }))
      .sort((a, b) => rank(a.cat) - rank(b.cat));
  });
</script>

<div class="space-y-4 p-4 pb-24">
  <div class="flex items-center justify-between">
    <h1 class="flex items-center gap-2.5 text-xl font-bold">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md"><Receipt size={18} /></span>
      Outros custos
    </h1>
    <button class="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-400" onclick={novo}>
      + Novo
    </button>
  </div>
  <p class="text-sm text-slate-500">
    Cadastre custos que você usa com frequência (embalagem, frete, etiqueta…). Eles ficam disponíveis como opções em <span class="font-medium">Outros custos</span> no cálculo.
  </p>

  {#if editing}
    <div class="rounded-2xl border border-sky-500/40 bg-slate-800/40 p-4">
      <h2 class="mb-3 font-semibold">{editing.id ? 'Editar' : 'Novo'} custo</h2>
      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-sm text-slate-300">Nome *</span>
          <input class="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2" bind:value={editing.name} placeholder="Ex: Embalagem" maxlength="60" />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm text-slate-300">Categoria</span>
          <select class="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm" bind:value={editing.category}>
            <option value="">— Sem categoria —</option>
            {#each settings.costCategories ?? [] as cat (cat)}
              <option value={cat}>{cat}</option>
            {/each}
          </select>
          {#if !(settings.costCategories ?? []).length}
            <span class="mt-1 block text-xs text-slate-400">Cadastre categorias em Configurações → Categorias de custo.</span>
          {/if}
        </label>
        <label class="block">
          <span class="mb-1 block text-sm text-slate-300">Custo padrão (opcional)</span>
          <CurrencyInput bind:value={editing.costCentavos} />
          <span class="mt-1 block text-xs text-slate-400">Valor sugerido ao escolher no cálculo. Pode ajustar na hora.</span>
        </label>
      </div>
      <div class="mt-4 flex gap-2">
        <button class="flex-1 rounded-lg bg-slate-700 py-2 text-sm font-medium" onclick={() => (editing = null)}>Cancelar</button>
        <button class="flex-1 rounded-lg bg-sky-500 py-2 text-sm font-semibold text-white hover:bg-sky-400" onclick={salvar}>Salvar</button>
      </div>
    </div>
  {/if}

  {#if $items && $items.length > 0}
    <div class="space-y-4">
      {#each grupos as g (g.cat)}
        <div>
          <h3 class="mb-1.5 flex items-center gap-2 px-1">
            <span class="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">{g.cat}</span>
            <span class="text-[10px] text-slate-400">{g.items.length} {g.items.length === 1 ? 'item' : 'itens'}</span>
            <span class="h-px flex-1 bg-slate-700"></span>
          </h3>
          <div class="space-y-2">
            {#each g.items as c (c.id)}
              <div class="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-800/40 p-3">
                <span class="text-lg">📦</span>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium">{c.name}</p>
                  <p class="text-xs text-slate-500">{c.costCentavos ? formatBRL(c.costCentavos) : 'sem valor padrão'}</p>
                </div>
                <button class="text-sm text-sky-400" onclick={() => editar(c)}>Editar</button>
                <button class="text-sm text-red-400" onclick={() => remover(c)}>Excluir</button>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {:else if !editing}
    <p class="rounded-2xl border border-white/10 bg-slate-800/40 p-6 text-center text-sm text-slate-500">
      Nenhum custo cadastrado. Toque em <span class="font-semibold">+ Novo</span> para adicionar.
    </p>
  {/if}
</div>
