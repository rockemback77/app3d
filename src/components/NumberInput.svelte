<script lang="ts">
  import { untrack } from 'svelte';
  import { formatNumberBR, parseNumberBR } from '../lib/money';

  let {
    value = $bindable(0),
    placeholder = '0',
    suffix = '',
    decimals = 2,
    id = undefined,
  }: {
    value?: number;
    placeholder?: string;
    suffix?: string;
    decimals?: number;
    id?: string;
  } = $props();

  let text = $state(untrack(() => (value ? formatNumberBR(value, decimals) : '')));
  let focused = $state(false);

  function onInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value;
    text = raw;
    value = parseNumberBR(raw);
  }

  function onBlur() {
    focused = false;
    text = value ? formatNumberBR(value, decimals) : '';
  }

  $effect(() => {
    if (!focused) text = value ? formatNumberBR(value, decimals) : '';
  });
</script>

<div class="relative">
  <input
    {id}
    type="text"
    inputmode="decimal"
    class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 text-right text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 {suffix ? 'pr-10' : 'pr-3'}"
    {placeholder}
    value={text}
    oninput={onInput}
    onfocus={() => (focused = true)}
    onblur={onBlur}
  />
  {#if suffix}
    <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{suffix}</span>
  {/if}
</div>
