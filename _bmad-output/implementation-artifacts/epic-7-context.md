# Epic 7 Context: Admin UI — Interface de Administração de Identidade

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Dar ao admin de tenant uma interface real (árvore + painel de detalhe, shadcn/ui) para visualizar, criar, editar e organizar Usuários/Grupos/Papéis, importar Usuários via CSV com prévia e relatório, atribuir Papel com escopo de Módulo e revogar sessões — sem chamadas tRPC manuais nem acesso direto ao Postgres. É a primeira epic de frontend de verdade (Epics 1–6 foram só backend) e a única que torna visível o diferencial do produto (árvore de identidade navegável), por isso é a menos cortável do roadmap. Requisito explícito: a Admin UI precisa ser reaproveitável pelo dev dentro da própria aplicação, montável como sub-rota no layout do app dele, nunca uma página isolada.

## Stories

- Story 7.1: Fundação visual e tema
- Story 7.2: Tela de login e sessão no cliente
- Story 7.3: Árvore de navegação e painel de detalhe
- Story 7.4: CRUD de Usuário, import CSV e revogar sessões
- Story 7.5: CRUD de Grupo/Papel e associação User↔Group
- Story 7.6: Atribuição de Papel com escopo de Módulo
- Story 7.7: Polish final — acessibilidade, i18n e voz

## Requirements & Constraints

- **Frontend-only, sem mudança de contrato de API.** Reaproveita o backend tRPC da Epic 5 (`users`/`groups`/`roles`/`roleAssignments`) sobre o modelo `DirectoryObject` da Epic 6. Única exceção: uma procedure nova só de leitura, `admin.modules.list` (`requireAdmin` + `forTenant`; id/slug/pai/profundidade, árvore inteira de uma vez), puramente aditiva. Nenhuma escrita sobre Módulo é exposta — Módulos nascem só via `generate module`.
- **Lacunas de backend conhecidas:** não existe `users.delete` (remover Usuário fica fora do escopo; Grupo/Papel têm `delete`); não existe `users.listGroups` (derivar no cliente de `groups.list` + `groups.listMembers`); `users/groups/roles.list` não aceitam input — sort/filtro/paginação ficam 100% client-side sobre a lista completa buscada pelo `loader`. Não adicionar paginação de servidor nem procedures novas sem reabrir essas decisões.
- **Segurança:** diálogos de confirmação são proteção de UX, nunca a fronteira de segurança — autorização (`requireAdmin` + escopo de tenant) continua 100% server-side. Usuário autenticado não-admin vê mensagem clara de acesso negado, nunca tela em branco.
- **Auth no cliente:** access token só em memória (nunca `localStorage`/`sessionStorage`); refresh token em cookie `httpOnly`+`SameSite`; usa `auth.login`/`auth.refresh` existentes. Erros de login em RFC 9457 sem revelar se o e-mail existe (inclui rate limit).
- **Import CSV:** limite `MAX_BULK_IMPORT_ROWS` = 500, rejeitado antes de qualquer processamento/prévia; upload via `FormData`/`Blob` como input tRPC, nunca endpoint REST/multipart paralelo.
- **Escala-alvo dev/pequena-equipe:** justifica carregar árvore e listas inteiras de uma vez.
- **Acessibilidade:** WCAG 2.2 AA em toda a superfície; teclado completo; nenhuma ação alcançável só por mouse.
- **i18n:** toda string de UI autorada como chave + interpolação, nunca concatenação/template literal com texto fixo. A biblioteca/formato de chave continua em aberto — exigir só a disciplina de autoria, não escolher lib.
- **Fora do escopo:** camada "Empresas" (admin cross-tenant), o prompt de forma de rota (simples/multi-tenant/SaaS 2 níveis) em `aether-admin new`, seletor de tema em runtime, drag-and-drop, infinite scroll, RTL.

## Technical Decisions

- **Stack de UI:** shadcn/ui + Tailwind CSS v4 (config CSS-first via `@theme`, cores OKLCH) sobre **Radix UI**. Componentes **vendorizados como template strings** em `src/scaffolding/templates/` (o gerador de `apps/web` é `web.ts`) e escritos como arquivos reais no projeto gerado — nunca `npx shadcn add` durante `aether-admin new`, nunca dependência opaca.
- **Presets (Camada 0):** 4 presets completos (`minimal-saas`, `acolhedor`, `tecnico-premium`, `autoral`), cada um com claro + escuro. `aether-admin new` pergunta o preset (único prompt novo da epic) e embute exatamente os tokens de um preset no CSS global. Nomes de token = vocabulário canônico do shadcn (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted`, `--border`, `--ring`, etc.) **+ `--success`/`--success-foreground`**; nunca nomes inventados. Valores OKLCH vêm dos 4 `DESIGN-*.md` (inclui tipografia, `rounded`, spacing nomeado como `sidebar-width` e tokens por componente como `tree-node`, `table-header`, `badge.enabled/disabled`).
- **Dark mode:** classe `.dark` + custom properties, sem FOUC. Preferência claro/escuro é estado 100% client-side (`prefers-color-scheme` + storage do navegador), nunca persistida no backend.
- **Roteamento/dados:** React Router ^7 data router (`createBrowserRouter`), SPA sem SSR. Data fetching via `loader` de rota chamando o client tRPC direto. **Sem TanStack Query e sem TanStack Router.** Admin UI exportada como objeto de rota montável; links sempre relativos ao caminho base (testar montagem sob caminho não padrão).
- **Client tRPC:** estado do access token e lógica de refresh vivem exclusivamente em `apps/web/src/trpc/client.ts` (singleton); 401 dispara um único `auth.refresh` compartilhado por chamadas concorrentes e repete a original; no reload, tenta refresh via cookie antes de redirecionar ao login. `apps/web` só importa `type AppRouter` de `apps/api`, e apenas nesse arquivo.
- **Formulários:** React Hook Form + `@hookform/resolvers/zod`, reaproveitando os schemas de `packages/shared/src/schemas/admin.ts` — formulários desenhados à mão por entidade, nunca gerados de schema em runtime. ARIA de erro (`aria-invalid`/`aria-describedby`/`aria-live`) é wiring manual.
- **Tabelas:** TanStack Table **v9** (API reescrita vs. v8 — consultar a doc atual, não memória de treino), só para listas longas dentro de um ramo e o relatório de import. Estado de sort/filtro/página nos search params da URL, nunca cache próprio. ARIA (`<th scope="col">`, `aria-sort`, `aria-selected`) é wiring manual.
- **Árvores:** TanStack Virtual (3.14.x) só virtualiza renderização; nunca dispara fetch, sem lazy-load por nó.
- **Versões pinadas:** React 19, React Router ^7, Vite 8, TS 5.9, Zod 4.4, tRPC 11.13, react-hook-form 7.90 + resolvers 5.9.
- **Testes:** primeira convenção de teste de frontend (Vitest + Testing Library ou equivalente) é definida e documentada na Story 7.1; testes co-localizados (`*.test.ts(x)` ao lado do fonte).
- **Convenções de código:** identificadores em inglês; arquivos kebab-case, tipos PascalCase, funções camelCase; erros RFC 9457 (`invalid-params[].name` em JSON Pointer).

## UX & Interaction Patterns

- **Superfície única `/admin`**, mestre-detalhe estilo ConsoleOne: árvore lateral persistente com ramos Usuários/Grupos/Papéis (organiza navegação, não implica hierarquia no dado); estado inicial do detalhe "Selecione um item na árvore à esquerda.". A árvore de Módulos (hierarquia real) reaparece como mini-árvore no modal "Atribuir Papel".
- **Árvore:** busca no topo com debounce ~250ms filtra e auto-expande/destaca o nó; ARIA Tree View completo (`aria-expanded`/`aria-level`/`aria-selected`/`aria-posinset`/`aria-setsize`); teclado `↑/↓` foco, `→/←` expandir/colapsar, `Enter` seleciona, `Esc` cancela; menu de contexto por clique direito **ou** `Shift+F10`/tecla de menu, só com ações válidas pro tipo de nó. "Editar" sempre também como botão visível no painel de detalhe. Painel deve sempre refletir a seleção mais recente (ignorar respostas fora de ordem).
- **Associação User↔Group, dois caminhos:** do Usuário (selecionar Grupo + "Adicionar") e do Grupo (seletor de membros navegável por Grupo de origem, multi-seleção, "Adicionar em lote"); duplicados saem da seleção com nota explicativa; "Remover do grupo" simétrico.
- **Atribuir Papel:** modal com `select` de Papel + mini-árvore de Módulos e texto fixo de herança aditiva ("vale para este módulo e todos abaixo dele"); atribuição duplicada vira aviso amigável ("Esta atribuição já existe."); remoção afeta só a linha escolhida; árvore vazia mostra "Nenhum módulo gerado ainda.".
- **Import CSV:** upload → prévia com contagens concretas ("12 válidos, 2 duplicados, 1 inválido") antes de escrever → confirmação importa só válidos → relatório linha a linha (importado/duplicado/erro + motivo). Arquivo malformado/não-CSV recusado antes da prévia.
- **Ações destrutivas:** `dialog` nomeando a consequência ("Revogar as sessões de {nome}? Ele(a) precisará entrar novamente."), nunca "Tem certeza?"; sucesso inline ("Sessões revogadas.") sem sair da tela; revogar a própria conta desloga e redireciona ao login de forma clara. Diálogos abrem com foco no primeiro item e `Esc` devolve foco à origem; cancelar edição não pede confirmação.
- **Estados por superfície:** skeleton no formato do conteúdo (árvore, linhas, seções do detalhe), nunca spinner genérico; ramo vazio "Nenhum {tipo} ainda." (Usuários oferece "Importar Usuários"); busca sem resultado "Nenhum {tipo} encontrado para '{termo}'."; sub-lista vazia mantém a seção e o botão de ação ("Nenhum grupo."); falha de carga = RFC 9457 + "Tentar novamente"; erro de validação inline com foco no campo; falha ao salvar preserva os dados; botões de envio desabilitados enquanto pendentes (sem envio duplo).
- **Botões:** um primário por tela/diálogo; secundário/ghost para Cancelar; variante destrutiva usa `--destructive`. Foco visível via `ring`.
- **Voz:** profissional e direta, levemente cordial ("internal-tool com polimento consumer"); sem emoji, sem tom celebrativo, números concretos.
- **Contraste:** pares de cor load-bearing dos 4 presets (especialmente no escuro) precisam ser verificados e documentados na Story 7.7.

## Cross-Story Dependencies

- Ordem obrigatória: 7.1 (tema, primitivos, convenção de teste) → 7.2 (login/sessão; todas as seguintes pressupõem admin autenticado) → 7.3 (árvore + detalhe + rota montável) → 7.4 / 7.5 / 7.6 (constroem dentro do painel de detalhe da 7.3) → 7.7 (auditoria final de a11y/i18n/voz/contraste em todas as telas).
- 7.4 fixa a convenção de formulário/validação/erro/envio duplo que 7.5 e 7.6 seguem.
- 7.6 é a única story que toca o backend (`admin.modules.list`).
- Depende de Epic 2 (`auth.login`/`auth.refresh`, rate limit), Epic 4 (token de uso único reaproveitado no e-mail de configuração de senha do import), Epic 5 (procedures de admin, `MAX_BULK_IMPORT_ROWS`) e Epic 6 (modelo `DirectoryObject`/`RoleAssignment.subjectId`).
