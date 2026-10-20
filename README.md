# Calculadora de Custo 3D (PWA)

App web instalável (PWA) para calcular o **custo** e o **preço de venda** de impressões 3D. Funciona **100% offline** — instala no celular sem loja de aplicativos, dados salvos no próprio aparelho.

## Funcionalidades

- **Calcular**: até 4 filamentos (manual ou perfil salvo), energia, desgaste da máquina, mão de obra (por hora ou valor fixo), custos avulsos → custo total detalhado + preço de venda com margem e taxa de marketplace.
- **Filamentos**: cadastro de perfis (nome, tipo, cor, marca, preço/kg) para reusar.
- **Histórico**: salva cálculos (até 100) com os custos congelados no momento (alterar config não muda cálculos antigos).
- **Config**: preço do kWh, potência, peças de desgaste + intervalo, horas/mês, valor/hora de mão de obra, presets de marketplace. Export/import de backup JSON.
- **PWA**: instalável (Android via banner, iOS via "Adicionar à Tela de Início"), offline, toast de atualização.

## Como rodar

```bash
npm install
npm run dev      # desenvolvimento (http://localhost:5173)
npm run build    # gera dist/ (PWA de produção)
npm run preview  # testa o build de produção localmente
```

Para usar no celular: faça `npm run build`, suba a pasta `dist/` em qualquer host HTTPS (ou use `npm run preview` na mesma rede Wi-Fi) e abra no navegador do celular → instalar na tela inicial.

## Stack

Svelte 5 (runes) · Vite 6 · vite-plugin-pwa (Workbox) · Dexie (IndexedDB) · Tailwind CSS v4 · TypeScript.

## Arquitetura

- `src/lib/engine/` — cálculo puro (custos + preço), testável, dinheiro em **centavos inteiros**.
- `src/lib/money.ts` — formatação/parsing pt-BR (R$, vírgula decimal).
- `src/lib/db.ts` — Dexie: perfis de filamento + histórico.
- `src/lib/stores/settings.svelte.ts` — config em localStorage (auto-persistida).
- `src/lib/stores/pwa.svelte.ts` — service worker, update, install.
- `src/views/` — telas: Calculadora, Filamentos, Histórico, Configurações.

## Fórmulas

- Filamento: `gramas × (R$/kg) ÷ 1000`
- Energia: `(W ÷ 1000) × horas × R$/kWh`
- Desgaste: `Σ(custo peça ÷ intervalo meses) ÷ horas de impressão/mês × horas da peça`
- Preço com margem: `custo ÷ (1 − margem%)`
- Preço final (marketplace): `preço com margem ÷ (1 − taxa%)` — a taxa incide sobre o preço de venda, não sobre o custo.
