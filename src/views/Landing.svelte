<script lang="ts">
  import { Calculator, Spool, Layers, Package, DollarSign, Boxes, Wrench, WifiOff } from 'lucide-svelte';

  let { onLogin, onSignup }: { onLogin: () => void; onSignup: () => void } = $props();

  const features = [
    { icon: Calculator, grad: 'from-sky-500 to-violet-500', title: 'Custo real da impressão', desc: 'Filamento, energia, desgaste da máquina, mão de obra e custos avulsos — tudo somado.' },
    { icon: DollarSign, grad: 'from-emerald-500 to-teal-500', title: 'Preço de venda pronto', desc: 'Custo + margem de lucro + taxa do marketplace. Já sai o valor que você cobra.' },
    { icon: Layers, grad: 'from-violet-500 to-purple-500', title: 'Projeto em placas', desc: 'Divida o projeto em placas, cada uma com suas cores de filamento. O cálculo soma tudo.' },
    { icon: Spool, grad: 'from-fuchsia-500 to-pink-500', title: 'Perfis de filamento', desc: 'Cadastre por marca, tipo e cor, com preço por kg. Reutilize em cada cálculo.' },
    { icon: Package, grad: 'from-amber-500 to-orange-500', title: 'Estoque de projetos', desc: 'Controle quantas unidades de cada projeto você tem prontas pra vender.' },
    { icon: Boxes, grad: 'from-cyan-500 to-blue-500', title: 'Inventário de insumos', desc: 'Filamentos, bicos, placas, correias e peças de reposição num só lugar.' },
    { icon: DollarSign, grad: 'from-green-500 to-emerald-500', title: 'Vendas e despesas', desc: 'Registre receitas e custos, acompanhe o que entra e o que sai.' },
    { icon: Wrench, grad: 'from-rose-500 to-pink-500', title: 'Desgaste da máquina', desc: 'Rateie o custo das peças da impressora por hora impressa, automático.' },
  ];
</script>

<div class="min-h-screen">
  <!-- Hero -->
  <header class="mx-auto max-w-3xl px-6 pt-12 pb-8 text-center">
    <img src="./logo.png" alt="Printaê" class="mx-auto mb-4 h-24 w-auto" />
    <h1 class="sr-only">Printaê</h1>
    <p class="mx-auto mt-3 max-w-xl text-base text-slate-600 dark:text-slate-300">
      Calcule o custo real da sua impressão 3D e o preço de venda certo — mesmo sem internet.
      Feito para makers que vendem o que imprimem.
    </p>
    <div class="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <button
        class="w-full rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-6 py-3 font-semibold text-white shadow-md shadow-violet-500/30 transition-transform active:scale-95 sm:w-auto"
        onclick={onSignup}
      >
        Criar conta grátis
      </button>
      <button
        class="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 shadow-sm transition-transform active:scale-95 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:w-auto"
        onclick={onLogin}
      >
        Entrar
      </button>
    </div>
    <p class="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
      <WifiOff size={14} /> Instala no celular e funciona 100% offline
    </p>
  </header>

  <!-- Funcionalidades -->
  <section class="mx-auto max-w-3xl px-6 pb-16">
    <h2 class="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-slate-400">Tudo que o app faz</h2>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {#each features as f (f.title)}
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

    <!-- CTA final -->
    <div class="mt-10 rounded-3xl bg-gradient-to-br from-violet-500 to-sky-500 p-6 text-center text-white shadow-lg shadow-violet-500/25">
      <p class="text-lg font-bold">Comece a precificar certo hoje</p>
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
