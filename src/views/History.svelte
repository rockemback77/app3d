<script lang="ts">
  import { liveQuery } from 'dexie';
  import { listHistory, deleteHistory, type HistoryRecord } from '../lib/db';
  import { formatBRL } from '../lib/money';
  import { editHistory } from '../lib/stores/ui.svelte';

  const history = liveQuery(() => listHistory());
  let open = $state<string | null>(null);

  function toggle(id: string) {
    open = open === id ? null : id;
  }
  function fmtDate(ts: number) {
    return new Date(ts).toLocaleString('pt-BR');
  }
</script>

<div class="space-y-3 p-4 pb-8">
  <h1 class="text-xl font-bold">Histórico</h1>

  {#if $history && $history.length > 0}
    {#each $history as rec (rec.id)}
      <div class="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-800">
        <button class="flex w-full items-center justify-between gap-3 text-left" onclick={() => toggle(rec.id)}>
          <div class="min-w-0">
            <p class="truncate font-medium">{rec.label}</p>
            <p class="text-xs text-slate-500">{fmtDate(rec.createdAt)}</p>
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
            <div class="mt-3 flex gap-4">
              <button class="text-sm font-medium text-sky-600" onclick={() => editHistory(rec)}>Editar</button>
              <button class="text-sm text-red-500" onclick={() => deleteHistory(rec.id)}>Excluir</button>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  {:else}
    <p class="rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm dark:bg-slate-800">
      Nenhum cálculo salvo ainda. Faça um cálculo na aba <span class="font-semibold">Calcular</span> e toque em Salvar.
    </p>
  {/if}
</div>
