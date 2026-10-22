<script lang="ts">
  import { Calculator, Spool, Layers, Package, DollarSign, Boxes, Wrench, WifiOff, TrendingUp } from 'lucide-svelte';

  let { onLogin, onSignup }: { onLogin: () => void; onSignup: () => void } = $props();

  // Grupo 1 — cálculo e precificação
  const calculo = [
    { icon: Calculator, grad: 'from-sky-500 to-violet-500', title: 'Custo real da impressão', desc: 'Filamento, energia, desgaste da máquina, mão de obra e custos avulsos — tudo somado.' },
    { icon: DollarSign, grad: 'from-emerald-500 to-teal-500', title: 'Preço de venda pronto', desc: 'Custo + margem de lucro + taxa do marketplace. Já sai o valor que você cobra.' },
    { icon: Layers, grad: 'from-violet-500 to-purple-500', title: 'Projeto em placas', desc: 'Divida o projeto em placas, cada uma com suas cores de filamento. O cálculo soma tudo.' },
    { icon: Wrench, grad: 'from-rose-500 to-pink-500', title: 'Desgaste da máquina', desc: 'Rateie o custo das peças da impressora por hora impressa, automático.' },
  ];

  // Grupo 2 — gestão do negócio 3D
  const gestao = [
    { icon: Spool, grad: 'from-fuchsia-500 to-pink-500', title: 'Perfis de filamento', desc: 'Catálogo por marca, tipo e cor, com preço por kg. Reutilize em cada cálculo.' },
    { icon: Package, grad: 'from-amber-500 to-orange-500', title: 'Estoque de projetos', desc: 'Controle quantas unidades de cada projeto você tem prontas pra vender.' },
    { icon: Boxes, grad: 'from-cyan-500 to-blue-500', title: 'Inventário de insumos', desc: 'Filamentos, bicos, placas, correias e peças de reposição num só lugar.' },
    { icon: TrendingUp, grad: 'from-green-500 to-emerald-500', title: 'Vendas e despesas', desc: 'Registre receitas e custos e acompanhe o que entra e o que sai.' },
  ];
</script>

<div class="min-h-screen">
  <!-- Hero: produto em foco -->
  <header class="mx-auto max-w-5xl px-6 pt-12 pb-10">
    <div class="grid items-center gap-10 md:grid-cols-2">
      <!-- Lado esquerdo: mensagem + CTAs -->
      <div class="text-center md:text-left">
        <div class="mb-5 inline-flex items-center justify-center rounded-3xl bg-white p-4 shadow-xl shadow-violet-500/20 ring-1 ring-white/60">
          <img src="./logo.png" alt="Printaê" class="h-16 w-auto" />
        </div>
        <h1 class="text-3xl font-black leading-tight text-slate-900 sm:text-4xl dark:text-white">
          Chega de <span class="text-rose-500">planilha</span>.<br />
          Chega de <span class="text-rose-500">chutar preço</span>.
        </h1>
        <p class="mx-auto mt-4 max-w-md text-base text-slate-600 md:mx-0 dark:text-slate-300">
          Calcule o preço certo e
          <span class="font-semibold text-slate-800 dark:text-slate-100">gerencie seu negócio 3D</span>:
          custo real da impressão, estoque, insumos e vendas — tudo num app, mesmo offline.
        </p>
        <div class="mt-6 flex flex-col gap-3 sm:flex-row md:justify-start">
          <button
            class="rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/30 transition-transform active:scale-95"
            onclick={onSignup}
          >
            Criar conta grátis
          </button>
          <button
            class="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 shadow-sm transition-transform active:scale-95 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            onclick={onLogin}
          >
            Entrar
          </button>
        </div>
        <p class="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400 md:justify-start">
          <WifiOff size={14} /> Teste grátis por 7 dias · instala no celular · 100% offline
        </p>
      </div>

      <!-- Lado direito: mock do resultado do cálculo -->
      <div class="rounded-3xl border border-white/10 bg-white/80 p-5 shadow-2xl backdrop-blur dark:bg-slate-800/60">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Suporte de fone · 2 placas</p>
        <div class="rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 p-4 text-center text-white shadow-lg shadow-red-500/25">
          <p class="text-xs font-semibold uppercase tracking-wide text-white/80">Custo total</p>
          <p class="mt-1 text-3xl font-extrabold">R$ 4,80</p>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-3">
          <div class="rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 p-3 text-center text-white">
            <p class="text-xs text-white/80">Preço de venda</p>
            <p class="mt-0.5 text-xl font-bold">R$ 24,90</p>
          </div>
          <div class="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-3 text-center text-white">
            <p class="text-xs text-white/80">Lucro</p>
            <p class="mt-0.5 text-xl font-bold">R$ 20,10</p>
          </div>
        </div>
        <ul class="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-300">
          <li class="flex justify-between"><span>Filamento</span><span>R$ 2,40</span></li>
          <li class="flex justify-between"><span>Energia + desgaste</span><span>R$ 1,10</span></li>
          <li class="flex justify-between"><span>Mão de obra</span><span>R$ 1,30</span></li>
        </ul>
      </div>
    </div>
  </header>

  {#snippet grupo(titulo: string, items: typeof calculo)}
    <h2 class="mb-3 mt-8 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
      {titulo}<span class="h-px flex-1 bg-slate-300/40 dark:bg-slate-700"></span>
    </h2>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {#each items as f (f.title)}
        <div class="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/80 p-4 shadow-sm backdrop-blur dark:bg-slate-800/60">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br {f.grad} text-white shadow-md">
            <f.icon size={20} />
          </span>
          <div class="min-w-0">
            <p class="font-semibold text-slate-800 dark:text-slate-100">{f.title}</p>
            <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
          </div>
        </div>
      {/each}
    </div>
  {/snippet}

  <!-- Funcionalidades detalhadas -->
  <section class="mx-auto max-w-4xl px-6 pb-16">
    {@render grupo('Cálculo & preço', calculo)}
    {@render grupo('Gestão do negócio 3D', gestao)}

    <!-- CTA final -->
    <div class="mt-10 rounded-3xl bg-gradient-to-br from-violet-500 to-sky-500 p-6 text-center text-white shadow-lg shadow-violet-500/25">
      <p class="text-lg font-bold">Calcule o preço e gerencie seu negócio 3D</p>
      <p class="mt-1 text-sm text-white/80">Crie sua conta e teste grátis por 7 dias.</p>
      <div class="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          class="w-full rounded-xl bg-white px-6 py-3 font-semibold text-violet-600 shadow-md transition-transform active:scale-95 sm:w-auto"
          onclick={onSignup}
        >
          Criar conta grátis
        </button>
        <button
          class="w-full rounded-xl border border-white/60 px-6 py-3 font-semibold text-white transition-transform active:scale-95 sm:w-auto"
          onclick={onLogin}
        >
          Já tenho conta
        </button>
      </div>
    </div>
  </section>
</div>
