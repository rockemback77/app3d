<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import {
    Spool,
    Receipt,
    ArrowLeftRight,
    Puzzle,
    Package,
    Warehouse,
    Settings,
    Printer,
    type Icon,
  } from 'lucide-svelte';
  import { ui, type Tab } from '../lib/stores/ui.svelte';

  const tabs: { id: Tab; label: string; icon: typeof Icon }[] = [
    { id: 'history', label: 'Projetos', icon: Puzzle },
    { id: 'profiles', label: 'Filamentos', icon: Spool },
    { id: 'costs', label: 'Custos', icon: Receipt },
    { id: 'stock', label: 'Estoque', icon: Package },
    { id: 'inventory', label: 'Inventário', icon: Warehouse },
    { id: 'sales', label: 'Receita × Despesa', icon: ArrowLeftRight },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  let titulo = $derived(
    tabs.find((t) => t.id === ui.tab)?.label ?? (ui.tab === 'calc' ? 'Calcular custo' : '')
  );

  function go(t: Tab) {
    ui.tab = t;
    ui.menuOpen = false;
  }
</script>

{#snippet brand()}
  <div class="mb-5 flex items-center gap-2 px-1">
    <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-sky-500 text-white shadow-md shadow-violet-500/30"><Printer size={20} /></span>
    <span class="bg-gradient-to-r from-violet-600 to-sky-500 bg-clip-text font-extrabold text-transparent">Custo 3D</span>
  </div>
{/snippet}

{#snippet navList()}
  <div class="space-y-1">
    {#each tabs as t (t.id)}
      {@const Icon = t.icon}
      <button
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors {ui.tab === t.id
          ? 'bg-gradient-to-r from-violet-100 to-sky-100 text-sky-700 dark:from-violet-500/20 dark:to-sky-500/20 dark:text-sky-300'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}"
        onclick={() => go(t.id)}
      >
        <Icon size={20} />
        <span>{t.label}</span>
      </button>
    {/each}
  </div>
{/snippet}

<!-- Sidebar fixa (desktop) -->
<aside class="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-white/40 md:bg-white/60 md:p-4 md:backdrop-blur-xl md:dark:border-white/10 md:dark:bg-slate-950/40">
  {@render brand()}
  {@render navList()}
</aside>

<!-- Cabeçalho com hambúrguer (mobile) -->
<header
  class="sticky top-0 z-20 flex items-center gap-3 border-b border-white/40 bg-white/70 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-slate-950/60"
>
  <button class="flex flex-col gap-[5px] p-1" aria-label="Abrir menu" onclick={() => (ui.menuOpen = true)}>
    <span class="h-0.5 w-6 rounded-full bg-slate-700 dark:bg-slate-200"></span>
    <span class="h-0.5 w-6 rounded-full bg-slate-700 dark:bg-slate-200"></span>
    <span class="h-0.5 w-6 rounded-full bg-slate-700 dark:bg-slate-200"></span>
  </button>
  <span class="truncate text-lg font-bold">{titulo}</span>
</header>

<!-- Drawer (mobile) -->
{#if ui.menuOpen}
  <button
    class="fixed inset-0 z-40 bg-black/40 md:hidden"
    aria-label="Fechar menu"
    transition:fade={{ duration: 150 }}
    onclick={() => (ui.menuOpen = false)}
  ></button>
  <nav
    class="fixed left-0 top-0 z-50 flex h-full w-72 max-w-[82%] flex-col bg-white p-4 pt-[max(1rem,env(safe-area-inset-top))] shadow-2xl md:hidden dark:bg-slate-900"
    transition:fly={{ x: -300, duration: 200 }}
  >
    {@render brand()}
    {@render navList()}
  </nav>
{/if}
