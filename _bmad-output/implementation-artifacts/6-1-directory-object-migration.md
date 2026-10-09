---
baseline_commit: 39c89cb06cb9518a3f1a0e14fea624c0314b249a
context: [_bmad-output/planning-artifacts/architecture/architecture-Aether-2026-08-14/ARCHITECTURE-SPINE.md, docs/aether-tecton-compatibility.md, _bmad-output/implementation-artifacts/5-11-split-admin-router-by-subresource.md, _bmad-output/implementation-artifacts/5-10-role-name-uniqueness.md]
---

# Story 6.1: Migração de User/Group/Role para DirectoryObject (Class Table Inheritance)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como framework,
eu quero que Usuário, Grupo e Papel deixem de ser modelos Prisma concretos independentes e passem a compartilhar uma identidade genérica (`DirectoryObject`) com extensão tipada por classe,
para que o core de identidade do Aether siga o mesmo padrão "domínio = classe de objeto" do Tecton (projeto irmão), preservando as garantias reais de banco (unicidade/FK/índice) que o Tecton não preserva, e reduzindo o custo de adicionar um tipo administrável novo no futuro.

Esta story implementa a AD-11 e a AD-12 da Architecture Spine (atualizadas em 2026-10-09) de uma vez só — **decisão explícita do Boss: sem quebra por sub-recurso**, diferente do padrão de stories pequenas usado na Epic 5. É uma reescrita **puramente arquitetural**: nenhuma feature nova, nenhuma Acceptance Criteria da Epic 5 (FR14/FR15) muda de comportamento do ponto de vista de QUEM PODE FAZER O QUÊ — só a forma física de como isso é persistido e servido.

## Acceptance Criteria

1. O schema Prisma ganha `DirectoryObject` (tabela base: `id` UUID v7, `tenantId`, `objectClass` enum fechado `User | Group | Role`, `createdAt`/`updatedAt`, `@@unique([id, objectClass])`) e três tabelas de extensão — `User`, `Group`, `Role` — cada uma com **PK própria** (não compartilhada com `DirectoryObject`), uma coluna `directoryObjectId @unique` com FK pra `DirectoryObject.id`, e `tenantId` **denormalizado** (duplicado, mesmo padrão já usado em `RefreshToken`/`PasswordResetToken`). `Role.name` mantém `@@unique([tenantId, name])` (Story 5.10); `User.email` mantém `@@unique([tenantId, email])`; `Group.name` continua sem unicidade (Story 5.3) — todas na tabela de extensão agora, não mais no modelo raiz.
2. Criar um Usuário/Grupo/Papel sempre cria as DUAS linhas (`DirectoryObject` + extensão) numa única transação Prisma (`$transaction`), nessa ordem — base primeiro. Deletar sempre acontece pela linha base (`DirectoryObject`), com `ON DELETE CASCADE` pra extensão — nenhuma procedure cria ou deleta só a extensão isoladamente.
3. `RoleAssignment.userId`/`RoleAssignment.groupId` (duas colunas nullable, Story 5.5) são substituídas por `subjectId` (não-nulo) + `subjectObjectClass` (não-nulo, denormalizado), com FK composta `(subjectId, subjectObjectClass) → DirectoryObject(id, objectClass)` e `CHECK (subject_object_class IN ('User', 'Group'))`. A CHECK antiga (`role_assignments_assignee_check`, XOR entre `user_id`/`group_id`) deixa de existir — não se aplica mais, já que agora existe só UMA coluna de subject, sempre obrigatória (o problema que ela resolvia — "nem os dois nulos, nem os dois preenchidos" — some estruturalmente). `onDelete: Cascade` em `subjectId → DirectoryObject.id`, mesmo comportamento que `role_assignments_group_id_fkey` já tem hoje.
4. O contrato público das procedures tRPC (`users.*`, `groups.*`, `roles.*`) **não muda** — mesmos nomes de procedure, mesmos inputs/outputs observáveis pra quem já as chama (não há consumidor real hoje, mas a disciplina de não quebrar contrato sem motivo se mantém). A ÚNICA exceção deliberada: `roleAssignments.create`/`roleAssignments.list` trocam o input `{ assigneeType: 'user' | 'group', userId? , groupId? }` (discriminated union) por `{ subjectId: string, subjectObjectClass: 'User' | 'Group' }` (shape flat, reflete o novo modelo diretamente) — decisão explícita desta story (ver Dev Notes), já que não existe consumidor real hoje que dependa do shape antigo.
5. Toda extensão (`User`/`Group`/`Role`) ganha uma coluna `attributes JSONB` — schema-ready, nunca lida/escrita por nenhuma procedure nesta story (nenhuma AC exige isso ainda).
6. Nenhuma migração de dados reais é necessária — a migration nova faz `DROP` das tabelas antigas (`users`, `groups`, `roles`, e as colunas `user_id`/`group_id`+a CHECK antiga de `role_assignments`) e `CREATE` da forma nova, sem backfill (decisão já registrada: MVP sem alvo de produção, AD-9, nenhum dado real a preservar).
7. Toda a suíte de testes da Epic 5 pro `core/admin` (hoje 170 testes reais contra Postgres, distribuídos em `users.router.test.ts`/`groups.router.test.ts`/`roles.router.test.ts`/`role-assignments.router.test.ts`) continua cobrindo os MESMOS cenários — mesma contagem de testes ou mais, nunca menos. Nenhum cenário já coberto (idempotência de M2M, isolamento cross-tenant, NOT_FOUND vs. FORBIDDEN, CONFLICT de nome duplicado, bulk import, etc.) pode regredir ou desaparecer silenciosamente.

## Tasks / Subtasks

- [ ] Task 1: Schema + migration (AC: #1, #2, #3, #5, #6)
  - [ ] 1.1 `packages/db/schema.prisma` (template `db.ts`): novo enum `DirectoryObjectClass { User Group Role }` (mesmo padrão de `ResourceKind`, já existente). Novo model `DirectoryObject` (`id` UUID v7, `tenantId`, `objectClass DirectoryObjectClass`, `createdAt`/`updatedAt`, relação `tenant`, `@@unique([id, objectClass])`, `@@map("directory_objects")`).
  - [ ] 1.2 Reescrever `User`: `id` UUID v7 própria, `directoryObjectId String @unique`, relação 1:1 `directoryObject DirectoryObject @relation(fields: [directoryObjectId], references: [id], onDelete: Cascade)`, `tenantId` denormalizado, `email`, `passwordHash`, `isAdmin`, `createdAt`/`updatedAt`, `@@unique([tenantId, email])`. Relações existentes (`refreshTokens`, `passwordResetTokens`, `groups` M2M) preservadas sem mudança de forma.
  - [ ] 1.3 Reescrever `Group`: mesmo padrão de 1.2 — `id` própria, `directoryObjectId @unique`, `tenantId` denormalizado, `name` (sem unique), relação `users` M2M preservada.
  - [ ] 1.4 Reescrever `Role`: mesmo padrão — `id` própria, `directoryObjectId @unique`, `tenantId` denormalizado, `name` com `@@unique([tenantId, name])`, relação `resources` M2M preservada.
  - [ ] 1.5 Reescrever `RoleAssignment`: remover `userId`/`groupId`; adicionar `subjectId String` + `subjectObjectClass DirectoryObjectClass`; relação composta pro `DirectoryObject` via `@relation(fields: [subjectId, subjectObjectClass], references: [id, objectClass], onDelete: Cascade)`. `roleId`/`targetModuleId` sem mudança estrutural.
  - [ ] 1.6 Nova migration (`migrations/<novo-timestamp>_directory_object_migration/migration.sql`, template `db.ts`): `DROP TABLE` das tabelas antigas (`users`, `groups`, `roles` — cuidado com a ordem de FK, `role_assignments` referencia as três, então ajustar/recriar `role_assignments` junto); `CREATE TYPE "DirectoryObjectClass"`; `CREATE TABLE "directory_objects"`; `CREATE TABLE "users"/"groups"/"roles"` na forma nova (cada uma com `directory_object_id` único + FK CASCADE); `ALTER TABLE "role_assignments"` trocando `user_id`/`group_id` por `subject_id`/`subject_object_class`, dropando a CHECK antiga (`role_assignments_assignee_check`) e adicionando a nova (`CHECK (subject_object_class IN ('User', 'Group'))`) + a FK composta. Sem script de backfill — `DROP`+`CREATE` direto (AC #6).
- [ ] Task 2: Módulo compartilhado `directory-object-helpers.ts` (AC: #2)
  - [ ] 2.1 Novo arquivo no template `admin.ts` (nova chave em `buildAdminFiles()`, ao lado de `prisma-errors.ts`/`admin-test-helpers.ts`): função genérica `createDirectoryObjectWithExtension<T>(db, tenantId, objectClass, extensionWrite: (directoryObjectId: string) => Promise<T>): Promise<T>` — abre a `$transaction`, cria a linha `DirectoryObject` primeiro, chama `extensionWrite(directoryObject.id)` dentro da MESMA transação pra criar a linha de extensão. Reaproveitada por `users.router.ts`/`groups.router.ts`/`roles.router.ts` — é a ÚNICA forma de criar um objeto administrável, nenhuma procedure monta a transação à mão. Esta é a peça que fecha o achado do Reviewer Gate da Architecture Spine (mecanismo de criação não ficar implícito/divergente entre sub-routers).
  - [ ] 2.2 Função genérica `assertSubjectInTenant(db, subjectId, subjectObjectClass): Promise<void>` — substitui `assertUserInTenant`/`assertAssigneeInTenant` (duas funções quase-idênticas que a Story 5.11 manteve separadas de propósito, por não existir ainda um módulo compartilhado legítimo pra elas). Agora existe um módulo compartilhado de verdade (este arquivo), então a duplicação deixa de ser aceitável — unificar é a decisão certa aqui, diferente da Story 5.11 (ler Dev Notes pra o racional completo).
- [ ] Task 3: `users.router.ts` (AC: #1, #2, #4)
  - [ ] 3.1 `users.create`/`users.bulkImport`'s `createUserWithSetupEmail`: reescrito pra usar `createDirectoryObjectWithExtension` (Task 2.1) em vez de `db.user.create` direto. Mapeamento de erro de duplicata (`isUniqueConstraintError`) continua igual — P2002 ainda é P2002, só a tabela que o dispara mudou (extensão `User`, não mais o modelo raiz).
  - [ ] 3.2 `users.list`/`users.update`/`users.revokeSessions`: ajustar queries pra forma nova (`db.user.findMany`/`updateMany` continuam funcionando quase iguais — `forTenant`'s `$allModels` cobre a extensão automaticamente, só o `tenantId` denormalizado precisa estar presente nas linhas, já garantido pelo Task 1.2).
- [ ] Task 4: `groups.router.ts` (AC: #1, #2, #4)
  - [ ] 4.1 `groups.create`/`update`/`delete`/`addMember`/`removeMember`/`listMembers`: mesmo padrão do Task 3 — `create` via `createDirectoryObjectWithExtension`, resto ajustado pra forma nova. `updateGroupMembership` (helper já existente) continua local a este arquivo — M2M `User↔Group` não muda de forma, só os tipos das tabelas nas pontas.
  - [ ] 4.2 Qualquer chamada a `assertUserInTenant` neste arquivo passa a chamar `assertSubjectInTenant(db, userId, 'User')` (Task 2.2).
- [ ] Task 5: `roles.router.ts` (AC: #1, #2, #4)
  - [ ] 5.1 `roles.create`/`update`/`delete`/`addResource`/`removeResource`/`listResources`: mesmo padrão — `create` via `createDirectoryObjectWithExtension`, `isUniqueConstraintError`/`isRoleInUseError` continuam válidos (códigos de erro do Postgres não mudam). `updateRoleResources`/`assertResourceExists` continuam locais — Role↔Resource M2M não muda de forma.
- [ ] Task 6: `role-assignments.router.ts` + `shared.ts` (AC: #3, #4)
  - [ ] 6.1 `packages/shared/src/schemas/admin.ts` (template `shared.ts`): `createRoleAssignmentInputSchema`/`listRoleAssignmentsInputSchema` trocam de `z.discriminatedUnion('assigneeType', [...])` pra `z.object({ subjectId: z.string().min(1), subjectObjectClass: z.enum(['User', 'Group']), roleId: ..., targetModuleId: ... })` (AC #4 — mudança deliberada de contrato, sem shim de compatibilidade).
  - [ ] 6.2 `role-assignments.router.ts`: `assertAssigneeInTenant` removida, chamadas trocadas por `assertSubjectInTenant` (Task 2.2). `create` grava `subjectId`/`subjectObjectClass` direto (nunca mais o `userId ? ... : undefined` condicional). `list`'s `where` vira `{ subjectId: input.subjectId, subjectObjectClass: input.subjectObjectClass }` — sem mais o `input.assigneeType === 'user' ? ... : ...` condicional.
- [ ] Task 7: `admin-test-helpers.ts` (AC: #7)
  - [ ] 7.1 `makeAdminCtx`/`cleanupTenant`/`makeModuleRoleFixture`/`cleanupModuleRoleFixture`/`csvFormData` ajustados pra forma nova onde tocam User/Group/Role/RoleAssignment diretamente via Prisma cru nos testes (ex.: fixtures que hoje fazem `prisma.role.create({ data: { tenantId, name } })` direto passam a precisar criar a `DirectoryObject` junto — considerar um helper de teste `createTestDirectoryObjectExtension(objectClass, extensionData)` local a este arquivo, só pra uso em fixture, se isso reduzir repetição nos 4 arquivos de teste).
- [ ] Task 8: Reescrever os 4 arquivos de teste (AC: #7)
  - [ ] 8.1 Contar os testes ANTES de tocar em qualquer um (mesma disciplina da Story 5.11, Task 9.1) — 170 testes hoje (confirmar número exato rodando a suíte local antes de começar). Cada teste existente é adaptado pra forma nova (fixtures via `DirectoryObject`+extensão, `RoleAssignment` via `subjectId`/`subjectObjectClass`) — NENHUM cenário é removido ou simplificado só porque a forma do schema mudou. Contagem final igual ou maior, nunca menor.
  - [ ] 8.2 Testes de `roles.create`/`roles.update` sobre duplicata de nome (Story 5.10) continuam provando a mesma coisa: `CONFLICT` com a mensagem exata, nome repetido rejeitado no mesmo tenant, aceito em tenant diferente — agora contra a tabela de extensão `Role`.
  - [ ] 8.3 Novo teste (não existia antes, cenário novo desta story): tentar inserir um `RoleAssignment` com `subjectObjectClass` fora de `('User', 'Group')` direto via Prisma cru (bypassando a validação Zod) deve falhar com a CHECK constraint do banco — prova que a garantia é real (banco), não só de aplicação (AC #3, ponto central desta migração).
- [ ] Task 9: Validação (AC: todas)
  - [ ] 9.1 `pnpm typecheck`/`lint`/`format:check`/`test` do gerador em si, limpos.
  - [ ] 9.2 Harness da Story 5.9 (`validate-scaffold.ts`) local, sem `--database-url` — scaffold/typecheck/lint/format/test do projeto gerado.
  - [ ] 9.3 Validação real no Laboratório Integrit via o mesmo harness com `--database-url` (+ `SMTP_HOST` exportado antes, mesma lição da Story 5.10) — migration nova aplicada de verdade contra Postgres, suíte inteira (170+ testes) passando contra banco real.

## Dev Notes

### 🎯 Onde este código vive

Mesmo padrão de toda story desde a 1.1: os Tasks acima editam `src/scaffolding/templates/db.ts`/`admin.ts`/`shared.ts` (o GERADOR), nunca um projeto gerado diretamente.

### ⚠️ Escopo explicitamente cortado desta story

- **Nenhuma UI** — mesmo corte de toda a Epic 5. A retomada do UX do admin (sessão que motivou esta migração) continua pausada até esta story terminar — o `EXPERIENCE.md` do Aether depende de saber a forma real dos objetos, que só fica estável depois desta story.
- **`Module` fica fora** — não é objeto genérico (AD-11), é código real gerado por `generate module`. Nenhuma mudança em `Module`/`ModuleClosure`/`Resource`.
- **Nenhum mecanismo de geração automática** (`generate directory-object` ou similar) — Deferred explícito na Architecture Spine. Adicionar um `objectClass` novo no futuro (ex.: Custodiante) continua trabalho manual, só mais barato que hoje.
- **`attributes JSONB` schema-ready, nunca populado** — nenhuma procedure lê/escreve essa coluna nesta story.

### Arquitetura — o que seguir à risca

- **AD-11/AD-12 são a fonte de verdade desta story** — ler a Architecture Spine inteira (seções AD-11, AD-12, a nota de reconciliação logo após o ERD, e o ERD em si) antes de escrever qualquer linha de schema. Não reinventar a forma a partir do zero.
- **PK própria por extensão, nunca PK compartilhada** — achado do Reviewer Gate da própria spine (2026-10-09): PK compartilhada com `DirectoryObject.id` deixa ambíguo COMO o id é gerado (client vs. transação interativa) e não garante "só uma linha de extensão por objeto" no banco. `directoryObjectId @unique` resolve as duas coisas.
- **`tenantId` denormalizado em toda extensão, não só em `DirectoryObject`** — sem isso, as `@@unique([tenantId, ...])` da AC #1 são literalmente inexprimíveis. Mesmo padrão já aceito em `RefreshToken`/`PasswordResetToken` desde a Story 2.1/4.2 — não pedir permissão de novo, só aplicar.
- **`forTenant`'s `$allModels` já cobre as extensões automaticamente** — a extensão de tenant (AD-5, Story 3.1) não lista model por model (achado da Story 3.3), então `User`/`Group`/`Role` como tabelas de extensão são cobertas sem nenhuma configuração adicional em `extensions/tenant.ts`. Não tocar nesse arquivo.
- **Padrão de leitura único (achado do Reviewer Gate)**: operação ESPECÍFICA de tipo (listar Papéis, validar nome) sempre começa pela tabela de EXTENSÃO; operação GENÉRICA (resolver assignee, árvore) sempre começa por `DirectoryObject` + `objectClass`. Os dois padrões nunca se misturam dentro do mesmo tipo de operação — ver AD-11 pro texto completo.
- **A CHECK antiga (`role_assignments_assignee_check`) não é "atualizada", é REMOVIDA e substituída por uma de propósito diferente** — a antiga resolvia "exatamente uma de duas colunas nullable preenchida" (problema que deixa de existir com uma única coluna `subjectId` não-nula); a nova (`subject_object_class IN (...)`) resolve "só User ou Group podem ser assignee", um problema diferente que a FK polimórfica sozinha não cobria. Não tentar portar a lógica XOR antiga — ela não faz mais sentido na forma nova.
- **`onDelete: Cascade` em `subjectId → DirectoryObject.id`** — mesmo comportamento que `role_assignments_group_id_fkey` já tem hoje (deletar o Grupo limpa as atribuições dele). Deletar um User hoje não é uma feature que existe (action item aberto da retro da Epic 5) — o Cascade cobre o caso quando/se `users.delete` for construído no futuro, sem precisar revisitar este schema de novo.
- **Decisão de unificar `assertUserInTenant`/`assertAssigneeInTenant` (Task 2.2) contradiz a decisão explícita da Story 5.11 (AC #5) — e está certa em contradizer.** A Story 5.11 manteve as duas funções separadas porque unificá-las exigiria um import cross-sub-router sem nenhum módulo compartilhado legítimo pra abrigar a versão unificada. Esta story CRIA esse módulo (`directory-object-helpers.ts`, Task 2) pra outro propósito (a transação de criação) — unificar a checagem de "objeto existe no tenant" ali é a consequência natural, não um desvio. Documentar isso explicitamente no código (comentário no helper unificado), pra não parecer uma reversão arbitrária de uma decisão anterior.

### Testing Standards

- Mesmo padrão `DATABASE_URL`-gated de toda `*.router.test.ts` desde a Story 5.1.
- **Task 8.1 é o guard-rail mais importante desta story** (mesmo princípio da Task 9.1 da Story 5.11) — uma migração que "esquece" de portar um cenário de teste é silenciosa até alguém notar a cobertura faltando. Contar antes, contar depois, mesmo número ou mais.
- Nunca mockar a transação de criação (`createDirectoryObjectWithExtension`) — os testes validam o EFEITO real (as duas linhas existem, ligadas, com os dados certos), nunca só que a função foi chamada.

### References

- [Source: _bmad-output/planning-artifacts/architecture/architecture-Aether-2026-08-14/ARCHITECTURE-SPINE.md#AD-11, #AD-12] — forma física completa, decidida e revisada pelo Reviewer Gate em 2026-10-09.
- [Source: docs/aether-tecton-compatibility.md] — motivação completa da migração, decisões do Boss de 2026-10-08.
- [Source: src/scaffolding/templates/db.ts#RoleAssignment] — `role_assignments_assignee_check` original (linha ~593 no momento desta story) — ler antes de escrever a CHECK nova, pra não confundir os dois propósitos.
- [Source: _bmad-output/implementation-artifacts/5-11-split-admin-router-by-subresource.md] — racional original de MANTER `assertUserInTenant`/`assertAssigneeInTenant` separadas; esta story documenta por que essa decisão muda agora.
- [Source: _bmad-output/implementation-artifacts/5-10-role-name-uniqueness.md] — `isUniqueConstraintError`/`@@unique([tenantId, name])` em Role, preservados nesta migração.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
