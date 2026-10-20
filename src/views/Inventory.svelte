<script lang="ts">
  import { liveQuery } from 'dexie';
  import {
    listInventory,
    saveInventory,
    setInventoryQty,
    deleteInventory,
    listCostItems,
    type InventoryItem,
  } from '../lib/db';

  const CATEGORIES = ['Filamento', 'Bico', 'Placa', 'Correia', 'Mesa/Base', 'Peça', 'Outro'];

  const itens = liveQuery(() => listInventory());
  const custos = liveQuery(() => listCostItems());

  let editing = $state<Partial<InventoryItem> | null>(null);

  function novo() {
    editing = { name: '', category: 'Filamento', quantity: 1 };
  }

  async function salvar() {
    if (!editing || !editing.name?.trim()) return;
    const acao = editing.id ? 'Atualizar' : 'Cadastrar';
    if (!confirm(`${acao} "${editing.name.trim()}" no inventário?`)) return;
    await saveInventory({
      id: editing.id,
      name: editing.name.trim(),
      category: editing.category || 'Outro',
      quantity: editing.quantity || 0,
    });
    editing = null;
  }

  async function remover(it: InventoryItem) {
    if (confirm(`Excluir "${it.name}" do inventário?`)) await deleteInventory(it.id);
  }

  function alterar(it: InventoryItem, delta: number) {
    setInventoryQty(it.id, Math.max(0, it.quantity + delta));
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
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-bold">Inventário</h1>
    <button class="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-400" onclick={novo}>
      + Novo
    </button>
  </div>
  <p class="text-sm text-slate-500">Controle o que você tem: filamentos, bicos, placas, correias e outras peças.</p>

  {#if editing}
    <div class="glass p-4 ring-1 ring-sky-300/60 dark:ring-sky-500/40">
      <h2 class="mb-3 font-semibold">{editing.id ? 'Editar' : 'Novo'} item</h2>
      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Nome *</span>
          <input class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" bind:value={editing.name} placeholder="Ex: Bico 0.4mm" maxlength="60" list="custos-cadastrados" />
          <datalist id="custos-cadastrados">
            {#each $custos ?? [] as c (c.id)}<option value={c.name}></option>{/each}
          </datalist>
          <span class="mt-1 block text-xs text-slate-400">Sugestões vêm dos custos cadastrados. Pode digitar livremente.</span>
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
              <div class="flex shrink-0 items-center gap-2">
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300"
                  disabled={it.quantity <= 0}
                  onclick={() => alterar(it, -1)}>−</button>
                <span class="w-8 text-center text-lg font-bold">{it.quantity}</span>
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-lg font-bold text-white"
                  onclick={() => alterar(it, 1)}>+</button>
              </div>
              <button class="shrink-0 text-sm text-red-500" onclick={() => remover(it)}>✕</button>
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
