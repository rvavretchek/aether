---
baseline_commit: 3c5465c2d217d487c4a5da3843cb3321db232602
context: [_bmad-output/implementation-artifacts/2-1-login-jwt-refresh.md, _bmad-output/implementation-artifacts/4-2-password-reset.md, _bmad-output/implementation-artifacts/5-1-admin-users-backend.md]
---

# Story 5.2: Admin revoga sessões ativas de um Usuário

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como administrador de um Tenant,
eu quero revogar todas as sessões ativas de um Usuário do meu Tenant através de uma procedure tRPC protegida por `requireAdmin`,
para que eu consiga reagir a um dispositivo comprometido ou a um desligamento sem depender de o próprio Usuário trocar a senha (FR-14, "o admin pode revogar as sessões ativas de um Usuário" — já identificado nos Dev Notes da Story 5.1 como a extensão mais natural: o mecanismo já existe, só falta expor).

## Acceptance Criteria

1. Nova procedure `admin.users.revokeSessions` — recebe `{ userId }`, protegida por `requireAdmin` (Story 5.1, reaproveitado sem modificação).
2. Só revoga sessões de um `User` do PRÓPRIO Tenant do admin (AD-5) — um `userId` de outro Tenant, ou inexistente, produz `NOT_FOUND`, nunca revela a diferença (mesmo princípio anti-enumeração cross-tenant já aplicado em `admin.users.update`, Story 5.1).
3. Internamente chama `ctx.tokenRevocationStore.revokeAllForUser(userId)` (FR-9, Story 2.1/4.2) — SEM NENHUMA modificação na interface/implementação existente.
4. Efeito real e imediato: depois de `revokeSessions`, qualquer refresh token que já existisse para aquele Usuário passa a ser rejeitado (`UNAUTHORIZED`) na próxima chamada de `auth.refresh` — não só no próximo login. Mesma garantia de efeito real (não timing/cache) já provada pra `resetPassword` na Story 4.2.
5. `pnpm typecheck`/`lint`/`format:check`/`test` passam limpos no projeto GERADO. Validado de ponta a ponta contra Postgres real (mesma disciplina de toda story desde a 3.1): emite um refresh token de verdade pra um Usuário, chama `admin.users.revokeSessions`, confirma que `auth.refresh` com aquele cookie falha com `UNAUTHORIZED` depois.

## Tasks / Subtasks

- [x] Task 1: Schema Zod compartilhado (AC: #1)
  - [x] 1.1 `packages/shared/src/schemas/admin.ts`: novo `revokeSessionsInputSchema = z.object({ userId: z.string().min(1) })`.
- [x] Task 2: `adminRouter.users.revokeSessions` (AC: #1, #2, #3)
  - [x] 2.1 `apps/api/src/core/admin/router.ts`: nova procedure `revokeSessions`, `.use(requireAdmin())`, `.input(revokeSessionsInputSchema)`.
  - [x] 2.2 Verifica que o `userId` pertence ao PRÓPRIO tenant do admin ANTES de revogar — `forTenant(ctx.user.tenantId).user.findUnique({ where: { id: input.userId }, select: { id: true } })` (mesmo padrão de leitura tenant-scoped já usado em `list`); `null` → `TRPCError({ code: 'NOT_FOUND' })`. **Nunca** chama `revokeAllForUser` antes de confirmar isso — `TokenRevocationStore.revokeAllForUser` é tenant-agnóstico na própria assinatura (só `userId`), então a fronteira de tenant É responsabilidade exclusiva desta procedure, não do store.
  - [x] 2.3 Chama `ctx.tokenRevocationStore.revokeAllForUser(input.userId)` — reaproveita literalmente o método já existente (Story 2.1/4.2), sem passar `tenantId` (a assinatura não tem esse parâmetro — não inventar um).
- [x] Task 3: Testes (AC: #2, #3, #4)
  - [x] 3.1 `apps/api/src/core/admin/router.test.ts` (`DATABASE_URL`-gated, mesma convenção do resto deste arquivo desde a Story 5.1): `revokeSessions` sem `isAdmin` → `FORBIDDEN`; `userId` de outro tenant → `NOT_FOUND`; `userId` inexistente → `NOT_FOUND` (mesma resposta, não diferenciar os dois casos).
  - [x] 3.2 Teste de EFEITO REAL (não spy, mesma disciplina já aplicada ao teste de `refresh` da Story 5.1 e ao `revokeAllForUser` da Story 4.2): emite um refresh token de verdade via `ctx.tokenRevocationStore.issue(...)`, chama `revokeSessions`, confirma `tokenRevocationStore.isRevoked(rawToken)` retorna `true` depois.
  - **Achado real corrigido durante a implementação**: `cleanupTenant` (helper de `afterEach` deste describe, existente desde a Story 5.1) não deletava `RefreshToken` antes de `User` — o novo teste de efeito real (3.2) passou a emitir uma linha real em `refresh_tokens`, e a FK (`ON DELETE RESTRICT`) quebrava o cleanup do PRÓXIMO teste com o mesmo erro já visto na validação real da Story 5.1 (Task 8). Corrigido adicionando `prisma.refreshToken.deleteMany({ where: { tenantId: id } })` ANTES do `user.deleteMany` em `cleanupTenant`.
- [x] Task 4: Validação real de ponta a ponta (AC: #5)
  - [x] 4.1 Projeto gerado + migration já existentes aplicadas contra Postgres real (Laboratório Integrit) — nenhuma migration nova nesta story (não há mudança de schema).
  - [x] 4.2 Script de probe: login de um Usuário comum (emite `refresh_token` real via cookie), admin chama `admin.users.revokeSessions({ userId })`, confirma que `auth.refresh` com aquele MESMO cookie agora falha com `UNAUTHORIZED`.
  - [x] 4.3 `pnpm typecheck`/`lint`/`format:check`/`test` limpos; Debug Log/Completion Notes atualizados.

## Dev Notes

### 🎯 Onde este código realmente vive

Mesma coisa de sempre: `apps/api/src/core/admin/router.ts`/`packages/shared/src/schemas/admin.ts` são os caminhos DENTRO do projeto que `aether-admin new` gera — o trabalho real é editar `src/scaffolding/templates/admin.ts` e `src/scaffolding/templates/shared.ts` (ambos já existem desde a Story 5.1, sem arquivo novo nesta story).

### ⚠️ Escopo explicitamente cortado desta story

- **Nenhuma tela de admin** — mesmo corte da Story 5.1 (decisão do Boss); esta story só expõe a procedure backend.
- **Nenhuma notificação ao Usuário** de que suas sessões foram revogadas (ex.: email) — fora do escopo de FR-14; `resetPassword` (Story 4.2) também não notifica, mesmo padrão.
- **Revogar só UM refresh token específico** (não todos) — não pedido por nenhuma AC; `revokeAllForUser` já é tudo-ou-nada por design (Story 2.1/4.2), esta story não introduz granularidade nova.

### Arquitetura — o que seguir à risca

- **`TokenRevocationStore.revokeAllForUser(userId: string): Promise<void>` já existe, pronto, testado e idempotente** (`src/scaffolding/templates/auth.ts`, método usado por `resetPassword` desde a Story 4.2) — esta story NÃO toca nessa interface/implementação. É reaproveitamento puro, exatamente como a Story 5.1 reaproveitou `PasswordResetTokenStore`.
- **A fronteira de tenant é responsabilidade da procedure, não do store** — `revokeAllForUser` recebe só `userId`, sem `tenantId` (ver assinatura real). Isso é intencional (o método é genérico, chamado também por `resetPassword`, que opera sobre o PRÓPRIO usuário autenticado, nunca precisando de uma segunda checagem de tenant). Mas `admin.users.revokeSessions` recebe um `userId` ARBITRÁRIO escolhido pelo admin — sem a checagem explícita do Task 2.2, um admin do Tenant A poderia revogar sessões de um Usuário do Tenant B só adivinhando/enumerando um UUID, quebrando AD-5. Mesmo princípio EXATO já aplicado em `admin.users.update` (Story 5.1): nunca confia em `revokeAllForUser` pra "proteger" o isolamento de tenant, confirma a posse ANTES de chamar.
- **Anti-enumeração cross-tenant** — mesmo padrão de `admin.users.update`: `NOT_FOUND` tanto pra "não existe" quanto pra "existe mas é de outro tenant", nunca diferenciar pela forma do erro.
- **`requireAdmin()` é reaproveitado literalmente** (Story 5.1) — nenhuma mudança nele nesta story.
- **Janela de staleness do access token já emitido (achado do code review)** — `revokeSessions` bloqueia o PRÓXIMO `auth.refresh` (AC #4), mas NÃO invalida instantaneamente um access token já emitido e ainda dentro do seu TTL de 15 min (Story 2.1) — quem tiver um access token válido na mão continua autenticado normalmente até ele expirar por conta própria. Mesma classe de janela já documentada explicitamente pra `isAdmin` na Story 5.1; "revogar sessões" aqui significa "bloquear a renovação", não "derrubar sessões ativas instantaneamente" — residual aceito, não um bug (não existe mecanismo de revogação de access token de curta duração neste MVP, só de refresh token).
- **Auto-revogação bloqueada (decisão do Boss, achado do code review)** — `revokeSessions` rejeita com `BAD_REQUEST` se `input.userId === ctx.user.userId`, ANTES de qualquer outra checagem. Evita um admin se trancar fora por engano; "sair de todos os outros dispositivos" (um caso de uso legítimo em outros produtos) fica pra uma story futura dedicada, se vier a ser pedido — não implementado aqui.

### Testing Standards

- Mesmo split real já documentado na Story 5.1: `router.ts`'s `adminRouter.users.*` usa `forTenant` direto — `router.test.ts` continua `DATABASE_URL`-gated (convenção do Épico 3), não fake-only.
- Teste de efeito real pro `revokeAllForUser`: idêntico em espírito ao já feito na Story 4.2 (`resetPassword`) e na Story 5.1 (`refresh` re-derivando `isAdmin`) — nunca um `vi.fn()`/spy sozinho basta pra provar que a revogação realmente aconteceu; confirmar via `isRevoked()` depois.
- Validação real de ponta a ponta contra Postgres (sem Mailpit — esta story não envia email) antes de marcar `done`, mesma disciplina desde a Story 3.1.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] — "revoga sessões ativas... refletindo na árvore em tempo real"; FR Coverage Map linha FR9: "reaproveitada pela Epic 5 (revogação via UI)".
- [Source: _bmad-output/planning-artifacts/architecture/architecture-Aether-2026-08-14/ARCHITECTURE-SPINE.md#AD-4] — `TokenRevocationStore` como Provider formal (Superfície Pública §9.1).
- [Source: src/scaffolding/templates/auth.ts#token-revocation-store.ts] — `revokeAllForUser`, já implementado e testado (Story 2.1/4.2).
- [Source: _bmad-output/implementation-artifacts/5-1-admin-users-backend.md#Dev Notes] — "o MECANISMO já existe... só falta uma procedure `admin.users.revokeSessions`... é a extensão mais natural da próxima story — só reaproveitar o método já pronto." (escopo explicitamente adiado desta story para esta).
- [Source: _bmad-output/implementation-artifacts/4-2-password-reset.md] — padrão de teste de efeito real (não spy) pra `revokeAllForUser`.

### Review Findings

Revisão adversarial de 4 camadas (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, Acceptance Auditor) sobre o diff de 2 arquivos (155 linhas) desta story, com `review_mode: full` contra este spec + contexto de 2-1/4-2/5-1.

- [x] [Review][Patch] Admin pode revogar as PRÓPRIAS sessões via `revokeSessions({ userId: <id do próprio admin> })` — nada impede, e dois revisores independentes (Blind Hunter e Edge Case Hunter) levantaram isso. Decisão do Boss: **bloquear** (`BAD_REQUEST`) — evita o admin se trancar fora por engano; "sair de todos os outros dispositivos" fica pra uma story futura dedicada, se vier a ser pedido. Corrigido: guard `input.userId === ctx.user.userId` ANTES da checagem de tenant, novo teste.
- [x] [Review][Patch] Nenhum teste prova que revogar as sessões do Usuário A não afeta o Usuário B do MESMO tenant — a garantia genérica de `revokeAllForUser` já é testada desde a Story 4.2 (`prisma-token-revocation-store.test.ts`), mas nada confirma, na CAMADA da procedure `revokeSessions`, que o `userId` certo é o que de fato chega até o store [src/scaffolding/templates/admin.ts] — corrigido: novo teste cria 2 Usuários do mesmo tenant, revoga só um, confirma que o outro continua com `isRevoked === false`.
- [x] [Review][Patch] A "janela de staleness" desta story (revogar sessões bloqueia o PRÓXIMO `refresh`, mas o access token de 15 min já emitido continua funcionando normalmente até expirar por conta própria) nunca é mencionada nos Dev Notes/Completion Notes — a Story 5.1 documentou explicitamente a janela equivalente pra `isAdmin`; esta story deveria fazer o mesmo, já que "revogar sessão" é facilmente lido como "efeito imediato total" por um leitor apressado [_bmad-output/implementation-artifacts/5-2-revoke-sessions.md] — corrigido: callout adicionado nos Dev Notes e nas Completion Notes.

**Rejeitados:**
- `false` — `userId` malformado poderia produzir um erro de formato diferente de `NOT_FOUND`, vazando sinal de enumeração: `User.id` é uma coluna `TEXT` pura (não `uuid` tipado no Postgres) — qualquer string, bem formada ou não, é um valor sintaticamente válido; `findUnique` sempre retorna `null` uniformemente pra qualquer string sem uma linha correspondente, nunca lança um erro de formato.
- `false` — `revokeSessions` deveria ter um `.output()`/`revokeSessionsOutputSchema`, inconsistente com os outros endpoints de admin: `create`/`update` (Story 5.1) também NÃO têm `.output()` — só `list` (uma query que retorna dados) tem. O padrão real já estabelecido é "mutation sem retorno não tem `.output()`", e `revokeSessions` segue esse padrão exatamente.

**Deferido:**
- [x] [Review][Defer] Nenhuma ação sensível de admin (`revokeSessions` incluída) gera log de auditoria (quem revogou sessão de quem, quando) [src/scaffolding/templates/admin.ts] — deferred: nenhuma infraestrutura de audit log existe em NENHUMA story até agora (2.1–5.1); gap de produto real, mas não introduzido nem agravado por esta story especificamente — fica pra uma decisão de arquitetura própria, não pra uma story de CRUD pontual.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- Validação local (`aether-5-2-validate`, sem `DATABASE_URL`): `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 11 arquivos passaram, 2 skipped (13), 73 testes passaram, 24 skipped (97) — os skipped são as suítes `DATABASE_URL`/Mailpit-gated de sempre.
- Validação real (Laboratório Integrit, `tupa-lab`/`ubt-host01`, container `aether-api`): projeto sincronizado via `tar`+`scp`+`docker cp`; banco `aether_5_2_validate` dedicado; migrations já existentes (nenhuma nova nesta story) aplicadas limpo; Mailpit dedicado (`mailpit-5-2-validate`) só pra não deixar a suíte de SMTP falhar por ausência de infraestrutura (esta story não envia email). Com `DATABASE_URL` setado: `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → 13 arquivos passaram, 97 testes passaram, 0 skipped — os 14 testes de `admin/router.test.ts` (10 da Story 5.1 + 4 novos desta story) todos passaram de verdade contra Postgres real.
- Script de probe (`apps/api/src/probe-5-2.ts`, descartável, nunca comitado) rodado via `tsx` contra a API real (porta 3012): login de usuário comum captura `refresh_token` real via cookie; confirma que `auth.refresh` funciona ANTES da revogação; login do admin; `admin.users.revokeSessions` não lança erro; o MESMO cookie de refresh do usuário comum passa a responder `UNAUTHORIZED` em `auth.refresh` depois — prova real de ponta a ponta do AC #4.
- Cleanup pós-validação: servidor de probe finalizado, banco `aether_5_2_validate` dropado, container `mailpit-5-2-validate` removido, diretório sincronizado `/app-5-2` removido do container, projeto `aether-5-2-validate` e tarball de scratch removidos localmente.
- Code review (4 camadas) aplicado + revalidado: 1 decisão do Boss (bloquear auto-revogação) + 2 patches (teste de isolamento mesmo-tenant, callout de janela de staleness nos Dev Notes) corrigidos em `admin.ts`/story file. Projeto regenerado (`aether-5-2-review-validate`) localmente: `typecheck`/`lint`/`format:check` limpos, `pnpm test` → 11 arquivos passaram, 2 skipped (13), 73 testes passaram, 26 skipped (99) — 2 testes novos (isolamento mesmo-tenant, bloqueio de auto-revogação) `DATABASE_URL`-gated. Revalidado no Laboratório Integrit contra banco dedicado (`aether_5_2_review`) + Mailpit dedicado: `typecheck`/`lint`/`format:check` limpos; `pnpm test` → 13 arquivos passaram, 99 testes passaram, 0 skipped — todos os 16 testes de `admin/router.test.ts` (14 anteriores + 2 novos do review) passaram de verdade contra Postgres real. Cleanup: banco/Mailpit/diretório removidos do Laboratório; projeto e tarball de scratch removidos localmente.

### Completion Notes List

- Todas as 5 ACs satisfeitas e validadas de ponta a ponta contra Postgres real do Laboratório Integrit, não só contra fakes/mocks.
- Reaproveitamento 100% literal de `TokenRevocationStore.revokeAllForUser` (Story 2.1/4.2) — zero mudança na interface/implementação do store, exatamente como a própria Story 5.1 havia antecipado nos Dev Notes.
- Achado real corrigido durante a implementação (ver Task 3): `cleanupTenant` em `router.test.ts` (admin) precisou aprender a limpar `RefreshToken` antes de `User`, mesma classe de FK (`ON DELETE RESTRICT`) já vista na validação real da Story 5.1 — agora os dois testes/stories que criam refresh tokens reais em `beforeEach`/`afterEach` compartilham o mesmo `cleanupTenant` corrigido.
- Dependência temporária `@trpc/client` adicionada ao `apps/api/package.json` SÓ dentro do projeto gerado de validação (`aether-5-2-validate`), nunca nos templates deste repositório — descartada junto com o resto do scratch ao final da Task 4.
- Code review levantou uma decisão de produto genuína (self-revoke) que o Boss resolveu diretamente: bloquear, não permitir. Documentado nos Dev Notes como comportamento deliberado, não uma limitação.
- Janela de staleness do access token (15 min) já emitido antes da revogação é residual aceito, não um bug — mesma classe de limitação já documentada pra `isAdmin` na Story 5.1, agora também documentada aqui.
- Audit log pra ações sensíveis de admin (`revokeSessions` incluída) é uma lacuna real de produto, mas deferida — nenhuma story até agora tem essa infraestrutura; fica pra uma decisão de arquitetura própria (ver `deferred-work.md`).

### File List

- `src/scaffolding/templates/admin.ts` (M)
- `src/scaffolding/templates/shared.ts` (M)
