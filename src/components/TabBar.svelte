<script lang="ts">
  import { ui, type Tab } from '../lib/stores/ui.svelte';

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'calc', label: 'Calcular', icon: '🖨️' },
    { id: 'profiles', label: 'Filamentos', icon: '🧵' },
    { id: 'costs', label: 'Custos', icon: '🧾' },
    { id: 'sales', label: 'Receita × Despesa', icon: '💰' },
    { id: 'history', label: 'Projetos', icon: '🧩' },
    { id: 'stock', label: 'Estoque de peças', icon: '📦' },
    { id: 'settings', label: 'Configurações', icon: '⚙️' },
  ];
</script>

<nav
  class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-white/40 bg-white/70 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60"
>
  {#each tabs as t (t.id)}
    <button
      class="flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-semibold transition-colors {ui.tab === t.id
        ? 'text-sky-600 dark:text-sky-300'
        : 'text-slate-400 dark:text-slate-500'}"
      onclick={() => (ui.tab = t.id)}
    >
      <span
        class="flex h-7 w-11 items-center justify-center rounded-full text-lg leading-none transition-colors {ui.tab === t.id
          ? 'bg-gradient-to-br from-sky-200 to-blue-300 dark:from-sky-500/30 dark:to-blue-500/30'
          : ''}"
      >{t.icon}</span>
      <span class="leading-tight">{t.label}</span>
    </button>
  {/each}
</nav>
