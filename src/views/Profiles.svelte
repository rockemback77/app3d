<script lang="ts">
  import { liveQuery } from 'dexie';
  import CurrencyInput from '../components/CurrencyInput.svelte';
  import { listFilaments, saveFilament, deleteFilament, type FilamentProfile } from '../lib/db';
  import { formatBRL } from '../lib/money';

  const TYPES = ['PLA', 'PETG', 'ABS', 'TPU', 'Resina', 'Outro'];

  const filaments = liveQuery(() => listFilaments());

  let editing = $state<Partial<FilamentProfile> | null>(null);

  function novo() {
    editing = { name: '', type: 'PLA', color: '#38bdf8', colorLabel: '', brand: '', pricePerKgCentavos: 0 };
  }

  function editar(f: FilamentProfile) {
    editing = { ...f };
  }

  async function salvar() {
    if (!editing || !editing.name?.trim()) return;
    await saveFilament({
      id: editing.id,
      name: editing.name.trim(),
      type: editing.type || 'Outro',
      color: editing.color || '#38bdf8',
      colorLabel: editing.colorLabel,
      brand: editing.brand,
      pricePerKgCentavos: editing.pricePerKgCentavos || 0,
    });
    editing = null;
  }

  async function remover(id: string) {
    await deleteFilament(id);
  }
</script>

<div class="space-y-4 p-4 pb-8">
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-bold">Filamentos</h1>
    <button class="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-400" onclick={novo}>
      + Novo
    </button>
  </div>

  {#if editing}
    <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-sky-200 dark:bg-slate-800 dark:ring-sky-800">
      <h2 class="mb-3 font-semibold">{editing.id ? 'Editar' : 'Novo'} filamento</h2>
      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Nome *</span>
          <input class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" bind:value={editing.name} placeholder="Ex: PLA Azul Voolt" maxlength="60" />
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Tipo</span>
            <select class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" bind:value={editing.type}>
              {#each TYPES as t}<option value={t}>{t}</option>{/each}
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Cor</span>
            <div class="flex items-center gap-2">
              <input type="color" class="h-10 w-12 rounded border border-slate-300 dark:border-slate-600" bind:value={editing.color} />
              <input class="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" bind:value={editing.colorLabel} placeholder="rótulo" maxlength="30" />
            </div>
          </label>
        </div>
        <label class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Marca (opcional)</span>
          <input class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900" bind:value={editing.brand} placeholder="Ex: Voolt, 3D Lab" maxlength="40" />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Preço por kg *</span>
          <CurrencyInput bind:value={editing.pricePerKgCentavos} />
        </label>
      </div>
      <div class="mt-4 flex gap-2">
        <button class="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium dark:bg-slate-700" onclick={() => (editing = null)}>Cancelar</button>
        <button class="flex-1 rounded-lg bg-sky-500 py-2 text-sm font-semibold text-white hover:bg-sky-400" onclick={salvar}>Salvar</button>
      </div>
    </div>
  {/if}

  {#if $filaments && $filaments.length > 0}
    <div class="space-y-2">
      {#each $filaments as f (f.id)}
        <div class="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-slate-800">
          <span class="h-8 w-8 shrink-0 rounded-full ring-1 ring-black/10" style="background:{f.color}"></span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium">{f.name}</p>
            <p class="text-xs text-slate-500">{f.type}{f.brand ? ' · ' + f.brand : ''} · {formatBRL(f.pricePerKgCentavos)}/kg</p>
          </div>
          <button class="text-sm text-sky-600" onclick={() => editar(f)}>Editar</button>
          <button class="text-sm text-red-500" onclick={() => remover(f.id)}>Excluir</button>
        </div>
      {/each}
    </div>
  {:else if !editing}
    <p class="rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm dark:bg-slate-800">
      Nenhum filamento salvo. Toque em <span class="font-semibold">+ Novo</span> para cadastrar os que você mais usa.
    </p>
  {/if}
</div>
