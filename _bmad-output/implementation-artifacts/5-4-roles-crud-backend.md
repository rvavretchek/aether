---
baseline_commit: 6607ccb054aa0e0ebcb6b7cd9dea6b2f0f0bc5d7
context: [_bmad-output/implementation-artifacts/3-1-identity-tree-enforcement.md, _bmad-output/implementation-artifacts/5-1-admin-users-backend.md, _bmad-output/implementation-artifacts/5-3-groups-crud-backend.md]
---

# Story 5.4: CRUD backend de Papéis (Role)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como administrador de um Tenant,
eu quero listar, criar, editar e remover Papéis através de procedures tRPC protegidas por `requireAdmin`,
para que a Epic 5 avance na organização de Usuários/Grupos/Papéis (FR-14), completando o terceiro e último nó CRUD da árvore de identidade (Story 3.1) depois de Usuários (Story 5.1) e Grupos (Story 5.3) — seguindo o mesmo padrão de fatia vertical, mas com uma diferença real de comportamento que as outras duas não têm (ver AC #5/Dev Notes).

## Acceptance Criteria

1. Nova sub-router `adminRouter.roles` — `list`/`create`/`update`/`delete`, todas protegidas por `requireAdmin` (Story 5.1, reaproveitado sem modificação).
2. `roles.list` — lista os `Role`s do PRÓPRIO Tenant do admin (via `forTenant`, nunca cross-tenant, mesmo padrão de `groups.list`).
3. `roles.create` — cria um `Role` novo no Tenant do admin (só `name`, obrigatório, não-vazio, `.max(200)` — mesmo padrão de `groups.create`, Story 5.3, já com o limite de tamanho desde o início).
4. `roles.update` — edita o `name` de um `Role` existente do próprio Tenant do admin — `NOT_FOUND` uniforme tanto pra "não existe" quanto pra "é de outro tenant" (mesmo princípio anti-enumeração de `groups.update`).
5. `roles.delete` — remove um `Role` do próprio Tenant do admin — mesmo `NOT_FOUND` uniforme cross-tenant/inexistente. **Diferente de `groups.delete`**: a FK `role_assignments_role_id_fkey` é `ON DELETE RESTRICT` (não `CASCADE` — confirmado na migration da Story 3.1), então remover um `Role` que ainda tem QUALQUER `RoleAssignment` apontando pra ele deve falhar com um erro de produto claro (`CONFLICT`), nunca deixar o `P2003` bruto do Postgres vazar. A associação M2M `Role`↔`Resource` (`_ResourceToRole`) já é `CASCADE` (igual ao padrão de Grupo) — isso não bloqueia o delete.
6. `pnpm typecheck`/`lint`/`format:check`/`test` passam limpos no projeto GERADO. Validado de ponta a ponta contra Postgres real (mesma disciplina desde a 3.1): cria um Role, edita, lista, associa um Resource a ele (M2M) e confirma que remover funciona normalmente (resource association cascateia); separadamente, cria outro Role, atribui ele via `RoleAssignment` a um User, e confirma que `roles.delete` falha com `CONFLICT` enquanto a atribuição existir — nunca um 500 bruto.

## Tasks / Subtasks

- [x] Task 1: Schema Zod compartilhado (AC: #2, #3, #4)
  - [x] 1.1 `packages/shared/src/schemas/admin.ts`: `listRolesOutputSchema` (array de `{ id, name, createdAt }`), `createRoleInputSchema` (`{ name: z.string().trim().min(1).max(200) }`), `updateRoleInputSchema` (`{ roleId: z.string().min(1), name: z.string().trim().min(1).max(200) }`), `deleteRoleInputSchema` (`{ roleId: z.string().min(1) }`).
- [x] Task 2: `adminRouter.roles` (AC: #1, #2, #3, #4, #5)
  - [x] 2.1 `apps/api/src/core/admin/router.ts`: nova sub-router `roles: router({ list, create, update, delete })`, mesmo nível de `users`/`groups` dentro de `adminRouter`.
  - [x] 2.2 `list`/`create`/`update`: EXATAMENTE o mesmo padrão de `groups.*` (Story 5.3) — `forTenant`, `updateMany` + `count === 0` → `NOT_FOUND`. Copiar a estrutura, trocar `group`→`role`.
  - [x] 2.3 `delete`: `deleteMany` + `count === 0` → `NOT_FOUND` (mesmo padrão), MAS envolto num `try/catch` que mapeia violação de FK (`role_assignments_role_id_fkey`, código `P2003`) pra `TRPCError({ code: 'CONFLICT' })` com mensagem clara ("Papel ainda está atribuído a Usuários/Grupos — remova as atribuições antes de excluir."). Checagem estrutural do erro (`'code' in err && err.code === 'P2003'`), mesmo estilo de `isDuplicateEmailError` (Story 5.1) — nunca `instanceof Prisma.PrismaClientKnownRequestError` (apps/api não depende de `@prisma/client` direto).
- [x] Task 3: Testes (AC: #2, #3, #4, #5)
  - [x] 3.1 `apps/api/src/core/admin/router.test.ts` (`DATABASE_URL`-gated): 4 testes separados de `FORBIDDEN` sem `isAdmin` (mesmo padrão corrigido de Grupos no code review da Story 5.3 — nunca um teste combinado).
  - [x] 3.2 `list` nunca cruza tenant.
  - [x] 3.3 `create` cria de verdade.
  - [x] 3.4 `update`/`delete`: `NOT_FOUND` uniforme cross-tenant E inexistente (os dois casos, mesma resposta).
  - [x] 3.5 `delete` remove de verdade um Role sem atribuições.
  - [x] 3.6 Teste de EFEITO REAL da associação `Role`↔`Resource` via CASCADE (mesmo espírito do teste de Grupo na Story 5.3, mas SEM bloquear o delete): cria um `Role`, associa um `Resource` a ele (M2M), remove via `roles.delete`, confirma que a associação desapareceu e o `Resource`/`Module` referenciados continuam intactos.
  - [x] 3.7 Teste de EFEITO REAL do bloqueio por `RESTRICT` (AC #5, o achado mais importante desta story): cria um `Role`, cria uma `RoleAssignment` real apontando pra ele, chama `roles.delete`, confirma `CONFLICT` (nunca um erro genérico/500) — e confirma que o `Role` CONTINUA existindo no banco depois (delete falhou de verdade, não parcialmente).
- [x] Task 4: Validação real de ponta a ponta (AC: #6)
  - [x] 4.1 Projeto gerado + migrations já existentes aplicadas contra Postgres real (Laboratório Integrit) — nenhuma migration nova nesta story.
  - [x] 4.2 Script de probe: cria um Role via `roles.create`, edita via `roles.update`, lista via `roles.list`; associa um `Resource` a ele direto via Prisma e confirma que `roles.delete` funciona (M2M cascateia); separadamente, cria outro Role, cria uma `RoleAssignment` real apontando pra ele, confirma que `roles.delete` responde `CONFLICT` em vez de travar com erro genérico.
  - [x] 4.3 `pnpm typecheck`/`lint`/`format:check`/`test` limpos; Debug Log/Completion Notes atualizados.

## Dev Notes

### 🎯 Onde este código realmente vive

Mesmo padrão de sempre: `apps/api/src/core/admin/router.ts`/`packages/shared/src/schemas/admin.ts` já existem desde a Story 5.1 — esta story ESTENDE os dois (novo bloco `roles:` dentro do `adminRouter` já existente, ao lado de `users`/`groups`), não cria arquivo novo.

### ⚠️ Escopo explicitamente cortado desta story

- **Nenhuma tela de admin** — mesmo corte de toda a Epic 5.
- **Nenhuma gestão de Resources do Papel** (associar/desassociar `Resource` de um `Role`) — fica pra uma story futura própria, mesmo espírito do corte de "gestão de membros do Grupo" na Story 5.3.
- **Nenhuma gestão de `RoleAssignment`** (atribuir um Papel a um Usuário/Grupo sobre um Módulo) — é uma operação de três entidades (User/Group + Role + Module) com semântica própria (Story 3.1, AD-7/AD-8); merece sua própria fatia vertical, não encaixar de lado aqui. Esta story só cria/edita/remove o `Role` EM SI.
- **`@@unique` de `name` por tenant** — mesma decisão já tomada pra `Group` (Story 5.3): nenhuma AC/FR exige, `Role`/`Resource` únicos por NOME GLOBAL (`Resource.name`, AD-7) são uma preocupação diferente de `Role.name`, que nunca teve essa exigência em nenhuma story.

### Arquitetura — o que seguir à risca

- **`Role` já existe no schema desde a Story 3.1** — `id`, `tenantId`, `name`, `createdAt`, `updatedAt`, M2M implícito com `Resource` (`_ResourceToRole`), e `roleAssignments: RoleAssignment[]`. Zero migration nova.
- **A diferença crítica com `Group.delete` (Story 5.3): `role_assignments_role_id_fkey` é `ON DELETE RESTRICT`, não `CASCADE`** (confirmado na migration real `20260904000000_add_identity_tree`, revisada pós-review da Story 3.1 — só as FKs de `user_id`/`group_id` em `role_assignments` ganharam `CASCADE` naquela revisão; `role_id` continuou `RESTRICT` de propósito, porque excluir um Papel que está EM USO seria uma operação destrutiva silenciosa sobre a autorização de alguém, diferente de excluir um Grupo vazio-de-atribuição). **Copiar o padrão de `groups.delete` ao pé da letra aqui seria um bug real** — o Postgres vai rejeitar com `P2003` meio que "por acidente" na primeira vez que alguém tentar excluir um Papel em uso, e sem o `try/catch` do Task 2.3 esse erro vaza cru (500) pro admin. Mapear pra `CONFLICT` explicitamente.
- **M2M `Role`↔`Resource` (`_ResourceToRole`) é `CASCADE`** nos dois lados — isso é igual ao padrão de Grupo/User, não precisa de tratamento especial; só a FK de `RoleAssignment.role_id` é diferente.
- **`forTenant`/`requireAdmin()` reaproveitados literalmente** (Story 5.1/5.3) — nenhuma mudança neles nesta story.

### Testing Standards

- Mesmo split real já documentado desde a Story 5.1: `adminRouter.*` usa `forTenant` direto — `router.test.ts` continua `DATABASE_URL`-gated.
- **Task 3.7 é o teste mais importante desta story** — provar que o bloqueio por `RESTRICT` produz um erro de PRODUTO (`CONFLICT`), não um 500 bruto, e que o `Role` não foi parcialmente afetado. Mesma disciplina de "efeito real, não suposição" já aplicada ao CASCADE de Grupo (Story 5.3) — aqui é o caso espelhado: provar que a operação FALHA corretamente, não que ela funciona.
- 4 testes `FORBIDDEN` separados desde o início (não um combinado) — a Story 5.3 teve que corrigir isso no code review; esta story já nasce no padrão certo.
- Validação real de ponta a ponta contra Postgres (sem Mailpit — esta story não envia email) antes de marcar `done`, mesma disciplina desde a Story 3.1.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] — "administrador visualiza, cria, edita, remove e organiza Usuários/Grupos/Papéis" (FR-14).
- [Source: packages/db/schema.prisma / migrations (Story 3.1)] — `model Role`, `role_assignments_role_id_fkey` (`RESTRICT`), `_ResourceToRole` (`CASCADE`).
- [Source: _bmad-output/implementation-artifacts/5-3-groups-crud-backend.md] — padrão `forTenant`/`updateMany`/`deleteMany`/anti-enumeração/try-finally-em-teste-de-efeito-real que esta story replica, com o ajuste do Task 2.3/AC #5.
- [Source: _bmad-output/implementation-artifacts/5-1-admin-users-backend.md] — `isDuplicateEmailError`, modelo de checagem estrutural de código de erro do Prisma sem depender de `@prisma/client`.

### Review Findings

Revisão adversarial de 4 camadas (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, Acceptance Auditor) sobre o diff de 2 arquivos (388 linhas) desta story, com `review_mode: full` contra este spec + contexto de 3-1/5-1/5-3.

- [x] [Review][Patch] O comentário de `isRoleInUseError` cita `groups_tenant_id_fkey`/`CASCADE` como o contraste com `role_assignments_role_id_fkey`/`RESTRICT` — as duas afirmações estão erradas: `groups_tenant_id_fkey` não tem nada a ver com `RoleAssignment.groupId` (é `Group.tenantId → Tenant.id`), e NÃO é `CASCADE` (é `RESTRICT` também). A FK que o comentário deveria citar é `role_assignments_group_id_fkey` (essa sim `CASCADE`). Justamente o ponto que os Dev Notes mais insistem em deixar claro pra não repetir o erro [src/scaffolding/templates/admin.ts] — corrigido: comentário reescrito citando a FK certa.
- [x] [Review][Patch] O teste que prova `CONFLICT` (RESTRICT) só confere `code: 'CONFLICT'`, nunca a mensagem exata especificada no Task 2.3 ("Papel ainda está atribuído a Usuários/Grupos — remova as atribuições antes de excluir.") — uma regressão de texto passaria pela suíte sem ser notada [src/scaffolding/templates/admin.ts] — corrigido: asserção estendida pra incluir a mensagem exata.

**Rejeitados:**
- `false` — Faltaria um teste de `RESTRICT`/`CONFLICT` com `RoleAssignment.groupId` (em vez de `userId`): é a MESMA FK (`role_assignments_role_id_fkey`), o mesmo código, o mesmo caminho — nada no código distingue por tipo de atribuição; o teste existente com `userId` já exercita 100% do caminho relevante.
- `false` — `isRoleInUseError` checar só `err.code === 'P2003'`, sem `meta.field_name`: é a MESMA simplificação já aceita em `isDuplicateEmailError` (Story 5.1) no mesmo arquivo — não é uma regressão desta story, é consistência com um padrão já estabelecido.
- `false` — `roles.list` não expor `updatedAt`: é exatamente o mesmo formato já usado por `groups.list` (Story 5.3) — decisão de escopo já tomada lá, não uma omissão nova aqui.

**Deferido:**
- [x] [Review][Defer] Nenhum teste prova rejeição de `name` vazio/só-espaços/excedendo `.max(200)`, nem que `.trim()` persiste sem espaços, em `roles.create`/`roles.update` [src/scaffolding/templates/admin.ts] — deferred: mesma lacuna já documentada em `deferred-work.md` (code review da Story 5.3) pra `users.*`/`groups.*` — ampliando o escopo desse item existente pra incluir `roles.*` também, em vez de duplicar.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- Validação local (`aether-5-4-validate`, sem `DATABASE_URL`): `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 11 arquivos passaram, 2 skipped (13), 73 testes passaram, 47 skipped (120) — 11 testes novos de `roles.*` (4 FORBIDDEN separados, isolamento cross-tenant, create/update real, NOT_FOUND uniforme, delete vazio, CASCADE de Resource, CONFLICT por RESTRICT), todos `DATABASE_URL`-gated.
- Validação real (Laboratório Integrit, `tupa-lab`/`ubt-host01`, container `aether-api`): projeto sincronizado via `tar`+`scp`+`docker cp`; banco `aether_5_4_validate` dedicado; migrations já existentes (nenhuma nova nesta story) aplicadas limpo; Mailpit dedicado só pra não deixar a suíte de SMTP falhar por ausência de infraestrutura. Com `DATABASE_URL` setado: `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 13 arquivos passaram, 120 testes passaram, 0 skipped — os 37 testes de `admin/router.test.ts` (26 anteriores + 11 novos desta story) todos passaram de verdade contra Postgres real, incluindo o teste que prova `CONFLICT` (não 500) quando um Role em uso é alvo de `roles.delete`.
- Script de probe (`apps/api/src/probe-5-4.ts`, descartável, nunca comitado) rodado via `tsx` contra a API real (porta 3014): login admin; `roles.create`/`update`/`list`; associação real de `Resource` via Prisma + `roles.delete` funcionando normalmente (CASCADE do M2M); criação de um segundo Role + `RoleAssignment` real + `roles.delete` respondendo `CONFLICT` (nunca erro bruto) com o Role permanecendo intacto depois. Todas as 4 validações passaram; só a limpeza do PRÓPRIO script bateu no mesmo FK de `refresh_tokens` já visto em todo probe anterior desta epic (login do admin emite um refresh token real) — banco inteiro dropado em vez de depurar a ordem de limpeza do script descartável.
- Cleanup pós-validação: servidor finalizado, banco `aether_5_4_validate` dropado, container `mailpit-5-4-validate` removido, diretório sincronizado `/app-5-4` removido do container, projeto `aether-5-4-validate` e tarball de scratch removidos localmente.
- Code review (4 camadas) aplicado + revalidado: 2 patches corrigidos (comentário de `isRoleInUseError` citava a FK errada pro contraste RESTRICT/CASCADE — corrigido pra `role_assignments_group_id_fkey`; teste de `CONFLICT` agora também confere a mensagem exata, não só o código). 1 item deferido (falta de teste de validação de `name` vazio/excedendo `.max()`/`.trim()` — ampliou um item já existente em `deferred-work.md` desde a Story 5.3, em vez de duplicar). Revalidado: `typecheck`/`lint`/`format:check` limpos localmente e no Laboratório; `pnpm test` → 120 testes, 0 skipped, 100% verde contra Postgres real.

### Completion Notes List

- Todas as 6 ACs satisfeitas e validadas de ponta a ponta contra Postgres real do Laboratório Integrit, não só contra fakes/mocks.
- Achado real confirmado (antecipado nos Dev Notes, não descoberto durante a implementação pra variar): `role_assignments_role_id_fkey` é `ON DELETE RESTRICT` (diferente de `role_assignments_group_id_fkey`, que é `CASCADE`) — copiar o padrão de `groups.delete` ao pé da letra teria sido um bug real, deixando um `P2003` bruto vazar pro admin na primeira tentativa de excluir um Papel em uso. `isRoleInUseError` (checagem estrutural, mesmo estilo de `isDuplicateEmailError` da Story 5.1) mapeia isso pra `CONFLICT` explicitamente.
- Esta story já nasceu aplicando 2 lições do code review da Story 5.3 desde o início: `.max(200)` em `name` desde a primeira versão do schema, e 4 testes `FORBIDDEN` separados (nunca um combinado) — zero achados repetidos dessas duas categorias no code review desta story.
- Ironia notada: o próprio comentário que documentava a distinção RESTRICT-vs-CASCADE (o ponto mais importante da story) citava a FK errada pro lado CASCADE — a lógica estava certa, a documentação é que precisava de correção. Corrigido no code review.
- Zero migration nova — todo o schema necessário (`Role`, `RoleAssignment`, `_ResourceToRole`) já existia desde a Story 3.1.

### File List

- `src/scaffolding/templates/admin.ts` (M)
- `src/scaffolding/templates/shared.ts` (M)
