---
baseline_commit: d5f302656c9832edaa971c1c9f10796a49d01170
context: [_bmad-output/implementation-artifacts/3-1-identity-tree-enforcement.md, _bmad-output/implementation-artifacts/5-4-roles-crud-backend.md, _bmad-output/implementation-artifacts/5-5-role-assignments-backend.md, _bmad-output/implementation-artifacts/5-6-group-membership-backend.md]
---

# Story 5.7: Gestão de Resources de um Papel (associar/desassociar)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como administrador de um Tenant,
eu quero associar e desassociar Resources de um Papel, e listar os Resources de um Papel específico,
para que a Epic 5 complete a organização de Papéis (FR-14) — a Story 5.4 entregou o CRUD do Papel em si, mas deliberadamente deixou de fora QUAIS Resources ele agrega (ver Dev Notes da 5.4, "fica pra uma story futura própria"), e esta é essa story — o espelho exato da Story 5.6 (gestão de membros de Grupo), mas pra Papel↔Resource em vez de Grupo↔Usuário.

## Acceptance Criteria

1. Três novas procedures dentro da sub-router JÁ EXISTENTE `adminRouter.roles` (Story 5.4) — `addResource`/`removeResource`/`listResources` — NÃO uma sub-router nova. Todas protegidas por `requireAdmin` (reaproveitado sem modificação).
2. `roles.addResource` — recebe `{ roleId, resourceId }`, confirma que `roleId` pertence ao próprio Tenant do admin (`NOT_FOUND` — mesmo padrão `update()`+`try/catch` de `groups.addMember`, Story 5.6, nunca `updateMany`) E que `resourceId` EXISTE (`Resource` é GLOBAL, Story 3.1 — nenhuma checagem de tenant faz sentido pra ele, só existência, mesmo padrão de `roleAssignments.create`'s `targetModuleId`, Story 5.5). Conecta via a relação M2M implícita (`_ResourceToRole`, já existente desde a Story 3.1). Chamar de novo pro MESMO par é IDEMPOTENTE (verificado contra Postgres real, não assumido — mesmo achado da Story 5.6).
3. `roles.removeResource` — mesma validação, desconecta. Idempotente pra quem não está associado.
4. `roles.listResources` — recebe `{ roleId }`, confirma que o Papel pertence ao tenant, retorna os `Resource`s associados (`{ id, name, kind }` — `Resource.moduleId` fica de fora do output por padrão; Dev Notes decide se vale incluir).
5. `pnpm typecheck`/`lint`/`format:check`/`test` passam limpos no projeto GERADO. Validado de ponta a ponta contra Postgres real (mesma disciplina desde a 3.1): associa um Resource real a um Papel real via `addResource`, confirma via `listResources`, remove via `removeResource`, confirma lista vazia — tudo via chamada HTTP real.

## Tasks / Subtasks

- [x] Task 1: Schema Zod compartilhado (AC: #2, #3, #4)
  - [x] 1.1 `packages/shared/src/schemas/admin.ts`: `addRoleResourceInputSchema`/`removeRoleResourceInputSchema` (`{ roleId: z.string().min(1), resourceId: z.string().min(1) }`, dois `const` distintos — mesma decisão de design já tomada em `addGroupMemberInputSchema`/`removeGroupMemberInputSchema`, Story 5.6), `listRoleResourcesInputSchema` (`{ roleId: z.string().min(1) }`), `listRoleResourcesOutputSchema` (`z.array(z.object({ id: z.string(), name: z.string(), kind: z.enum(['NAMED_PERMISSION', 'BUSINESS_OBJECT']) }))` — `kind` é o enum `ResourceKind` já existente desde a Story 3.1).
- [x] Task 2: `addResource`/`removeResource`/`listResources` em `adminRouter.roles` (AC: #1, #2, #3, #4)
  - [x] 2.1 `apps/api/src/core/admin/router.ts`: as 3 novas procedures entram DENTRO do bloco `roles: router({ list, create, update, delete, addResource, removeResource, listResources })` já existente (Story 5.4) — nunca um router novo.
  - [x] 2.2 Fatorado DESDE O PRIMEIRO RASCUNHO (lição da Story 5.6 aplicada, não corrigida depois): `assertResourceExists(resourceId)` (checagem GLOBAL, `prisma.resource.findUnique` cru) e `updateRoleResources(db, roleId, resources)` (`update()`+`try/catch` de `P2025`→`NOT_FOUND`, espelho de `updateGroupMembership` da 5.6). Avaliado generalizar um helper único pelos dois models (Group/Role) — descartado: `db.group.update`/`db.role.update` têm tipos estruturalmente diferentes no Prisma, forçar um genérico exigiria `any`/casts inseguros; duplicar a FORMA entre dois helpers pequenos é aceitável, o que não era aceitável (achado da 5.6) era duplicar a checagem DENTRO do mesmo router.
  - [x] 2.3 `addResource`: `assertResourceExists(input.resourceId)`, depois `updateRoleResources(db, input.roleId, { connect: { id: input.resourceId } })`.
  - [x] 2.4 `removeResource`: mesma validação, `{ disconnect: { id: input.resourceId } }`.
  - [x] 2.5 `listResources`: `forTenant(tenantId).role.findUnique({ where: { id: roleId }, select: { resources: { select: { id: true, name: true, kind: true } } } })` — `NOT_FOUND` se o Papel não existir.
- [x] Task 3: Testes (AC: #2, #3, #4)
  - [x] 3.1 `apps/api/src/core/admin/router.test.ts` (`DATABASE_URL`-gated): 3 testes `FORBIDDEN` separados (nunca combinado).
  - [x] 3.2 `addResource` conecta de verdade (confirma via `listResources`).
  - [x] 3.3 Confirmado empiricamente contra Postgres real: `addResource` chamado duas vezes pro MESMO par é idempotente.
  - [x] 3.4 `removeResource` desconecta de verdade; chamar pra quem não está associado também não lança erro (idempotente, confirmado contra Postgres real).
  - [x] 3.5 `listResources` retorna só os Resources DAQUELE Papel (não de outro Papel do mesmo tenant).
  - [x] 3.6 `roleId` de outro tenant E inexistente → `NOT_FOUND` uniforme nas 3 procedures, cada caso isolado com o OUTRO lado válido desde o primeiro rascunho. `resourceId` inexistente → `NOT_FOUND` em `addResource`/`removeResource` (só UM caso — `Resource` é global).
- [x] Task 4: Validação real de ponta a ponta (AC: #5)
  - [x] 4.1 Projeto gerado + migrations já existentes aplicadas contra Postgres real (Laboratório Integrit) — nenhuma migration nova nesta story (`_ResourceToRole` já existe desde a Story 3.1).
  - [x] 4.2 Script de probe: login admin; `addResource` associando um Resource real a um Role real via HTTP real; `listResources` confirma; `removeResource` desconecta; `listResources` confirma lista vazia.
  - [x] 4.3 `pnpm typecheck`/`lint`/`format:check`/`test` limpos; Debug Log/Completion Notes atualizados.

## Dev Notes

### 🎯 Onde este código realmente vive

Mesmo padrão de sempre: `apps/api/src/core/admin/router.ts`/`packages/shared/src/schemas/admin.ts` já existem desde a Story 5.1 — esta story ESTENDE o bloco `roles:` já existente (Story 5.4) com 3 procedures novas, não cria sub-router nem arquivo novo.

### ⚠️ Escopo explicitamente cortado desta story

- **Nenhuma tela de admin** — mesmo corte de toda a Epic 5.
- **Nenhuma gestão de Resources EM SI** (criar/editar/remover um `Resource`) — `Resource` é criado só por `generate module` (Story 3.2/AD-6); esta story só gerencia a ASSOCIAÇÃO entre um `Resource` já existente e um `Role`, nunca o `Resource` em si.
- **FR-15 (import em lote via CSV)** — ainda não endereçado por nenhuma story; não é bloqueado nem resolvido por esta.
- **Gestão de membros em lote** — mesmo corte já anotado na Story 5.6.

### Arquitetura — o que seguir à risca

- **DIFERENÇA CRÍTICA com a Story 5.6**: `Group`↔`User` são as DUAS entidades do tenant (ambas precisam de checagem de tenant). `Role`↔`Resource` é MISTO — `Role` é do tenant, `Resource` é GLOBAL (Story 3.1, mesmo motivo de `Module` ser global). Isso significa: `roleId` precisa do padrão completo cross-tenant/inexistente (2 casos); `resourceId` só precisa de existência (1 caso, nunca "de outro tenant" — Resource não TEM tenant). Não copiar a Story 5.6 ao pé da letra sem notar essa diferença.
- **`_ResourceToRole` (M2M implícito) é CASCADE nos dois lados** (confirmado na migration real, Story 3.1) — diferente da preocupação de `roles.delete` (Story 5.4, que trata APAGAR o Role em si, bloqueado por `RoleAssignment`/RESTRICT). Esta story nunca apaga nada, só conecta/desconecta a associação — `_ResourceToRole` nunca bloqueia nenhuma operação aqui.
- **`update()` (não `updateMany`) é obrigatório** pra `connect`/`disconnect` aninhado — mesmo achado real já documentado na Story 5.6 (`updateMany` não aceita escrita de relação).
- **Lição da Story 5.6 a aplicar DESDE O INÍCIO, não depois do code review**: o code review da 5.6 encontrou DUAS checagens duplicadas (helper de usuário E o try/catch de P2025) que deveriam ter sido fatoradas desde o primeiro rascunho, mas não foram — só corrigidas no review. Esta story fatora os helpers equivalentes (`assertResourceExists`, e o try/catch de `role.update`) desde o Task 2.2, não espera o code review apontar.
- **`requireAdmin()` reaproveitado literalmente** — nenhuma mudança nele nesta story.
- **Decisão da AC #4 sobre `Resource.moduleId` no output (achado do code review — faltava registrar por escrito)**: `moduleId` fica de fora de `listRoleResourcesOutputSchema` de propósito. Um admin olhando "quais Resources este Papel tem" não precisa saber a qual `Module` cada um pertence pra gerenciar a associação em si — isso é informação de outra tela (a árvore de Módulos/Resources, não a de Papéis). Se uma UI futura precisar mostrar o `Module` de cada Resource agregado, é um `select` adicional nesta mesma query (já traz `resources` via `include`), não uma mudança de design — mas não há AC/FR pedindo isso agora, então fica de fora até que peça.

### Testing Standards

- Mesmo split real já documentado desde a Story 5.1: `adminRouter.*` usa `forTenant` direto — `router.test.ts` continua `DATABASE_URL`-gated.
- 3 testes `FORBIDDEN` separados desde o início.
- **Isolamento de asserção desde o primeiro rascunho** (achado do code review da Story 5.5, que a Story 5.6 aplicou só parcialmente e teve que completar no próprio review dela) — cada teste de `NOT_FOUND` usa um lado VÁLIDO pra isolar de verdade qual checagem dispara o erro.
- Validação real de ponta a ponta contra Postgres (sem Mailpit — esta story não envia email) antes de marcar `done`, mesma disciplina desde a Story 3.1.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] — "administrador... organiza Usuários/Grupos/Papéis" (FR-14).
- [Source: _bmad-output/implementation-artifacts/5-4-roles-crud-backend.md] — "Nenhuma gestão de Resources do Papel... fica pra uma story futura própria" (origem desta story).
- [Source: _bmad-output/implementation-artifacts/5-6-group-membership-backend.md] — padrão `update()`+`try/catch`/idempotência/helpers compartilhados que esta story replica, incluindo as 3 lições do próprio code review dela (fatorar desde o início, isolar asserções, cobrir cross-tenant E inexistente).
- [Source: packages/db/schema.prisma (Story 3.1)] — `Role.resources`/`Resource.roles`, M2M implícito `_ResourceToRole`, `ResourceKind` enum.

### Review Findings

Revisão adversarial de 4 camadas (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, Acceptance Auditor) sobre o diff de 2 arquivos (396 linhas) desta story, com `review_mode: full` contra este spec + contexto de 3-1/5-4/5-5/5-6.

- [x] [Review][Patch] A mensagem de `assertResourceExists` diz "Resource não encontrado." (palavra em inglês) — todas as outras checagens deste arquivo traduzem pra português ("Papel", "Grupo", "Usuário", "Módulo") [src/scaffolding/templates/admin.ts] — corrigido: "Recurso não encontrado.".
- [x] [Review][Patch] A AC #4 pedia explicitamente "`Resource.moduleId` fica de fora do output por padrão; Dev Notes decide se vale incluir" — a decisão nunca foi de fato registrada nos Dev Notes/Completion Notes (o código já faz a coisa certa, omitir `moduleId`, mas o PASSO de decisão que a própria AC exigia nunca aconteceu por escrito) [_bmad-output/implementation-artifacts/5-7-role-resources-backend.md] — corrigido: decisão registrada nos Dev Notes.

**Rejeitados:**
- `false`/baixo — Os 8 testes novos reaproveitam `makeModuleRoleFixture()` mas descartam o `role` que ela já cria (pré-conectado ao `resource`), criando um insert+connect extra descartado por teste: confirmado pelo Edge Case Hunter que isso é inofensivo (`cleanupTenant` já varre o `role` órfão via `tenantId`) — puro custo de eficiência, não um bug; reescrever os 8 testes pra um fixture mais leve não compensa o churn.
- `false` — Faltaria um teste provando que o MESMO Resource global conectado a Papéis de 2 tenants diferentes não cruza dados em `listResources`: não existe esse risco de verdade — a fronteira de tenant em `listResources` é sobre a POSSE do Role (via `forTenant`), nunca sobre exclusividade do Resource (que é deliberadamente global/compartilhado por design, Story 3.1); nenhum caminho de código vaza isso.
- `false`/baixo — Faltaria um teste com `roleId` E `resourceId` inválidos ao mesmo tempo: não exercitaria nenhum branch novo, só confirmaria a ordem sequencial já óbvia lendo o código (`resource` checado antes de `role`).
- `false` — `kind` em `listRoleResourcesOutputSchema` duplica os valores do enum `ResourceKind` do Prisma como uma segunda fonte de verdade: é exatamente o MESMO padrão já usado em TODO Zod schema deste projeto (nenhum deles deriva automaticamente do schema Prisma) — não é uma inconsistência nova desta story.

**Deferido:**
- [x] [Review][Defer] TOCTOU entre `assertResourceExists` e o `connect`/`disconnect` aninhado dentro de `updateRoleResources` — se o `Resource` for deletado nesse intervalo, o erro seria mapeado pra "Papel não encontrado" em vez do motivo real [src/scaffolding/templates/admin.ts] — deferred: mesma classe de risco residual já aceita nas Stories 5.5/5.6; aqui ainda mais fraca na prática, já que nenhuma story até agora implementa exclusão de `Resource` (corte de escopo explícito desta própria story) — o caminho é literalmente inalcançável hoje.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- Validação local (`aether-5-7-validate`, sem `DATABASE_URL`): `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 11 arquivos passaram, 2 skipped (13), 73 testes passaram, 74 skipped (147) — 8 testes novos de gestão de Resources de Papel, todos `DATABASE_URL`-gated.
- Validação real (Laboratório Integrit, `tupa-lab`/`ubt-host01`, container `aether-api`): projeto sincronizado; banco `aether_5_7_validate` dedicado; migrations já existentes (nenhuma nova) aplicadas limpo; Mailpit dedicado. Com `DATABASE_URL` setado: `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 13 arquivos passaram, 147 testes passaram, 0 skipped — os 64 testes de `admin/router.test.ts` (56 anteriores + 8 novos desta story) todos passaram de verdade contra Postgres real, incluindo a confirmação empírica de idempotência de `addResource`/`removeResource`.
- **Nenhum achado real de bug nesta story** — diferente de toda story desde a 5.4, esta é a primeira que rodou limpa de ponta a ponta sem precisar de nenhuma correção depois do primeiro rascunho (nem antes, nem depois do code review). As 3 lições reais das stories anteriores (Prisma `update()` vs `updateMany`, fatorar helpers desde o início, isolar asserções de `NOT_FOUND` com o lado válido) foram todas aplicadas proativamente desde o Task 2.2/3.6, exatamente como os Dev Notes desta story instruíam.
- Script de probe (`apps/api/src/probe-5-7.ts`, descartável, nunca comitado) rodado via `tsx` contra a API real (porta 3017): login admin; `addResource`/`listResources`/`removeResource` via HTTP real, confirmando a associação e a revogação de verdade. Todas as 3 validações passaram; só a limpeza do PRÓPRIO script bateu no mesmo FK de `refresh_tokens` já visto em todo probe anterior desta epic — banco inteiro dropado em vez de depurar a ordem de limpeza do script descartável.
- Cleanup pós-validação: servidor finalizado, banco `aether_5_7_validate` dropado, container `mailpit-5-7-validate` removido, diretório sincronizado `/app-5-7` removido do container, projeto `aether-5-7-validate` e tarball de scratch removidos localmente.
- Re-validação pós-patch do code review (Laboratório Integrit, `tupa-lab`/`ubt-host01`, container `aether-api`): projeto `aether-5-7-review-validate` regerado localmente (147/147 testes, 74 skipped) e sincronizado; banco dedicado `aether_5_7_review` + Mailpit dedicado `mailpit-5-7-review`; migrations existentes aplicadas limpo, nenhuma nova. Com `DATABASE_URL` setado: `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 13 arquivos passaram, 147 testes passaram, 0 skipped — confirma que os dois patches (mensagem de erro de `assertResourceExists` e a decisão de `moduleId` registrada nos Dev Notes) não quebraram nada contra Postgres real. Cleanup pós-validação: banco `aether_5_7_review` dropado, container `mailpit-5-7-review` removido, diretório `/app-5-7-review` removido do container, projeto `aether-5-7-review-validate` removido localmente.

### Completion Notes List

- Todas as 5 ACs satisfeitas e validadas de ponta a ponta contra Postgres real do Laboratório Integrit, não só contra fakes/mocks.
- Esta story é o espelho exato da Story 5.6 (Grupo↔Usuário), mas pra Papel↔Resource — com a diferença arquitetural real documentada nos Dev Notes (Resource é GLOBAL, sem fronteira de tenant; User é do tenant) corretamente refletida no código (1 caso de `NOT_FOUND` pra `resourceId`, 2 casos pra `roleId`).
- Avaliado generalizar `updateGroupMembership`/`updateRoleResources` num helper único pelos dois models — descartado por exigir generics desconfortáveis no Prisma; duplicar a FORMA pequena entre dois helpers foi uma troca aceitável, documentada explicitamente no código e nos Dev Notes.
- Zero migration nova — a tabela `_ResourceToRole` já existia desde a Story 3.1.

### File List

- `src/scaffolding/templates/admin.ts` (M)
- `src/scaffolding/templates/shared.ts` (M)
