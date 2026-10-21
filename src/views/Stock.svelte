<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Package } from 'lucide-svelte';
  import { listHistory, listStock, setStock } from '../lib/db';
  import { formatBRL } from '../lib/money';

  const pecas = liveQuery(() => listHistory());
  const stock = liveQuery(() => listStock());

  // lucro unitário de uma peça = preço com margem - custo total
  function lucroUnit(rec: { breakdown: { priceWithMarginCentavos: number; totalCostCentavos: number } }) {
    return rec.breakdown.priceWithMarginCentavos - rec.breakdown.totalCostCentavos;
  }

  let qtdDe = $derived.by(() => {
    const m = new Map<string, number>();
    for (const s of $stock ?? []) m.set(s.pieceId, s.quantity);
    return m;
  });

  function alterar(pieceId: string, delta: number) {
    const atual = qtdDe.get(pieceId) ?? 0;
    setStock(pieceId, Math.max(0, atual + delta));
  }

  let totais = $derived.by(() => {
    const pcs = $pecas ?? [];
    let itens = 0;
    let lucro = 0;
    let venda = 0;
    let custo = 0;
    for (const rec of pcs) {
      const q = qtdDe.get(rec.id) ?? 0;
      if (q <= 0) continue;
      itens += q;
      lucro += q * lucroUnit(rec);
      venda += q * rec.breakdown.finalPriceCentavos;
      custo += q * rec.breakdown.totalCostCentavos;
    }
    return { itens, lucro, venda, custo };
  });
</script>

<div class="space-y-4 p-4 pb-24">
  <h1 class="flex items-center gap-2.5 text-xl font-bold">
    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md"><Package size={18} /></span>
    Estoque
  </h1>
  <p class="text-sm text-slate-500">Informe quantas unidades de cada peça você tem em estoque.</p>

  <!-- Resumo do lucro possível -->
  <div class="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 text-white shadow-lg shadow-emerald-500/25">
    <p class="text-xs font-semibold uppercase tracking-wide text-white/80">Lucro possível com o estoque</p>
    <p class="mt-1 text-3xl font-extrabold">{formatBRL(totais.lucro)}</p>
    <div class="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
      <div>
        <p class="text-white/70">Itens</p>
        <p class="font-bold">{totais.itens}</p>
      </div>
      <div>
        <p class="text-white/70">Venda total</p>
        <p class="font-bold">{formatBRL(totais.venda)}</p>
      </div>
      <div>
        <p class="text-white/70">Custo total</p>
        <p class="font-bold">{formatBRL(totais.custo)}</p>
      </div>
    </div>
  </div>

  {#if $pecas && $pecas.length > 0}
    <div class="space-y-2">
      {#each $pecas as rec (rec.id)}
        {@const q = qtdDe.get(rec.id) ?? 0}
        <div class="glass p-3">
          <div class="flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{rec.label}</p>
              <p class="text-xs text-slate-500">
                Lucro unit.: <span class="font-medium text-emerald-600 dark:text-emerald-400">{formatBRL(lucroUnit(rec))}</span>
                · Venda {formatBRL(rec.breakdown.finalPriceCentavos)}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <button
                class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300"
                disabled={q <= 0}
                onclick={() => alterar(rec.id, -1)}>−</button>
              <span class="w-8 text-center text-lg font-bold">{q}</span>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-lg font-bold text-white"
                onclick={() => alterar(rec.id, 1)}>+</button>
            </div>
          </div>
          {#if q > 0}
            <p class="mt-2 text-right text-xs text-slate-500">
              {q} × {formatBRL(lucroUnit(rec))} = <span class="font-semibold text-emerald-600 dark:text-emerald-400">{formatBRL(q * lucroUnit(rec))}</span> de lucro
            </p>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <p class="glass p-6 text-center text-sm text-slate-500">
      Nenhuma peça cadastrada ainda. Salve peças na aba <span class="font-semibold">Calcular</span> para controlar o estoque.
    </p>
  {/if}
</div>
