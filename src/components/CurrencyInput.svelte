<script lang="ts">
  import { formatCentavos, parseBRLToCentavos } from '../lib/money';

  let {
    value = $bindable(0),
    placeholder = '0,00',
    id = undefined,
  }: { value?: number; placeholder?: string; id?: string } = $props();

  let text = $state(value ? formatCentavos(value) : '');
  let focused = $state(false);

  function onInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value;
    text = raw;
    value = parseBRLToCentavos(raw);
  }

  function onFocus() {
    focused = true;
  }

  function onBlur() {
    focused = false;
    text = value ? formatCentavos(value) : '';
  }

  // reflete mudanças externas de value quando não está editando
  $effect(() => {
    if (!focused) text = value ? formatCentavos(value) : '';
  });
</script>

<div class="relative">
  <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
  <input
    {id}
    type="text"
    inputmode="decimal"
    class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-right text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    {placeholder}
    value={text}
    oninput={onInput}
    onfocus={onFocus}
    onblur={onBlur}
  />
</div>
