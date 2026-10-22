<script lang="ts">
  import type { Icon } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  let {
    icon: IconC,
    grad,
    title,
    subtitle,
    action,
  }: {
    icon: typeof Icon;
    grad: string;
    title: string;
    subtitle?: string;
    action?: Snippet;
  } = $props();
</script>

<div class="flex items-center justify-between gap-2">
  <h1 class="flex items-center gap-2.5 text-xl font-bold">
    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br {grad} text-white shadow-md">
      <IconC size={18} />
    </span>
    {title}
  </h1>
  {#if action}{@render action()}{/if}
</div>
{#if subtitle}
  <p class="mt-1 text-sm text-slate-500">{subtitle}</p>
{/if}
