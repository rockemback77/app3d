<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Package, Search, TrendingUp } from 'lucide-svelte';
  import PageHeader from '../components/PageHeader.svelte';
  import { listHistory, listStock, setStock } from '../lib/db';
  import { settings, tagColor } from '../lib/stores/settings.svelte';
  import { formatBRL } from '../lib/money';
  import { requirePro } from '../lib/stores/paywall.svelte';

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

  // rascunho por item: o que está digitado, antes de salvar
  let draft = $state<Record<string, number>>({});

  function valorAtual(id: string, salvo: number): number {
    return draft[id] ?? salvo;
  }
  function editar(id: string, valor: string) {
    draft[id] = Math.max(0, Math.floor(Number(valor) || 0));
  }
  function salvar(id: string, salvo: number) {
    if (!requirePro('controlar o estoque')) return;
    setStock(id, valorAtual(id, salvo));
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
  <PageHeader icon={Package} grad="from-amber-500 to-orange-500" title="Estoque" subtitle="Informe quantas unidades de cada projeto você tem em estoque." />

  <!-- Resumo do lucro possível -->
  <div class="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-lg shadow-emerald-600/25">
    <div class="flex items-center gap-3 p-4">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
        <TrendingUp size={22} />
      </span>
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-white/80">Lucro possível com o estoque</p>
        <p class="text-3xl font-extrabold leading-tight">{formatBRL(totais.lucro)}</p>
      </div>
    </div>
    {#if totais.itens > 0}
      <div class="grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 bg-black/10 text-center">
        <div class="px-2 py-2.5">
          <p class="text-[10px] uppercase tracking-wide text-white/70">Itens</p>
          <p class="mt-0.5 font-bold">{totais.itens}</p>
        </div>
        <div class="px-2 py-2.5">
          <p class="text-[10px] uppercase tracking-wide text-white/70">Venda total</p>
          <p class="mt-0.5 font-bold">{formatBRL(totais.venda)}</p>
        </div>
        <div class="px-2 py-2.5">
          <p class="text-[10px] uppercase tracking-wide text-white/70">Custo total</p>
          <p class="mt-0.5 font-bold">{formatBRL(totais.custo)}</p>
        </div>
      </div>
    {:else}
      <p class="border-t border-white/15 bg-black/10 px-4 py-2.5 text-center text-xs text-white/80">
        Adicione unidades abaixo para ver o lucro possível.
      </p>
    {/if}
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
            <div class="flex shrink-0 items-center gap-1.5">
              <input
                type="number"
                inputmode="numeric"
                min="0"
                class="w-16 rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-center text-base font-bold text-slate-100 outline-none focus:border-sky-500"
                value={valorAtual(rec.id, q)}
                oninput={(e) => editar(rec.id, (e.target as HTMLInputElement).value)}
              />
              <button
                class="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
                disabled={valorAtual(rec.id, q) === q}
                onclick={() => salvar(rec.id, q)}
              >
                {valorAtual(rec.id, q) === q ? 'Salvo' : 'Salvar'}
              </button>
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
