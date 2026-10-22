<script lang="ts">
  import { Calculator, Spool, Layers, Package, DollarSign, Boxes, Wrench, WifiOff, TrendingUp, Download } from 'lucide-svelte';

  let { onLogin, onSignup }: { onLogin: () => void; onSignup: () => void } = $props();

  // Grupo 1 — cálculo e precificação
  const calculo = [
    { icon: Calculator, grad: 'from-sky-500 to-violet-500', title: 'Custo real da impressão', desc: 'Filamento, energia, desgaste da máquina, mão de obra e outros custos — tudo somado.' },
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

  function irPara(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  // revela o bloco ao entrar na viewport
  function reveal(node: HTMLElement) {
    node.classList.add('opacity-0', 'translate-y-5');
    node.classList.add('transition-all', 'duration-700', 'ease-out');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            node.classList.remove('opacity-0', 'translate-y-5');
            io.unobserve(node);
          }
        }
      },
      { threshold: 0.12 }
    );
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }
</script>

<!-- Nav sticky com âncoras -->
<nav class="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur">
  <div class="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3">
    <button class="flex items-center gap-2" onclick={() => irPara('inicio')}>
      <img src="./icone.png" alt="" class="h-8 w-8 object-contain" />
      <span class="bg-gradient-to-r from-violet-400 to-sky-400 bg-clip-text font-extrabold text-transparent">Printaê</span>
    </button>
    <button
      class="ml-auto rounded-lg border border-white/20 bg-white/5 px-4 py-1.5 text-sm font-semibold text-white"
      onclick={onLogin}
    >
      Entrar
    </button>
  </div>
</nav>

<!-- ============ SEÇÃO: HERO ============ -->
<section id="inicio" class="w-full px-6 py-16">
  <div class="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
    <div class="text-center md:text-left" use:reveal>
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

    <!-- mock do resultado do cálculo -->
    <div class="rounded-3xl border border-white/10 bg-white/80 p-5 shadow-2xl backdrop-blur dark:bg-slate-800/60" use:reveal>
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
        <li class="flex justify-between pl-3 text-[11px] text-slate-400"><span>Placa 1</span><span>R$ 1,40</span></li>
        <li class="flex justify-between pl-3 text-[11px] text-slate-400"><span>Placa 2</span><span>R$ 1,00</span></li>
        <li class="flex justify-between"><span>Energia + desgaste</span><span>R$ 1,10</span></li>
        <li class="flex justify-between"><span>Mão de obra</span><span>R$ 1,30</span></li>
      </ul>
    </div>
  </div>
</section>

<!-- ============ SEÇÃO: DOR -> SOLUÇÃO ============ -->
<section id="problema" class="w-full border-y border-white/10 bg-slate-950/40 px-6 py-16">
  <div class="mx-auto max-w-4xl text-center" use:reveal>
    <h2 class="text-2xl font-extrabold text-white sm:text-3xl">Imprimir é fácil. Saber se dá lucro, não.</h2>
    <p class="mx-auto mt-3 max-w-xl text-slate-300">Sem conta certa, você vende no prejuízo sem perceber. O Printaê fecha essa conta pra você.</p>
    <div class="mt-8 grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-5">
        <p class="text-sm font-bold text-rose-300">Chuta o preço</p>
        <p class="mt-1 text-sm text-slate-300">"Acho que uns 20 reais tá bom" — e some o lucro.</p>
      </div>
      <div class="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
        <p class="text-sm font-bold text-amber-300">Esquece custos</p>
        <p class="mt-1 text-sm text-slate-300">Energia, desgaste e mão de obra ficam de fora da conta.</p>
      </div>
      <div class="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-5">
        <p class="text-sm font-bold text-sky-300">Planilha bagunçada</p>
        <p class="mt-1 text-sm text-slate-300">Arquivo perdido, fórmula quebrada, nada no celular.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ SEÇÃO: CÁLCULO & PREÇO ============ -->
<section id="calculo" class="w-full px-6 py-16">
  <div class="mx-auto max-w-4xl" use:reveal>
    <span class="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-500/30">Cálculo &amp; preço</span>
    <h2 class="mt-3 text-2xl font-extrabold text-white sm:text-3xl">O preço certo em segundos</h2>
    <p class="mt-2 max-w-xl text-slate-300">Dos gramas e do tempo de impressão ao valor final de venda.</p>
    <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {#each calculo as f (f.title)}
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
  </div>
</section>

<!-- ============ SEÇÃO: GESTÃO ============ -->
<section id="gestao" class="w-full border-y border-white/10 bg-slate-950/40 px-6 py-16">
  <div class="mx-auto max-w-4xl" use:reveal>
    <span class="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">Gestão do negócio 3D</span>
    <h2 class="mt-3 text-2xl font-extrabold text-white sm:text-3xl">Seu negócio inteiro num app</h2>
    <p class="mt-2 max-w-xl text-slate-300">Estoque, insumos e vendas organizados — sem planilha.</p>
    <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {#each gestao as f (f.title)}
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
  </div>
</section>

<!-- ============ SEÇÃO: OFFLINE / INSTALA ============ -->
<section id="offline" class="w-full px-6 py-16">
  <div class="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-violet-600/20 to-sky-600/20 p-8 text-center ring-1 ring-white/10" use:reveal>
    <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-sky-500 text-white shadow-lg">
      <Download size={26} />
    </span>
    <h2 class="mt-4 text-2xl font-extrabold text-white sm:text-3xl">Instala no celular. Funciona sem internet.</h2>
    <p class="mx-auto mt-3 max-w-xl text-slate-300">
      É um app web: adiciona na tela inicial e usa na oficina mesmo sem sinal. Seus dados ficam no seu aparelho.
    </p>
    <p class="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
      <WifiOff size={14} /> 100% offline · sem loja de apps · pt-BR, R$
    </p>
  </div>
</section>

<!-- ============ SEÇÃO: CTA FINAL ============ -->
<section id="comecar" class="w-full px-6 pb-20 pt-4">
  <div class="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-violet-500 to-sky-500 p-8 text-center text-white shadow-lg shadow-violet-500/25" use:reveal>
    <h2 class="text-2xl font-extrabold sm:text-3xl">Comece a lucrar de verdade</h2>
    <p class="mt-1 text-sm text-white/80">Crie sua conta e teste grátis por 7 dias.</p>
    <div class="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
