<script lang="ts">
  import { ui, type Tab } from '../lib/stores/ui.svelte';

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'calc', label: 'Calcular', icon: '🖨️' },
    { id: 'profiles', label: 'Filamentos', icon: '🧵' },
    { id: 'costs', label: 'Custos', icon: '🧾' },
    { id: 'sales', label: 'Receita × Despesa', icon: '💰' },
    { id: 'history', label: 'Peças cadastradas', icon: '🧩' },
    { id: 'settings', label: 'Configurações', icon: '⚙️' },
  ];
</script>

<nav
  class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
>
  {#each tabs as t (t.id)}
    <button
      class="flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors {ui.tab === t.id
        ? 'text-sky-500'
        : 'text-slate-500 dark:text-slate-400'}"
      onclick={() => (ui.tab = t.id)}
    >
      <span class="text-lg leading-none">{t.icon}</span>
      <span class="text-[10px] leading-tight">{t.label}</span>
    </button>
  {/each}
</nav>
