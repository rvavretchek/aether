---
baseline_commit: c9e171f47bd962965a75814b7735f6fbf184fe1d
context: [_bmad-output/implementation-artifacts/2-1-login-jwt-refresh.md, _bmad-output/implementation-artifacts/2-2-rate-limiting-login.md, _bmad-output/implementation-artifacts/4-1-email-provider-mailpit.md]
---

# Story 4.2: Redefinição de senha via link de uso único

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como usuário que esqueceu a senha,
eu quero solicitar um link de redefinição por email e trocar minha senha através dele,
para que eu recupere o acesso à minha conta sem precisar de ajuda de um administrador, com todas as minhas sessões antigas automaticamente invalidadas por segurança.

## Acceptance Criteria

1. Nova procedure `auth.requestPasswordReset` aceita `{ tenantId, email }`. A resposta é **idêntica** (mesmo shape de sucesso) seja o email conhecido ou não — nunca revela se o email existe (mesma defesa de enumeração da AC #9 da Story 2.1).
2. Quando o email corresponde a um `User` real: gera um token de uso único de alta entropia (nunca o valor bruto persistido — mesmo padrão SHA-256-de-entropia-alta de `RefreshToken`, Story 2.1), com expiração numa constante nomeada (não mágica, não env-configurável — mesmo padrão de `ACCESS_TOKEN_TTL`), e envia um email `password-reset` via `EmailProvider` (Story 4.1) contendo o link.
3. `auth.requestPasswordReset` é protegida pelo MESMO `RateLimiter`/`RateLimitIdentity` já usado por `login` (Story 2.2) — nenhuma segunda implementação paralela (AD-10, já documentado como esperado desde a Story 2.2). Toda chamada processada conta pro limite (não só "falhas" — não existe esse conceito aqui, já que a resposta é sempre a mesma).
4. Nova procedure `auth.resetPassword` aceita `{ token, newPassword }`. Token inválido, expirado, ou já usado resulta no MESMO erro genérico (formato RFC 9457 — mecanismo já existente desde a Story 1.1, `trpc.ts`, nenhuma mudança necessária), sem diferenciar o motivo.
5. Consumo do token é **atômico** — uma corrida entre duas chamadas simultâneas com o mesmo token nunca deixa as duas terem sucesso (único-uso de verdade, não "checa, depois usa" em dois passos separados).
6. Ao suceder, `auth.resetPassword` hasheia a nova senha reaproveitando a MESMA lógica de pepper/Argon2id já usada hoje (nenhuma segunda implementação de hashing) e atualiza `User.passwordHash` — sem o router tocar Prisma/`User` direto.
7. Ao suceder, `auth.resetPassword` invalida TODAS as sessões ativas do usuário via um novo método `TokenRevocationStore.revokeAllForUser(userId)` (extensão da interface — FR-9) — refresh tokens emitidos antes da troca nunca mais funcionam.
8. O token bruto de reset nunca é persistido nem aparece em log nenhum — mesmo padrão de hash SHA-256 de alta entropia já usado pra refresh tokens (`hashToken` em `prisma-token-revocation-store.ts`).
9. `pnpm typecheck`/`lint`/`format:check`/`test` passam limpos no projeto GERADO. Testes de integração reais (`DATABASE_URL`-gated) cobrem: email desconhecido não revela nada (mesma resposta), token válido reseta a senha E invalida sessões antigas de verdade, token expirado/já-usado falha, rate limit bloqueia depois de N tentativas. Validado de ponta a ponta contra Postgres real (mesma disciplina de todo o projeto).

## Tasks / Subtasks

- [x] Task 1: Schema Prisma — `PasswordResetToken` (AC: #2, #5, #8)
  - [x] 1.1 `packages/db/schema.prisma`: novo model `PasswordResetToken` — `id` (uuid(7)), `userId`/`tenantId` (denormalizado, mesmo padrão de `RefreshToken`), `tokenHash` (`@unique`), `expiresAt`, `usedAt` (nullable — `null` = ainda válido), `createdAt`. `@@index([userId])`, `@@map("password_reset_tokens")`.
  - [x] 1.2 Migration escrita à mão em `packages/db/migrations/20261002000000_add_password_reset_token/migration.sql`, seguindo EXATAMENTE a convenção DDL já usada (ver `migrations/20260901000000_init_auth/migration.sql`: sem `DEFAULT` pro `id`, `TEXT NOT NULL`, `TIMESTAMP(3)`, FK explícita com `ON DELETE RESTRICT ON UPDATE CASCADE`).
- [x] Task 2: `PasswordResetTokenStore` — porta + implementação Prisma (AC: #2, #5, #8)
  - [x] 2.1 `apps/api/src/core/auth/password-reset-token-store.ts`: interface com dois métodos — `issue(userId: string, tenantId: string, expiresAt: Date): Promise<string>` (retorna o token bruto) e `consume(rawToken: string): Promise<string | null>` (retorna o `userId` se o token era válido e ACABOU de ser consumido; `null` se inválido/expirado/já usado).
  - [x] 2.2 `apps/api/src/core/auth/prisma-password-reset-token-store.ts`: `PrismaPasswordResetTokenStore`, reaproveitando a MESMA função `hashToken` (SHA-256) extraída pra `apps/api/src/core/auth/hash-token.ts` (também usada agora por `prisma-token-revocation-store.ts`, que antes tinha sua própria cópia local). `consume()` é atômico via `updateMany({ where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } })` seguido de um `findUnique` só pra ler o `userId` de volta.
  - [x] 2.3 Porta Prisma estreita `PasswordResetTokenRepository` (nome escolhido pra não colidir com o nome da interface pública, diferente de `RefreshTokenStore`/`TokenRevocationStore` que não colidem por acaso) com só `create`/`updateMany`/`findUnique`.
- [x] Task 3: Estender `TokenRevocationStore` com `revokeAllForUser` (AC: #7)
  - [x] 3.1 `token-revocation-store.ts`: adicionado `revokeAllForUser(userId: string): Promise<void>` à interface.
  - [x] 3.2 `refresh-token-store.ts`: adicionado `updateMany(args: { where: { userId: string; revokedAt: null }; data: { revokedAt: Date } }): Promise<{ count: number }>` à porta `RefreshTokenStore` (+ fake em memória do teste atualizado).
  - [x] 3.3 `prisma-token-revocation-store.ts`: `revokeAllForUser` implementado via `updateMany`, idempotente.
- [x] Task 4: Schemas Zod compartilhados (AC: #1, #4)
  - [x] 4.1 `packages/shared/src/schemas/auth.ts`: `requestPasswordResetInputSchema`/`resetPasswordInputSchema` adicionados.
- [x] Task 5: Procedures em `core/auth/router.ts` (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] 5.1 `requestPasswordReset` implementado como planejado.
  - [x] 5.2 `resetPassword` implementado — **refinamento feito durante a implementação**: em vez de expor `AuthProvider.hash()` + um update de `User` separado pro router chamar, estendi `AuthProvider` com um método novo `setPassword(userId, newPassword)` que hasheia E persiste atomicamente por dentro do provider (mesmo padrão de `findUserByEmail`, também novo). Mantém a lógica de pepper/Argon2id inteira dentro do `Argon2AuthProvider`, sem o router precisar de um segundo port só pra escrever em `User` — `router.ts` continua nunca tocando Prisma/`User` direto (mesmo princípio que `login` já seguia via `authenticate`).
- [x] Task 6: Wiring em `providers.ts`/`context.ts`/`test-utils.ts` + env var (AC: #2)
  - [x] 6.1 `providers.ts`: `passwordResetTokenStore` instanciado (AD-4, composição única).
  - [x] 6.2 `context.ts`/`test-utils.ts`: `passwordResetTokenStore` exposto via `ctx`, mesmo padrão de `emailProvider`.
  - [x] 6.3 `.env.development`: `WEB_PUBLIC_URL=http://localhost:5173` adicionado.
- [x] Task 7: Testes (AC: #1, #3, #4, #5, #7, #9)
  - [x] 7.1 `prisma-password-reset-token-store.test.ts` — unitário com fake em memória (mesmo padrão de `prisma-token-revocation-store.test.ts`): issue→consume funciona uma vez, segunda consume no mesmo token falha, token expirado falha, nunca persiste o valor bruto.
  - [x] 7.2 `router.test.ts` (auth) — **ajuste real de escopo**: este arquivo (login/refresh, Stories 2.1/2.2) nunca foi `DATABASE_URL`-gated — testa tudo com fakes em memória das portas Prisma estreitas, nunca Postgres real. Os novos cenários seguem a MESMA convenção (não a dos módulos do Épico 3): email desconhecido recebe a MESMA resposta que email conhecido, sem emitir token nem enviar email (AC #1); `resetPassword` chama `setPassword` e DEPOIS `revokeAllForUser`, nessa ordem (AC #6/#7 — a correção semântica de `revokeAllForUser` em si já é provada no fake STATEFUL da Task 7.1/3, não duplicada aqui); token inválido/expirado/usado nunca chama nenhum dos dois (AC #4); `N+1` chamadas de `requestPasswordReset` batem em `TOO_MANY_REQUESTS` mesmo com email desconhecido (AC #3, mesmo padrão do rate limit do `login`, Story 2.2). A prova de ponta a ponta contra Postgres/Mailpit REAIS fica pra Task 8.
- [x] Task 8: Validação real de ponta a ponta (AC: #9)
  - [x] 8.1 Projeto gerado (`aether-admin new`) + migration aplicada contra Postgres real + Mailpit real (sem Docker local nesta máquina, replicado via o Laboratório Integrit compartilhado — mesmo padrão das Stories 3.x/4.1).
  - [x] 8.2 `pnpm typecheck`/`lint`/`format:check`/`test` limpos (71/71 reais contra Postgres+Mailpit). Prova de ponta a ponta adicional via script dedicado (`probe-password-reset.mts`, descartado após o uso): login real emite refresh token → `requestPasswordReset` envia email de verdade, capturado pelo Mailpit → token extraído do corpo real do email → `resetPassword` troca a senha → refresh token ANTIGO rejeitado (`UNAUTHORIZED`, prova real de `revokeAllForUser`) → login com senha antiga rejeitado → login com senha nova funciona → reuso do mesmo token de reset rejeitado (`BAD_REQUEST`, uso único de verdade).
  - [x] 8.3 Debug Log/Completion Notes atualizados.

## Dev Notes

### 🎯 Onde este código realmente vive — mesmo lembrete das Stories 1.1-4.1

Tudo em `apps/api/src/core/...`/`packages/db/...`/`packages/shared/...` nos Tasks acima é o caminho DENTRO do projeto que `aether-admin new` gera. O trabalho real é editar os templates deste repositório (`src/scaffolding/templates/auth.ts`, `db.ts`, `shared.ts`, `root.ts`) e a migration vive em `src/scaffolding/templates/db.ts` como uma entrada nova do objeto retornado por `buildDbFiles()`.

### ⚠️ Escopo explicitamente cortado desta story

- **Nenhuma UI de frontend** — nenhuma story até agora (`new`, `login`, `rate-limiting`, Épico 3, `generate module`) construiu páginas reais em `apps/web/src/routes/` além do stub de `home-page.tsx` (Story 1.1). Esta story segue o mesmo padrão: só as procedures tRPC backend. O link enviado por email aponta pra uma rota (`/reset-password?token=...`) que ainda não existe como página React — fica para quando `apps/web` ganhar rotas reais (story futura, fora do escopo aqui).
- **FR-15 (import em lote, Epic 5) reaproveitando o mesmo mecanismo de token** — `PasswordResetTokenStore` é desenhado de forma neutra (`issue(userId, tenantId, expiresAt)`/`consume(token)`, sem nada específico de "esqueci minha senha" na própria porta) exatamente pra permitir esse reaproveitamento futuro, mas a Epic 5 em si não é construída aqui.
- **Fila/retry de envio de email** — mesmo corte já documentado na Story 4.1; `requestPasswordReset` continua chamando `emailProvider.send()` com `await` direto.
- **Token anterior ainda válido quando um novo é solicitado duas vezes** — se o usuário pedir reset duas vezes, os dois tokens ficam válidos até expirar (sem invalidar o anterior ao emitir um novo). Risco residual baixo (ambos expiram na mesma janela curta); documentar como limitação conhecida em `deferred-work.md` se o code review concordar, não resolver preventivamente aqui.

### Arquitetura — o que seguir à risca

- **AD-4 (Composição de Providers)**: `passwordResetTokenStore` segue o MESMO protocolo de `emailProvider`/`authProvider`/etc. — só `providers.ts` instancia a classe concreta.
- **AD-5 (isolamento de tenant)**: `PasswordResetToken` é tenant-scoped via `tenantId` denormalizado (mesmo padrão de `RefreshToken`), mas a consulta de `consume()` busca por `tokenHash` (globalmente único) — não precisa (e não deveria) filtrar por tenant explicitamente ali, o token em si já amarra a um único `userId`/`tenantId` por construção.
- **FR-9 (TokenRevocationStore)**: `revokeAllForUser` é a extensão que a própria Story 2.1 já previu textualmente ("acionar revoke() a partir de um humano... fica pra story futura") — não é um redesenho, é fechar um gap já documentado.
- **AD-10 (RateLimiter único)**: `RateLimitIdentity`/`RateLimiter` já existem prontos (Story 2.2) — o comentário em `rate-limiter.ts` já cita explicitamente "e, no futuro, redefinição de senha (Epic 4)". Zero mudança na interface, só um novo caller.
- **FR-25 (RFC 9457)**: formatter de erro já global (`trpc.ts`, Story 1.1) — `throw new TRPCError(...)` já produz o formato certo, nenhuma modificação necessária.

### Testing Standards

- Toda a suíte nova de integração é `DATABASE_URL`-gated (`describe.skipIf`), mesmo padrão de todas as stories anteriores.
- A prova de AC #7 (invalidação de sessões) precisa ser REAL — emitir um refresh token de verdade via o mecanismo de `login`/`issue`, confirmar que funciona, resetar a senha, confirmar que o MESMO refresh token agora falha. Um teste que só checa "revokeAllForUser foi chamado" (spy) não prova a AC; precisa confirmar o EFEITO real.
- Nunca mockar `EmailProvider`/Mailpit nos testes de integração — mesma disciplina da Story 4.1.

### Aprendizados das Stories 1.1-4.1 (aplicar aqui)

- **Nunca "checa, depois usa" em dois passos — sempre atômico** (mesma lição de `getSubject`/`isRevoked` da Story 2.1): `consume()` do token de reset precisa ser uma única operação atômica no banco, não um `findUnique` seguido de um `update` separado.
- **Resposta idêntica pra enumeração de usuário** (AC #9 da Story 2.1, reforçada aqui): `requestPasswordReset` nunca pode ter uma branch de código observável (timing, exceção, log visível ao cliente) que distinga email-existe de email-não-existe.
- **Reaproveitar mecanismo existente em vez de duplicar** — `RateLimiter`/`RateLimitIdentity` (Story 2.2), `hashToken` (Story 2.1, extrair pra helper compartilhado em vez de copiar), `EmailProvider` (Story 4.1): todos já prontos, zero redesenho.
- **Validar de ponta a ponta contra infraestrutura real antes de marcar `done`** — padrão de todas as stories desde a 3.1; aqui envolve Postgres (migration) E Mailpit (envio real) ao mesmo tempo.

### References

- [Source: _bmad-output/planning-artifacts/prds/prd-Aether-2026-08-11/prd.md#FR-19] — requisito funcional desta story.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4] — nota de implementação (mecanismo de token reutilizável pela Epic 5).
- [Source: src/scaffolding/templates/auth.ts#token-revocation-store.ts] — comentário do cabeçalho já prevendo `revoke()` acionado por humano como story futura.
- [Source: src/scaffolding/templates/rate-limit.ts#rate-limiter.ts] — comentário já prevendo reaproveitamento por "redefinição de senha (Epic 4)".
- [Source: src/scaffolding/templates/auth.ts#authRouter.login] — padrão exato de `RateLimitIdentity`/fail-closed a replicar.
- [Source: src/scaffolding/templates/notifications.ts] — `EmailProvider`/template `password-reset` (Story 4.1), já pronto pra ser consumido aqui.
- [Source: src/scaffolding/templates/db.ts#migrations/20260901000000_init_auth] — convenção DDL exata a seguir na nova migration.

### Review Findings

*Code review de 2026-10-01, 4 camadas (Blind Hunter, Edge-Case Hunter, Verification Gap, Acceptance Auditor), diff isolado da Story 4.2.*

- [x] [Review][Patch] ~~`requestPasswordReset` reintroduz a exata classe de defeito que a AC #1/Dev Notes prometem evitar: `issue()`+`emailProvider.send()` só rodam (sem try/catch) quando o email existe — se qualquer um dos dois lançar, o caminho "email existe" responde com erro 500 enquanto o caminho "email não existe" responde sucesso.~~ — **aplicado**: `issue()`+`send()` agora envoltos em try/catch (log+swallow), a resposta é uniformemente sucesso em qualquer cenário. Risco residual de TIMING (não de erro) documentado em `deferred-work.md`. Achado convergente de 4/4 camadas. [src/scaffolding/templates/auth.ts#requestPasswordReset]
- [x] [Review][Patch] ~~Nenhum teste cobre o caminho fail-closed de `requestPasswordReset` quando `rateLimiter.isBlocked` lança.~~ — **aplicado**: teste adicionado, mesmo padrão do `login`. [src/scaffolding/templates/auth.ts#router.test.ts]
- [x] [Review][Patch] ~~Nenhum teste cobre que `requestPasswordReset` continua retornando sucesso quando `rateLimiter.recordFailure` lança.~~ — **aplicado**: teste adicionado, mesmo padrão do `login`. [src/scaffolding/templates/auth.ts#router.test.ts]
- [x] [Review][Patch] ~~Asserção do `resetLink` usa `expect.stringContaining` — só confirma que o token aparece em algum lugar da string, não que o path/query-param estão certos.~~ — **aplicado**: asserção tightened pro valor completo (`'http://localhost:5173/reset-password?token=raw-reset-token'`). [src/scaffolding/templates/auth.ts#router.test.ts]
- [x] [Review][Patch] ~~O teste de `resetPassword` pra AC #5/#6/#7 só verifica que `revokeAllForUser` foi CHAMADO (spy), nunca o EFEITO real.~~ — **aplicado**: teste reescrito usando `PrismaTokenRevocationStore` real + um fake STATEFUL de `RefreshTokenStore` — emite um refresh token de verdade antes, confirma `isRevoked` falso, chama `resetPassword`, confirma `isRevoked` virou verdadeiro (efeito real, não spy), mais a ordem via `invocationCallOrder`. [src/scaffolding/templates/auth.ts#router.test.ts]
- [x] [Review][Defer] Emitir um novo token de reset não invalida tokens anteriores ainda não expirados do mesmo usuário — já reconhecido nos Dev Notes como risco residual aceito, formalmente registrado em `deferred-work.md` agora.
- [x] [Review][Defer] `password_reset_tokens` nunca tem linhas usadas/expiradas removidas — mesma categoria de risco já aceita (e nunca endereçada) pra `refresh_tokens`; revisitar as duas juntas numa futura story de retenção de dados.
- [x] [Review][Defer] `setPassword`+`revokeAllForUser` não são transacionais — se o segundo lançar depois do primeiro commitar, a senha já trocou mas sessões antigas continuam válidas, e um retry fica bloqueado (o token já foi consumido). Janela estreita (dois `await` sequenciais), mesma categoria de risco residual já documentada no retro do Épico 3 (limitação de `_prisma_migrations`).
- [x] [Review][Defer] `AuthProvider.setPassword` lançaria um erro de Prisma não tratado (não o `BAD_REQUEST` genérico) se o `User` fosse deletado entre `requestPasswordReset` e `resetPassword` consumir o token. Inalcançável hoje — nenhum código deste projeto deleta `User` ainda; revisitar quando um fluxo de exclusão existir (Epic 5/admin).
- [x] [Review][Defer] Mesmo depois do patch acima, a diferença de TIMING entre "email existe" (grava token + envia email) e "email não existe" (retorna quase na hora) continua real e mensurável — risco residual aceito como padrão de mercado pra este tipo de defesa (equivalente a eliminar por completo exigiria trabalho desproporcional pro ganho), distinto do defeito de ERRO corrigido acima.

**Rejeitados:**
- `false` — `baseline_commit` do frontmatter tem exatamente 40 caracteres hexadecimais e resolve pra um commit real (`git cat-file -t` confirma `commit`) — a contagem do achado estava errada.
- `false` — `resetPasswordInputSchema.newPassword` com `.min(1).max(256)` espelha EXATAMENTE `loginInputSchema.password` (mesmo limite, já aceito desde a Story 2.1) — não é uma inconsistência nova.
- `false` — `PasswordResetToken.tenantId` sem `@@index`/FK espelha EXATAMENTE `RefreshToken` (mesma denormalização, mesma ausência de índice/FK, já aceita desde a Story 2.1).
- `low` — `resetPassword` não é rate-limited — o `token` já tem 256 bits de entropia (infactível de adivinhar); rate-limit defenderia contra um ataque que a própria entropia do token já torna impraticável.
- `low` — Nenhum email de confirmação "sua senha foi alterada" é enviado — boa prática de segurança, mas nenhuma AC exige, exigiria um novo template (escopo novo, não desta story).
- `low` — Campos `email`/`token` sem `.max()` explícito — `email` espelha exatamente o campo equivalente de `loginInputSchema` (sem `.max()` também); `token` é só hasheado (SHA-256, custo fixo), nenhum vetor de DoS demonstrado.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5), via skills `bmad-create-story` (planejamento) + `bmad-dev-story` (implementação)

### Debug Log References

- **Design refinado durante a implementação (Task 5.2)**: em vez de expor `AuthProvider.hash()` + um update de `User` separado pro router escrever, estendi `AuthProvider` com `setPassword(userId, newPassword)` (hasheia e persiste atomicamente dentro do provider) e `findUserByEmail(tenantId, email)` — mantém `router.ts` nunca tocando Prisma/`User` direto, mesmo princípio que `login` já seguia via `authenticate`. Exigiu estender `UserLookup` com `update()`.
- **Nome da porta Prisma estreita do token de reset**: `PasswordResetTokenRepository` (não `...Store`) — `RefreshTokenStore`/`TokenRevocationStore` não colidem por acaso (nomes de conceitos diferentes); a interface pública E a porta estreita do reset teriam o MESMO nome natural ("password reset token store"), então a porta estreita ganhou o sufixo `Repository` pra não colidir.
- **`hashToken` extraído pra um helper compartilhado** (`core/auth/hash-token.ts`) — antes vivia só dentro de `prisma-token-revocation-store.ts`; `PrismaPasswordResetTokenStore` precisa do mesmo SHA-256-de-alta-entropia, então extrair evitou duplicar a função E seu comentário de rationale.
- **Achado real de lint, só visível rodando `eslint` contra o projeto regenerado**: a condição `!existing || existing.usedAt !== null || existing.expiresAt.getTime() <= ...` no fake em memória do teste disparou `@typescript-eslint/prefer-optional-chain`. Corrigido separando em dois `if`s (early-return + uma variável `stillValid` nomeada) em vez de uma condição composta — mesma disciplina de "nunca confiar só na primeira rodada de lint" já estabelecida desde o Épico 3.
- **Achado real de sintaxe no próprio gerador**: uma string de teste (`expect.stringContaining('raw-reset-token')`) usava aspas simples dentro de um array-literal já delimitado por aspas simples, quebrando o parse do `auth.ts` do GERADOR (não do projeto gerado) — `pnpm test` do gerador falhou com `PARSE_ERROR` antes mesmo de chegar a gerar qualquer projeto. Corrigido trocando o delimitador externo pra aspas duplas (mesmo padrão já usado em outras linhas do arquivo que citam aspas simples).
- **Validação real completa, sem Docker local**: projeto gerado sincronizado (tar/scp, sem `node_modules`) pro container `aether-api` já rodando no Laboratório Integrit; migration `20261002000000_add_password_reset_token` aplicada contra o Postgres compartilhado (as 3 migrations anteriores já estavam aplicadas de sessões anteriores, confirmando reprodutibilidade); um container `mailpit` novo subido na mesma rede Docker (`infra-lab_lab-network`). `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` com `DATABASE_URL`+`SMTP_HOST`+`MAILPIT_*` reais: 71/71 passando (16 cenários de `router.test.ts` incluindo os 5 novos de `requestPasswordReset`/`resetPassword`, 5 de `prisma-password-reset-token-store.test.ts`, mais toda a suíte pré-existente sem regressão). Script `probe-password-reset.mts` (descartado após o uso) provou o fluxo completo fim-a-fim através das procedures reais (não unitário/fake): login real → requestPasswordReset → email real capturado pelo Mailpit → token extraído do corpo real → resetPassword → refresh ANTIGO rejeitado (prova real de `revokeAllForUser`) → login com senha antiga rejeitado → login com senha nova funciona → reuso do token rejeitado. Scratch (container Mailpit, diretório sincronizado, tarballs, script de probe) limpo ao final.

- **Revalidação pós-patches do code review**: os 5 patches (try/catch em `requestPasswordReset`, 3 testes novos espelhando o padrão fail-closed/recordFailure/resetLink do `login`, e o teste de `resetPassword` reescrito com `PrismaTokenRevocationStore` real + fake stateful) revalidados de ponta a ponta: projeto regenerado localmente (typecheck/lint/format/test limpos, 64 passaram/10 pularam) e depois contra Postgres+Mailpit reais novos no Laboratório Integrit — 74/74 testes passando (3 a mais que a rodada pré-patch) + o script de probe completo (login→reset→Mailpit real→revogação real→reuso bloqueado) revalidado com sucesso. 2 achados de lint reais corrigidos nessa rodada (`@typescript-eslint/no-unnecessary-type-assertion` no cast `revokeOrder as number`, que se tornou redundante depois do `invocationCallOrder` já inferir `number`).

### Completion Notes List

- Todas as 8 Tasks completas. `auth.requestPasswordReset`/`auth.resetPassword` (FR-19) implementados reaproveitando integralmente a infraestrutura já existente: `RateLimiter`/`RateLimitIdentity` (Story 2.2, zero mudança), `EmailProvider`/template `password-reset` (Story 4.1), formatter RFC 9457 (Story 1.1) — nenhum desses precisou de nenhuma alteração, só novos consumidores.
- **Extensões de interface fechando gaps já documentados como "story futura"**: `TokenRevocationStore.revokeAllForUser` fecha o gap que o comentário original da Story 2.1 (`token-revocation-store.ts`) já previa textualmente; `PasswordResetTokenStore` é desenhado de propósito pra ser neutro (não amarrado a "esqueci minha senha"), preparado pra Epic 5 (FR-15) reaproveitar sem redesenho.
- **Atomicidade do consumo do token** (AC #5): `updateMany` com `WHERE usedAt IS NULL AND expiresAt > now()` é a operação atômica real que decide a corrida — provado por teste unitário (segunda tentativa de `consume` no mesmo token sempre falha) e pela prova real de ponta a ponta (Teste 8 do probe).
- **Validação real de ponta a ponta sem bug escapando da primeira rodada de verdade** (achou e corrigiu 2 problemas reais no processo: erro de lint `prefer-optional-chain` só visível no projeto regenerado, e um erro de sintaxe de aspas no próprio gerador) — typecheck/lint/format limpos + 71/71 testes reais contra Postgres+Mailpit do Laboratório Integrit + prova fim-a-fim dedicada confirmando as 8 ACs principais (enumeração, rate limit, atomicidade, invalidação real de sessão, uso único real).

### File List

- `src/scaffolding/templates/db.ts` (editado — model `PasswordResetToken`, relação em `User`, migration `20261002000000_add_password_reset_token`)
- `src/scaffolding/write-structural-seed.test.ts` (editado — novo arquivo de migration esperado, nova asserção de schema)
- `src/scaffolding/templates/auth.ts` (editado — `hash-token.ts` (novo, extraído), `token-revocation-store.ts` (+`revokeAllForUser`), `refresh-token-store.ts` (+`updateMany`), `prisma-token-revocation-store.ts`/`.test.ts` (+`revokeAllForUser`), `auth-provider.ts` (+`findUserByEmail`/`setPassword`), `user-lookup.ts` (+`update`), `argon2-auth-provider.ts`/`.test.ts` (+implementação/testes), `password-reset-token-store.ts` (novo), `password-reset-token-repository.ts` (novo), `prisma-password-reset-token-store.ts`/`.test.ts` (novo), `providers.ts` (+`passwordResetTokenStore`), `router.ts`/`.test.ts` (+`requestPasswordReset`/`resetPassword` e testes))
- `src/scaffolding/templates/api.ts` (editado — `passwordResetTokenStore` em `context.ts`/`test-utils.ts`)
- `src/scaffolding/templates/shared.ts` (editado — `requestPasswordResetInputSchema`/`resetPasswordInputSchema`)
- `src/scaffolding/templates/root.ts` (editado — `WEB_PUBLIC_URL` em `.env.development`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (editado)
- `_bmad-output/implementation-artifacts/deferred-work.md` (editado — itens deferidos do code review)
