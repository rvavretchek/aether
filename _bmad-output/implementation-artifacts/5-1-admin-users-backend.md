---
baseline_commit: 63b035de0a9ef1d328b1e5d21dd4738d7e4964e7
context: [_bmad-output/implementation-artifacts/2-1-login-jwt-refresh.md, _bmad-output/implementation-artifacts/3-1-identity-tree-enforcement.md, _bmad-output/implementation-artifacts/4-2-password-reset.md]
---

# Story 5.1: Conceito de admin (`isAdmin` no JWT) + CRUD backend de Usuários

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como administrador de um Tenant,
eu quero listar, criar e editar Usuários através de procedures tRPC protegidas por uma checagem de admin,
para que a Epic 5 tenha uma base backend sólida (autorização + CRUD real) sobre a qual as telas de administração (FR-14) serão construídas numa story futura, depois de uma decisão de UI/UX.

## Acceptance Criteria

1. `User` ganha a coluna `isAdmin` (boolean, default `false`) — um admin é escopado ao próprio Tenant (não é um superusuário cross-tenant).
2. `isAdmin` propaga via o access token JWT (claim assinado) — `login` emite com o valor atual do banco; `refresh` RE-DERIVA de uma consulta fresca ao `User` (nunca confia num claim antigo do refresh token) — garante que revogar `isAdmin` de alguém se reflete no próximo `refresh`, não só no próximo `login`. Sem round-trip extra de banco em requests autenticados comuns (o claim já vem decodificado de `verifyToken`).
3. Novo middleware `requireAdmin` (`core/admin`) — default-deny: `UNAUTHORIZED` se não autenticado, `FORBIDDEN` se autenticado mas `isAdmin !== true`. Checagem pura sobre `ctx.user`, sem consulta a banco.
4. `admin.users.list` — lista os `User`s do PRÓPRIO Tenant do admin (via `forTenant`, nunca cross-tenant), protegida por `requireAdmin`.
5. `admin.users.create` — cria um `User` novo no Tenant do admin, SEM senha usável ainda (hash de um valor aleatório de alta entropia, nunca uma senha real) — emite um token de configuração via o MESMO `PasswordResetTokenStore` (Epic 4) e envia um email usando um novo template `account-setup` (extensão da union `EmailMessage`, já antecipada nos Dev Notes da Story 4.1 — "o `welcome` é acrescentado depois só como um novo membro do tipo").
6. `admin.users.update` — edita o email de um `User` existente do próprio Tenant do admin.
7. As 3 procedures (`list`/`create`/`update`) são protegidas por `requireAdmin` — nenhuma acessível por um usuário autenticado comum (`isAdmin: false`).
8. `pnpm typecheck`/`lint`/`format:check`/`test` passam limpos no projeto GERADO. Validado de ponta a ponta contra Postgres + Mailpit reais (mesma disciplina de todo o projeto): `isAdmin` revogado reflete no próximo `refresh`; `admin.users.create` envia um email `account-setup` real, capturado pelo Mailpit; o `User` criado consegue completar a configuração de senha via `resetPassword` (Story 4.2) reaproveitado sem modificação.

## Tasks / Subtasks

- [x] Task 1: Schema Prisma — `User.isAdmin` (AC: #1)
  - [x] 1.1 `packages/db/schema.prisma`: `User` ganha `isAdmin Boolean @default(false) @map("is_admin")`.
  - [x] 1.2 Migration `packages/db/migrations/20261002000100_add_user_is_admin/migration.sql` (renomeada de `20261003000000` pro code review — achado real: estava datada um dia adiante da data real do repositório).
- [x] Task 2: Propagar `isAdmin` pelo JWT (AC: #2)
  - [x] 2.1 `auth-provider.ts`: `AuthenticatedUser`/`VerifiedToken` ganham `isAdmin: boolean`.
  - [x] 2.2 `user-lookup.ts`: `UserRecord` ganha `isAdmin: boolean`; `findUnique` estendido pra aceitar `{ id }` também (não só `{ tenantId_email }`), usado por `findUserById`.
  - [x] 2.3 `argon2-auth-provider.ts`: `authenticate()`/`findUserByEmail()` retornam `isAdmin`. Novo `findUserById(userId)`.
  - [x] 2.4 `router.ts`: `signAccessToken` ganha `isAdmin: boolean`. `login` passa `user.isAdmin`. `refresh` chama `ctx.authProvider.findUserById(subject.userId)` ANTES de assinar o novo access token (404/deletado → `UNAUTHORIZED`).
  - [x] 2.5 `verifyToken()` decodifica/valida `payload.isAdmin` como `boolean` — token antigo sem essa claim agora é rejeitado (achado real, testado explicitamente: "token válido sem claim isAdmin... retorna null").
  - [x] 2.6 `context.ts`: tipo de `ctx.user` já reflete `isAdmin` automaticamente.
  - **Achados reais corrigidos durante a validação**: 2 testes pré-existentes quebraram de verdade (não só por tipo, por comportamento) — `refresh` (Story 2.1) não sobrescrevia `authProvider` no teste, então passou a usar o provider REAL (Postgres real, sem `DATABASE_URL` no ambiente de teste local) assim que `refresh` ganhou a chamada a `findUserById`; corrigido injetando `makeFakeAuthProvider()`. E o teste de `verifyToken` (Story 2.1) assinava um JWT sem `isAdmin`, que agora é rejeitado por construção — corrigido pra assinar com `isAdmin` E um novo teste dedicado provando a rejeição do formato antigo.
- [x] Task 3: Middleware `requireAdmin` (AC: #3)
  - [x] 3.1 `apps/api/src/core/admin/require-admin.ts`: middleware tRPC — `UNAUTHORIZED` se `!ctx.user`, `FORBIDDEN` se `!ctx.user.isAdmin`. Checagem pura, sem consulta a banco.
- [x] Task 4: Template de email `account-setup` (AC: #5)
  - [x] 4.1 `EmailMessage` ganha `AccountSetupEmail`.
  - [x] 4.2 `renderTemplate`: novo `case 'account-setup':`.
- [x] Task 5: `adminRouter` — `users.list`/`users.create`/`users.update` (AC: #4, #5, #6, #7)
  - [x] 5.1 `apps/api/src/core/admin/router.ts`: `adminRouter = router({ users: router({ list, create, update }) })`. Todas as 3 procedures com `.use(requireAdmin())`.
  - [x] 5.2 `list`: `forTenant(ctx.user.tenantId).user.findMany({ select: { id, email, isAdmin, createdAt } })` — nunca expõe `passwordHash`.
  - [x] 5.3 `create`: hash de placeholder via `ctx.authProvider.hash(randomBytes(32).toString('base64url'))`; cria o `User`; emite token via `ctx.passwordResetTokenStore.issue(...)`; envia email `account-setup`.
  - [x] 5.4 `update`: **refinamento feito durante a implementação** — usa `updateMany` (não `update`), checando `result.count === 0` pra `NOT_FOUND`, em vez de deixar o P2025 do Prisma vazar — nunca confirma/nega existência cross-tenant via a FORMA do erro (mesmo princípio anti-enumeração já aplicado em login/password-reset, aplicado aqui à fronteira de tenant).
  - [x] 5.5 `root-router.ts`: monta `admin: adminRouter`.
- [x] Task 6: Schemas Zod compartilhados (AC: #4, #5, #6)
  - [x] 6.1 `packages/shared/src/schemas/admin.ts`: `listUsersOutputSchema`, `createUserInputSchema`, `updateUserInputSchema`.
- [x] Task 7: Testes (AC: #2, #3, #7, #8)
  - [x] 7.1 `argon2-auth-provider.test.ts`: `findUserById` (existe/não existe), `authenticate`/`findUserByEmail` retornando `isAdmin` corretamente.
  - [x] 7.2 `router.test.ts` (auth): `login` emite JWT com `isAdmin` certo (já coberto pelos testes existentes, que agora checam `isAdmin`). Novo teste decodifica o JWT de verdade (`jose.jwtVerify`) em dois `refresh()` sucessivos no MESMO ctx — prova real que `isAdmin` muda entre as duas chamadas (não um spy de `revokeAllForUser` como na Story 4.2, mas o mesmo princípio: EFEITO real, não só "o método foi chamado"). `refresh` falha se o usuário foi deletado.
  - [x] 7.3 `require-admin.test.ts`: sem `ctx.user` → `UNAUTHORIZED`; `isAdmin: false` → `FORBIDDEN`; `isAdmin: true` → passa.
  - [x] 7.4 `router.test.ts` (admin, `DATABASE_URL`-gated): `list` nunca cruza tenant + rejeita sem admin; `create` nunca aceita senha, emite token e envia email real-shaped; `update` edita no próprio tenant e nunca cruza tenant (`NOT_FOUND`).
- [x] Task 8: Validação real de ponta a ponta (AC: #8)
  - [x] 8.1 Projeto gerado + migration aplicada contra Postgres real + Mailpit real (Laboratório Integrit, sem Docker local).
  - [x] 8.2 Script de probe: cria um admin de verdade (`isAdmin: true` via SQL direto, já que ainda não há UI/procedure pra promover alguém — ver Dev Notes), loga, cria um `User` via `admin.users.create`, confirma o email `account-setup` real no Mailpit, extrai o token, completa a configuração via `resetPassword` (Story 4.2, reaproveitado), loga com a nova senha. Confirma também que revogar `isAdmin` via SQL direto se reflete no próximo `refresh` (403 em `admin.users.list` depois).
  - [x] 8.3 `pnpm typecheck`/`lint`/`format:check`/`test` limpos; Debug Log/Completion Notes atualizados.

## Dev Notes

### 🎯 Onde este código realmente vive

Tudo em `apps/api/src/core/admin/...`/`packages/shared/src/schemas/admin.ts` nos Tasks acima é o caminho DENTRO do projeto que `aether-admin new` gera — o trabalho real é editar os templates deste repositório (`src/scaffolding/templates/auth.ts`, novo `admin.ts`, `db.ts`, `shared.ts`, `write-structural-seed.ts`).

### ⚠️ Escopo explicitamente cortado desta story

- **Nenhuma tela de admin (FR-14 UI)** — decisão do Boss: a Architecture Spine já marca a convenção de componentes/UI pras telas de admin como decisão aberta ("sem artefato de UX alimentando esta spine ainda; não travar isso sem input de design"). Esta story entrega só o backend; a UI fica pra uma story futura, depois de uma sessão de UX/design ou de uma decisão pragmática de biblioteca de UI.
- **Groups/Roles/atribuições (resto da FR-14)** — só `User` nesta story. Groups/Roles/atribuição de Papel sobre Módulo ficam pra stories futuras do Épico 5, seguindo o mesmo padrão de fatia vertical.
- **Revogar sessões de um Usuário pela tela (FR-14, "o admin pode revogar as sessões ativas de um Usuário")** — o MECANISMO já existe (`TokenRevocationStore.revokeAllForUser`, Story 4.2); só falta uma procedure `admin.users.revokeSessions` chamando ele. Deixado de fora desta story por foco (schema+JWT+CRUD básico já é bastante), mas é a extensão mais natural da próxima story — só reaproveitar o método já pronto.
- **FR-15 (import em lote via CSV)** — story futura própria; o mecanismo de token de configuração que esta story usa (`PasswordResetTokenStore` + template `account-setup`) é EXATAMENTE o que a Epic 5/FR-15 reaproveita, por design.
- **Nenhuma procedure pra PROMOVER alguém a admin** — como virar o PRIMEIRO admin de um tenant? Nenhuma AC desta story resolve isso (seria um problema de bootstrap/seed, não de CRUD). Pra validação real (Task 8), promover via `UPDATE users SET is_admin = true` direto no Postgres é aceitável (é infraestrutura de teste, não um caminho de produto) — mas isso é uma lacuna real do produto que uma story futura (ex.: seed inicial do Tenant, ou um comando `aether-admin`) precisa fechar. Documentar como achado se o code review concordar.

### Arquitetura — o que seguir à risca

- **Claim no JWT, não round-trip de banco**: `isAdmin` é decodificado do próprio access token (como `sub`/`tenantId` já são) — `requireAdmin` nunca consulta o banco. Isso é uma escolha de design desta story (não ditada por nenhuma AD existente), mas segue o mesmo espírito de eficiência de AD-8.
- **`refresh` RE-DERIVA, nunca confia no claim antigo** — é a parte mais sutil e mais fácil de fazer errado desta story. Se `refresh` só reemitisse o `isAdmin` que já estava no payload anterior (ou copiasse de `TokenSubject`, que não carrega isso), revogar admin de alguém nunca teria efeito prático até o refresh token em si expirar (até 30 dias!). `findUserById` dentro de `refresh` é o que fecha esse gap — mesma preocupação de "claim fresco, não cacheado" que já levou a `getSubject`/`isRevoked` serem consultas únicas sem TOCTOU (Story 2.1).
- **AD-5 (isolamento de tenant)**: `admin.users.*` usa `forTenant(ctx.user.tenantId)` — um admin só vê/edita o PRÓPRIO tenant, nunca cross-tenant (não é um superusuário de plataforma).
- **Senha placeholder, nunca nullable**: `User.passwordHash` continua `NOT NULL` (sem mudança de schema) — `create()` gera um hash de um valor aleatório de alta entropia via `AuthProvider.hash()` (mesma função já existente), garantindo que a coluna sempre tem um valor válido de Argon2id, mas de uma senha que ninguém conhece/pode usar até a configuração real via `resetPassword`.
- **Reaproveitamento total do mecanismo de token da Epic 4** — `PasswordResetTokenStore.issue`/`consume` e a procedure `resetPassword` (Story 4.2) são usados SEM NENHUMA modificação. A única coisa nova é o email usar o template `account-setup` em vez de `password-reset` — a PORTA de token em si já era desenhada pra isso (ver Dev Notes da Story 4.2: "`PasswordResetTokenStore` é desenhado de propósito pra ser neutro").

### Testing Standards

- **Split real descoberto durante a implementação**: `require-admin.test.ts` segue a convenção fake-only de `core/auth` (checagem pura, sem banco). Mas `router.ts`'s `adminRouter.users.*` usa `forTenant` DIRETO (não injetado via `ctx`, mesmo padrão de `repository.ts` de módulo gerado) — não dá pra fakear sem Postgres real por trás, então `router.test.ts` é `DATABASE_URL`-gated, convenção do Épico 3, não a de `core/auth`/Story 4.2.
- A prova de "refresh re-deriva `isAdmin`" precisa ser REAL (fake stateful, não spy) — mesma disciplina já corrigida no code review da Story 4.2 pra `revokeAllForUser`.
- Validação de ponta a ponta contra Postgres+Mailpit reais antes de marcar a story `done` — mesma disciplina de todas as stories desde a 3.1.

### References

- [Source: _bmad-output/planning-artifacts/prds/prd-Aether-2026-08-11/prd.md#FR-14, #FR-15] — requisitos funcionais da Epic 5.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-Aether-2026-08-14/ARCHITECTURE-SPINE.md] — AD-5 (`core/admin sob checagem explícita de super-admin`); nota em "Deferred" sobre convenção de UI pras telas de admin não decidida.
- [Source: src/scaffolding/templates/auth.ts#argon2-auth-provider.ts] — `findUserByEmail`/`setPassword` (Story 4.2), mesmo padrão pra `findUserById`.
- [Source: src/scaffolding/templates/notifications.ts] — `EmailMessage` union, já desenhada pra aceitar `account-setup` como novo membro (Story 4.1, Dev Notes).
- [Source: _bmad-output/implementation-artifacts/4-2-password-reset.md] — `PasswordResetTokenStore`/`resetPassword`, reaproveitados sem modificação.

### Review Findings

Revisão adversarial de 4 camadas (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, Acceptance Auditor) sobre o diff de 10 arquivos (1200 linhas) desta story, com `review_mode: full` contra este spec + contexto de 2-1/3-1/4-2.

- [x] [Review][Patch] `admin.users.create`/`admin.users.update` deixam violação de unique constraint (P2002, email duplicado no mesmo tenant) sem tratamento — vaza como 500 bruto em vez de um `TRPCError` limpo [src/scaffolding/templates/admin.ts:131-134,162-165] — corrigido: `isDuplicateEmailError` (checagem estrutural de `err.code === 'P2002'`) + `TRPCError({code:'CONFLICT'})` nos dois pontos; 2 novos testes reais contra Postgres.
- [x] [Review][Patch] `admin.users.create` pode deixar um `User` órfão (senha placeholder inutilizável, email de configuração nunca entregue) se `passwordResetTokenStore.issue()`/`emailProvider.send()` lançar DEPOIS de `db.user.create()` já ter persistido — sem o mesmo try/catch que `requestPasswordReset` (Story 4.2) já aplica à mesma dupla de chamadas [src/scaffolding/templates/admin.ts:131-151] — corrigido: `issue`/`send` agora dentro de try/catch que desfaz (`db.user.delete`) o `User` recém-criado e relança o erro original; 1 novo teste real prova que não sobra linha órfã.
- [x] [Review][Patch] `write-structural-seed.test.ts` só confirma a EXISTÊNCIA de `apps/api/src/root-router.ts`, nunca seu CONTEÚDO — uma regressão futura que quebrasse a montagem de `admin: adminRouter` (ou de qualquer outro router) passaria com a suíte 100% verde [src/scaffolding/write-structural-seed.test.ts:57] — corrigido: novo teste assertando o import + `admin: adminRouter,` no conteúdo gerado.
- [x] [Review][Patch] `users.create`/`users.update` usam o mesmo `requireAdmin()` de `users.list`, mas só `users.list` tem um teste de integração real provando `FORBIDDEN` sem `isAdmin` — nada confirma que o guard está de fato conectado nos outros dois [src/scaffolding/templates/admin.ts (router.test.ts)] — corrigido: 2 novos testes reais (`users.create`/`users.update` FORBIDDEN sem admin).
- [x] [Review][Patch] Comentário de `ACCOUNT_SETUP_TOKEN_TTL_MS` abre com "Mesma janela de PASSWORD_RESET_TOKEN_TTL_MS" mas o resto do comentário argumenta que a constante é deliberadamente independente — lido rápido, parece contradição [src/scaffolding/templates/admin.ts:96-102] — corrigido: reescrito pra deixar claro que é o MESMO VALOR hoje por coincidência, não a mesma janela conceitual.
- [x] [Review][Patch] Migration `20261003000000_add_user_is_admin` está datada um dia adiante da data real do repositório (2026-10-02), quebrando a convenção de nomear migrations pelo dia em que foram de fato autoradas [src/scaffolding/templates/db.ts] — corrigido: renomeada pra `20261002000100_add_user_is_admin` (mesmo dia da migration anterior, +100s pra não colidir); reaplicada do zero contra Postgres real do Laboratório sem conflito.
- [x] [Review][Defer] Nenhuma procedure permite promover o primeiro admin de um tenant [src/scaffolding/templates/admin.ts] — deferred: já documentado como corte de escopo explícito e aprovado pelo Boss nos Dev Notes desta story; SQL direto aceito como infra de teste, lacuna de produto real fica para story futura (seed de Tenant ou comando `aether-admin`)

**Rejeitados:**
- `false` — Link de account-setup lido via `process.env.WEB_PUBLIC_URL` direto em vez do `SecretsProvider`: é exatamente o mesmo padrão já existente em `requestPasswordReset` (Story 4.2), não alterado por este diff — não é uma inconsistência introduzida aqui.
- `false` — Falta operação de delete/desativação de Usuário: nenhuma AC desta story pede isso; ACs #4/#5/#6 definem list/create/update, nunca delete.
- `false` — `verifyToken` agora exigir `isAdmin` booleano invalidaria access tokens emitidos antes do deploy: o TTL de 15 min do access token já absorve isso sozinho (basta um `refresh`, que não depende do token antigo); é um comportamento deliberado e já testado explicitamente ("token válido sem claim isAdmin... retorna null").
- `false` — `admin.users.create` fazendo `hash()` e depois `create()` "reabriria" o padrão que `setPassword` eliminou: o comentário de `setPassword` trata de evitar `hash()` + um UPDATE separado numa senha JÁ EXISTENTE; `create()` grava `passwordHash` como um campo entre outros num ÚNICO insert atômico — situação estruturalmente diferente, sem a janela de inconsistência que `setPassword` existe para prevenir.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- Validação local (`aether-5-1-validate`, sem `DATABASE_URL`): `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 11 arquivos passaram, 2 skipped (13), 73 testes passaram, 15 skipped (88) — os skipped são exatamente as suítes `DATABASE_URL`-gated (Épico 3 + `admin/router.test.ts` + `smtp-email-provider.test.ts`).
- Validação real (Laboratório Integrit, `tupa-lab`/`ubt-host01`, container `aether-api`): projeto sincronizado via `tar`+`scp`+`docker cp`; banco `aether_5_1_validate` dedicado criado no Postgres compartilhado; `prisma migrate deploy` aplicou as 5 migrations (incluindo `20261003000000_add_user_is_admin`) limpo; `prisma generate` ok; Mailpit dedicado (`mailpit-5-1-validate`) na rede `infra-lab_lab-network`. Com `DATABASE_URL` setado: `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 13 arquivos passaram, 88 testes passaram, 0 skipped (todas as suítes antes skipped, incluindo `admin/router.test.ts`, rodaram de verdade contra Postgres+Mailpit reais).
- Script de probe (`apps/api/src/probe-5-1.ts`, descartável, nunca comitado) rodado via `tsx` contra a API real (porta 3011, pra não colidir com outro processo já ocupando 3001 no mesmo container) + Mailpit real: todas as 6 etapas da Task 8.2 passaram (login admin com `isAdmin: true` verificado via `jwtVerify` real; `admin.users.create` sem lançar erro; email `account-setup` capturado no Mailpit e token extraído; `resetPassword` aceitou o token; novo usuário logou com a senha configurada; `admin.users.list` funcionou antes da revogação, `refresh` re-derivou `isAdmin: false` após revogação direta via Prisma, e `admin.users.list` retornou `FORBIDDEN` depois).
- Cleanup pós-validação: servidor de probe finalizado, banco `aether_5_1_validate` dropado, container `mailpit-5-1-validate` removido, diretório sincronizado `/app-5-1` removido do container, projeto `aether-5-1-validate` e tarballs de scratch removidos localmente.
- Code review (4 camadas) aplicado + revalidado: 6 patches corrigidos em `admin.ts`/`db.ts`/`write-structural-seed.test.ts` (ver Review Findings). Projeto regenerado (`aether-5-1-review-validate`) localmente: `typecheck`/`lint`/`format:check` limpos, `pnpm test` → 11 arquivos passaram, 2 skipped (13), 73 testes passaram, 20 skipped (93) — 5 testes novos (2 FORBIDDEN, 2 CONFLICT, 1 rollback-órfão) todos `DATABASE_URL`-gated. Revalidado no Laboratório Integrit contra banco dedicado (`aether_5_1_review`) + Mailpit dedicado (`mailpit-5_1-review`): migration renomeada (`20261002000100_add_user_is_admin`) aplicada sem conflito; `typecheck`/`lint`/`format:check` limpos; `pnpm test` → 13 arquivos passaram, 93 testes passaram, 0 skipped — todos os 10 testes de `admin/router.test.ts` (incluindo os 5 novos do review) passaram de verdade contra Postgres real. Cleanup: banco/Mailpit/diretório sincronizado removidos do Laboratório; projeto e tarball de scratch removidos localmente.

### Completion Notes List

- Todas as 8 ACs satisfeitas e validadas de ponta a ponta contra infraestrutura real (Postgres + Mailpit do Laboratório Integrit), não só contra fakes/mocks.
- Achado real confirmado durante a Task 8: a "janela de staleness" documentada nos Dev Notes (claim `isAdmin` no JWT só é re-derivado no próximo `refresh`, não instantaneamente) é real e bounded pelo TTL do access token (15 min) — o probe revogou `isAdmin` via SQL direto e confirmou que o `refresh` subsequente (não um novo `login`) já refletiu `isAdmin: false` e bloqueou `admin.users.list` com `FORBIDDEN`.
- Lacuna de produto já documentada nos Dev Notes (escopo cortado): não existe nenhuma procedure pra promover o PRIMEIRO admin de um tenant — a validação real precisou promover via `UPDATE` direto (Prisma, equivalente a SQL direto) no banco de teste. Fica como candidato a achado para o code review e/ou story futura (seed inicial de Tenant, ou comando `aether-admin`).
- Dependência temporária `@trpc/client` adicionada ao `apps/api/package.json` SÓ dentro do projeto gerado de validação (`aether-5-1-validate`), nunca nos templates deste repositório — o probe script e essa dependência foram descartados junto com o resto do scratch ao final da Task 8; nenhum artefato de validação sobrou no repositório nem no Laboratório.

### File List

- `src/scaffolding/templates/db.ts` (M)
- `src/scaffolding/templates/auth.ts` (M)
- `src/scaffolding/templates/authz.ts` (M)
- `src/scaffolding/templates/admin.ts` (A)
- `src/scaffolding/templates/notifications.ts` (M)
- `src/scaffolding/templates/shared.ts` (M)
- `src/scaffolding/templates/api.ts` (M)
- `src/scaffolding/write-structural-seed.ts` (M)
- `src/scaffolding/write-structural-seed.test.ts` (M)
- `src/codegen/module-files.ts` (M)
