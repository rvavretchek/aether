---
baseline_commit: da319f7cc0c1f1dbaa0d9f6406187d9a30321db0
context: [_bmad-output/implementation-artifacts/3-1-identity-tree-enforcement.md, _bmad-output/implementation-artifacts/5-1-admin-users-backend.md, _bmad-output/implementation-artifacts/5-3-groups-crud-backend.md, _bmad-output/implementation-artifacts/5-5-role-assignments-backend.md]
---

# Story 5.6: Gestão de membros de Grupo (adicionar/remover Usuário)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como administrador de um Tenant,
eu quero adicionar e remover Usuários de um Grupo, e listar os membros de um Grupo específico,
para que a Epic 5 complete a organização de Usuários/Grupos (FR-14) — a Story 5.3 entregou o CRUD do Grupo em si, mas deliberadamente deixou de fora a gestão de QUEM pertence a ele (ver Dev Notes da 5.3, "fica pra uma story futura própria").

## Acceptance Criteria

1. Três novas procedures dentro da sub-router JÁ EXISTENTE `adminRouter.groups` (Story 5.3) — `addMember`/`removeMember`/`listMembers` — NÃO uma sub-router nova. Todas protegidas por `requireAdmin` (reaproveitado sem modificação).
2. `groups.addMember` — recebe `{ groupId, userId }`, confirma que AMBOS pertencem ao próprio Tenant do admin (`NOT_FOUND` uniforme — mesmo princípio anti-enumeração de `groups.update`/`roleAssignments.create`), conecta o `User` ao `Group` via a relação M2M implícita (`_GroupToUser`, já existente desde a Story 3.1). Chamar de novo pra um `User` que já é membro é IDEMPOTENTE — nunca lança erro (ver Dev Notes sobre o comportamento real do Prisma aqui, verificado contra Postgres, não assumido).
3. `groups.removeMember` — recebe `{ groupId, userId }`, mesma validação de tenant, desconecta a relação. Chamar pra um `User` que NÃO é membro também é IDEMPOTENTE (nunca lança erro) — desconectar algo que já não existe não é um estado de erro.
4. `groups.listMembers` — recebe `{ groupId }`, confirma que o Grupo pertence ao tenant, retorna os `User`s membros (`{ id, email, isAdmin, createdAt }` — mesmo formato de `users.list`, Story 5.1, nunca `passwordHash`).
5. `pnpm typecheck`/`lint`/`format:check`/`test` passam limpos no projeto GERADO. Validado de ponta a ponta contra Postgres real (mesma disciplina desde a 3.1): adiciona um Usuário real a um Grupo real via `addMember`, confirma via `listMembers`, remove via `removeMember`, confirma que a lista fica vazia — tudo via chamada HTTP real.

## Tasks / Subtasks

- [x] Task 1: Schema Zod compartilhado (AC: #2, #3, #4)
  - [x] 1.1 `packages/shared/src/schemas/admin.ts`: `addGroupMemberInputSchema`/`removeGroupMemberInputSchema` (`{ groupId: z.string().min(1), userId: z.string().min(1) }`, idênticos em forma mas dois `const` distintos — nunca reaproveitar literalmente o mesmo schema pra duas semânticas diferentes, mesmo que a FORMA seja igual hoje), `listGroupMembersInputSchema` (`{ groupId: z.string().min(1) }`), `listGroupMembersOutputSchema` (reaproveita a FORMA de `listUsersOutputSchema`, Story 5.1 — `z.array(z.object({ id, email, isAdmin, createdAt }))`, mas como um `const` próprio, não um re-export — a saída desta procedure é conceitualmente "membros de um Grupo", não "Usuários do tenant", mesmo que a forma dos campos coincida hoje).
- [x] Task 2: `addMember`/`removeMember`/`listMembers` em `adminRouter.groups` (AC: #1, #2, #3, #4)
  - [x] 2.1 `apps/api/src/core/admin/router.ts`: as 3 novas procedures entram DENTRO do bloco `groups: router({ list, create, update, delete, addMember, removeMember, listMembers })` já existente (Story 5.3) — nunca um router novo.
  - [x] 2.2 `addMember`: confirma `user` (`forTenant(tenantId).user.findUnique`) pertence ao tenant — `NOT_FOUND` se faltar. Conecta via `forTenant(tenantId).group.update({ where: { id: groupId }, data: { users: { connect: { id: userId } } } })`. **Refinamento feito durante a implementação**: `update()` (não `updateMany`) é obrigatório aqui — `updateMany` não aceita `connect`/`disconnect` aninhado em `data` (só campos escalares), então `update()` é a única opção; isso significa que um `groupId` cross-tenant/inexistente lança `P2025` (não retorna `count: 0`) — envolvido em `try/catch` mapeando pra `NOT_FOUND`, nunca vaza cru (mesmo estilo estrutural de `isDuplicateEmailError`/`isRoleInUseError`, Story 5.1/5.4, novo helper `isRecordNotFoundError`).
  - [x] 2.3 `removeMember`: mesma validação de `user`, mesmo `update()`+`try/catch`, `data: { users: { disconnect: { id: userId } } } }`.
  - [x] 2.4 `listMembers`: `forTenant(tenantId).group.findUnique({ where: { id: groupId }, select: { users: { select: { id: true, email: true, isAdmin: true, createdAt: true } } } })` — `NOT_FOUND` se o Group em si não existir (findUnique retorna `null` nesse caso, sem precisar de try/catch).
- [x] Task 3: Testes (AC: #2, #3, #4)
  - [x] 3.1 `apps/api/src/core/admin/router.test.ts` (`DATABASE_URL`-gated): 3 testes `FORBIDDEN` separados (`addMember`/`removeMember`/`listMembers` — nunca combinado, lição já aplicada desde a 5.4/5.5).
  - [x] 3.2 `addMember` conecta de verdade (confirma via `groups.listMembers` depois, nunca expõe `passwordHash`).
  - [x] 3.3 **Confirmado empiricamente contra Postgres real**: `addMember` chamado duas vezes pro MESMO par `(groupId, userId)` é idempotente — Prisma's `connect` num M2M implícito não lança erro na segunda chamada (não precisou de `try/catch` extra pra isso; só o P2025 de group/user ausente precisou de tratamento, ver Task 2.2).
  - [x] 3.4 `removeMember` desconecta de verdade; chamar pra um `User` que não é membro não lança erro (idempotente, confirmado contra Postgres real).
  - [x] 3.5 `listMembers` retorna só os membros DAQUELE Grupo (não de outro Grupo do mesmo tenant), nunca `passwordHash`.
  - [x] 3.6 `addMember`/`removeMember`/`listMembers` com `groupId`/`userId` de outro tenant E inexistente → `NOT_FOUND` uniforme, cada checagem (user vs. group) isolada de verdade com o outro lado válido — mesma lição do code review da Story 5.5, aplicada aqui desde o início, não depois de um achado.
- [x] Task 4: Validação real de ponta a ponta (AC: #5)
  - [x] 4.1 Projeto gerado + migrations já existentes aplicadas contra Postgres real (Laboratório Integrit) — nenhuma migration nova nesta story (a tabela `_GroupToUser` já existe desde a Story 3.1).
  - [x] 4.2 Script de probe: login admin; `addMember` associando um User real a um Group real via HTTP real; `listMembers` confirma; `removeMember` desconecta; `listMembers` confirma lista vazia.
  - [x] 4.3 `pnpm typecheck`/`lint`/`format:check`/`test` limpos; Debug Log/Completion Notes atualizados.

## Dev Notes

### 🎯 Onde este código realmente vive

Mesmo padrão de sempre: `apps/api/src/core/admin/router.ts`/`packages/shared/src/schemas/admin.ts` já existem desde a Story 5.1 — esta story ESTENDE o bloco `groups:` já existente (Story 5.3) com 3 procedures novas, não cria sub-router nem arquivo novo.

### ⚠️ Escopo explicitamente cortado desta story

- **Nenhuma tela de admin** — mesmo corte de toda a Epic 5.
- **Nenhuma gestão de MEMBROS em lote** (adicionar/remover vários Usuários de uma vez) — "seleção múltipla" (FR-14) é uma preocupação de UI; o backend expõe uma operação por chamada, uma tela futura decide como agrupar várias chamadas numa interação só.
- **FR-15 (import em lote via CSV)** — ainda não endereçado por nenhuma story; não é bloqueado nem resolvido por esta.
- **Gestão de Resources de um Role** — mesmo corte já anotado na Story 5.4 ("fica pra uma story futura própria"); esta story é só sobre Grupo↔Usuário, não Role↔Resource.

### Arquitetura — o que seguir à risca

- **`_GroupToUser` (M2M implícito) já existe desde a Story 3.1** — zero migration nova. `User.groups`/`Group.users` são os campos de relação já definidos no schema.
- **`forTenant` cobre `update` (`$allModels`)** — `addMember`/`removeMember` usam `group.update(...)` com `connect`/`disconnect` aninhado; a injeção de `tenantId` no `where` externo já garante que o Grupo alvo é do tenant certo. A validação EXTRA do `user` (Task 2.2/2.3) é necessária porque `connect`/`disconnect` por `id` não checa tenant do lado do `User` por conta própria — sem essa checagem, um admin poderia conectar um `User` de OUTRO tenant a um Grupo do próprio tenant, quebrando AD-5 silenciosamente (a FK em si não impede isso — `_GroupToUser` não tem `tenantId` nenhum, é só `(A, B)`).
- **Verificar o comportamento real de `connect`/`disconnect` repetido contra Postgres antes de decidir se precisa de `try/catch`** (Task 3.3) — não assumir idempotência, provar. Mesma disciplina de "efeito real, não suposição" de toda story desde a 4.2.
- **`requireAdmin()`/padrão `NOT_FOUND` uniforme reaproveitados literalmente** (Story 5.1/5.3) — nenhuma mudança neles nesta story.

### Testing Standards

- Mesmo split real já documentado desde a Story 5.1: `adminRouter.*` usa `forTenant` direto — `router.test.ts` continua `DATABASE_URL`-gated.
- 3 testes `FORBIDDEN` separados desde o início (lição da 5.3/5.4/5.5 já aplicada, nunca combinar).
- Validação real de ponta a ponta contra Postgres (sem Mailpit — esta story não envia email) antes de marcar `done`, mesma disciplina desde a Story 3.1.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] — "administrador... organiza Usuários/Grupos/Papéis (seleção múltipla, sem drag-and-drop no MVP)... refletindo na árvore em tempo real" (FR-14).
- [Source: _bmad-output/implementation-artifacts/5-3-groups-crud-backend.md] — "Nenhuma gestão de MEMBROS do Grupo... fica pra uma story futura própria" (origem desta story).
- [Source: _bmad-output/implementation-artifacts/5-5-role-assignments-backend.md] — padrão de validação dupla de tenant (duas entidades, `NOT_FOUND` uniforme) que esta story replica pra Group+User.
- [Source: packages/db/schema.prisma (Story 3.1)] — `Group.users`/`User.groups`, M2M implícito `_GroupToUser`.

### Review Findings

Revisão adversarial de 4 camadas (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, Acceptance Auditor) sobre o diff de 2 arquivos (453 linhas) desta story, com `review_mode: full` contra este spec + contexto de 3-1/5-1/5-3/5-5.

- [x] [Review][Patch] A checagem "User pertence ao tenant" está duplicada palavra-por-palavra entre `addMember` e `removeMember` — exatamente o padrão que o comentário já existente duas seções acima ("Fatorado de list/create, Story 5.5, achado do code review — a checagem estava duplicada") diz pra evitar, mas esta story reintroduziu [src/scaffolding/templates/admin.ts] — corrigido: fatorado em `assertUserInTenant(db, userId)`.
- [x] [Review][Patch] O bloco `try/catch` de `P2025`→`NOT_FOUND` em torno de `db.group.update(...)` também está duplicado entre `addMember`/`removeMember`, só a linha `connect`/`disconnect` muda [src/scaffolding/templates/admin.ts] — corrigido: fatorado em `updateGroupMembership(db, groupId, users)`.
- [x] [Review][Patch] O teste de cross-tenant cobre as 4 variações (group/user × cross-tenant/inexistente) pra `addMember`, mas só 2 de 4 pra `removeMember` (faltam as variações "inexistente") e só 1 pra `listMembers` (falta "groupId inexistente") — o próprio Task 3.6 desta story pede "de outro tenant E inexistente" pras 3 procedures, mesmo padrão já estabelecido em `groups.update`/`groups.delete` (Story 5.3) e `roles.update`/`roles.delete` (Story 5.4) [src/scaffolding/templates/admin.ts] — corrigido: as 2 variações faltantes de `removeMember` + a 1 de `listMembers` adicionadas.

**Rejeitados:**
- `false` — `listMembers` não garante ordem determinística (`orderBy`): nenhum outro endpoint de listagem da Epic 5 (`users.list`/`groups.list`/`roles.list`) garante ordem nenhuma — não é uma omissão nova desta story, é o mesmo padrão já aceito em toda a epic.
- `false` — `addMember`/`removeMember` deveriam ter `.output(z.void())`: nenhuma outra mutation sem retorno deste arquivo tem (`users.create`/`update`, `groups.create`/`update`/`delete`, `roles.create`/`update`/`delete`, `roleAssignments.create`/`delete`) — mesmo padrão já estabelecido, não uma lacuna nova.
- `false` — Falta teste de ordenação/paginação de `listMembers` com múltiplos membros: não há garantia de ordenação/paginação em NENHUM endpoint de listagem da epic pra testar — ponto moot.
- `false` — `addGroupMemberInputSchema`/`removeGroupMemberInputSchema` são estruturalmente idênticos, deveriam compartilhar uma base: é uma decisão de design JÁ deliberada e documentada no próprio comentário/Task 1.1 ("idênticos em forma mas dois `const` distintos... nunca reaproveitar literalmente"), não um descuido.

**Deferido:**
- [x] [Review][Defer] TOCTOU entre a checagem de existência do `User` e o `connect`/`disconnect` aninhado dentro de `group.update()` — se o `User` for deletado nesse intervalo, o `P2025` do `connect`/`disconnect` seria mapeado pra "Grupo não encontrado" (mensagem errada, já que o grupo existe — o usuário é que desapareceu) [src/scaffolding/templates/admin.ts] — deferred: mesma classe de risco residual já aceita em outras stories (ex.: Story 3.2 `migrate.ts`, Story 5.5) — ferramenta de uso interativo por um único admin, janela de corrida exige uma segunda request concorrente no exato intervalo.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- **Achado real capturado ANTES de rodar qualquer teste, só pela leitura do próprio código**: a primeira versão de `addMember`/`removeMember` usava `db.group.updateMany({ data: { users: { connect/disconnect: ... } } } })` — Prisma `updateMany` NÃO aceita escrita de relação aninhada (`connect`/`disconnect`), só campos escalares. Corrigido pra `update()` + `try/catch` mapeando `P2025` pra `NOT_FOUND` (novo helper `isRecordNotFoundError`, mesmo estilo de `isDuplicateEmailError`/`isRoleInUseError`) antes mesmo de rodar `tsc --build` — mas ainda assim documentado aqui porque é exatamente o tipo de erro que `tsc --build` teria pego de qualquer forma (prova de que ler o próprio código com atenção antes de validar economiza um ciclo).
- **Achado de isolamento de teste corrigido ANTES do code review, não depois**: a primeira versão do teste de cross-tenant confundia a checagem de `user`/`group` usando os dois lados inválidos na mesma chamada (exatamente o erro que o code review da Story 5.5 pegou). Reescrito desde o início usando um lado VÁLIDO em cada asserção, isolando de verdade qual checagem dispara o `NOT_FOUND`.
- Validação local (`aether-5-6-validate`, sem `DATABASE_URL`): `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 11 arquivos passaram, 2 skipped (13), 73 testes passaram, 66 skipped (139) — 8 testes novos de gestão de membros de Grupo, todos `DATABASE_URL`-gated.
- Validação real (Laboratório Integrit, `tupa-lab`/`ubt-host01`, container `aether-api`): projeto sincronizado; banco `aether_5_6_validate` dedicado; migrations já existentes (nenhuma nova) aplicadas limpo; Mailpit dedicado. Com `DATABASE_URL` setado: `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 13 arquivos passaram, 139 testes passaram, 0 skipped — os 56 testes de `admin/router.test.ts` (48 anteriores + 8 novos desta story) todos passaram de verdade, incluindo a confirmação empírica (Task 3.3) de que `addMember` chamado duas vezes é idempotente contra Postgres real.
- Script de probe (`apps/api/src/probe-5-6.ts`, descartável, nunca comitado) rodado via `tsx` contra a API real (porta 3016): login admin; `addMember`/`listMembers`/`removeMember` via HTTP real, confirmando a associação e a revogação de verdade. Todas as 3 validações passaram; só a limpeza do PRÓPRIO script bateu no mesmo FK de `refresh_tokens` já visto em todo probe anterior desta epic — banco inteiro dropado em vez de depurar a ordem de limpeza do script descartável.
- Cleanup pós-validação: servidor finalizado, banco `aether_5_6_validate` dropado, container `mailpit-5-6-validate` removido, diretório sincronizado `/app-5-6` removido do container, projeto `aether-5-6-validate` e tarball de scratch removidos localmente.
- Code review (4 camadas) aplicado + revalidado: 3 patches corrigidos — a checagem de `User` e o `try/catch` de `P2025` estavam duplicados palavra-por-palavra entre `addMember`/`removeMember` (fatorados em `assertUserInTenant`/`updateGroupMembership`), e o teste de cross-tenant cobria só 2 de 4 variações pra `removeMember` e 1 de 2 pra `listMembers` (completadas). Projeto regenerado localmente e revalidado no Laboratório: 139 testes, 0 skipped, 100% verde nos dois.

### Completion Notes List

- Todas as 5 ACs satisfeitas e validadas de ponta a ponta contra Postgres real do Laboratório Integrit, não só contra fakes/mocks.
- Esta story aplicou PROATIVAMENTE a lição de isolamento de asserção da Story 5.5 desde o primeiro rascunho (não corrigida depois) — mas o code review ainda achou uma lacuna real: a cobertura só foi completa pra `addMember`, `removeMember`/`listMembers` ficaram com menos variações do que o próprio Task 3.6 desta story pedia. E a lição de "fatorar checagem duplicada" (também da 5.5) NÃO foi aplicada no primeiro rascunho — a mesma checagem de `User` apareceu duplicada em `addMember`/`removeMember`, corrigido só no code review. Registrar aqui sem retocar a causa: proatividade em UMA lição não garante proatividade em TODAS; cada lição aprendida precisa ser revisitada individualmente, não assumida como "já internalizada" depois de aplicada uma vez.
- `addMember`/`removeMember` precisaram de `update()` + `try/catch`, não `updateMany()` — primeira vez neste projeto que uma procedure de admin precisa escrever uma relação aninhada (`connect`/`disconnect`), e `updateMany` simplesmente não suporta isso. Este achado FOI pego antes de qualquer validação, só lendo o próprio código.
- Zero migration nova — a tabela `_GroupToUser` já existia desde a Story 3.1.

### File List

- `src/scaffolding/templates/admin.ts` (M)
- `src/scaffolding/templates/shared.ts` (M)
