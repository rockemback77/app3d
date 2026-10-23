<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Receipt, Trash2 } from 'lucide-svelte';
  import CurrencyInput from '../components/CurrencyInput.svelte';
  import { listCostItems, saveCostItem, deleteCostItem, type CostItem } from '../lib/db';
  import PageHeader from '../components/PageHeader.svelte';
  import { askConfirm } from '../lib/stores/confirm.svelte';
  import { settings } from '../lib/stores/settings.svelte';
  import { formatBRL } from '../lib/money';
  import { requirePro } from '../lib/stores/paywall.svelte';

  const items = liveQuery(() => listCostItems());

  let editing = $state<Partial<CostItem> | null>(null);

  function novo() {
    if (!requirePro('cadastrar custos')) return;
    editing = { name: '', costCentavos: 0, category: settings.costCategories?.[0] ?? '' };
  }

  function editar(c: CostItem) {
    if (!requirePro('editar custos')) return;
    editing = { ...c };
  }

  async function salvar() {
    if (!editing || !editing.name?.trim()) return;
    const acao = editing.id ? 'Atualizar' : 'Cadastrar';
    if (!(await askConfirm({ title: `${acao} custo`, message: `${acao} o custo "${editing.name.trim()}"?`, confirmLabel: acao }))) return;
    await saveCostItem({
      id: editing.id,
      name: editing.name.trim(),
      costCentavos: editing.costCentavos || 0,
      category: editing.category || undefined,
    });
    editing = null;
  }

  async function remover(c: CostItem) {
    if (!requirePro('excluir custos')) return;
    if (await askConfirm({ title: 'Excluir custo', message: `Excluir o custo "${c.name}"?`, confirmLabel: 'Excluir', danger: true }))
      await deleteCostItem(c.id);
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
  <PageHeader icon={Receipt} grad="from-indigo-500 to-violet-500" title="Outros custos" subtitle="Cadastre custos que você usa com frequência (embalagem, frete, etiqueta…). Eles ficam disponíveis como opções em Outros custos no cálculo.">
    {#snippet action()}
      <button class="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400" onclick={novo}>
        + Novo
      </button>
    {/snippet}
  </PageHeader>

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
                <button class="shrink-0 rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/30" onclick={() => editar(c)}>Editar</button>
                <button class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10" aria-label="Excluir custo" title="Excluir" onclick={() => remover(c)}><Trash2 size={16} /></button>
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
