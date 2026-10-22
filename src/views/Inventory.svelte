<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Warehouse, Trash2 } from 'lucide-svelte';
  import PageHeader from '../components/PageHeader.svelte';
  import { askConfirm } from '../lib/stores/confirm.svelte';
  import {
    listInventory,
    saveInventory,
    setInventoryQty,
    deleteInventory,
    listCostItems,
    listFilaments,
    type InventoryItem,
  } from '../lib/db';

  const CATEGORIES = ['Filamento', 'Bico', 'Placa', 'Correia', 'Mesa/Base', 'Peça', 'Outro'];

  const itens = liveQuery(() => listInventory());
  const custos = liveQuery(() => listCostItems());
  const filamentos = liveQuery(() => listFilaments());

  // sugestões = filamentos + custos cadastrados (sem repetir nome)
  let sugestoes = $derived.by(() => {
    const nomes = new Set<string>();
    for (const f of $filamentos ?? []) nomes.add(f.name);
    for (const c of $custos ?? []) nomes.add(c.name);
    return [...nomes];
  });

  let editing = $state<Partial<InventoryItem> | null>(null);

  function novo() {
    editing = { name: '', category: 'Filamento', quantity: 1 };
  }

  async function salvar() {
    if (!editing || !editing.name?.trim()) return;
    const acao = editing.id ? 'Atualizar' : 'Cadastrar';
    if (!(await askConfirm({ title: `${acao} item`, message: `${acao} "${editing.name.trim()}" no inventário?`, confirmLabel: acao }))) return;
    await saveInventory({
      id: editing.id,
      name: editing.name.trim(),
      category: editing.category || 'Outro',
      quantity: editing.quantity || 0,
    });
    editing = null;
  }

  async function remover(it: InventoryItem) {
    if (await askConfirm({ title: 'Excluir item', message: `Excluir "${it.name}" do inventário?`, confirmLabel: 'Excluir', danger: true }))
      await deleteInventory(it.id);
  }

  // rascunho por item: o que está digitado antes de salvar
  let draft = $state<Record<string, number>>({});
  function valorAtual(id: string, salvo: number): number {
    return draft[id] ?? salvo;
  }
  function editarQtd(id: string, valor: string) {
    draft[id] = Math.max(0, Math.floor(Number(valor) || 0));
  }
  function salvarQtd(id: string, salvo: number) {
    setInventoryQty(id, valorAtual(id, salvo));
  }

  // agrupa por categoria, na ordem de CATEGORIES
  let grupos = $derived.by(() => {
    const list = $itens ?? [];
    return CATEGORIES.map((cat) => ({
      cat,
      items: list.filter((i) => i.category === cat),
    })).filter((g) => g.items.length > 0);
  });
</script>

<div class="space-y-4 p-4 pb-24">
  <PageHeader icon={Warehouse} grad="from-rose-500 to-pink-500" title="Inventário" subtitle="Controle o que você tem: filamentos, bicos, placas, correias e outras peças.">
    {#snippet action()}
      <button class="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400" onclick={novo}>
        + Novo
      </button>
    {/snippet}
  </PageHeader>

  {#if editing}
    <div class="glass p-4 ring-1 ring-sky-300/60 dark:ring-sky-500/40">
      <h2 class="mb-3 font-semibold">{editing.id ? 'Editar' : 'Novo'} item</h2>
      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Nome *</span>
          <input class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" bind:value={editing.name} placeholder="Ex: Bico 0.4mm" maxlength="60" list="custos-cadastrados" />
          <datalist id="custos-cadastrados">
            {#each sugestoes as nome (nome)}<option value={nome}></option>{/each}
          </datalist>
          <span class="mt-1 block text-xs text-slate-400">Sugestões vêm dos filamentos e custos cadastrados. Você também pode digitar livremente um novo item.</span>
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Categoria</span>
            <select class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" bind:value={editing.category}>
              {#each CATEGORIES as c (c)}<option value={c}>{c}</option>{/each}
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Quantidade</span>
            <input type="number" min="0" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" bind:value={editing.quantity} />
          </label>
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <button class="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium dark:bg-slate-700" onclick={() => (editing = null)}>Cancelar</button>
        <button class="flex-1 rounded-lg bg-sky-500 py-2 text-sm font-semibold text-white hover:bg-sky-400" onclick={salvar}>Salvar</button>
      </div>
    </div>
  {/if}

  {#if grupos.length}
    {#each grupos as g (g.cat)}
      <div>
        <h3 class="mb-1.5 flex items-center gap-2 px-1">
          <span class="rounded-full bg-gradient-to-r from-violet-500 to-sky-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">{g.cat}</span>
          <span class="text-[10px] text-slate-400">{g.items.length} {g.items.length === 1 ? 'item' : 'itens'}</span>
          <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700"></span>
        </h3>
        <div class="space-y-2">
          {#each g.items as it (it.id)}
            <div class="flex items-center gap-3 glass p-3">
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium">{it.name}</p>
              </div>
              <div class="flex shrink-0 items-center gap-1.5">
                <input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  class="w-16 rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-center text-base font-bold text-slate-100 outline-none focus:border-sky-500"
                  value={valorAtual(it.id, it.quantity)}
                  oninput={(e) => editarQtd(it.id, (e.target as HTMLInputElement).value)}
                />
                <button
                  class="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
                  disabled={valorAtual(it.id, it.quantity) === it.quantity}
                  onclick={() => salvarQtd(it.id, it.quantity)}
                >
                  {valorAtual(it.id, it.quantity) === it.quantity ? 'Salvo' : 'Salvar'}
                </button>
              </div>
              <button class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10" aria-label="Excluir item" title="Excluir" onclick={() => remover(it)}><Trash2 size={16} /></button>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {:else if !editing}
    <p class="glass p-6 text-center text-sm text-slate-500">
      Inventário vazio. Toque em <span class="font-semibold">+ Novo</span> para cadastrar filamentos, bicos, placas, etc.
    </p>
  {/if}
</div>
