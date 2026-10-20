<script lang="ts">
  import CurrencyInput from '../components/CurrencyInput.svelte';
  import NumberInput from '../components/NumberInput.svelte';
  import {
    settings,
    persistSettings,
    addWearPart,
    removeWearPart,
    addMarketplace,
    removeMarketplace,
  } from '../lib/stores/settings.svelte';
  import { wearPerHourCentavos, monthlyWearCentavos } from '../lib/engine/costs';
  import { formatBRL } from '../lib/money';
  import { exportBackup, importBackup } from '../lib/backup';
  import { liveQuery } from 'dexie';
  import { listTransactions, listHistory } from '../lib/db';
  import { auth, signIn, signUp, signOut } from '../lib/stores/auth.svelte';
  import { syncState, push, pull } from '../lib/sync.svelte';
  import { theme, setTheme, type Theme } from '../lib/stores/theme.svelte';

  const temas: { id: Theme; label: string; icon: string }[] = [
    { id: 'light', label: 'Claro', icon: '☀️' },
    { id: 'dark', label: 'Escuro', icon: '🌙' },
    { id: 'system', label: 'Sistema', icon: '🖥️' },
  ];

  let importMsg = $state('');
  let fileInput: HTMLInputElement;

  // ---- conta / nuvem ----
  let email = $state('');
  let senha = $state('');
  let modo = $state<'login' | 'cadastro'>('login');
  let authMsg = $state('');
  let busy = $state(false);

  async function entrar() {
    authMsg = '';
    busy = true;
    const err = modo === 'login' ? await signIn(email, senha) : await signUp(email, senha);
    busy = false;
    if (err) {
      authMsg = traduzErro(err);
    } else {
      senha = '';
      if (modo === 'cadastro') authMsg = 'Conta criada. Se pedir confirmação por email, verifique sua caixa.';
    }
  }

  async function sair() {
    await signOut();
  }

  function traduzErro(msg: string): string {
    if (/invalid login credentials/i.test(msg)) return 'Email ou senha incorretos.';
    if (/already registered/i.test(msg)) return 'Email já cadastrado. Faça login.';
    if (/password should be at least/i.test(msg)) return 'Senha muito curta (mín. 6 caracteres).';
    return msg;
  }

  function removerPeca(part: { id: string; name: string }) {
    if (confirm(`Excluir a peça de desgaste "${part.name || 'sem nome'}"?`)) removeWearPart(part.id);
  }
  function removerMarket(mp: { id: string; name: string }) {
    if (confirm(`Excluir o marketplace "${mp.name || 'sem nome'}"?`)) removeMarketplace(mp.id);
  }

  let wearHour = $derived(wearPerHourCentavos(settings));
  let monthlyWear = $derived(monthlyWearCentavos(settings));

  // sugestão de horas/mês a partir das vendas (receitas) cadastradas
  const txs = liveQuery(() => listTransactions());
  const pecasHist = liveQuery(() => listHistory());
  let sugestaoHoras = $derived.by(() => {
    const t = $txs ?? [];
    const h = $pecasHist ?? [];
    const horasPorPeca = new Map(h.map((r) => [r.id, r.job.printHours || 0]));
    const meses = new Map<string, number>(); // 'YYYY-MM' -> horas no mês
    for (const x of t) {
      if (x.type !== 'receita' || !x.refId) continue;
      const ph = horasPorPeca.get(x.refId);
      if (ph == null) continue; // peça não encontrada (excluída)
      const k = x.date.slice(0, 7);
      meses.set(k, (meses.get(k) || 0) + ph * (x.quantity || 0));
    }
    if (meses.size === 0) return null;
    const total = [...meses.values()].reduce((a, b) => a + b, 0);
    return { horas: total / meses.size, meses: meses.size };
  });

  let showWatts = $state(false);
  const printersInfo = [
    { nome: 'Bambu Lab A1 Mini', w: '80 W', kwh: '0,80 kWh' },
    { nome: 'Bambu Lab A1', w: '95 W', kwh: '0,95 kWh' },
    { nome: 'Creality Ender-3 V3 KE', w: '120 W*', kwh: '1,20 kWh' },
    { nome: 'Creality Ender-3 V3 SE', w: '125 W*', kwh: '1,25 kWh' },
    { nome: 'Creality K1C', w: '130 W*', kwh: '1,30 kWh' },
    { nome: 'Bambu Lab P1S', w: '105 W', kwh: '1,05 kWh' },
    { nome: 'Bambu Lab X1 Carbon', w: '105 W', kwh: '1,05 kWh' },
  ];

  function aplicarSugestao() {
    if (!sugestaoHoras) return;
    settings.hoursPerMonth = Math.round(sugestaoHoras.horas);
    persistSettings();
  }

  async function onImportFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const r = await importBackup(file);
      importMsg = `Importado: ${r.filaments} filamento(s), ${r.history} cálculo(s).`;
    } catch (err) {
      importMsg = 'Falha ao importar: arquivo inválido.';
    }
    (e.target as HTMLInputElement).value = '';
    setTimeout(() => (importMsg = ''), 5000);
  }
</script>

<div class="space-y-6 p-4 pb-8">
  <h1 class="text-xl font-bold">Configurações</h1>

  <!-- Conta / nuvem -->
  <section class="glass p-4">
    <h2 class="mb-1 font-semibold text-sky-600 dark:text-sky-400">Conta (nuvem)</h2>
    <p class="mb-3 text-xs text-slate-500">Entre para salvar seus dados na nuvem e acessá-los de outros aparelhos.</p>

    {#if auth.user}
      <p class="mb-3 text-sm">
        Logado como <span class="font-medium">{auth.user.email}</span>
      </p>
      <div class="mb-3 flex gap-2">
        <button class="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200" onclick={() => pull()}>Baixar da nuvem</button>
        <button class="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200" onclick={() => push()}>Enviar para nuvem</button>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-500">
          {#if syncState.status === 'syncing'}Sincronizando…{:else if syncState.status === 'synced'}Sincronizado ✓{:else if syncState.status === 'error'}Erro: {syncState.error}{:else}—{/if}
        </span>
        <button class="text-sm font-medium text-red-500" onclick={sair}>Sair</button>
      </div>
    {:else}
      <div class="space-y-2">
        <input
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          type="email"
          placeholder="Email"
          autocomplete="email"
          bind:value={email}
        />
        <input
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          type="password"
          placeholder="Senha"
          autocomplete="current-password"
          bind:value={senha}
        />
        <button
          class="w-full rounded-lg bg-sky-500 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
          disabled={busy || !email || !senha}
          onclick={entrar}
        >
          {busy ? 'Aguarde…' : modo === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
        <button
          class="w-full text-center text-xs text-sky-600"
          onclick={() => {
            modo = modo === 'login' ? 'cadastro' : 'login';
            authMsg = '';
          }}
        >
          {modo === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
        </button>
      </div>
    {/if}
    {#if authMsg}<p class="mt-2 text-sm text-amber-600">{authMsg}</p>{/if}
  </section>

  <!-- Aparência / tema -->
  <section class="glass p-4">
    <h2 class="mb-3 font-semibold text-sky-600 dark:text-sky-400">Aparência</h2>
    <div class="flex gap-2">
      {#each temas as t (t.id)}
        <button
          class="flex-1 rounded-lg py-2 text-sm font-medium {theme.value === t.id ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}"
          onclick={() => setTheme(t.id)}
        >
          <span class="mr-1">{t.icon}</span>{t.label}
        </button>
      {/each}
    </div>
  </section>

  <!-- Energia / Impressora -->
  <section class="glass p-4">
    <h2 class="mb-3 font-semibold text-sky-600 dark:text-sky-400">Energia & Impressora</h2>
    <div class="space-y-3">
      <label class="block">
        <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Preço do kWh</span>
        <CurrencyInput bind:value={settings.kwhPriceCentavos} />
      </label>
      <div class="block">
        <div class="mb-1 flex items-center gap-1.5">
          <span class="text-sm text-slate-600 dark:text-slate-300">Potência da impressora</span>
          <button
            type="button"
            class="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600 hover:bg-sky-200 dark:bg-sky-500/20 dark:text-sky-300"
            aria-label="Consumo médio por impressora"
            onclick={() => (showWatts = !showWatts)}
          >i</button>
        </div>
        <NumberInput bind:value={settings.printerWatts} suffix="W" decimals={0} />
        {#if showWatts}
          <div class="mt-2 rounded-lg bg-slate-50/70 p-3 text-xs dark:bg-slate-900/40">
            <p class="mb-2 font-semibold text-slate-600 dark:text-slate-300">Consumo médio aproximado</p>
            <table class="w-full">
              <thead>
                <tr class="text-left text-slate-400">
                  <th class="pb-1 font-medium">Impressora</th>
                  <th class="pb-1 text-right font-medium">Potência</th>
                </tr>
              </thead>
              <tbody class="text-slate-500 dark:text-slate-400">
                {#each printersInfo as p (p.nome)}
                  <tr class="border-t border-slate-200/70 dark:border-slate-700/70">
                    <td class="py-1">{p.nome}</td>
                    <td class="py-1 text-right whitespace-nowrap">{p.w}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
            <p class="mt-2 text-[10px] text-slate-400">* valor aproximado. Consumo real varia com temperatura, material e velocidade.</p>
          </div>
        {/if}
      </div>
    </div>
  </section>

  <!-- Desgaste -->
  <section class="glass p-4">
    <h2 class="mb-1 font-semibold text-sky-600 dark:text-sky-400">Desgaste da máquina</h2>
    <p class="mb-3 text-xs text-slate-500">Peças de troca e a cada quantos meses. Rateado pelas horas de impressão/mês.</p>
    <div class="space-y-3">
      {#each settings.wearParts as part (part.id)}
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div class="mb-2 flex items-center justify-between gap-2">
            <input
              class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="Nome da peça"
              maxlength="40"
              bind:value={part.name}
              oninput={persistSettings}
            />
            <button class="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30" onclick={() => removerPeca(part)}>Remover</button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <label class="block">
              <span class="mb-1 block text-xs text-slate-500">Custo</span>
              <CurrencyInput bind:value={part.costCentavos} />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-slate-500">Troca a cada</span>
              <NumberInput bind:value={part.intervalMonths} suffix="mês" decimals={0} />
            </label>
          </div>
        </div>
      {/each}
      <button class="w-full rounded-lg border border-sky-300 bg-sky-50 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20" onclick={addWearPart}>+ Adicionar peça</button>
    </div>
    <div class="mt-3">
      <label class="block">
        <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Horas de impressão por mês</span>
        <NumberInput bind:value={settings.hoursPerMonth} suffix="h" decimals={0} />
      </label>
      {#if sugestaoHoras}
        <div class="mt-2 rounded-lg bg-sky-50 p-3 text-xs text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800">
          De acordo com suas vendas cadastradas, sua média de impressão é de
          <span class="font-bold">{Math.round(sugestaoHoras.horas)} h/mês</span>
          <span class="text-sky-600 dark:text-sky-400">({sugestaoHoras.meses} {sugestaoHoras.meses === 1 ? 'mês' : 'meses'} com registro)</span>.
          <button class="mt-1 block font-semibold underline" onclick={aplicarSugestao}>Usar esse valor</button>
        </div>
      {/if}
      <div class="mt-3 rounded-lg bg-slate-50/70 p-3 text-xs dark:bg-slate-900/40">
        <p class="mb-1.5 font-semibold text-slate-600 dark:text-slate-300">Como o desgaste é calculado</p>
        <ul class="space-y-0.5 text-slate-500 dark:text-slate-400">
          {#each settings.wearParts as part (part.id)}
            {#if part.intervalMonths > 0}
              <li class="flex justify-between gap-2">
                <span class="min-w-0 truncate">{part.name || 'Peça'}: {formatBRL(part.costCentavos)} ÷ {part.intervalMonths} {part.intervalMonths === 1 ? 'mês' : 'meses'}</span>
                <span class="shrink-0">{formatBRL(Math.round(part.costCentavos / part.intervalMonths))}/mês</span>
              </li>
            {/if}
          {/each}
          <li class="flex justify-between gap-2 border-t border-slate-200 pt-1 font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <span>Soma mensal</span><span>{formatBRL(Math.round(monthlyWear))}/mês</span>
          </li>
          <li class="flex justify-between gap-2">
            <span>÷ {settings.hoursPerMonth || 0} h/mês</span>
            <span class="font-bold text-slate-700 dark:text-slate-200">{formatBRL(Math.round(wearHour))}/hora</span>
          </li>
        </ul>
      </div>
    </div>
  </section>

  <!-- Mão de obra -->
  <section class="glass p-4">
    <h2 class="mb-3 font-semibold text-sky-600 dark:text-sky-400">Mão de obra</h2>
    <label class="block">
      <span class="mb-1 block text-sm text-slate-600 dark:text-slate-300">Valor por hora (padrão)</span>
      <CurrencyInput bind:value={settings.laborRateCentavos} />
    </label>
  </section>

  <!-- Marketplaces -->
  <section class="glass p-4">
    <h2 class="mb-1 font-semibold text-sky-600 dark:text-sky-400">Marketplaces</h2>
    <p class="mb-3 text-xs text-slate-500">Taxa % aplicada sobre o preço de venda.</p>
    <div class="space-y-2">
      {#each settings.marketplaces as mp (mp.id)}
        <div class="flex items-center gap-2">
          <input
            class="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
            placeholder="Nome"
            maxlength="40"
            bind:value={mp.name}
            oninput={persistSettings}
          />
          <div class="w-24 shrink-0">
            <NumberInput bind:value={mp.ratePercent} suffix="%" decimals={1} />
          </div>
          <button class="shrink-0 rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30" onclick={() => removerMarket(mp)}>✕</button>
        </div>
      {/each}
      <button class="w-full rounded-lg border border-sky-300 bg-sky-50 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20" onclick={addMarketplace}>+ Adicionar marketplace</button>
    </div>
  </section>

  <!-- Backup -->
  <section class="glass p-4">
    <h2 class="mb-3 font-semibold text-sky-600 dark:text-sky-400">Backup dos dados</h2>
    <div class="flex gap-2">
      <button
        class="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
        onclick={() => exportBackup()}>Exportar JSON</button>
      <button
        class="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
        onclick={() => fileInput.click()}>Importar JSON</button>
      <input bind:this={fileInput} type="file" accept="application/json,.json" class="hidden" onchange={onImportFile} />
    </div>
    {#if importMsg}
      <p class="mt-2 text-sm text-emerald-600">{importMsg}</p>
    {/if}
  </section>
</div>
