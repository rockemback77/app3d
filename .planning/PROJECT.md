# Calculadora de Custo 3D (PWA)

## What This Is

App web instalável (PWA) para makers que fazem impressão 3D. Calcula o custo real de uma peça impressa (filamento, energia, desgaste da máquina, mão de obra, custos avulsos) e sugere o preço de venda (custo + margem de lucro + taxa de marketplace). Instala no celular sem loja de aplicativos e funciona 100% offline, com dados salvos no próprio aparelho.

## Core Value

A partir dos gramas de filamento e do tempo de impressão, o app devolve um custo total correto e um preço de venda pronto para cobrar — mesmo sem internet.

## Requirements

### Validated

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

**Cálculo de custo**
- [ ] Informar até 4 filamentos por cálculo (nome/perfil, preço por kg, gramas usados)
- [ ] Custo de filamento calculado por gramas × preço/kg para cada um dos filamentos
- [ ] Custo de energia a partir de configurações (preço do kWh, potência da impressora) e tempo de impressão
- [ ] Custo de desgaste da máquina a partir de configurações (preço das peças de troca e intervalo de troca em meses)
- [ ] Mão de obra: valor/hora padrão (config) × horas informadas, com opção de sobrescrever por valor fixo no cálculo
- [ ] Custos avulsos: campos livres (cola, lixa, pintura, embalagem, frete, etc.)
- [ ] Mostrar custo total detalhado por componente

**Preço de venda**
- [ ] Aplicar margem de lucro (%) sobre o custo
- [ ] Aplicar taxa de marketplace (%) selecionando o marketplace no momento do cálculo
- [ ] Opção "não aplicável" para venda fora de marketplace
- [ ] Taxas de marketplace pré-definidas em configurações, editáveis

**Perfis e histórico**
- [ ] Salvar perfis de filamento (nome, cor, preço/kg) para reutilizar
- [ ] Salvar histórico de cálculos para consulta posterior
- [ ] Configurações persistentes: preço kWh, potência impressora, peças/intervalo de troca, valor/hora mão de obra, marketplaces e taxas

**PWA / offline**
- [ ] Instalável no celular sem loja (manifest + service worker)
- [ ] Funciona 100% offline
- [ ] Todos os dados salvos localmente no aparelho

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Publicação em App Store / Play Store — PWA instalável cobre a necessidade
- Backend / conta de usuário / sincronização em nuvem — offline total, dados ficam no aparelho
- Mais de 4 filamentos por cálculo — 4 cobre multicolor/multimaterial comum
- Margem de falhas/desperdício (%) — não selecionado no escopo v1; pode entrar depois
- Leitura de arquivo de fatiamento (gcode/3mf) para extrair gramas/tempo — entrada é manual no v1

## Context

- Público: makers/pequenos negócios de impressão 3D no Brasil (moeda R$, pt-BR)
- Caso de uso típico: terminou de fatiar, pega gramas e tempo do slicer, abre o app no celular e calcula quanto cobrar
- Offline é requisito forte: uso em bancada/oficina sem garantia de internet
- Dois modos de dado: valores "fixos" raramente mudam (ficam em Configurações) vs. valores "do job" que mudam a cada cálculo (gramas, tempo, horas de trabalho, marketplace)

## Constraints

- **Plataforma**: PWA (web instalável) — sem loja de apps, prioridade mobile
- **Offline**: funciona sem internet; service worker + armazenamento local (IndexedDB/localStorage) — Why: uso em oficina sem conexão
- **Dados**: persistência somente no dispositivo — Why: sem backend, sem conta
- **Idioma/moeda**: pt-BR, R$ — Why: público brasileiro

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA instalável em vez de app nativo | Sem loja, sem custo de publicação, instala direto do navegador | — Pending |
| Offline total com dados locais | Uso em oficina sem internet; privacidade; sem backend | — Pending |
| Separar valores fixos (Configurações) de valores do job | Menos digitação repetida a cada cálculo | — Pending |
| Até 4 filamentos por cálculo | Cobre impressão multicolor/multimaterial comum | — Pending |
| Mão de obra "ambos" (valor/hora + override fixo) | Flexibilidade entre padrão e caso específico | — Pending |
| Desgaste calculado por troca de peças/intervalo em meses | Modelo simples e configurável de depreciação | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-20 after initialization*
