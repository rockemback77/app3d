<script lang="ts">
  import { liveQuery } from 'dexie';
  import CurrencyInput from '../components/CurrencyInput.svelte';
  import { listCostItems, saveCostItem, deleteCostItem, type CostItem } from '../lib/db';
  import { formatBRL } from '../lib/money';

  const items = liveQuery(() => listCostItems());

  let editing = $state<Partial<CostItem> | null>(null);

  function novo() {
    editing = { name: '', costCentavos: 0 };
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
    });
    editing = null;
  }

  async function remover(c: CostItem) {
    if (confirm(`Excluir o custo "${c.name}"?`)) await deleteCostItem(c.id);
  }
</script>

<div class="space-y-4 p-4 pb-24">
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-bold">Outros custos</h1>
    <button class="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-400" onclick={novo}>
      + Novo
    </button>
  </div>
  <p class="text-sm text-slate-500">
    Cadastre custos que você usa com frequência (embalagem, frete, etiqueta…). Eles ficam disponíveis como opções em <span class="font-medium">Custos avulsos</span> no cálculo.
  </p>

  {#if editing}
    <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-sky-200 dark:bg-slate-800 dark:ring-sky-800">
      <h2 class="mb-3 font-semibold">{editing.id ? 'Editar' : 'Novo'} custo</h2>
      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Nome *</span>
          <input class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" bind:value={editing.name} placeholder="Ex: Embalagem" maxlength="60" />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Custo padrão (opcional)</span>
          <CurrencyInput bind:value={editing.costCentavos} />
          <span class="mt-1 block text-xs text-slate-400">Valor sugerido ao escolher no cálculo. Pode ajustar na hora.</span>
        </label>
      </div>
      <div class="mt-4 flex gap-2">
        <button class="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium dark:bg-slate-700" onclick={() => (editing = null)}>Cancelar</button>
        <button class="flex-1 rounded-lg bg-sky-500 py-2 text-sm font-semibold text-white hover:bg-sky-400" onclick={salvar}>Salvar</button>
      </div>
    </div>
  {/if}

  {#if $items && $items.length > 0}
    <div class="space-y-2">
      {#each $items as c (c.id)}
        <div class="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-slate-800">
          <span class="text-lg">📦</span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium">{c.name}</p>
            <p class="text-xs text-slate-500">{c.costCentavos ? formatBRL(c.costCentavos) : 'sem valor padrão'}</p>
          </div>
          <button class="text-sm text-sky-600" onclick={() => editar(c)}>Editar</button>
          <button class="text-sm text-red-500" onclick={() => remover(c)}>Excluir</button>
        </div>
      {/each}
    </div>
  {:else if !editing}
    <p class="rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm dark:bg-slate-800">
      Nenhum custo cadastrado. Toque em <span class="font-semibold">+ Novo</span> para adicionar.
    </p>
  {/if}
</div>
