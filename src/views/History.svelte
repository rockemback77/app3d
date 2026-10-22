<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Puzzle, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-svelte';
  import { listHistory, deleteHistory, type HistoryRecord } from '../lib/db';
  import { filamentCostCentavos } from '../lib/engine/costs';
  import { formatBRL } from '../lib/money';
  import { ui, editHistory } from '../lib/stores/ui.svelte';
  import { settings, tagColor } from '../lib/stores/settings.svelte';

  const history = liveQuery(() => listHistory());
  let open = $state<string | null>(null);
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
    if (confirm(`Excluir o projeto "${rec.label}"? Esta ação não pode ser desfeita.`)) {
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
        placeholder="Buscar projeto pelo nome"
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
        Nenhum projeto encontrado{query ? ` para "${query}"` : ''}{tagFiltro ? ` com a tag "${tagFiltro}"` : ''}.
      </p>
    {/if}

    {#each filtered as rec (rec.id)}
      {@const lucro = rec.breakdown.priceWithMarginCentavos - rec.breakdown.totalCostCentavos}
      <div class="glass p-3">
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

        <!-- Custo, venda e lucro sempre visíveis -->
        <div class="mt-3 grid grid-cols-3 gap-2 text-center">
          <div class="rounded-lg bg-slate-100 py-1.5 dark:bg-slate-700/50">
            <p class="text-[10px] uppercase tracking-wide text-slate-400">Custo</p>
            <p class="text-sm font-bold text-rose-600 dark:text-rose-400">{formatBRL(rec.breakdown.totalCostCentavos)}</p>
          </div>
          <div class="rounded-lg bg-slate-100 py-1.5 dark:bg-slate-700/50">
            <p class="text-[10px] uppercase tracking-wide text-slate-400">Venda</p>
            <p class="text-sm font-bold text-sky-600 dark:text-sky-400">{formatBRL(rec.breakdown.finalPriceCentavos)}</p>
          </div>
          <div class="rounded-lg bg-slate-100 py-1.5 dark:bg-slate-700/50">
            <p class="text-[10px] uppercase tracking-wide text-slate-400">Lucro</p>
            <p class="text-sm font-bold {lucro >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">{formatBRL(lucro)}</p>
          </div>
        </div>

        <!-- Ações sempre visíveis -->
        <div class="mt-3 flex items-center gap-2">
          <button
            class="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            onclick={() => toggle(rec.id)}
          >
            {#if open === rec.id}<ChevronUp size={16} />{:else}<ChevronDown size={16} />{/if}
            Detalhes
          </button>
          <button
            class="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-400"
            onclick={() => editHistory(rec)}
          >
            <Pencil size={15} /> Editar
          </button>
          <button
            class="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"
            aria-label="Excluir projeto"
            title="Excluir"
            onclick={() => remover(rec)}
          >
            <Trash2 size={16} />
          </button>
        </div>

        {#if open === rec.id}
          <div class="mt-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-700">
            <ul class="space-y-0.5 text-slate-600 dark:text-slate-300">
              <li class="flex justify-between"><span>Filamento</span><span>{formatBRL(rec.breakdown.filamentCentavos)}</span></li>
              {#if rec.job.plates && rec.job.plates.length > 1}
                {#each rec.job.plates as plate, pi (pi)}
                  <li class="flex justify-between pl-3 text-xs text-slate-400"><span>Placa {pi + 1}</span><span>{formatBRL(plate.filaments.reduce((s, f) => s + filamentCostCentavos(f.grams, f.pricePerKgCentavos), 0))}</span></li>
                {/each}
              {/if}
              <li class="flex justify-between"><span>Energia</span><span>{formatBRL(rec.breakdown.energyCentavos)}</span></li>
              <li class="flex justify-between"><span>Desgaste</span><span>{formatBRL(rec.breakdown.wearCentavos)}</span></li>
              <li class="flex justify-between"><span>Mão de obra</span><span>{formatBRL(rec.breakdown.laborCentavos)}</span></li>
              <li class="flex justify-between"><span>Avulsos</span><span>{formatBRL(rec.breakdown.miscCentavos)}</span></li>
              <li class="flex justify-between border-t border-slate-200 pt-0.5 font-medium dark:border-slate-700"><span>Custo total</span><span>{formatBRL(rec.breakdown.totalCostCentavos)}</span></li>
              {#if rec.breakdown.marketplaceName}
                <li class="flex justify-between text-xs"><span>{rec.breakdown.marketplaceName} ({rec.breakdown.marketplaceRatePercent}%)</span><span></span></li>
              {/if}
            </ul>
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
