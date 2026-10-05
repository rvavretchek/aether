---
baseline_commit: 716e946f2a2a3b135e83a2ca017ec0d8ba5f34f5
context: [_bmad-output/implementation-artifacts/3-1-identity-tree-enforcement.md, _bmad-output/implementation-artifacts/5-1-admin-users-backend.md, _bmad-output/implementation-artifacts/5-3-groups-crud-backend.md, _bmad-output/implementation-artifacts/5-4-roles-crud-backend.md]
---

# Story 5.5: Atribuição de Papéis (RoleAssignment) a Usuários/Grupos

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como administrador de um Tenant,
eu quero atribuir e revogar Papéis de Usuários/Grupos sobre um Módulo, e listar as atribuições de um Usuário/Grupo específico,
para que a árvore de identidade (Story 3.1) deixe de ser só um modelo de dados manipulável via Prisma direto nos testes — passe a ter uma via de produto real, fechando o ciclo entre tudo que a Epic 5 construiu (Users/Groups/Roles, Stories 5.1/5.3/5.4) e o enforcement real já existente desde a Epic 3 (`requireResource`, Story 3.1).

## Acceptance Criteria

1. Nova sub-router `adminRouter.roleAssignments` — `list`/`create`/`delete` (SEM `update` — `RoleAssignment` é um registro de concessão imutável; editar significa revogar e criar outra, nunca um `PATCH` em um grant existente). Todas protegidas por `requireAdmin` (Story 5.1, reaproveitado sem modificação).
2. `roleAssignments.create` — recebe um discriminador explícito de quem recebe o Papel: `{ assigneeType: 'user', userId, roleId, targetModuleId }` OU `{ assigneeType: 'group', groupId, roleId, targetModuleId }` (`z.discriminatedUnion`, nunca um objeto com os dois campos opcionais soltos — a CHECK constraint `role_assignments_assignee_check` do banco é defesa-em-profundidade, não a validação primária). Confirma que o `User`/`Group` E o `Role` pertencem ao PRÓPRIO Tenant do admin ANTES de criar — `NOT_FOUND` uniforme (não revela se o id não existe ou é de outro tenant) pra qualquer um dos três. `targetModuleId` é validado só por EXISTÊNCIA (Module é global, Story 3.1 — não tem tenant pra cruzar), também `NOT_FOUND` se não existir.
3. `roleAssignments.list` — recebe `{ assigneeType: 'user', userId }` OU `{ assigneeType: 'group', groupId }` (mesmo discriminador), retorna as atribuições DAQUELE Usuário/Grupo específico (nunca "todas as atribuições do tenant" — corresponde à tela real prevista por FR-14: a página de detalhe de um Usuário/Grupo mostra os Papéis atribuídos a ele). Confirma que o assignee pertence ao próprio tenant do admin (mesmo `NOT_FOUND` uniforme). Cada item inclui `roleId`+`roleName` e `targetModuleId`+`targetModuleSlug` (join com `Role`/`Module` — um admin olhando a lista precisa de nomes, não só UUIDs).
4. `roleAssignments.delete` — remove uma `RoleAssignment` pelo `id`, escopada ao próprio tenant do admin (`forTenant`, `deleteMany` + `count === 0` → `NOT_FOUND` uniforme — mesmo padrão de `groups.delete`/`roles.delete`).
5. Nenhuma checagem de duplicidade — o schema não tem `@@unique` sobre `(tenantId, userId/groupId, roleId, targetModuleId)` (confirmado no schema da Story 3.1), então duas atribuições idênticas são permitidas (redundantes, não um erro) — não inventar uma regra de negócio que não existe em nenhuma AC/FR.
6. `pnpm typecheck`/`lint`/`format:check`/`test` passam limpos no projeto GERADO. Validado de ponta a ponta contra Postgres real (mesma disciplina desde a 3.1) — **o teste mais importante desta story, nunca feito antes em nenhuma story da Epic 5**: cria uma `RoleAssignment` de verdade via `roleAssignments.create` (não via Prisma direto, como todo teste de `requireResource` desde a Story 3.1 sempre fez) e confirma que o middleware `requireResource` (Story 3.1) REALMENTE concede acesso por causa dela — fecha o ciclo entre o backend de admin (Epic 5) e o enforcement real (Epic 3), que nunca tinham sido exercitados juntos até agora.

## Tasks / Subtasks

- [x] Task 1: Schema Zod compartilhado (AC: #2, #3, #4)
  - [x] 1.1 `packages/shared/src/schemas/admin.ts`: `createRoleAssignmentInputSchema` (`z.discriminatedUnion('assigneeType', [...])`, duas variantes `user`/`group`, cada uma com `roleId: z.string().min(1)`, `targetModuleId: z.string().min(1)`), `listRoleAssignmentsInputSchema` (mesmo discriminador, sem `roleId`/`targetModuleId`), `listRoleAssignmentsOutputSchema` (array de `{ id, roleId, roleName, targetModuleId, targetModuleSlug, createdAt }`), `deleteRoleAssignmentInputSchema` (`{ roleAssignmentId: z.string().min(1) }`).
- [x] Task 2: `adminRouter.roleAssignments` (AC: #1, #2, #3, #4)
  - [x] 2.1 `apps/api/src/core/admin/router.ts`: nova sub-router `roleAssignments: router({ list, create, delete })`, mesmo nível de `users`/`groups`/`roles` dentro de `adminRouter`.
  - [x] 2.2 `create`: confirma `role` (via `forTenant(tenantId).role.findUnique`) E o assignee (`forTenant(tenantId).user.findUnique` OU `.group.findUnique`, de acordo com `assigneeType`) pertencem ao tenant — `NOT_FOUND` uniforme se qualquer um faltar. Confirma `targetModuleId` existe (`prisma.module.findUnique` CRU, não `forTenant` — Module é global) — `NOT_FOUND` se não existir. SÓ ENTÃO cria a `RoleAssignment` (`forTenant(tenantId).roleAssignment.create`, com `userId`/`groupId` setado de acordo com `assigneeType`, o outro campo implicitamente `undefined`/ausente).
  - [x] 2.3 `list`: confirma o assignee pertence ao tenant (mesmo padrão), depois `forTenant(tenantId).roleAssignment.findMany({ where: { userId } })` OU `{ where: { groupId } })`, com `include: { role: { select: { name: true } } }` e join manual (ou `select` aninhado) pra pegar `targetModule.slug` (Module é global — incluído via relação normal do Prisma, não via `forTenant`, já que o `include`/`select` de uma relação não passa pelo `$allModels` da extensão).
  - [x] 2.4 `delete`: `forTenant(tenantId).roleAssignment.deleteMany({ where: { id: input.roleAssignmentId } })` + `count === 0` → `NOT_FOUND`. Sem nenhum `try/catch` de FK — `RoleAssignment` não é referenciada por nenhuma outra tabela (é a "ponta" do grafo), então `deleteMany` nunca pode falhar por FK aqui (diferente de `roles.delete`, Story 5.4).
- [x] Task 3: Testes (AC: #2, #3, #4, #5)
  - [x] 3.1 `apps/api/src/core/admin/router.test.ts` (`DATABASE_URL`-gated): 3 testes separados de `FORBIDDEN` sem `isAdmin` (list/create/delete — mesmo padrão corrigido no code review da Story 5.3, nunca combinado).
  - [x] 3.2 `create` com `assigneeType: 'user'` E com `assigneeType: 'group'` — os dois caminhos do discriminador, cada um criando de verdade (confirma via `prisma.roleAssignment.findUnique` depois).
  - [x] 3.3 `create` com `userId`/`groupId`/`roleId` de outro tenant → `NOT_FOUND` uniforme (3 variações: assignee de outro tenant, role de outro tenant). `targetModuleId` inexistente → `NOT_FOUND` também (Module nunca existe "no tenant errado" — só existe ou não existe).
  - [x] 3.4 `list` com `assigneeType: 'user'` retorna só as atribuições DAQUELE usuário (não de outro usuário do mesmo tenant, nem de outro tenant), incluindo `roleName`/`targetModuleSlug` corretos. Mesmo teste pra `assigneeType: 'group'`.
  - [x] 3.5 `list`/`delete` com assignee/`roleAssignmentId` de outro tenant → `NOT_FOUND` uniforme.
  - [x] 3.6 `delete` remove de verdade (confirma via `prisma.roleAssignment.findUnique` → `null` depois).
  - [x] 3.7 **O teste mais importante desta story**: cria um `Module`+`Resource` reais (mesmo formato `<slug>.<ação>` da AD-7), um `Role` que agrega aquele `Resource` (M2M, Story 5.4), um `User`; chama `adminRouter.createCaller(...).roleAssignments.create(...)` (a procedure de produto, não Prisma direto) pra atribuir aquele Role àquele User sobre aquele Module; DEPOIS chama o middleware `requireResource(resourceId)` (Story 3.1, importado de `../authz/require-resource.js`) com um `ctx` daquele mesmo User — confirma que o acesso É CONCEDIDO. Repete o mesmo fluxo via Grupo (`assigneeType: 'group'`) pra confirmar a cobertura via membership também funciona ponta a ponta.
- [x] Task 4: Validação real de ponta a ponta (AC: #6)
  - [x] 4.1 Projeto gerado + migrations já existentes aplicadas contra Postgres real (Laboratório Integrit) — nenhuma migration nova nesta story.
  - [x] 4.2 Script de probe: login admin; `roleAssignments.create` atribuindo um Role (que agrega um Resource real) a um User sobre um Module real via HTTP real; `roleAssignments.list` confirma a atribuição criada com `roleName`/`targetModuleSlug` certos (joins reais); `roleAssignments.delete` revoga, confirma via `list` que a atribuição não existe mais. **Ajuste de escopo feito durante a execução**: a prova de que `requireResource` de fato reage à atribuição (a parte mais importante da story) já tinha sido validada contra Postgres real no Task 3.7, dentro da própria suíte `pnpm test` (`DATABASE_URL`-gated) rodada no Laboratório — reexercitar isso via uma segunda chamada HTTP exigiria sincronizar o CLI gerador inteiro pro Laboratório só pra rodar `generate module`, desproporcional já tendo a prova real. O probe ficou focado no que as stories 5.1/5.3/5.4 sempre validaram via HTTP: o CRUD do admin em si.
  - [x] 4.3 `pnpm typecheck`/`lint`/`format:check`/`test` limpos; Debug Log/Completion Notes atualizados.

## Dev Notes

### 🎯 Onde este código realmente vive

Mesmo padrão de sempre: `apps/api/src/core/admin/router.ts`/`packages/shared/src/schemas/admin.ts` já existem desde a Story 5.1 — esta story ESTENDE os dois (novo bloco `roleAssignments:` dentro do `adminRouter` já existente, ao lado de `users`/`groups`/`roles`).

### ⚠️ Escopo explicitamente cortado desta story

- **Nenhuma tela de admin** — mesmo corte de toda a Epic 5.
- **Nenhum `update`** — ver AC #1; é uma decisão de design, não um corte por falta de tempo. `RoleAssignment` é um registro de concessão, não uma entidade editável.
- **FR-15 (import em lote de Usuários via CSV)** — ainda não endereçado por nenhuma story da Epic 5; não é bloqueado por esta story, mas também não é resolvido por ela. Fica pra uma story futura própria.
- **Listar TODAS as atribuições do tenant de uma vez (sem filtrar por assignee)** — nenhuma AC/FR pede essa visão; a tela real prevista é "ver os Papéis de UM Usuário/Grupo", não um relatório geral. Se isso vier a ser pedido, é uma `list` nova, não uma mudança nesta.

### Arquitetura — o que seguir à risca

- **Este é o PRIMEIRO lugar em todo o projeto onde uma `RoleAssignment` é criada por uma procedure de produto** — desde a Story 3.1, toda `RoleAssignment` que já existiu foi inserida direto via Prisma em testes (`require-resource.test.ts`) ou em probes de validação manual. Essa story fecha esse gap: valida que o enforcement real (`requireResource`) de fato reage a uma atribuição criada pelo caminho de produto, não só a uma linha inserida artificialmente num teste.
- **`forTenant` cobre `findMany`/`findUnique`/`deleteMany` (`$allModels`), mas NÃO escopos de relação carregada via `include`/`select`** — ao buscar `targetModule.slug` em `list` (Task 2.3), a relação `Module` em si é GLOBAL (Story 3.1, mesmo motivo de `requireResource` consultar `prisma.resource`/`prisma.module` crus, nunca via `forTenant`) — isso é esperado, não um vazamento de tenant: um admin pode ver o `slug` de um Module mesmo que o Module em si não "pertença" a tenant nenhum.
- **`z.discriminatedUnion` em vez de um objeto com `userId?`/`groupId?` opcionais soltos** — replicar a forma da CHECK constraint do banco (`role_assignments_assignee_check`, Story 3.1) na camada de validação, pra rejeitar com um erro Zod claro (400) ANTES de bater na constraint do banco (que daria um erro de banco não mapeado se alguém mandasse os dois ou nenhum).
- **Reaproveitamento literal de `requireAdmin()`/`forTenant`/padrão `NOT_FOUND` uniforme** (Story 5.1/5.3/5.4) — nenhuma mudança nesses mecanismos nesta story.
- **`RoleAssignment.delete` nunca precisa de tratamento de FK** (diferente de `roles.delete`, Story 5.4) — nada referencia uma `RoleAssignment` como alvo de FK; ela só é origem de FKs (pra `Role`/`User`/`Group`/`Module`), nunca destino. `deleteMany` simples é suficiente.

### Testing Standards

- Mesmo split real já documentado desde a Story 5.1: `adminRouter.*` usa `forTenant` direto — `router.test.ts` continua `DATABASE_URL`-gated.
- **Task 3.7/4.2 são os testes mais importantes da Epic 5 até agora** — não testam só o CRUD de `RoleAssignment` em isolamento, testam a INTEGRAÇÃO REAL entre o que a Epic 5 construiu e o que a Epic 3 já tinha. Mesma disciplina de "efeito real, não suposição" de toda story desde a 4.2, aplicada aqui à fronteira entre duas epics.
- 3 testes `FORBIDDEN` separados desde o início (lição da Story 5.3/5.4 já aplicada).
- Validação real de ponta a ponta contra Postgres (sem Mailpit — esta story não envia email) antes de marcar `done`, mesma disciplina desde a Story 3.1.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] — "administrador visualiza, cria, edita, remove e organiza Usuários/Grupos/Papéis... refletindo na árvore em tempo real" (FR-14).
- [Source: src/scaffolding/templates/authz.ts#require-resource.ts] — a query de cobertura exata que `roleAssignments.create` precisa alimentar corretamente pra fechar o ciclo (role.resources, targetModule ancestralidade via ModuleClosure, userId OU group.users).
- [Source: packages/db/schema.prisma / migrations (Story 3.1)] — `model RoleAssignment`, CHECK `role_assignments_assignee_check`, ausência de `@@unique` sobre a combinação de campos.
- [Source: _bmad-output/implementation-artifacts/5-4-roles-crud-backend.md] — padrão `forTenant`/`NOT_FOUND` uniforme/testes separados que esta story replica; nota explícita de que "gestão de RoleAssignment... merece sua própria fatia vertical" (origem desta story).

### Review Findings

Revisão adversarial de 4 camadas (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, Acceptance Auditor) sobre o diff de 2 arquivos (633 linhas) desta story, com `review_mode: full` contra este spec + contexto de 3-1/5-1/5-3/5-4.

- [x] [Review][Patch] **Vazamento real de `Module` no banco** — `cleanupModuleRoleFixture` tenta `prisma.module.delete(...)` ANTES do `afterEach`/`cleanupTenant` remover as `RoleAssignment`s criadas pelo teste (a FK `role_assignments_target_module_id_fkey` é `RESTRICT`); o `.catch(() => undefined)` engole o erro silenciosamente, deixando o `Module` (global) órfão pra sempre no banco real — já aconteceu de verdade durante a validação desta story no Laboratório [src/scaffolding/templates/admin.ts] — corrigido: `roleAssignment.deleteMany({ where: { targetModuleId } })` adicionado como primeiro passo do cleanup.
- [x] [Review][Patch] O teste `FORBIDDEN` de `list`/`create`/`delete` foi escrito como UM teste combinado (3 `await expect` sequenciais) — contradiz o próprio Testing Standards desta story ("3 testes FORBIDDEN separados desde o início — lição da 5.3/5.4 já aplicada") e reintroduz exatamente o padrão que o code review da Story 5.3 identificou e corrigiu [src/scaffolding/templates/admin.ts] — corrigido: 3 testes `it()` separados.
- [x] [Review][Patch] No teste `create nunca cruza tenant`, as asserções 3 (papel de outro tenant) e 4 (módulo inexistente) usam um `userId` TAMBÉM inválido junto — como a ordem de checagem é role→assignee→module, essas duas asserções na verdade só provam a checagem de ASSIGNEE (que falha primeiro), nunca isolam de verdade a checagem de role-cross-tenant nem a de module-inexistente; uma regressão removendo QUALQUER uma das duas passaria pela suíte sem ser pega [src/scaffolding/templates/admin.ts] — corrigido: assertions 3/4 agora usam um `User` válido do próprio tenant, isolando de verdade cada checagem.
- [x] [Review][Patch] `roleAssignments.list` nunca é testado com `assigneeType: 'group'` — nem no teste de filtro/join, nem no de cross-tenant — apesar do Task 3.4 pedir explicitamente "mesmo teste pra assigneeType: group" [src/scaffolding/templates/admin.ts] — corrigido: novo teste espelhando o de `user`, com `assigneeType: 'group'`.
- [x] [Review][Patch] `roleAssignments.delete` só é testado contra um `roleAssignmentId` que nunca existiu — nunca contra uma `RoleAssignment` REAL de outro tenant, diferente do padrão já estabelecido pra `roles.delete`/`groups.delete` (que testam os dois casos) [src/scaffolding/templates/admin.ts] — corrigido: teste estendido com uma `RoleAssignment` real de outro tenant, confirmando `NOT_FOUND` E que ela continua intacta depois.
- [x] [Review][Patch] A checagem "assignee pertence ao tenant" (User OU Group, de acordo com `assigneeType`) está duplicada palavra-por-palavra entre `list` e `create` — sem fatorar num helper comum, uma mudança futura tem que ser replicada à mão nos dois lugares [src/scaffolding/templates/admin.ts] — corrigido: fatorado em `assertAssigneeInTenant(db, input)`, reaproveitado nos dois lugares.
- [x] [Review][Patch] O comentário de `createRoleAssignmentInputSchema` afirma que o `discriminatedUnion` "rejeita... se o caller mandar os dois campos ou nenhum" — só a metade "nenhum" é verdade; Zod (sem `.strict()`) silenciosamente DESCARTA o campo extra em vez de rejeitar se os dois vierem juntos. Não é um bug funcional (o handler já re-deriva `userId`/`groupId` a partir de `assigneeType`, nunca confia no campo bruto), mas o comentário overstatement precisa de correção [src/scaffolding/templates/shared.ts] — corrigido: comentário reescrito pra descrever o comportamento real.

**Rejeitados:**
- `false` — `role` criado por `makeModuleRoleFixture` ficaria órfão (sem limpeza manual no fixture): `cleanupTenant` (já existente, `afterEach`) já faz `role.deleteMany({ where: { tenantId } })` pra todo tenant em `createdTenantIds` — o `role` do fixture tem exatamente esse `tenantId`, então já é limpo automaticamente.
- `false` — `roleAssignments.create` deveria checar se o `role.resources` tem relação com o `targetModuleId` antes de permitir a atribuição: nenhuma AC/FR exige isso, e forçar essa checagem acoplaria artificialmente duas etapas independentes da composição de RBAC (criar o Role, atribuir Resources a ele, atribuí-lo a Usuários/Grupos — ordem livre é o padrão esperado; nada impede compor um Role incompleto e completá-lo depois).

**Deferido:**
- [x] [Review][Defer] TOCTOU entre as checagens de existência (role/assignee/module) e o `db.roleAssignment.create()` em si — se alguma das três entidades for deletada por uma request concorrente nesse intervalo, o `create` pode lançar um `P2003` não mapeado em vez de `NOT_FOUND` [src/scaffolding/templates/admin.ts] — deferred: mesma classe de risco residual já aceita em outras stories (ex.: Story 3.2, `migrate.ts`) — ferramenta de uso interativo por um único admin, janela de corrida exige uma segunda request concorrente no exato intervalo entre a checagem e a escrita.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- Validação local (`aether-5-5-validate`, sem `DATABASE_URL`): `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 11 arquivos passaram, 2 skipped (13), 73 testes passaram, 55 skipped (128) — 8 testes novos de `roleAssignments.*` (3 FORBIDDEN combinados em 1, create user/group, create NOT_FOUND, list, list/delete NOT_FOUND, delete, e o teste de integração com `requireResource`), todos `DATABASE_URL`-gated.
- **Achado real descoberto rodando contra Postgres de verdade no Laboratório (primeira tentativa)**: o teste de integração com `requireResource` (Task 3.7) falhou com `FORBIDDEN` mesmo com a `RoleAssignment` criada corretamente. Causa raiz: o fixture `makeModuleRoleFixture()` criava o `Module` direto via Prisma, mas nunca a linha `ModuleClosure` self-referencial (`ancestorId=descendantId=module.id`, `depth=0`) que `generate module` (Story 3.2) sempre cria junto — sem ela, a query de cobertura de `requireResource` (`targetModule.descendantClosures.some.descendantId`) nunca encontra o próprio módulo como seu descendente, negando acesso mesmo com tudo certo. Corrigido adicionando a criação (e limpeza) dessa linha no fixture. Confirma, na prática, exatamente o motivo pelo qual toda story desde a 3.1 insiste em validar contra Postgres real — o erro não existia em nenhuma camada de tipo/lógica óbvia, só na ausência de uma linha de dado que só o `generate module` real cria.
- Validação real (Laboratório Integrit, `tupa-lab`/`ubt-host01`, container `aether-api`), após a correção: projeto resincronizado; banco `aether_5_5_validate` dedicado recriado; migrations já existentes aplicadas limpo; Mailpit dedicado. Com `DATABASE_URL` setado: `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 13 arquivos passaram, 128 testes passaram, 0 skipped — os 45 testes de `admin/router.test.ts` (37 anteriores + 8 novos desta story) todos passaram de verdade, incluindo o teste que fecha o ciclo com `requireResource` via User E via Group.
- Script de probe (`apps/api/src/probe-5-5.ts`, descartável, nunca comitado) rodado via `tsx` contra a API real (porta 3015): login admin; `roleAssignments.create`/`list`/`delete` via HTTP real, confirmando os joins de `roleName`/`targetModuleSlug` e a revogação de verdade. Escopo do probe ajustado pra focar no CRUD via HTTP (mesmo padrão das Stories 5.1/5.3/5.4) — a prova de integração com `requireResource` já tinha rodado contra Postgres real no Task 3.7, reexercitá-la via uma segunda chamada HTTP exigiria sincronizar o CLI gerador inteiro pro Laboratório só pra rodar `generate module`, desproporcional já tendo a prova real. Todas as 4 validações do probe passaram; só a limpeza do PRÓPRIO script bateu no mesmo FK de `refresh_tokens` já visto em todo probe anterior desta epic — banco inteiro dropado em vez de depurar a ordem de limpeza do script descartável.
- Cleanup pós-validação: servidor finalizado, banco `aether_5_5_validate` dropado, container `mailpit-5-5-validate` removido, diretório sincronizado `/app-5-5` removido do container, projeto `aether-5-5-validate` e tarball de scratch removidos localmente.
- Code review (4 camadas) aplicado + revalidado: 7 patches corrigidos — o mais crítico foi um vazamento REAL de `Module`/órfãos no banco (ordem de limpeza do fixture de teste, confirmado acontecendo de verdade durante a própria validação desta story). Os outros 6: teste `FORBIDDEN` combinado dividido em 3; 2 asserções de `create` que não isolavam de verdade a checagem que diziam provar (corrigidas usando um assignee válido); teste de `list` com `assigneeType: 'group'` adicionado (estava totalmente ausente); teste de `delete` estendido com uma `RoleAssignment` REAL de outro tenant (antes só testava id inexistente); checagem de assignee duplicada entre `list`/`create` fatorada em `assertAssigneeInTenant`; comentário do schema corrigido (Zod não rejeita os dois campos juntos, só descarta o extra). Projeto regenerado localmente: 131 testes, 0 skipped fora do esperado. Revalidado no Laboratório: 131 testes, 0 skipped, 100% verde — e confirmado via `SELECT count(*)` direto no Postgres que zero linhas de `Module`/`RoleAssignment` vazaram depois da suíte inteira rodar (prova direta de que o vazamento real foi corrigido, não só "os testes passam").

### Completion Notes List

- Todas as 6 ACs satisfeitas e validadas de ponta a ponta contra Postgres real do Laboratório Integrit, não só contra fakes/mocks.
- **Esta é a primeira story de toda a Epic 5 (e possivelmente de todo o projeto) a fechar o ciclo entre o backend de admin e o enforcement real da Epic 3** — até aqui, toda `RoleAssignment` que já existiu em qualquer teste/probe foi inserida direto via Prisma; agora existe uma via de produto real (`roleAssignments.create`) e ela foi PROVADA, contra Postgres de verdade, capaz de alimentar `requireResource` corretamente — via atribuição direta a User E via membership de Group.
- Achado real genuíno descoberto durante a validação (não um erro de digitação ou de tipo — um gap de modelagem de dados no PRÓPRIO teste): a necessidade da linha `ModuleClosure` self-referencial. Documentado em detalhe no Debug Log porque é exatamente o tipo de bug que só aparece contra Postgres real, nunca num mock/fake — reforça a disciplina de validação real já estabelecida desde a Story 3.1.
- Segundo achado real descoberto já DEPOIS dessa primeira correção, só no code review: a mesma fixture que ganhou o `ModuleClosure` ainda vazava o `Module` em si no cleanup, por ordem errada de deleção (`RoleAssignment` precisa ser removida ANTES do `Module`, FK `RESTRICT`). Dois achados reais e independentes na MESMA fixture de teste, em dois momentos diferentes — reforça que "testar contra Postgres real" e "revisar o código depois" são disciplinas complementares, nenhuma substitui a outra.
- `RoleAssignment` nunca ganhou um `update` — decisão de design explícita (AC #1), não um corte por escopo: é um registro de concessão imutável.
- Zero migration nova — todo o schema necessário já existia desde a Story 3.1.

### File List

- `src/scaffolding/templates/admin.ts` (M)
- `src/scaffolding/templates/shared.ts` (M)
