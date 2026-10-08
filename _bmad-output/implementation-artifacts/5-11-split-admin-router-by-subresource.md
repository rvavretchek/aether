---
baseline_commit: c368d51009ca08f5b369970194aa2a6cd9801fad
context: [_bmad-output/implementation-artifacts/epic-5-retro-2026-10-07.md]
---

# Story 5.11: Dividir admin.ts por sub-recurso (users/groups/roles/roleAssignments)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como desenvolvedor trabalhando neste gerador (e, por extensão, qualquer agente de IA que precise editar o `core/admin` de um projeto gerado),
eu quero que o router de admin e seus testes sejam divididos em um arquivo por sub-recurso (`users`, `groups`, `roles`, `roleAssignments`), em vez de um único arquivo monolítico,
para que uma mudança futura em UM sub-recurso nunca precise carregar/revisar os ~3000 linhas combinados dos outros três, e para que a duplicação cross-sub-router que a retrospectiva da Epic 5 encontrou (precisamente porque nenhuma review individual via os quatro lado a lado) pare de se repetir por padrão.

Esta é uma refatoração **puramente estrutural** — nenhum comportamento observável muda. É resposta diretamente ao action item #6 da retrospectiva da Epic 5 (`epic-5-retro-2026-10-07.md`), decisão confirmada pelo Boss.

## Acceptance Criteria

1. O projeto GERADO (nunca este repositório gerador em si — ver Dev Notes) passa a ter, dentro de `apps/api/src/core/admin/`: `prisma-errors.ts` (os 3 helpers de código Prisma: `isUniqueConstraintError`, `isRoleInUseError`, `isRecordNotFoundError`), `users.router.ts`, `groups.router.ts`, `roles.router.ts`, `role-assignments.router.ts` (cada um exportando seu sub-router + os helpers que só ELE usa), e `router.ts` reduzido a composição pura: importa os 4 sub-routers + `requireAdmin`, exporta `adminRouter = router({ users: usersRouter, groups: groupsRouter, roles: rolesRouter, roleAssignments: roleAssignmentsRouter })`, nada mais.
2. Os testes seguem a MESMA divisão: `users.router.test.ts`, `groups.router.test.ts`, `roles.router.test.ts`, `role-assignments.router.test.ts`, mais um `admin-test-helpers.ts` compartilhado exportando `cleanupTenant`, `makeAdminCtx`, `makeModuleRoleFixture`, `cleanupModuleRoleFixture`, `csvFormData` — cada arquivo de teste importa desse módulo compartilhado em vez de redefinir os helpers.
3. Comportamento observável idêntico ao de antes da divisão — todo teste que existia antes continua existindo (só move de arquivo) e continua passando, sem nenhuma mudança de asserção, SALVO pelas mudanças mecânicas de import exigidas pela divisão em si.
4. `require-admin.ts`/`require-admin.test.ts` NÃO são tocados por esta story — já são um arquivo próprio, pequeno, nunca fizeram parte do "monólito" que a retro apontou.
5. `assertUserInTenant` (hoje em `groups`) e o ramo `'user'` de `assertAssigneeInTenant` (hoje em `roleAssignments`) continuam como DUAS funções separadas, uma em cada novo arquivo — decisão explícita desta story, não um descuido: unificá-las exigiria um import cross-sub-router (`groups.router.ts` importando de `role-assignments.router.ts` ou vice-versa), o que contradiz o próprio objetivo da divisão (isolar sub-recursos um do outro). Mesma troca já aceita em `updateGroupMembership`/`updateRoleResources` (Story 5.7, "duplicar a FORMA entre dois helpers é aceitável, o que não é aceitável é duplicar a checagem DENTRO do mesmo router"). Documentar essa decisão explicitamente nos Dev Notes — não deixar a pergunta aberta de novo.

## Tasks / Subtasks

- [ ] Task 1: Mapear dependências exatas antes de mover nada (AC: #1, #2)
  - [ ] 1.1 Confirmar contra o `admin.ts` ATUAL (não confiar só nesta story — o arquivo pode ter mudado desde que foi escrita) qual helper é usado por qual sub-router. Mapa conhecido no momento desta story: `isUniqueConstraintError` (P2002) → `users.create/update` E `roles.create/update` (compartilhado); `isRoleInUseError` (P2003) → só `roles.delete`; `isRecordNotFoundError` (P2025) → `groups.addMember/removeMember` E `roles.addResource/removeResource` (compartilhado); `assertUserInTenant`/`updateGroupMembership` → só `groups`; `updateRoleResources`/`assertResourceExists` → só `roles`; `assertAssigneeInTenant` → só `roleAssignments`; `createUserWithSetupEmail`/`ACCOUNT_SETUP_TOKEN_TTL_MS`/`MAX_BULK_IMPORT_ROWS`/`MAX_BULK_IMPORT_BYTES`/`UploadedFormData` → só `users`. Se o mapa real divergir do que está escrito aqui, siga o código real, não esta lista.
- [ ] Task 2: `prisma-errors.ts` (AC: #1)
  - [ ] 2.1 Novo arquivo no template `admin.ts` (nova entrada no `Record` retornado por `buildAdminFiles()`, chave `'src/core/admin/prisma-errors.ts'`): os 3 helpers de código Prisma, com os MESMOS comentários explicativos que já têm hoje (não reescrever a justificativa, só mover).
- [ ] Task 3: `users.router.ts` + `users.router.test.ts` (AC: #1, #2)
  - [ ] 3.1 Mover `ACCOUNT_SETUP_TOKEN_TTL_MS`, `MAX_BULK_IMPORT_ROWS`, `UploadedFormData`, `MAX_BULK_IMPORT_BYTES`, `createUserWithSetupEmail`, e o sub-router `users` inteiro (list/create/bulkImport/update/revokeSessions) pra este arquivo novo. Importa `isUniqueConstraintError`/`isRecordNotFoundError` (se usado) de `./prisma-errors.js`.
  - [ ] 3.2 Mover todos os testes de `users.*` pra `users.router.test.ts`, importando de `./admin-test-helpers.js` (Task 7) em vez de redefinir `cleanupTenant`/`makeAdminCtx`/`csvFormData` localmente.
- [ ] Task 4: `groups.router.ts` + `groups.router.test.ts` (AC: #1, #2, #5)
  - [ ] 4.1 Mover `assertUserInTenant`, `updateGroupMembership`, e o sub-router `groups` inteiro (list/create/update/delete/addMember/removeMember/listMembers). Importa `isRecordNotFoundError` de `./prisma-errors.js`.
  - [ ] 4.2 Mover todos os testes de `groups.*`.
- [ ] Task 5: `roles.router.ts` + `roles.router.test.ts` (AC: #1, #2)
  - [ ] 5.1 Mover `updateRoleResources`, `assertResourceExists`, e o sub-router `roles` inteiro (list/create/update/delete/addResource/removeResource/listResources). Importa `isUniqueConstraintError`/`isRoleInUseError`/`isRecordNotFoundError` de `./prisma-errors.js`.
  - [ ] 5.2 Mover todos os testes de `roles.*`.
- [ ] Task 6: `role-assignments.router.ts` + `role-assignments.router.test.ts` (AC: #1, #2, #5)
  - [ ] 6.1 Mover `assertAssigneeInTenant` e o sub-router `roleAssignments` inteiro (list/create/delete).
  - [ ] 6.2 Mover todos os testes de `roleAssignments.*`.
- [ ] Task 7: `admin-test-helpers.ts` compartilhado (AC: #2)
  - [ ] 7.1 Novo arquivo de teste-helper (não é teste em si, só utilitário importado pelos 4 arquivos de teste): `cleanupTenant`, `makeAdminCtx` (factory — precisa receber `tenantId` como parâmetro agora, já que cada arquivo de teste tem seu PRÓPRIO `beforeEach`/`tenantId`, não um compartilhado), `makeModuleRoleFixture`, `cleanupModuleRoleFixture`, `csvFormData`. Cada um dos 4 arquivos de teste importa daqui em vez de redefinir.
- [ ] Task 8: `router.ts` reduzido a composição (AC: #1)
  - [ ] 8.1 `src/core/admin/router.ts` (template): só os 4 imports de sub-router + `export const adminRouter = router({...})`. Nenhum helper, nenhuma lógica de procedure sobra aqui.
- [ ] Task 9: Validação de equivalência comportamental (AC: #3)
  - [ ] 9.1 Contar os testes ANTES da divisão (rodar a suíte local, anotar o número total) e DEPOIS (mesmo número — nenhum teste perdido, nenhum duplicado). Divergência de contagem é sinal de erro na divisão, não algo a investigar depois.
  - [ ] 9.2 Rodar a suíte completa gerada contra Postgres real (Laboratório Integrit) — mesma disciplina de toda story anterior, mesmo sendo uma refatoração sem mudança de comportamento (a Epic 3 já ensinou que "é só estrutural" não é desculpa pra pular validação real).

## Dev Notes

### 🎯 Onde este código vive

Mesmo padrão de toda story: os Tasks acima editam `src/scaffolding/templates/admin.ts` (o GERADOR — a função `buildAdminFiles()` passa a retornar MAIS chaves no `Record<string,string>`, uma por arquivo novo, em vez das 2 atuais), nunca um projeto gerado diretamente. `src/scaffolding/write-structural-seed.ts` NÃO precisa de nenhuma mudança — já espalha (`prefixKeys('apps/api', buildAdminFiles())`) qualquer conjunto de chaves que `buildAdminFiles()` devolver, sem lista hardcoded de nomes de arquivo (confirmado por leitura direta antes desta story ser escrita).

### ⚠️ Escopo explicitamente cortado desta story

- **Nenhuma mudança de comportamento, nenhuma correção de bug, nenhuma nova feature** — se encontrar algo que parece um bug real durante a divisão, registre em `deferred-work.md` (não corrija inline) e prossiga; misturar refactor com fix dificulta isolar qual mudança causou o quê se algo quebrar.
- **`assertUserInTenant`/`assertAssigneeInTenant` permanecem duas funções separadas** (AC #5) — decisão explícita, não um "ainda não chegamos lá". Não unificar, não importar uma arquivo do outro.
- **Nenhuma mudança na API pública do `adminRouter`** — `apps/web` (se algum dia consumir isto) nunca percebe a diferença; é só reorganização de arquivo, a árvore tRPC (`users`/`groups`/`roles`/`roleAssignments`) continua idêntica.

### Arquitetura — o que seguir à risca

- **`makeAdminCtx` precisa de ajuste de assinatura** — hoje é uma closure sobre a variável `tenantId` do `describe` block externo (`function makeAdminCtx(overrides) { return createTestContext({ user: {..., tenantId, ...}, ...overrides }); }`). Dividido em 4 arquivos, cada um com seu PRÓPRIO `beforeEach`/`tenantId` local, `makeAdminCtx` compartilhado precisa receber `tenantId` explicitamente como primeiro parâmetro (`makeAdminCtx(tenantId, overrides)`) — ajustar TODOS os call sites nos 4 arquivos de teste, não só a definição.
- **Cada um dos 4 novos arquivos de teste precisa do PRÓPRIO `describe.skipIf(!process.env.DATABASE_URL)(...)` com seu PRÓPRIO `beforeEach`/`afterEach` de tenant** — não dá pra compartilhar o describe block em si entre arquivos (Vitest não permite isso), só as FUNÇÕES helper usadas dentro de cada um.
- **Ordem de import em `prisma-errors.ts` não introduz ciclo** — `prisma-errors.ts` não importa nada de nenhum `*.router.ts`; só os sub-routers importam DELE. Confirmar isso explicitamente (um ciclo de import entre módulos TS gerados quebraria de forma confusa, só em runtime).

### Testing Standards

- Task 9.1 (contagem de testes antes/depois) é o guard-rail mais importante desta story — uma refatoração mecânica que "esquece" de mover um `it(...)` é silenciosa até alguém notar a cobertura faltando.

### References

- [Source: _bmad-output/implementation-artifacts/epic-5-retro-2026-10-07.md#Action items] — item #6 (decisão do Boss, confirmada) e a análise de god-file que motivou o item.
- [Source: src/scaffolding/write-structural-seed.ts] — confirma que nenhuma mudança é necessária aqui (`buildAdminFiles()` já é espalhado sem lista hardcoded de nomes).
- [Source: src/scaffolding/templates/admin.ts] — estado atual completo a dividir; ler o arquivo INTEIRO antes de começar (não confiar só no mapa de dependências do Task 1, confirmar contra o código real).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
