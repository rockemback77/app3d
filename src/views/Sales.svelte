<script lang="ts">
  import { liveQuery } from 'dexie';
  import CurrencyInput from '../components/CurrencyInput.svelte';
  import NumberInput from '../components/NumberInput.svelte';
  import {
    listTransactions,
    listHistory,
    listCostItems,
    listFilaments,
    saveTransaction,
    deleteTransaction,
    type TxType,
    type Transaction,
  } from '../lib/db';
  import { formatBRL } from '../lib/money';

  const txs = liveQuery(() => listTransactions());
  const pecas = liveQuery(() => listHistory());
  const custos = liveQuery(() => listCostItems());
  const filamentos = liveQuery(() => listFilaments());

  function hoje(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // formulário
  let tipo = $state<TxType>('receita');
  let data = $state(hoje());
  let pick = $state(''); // valor do dropdown
  let label = $state('');
  let quantity = $state(1);
  let unitCentavos = $state(0);

  let total = $derived(Math.round((quantity || 0) * (unitCentavos || 0)));

  function resetForm() {
    pick = '';
    label = '';
    quantity = 1;
    unitCentavos = 0;
    data = hoje();
  }

  function trocarTipo(t: TxType) {
    tipo = t;
    pick = '';
    label = '';
    unitCentavos = 0;
  }

  function onPick(value: string) {
    pick = value;
    if (!value) {
      label = '';
      unitCentavos = 0;
      return;
    }
    if (tipo === 'receita') {
      const h = ($pecas ?? []).find((x) => x.id === value);
      if (h) {
        label = h.label;
        unitCentavos = h.breakdown.finalPriceCentavos;
      }
    } else {
      const [kind, id] = value.split(':');
      if (kind === 'cost') {
        const c = ($custos ?? []).find((x) => x.id === id);
        if (c) {
          label = c.name;
          unitCentavos = c.costCentavos;
        }
      } else if (kind === 'fil') {
        const f = ($filamentos ?? []).find((x) => x.id === id);
        if (f) {
          label = f.name + ' (kg)';
          unitCentavos = f.pricePerKgCentavos;
        }
      }
    }
  }

  async function adicionar() {
    if (!label.trim() || !(quantity > 0)) return;
    const tipoLabel = tipo === 'receita' ? 'receita' : 'despesa';
    if (!confirm(`Cadastrar ${tipoLabel} de "${label.trim()}" (${formatBRL(total)})?`)) return;
    await saveTransaction({
      type: tipo,
      date: data,
      label: label.trim(),
      refId: pick.includes(':') ? pick.split(':')[1] : pick || undefined,
      quantity,
      unitCentavos,
    });
    resetForm();
  }

  async function remover(t: Transaction) {
    if (confirm(`Excluir o lançamento "${t.label}"?`)) await deleteTransaction(t.id);
  }

  // ---- agrupamento por mês ----
  function monthKey(date: string): string {
    return date.slice(0, 7); // YYYY-MM
  }
  function monthLabel(key: string): string {
    const [y, m] = key.split('-').map(Number);
    const nome = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' });
    return `${nome.replace('.', '')}/${String(y).slice(2)}`;
  }

  type MonthAgg = { key: string; receita: number; despesa: number; saldo: number; items: Transaction[] };

  let grupos = $derived.by(() => {
    const list = $txs ?? [];
    const map = new Map<string, { receita: number; despesa: number; items: Transaction[] }>();
    for (const t of list) {
      const k = monthKey(t.date);
      if (!map.has(k)) map.set(k, { receita: 0, despesa: 0, items: [] });
      const g = map.get(k)!;
      const val = Math.round(t.quantity * t.unitCentavos);
      if (t.type === 'receita') g.receita += val;
      else g.despesa += val;
      g.items.push(t);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, g]) => ({
        key,
        receita: g.receita,
        despesa: g.despesa,
        saldo: g.receita - g.despesa,
        items: g.items.sort((a, b) => (a.date < b.date ? 1 : -1)),
      })) as MonthAgg[];
  });

  // ---- gráfico ----
  let mesesGrafico = $state(6);

  let chart = $derived.by(() => {
    const now = new Date();
    const keys: string[] = [];
    for (let i = mesesGrafico - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const byKey = new Map(grupos.map((g) => [g.key, g]));
    const bars = keys.map((k) => ({
      key: k,
      label: monthLabel(k),
      receita: byKey.get(k)?.receita ?? 0,
      despesa: byKey.get(k)?.despesa ?? 0,
    }));
    const max = Math.max(1, ...bars.map((b) => Math.max(b.receita, b.despesa)));
    return { bars, max };
  });
</script>

<div class="space-y-4 p-4 pb-24">
  <h1 class="text-xl font-bold">Receita × Despesas</h1>

  <!-- Formulário -->
  <section class="glass p-4">
    <div class="mb-3 flex gap-2">
      <button
        class="flex-1 rounded-lg py-1.5 text-sm font-medium {tipo === 'receita' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
        onclick={() => trocarTipo('receita')}>Receita</button>
      <button
        class="flex-1 rounded-lg py-1.5 text-sm font-medium {tipo === 'despesa' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
        onclick={() => trocarTipo('despesa')}>Despesa</button>
    </div>

    <label class="mb-3 block">
      <span class="mb-1 block text-xs text-slate-500">Data</span>
      <input
        type="date"
        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        bind:value={data}
      />
    </label>

    <label class="mb-3 block">
      <span class="mb-1 block text-xs text-slate-500">{tipo === 'receita' ? 'Peça vendida' : 'Custo / filamento'}</span>
      <select
        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
        value={pick}
        onchange={(e) => onPick((e.target as HTMLSelectElement).value)}
      >
        <option value="">— Selecione —</option>
        {#if tipo === 'receita'}
          {#each $pecas ?? [] as h (h.id)}
            <option value={h.id}>{h.label} — {formatBRL(h.breakdown.finalPriceCentavos)}</option>
          {/each}
        {:else}
          {#if ($custos ?? []).length}
            <optgroup label="Custos">
              {#each $custos ?? [] as c (c.id)}
                <option value={'cost:' + c.id}>{c.name}</option>
              {/each}
            </optgroup>
          {/if}
          {#if ($filamentos ?? []).length}
            <optgroup label="Filamentos">
              {#each $filamentos ?? [] as f (f.id)}
                <option value={'fil:' + f.id}>{f.name}</option>
              {/each}
            </optgroup>
          {/if}
        {/if}
      </select>
      {#if tipo === 'receita' && !($pecas ?? []).length}
        <span class="mt-1 block text-xs text-amber-600">Salve uma peça no histórico para vendê-la aqui.</span>
      {/if}
    </label>

    <div class="mb-3 grid grid-cols-2 gap-3">
      <label class="block">
        <span class="mb-1 block text-xs text-slate-500">Quantidade</span>
        <NumberInput bind:value={quantity} decimals={0} />
      </label>
      <label class="block">
        <span class="mb-1 block text-xs text-slate-500">Valor unitário</span>
        <CurrencyInput bind:value={unitCentavos} />
      </label>
    </div>

    <div class="mb-3 flex items-center justify-between text-sm">
      <span class="text-slate-500">Total</span>
      <span class="font-semibold {tipo === 'receita' ? 'text-emerald-600' : 'text-red-500'}">
        {tipo === 'receita' ? '+' : '−'} {formatBRL(total)}
      </span>
    </div>

    <button
      class="w-full rounded-lg bg-sky-500 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
      disabled={!label.trim() || !(quantity > 0)}
      onclick={adicionar}
    >
      Adicionar
    </button>
  </section>

  <!-- Lançamentos por mês + saldo -->
  {#if grupos.length}
    {#each grupos as g (g.key)}
      <section class="glass p-4">
        <h2 class="mb-2 font-semibold capitalize text-sky-600 dark:text-sky-400">{monthLabel(g.key)}</h2>
        <div class="space-y-1">
          {#each g.items as t (t.id)}
            <div class="flex items-center gap-2 text-sm">
              <span class="w-12 shrink-0 text-xs text-slate-400">{t.date.slice(8, 10)}/{t.date.slice(5, 7)}</span>
              <span class="min-w-0 flex-1 truncate">{t.label} <span class="text-xs text-slate-400">×{t.quantity}</span></span>
              <span class="shrink-0 font-medium {t.type === 'receita' ? 'text-emerald-600' : 'text-red-500'}">
                {t.type === 'receita' ? '+' : '−'} {formatBRL(Math.round(t.quantity * t.unitCentavos))}
              </span>
              <button class="shrink-0 text-xs text-slate-400 hover:text-red-500" onclick={() => remover(t)}>✕</button>
            </div>
          {/each}
        </div>
        <div class="mt-3 border-t border-slate-200 pt-2 text-sm dark:border-slate-700">
          <div class="flex justify-between text-emerald-600"><span>Receitas</span><span>{formatBRL(g.receita)}</span></div>
          <div class="flex justify-between text-red-500"><span>Despesas</span><span>{formatBRL(g.despesa)}</span></div>
          <div class="mt-1 flex justify-between font-bold">
            <span>Saldo do mês</span>
            <span class={g.saldo >= 0 ? 'text-emerald-600' : 'text-red-500'}>{formatBRL(g.saldo)}</span>
          </div>
        </div>
      </section>
    {/each}
  {:else}
    <p class="glass p-6 text-center text-sm text-slate-500">
      Nenhum lançamento ainda. Adicione uma receita ou despesa acima.
    </p>
  {/if}

  <!-- Gráfico -->
  <section class="glass p-4">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="font-semibold text-sky-600 dark:text-sky-400">Receita × Despesa</h2>
      <label class="flex items-center gap-1.5 text-xs text-slate-500">
        Mostrar últimos
        <select class="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-900" bind:value={mesesGrafico}>
          {#each Array.from({ length: 12 }, (_, i) => i + 1) as n (n)}
            <option value={n}>{n}</option>
          {/each}
        </select>
        meses
      </label>
    </div>

    <div class="flex items-end gap-2 overflow-x-auto" style="height: 170px">
      {#each chart.bars as b (b.key)}
        <div class="flex min-w-0 flex-1 flex-col items-center gap-1" style="min-width: 32px">
          <div class="flex h-[130px] w-full items-end justify-center gap-0.5">
            <div
              class="w-1/2 rounded-t bg-emerald-500"
              style="height: {Math.round((b.receita / chart.max) * 100)}%"
              title="Receita {formatBRL(b.receita)}"
            ></div>
            <div
              class="w-1/2 rounded-t bg-red-500"
              style="height: {Math.round((b.despesa / chart.max) * 100)}%"
              title="Despesa {formatBRL(b.despesa)}"
            ></div>
          </div>
          <span class="text-[10px] capitalize text-slate-500">{b.label}</span>
        </div>
      {/each}
    </div>

    <div class="mt-3 flex justify-center gap-4 text-xs text-slate-500">
      <span class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-emerald-500"></span> Receita</span>
      <span class="flex items-center gap-1"><span class="inline-block h-3 w-3 rounded bg-red-500"></span> Despesa</span>
    </div>
  </section>
</div>
