---
baseline_commit: de10c8d6f372f68aa96753a08ae9ff507e43384e
context: [_bmad-output/implementation-artifacts/3-1-identity-tree-enforcement.md, _bmad-output/implementation-artifacts/5-1-admin-users-backend.md, _bmad-output/implementation-artifacts/5-2-revoke-sessions.md]
---

# Story 5.3: CRUD backend de Grupos

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como administrador de um Tenant,
eu quero listar, criar, editar e remover Grupos através de procedures tRPC protegidas por `requireAdmin`,
para que a Epic 5 avance na organização de Usuários/Grupos/Papéis (FR-14) seguindo o mesmo padrão de fatia vertical já usado pros Usuários (Story 5.1) — Grupo é o próximo nó mais simples da árvore de identidade (Story 3.1) sem a complexidade de senha/email que `User` tem.

## Acceptance Criteria

1. Nova sub-router `adminRouter.groups` — `list`/`create`/`update`/`delete`, todas protegidas por `requireAdmin` (Story 5.1, reaproveitado sem modificação).
2. `groups.list` — lista os `Group`s do PRÓPRIO Tenant do admin (via `forTenant`, nunca cross-tenant, mesmo padrão de `users.list`).
3. `groups.create` — cria um `Group` novo no Tenant do admin (só `name`, obrigatório e não-vazio).
4. `groups.update` — edita o `name` de um `Group` existente do próprio Tenant do admin — `NOT_FOUND` uniforme tanto pra "não existe" quanto pra "é de outro tenant" (mesmo princípio anti-enumeração de `users.update`, Story 5.1).
5. `groups.delete` — remove um `Group` do próprio Tenant do admin — mesmo `NOT_FOUND` uniforme cross-tenant/inexistente. `RoleAssignment`s e a associação implícita `User`↔`Group` que referenciam o Group removido são limpas automaticamente via `ON DELETE CASCADE` já configurado no schema desde a Story 3.1 — esta story não escreve NENHUMA lógica de limpeza própria, só confia na FK.
6. `pnpm typecheck`/`lint`/`format:check`/`test` passam limpos no projeto GERADO. Validado de ponta a ponta contra Postgres real (mesma disciplina desde a 3.1): cria um Group, edita, lista, remove, e confirma que remover um Group que tinha `RoleAssignment`s e Usuários associados não deixa nenhuma linha órfã (a limpeza via CASCADE realmente acontece, não é só uma suposição lida do schema).

## Tasks / Subtasks

- [x] Task 1: Schema Zod compartilhado (AC: #2, #3, #4)
  - [x] 1.1 `packages/shared/src/schemas/admin.ts`: `listGroupsOutputSchema` (array de `{ id, name, createdAt }`), `createGroupInputSchema` (`{ name: z.string().trim().min(1) }`), `updateGroupInputSchema` (`{ groupId: z.string().min(1), name: z.string().trim().min(1) }`), `deleteGroupInputSchema` (`{ groupId: z.string().min(1) }`).
- [x] Task 2: `adminRouter.groups` (AC: #1, #2, #3, #4, #5)
  - [x] 2.1 `apps/api/src/core/admin/router.ts`: nova sub-router `groups: router({ list, create, update, delete })`, todas com `.use(requireAdmin())` — mesmo nível de `users` dentro de `adminRouter` (não um router separado).
  - [x] 2.2 `list`: `forTenant(ctx.user.tenantId).group.findMany({ select: { id, name, createdAt } })`.
  - [x] 2.3 `create`: `forTenant(ctx.user.tenantId).group.create({ data: { tenantId: ctx.user.tenantId, name: input.name }, select: { id: true } })`.
  - [x] 2.4 `update`: mesmo padrão de `users.update` (Story 5.1) — `updateMany` (não `update`) + checagem de `count === 0` → `NOT_FOUND`, nunca `update()` cru (que vazaria P2025 cross-tenant).
  - [x] 2.5 `delete`: mesmo padrão — `deleteMany` (não `delete`) + checagem de `count === 0` → `NOT_FOUND`. **Nunca** escrever limpeza manual de `RoleAssignment`/associação `User`↔`Group` antes do delete — a FK `ON DELETE CASCADE` já faz isso (ver Dev Notes, schema da Story 3.1).
- [x] Task 3: Testes (AC: #2, #3, #4, #5)
  - [x] 3.1 `apps/api/src/core/admin/router.test.ts` (`DATABASE_URL`-gated, mesma convenção desde a Story 5.1): cada uma das 4 procedures sem `isAdmin` → `FORBIDDEN`.
  - [x] 3.2 `list` nunca cruza tenant (mesmo padrão do teste equivalente de `users.list`).
  - [x] 3.3 `create` cria de verdade (confirma via `prisma.group.findUnique` depois).
  - [x] 3.4 `update`/`delete`: editam/removem no próprio tenant; `NOT_FOUND` uniforme pra `groupId` de outro tenant E pra `groupId` inexistente (mesma resposta, não diferenciar).
  - [x] 3.5 Teste de EFEITO REAL do CASCADE (AC #6, não assumir que o schema funciona — provar): cria um Group, cria uma `RoleAssignment` apontando pra ele (via `group_id`) e associa um `User` a ele (M2M), chama `groups.delete`, confirma que a `RoleAssignment` e a linha de associação `User`↔`Group` desapareceram sozinhas (sem este código ter tocado nelas), e que o `User`/`Role`/`Module` referenciados continuam intactos (só o que pertencia ao Group em si foi limpo).
- [x] Task 4: Validação real de ponta a ponta (AC: #6)
  - [x] 4.1 Projeto gerado + migrations já existentes aplicadas contra Postgres real (Laboratório Integrit) — nenhuma migration nova nesta story (schema de `Group`/`RoleAssignment` já existe desde a Story 3.1, sem mudança).
  - [x] 4.2 Script de probe: cria um Group de verdade via `groups.create`, edita via `groups.update`, lista via `groups.list`, associa um `User` e uma `RoleAssignment` a ele direto via Prisma, remove via `groups.delete`, confirma no banco (consulta direta) que as linhas associadas desapareceram e o `User` em si continua existindo.
  - [x] 4.3 `pnpm typecheck`/`lint`/`format:check`/`test` limpos; Debug Log/Completion Notes atualizados.

## Dev Notes

### 🎯 Onde este código realmente vive

Mesmo padrão de sempre: `apps/api/src/core/admin/router.ts`/`packages/shared/src/schemas/admin.ts` já existem desde a Story 5.1 — esta story ESTENDE os dois (novo bloco `groups:` dentro do `adminRouter` já existente), não cria arquivo novo. O trabalho real continua sendo editar `src/scaffolding/templates/admin.ts`/`shared.ts` deste repositório.

### ⚠️ Escopo explicitamente cortado desta story

- **Nenhuma tela de admin** — mesmo corte de toda a Epic 5 até agora (decisão do Boss, Story 5.1); backend só.
- **Nenhuma gestão de MEMBROS do Grupo** (adicionar/remover `User` de um `Group`) — fica pra uma story futura própria (a extensão mais natural depois desta, mesmo espírito do "revoke sessions" ter vindo depois do CRUD de Users). Esta story só cria/edita/remove o Grupo EM SI, não sua composição.
- **CRUD de `Role`** — fica pra uma story futura própria (Role tem mais nuance: agrega `Resource`s via herança aditiva, Story 3.1/AD-7 — merece sua própria fatia vertical, não encaixar de lado nesta).
- **`@@unique` de `name` por tenant** — `Group.name` não tem (e não ganha nesta story) uma constraint de unicidade; nenhuma AC/FR exige isso, e `Role`/`Resource` (que SÃO únicos por design, AD-7) são entidades diferentes. Dois Grupos com o mesmo nome no mesmo tenant são permitidos.

### Arquitetura — o que seguir à risca

- **`Group` já existe no schema desde a Story 3.1** (`packages/db/schema.prisma`) — `id`, `tenantId`, `name`, `createdAt`, `updatedAt`, relação M2M implícita com `User` (`_GroupToUser`), e `roleAssignments: RoleAssignment[]`. Esta story NÃO toca no schema — zero migration nova.
- **CASCADE já configurado, não reinventar** — a migration `20260904000000_add_identity_tree` (Story 3.1, revisada pós-review) já tem `_GroupToUser_A_fkey ... ON DELETE CASCADE` e `role_assignments_group_id_fkey ... ON DELETE CASCADE` explícitos. Isso significa que `groups.delete` (Task 2.5) é **só um `deleteMany` no `Group`** — o Postgres cuida do resto. Escrever um `deleteMany` manual pra `RoleAssignment`/a tabela de junção ANTES do delete do Group seria redundante E arriscado (duas fontes de verdade pra uma limpeza que já é garantida pela FK) — não fazer isso.
- **Mesmo padrão `updateMany`/`deleteMany` + `count === 0` → `NOT_FOUND`** já estabelecido em `users.update` (Story 5.1) — nunca `update()`/`delete()` crus, que vazam `P2025` de um jeito que confirma/nega existência cross-tenant pela FORMA do erro.
- **`forTenant` (AD-5)** — toda operação em `groups.*` passa por `forTenant(ctx.user.tenantId)`, nunca o Prisma Client cru. `create` passa `tenantId` explicitamente em `data` (mesmo padrão de `users.create`) — `create` fica FORA do que `forTenant`'s `$allModels` intercepta (não tem `where`), então o `tenantId` tem que vir do caller, não da extensão.
- **`requireAdmin()` é reaproveitado literalmente** (Story 5.1) — nenhuma mudança nele nesta story.

### Testing Standards

- Mesmo split real já documentado na Story 5.1: `adminRouter.*` usa `forTenant` direto — `router.test.ts` continua `DATABASE_URL`-gated (convenção do Épico 3), não fake-only.
- **Task 3.5 é o teste mais importante desta story** — provar que o CASCADE funciona de VERDADE contra Postgres real, não só ler o schema e confiar. Mesma disciplina de "efeito real, não suposição" já aplicada a `revokeAllForUser` (Story 4.2/5.2) e a `refresh` re-derivando `isAdmin` (Story 5.1).
- Validação real de ponta a ponta contra Postgres (sem Mailpit — esta story não envia email) antes de marcar `done`, mesma disciplina desde a Story 3.1.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] — "administrador visualiza, cria, edita, remove e organiza Usuários/Grupos/Papéis... refletindo na árvore em tempo real" (FR-14).
- [Source: packages/db/schema.prisma (Story 3.1)] — `model Group`, `ON DELETE CASCADE` em `_GroupToUser`/`role_assignments.group_id`.
- [Source: _bmad-output/implementation-artifacts/5-1-admin-users-backend.md] — padrão `updateMany`/`forTenant`/anti-enumeração cross-tenant que esta story replica pra `Group`.
- [Source: _bmad-output/implementation-artifacts/5-2-revoke-sessions.md] — padrão de teste de efeito real (não assumir, provar) que esta story replica pro CASCADE.

### Review Findings

Revisão adversarial de 4 camadas (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, Acceptance Auditor) sobre o diff de 2 arquivos (313 linhas) desta story, com `review_mode: full` contra este spec + contexto de 3-1/5-1/5-2.

- [x] [Review][Patch] `createGroupInputSchema`/`updateGroupInputSchema` não têm `.max()` em `name` — todo outro campo de texto livre deste mesmo arquivo (`password`, `newPassword`, `systemHelloInputSchema.name`) tem um limite explícito, exatamente pra evitar aceitar/persistir/ecoar uma string de tamanho arbitrário; `Group.name` ficou de fora [src/scaffolding/templates/shared.ts] — corrigido: `.max(200)` em ambos, mesmo limite de `systemHelloInputSchema.name`.
- [x] [Review][Patch] O teste de CASCADE (`groups.delete limpa RoleAssignment...`) não é à prova de falha de asserção — se um `expect` anterior lançar, a limpeza do `Module` (GLOBAL, sem `tenantId`, nunca tocado pelo `afterEach`) nunca roda, e a linha vaza permanentemente no banco; a limpeza manual de `role` também ficou redundante depois que `cleanupTenant` ganhou `role.deleteMany` no mesmo diff [src/scaffolding/templates/admin.ts] — corrigido: asserções envolvidas em try/finally, `module.delete` com `.catch(() => undefined)` no finally, `role.delete` manual removido (já cuidado por `cleanupTenant`).
- [x] [Review][Patch] O mesmo teste de CASCADE nunca confirma que o `Group` em si foi removido — só verifica que a `RoleAssignment`/associação desapareceram, deixando a asserção mais básica (a linha que `groups.delete` deveria remover) sem cobertura justamente no teste que exercita o cenário não-trivial [src/scaffolding/templates/admin.ts] — corrigido: nova asserção `prisma.group.findUnique(...)` → `null`.
- [x] [Review][Patch] `groups.create` calcula `select: { id: true }` mas descarta o resultado inteiro (sem `return`, sem variável capturando) — o `select` não serve a propósito nenhum, puro código morto [src/scaffolding/templates/admin.ts] — corrigido: `select` removido.
- [x] [Review][Patch] As 4 procedures de `groups.*` têm seu `FORBIDDEN` provado num ÚNICO teste combinado (4 `await expect` sequenciais), em vez de 4 testes separados — a própria Story 5.1 identificou e corrigiu exatamente este padrão no code review ("nada confirmava que o guard estava de fato conectado" em cada procedure individualmente); esta story reintroduz o atalho que aquele review eliminou [src/scaffolding/templates/admin.ts] — corrigido: 4 testes `it()` separados, mesmo padrão de `users.*`.

**Rejeitados:**
- `false` — `groups.create` deveria retornar o `id` do Group criado pro caller: é exatamente o mesmo padrão (mutation sem retorno) já deliberadamente estabelecido em `users.create` (Story 5.1, decisão já tomada e revisada); não é uma regressão desta story.
- `false`/baixo — Falta teste pro caso de `groups.list` com ZERO Groups no tenant: o comportamento (array vazio) depende só de `Prisma.findMany` sem match e `z.array(...)` validando `[]`, ambos comportamentos padrão já maciçamente exercitados em outro lugar — risco real de regressão desprezível pro custo de mais um teste dedicado.

**Deferido:**
- [x] [Review][Defer] Nenhum teste prova que `groups.create`/`groups.update` rejeitam `name` vazio/só-espaços com `BAD_REQUEST` [src/scaffolding/templates/admin.ts] — deferred: mesma lacuna já existe pra `createUserInputSchema`/`updateUserInputSchema` (Story 5.1) em todo o resto deste arquivo — convenção pré-existente do projeto, não introduzida ou agravada por esta story especificamente; revisitar as duas stories juntas se algum dia for endereçado.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- Validação local (`aether-5-3-validate`, sem `DATABASE_URL`): `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 11 arquivos passaram, 2 skipped (13), 73 testes passaram, 33 skipped (106) — 7 testes novos de `groups.*` (FORBIDDEN, isolamento cross-tenant, create/update real, NOT_FOUND uniforme, delete vazio, CASCADE), todos `DATABASE_URL`-gated.
- Validação real (Laboratório Integrit, `tupa-lab`/`ubt-host01`, container `aether-api`): projeto sincronizado via `tar`+`scp`+`docker cp`; banco `aether_5_3_validate` dedicado; migrations já existentes (nenhuma nova nesta story) aplicadas limpo; Mailpit dedicado só pra não deixar a suíte de SMTP falhar por ausência de infraestrutura (esta story não envia email). Com `DATABASE_URL` setado: `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 13 arquivos passaram, 106 testes passaram, 0 skipped — os 23 testes de `admin/router.test.ts` (16 anteriores + 7 novos desta story) todos passaram de verdade contra Postgres real, incluindo o teste de CASCADE (Task 3.5) provando que `groups.delete` limpa `RoleAssignment`/associação `User`↔`Group` sem código de limpeza próprio.
- **Interrupção real durante a validação**: o host do Laboratório ficou inacessível via SSH por ~30+ min (reboot do host compartilhado, confirmado depois por `docker ps` mostrando todos os containers "Up 4 hours") logo após a suíte de testes (Task 4.1/4.3) ter rodado com sucesso, mas ANTES do script de probe dedicado (Task 4.2) rodar. Perguntado ao Boss como proceder — escolheu aguardar a volta do Laboratório em vez de fechar só com a suíte de testes já verde. Confirmado depois que o diretório sincronizado (`/app-5-3`) e o banco `aether_5_3_validate` sobreviveram ao reboot do host (a camada gravável do container e o volume do Postgres persistiram); só o processo do servidor e o container `mailpit-5-3-validate` (efêmero, sem política de restart) precisaram ser recriados.
- Script de probe (`apps/api/src/probe-5-3.ts`, descartável, nunca comitado) rodado via `tsx` contra a API real (porta 3013) depois da volta do Laboratório: login admin, `groups.create`, `groups.update`, associação de membro + `RoleAssignment` direto via Prisma, `groups.delete` — confirma `RoleAssignment` removida via CASCADE e o `User` membro intacto. Todas as 5 validações passaram; só a limpeza do PRÓPRIO script (não produto) bateu no mesmo FK de `refresh_tokens` já visto em scripts de probe anteriores (login do admin emite um refresh token real) — banco inteiro dropado em vez de depurar a ordem de limpeza do script descartável.
- Cleanup pós-validação: servidor finalizado, banco `aether_5_3_validate` dropado, container `mailpit-5-3-validate` removido, diretório sincronizado `/app-5-3` removido do container, projeto `aether-5-3-validate` e tarball de scratch removidos localmente.
- Code review (4 camadas) aplicado + revalidado: 5 patches corrigidos (`.max(200)` em `name` dos schemas de Group; teste de CASCADE agora à prova de falha via try/finally, sem limpeza redundante de `role`; nova asserção confirmando o `Group` em si removido; `select` morto removido de `groups.create`; teste `FORBIDDEN` combinado dividido em 4 testes separados, mesmo padrão de `users.*`). Projeto regenerado (`aether-5-3-review-validate`) localmente: `typecheck`/`lint`/`format:check` limpos, `pnpm test` → 11 arquivos passaram, 2 skipped (13), 73 testes passaram, 36 skipped (109). Revalidado no Laboratório Integrit contra banco dedicado (`aether_5_3_review`) + Mailpit dedicado: `typecheck`/`lint`/`format:check` limpos; `pnpm test` → 13 arquivos passaram, 109 testes passaram, 0 skipped — os 26 testes de `admin/router.test.ts` (23 anteriores + 3 líquidos novos do review) todos passaram de verdade contra Postgres real. Cleanup: banco/Mailpit/diretório removidos do Laboratório; projeto e tarball de scratch removidos localmente.

### Completion Notes List

- Todas as 6 ACs satisfeitas e validadas de ponta a ponta contra Postgres real do Laboratório Integrit, não só contra fakes/mocks — inclusive sobrevivendo a uma queda real de infraestrutura no meio da validação.
- Reaproveitamento total dos padrões já estabelecidos pra `users.*` (Story 5.1): `forTenant`, `updateMany`/`deleteMany` + `count===0` → `NOT_FOUND` uniforme cross-tenant/inexistente, `requireAdmin()` sem modificação.
- Achado confirmado (não corrigido, só validado): a FK `ON DELETE CASCADE` desenhada na Story 3.1 (revisão pós-code-review daquela story) funciona de verdade contra Postgres real — `groups.delete` é literalmente só um `deleteMany` no `Group`, zero lógica de limpeza própria pra `RoleAssignment`/associação `User`↔`Group`, e o teste de efeito real (Task 3.5) + o probe (Task 4.2) provam isso, não só leem o schema e assumem.
- Zero migration nova — todo o schema necessário (`Group`, `RoleAssignment`, CASCADE) já existia desde a Story 3.1.
- Code review levantou um achado real de higiene de teste (não de produto): o próprio teste de CASCADE podia vazar uma linha de `Module` (global, sem `tenantId`) se uma asserção anterior falhasse, já que nada no `afterEach` cobre esse model. Corrigido com try/finally — o mesmo padrão agora serve de referência pra qualquer teste futuro que crie um `Module`/outra entidade global.

### File List

- `src/scaffolding/templates/admin.ts` (M)
- `src/scaffolding/templates/shared.ts` (M)
