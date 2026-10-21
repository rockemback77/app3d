<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Puzzle, SquarePen, Pencil, Trash2 } from 'lucide-svelte';
  import { listHistory, deleteHistory, type HistoryRecord } from '../lib/db';
  import { formatBRL } from '../lib/money';
  import { ui, editHistory } from '../lib/stores/ui.svelte';
  import { settings, tagColor } from '../lib/stores/settings.svelte';

  const history = liveQuery(() => listHistory());
  let open = $state<string | null>(null);
  let acoesDe = $state<string | null>(null); // projeto com menu de ações aberto
  let query = $state('');
  let tagFiltro = $state<string | null>(null);

  let filtered = $derived.by(() => {
    const list = $history ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((r) => {
      const matchQ =
        !q ||
        r.label.toLowerCase().includes(q) ||
        (r.tags ?? []).some((t) => t.toLowerCase().includes(q));
      const matchTag =
        !tagFiltro || (r.tags ?? []).some((t) => t.toLowerCase() === tagFiltro!.toLowerCase());
      return matchQ && matchTag;
    });
  });

  function remover(rec: HistoryRecord) {
    if (confirm(`Excluir a peça "${rec.label}"? Esta ação não pode ser desfeita.`)) {
      deleteHistory(rec.id);
    }
  }

  function toggle(id: string) {
    open = open === id ? null : id;
  }
  function fmtDate(ts: number) {
    return new Date(ts).toLocaleString('pt-BR');
  }
</script>

<div class="space-y-3 p-4 pb-8">
  <div class="flex items-center justify-between gap-2">
    <h1 class="flex items-center gap-2.5 text-xl font-bold">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md"><Puzzle size={18} /></span>
      Projetos
    </h1>
    <button
      class="shrink-0 rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-400"
      onclick={() => (ui.tab = 'calc')}
    >
      + Adicionar projeto
    </button>
  </div>

  {#if $history && $history.length > 0}
    <div class="relative">
      <input
        class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        type="search"
        placeholder="Buscar peça pelo nome"
        maxlength="60"
        bind:value={query}
      />
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
      {#if query}
        <button class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onclick={() => (query = '')}>✕</button>
      {/if}
    </div>

    {#if settings.tags?.length}
      <div class="flex flex-wrap gap-2">
        <button
          class="rounded-full px-3 py-1 text-xs font-medium transition-colors {tagFiltro === null ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
          onclick={() => (tagFiltro = null)}>Todas</button>
        {#each settings.tags ?? [] as tag (tag)}
          <button
            class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={tagFiltro === tag ? `background:${tagColor(tag)};color:#fff` : `background:${tagColor(tag)}22;color:${tagColor(tag)}`}
            onclick={() => (tagFiltro = tagFiltro === tag ? null : tag)}>{tag}</button>
        {/each}
      </div>
    {/if}

    {#if filtered.length === 0}
      <p class="glass p-6 text-center text-sm text-slate-500">
        Nenhuma peça encontrada{query ? ` para "${query}"` : ''}{tagFiltro ? ` com a tag "${tagFiltro}"` : ''}.
      </p>
    {/if}

    {#each filtered as rec (rec.id)}
      <div class="glass p-3">
        <button class="flex w-full items-center justify-between gap-3 text-left" onclick={() => toggle(rec.id)}>
          <div class="min-w-0">
            <p class="truncate font-medium">{rec.label}</p>
            <p class="text-xs text-slate-500">{fmtDate(rec.createdAt)}</p>
            {#if rec.tags && rec.tags.length}
              <div class="mt-1 flex flex-wrap gap-1">
                {#each rec.tags as tag (tag)}
                  <span class="rounded-full px-2 py-0.5 text-[10px] font-medium" style="background:{tagColor(tag)}22;color:{tagColor(tag)}">{tag}</span>
                {/each}
              </div>
            {/if}
          </div>
          <div class="text-right">
            <p class="text-xs text-slate-500">Venda</p>
            <p class="font-bold text-sky-600 dark:text-sky-400">{formatBRL(rec.breakdown.finalPriceCentavos)}</p>
          </div>
        </button>
        {#if open === rec.id}
          <div class="mt-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-700">
            <ul class="space-y-0.5 text-slate-600 dark:text-slate-300">
              <li class="flex justify-between"><span>Filamento</span><span>{formatBRL(rec.breakdown.filamentCentavos)}</span></li>
              <li class="flex justify-between"><span>Energia</span><span>{formatBRL(rec.breakdown.energyCentavos)}</span></li>
              <li class="flex justify-between"><span>Desgaste</span><span>{formatBRL(rec.breakdown.wearCentavos)}</span></li>
              <li class="flex justify-between"><span>Mão de obra</span><span>{formatBRL(rec.breakdown.laborCentavos)}</span></li>
              <li class="flex justify-between"><span>Avulsos</span><span>{formatBRL(rec.breakdown.miscCentavos)}</span></li>
              <li class="flex justify-between border-t border-slate-200 pt-0.5 font-medium dark:border-slate-700"><span>Custo total</span><span>{formatBRL(rec.breakdown.totalCostCentavos)}</span></li>
              {#if rec.breakdown.marketplaceName}
                <li class="flex justify-between text-xs"><span>{rec.breakdown.marketplaceName} ({rec.breakdown.marketplaceRatePercent}%)</span><span></span></li>
              {/if}
            </ul>
            <div class="mt-3 flex justify-end">
              <div class="relative">
                <button
                  class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600"
                  aria-label="Editar projeto"
                  title="Editar"
                  onclick={() => (acoesDe = acoesDe === rec.id ? null : rec.id)}
                >
                  <SquarePen size={18} />
                </button>
                {#if acoesDe === rec.id}
                  <div class="absolute bottom-full right-0 z-10 mb-1 w-40 overflow-hidden rounded-lg border border-white/10 bg-slate-800 shadow-xl">
                    <button
                      class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
                      onclick={() => { acoesDe = null; editHistory(rec); }}
                    >
                      <Pencil size={15} /> Editar
                    </button>
                    <button
                      class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700"
                      onclick={() => { acoesDe = null; remover(rec); }}
                    >
                      <Trash2 size={15} /> Excluir
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  {:else}
    <p class="glass p-6 text-center text-sm text-slate-500">
      Nenhum cálculo salvo ainda. Faça um cálculo na aba <span class="font-semibold">Calcular</span> e toque em Salvar.
    </p>
  {/if}
</div>
