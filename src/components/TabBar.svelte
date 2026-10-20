<script lang="ts">
  export type Tab = 'calc' | 'profiles' | 'history' | 'settings';

  let { current = $bindable('calc' as Tab) }: { current?: Tab } = $props();

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'calc', label: 'Calcular', icon: '🧮' },
    { id: 'profiles', label: 'Filamentos', icon: '🧵' },
    { id: 'history', label: 'Histórico', icon: '🕑' },
    { id: 'settings', label: 'Config', icon: '⚙️' },
  ];
</script>

<nav
  class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
>
  {#each tabs as t (t.id)}
    <button
      class="flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors {current === t.id
        ? 'text-sky-500'
        : 'text-slate-500 dark:text-slate-400'}"
      onclick={() => (current = t.id)}
    >
      <span class="text-lg leading-none">{t.icon}</span>
      <span>{t.label}</span>
    </button>
  {/each}
</nav>
