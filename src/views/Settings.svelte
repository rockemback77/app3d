<script lang="ts">
  import {
    Cloud,
    Zap,
    Wrench,
    Clock,
    Store,
    Tag,
    Database,
    Sparkles,
    LogOut,
    Info,
    Layers,
    Smartphone,
    Trash2,
    type Icon,
  } from 'lucide-svelte';
  import CurrencyInput from '../components/CurrencyInput.svelte';
  import NumberInput from '../components/NumberInput.svelte';
  import {
    settings,
    persistSettings,
    addWearPart,
    removeWearPart,
    addMarketplace,
    removeMarketplace,
    addTag,
    removeTag,
    setTagColor,
    tagColor,
    renameTag,
    DEFAULT_TAG_COLOR,
    addCostCategory,
    removeCostCategory,
    renameCostCategory,
  } from '../lib/stores/settings.svelte';
  import { wearPerHourCentavos } from '../lib/engine/costs';
  import { formatBRL } from '../lib/money';
  import { exportBackup, importBackup } from '../lib/backup';
  import { liveQuery } from 'dexie';
  import { countHistoryWithTag, removeTagFromAllHistory, renameTagInAllHistory, listHistory, listCostItems, countCostItemsWithCategory, renameCategoryInCostItems, clearCategoryInCostItems } from '../lib/db';
  import { auth, signOut } from '../lib/stores/auth.svelte';
  import { syncState, push, pull } from '../lib/sync.svelte';
  import {
    subscription,
    isActive,
    isTrial,
    daysLeft,
    statusLabel,
    cancelSubscription,
  } from '../lib/stores/subscription.svelte';
  import { pwa, promptInstall } from '../lib/stores/pwa.svelte';
  import { askConfirm } from '../lib/stores/confirm.svelte';

  let importMsg = $state('');
  let fileInput: HTMLInputElement;

  async function sair() {
    await signOut();
  }

  const assinaturaAtiva = $derived(isActive());
  const trial = $derived(isTrial());
  const dias = $derived(daysLeft());
  const vencimento = $derived(
    subscription.periodEnd
      ? new Date(subscription.periodEnd).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null
  );
  // Só dá para cancelar uma assinatura paga de verdade (não trial, não inativa).
  const podeCancelar = $derived(assinaturaAtiva && !trial);
  const badgeCor = $derived(
    assinaturaAtiva
      ? 'bg-emerald-500/20 text-emerald-300'
      : subscription.status === 'past_due'
        ? 'bg-amber-500/20 text-amber-300'
        : 'bg-red-500/20 text-red-300'
  );

  let cancelando = $state(false);
  let assinaturaErro = $state<string | null>(null);
  async function cancelarAssinatura() {
    const ok = await askConfirm({
      title: 'Cancelar assinatura',
      message:
        'Tem certeza? Você mantém o acesso até o fim do período já pago; depois a calculadora será bloqueada.',
      confirmLabel: 'Cancelar assinatura',
      danger: true,
    });
    if (!ok) return;
    cancelando = true;
    assinaturaErro = null;
    const msg = await cancelSubscription();
    if (msg) assinaturaErro = msg;
    cancelando = false;
  }

  async function removerPeca(part: { id: string; name: string }) {
    if (await askConfirm({ title: 'Excluir peça de desgaste', message: `Excluir a peça de desgaste "${part.name || 'sem nome'}"?`, confirmLabel: 'Excluir', danger: true }))
      removeWearPart(part.id);
  }
  async function removerMarket(mp: { id: string; name: string }) {
    if (await askConfirm({ title: 'Excluir marketplace', message: `Excluir o marketplace "${mp.name || 'sem nome'}"?`, confirmLabel: 'Excluir', danger: true }))
      removeMarketplace(mp.id);
  }

  let wearHour = $derived(wearPerHourCentavos(settings));

  let showWatts = $state(false);
  const historico = liveQuery(() => listHistory());
  function tagCount(tag: string): number {
    const t = tag.toLowerCase();
    return ($historico ?? []).filter((r) => (r.tags ?? []).some((x) => x.toLowerCase() === t)).length;
  }

  let novaTag = $state('');
  let novaTagCor = $state(DEFAULT_TAG_COLOR);
  function adicionarTag() {
    addTag(novaTag, novaTagCor);
    novaTag = '';
  }

  let editTag = $state<string | null>(null); // nome original em edição
  let editTagVal = $state('');
  function iniciarEdicaoTag(tag: string) {
    editTag = tag;
    editTagVal = tag;
  }
  function cancelarEdicaoTag() {
    editTag = null;
    editTagVal = '';
  }
  async function salvarEdicaoTag(oldName: string) {
    const novo = editTagVal.trim();
    if (!novo || novo === oldName) {
      cancelarEdicaoTag();
      return;
    }
    if (!renameTag(oldName, novo)) {
      alert('Nome inválido ou já existe outra tag com esse nome.');
      return;
    }
    await renameTagInAllHistory(oldName, novo);
    cancelarEdicaoTag();
  }

  const custosLista = liveQuery(() => listCostItems());
  function categoriaCount(cat: string): number {
    const c = cat.toLowerCase();
    return ($custosLista ?? []).filter((x) => (x.category ?? '').toLowerCase() === c).length;
  }

  let novaCategoria = $state('');
  function adicionarCategoria() {
    addCostCategory(novaCategoria);
    novaCategoria = '';
  }

  let editCat = $state<string | null>(null);
  let editCatVal = $state('');
  function iniciarEdicaoCat(cat: string) {
    editCat = cat;
    editCatVal = cat;
  }
  function cancelarEdicaoCat() {
    editCat = null;
    editCatVal = '';
  }
  async function salvarEdicaoCat(oldName: string) {
    const novo = editCatVal.trim();
    if (!novo || novo === oldName) {
      cancelarEdicaoCat();
      return;
    }
    if (!renameCostCategory(oldName, novo)) {
      alert('Nome inválido ou já existe outra categoria com esse nome.');
      return;
    }
    await renameCategoryInCostItems(oldName, novo);
    cancelarEdicaoCat();
  }
  async function removerCategoria(cat: string) {
    const n = await countCostItemsWithCategory(cat);
    if (n > 0) {
      if (!(await askConfirm({ title: 'Excluir categoria', message: `${n} custo(s) usam a categoria "${cat}". Excluir mesmo assim? Eles ficam sem categoria.`, confirmLabel: 'Excluir', danger: true }))) return;
      await clearCategoryInCostItems(cat);
    } else if (!(await askConfirm({ title: 'Excluir categoria', message: `Excluir a categoria "${cat}"?`, confirmLabel: 'Excluir', danger: true }))) {
      return;
    }
    removeCostCategory(cat);
  }
  async function removerTag(tag: string) {
    const n = await countHistoryWithTag(tag);
    if (n > 0) {
      const ok = await askConfirm({
        title: 'Excluir tag',
        message: `${n} projeto(s) usam a tag "${tag}". Excluir mesmo assim? A tag será removida desses projetos (as outras tags permanecem).`,
        confirmLabel: 'Excluir',
        danger: true,
      });
      if (!ok) return;
      await removeTagFromAllHistory(tag);
    }
    removeTag(tag);
  }
  const printersInfo = [
    { nome: 'Bambu Lab A1 Mini', watts: 80, w: '80 W', kwh: '0,80 kWh' },
    { nome: 'Bambu Lab A1', watts: 95, w: '95 W', kwh: '0,95 kWh' },
    { nome: 'Creality Ender-3 V3 KE', watts: 120, w: '120 W*', kwh: '1,20 kWh' },
    { nome: 'Creality Ender-3 V3 SE', watts: 125, w: '125 W*', kwh: '1,25 kWh' },
    { nome: 'Creality K1C', watts: 130, w: '130 W*', kwh: '1,30 kWh' },
    { nome: 'Bambu Lab P1S', watts: 105, w: '105 W', kwh: '1,05 kWh' },
    { nome: 'Bambu Lab X1 Carbon', watts: 105, w: '105 W', kwh: '1,05 kWh' },
  ];
  function aplicarImpressora(v: string) {
    const n = Number(v);
    if (n > 0) settings.printerWatts = n;
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

{#snippet secao(IconComp: typeof Icon, grad: string, titulo: string, desc?: string)}
  <div class="mb-3 flex items-center gap-3">
    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br {grad} text-white shadow-md">
      <IconComp size={20} />
    </span>
    <div class="min-w-0">
      <h2 class="font-semibold leading-tight text-slate-100">{titulo}</h2>
      {#if desc}<p class="text-xs text-slate-400">{desc}</p>{/if}
    </div>
  </div>
{/snippet}

<div class="space-y-6 p-4 pb-8">
  <h1 class="text-2xl font-extrabold text-slate-100">Configurações</h1>

  <!-- Card de assinatura / conta (topo, estilo "Pro") -->
  <div class="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/15 to-sky-500/10 p-4">
    <div class="flex items-center gap-3">
      <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-sky-500 text-white shadow-lg shadow-violet-500/30">
        <Sparkles size={24} />
      </span>
      <div class="min-w-0 flex-1">
        <p class="font-bold text-slate-100">Assinatura Pro</p>
        <p class="truncate text-xs text-slate-400">
          {#if trial}
            Teste grátis — {dias} {dias === 1 ? 'dia restante' : 'dias restantes'}
          {:else if assinaturaAtiva && vencimento}
            Válida até {vencimento}
          {:else if subscription.status === 'past_due'}
            Pagamento pendente — regularize para manter o acesso
          {:else if subscription.status === 'canceled'}
            Cancelada{vencimento ? ` — acesso até ${vencimento}` : ''}
          {:else}
            Assine para manter o acesso
          {/if}
        </p>
      </div>
      <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold {badgeCor}">
        {statusLabel()}
      </span>
    </div>

    {#if podeCancelar}
      <button
        class="mt-3 w-full rounded-lg border border-white/10 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50"
        disabled={cancelando}
        onclick={cancelarAssinatura}
      >
        {cancelando ? 'Cancelando…' : 'Cancelar assinatura'}
      </button>
    {/if}
    {#if assinaturaErro}
      <p class="mt-2 text-xs text-red-400">{assinaturaErro}</p>
    {/if}

    {#if auth.user}
      <div class="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
        <span class="min-w-0 truncate text-xs text-slate-400">{auth.user.email}</span>
        <button class="flex shrink-0 items-center gap-1 text-sm font-medium text-red-400" onclick={sair}>
          <LogOut size={15} /> Sair
        </button>
      </div>
    {/if}
  </div>

  <!-- Instalar no celular -->
  <div class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    {@render secao(Smartphone, 'from-emerald-500 to-teal-500', 'Instalar no app', 'Adicione o Printaê à tela inicial')}
    {#if pwa.isStandalone}
      <p class="text-sm text-emerald-300">App já instalado neste aparelho ✓</p>
    {:else if pwa.canInstall}
      <button class="w-full rounded-lg bg-sky-500 py-2.5 text-sm font-semibold text-white hover:bg-sky-400" onclick={() => promptInstall()}>
        Instalar agora
      </button>
    {:else if pwa.isIOS}
      <p class="text-sm text-slate-300">
        No iPhone/iPad: toque em <span class="font-semibold">Compartilhar</span> e depois em
        <span class="font-semibold">"Adicionar à Tela de Início"</span>.
      </p>
    {:else}
      <p class="text-sm text-slate-300">
        No navegador, abra o menu (⋮) e escolha <span class="font-semibold">"Instalar app"</span> ou
        <span class="font-semibold">"Adicionar à tela inicial"</span>.
      </p>
    {/if}
  </div>

  <!-- ====== DADOS / NUVEM ====== -->
  <p class="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Dados</p>

  <div class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md">
          <Cloud size={20} />
        </span>
        <div class="min-w-0">
          <h2 class="font-semibold leading-tight text-slate-100">Nuvem</h2>
          <p class="text-xs text-slate-400">Sincronize entre aparelhos</p>
        </div>
      </div>
      <span
        class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold {syncState.status === 'synced'
          ? 'bg-emerald-500/20 text-emerald-300'
          : syncState.status === 'syncing'
            ? 'bg-sky-500/20 text-sky-300'
            : syncState.status === 'error'
              ? 'bg-red-500/20 text-red-300'
              : 'bg-slate-700 text-slate-400'}"
      >
        {#if syncState.status === 'syncing'}Sincronizando…{:else if syncState.status === 'synced'}Sincronizado ✓{:else if syncState.status === 'error'}Erro{:else}—{/if}
      </span>
    </div>
    <div class="flex gap-2">
      <button class="flex-1 rounded-lg bg-slate-700 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600" onclick={() => pull()}>Baixar</button>
      <button class="flex-1 rounded-lg bg-slate-700 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600" onclick={() => push()}>Enviar</button>
    </div>
    {#if syncState.status === 'error'}<p class="mt-2 text-xs text-red-400">{syncState.error}</p>{/if}
  </div>

  <div class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    {@render secao(Database, 'from-indigo-500 to-violet-500', 'Backup dos dados', 'Exporte ou importe um arquivo JSON')}
    <div class="flex gap-2">
      <button class="flex-1 rounded-lg bg-slate-700 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600" onclick={() => exportBackup()}>Exportar JSON</button>
      <button class="flex-1 rounded-lg bg-slate-700 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600" onclick={() => fileInput.click()}>Importar JSON</button>
      <input bind:this={fileInput} type="file" accept="application/json,.json" class="hidden" onchange={onImportFile} />
    </div>
    {#if importMsg}<p class="mt-2 text-sm text-emerald-400">{importMsg}</p>{/if}
  </div>

  <div class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    {@render secao(Tag, 'from-cyan-500 to-blue-500', 'Tags dos projetos', 'Opções que aparecem ao salvar um projeto')}
    <div class="mb-3 flex gap-2">
      <input
        type="color"
        class="h-9 w-10 shrink-0 cursor-pointer rounded border border-slate-600 bg-slate-900"
        bind:value={novaTagCor}
        aria-label="Cor da nova tag"
      />
      <input
        class="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
        placeholder="Nova tag"
        maxlength="30"
        bind:value={novaTag}
        onkeydown={(e) => e.key === 'Enter' && adicionarTag()}
      />
      <button class="shrink-0 rounded-lg bg-sky-500 px-4 text-sm font-semibold text-white hover:bg-sky-400" onclick={adicionarTag}>Adicionar</button>
    </div>
    {#if settings.tags.length}
      <div class="space-y-1.5">
        {#each settings.tags ?? [] as tag (tag)}
          <div class="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/40 px-2 py-1.5">
            <label class="relative flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center" title="Mudar cor">
              <span class="h-3.5 w-3.5 rounded-full" style="background:{tagColor(tag)}"></span>
              <input
                type="color"
                value={tagColor(tag)}
                onchange={(e) => setTagColor(tag, e.currentTarget.value)}
                class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Cor da tag {tag}"
              />
            </label>
            {#if editTag === tag}
              <input
                type="color"
                class="h-7 w-8 shrink-0 cursor-pointer rounded border border-slate-600 bg-slate-900"
                value={tagColor(tag)}
                onchange={(e) => setTagColor(tag, e.currentTarget.value)}
                aria-label="Cor da tag {tag}"
                title="Cor da tag"
              />
              <input
                class="min-w-0 flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
                maxlength="30"
                bind:value={editTagVal}
                onkeydown={(e) => e.key === 'Enter' && salvarEdicaoTag(tag)}
              />
              <button class="shrink-0 text-sm font-medium text-emerald-400" onclick={() => salvarEdicaoTag(tag)}>Salvar</button>
              <button class="shrink-0 text-sm text-slate-400" onclick={cancelarEdicaoTag}>Cancelar</button>
            {:else}
              <span class="min-w-0 flex-1 truncate text-sm font-medium" style="color:{tagColor(tag)}">{tag}</span>
              <span class="shrink-0 text-xs text-slate-400">{tagCount(tag)} {tagCount(tag) === 1 ? 'projeto' : 'projetos'}</span>
              <button class="shrink-0 rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/30" onclick={() => iniciarEdicaoTag(tag)}>Editar</button>
              <button class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10" aria-label="Excluir tag" title="Excluir" onclick={() => removerTag(tag)}><Trash2 size={16} /></button>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-xs text-slate-500">Nenhuma tag cadastrada.</p>
    {/if}
  </div>

  <div class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    {@render secao(Layers, 'from-indigo-500 to-blue-500', 'Categorias de custo', 'Agrupam os itens em Outros custos')}
    <div class="mb-3 flex gap-2">
      <input
        class="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
        placeholder="Nova categoria"
        maxlength="30"
        bind:value={novaCategoria}
        onkeydown={(e) => e.key === 'Enter' && adicionarCategoria()}
      />
      <button class="shrink-0 rounded-lg bg-sky-500 px-4 text-sm font-semibold text-white hover:bg-sky-400" onclick={adicionarCategoria}>Adicionar</button>
    </div>
    {#if settings.costCategories?.length}
      <div class="space-y-1.5">
        {#each settings.costCategories ?? [] as cat (cat)}
          <div class="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/40 px-2 py-1.5">
            {#if editCat === cat}
              <input
                class="min-w-0 flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
                maxlength="30"
                bind:value={editCatVal}
                onkeydown={(e) => e.key === 'Enter' && salvarEdicaoCat(cat)}
              />
              <button class="shrink-0 text-sm font-medium text-emerald-400" onclick={() => salvarEdicaoCat(cat)}>Salvar</button>
              <button class="shrink-0 text-sm text-slate-400" onclick={cancelarEdicaoCat}>Cancelar</button>
            {:else}
              <span class="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">{cat}</span>
              <span class="shrink-0 text-xs text-slate-400">{categoriaCount(cat)} {categoriaCount(cat) === 1 ? 'custo' : 'custos'}</span>
              <button class="shrink-0 rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/30" onclick={() => iniciarEdicaoCat(cat)}>Editar</button>
              <button class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10" aria-label="Excluir categoria" title="Excluir" onclick={() => removerCategoria(cat)}><Trash2 size={16} /></button>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-xs text-slate-500">Nenhuma categoria cadastrada.</p>
    {/if}
  </div>

  <!-- ====== CÁLCULO ====== -->
  <p class="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Cálculo</p>

  <div class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    {@render secao(Zap, 'from-amber-500 to-orange-500', 'Energia & Impressora')}
    <div class="space-y-3">
      <label class="block">
        <span class="mb-1 block text-sm text-slate-300">Preço do kWh</span>
        <CurrencyInput bind:value={settings.kwhPriceCentavos} />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm text-slate-300">Minha impressora (opcional)</span>
        <select
          class="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          onchange={(e) => aplicarImpressora(e.currentTarget.value)}
        >
          <option value="">— Selecione para preencher a potência —</option>
          {#each printersInfo as p (p.nome)}
            <option value={p.watts}>{p.nome} ({p.watts} W)</option>
          {/each}
        </select>
        <span class="mt-1 block text-xs text-slate-400">Só preenche a potência abaixo. Você pode ajustar depois.</span>
      </label>
      <div class="block">
        <div class="mb-1 flex items-center gap-1.5">
          <span class="text-sm text-slate-300">Potência da impressora</span>
          <button
            type="button"
            class="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-sky-300 hover:bg-sky-500/30"
            aria-label="Consumo médio por impressora"
            onclick={() => (showWatts = !showWatts)}
          ><Info size={12} /></button>
        </div>
        <NumberInput bind:value={settings.printerWatts} suffix="W" decimals={0} />
        {#if showWatts}
          <div class="mt-2 rounded-lg bg-slate-900/40 p-3 text-xs">
            <p class="mb-2 font-semibold text-slate-300">Consumo médio aproximado</p>
            <table class="w-full">
              <thead>
                <tr class="text-left text-slate-500">
                  <th class="pb-1 font-medium">Impressora</th>
                  <th class="pb-1 text-right font-medium">Potência</th>
                </tr>
              </thead>
              <tbody class="text-slate-400">
                {#each printersInfo as p (p.nome)}
                  <tr class="border-t border-slate-700/70">
                    <td class="py-1">{p.nome}</td>
                    <td class="py-1 text-right whitespace-nowrap">{p.w}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
            <p class="mt-2 text-[10px] text-slate-500">* valor aproximado. Consumo real varia com temperatura, material e velocidade.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    {@render secao(Wrench, 'from-rose-500 to-pink-500', 'Desgaste da máquina', 'Custo das peças rateado por hora impressa')}
    <div class="space-y-3">
      {#each settings.wearParts ?? [] as part (part.id)}
        <div class="rounded-lg border border-slate-700 p-3">
          <div class="mb-2 flex items-center justify-between gap-2">
            <input
              class="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
              placeholder="Nome da peça"
              maxlength="40"
              bind:value={part.name}
              oninput={persistSettings}
            />
            <button class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10" aria-label="Excluir peça de desgaste" title="Excluir" onclick={() => removerPeca(part)}><Trash2 size={16} /></button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <label class="block">
              <span class="mb-1 block text-xs text-slate-500">Custo</span>
              <CurrencyInput bind:value={part.costCentavos} />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-slate-500">Vida útil</span>
              <NumberInput bind:value={part.lifespanHours} suffix="h" decimals={0} />
            </label>
          </div>
        </div>
      {/each}
      <button class="w-full rounded-lg border border-sky-500/40 bg-sky-500/10 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/20" onclick={addWearPart}>+ Adicionar</button>
    </div>
    <div class="mt-3 rounded-lg bg-slate-900/40 p-3 text-xs">
      <p class="mb-1.5 font-semibold text-slate-300">Como o desgaste é calculado?</p>
      <ul class="space-y-0.5 text-slate-400">
        {#each settings.wearParts ?? [] as part (part.id)}
          {#if part.lifespanHours > 0}
            <li class="flex justify-between gap-2">
              <span class="min-w-0 truncate">{part.name || 'Peça'}: {formatBRL(part.costCentavos)} ÷ {part.lifespanHours} h</span>
              <span class="shrink-0">{formatBRL(Math.round(part.costCentavos / part.lifespanHours))}/h</span>
            </li>
          {/if}
        {/each}
        <li class="flex justify-between gap-2 border-t border-slate-700 pt-1 font-bold text-slate-200">
          <span>Desgaste por hora</span><span>{formatBRL(Math.round(wearHour))}/hora</span>
        </li>
      </ul>
    </div>
  </div>

  <div class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    {@render secao(Clock, 'from-teal-500 to-emerald-500', 'Mão de obra')}
    <label class="block">
      <span class="mb-1 block text-sm text-slate-300">Valor por hora (padrão)</span>
      <CurrencyInput bind:value={settings.laborRateCentavos} />
    </label>
  </div>

  <!-- ====== VENDA ====== -->
  <p class="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Venda</p>

  <div class="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
    {@render secao(Store, 'from-fuchsia-500 to-purple-500', 'Marketplaces', 'Taxa % sobre o preço de venda')}
    <div class="space-y-2">
      {#each settings.marketplaces ?? [] as mp (mp.id)}
        <div class="flex items-center gap-2">
          <input
            class="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm"
            placeholder="Nome"
            maxlength="40"
            bind:value={mp.name}
            oninput={persistSettings}
          />
          <div class="w-24 shrink-0">
            <NumberInput bind:value={mp.ratePercent} suffix="%" decimals={1} />
          </div>
          <button class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10" aria-label="Excluir marketplace" title="Excluir" onclick={() => removerMarket(mp)}><Trash2 size={16} /></button>
        </div>
      {/each}
      <button class="w-full rounded-lg border border-sky-500/40 bg-sky-500/10 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/20" onclick={addMarketplace}>+ Adicionar marketplace</button>
    </div>
  </div>
</div>
