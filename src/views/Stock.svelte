<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Package, Search } from 'lucide-svelte';
  import { listHistory, listStock, setStock } from '../lib/db';
  import { settings, tagColor } from '../lib/stores/settings.svelte';
  import { formatBRL } from '../lib/money';

  const pecas = liveQuery(() => listHistory());
  const stock = liveQuery(() => listStock());

  let query = $state('');
  let tagFiltro = $state<string | null>(null);
  let filtered = $derived(
    ($pecas ?? []).filter((r) => {
      const q = query.trim().toLowerCase();
      const okText = !q || r.label.toLowerCase().includes(q);
      const okTag = !tagFiltro || (r.tags ?? []).some((t) => t.toLowerCase() === tagFiltro!.toLowerCase());
      return okText && okTag;
    })
  );

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
  <p class="text-sm text-slate-500">Informe quantas unidades de cada projeto você tem em estoque.</p>

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
    <!-- Busca + filtro por tag -->
    <div class="relative">
      <Search size={16} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        class="w-full rounded-lg border border-slate-600 bg-slate-800/60 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-sky-500"
        type="search"
        placeholder="Buscar projeto…"
        bind:value={query}
      />
    </div>
    {#if settings.tags?.length}
      <div class="flex flex-wrap gap-2">
        <button
          class="rounded-full px-3 py-1 text-xs font-medium {tagFiltro === null ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300'}"
          onclick={() => (tagFiltro = null)}>Todas</button>
        {#each settings.tags ?? [] as tag (tag)}
          <button
            class="rounded-full px-3 py-1 text-xs font-medium"
            style={tagFiltro === tag ? `background:${tagColor(tag)};color:#fff` : `background:${tagColor(tag)}22;color:${tagColor(tag)}`}
            onclick={() => (tagFiltro = tagFiltro === tag ? null : tag)}>{tag}</button>
        {/each}
      </div>
    {/if}

    {#if filtered.length === 0}
      <p class="rounded-2xl border border-white/10 bg-slate-800/40 p-6 text-center text-sm text-slate-500">
        Nenhum projeto encontrado{query ? ` para "${query}"` : ''}{tagFiltro ? ` com a tag "${tagFiltro}"` : ''}.
      </p>
    {/if}

    <div class="space-y-2">
      {#each filtered as rec (rec.id)}
        {@const q = qtdDe.get(rec.id) ?? 0}
        <div class="rounded-2xl border border-white/10 bg-slate-800/40 p-3">
          <div class="flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{rec.label}</p>
              {#if rec.tags && rec.tags.length}
                <div class="mt-1 flex flex-wrap gap-1">
                  {#each rec.tags as tag (tag)}
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-medium" style="background:{tagColor(tag)}22;color:{tagColor(tag)}">{tag}</span>
                  {/each}
                </div>
              {/if}
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <button
                class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-lg font-bold text-slate-200 disabled:opacity-40"
                disabled={q <= 0}
                onclick={() => alterar(rec.id, -1)}>−</button>
              <span class="w-8 text-center text-lg font-bold">{q}</span>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-lg font-bold text-white"
                onclick={() => alterar(rec.id, 1)}>+</button>
            </div>
          </div>

          <div class="mt-2 grid grid-cols-3 gap-2 border-t border-slate-700 pt-2 text-center text-xs">
            <div>
              <p class="text-slate-500">Custo un.</p>
              <p class="font-semibold text-red-400">{formatBRL(rec.breakdown.totalCostCentavos)}</p>
            </div>
            <div>
              <p class="text-slate-500">Venda un.</p>
              <p class="font-semibold text-slate-200">{formatBRL(rec.breakdown.finalPriceCentavos)}</p>
            </div>
            <div>
              <p class="text-slate-500">Lucro un.</p>
              <p class="font-semibold text-emerald-400">{formatBRL(lucroUnit(rec))}</p>
            </div>
          </div>

          {#if q > 0}
            <p class="mt-2 text-right text-xs text-slate-500">
              {q} × {formatBRL(lucroUnit(rec))} = <span class="font-semibold text-emerald-400">{formatBRL(q * lucroUnit(rec))}</span> de lucro
            </p>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <p class="rounded-2xl border border-white/10 bg-slate-800/40 p-6 text-center text-sm text-slate-500">
      Nenhum projeto cadastrado ainda. Cadastre um projeto para controlar o estoque.
    </p>
  {/if}
</div>
