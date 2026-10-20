<!-- GSD:project-start source:PROJECT.md -->
## Project

**Calculadora de Custo 3D (PWA)**

App web instalável (PWA) para makers que fazem impressão 3D. Calcula o custo real de uma peça impressa (filamento, energia, desgaste da máquina, mão de obra, custos avulsos) e sugere o preço de venda (custo + margem de lucro + taxa de marketplace). Instala no celular sem loja de aplicativos e funciona 100% offline, com dados salvos no próprio aparelho.

**Core Value:** A partir dos gramas de filamento e do tempo de impressão, o app devolve um custo total correto e um preço de venda pronto para cobrar — mesmo sem internet.

### Constraints

- **Plataforma**: PWA (web instalável) — sem loja de apps, prioridade mobile
- **Offline**: funciona sem internet; service worker + armazenamento local (IndexedDB/localStorage) — Why: uso em oficina sem conexão
- **Dados**: persistência somente no dispositivo — Why: sem backend, sem conta
- **Idioma/moeda**: pt-BR, R$ — Why: público brasileiro
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Svelte | 5.57.x | UI framework | Compiles to ~2–5 KB gzipped runtime vs React's ~42 KB. No virtual DOM shipped to browser. Runes ($state, $derived) replace stores with simpler, universal reactivity. Single-file components are concise. For a calculator with no team/ecosystem lock-in, Svelte is the right size-vs-DX trade. |
| Vite | 7.3.x | Build tool | Native ESM, sub-second HMR, outputs minimal bundles. Vite 7 requires Node 20.19+ and targets `baseline-widely-available` browsers by default — safe for Android/iOS Safari. First-class Svelte plugin via `@sveltejs/vite-plugin-svelte`. |
| vite-plugin-pwa | 2.0.x | PWA manifest + service worker | Zero-config Workbox wrapper for Vite. Generates web app manifest, precache manifest, and SW registration in one plugin. `generateSW` strategy requires no custom SW code — right default for this app. Requires `@vite-pwa/assets-generator ^2.0.0` as peer dep. |
| Dexie.js | 4.4.x | IndexedDB wrapper | 25 KB gzipped. Typed schema, versioned migrations, transactions. `liveQuery()` integrates with Svelte stores by implementing the Svelte Store Contract (observable). `dexie-svelte-query` package (released Dec 2025) bridges liveQuery to Svelte 5 rune reactivity. The clear winner for structured offline data over raw idb or localStorage. |
| Tailwind CSS | 4.x | Styling | CSS-first config (no `tailwind.config.js` needed). First-party `@tailwindcss/vite` plugin — no PostCSS step. Output is ~8–15 KB gzipped for a typical app. Utility-first is appropriate for a mobile-first UI built without a design system dependency. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @sveltejs/vite-plugin-svelte | 5.x | Svelte + Vite bridge | Required: wires Svelte SFCs into Vite. Install alongside Svelte. |
| dexie-svelte-query | latest (npm, Dec 2025) | Reactive Dexie queries for Svelte 5 runes | Use for any component that needs to display live DB data (filament profiles list, history). Bridges liveQuery to `$state`-compatible reactivity. |
| @vite-pwa/assets-generator | 2.x | PWA icon generation from single SVG | One-time dev step: `pwa-assets-generator --preset minimal-2023 public/logo.svg` generates all required sizes (64, 192, 512, maskable, apple-touch). |
| TypeScript | 5.x | Type safety | Svelte 5 has native TS support — no preprocessor needed. Dexie's `EntityTable<T, 'id'>` gives typed table access. No extra config for a Vite project (`vite` ships with ts support). |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| Node.js | Build runtime | 20.19+ required by Vite 7 and vite-plugin-pwa 2.x |
| npm / pnpm | Package manager | Either works; pnpm is faster for monorepo-free single apps |
| Svelte DevTools (browser ext) | Component inspection | Available for Chrome/Firefox; helpful for debugging rune state |
| Lighthouse (Chrome DevTools) | PWA audit | Validates installability, manifest, SW registration, offline behavior. Run before shipping each iteration. |
## Installation
# Scaffold a Svelte + Vite + TypeScript project
# PWA tooling
# Styling
# Offline storage
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Svelte 5 | React 19 + Vite | When you need a large component ecosystem (complex data tables, rich text editors) or a team already fluent in React. For a solo-built calculator, the 42 KB React runtime overhead is unjustified. |
| Svelte 5 standalone | SvelteKit | When you need SSR, file-based routing, or server-side API routes. SvelteKit adds complexity for a 100% client-side offline-only app. Use Vite + Svelte directly. |
| Svelte 5 | Vue 3 + Vite | Vue 3 is a fine alternative (~10 KB runtime). Choose if the developer prefers Options/Composition API. Svelte wins on raw bundle size but Vue is close. |
| Svelte 5 | Vanilla JS + Vite | For a calculator with no component reuse, vanilla is viable. As soon as you have dynamic lists (filament profiles, history), a component model pays for itself. |
| Dexie.js | localStorage only | localStorage is fine for a handful of settings keys (kWh price, hourly rate). Use it for that. For collections (filament profiles list, history of N calculations), localStorage becomes a hand-rolled JSON array with no indexing — Dexie is strictly better. |
| Dexie.js | idb (raw wrapper) | idb is lower-level and smaller (~5 KB). Choose it if you need absolute minimal size and are comfortable writing manual migration code. For this app, Dexie's schema versioning and TypeScript generics outweigh the size difference. |
| Tailwind CSS v4 | UnoCSS | UnoCSS is marginally smaller and on-demand only. Tailwind v4 now ships comparable output sizes with better ecosystem tooling. For a solo project, Tailwind's documentation and community are more accessible. |
| vite-plugin-pwa (generateSW) | Manual Workbox injectManifest | Manual SW gives more control (background sync, push). This app has no background tasks — `generateSW` auto-generates a correct precache SW with zero boilerplate. Use `injectManifest` only if you need custom SW logic later. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Next.js / Nuxt | Server-side framework — adds SSR, API routes, server runtime overhead. Zero value for an offline-only app with no backend. | Vite + Svelte (standalone) |
| Create React App | Deprecated, unmaintained since 2023. Produces bloated bundles. | Vite |
| Workbox CLI directly | Requires manual build pipeline wiring. vite-plugin-pwa handles all Vite integration. | vite-plugin-pwa |
| localStorage for collections | 5–10 MB limit; synchronous (blocks main thread); no indexing; breaks in Service Workers. | Dexie.js (IndexedDB) |
| PWABuilder / Capacitor / Ionic | Adds native bridge layer — unnecessary for a web-only PWA. Increases complexity and bundle size. | vite-plugin-pwa manifest + SW |
| Redux / Zustand / Pinia | Global state libraries for React/Vue ecosystems. Svelte 5 runes ($state in .svelte.ts files) cover shared state natively without a library. | Svelte runes in .svelte.ts modules |
| Sass / Less | CSS preprocessors add a build step. Tailwind v4 eliminates the need for utility variables and mixins. | Tailwind CSS v4 |
| Svelte 4 (legacy) | Stores API is superseded by runes. New project should start on Svelte 5; runes enable cleaner code outside components (.svelte.ts files). | Svelte 5 |
## Stack Patterns by Variant
- Use localStorage directly (or a thin `$state` wrapper that persists to localStorage on change)
- Because these are primitive key-value pairs; Dexie overhead is unnecessary for non-collection data
- Use Dexie.js with typed `EntityTable<T, 'id'>` schema
- Define all tables in a single `src/lib/db.ts` file; import `db` everywhere
- Use `dexie-svelte-query` for reactive UI binding
- iOS Safari does not fire `beforeinstallprompt`; user must use Share > "Add to Home Screen" manually
- Display a persistent iOS-specific "Add to Home Screen" hint when `navigator.standalone === false` and the user-agent is iOS Safari
- Android/Chrome: intercept `beforeinstallprompt`, defer it, and show a custom install button
- `workbox.globPatterns` must include all static asset extensions (js, css, html, ico, png, svg, woff2)
- Set `registerType: 'autoUpdate'` for a single-user app (no multi-tab update conflict concerns)
- Test offline via Chrome DevTools > Application > Service Workers > "Offline" checkbox before each release
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| vite-plugin-pwa@2.x | vite@7.x, vite@8.x | v1.0.1 added Vite 7 compat; v1.3.0 added Vite 8; v2.0.0 bumps @vite-pwa/assets-generator peer to ^2.0.0 |
| dexie@4.x | All modern browsers | IndexedDB required; fully supported in iOS Safari 12+, Chrome 60+, Firefox 58+, Edge 79+ |
| svelte@5.x | @sveltejs/vite-plugin-svelte@5.x | Must match major versions. Runes are default in new files; Svelte 4 components still work side-by-side during incremental migration. |
| tailwindcss@4.x | @tailwindcss/vite@4.x | Both must be same major. No `tailwind.config.js` — configuration lives in CSS via `@theme` directive. |
| Node.js | >=20.19.0 | Required by Vite 7 and vite-plugin-pwa 2.x. |
## Sources
- Context7 `/vite-pwa/docs` — generateSW strategy, manifest config, service worker precache behavior (HIGH)
- Context7 `/websites/dexie` — EntityTable TypeScript schema patterns (HIGH)
- Context7 `/sveltejs/svelte` — Svelte 5 runes ($state, shared state in .svelte.ts files) (HIGH)
- https://github.com/vite-pwa/vite-plugin-pwa/releases — v2.0.0 release date (Oct 3 2026), peer dep changes (HIGH)
- https://www.npmjs.com/package/vite-plugin-pwa — latest version confirmation (HIGH, via search)
- https://newreleases.io/project/npm/dexie — Dexie 4.4.6 latest stable confirmation (HIGH)
- https://svelte.dev/blog/svelte-5-is-alive — Svelte 5 stable since Oct 22 2024; npm latest 5.57.2 (HIGH)
- https://vite.dev/blog/announcing-vite7 — Vite 7.0 released June 24 2025; Node 20.19+ requirement; baseline-widely-available target (HIGH)
- https://tailwindcss.com/blog/tailwindcss-v4 — Tailwind v4 CSS-first config, @tailwindcss/vite plugin, released Jan 22 2025 (HIGH)
- WebSearch: React vs Svelte bundle size comparison (Svelte 2–5 KB vs React 42 KB gzipped runtime) — corroborated by multiple sources (MEDIUM-HIGH)
- https://github.com/dexie/Dexie.js/issues/2075 — dexie-svelte-query package released Dec 2025 for Svelte 5 rune compatibility (MEDIUM — fetched via WebFetch from issue discussion)
- WebSearch: iOS Safari beforeinstallprompt not supported, Add to Home Screen manual flow required (HIGH — consistent across all PWA documentation)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
