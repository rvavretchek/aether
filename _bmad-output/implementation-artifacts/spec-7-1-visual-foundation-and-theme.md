---
title: 'Story 7.1: Fundação visual e tema do Admin UI'
type: 'feature'
created: '2026-10-25'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Aether-2026-08-14/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O `apps/web` gerado por `aether-admin new` não tem nenhuma base visual (sem CSS, Tailwind, componentes, tema ou dark mode) nem convenção de teste de frontend. As 6 stories seguintes da Epic 7 não têm onde se apoiar.

**Approach:** Vendorizar no gerador shadcn/ui (Radix) + Tailwind CSS v4 e os 4 presets visuais (claro+escuro, OKLCH, tokens canônicos shadcn + `--success`) como dados TypeScript. `aether-admin new` pergunta qual preset usar e embute só aquele no CSS global do projeto gerado. Dark mode via classe `.dark` sem FOUC. Convenção de teste de componente (Vitest + Testing Library + jsdom, `*.test.tsx` co-localizado) nasce aqui, documentada no projeto gerado.

## Boundaries & Constraints

**Always:**
- Nomes de token = vocabulário canônico shadcn + `--success`/`--success-foreground` (AD-13); valores OKLCH copiados dos 4 `DESIGN-*.md` (resolver referências `{colors.x}` para o valor final). Conjunto exato, claro e `.dark`: `background, foreground, card, card-foreground, popover, popover-foreground, primary, primary-foreground, secondary, secondary-foreground, muted, muted-foreground, accent, accent-foreground, destructive, destructive-foreground, success, success-foreground, border, input, ring`. Os DESIGN não definem `secondary`: derivar `--secondary` = `muted` e `--secondary-foreground` = `foreground`. `chart-*` e `sidebar-*` ficam fora.
- Radius: `--radius` = `rounded.DEFAULT`; `--radius-sm/md/lg/xl` (e `2xl` quando existir) explícitos de `rounded` de cada preset, sem `calc()`. Fontes: `--font-sans` = `typography.body`, `--font-heading` = `typography.heading`, `--font-mono` = `typography.mono` (preserva o heading serifado do `autoral`).
- Variante `secondary` do Button segue o `components.button-secondary` dos DESIGN (fundo transparente, borda `border`, texto `foreground`), não o cinza do shadcn.
- Imports do código vendorizado: relativos com extensão `.js` (o `tsconfig.base` do projeto gerado usa `NodeNext`, ver `root.ts:96-97`), sem alias `@/`; `components.json` com `aliases` coerentes com essa estrutura. Componentes no estilo shadcn new-york atual para React 19 (function components com `data-slot`, sem `forwardRef`), Radix pelo pacote unificado `radix-ui`, animações via `tw-animate-css`.
- Componentes gerados como arquivos reais em `apps/web/src/components/ui/` (template strings no gerador), nunca `npx shadcn add` nem rede durante `new`.
- Cada projeto gerado carrega exatamente 1 preset; os outros 3 não aparecem em nenhum arquivo gerado.
- Preferência claro/escuro é 100% client-side: script inline em `index.html` aplica `.dark` antes do primeiro paint (`localStorage` chave `theme` se válida, senão `prefers-color-scheme`); acesso a `localStorage` em try/catch.
- Versões de dependência novas pinadas exatas (verificar a última estável com `npm view` na implementação), mesmo padrão do `web.ts` atual.
- O harness `pnpm validate:scaffold` (typecheck/lint/format:check/test) passa no projeto gerado.

**Never:**
- Seletor de preset em runtime ou qualquer toggle de tema visível nesta story.
- O prompt de forma de rota (simples/multi-tenant/SaaS) — deferido.
- Qualquer tela do Admin UI (árvore, login, formulários) — stories 7.2+.
- Biblioteca de prompt nova se `node:readline/promises` resolver.

**Decisões do Boss (2026-10-25):**
- Sem TTY e sem `--preset`: default silencioso `minimal-saas`, com uma linha de log informando o preset usado (harness e scripts existentes seguem sem mudança). Em TTY, Enter vazio também escolhe `minimal-saas`.
- Primitivos: vendorizar já na 7.1 o conjunto completo que a Epic 7 vai usar — Button, Input, Label, Dialog, AlertDialog, DropdownMenu, ContextMenu, Select, Skeleton, Table, Checkbox, Tooltip — cada um com ao menos um teste de renderização/acessibilidade básico, pra nenhum entrar sem uso nem teste.
- Spec mantida inteira apesar de exceder 1600 tokens.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Prompt interativo | `new app` em TTY, sem `--preset` | Lista os 4 presets numerados; Enter vazio = default | Resposta inválida → repergunta |
| Flag explícita | `new app --preset acolhedor` | Sem prompt; tokens do `acolhedor` no CSS | N/A |
| Flag inválida | `--preset foo` | Nada é escrito no disco | Erro listando os 4 válidos, exit ≠ 0 |
| Não-TTY sem flag | harness/CI | Usa `minimal-saas` + 1 linha de log com o preset usado | N/A |
| Dark sem FOUC | `localStorage.theme='dark'` ou SO escuro | `<html class="dark">` antes do React montar | `localStorage` indisponível → cai em `prefers-color-scheme` |

</frozen-after-approval>

## Code Map

- `src/cli/index.ts:9-30` -- comando `new`; parsear `--preset` aqui e decidir prompt (`process.stdin.isTTY`); hoje chama `runNew(targetDir, projectName)` sem opções.
- `src/cli/commands/new.ts:56-74` (chamada a `writeSeed` em ~L105) -- `RunNewOptions` (DI p/ testes) e `runNew`; mudar a assinatura de `writeSeed` em `RunNewOptions`; validar preset ANTES de `writeSeed` (nada no disco se inválido); passar adiante.
- `src/scaffolding/write-structural-seed.ts:31-43` -- `writeStructuralSeed` chama `buildWebFiles(projectName)`; recebe e repassa `preset`.
- `src/scaffolding/templates/web.ts` -- `buildWebFiles(projectName): Record<string,string>` (JSON via `JSON.stringify(...,2)+'\n'`, código como array de linhas `.join('\n')`). Hoje: package.json (sem script test), vitest.config.ts reexportando `../../vitest.shared.js`, vite.config.ts, index.html, main.tsx, routes/home*, trpc/client.ts.
- `src/scaffolding/templates/root.ts` -- `vitest.shared.ts` (L300-312, include só `src/**/*.test.ts` — web precisa override para `.tsx` + `environment: 'jsdom'` + `setupFiles`); `eslint.config.js` (`allowDefaultProject` L133-141 e `disableTypeChecked` L151-159 — novo `vitest.setup.ts` entra nas duas listas; override de teste L226 só casa `*.test.ts`, estender a `.tsx`); `pnpm-workspace.yaml` (L36-74, `onlyBuiltDependencies`/`allowBuilds` — incluir `@tailwindcss/oxide` se exigir build).
- `src/scaffolding/write-structural-seed.test.ts:22-128` -- lista esperada de arquivos gerados (web em L40-48) + asserts de conteúdo; atualizar.
- `src/cli/index.test.ts:38-48`, `src/cli/commands/new.test.ts:17` -- asserts de chamada de `runNew`/`writeSeed`; atualizar para o novo parâmetro.
- `scripts/validate-scaffold.ts` -- harness da Story 5.9 (roda `node bin/aether-admin.js new <nome>` sem TTY, cai no default `minimal-saas`); `parseArgs` em ~L319 não tem `--preset` — adicionar repasse obrigatório para validar os 4 presets.
- `_bmad-output/planning-artifacts/ux-designs/ux-Aether-2026-10-07/DESIGN-{minimal-saas,acolhedor,tecnico-premium,autoral}.md` -- fonte dos valores: `colors` (com `-dark`), `rounded` (escalas diferentes por preset: acolhedor vai até `2xl`, tecnico-premium só até `lg`), famílias `body`/`heading`/`mono`, `components.button-secondary`. Demais tokens de componente/spacing nomeado ficam para as stories que os usam.
- `src/scaffolding/templates/root.ts:96-97` -- `tsconfig.base` com `module`/`moduleResolution: NodeNext`; o código web existente usa imports relativos `.js` (ex. `'./routes/home-page.js'`).

## Tasks & Acceptance

**Execution:**
- [ ] `src/scaffolding/presets/` -- novo: `PRESET_IDS`, tipo `PresetId`, um módulo por preset com cores claro/escuro (referências já resolvidas), radius e fontes; `renderThemeCss(preset)` gera o bloco `:root{...}` / `.dark{...}` + `@theme inline` -- dados de design versionados no gerador, 1 preset por projeto.
- [ ] `src/scaffolding/presets/presets.test.ts` -- todos os 4 presets têm o conjunto completo de tokens canônicos + success nos dois modos, todos OKLCH; CSS gerado de um preset não contém valores de outro.
- [ ] `src/cli/index.ts` + `src/cli/commands/new.ts` -- argumentos via `node:util` `parseArgs` (aceita `--preset x` e `--preset=x` em qualquer posição; hoje `const [projectName] = rest` em index.ts:10 pegaria a flag como nome); `isTTY` e a função de prompt injetados em `main` (DI, como `RunNewOptions`) para os testes nunca bloquearem num terminal real; prompt `node:readline/promises` tratando EOF/Ctrl+C (aborta sem escrever nada); validação antes de escrever; default `minimal-saas` sem TTY; testes cobrindo a matriz de I/O.
- [ ] `scripts/validate-scaffold.ts` (+ teste) -- aceitar `--preset <id>` e repassar ao `new`.
- [ ] `src/scaffolding/write-structural-seed.ts` -- repassar `preset` para `buildWebFiles`.
- [ ] `src/scaffolding/templates/web.ts` -- adicionar: deps Tailwind v4 (`tailwindcss`, `@tailwindcss/vite`), `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `radix-ui`, `tw-animate-css`; devDeps `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`; script `test`; plugin Tailwind no vite.config; `src/index.css` (`@import "tailwindcss"`, variante `dark` por classe, tema do preset); `components.json` (style new-york, base radix, cssVariables); `src/lib/utils.ts` (`cn`); os 12 primitivos em `src/components/ui/` (código shadcn new-york atual, Radix) com um `*.test.tsx` co-localizado cada; script anti-FOUC no `index.html`; import do CSS no `main.tsx`; `HomePage` usando `Button`; vitest.config com jsdom, include `src/**/*.test.{ts,tsx}` e setupFiles; `src/test/setup.ts` (dentro de `src`, pra os tipos do jest-dom chegarem ao `tsc`) com `@testing-library/jest-dom/vitest`, `afterEach(cleanup)` (não há `globals: true`) e polyfills jsdom para Radix (`hasPointerCapture`/`releasePointerCapture`, `scrollIntoView`, `ResizeObserver`); `.dark` com `color-scheme: dark`; `TESTING.md` documentando a convenção (sempre `await user.*`, por causa de `no-floating-promises`; o script inline anti-FOUC vai precisar de hash se um CSP for adotado no futuro). Considerar dividir os primitivos num módulo de template próprio (ex. `templates/web-ui.ts`) se `web.ts` crescer demais.
- [ ] `src/scaffolding/templates/root.ts` -- eslint: override de teste (L226) passa a `**/*.test.{ts,tsx}`; código vendorizado precisa passar no config tipado (ajustar o código; override escopado a `apps/web/src/components/ui/**` só para regra estilística comprovadamente incompatível, justificado no Implementation Notes); novos arquivos de config em `allowDefaultProject`/`disableTypeChecked` se ficarem fora do tsconfig. pnpm-workspace: `@tailwindcss/oxide` (e qualquer outro postinstall novo, ex. `lightningcss`) em `onlyBuiltDependencies` E `allowBuilds`, confirmado por install real; versões pinadas respeitando o `minimumReleaseAge` do pnpm 11.
- [ ] `src/scaffolding/write-structural-seed.test.ts` -- novos arquivos na lista + asserts (preset embutido, `.dark` presente, sem tokens de outro preset, script anti-FOUC aparece no `<head>` antes do `<script type="module">`).

**Acceptance Criteria:**
- Given um projeto gerado com qualquer um dos 4 presets, when `pnpm validate:scaffold` roda, then typecheck, lint, format:check e test passam (incluindo os testes dos 12 primitivos).
- Given o projeto gerado, when inspecionado, then os primitivos estão em `apps/web/src/components/ui/*.tsx` como código-fonte e nenhum vem de pacote shadcn.
- Given o app gerado rodando com `.dark` aplicado, when o `Button` renderiza, then usa as cores `-dark` do preset sem flash da variante clara.
- Given o projeto gerado, when um dev lê `apps/web/TESTING.md`, then encontra a convenção (local dos testes, comando, Testing Library, exemplo).

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Tailwind v4 CSS-first: tokens em `:root`/`.dark` como custom properties e expostos ao Tailwind via `@theme inline { --color-primary: var(--primary); ... }`; dark por classe com `@custom-variant dark (&:where(.dark, .dark *));`. Anti-FOUC no `<head>` antes de qualquer CSS/JS:

```html
<script>try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}</script>
```

## Verification

**Commands:**
- `pnpm test` / `pnpm typecheck` / `pnpm lint` / `pnpm format:check` (repo do gerador) -- expected: tudo verde.
- `pnpm validate:scaffold -- --preset <id>` para cada um dos 4 presets -- expected: os 4 passos do projeto gerado passam nos 4.

**Manual checks (if no CLI):**
- `pnpm dev` no projeto gerado: Button com cores do preset; com SO/`localStorage` escuro, página já abre escura, sem flash.
