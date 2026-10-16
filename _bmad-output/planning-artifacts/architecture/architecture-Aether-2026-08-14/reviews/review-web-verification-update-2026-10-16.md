---
name: 'Review — Verificação Web da Update 2026-10-16 (AD-13 + Stack)'
type: review
target: '_bmad-output/planning-artifacts/architecture/architecture-Aether-2026-08-14/ARCHITECTURE-SPINE.md'
reviewed_on: '2026-10-16'
reviewer: 'Claude (checagem de realidade via web search)'
scope: 'AD-13 e as linhas da tabela Stack adicionadas/alteradas na sessão de Update de 2026-10-15/16: Tailwind CSS v4.x, shadcn/ui, @tanstack/react-table 9.x, @tanstack/react-virtual 3.14.x, react-hook-form 7.90.x + @hookform/resolvers 5.9.x. Checagem secundária, mais leve, do resto da tabela Stack.'
---

# Revisão: verificação web da Update 2026-10-16

## Veredito

Os números de versão citados em AD-13 e na tabela Stack **batem com o que existe hoje no npm** (checado em 2026-10-16) — não há tecnologia inventada, descontinuada ou substituída por um sucessor que a spine deveria ter adotado. O ponto real de risco não é "versão errada", é **@tanstack/react-table 9.x**: a v9 é uma reescrita de API que foi GA há só ~10 semanas quando a AD-13 foi decidida, e nem a spine nem (mais importante) o conhecimento de treino de qualquer agente de IA que for implementar essa integração reflete a API nova — ver Achado 1. Os outros quatro itens revisados estão bem fundamentados; um (shadcn/ui) tem uma lacuna de análise, não de fato.

## Metodologia

Pesquisas web feitas nesta sessão (2026-10-16), sem depender de dado de treino para nenhuma afirmação abaixo:
- `tailwindcss` no npm (versão/changelog)
- `shadcn/ui` CLI v4, changelog 2026-03 e updates set/out-2026
- `@tanstack/react-table` no npm + anúncio oficial de v9 GA + guia de migração v8→v9
- `@tanstack/react-virtual` no npm
- `react-hook-form` e `@hookform/resolvers` no npm
- Status de compatibilidade shadcn Data Table × TanStack Table v9 (issue #11389 do repo `shadcn-ui/ui`)
- Checagem secundária: Node.js 24, Vite 8, ESLint 10, Zod 4.x, `@trpc/server`, pnpm 11, React 19/20, TypeScript 7.0, Fastify 5/6, Prisma 7/8

## Achados — AD-13 / Stack (foco principal)

### 1. [MÉDIO] `@tanstack/react-table` 9.x — versão correta, mas é uma API nova de ~10 semanas; risco real é a lacuna entre essa API e o que qualquer agente de IA vai gerar por padrão

**Confirmado:** TanStack Table v9 foi anunciada **estável/GA em 2026-08-04** (anúncio oficial `@tan_stack`, cobertura InfoQ/daily.dev). O pacote `@tanstack/react-table` no npm hoje é `9.3.1`. A AD-13 foi decidida em 2026-10-15 — ou seja, ~10 semanas depois do GA. **A versão pinada (`9.x`) está correta e não é prematura** — não é um caso de "pegou uma beta por engano": v8 (8.21.3) é a série anterior, já substituída.

A descrição da spine — "arquitetura opt-in por feature" — também **bate** com a arquitetura real de v9 (plugin architecture tree-shakable, com `tableFeatures()`/registro explícito de features, em vez do bundle único de v8). Isso não está desatualizado.

**O que a spine NÃO registra, e deveria:** v9 trocou a API de ponta a ponta — `useReactTable` → `useTable`, `flexRender` virou componente, `get*RowModel()` → `create*RowModel()` registrado via features, renomeações em sorting (`sortingFn`→`sortFn`) e column pinning (`columnPinning.left/right`→`start/end`), e métodos de instância agora *não podem* ser desestruturados (são compartilhados em prototype, não bound por instância). Praticamente todo tutorial, exemplo de StackOverflow e trecho de código já visto em treino de qualquer LLM — inclusive o modelo que vai implementar a Epic do Admin UI — é v8. **O risco concreto:** uma sessão `generate module`/`bmad-dev-story` que escrever a tabela "de memória" (sem checar a doc atual) vai, com alta probabilidade, produzir `useReactTable` e `get*RowModel()` — código que **não roda** em v9.3.1, não é um bug sutil, é erro de import/tipo na cara. Isso não invalida a decisão de versão, mas é um risco de implementação que a spine deveria nomear explicitamente (ex.: uma nota tipo as já usadas para EdDSA→HS256/Module-Tenant, instruindo a story de implementação a consultar `tanstack.com/table/latest/docs/.../migrating` antes de escrever código, não assumir a API de v8).

A boa notícia (checada também): a própria doc oficial do shadcn/ui Data Table **já migrou para v9** em agosto de 2026 (havia uma issue de rastreamento de compatibilidade, `shadcn-ui/ui#11389`, resolvida). Então a combinação "TanStack Table v9 + primitivos de tabela do shadcn" citada na AD-13 é viável *se* quem implementar usar a doc nova — não se usar qualquer tutorial de 2024-2025 que apareça numa busca.

**Recomendação:** adicionar uma nota breve na AD-13 (ou na story de implementação da tabela) avisando que a API de v9 é incompatível com v8 e que a referência correta é a doc atual do TanStack Table + o exemplo oficial shadcn "Data Table" (pós-agosto/2026), não memória de treino nem tutoriais antigos.

### 2. [BAIXO/informativo] shadcn/ui — versão/mecanismo corretos, mas a spine não avaliou o preset nativo do próprio shadcn antes de desenhar o seu

**Confirmado:** shadcn CLI v4 (lançado 2026-03) já tem um mecanismo de **preset nativo** — `shadcn init --preset <código>`/`shadcn/create` — que empacota cor, tema, ícones, fontes e radius num único código, com templates de projeto prontos (incluindo Vite + React Router) e **dark mode incluído por padrão** nesses templates. Isso é exatamente a mesma ideia que a AD-13 está reimplementando por fora ("N presets visuais completos... clara e escura... escolhido em tempo de geração").

Isso não torna a AD-13 errada — pode ser desejo deliberado do Boss ter 4 presets curados e específicos do Aether em vez dos presets genéricos/comunitários do shadcn — mas a spine não registra que essa opção nativa existe nem por que foi preterida (se foi). Não há evidência de que a decisão tenha sido tomada *contra* esse dado; parece que simplesmente não foi levantado.

**Recomendação:** registrar em uma frase na AD-13 (ou no companion UX) se os 4 presets do Aether usam o mecanismo `--preset` do shadcn como transporte/implementação, ou se é scaffolding próprio do `aether-admin new` por cima dos componentes — hoje a Rule não deixa isso explícito, e isso é exatamente o tipo de ambiguidade que a própria AD-13 diz querer evitar ("preset virando seletor em runtime" etc. já é coberto, mas "preset nativo do shadcn vs. preset próprio do Aether" não é).

### 3. [Confirmado, sem ação] `@tanstack/react-virtual` 3.14.x

Versão atual no npm: `3.14.18` (publicada poucas horas antes desta checagem). Série v3 estável, sem sinal de v4 em desenvolvimento que mude a API. Pin da spine está correto e atual.

### 4. [Confirmado, sem ação] `react-hook-form` 7.90.x + `@hookform/resolvers` 5.9.x

`react-hook-form` atual: `7.90.0` (publicada ~4 dias antes desta checagem). `@hookform/resolvers` atual: `5.9.1` (publicada 2026-08-17). Os dois pins batem exatamente com o que existe hoje.

A nota de reconciliação da spine (troca de TanStack Form por React Hook Form, "ordens de magnitude mais downloads... padrão do ano") também se sustenta: RHF 8 existe só como `8.0.0-beta.4` (não GA) — ou seja, ficar em 7.90.x em vez de saltar para a próxima major é a escolha certa agora, não uma omissão.

### 5. [Confirmado, sem ação] Tailwind CSS v4.x

Versão atual no npm: `4.3.3`. Ainda é a série v4 (CSS-first via `@theme`, OKLCH) — sem v5 em GA que tornasse o pin desatualizado. Pin correto.

## Achados secundários — resto da tabela Stack (checagem mais leve, fora do foco principal pedido)

Estes não foram alterados na sessão de 2026-10-15/16, mas como a instrução pediu para verificar "toda decisão committada", um check rápido:

- **Node.js 24 "(Active LTS)"** — [BAIXO, vida curta] Confirmado que hoje (2026-10-16) ainda é Active LTS, **mas** entra em Maintenance LTS em **2026-10-20** (4 dias depois desta revisão), quando Node 26 assume Active LTS (2026-10-28). O rótulo "(Active LTS)" ficará literalmente desatualizado dentro de poucos dias. Não é urgente trocar a versão pinada (Node 24 continua recebendo correções críticas/segurança até 2028-04-30), mas o rótulo entre parênteses vai precisar de ajuste na próxima revisão da spine.
- **TypeScript 5.9 / adiamento do TS 7.0** — Confirmado com precisão: TS 7.0 GA foi realmente em 2026-07-08, e o bloqueio citado (`typescript-eslint` sem suporte à API nativa do compilador Go) é real e documentado (issue aberta no mesmo dia do GA). Essa linha da spine está corretamente pesquisada, não é uma suposição de treino.
- **React 19.x** — Confirmado atual (`19.3.1`); não existe React 20 em GA, só RFCs/discussão. Pin correto.
- **React Router ^7 (v8 adiado)** — Confirmado: React Router v8 teve GA em 2026-06-17 (build ESM-only, middleware habilitado por padrão — mudanças que justificam adiar). A própria spine já registra a existência do v8 e o motivo do adiamento — item já bem tratado, nenhuma ação necessária.
- **Fastify 5.x** — Confirmado atual (`5.12.7`); Fastify 6 só em alpha. Pin correto.
- **`@trpc/server`/`@trpc/client` 11.13.x** — Linha 11.x confirmada como a atual (última publicada: `11.19.0`); 11.13.x está um pouco atrás em minors mas dentro da mesma major sem breaking change documentado — não é uma versão errada, só não é a última patch/minor.
- **Zod 4.4.x** — [BAIXO] Atual no npm é `4.6.6` — 4.4.x está vários minors atrás. Não encontrei breaking change confirmado entre 4.4→4.6 nesta sessão (não foi verificado a fundo, pois estava fora do foco pedido); vale uma checagem rápida antes de tratar 4.4.x como definitivo, já que "4.4.x" como pin fixo (em vez de "4.x" como as outras linhas da tabela) sugere que foi escolhido por um motivo específico que não está documentado na spine.
- **pnpm 11.x** — Confirmado atual (`11.28.5`, lançado 2026-04-28 como major). Pin correto.
- **ESLint 10.x** — Confirmado com precisão: ESLint 9 chegou a EOL em **2026-08-06**, exatamente a data que a spine cita. Pesquisado corretamente, não é suposição.
- **Prisma 7.x** — [INFORMATIVO] Prisma ORM 8 está em release candidate com GA **"esperado para outubro de 2026"** — ou seja, pode coincidir com o mês desta revisão. Isso não invalida o pin (7.x segue recebendo correções por 18 meses após o GA do 8), mas é um sinal para a próxima revisão de spine: confirmar se o Prisma 8 já saiu e se algo nele afeta a AD-5 (driver adapters, Client Extension de tenant).

## O que não foi verificado (lacunas desta revisão)

- Não foi checado se existe breaking change real entre Zod 4.4.x e a atual 4.6.6 (fora do foco principal pedido).
- Não foi feita checagem equivalente para Vitest, Prettier, `argon2`, `jose`, Pino, Vite 8.x — mantidos como estavam, sem sinal de alerta encontrado nas buscas feitas, mas também sem busca dedicada a cada um.
- Não foi avaliado o conteúdo dos `DESIGN.md` da sessão `ux-Aether-2026-10-07` (os 4 presets citados na AD-13) — a revisão cobriu só a camada de tecnologia/versão, não o conteúdo de design em si.
