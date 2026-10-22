<script lang="ts">
  import { liveQuery } from 'dexie';
  import { ArrowLeftRight, Plus, CalendarDays, BarChart3, type Icon } from 'lucide-svelte';
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
  import { askConfirm } from '../lib/stores/confirm.svelte';

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
    if (!(await askConfirm({ title: 'Cadastrar lançamento', message: `Cadastrar ${tipoLabel} de "${label.trim()}" (${formatBRL(total)})?`, confirmLabel: 'Cadastrar' }))) return;
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
    if (await askConfirm({ title: 'Excluir lançamento', message: `Excluir o lançamento "${t.label}"?`, confirmLabel: 'Excluir', danger: true }))
      await deleteTransaction(t.id);
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
      .sort((a, b) => (a[0] < b[0] ? -1 : 1)) // mais antigo -> mais recente
      .map(([key, g]) => ({
        key,
        receita: g.receita,
        despesa: g.despesa,
        saldo: g.receita - g.despesa,
        items: g.items.sort((a, b) => (a.date < b.date ? -1 : 1)),
      })) as MonthAgg[];
  });

  // anos disponíveis (para o filtro do bloco de meses)
  let anos = $derived.by(() => {
    const set = new Set<string>();
    for (const g of grupos) set.add(g.key.slice(0, 4));
    return [...set].sort((a, b) => (a < b ? 1 : -1)); // mais recente primeiro no dropdown
  });
  let anoSel = $state<string>('todos');
  let gruposFiltrados = $derived(
    anoSel === 'todos' ? grupos : grupos.filter((g) => g.key.slice(0, 4) === anoSel)
  );

  // ---- gráfico (por ano) ----
  let anoGrafico = $state<string>(String(new Date().getFullYear()));
  // se o ano selecionado não tiver dados, cai para o ano mais recente com lançamentos
  $effect(() => {
    if (anos.length && !anos.includes(anoGrafico)) anoGrafico = anos[0];
  });

  let chart = $derived.by(() => {
    const y = Number(anoGrafico);
    const byKey = new Map(grupos.map((g) => [g.key, g]));
    const bars = [];
    for (let m = 1; m <= 12; m++) {
      const k = `${y}-${String(m).padStart(2, '0')}`;
      const g = byKey.get(k);
      bars.push({
        key: k,
        label: monthLabel(k),
        receita: g?.receita ?? 0,
        despesa: g?.despesa ?? 0,
      });
    }
    const max = Math.max(1, ...bars.map((b) => Math.max(b.receita, b.despesa)));
    return { bars, max };
  });
</script>

{#snippet head(IconC: typeof Icon, grad: string, title: string)}
  <div class="flex items-center gap-2.5">
    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br {grad} text-white shadow-md">
      <IconC size={18} />
    </span>
    <h2 class="font-semibold text-slate-100">{title}</h2>
  </div>
{/snippet}

<div class="space-y-4 p-4 pb-24">
  <h1 class="flex items-center gap-2.5 text-xl font-bold">
    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md"><ArrowLeftRight size={18} /></span>
    Receita × Despesas
  </h1>

  <!-- Bloco: Cadastro -->
  <section class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    <div class="mb-3">{@render head(Plus, 'from-sky-500 to-violet-500', 'Cadastro')}</div>
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
      <span class="mb-1 block text-xs text-slate-500">{tipo === 'receita' ? 'Projeto vendido' : 'Custo / filamento'}</span>
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
        <span class="mt-1 block text-xs text-amber-600">Salve um projeto no histórico para vendê-lo aqui.</span>
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

  <!-- Bloco: Detalhe dos meses -->
  <section class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      {@render head(CalendarDays, 'from-amber-500 to-orange-500', 'Detalhe dos meses')}
      <select class="shrink-0 rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm" bind:value={anoSel}>
        <option value="todos">Todos os anos</option>
        {#each anos as a (a)}<option value={a}>{a}</option>{/each}
      </select>
    </div>
    {#if gruposFiltrados.length}
      <div class="space-y-3">
        {#each gruposFiltrados as g (g.key)}
          <div class="rounded-xl border border-white/10 bg-slate-900/30 p-3">
            <h3 class="mb-2 font-semibold capitalize text-sky-400">{monthLabel(g.key)}</h3>
            <div class="space-y-1">
              {#each g.items as t (t.id)}
                <div class="flex items-center gap-2 text-sm">
                  <span class="w-12 shrink-0 text-xs text-slate-400">{t.date.slice(8, 10)}/{t.date.slice(5, 7)}</span>
                  <span class="min-w-0 flex-1 truncate">{t.label} <span class="text-xs text-slate-400">×{t.quantity}</span></span>
                  <span class="shrink-0 font-medium {t.type === 'receita' ? 'text-emerald-400' : 'text-red-400'}">
                    {t.type === 'receita' ? '+' : '−'} {formatBRL(Math.round(t.quantity * t.unitCentavos))}
                  </span>
                  <button class="shrink-0 text-xs text-slate-400 hover:text-red-400" onclick={() => remover(t)}>✕</button>
                </div>
              {/each}
            </div>
            <div class="mt-3 border-t border-slate-700 pt-2 text-sm">
              <div class="flex justify-between text-emerald-400"><span>Receitas</span><span>{formatBRL(g.receita)}</span></div>
              <div class="flex justify-between text-red-400"><span>Despesas</span><span>{formatBRL(g.despesa)}</span></div>
              <div class="mt-1 flex justify-between font-bold">
                <span>Saldo do mês</span>
                <span class={g.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatBRL(g.saldo)}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-center text-sm text-slate-500">
        Nenhum lançamento{anoSel !== 'todos' ? ` em ${anoSel}` : ''}. Adicione no bloco Cadastro.
      </p>
    {/if}
  </section>

  <!-- Bloco: Gráfico -->
  <section class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      {@render head(BarChart3, 'from-emerald-500 to-teal-500', 'Gráfico')}
      <select class="shrink-0 rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm" bind:value={anoGrafico}>
        {#if anos.length}
          {#each anos as a (a)}<option value={a}>{a}</option>{/each}
        {:else}
          <option value={anoGrafico}>{anoGrafico}</option>
        {/if}
      </select>
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
