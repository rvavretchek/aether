---
baseline_commit: 61c560a
---

# Story 2.1: Login com `AuthProvider` — JWT + Refresh + Argon2id

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como um usuário de um sistema construído com Aether,
Eu quero me autenticar com email/senha e receber um access token de curta duração + um refresh token de longa duração, sem que minha senha ou os segredos da aplicação fiquem expostos em nenhum momento,
Para que eu acesse rotas protegidas do sistema com segurança, e consiga renovar minha sessão sem precisar logar de novo a cada poucos minutos.

## Acceptance Criteria

1. **`AuthProvider` como interface + adapter local (FR-10).** `apps/api/src/core/auth/` expõe uma interface `AuthProvider` (porta) com um método `authenticate(email, password, tenantId)`, e uma implementação `Argon2AuthProvider` (adapter) que verifica a senha contra o hash Argon2id armazenado. Nenhum código de negócio importa `Argon2AuthProvider` diretamente — só via `providers.ts` (AD-4).
2. **`SecretsProvider` como interface + adapter local (FR-26).** `apps/api/src/core/secrets/` expõe uma interface `SecretsProvider` com `getSecret(key)`, e uma implementação `EnvSecretsProvider` que lê de variável de ambiente. O pepper do Argon2id (FR-8) e a chave de assinatura JWT (`jose`) são lidos exclusivamente por essa interface — nunca hardcoded, nunca gerados ad-hoc por módulo.
3. **Composição única em `providers.ts` (AD-4).** `apps/api/src/core/providers.ts` é o único arquivo que instancia `Argon2AuthProvider`/`EnvSecretsProvider`/`PrismaTokenRevocationStore` a partir de config/env; a instância chega a `router.ts` só via `ctx` do tRPC, injetado uma vez em `createContext`.
4. **Hashing Argon2id + Pepper (FR-8).** Senha armazenada nunca em texto plano nem hash reversível; parâmetros de custo seguem o baseline OWASP atual pra Argon2id (ver Dev Notes pra valores exatos, verificados nesta story); pepper lido via `SecretsProvider`.
5. **Tabela `User` real, escopada por Tenant (FR-11 parcial — ver Dev Notes sobre o corte com a Epic 3).** `packages/db/schema.prisma` ganha os models `Tenant` e `User` (id UUID v7, `tenantId`, email único por tenant, `passwordHash`, timestamps) — primeira migration Prisma real do projeto (Story 1.1 deixou só `generator`/`datasource`, sem `model`).
6. **Login emite access token JWT + refresh token opaco (FR-7).** Dado um `User` existente com credenciais corretas e o `tenantId` certo, a procedure `login` retorna um access token (JWT de vida curta, minutos) no corpo da resposta e seta um refresh token (string opaca, **não** um JWT) num cookie `httpOnly`+`SameSite`. O access token nunca é setado em cookie; o refresh token nunca aparece no corpo da resposta nem é acessível a JavaScript do cliente. O atributo `secure` do cookie é condicional (`NODE_ENV === 'production'`), nunca hardcoded `true` — `pnpm dev` local não tem TLS, e é o único ambiente que este MVP alvo (AD-9).
7. **Refresh token é validável e revogável (FR-9, mecanismo).** `TokenRevocationStore` (Postgres/Prisma-backed, sem Redis) persiste cada refresh token emitido (`jti`, `userId`, `issuedAt`, `expiresAt`, `revokedAt` nulo até revogar) e expõe `revoke(jti)`/`isRevoked(jti)`. Um refresh token revogado ou expirado não gera novo access token — a procedure `refresh` (AC #8) rejeita explicitamente. Acionar `revoke()` a partir de um botão de logout real ou da tela de admin (FR-14) fica pra uma story futura — **o mecanismo completo (tabela + issue + check + revoke) é desta story**, sem ele o próprio fluxo de refresh não teria como existir.
8. **Procedure `refresh` troca refresh token válido por novo access token.** Sem exigir novo login, sem expor o refresh token no corpo da resposta.
9. **Credenciais inválidas não vazam se o problema é "usuário não existe" ou "senha errada" (defesa contra enumeração de usuário).** Mesma mensagem de erro genérica pros dois casos, formato RFC 9457.
10. **Zero Trust interno — verificação própria sempre (NFR §8.1). [ESCOPO AJUSTADO no code review, 2026-09-02 — ver Change Log]** Esta story é responsável por *emitir* o access token de forma compatível com Zero Trust (JWT assinado, `alg` explícito no header — já cumprido pela procedure `login`/`refresh` via `jose`/HS256). A verificação em si — `AuthProvider.verifyToken` com `algorithms` explicitamente fixado no lado de quem *consome* o token — nasce junto com o middleware de enforcement da Epic 3 (primeiro consumidor real de um access token), não nesta story, que não tem nenhuma rota protegida a proteger ainda. Decisão do Boss no code review: adiar formalmente, não implementar uma primitiva sem consumidor só para fechar a AC no papel.
11. **Lint/format/typecheck/test passam de fábrica.** Mesma barra da Story 1.1 — `pnpm lint`/`pnpm format:check`/`pnpm typecheck`/`pnpm test` sem alteração manual, rodando de verdade contra um projeto gerado por `aether-admin new`.

## Tasks / Subtasks

- [x] **Task 1 — Novo template `auth.ts` + `SecretsProvider` (AC: #2)**
  - [x] 1.0 Criar `src/scaffolding/templates/auth.ts` (`buildAuthFiles(): Record<string,string>`, paths relativos a `apps/api/`), mesclar em `write-structural-seed.ts` com o mesmo prefixo de `buildApiFiles` — ver Dev Notes "Onde este código realmente vive"
  - [x] 1.1 Interface `SecretsProvider` (arquivo de template gerando `apps/api/src/core/secrets/secrets-provider.ts`)
  - [x] 1.2 Adapter `EnvSecretsProvider` (lê `process.env`, erro explícito se a chave não existir — nunca retorna `undefined` silenciosamente)
  - [x] 1.3 Teste unitário do adapter
  - [x] 1.4 `src/scaffolding/templates/root.ts`: `.env.development` ganha `ARGON2_PEPPER` e `JWT_SIGNING_KEY` (valores fixos de dev, não-secretos de produção, mesmo padrão do `aether_dev_password` já existente)

- [x] **Task 2 — `Tenant` + `User` no schema Prisma (AC: #5)**
  - [x] 2.0 `src/scaffolding/templates/root.ts`: `pnpm-workspace.yaml` — adicionar `prisma`/`@prisma/engines` a `onlyBuiltDependencies`/`allowBuilds`. **Risco conhecido:** Story 1.1 reproduziu 3+ vezes um crash real do pnpm 11.24 neste ambiente (Windows/Git Bash) no preinstall do `prisma` (`Error: readStream must be readable`, `pnpm.mjs`) — é por isso que Story 1.1 evitou instalar o pacote. Testar `pnpm install` real cedo nesta task, isolado, antes de escrever qualquer outro código desta story. **Se reproduzir:** não é erro de configuração — investigar (a) alternativa de versão do pnpm nesse ambiente, (b) rodar o install fora do wrapper de spawn atual (`runCommand`), (c) como último recurso, desabilitar o postinstall do prisma via `pnpm.neverBuiltDependencies`/config equivalente e rodar `prisma generate` como step explícito e separado do `pnpm install`. Documentar a escolha no Debug Log — não seguir em frente silenciosamente se reproduzir. **[RESOLVIDO — ver Debug Log]**
  - [x] 2.1 Template `db.ts`: `package.json` de `packages/db` ganha `prisma`/`@prisma/client`/`@prisma/adapter-pg` de verdade — primeira vez (Story 1.1 deixou isso pendente deliberadamente, ver Dev Notes) — e scripts `generate`/`migrate` reais
  - [x] 2.2 Adicionar `model Tenant` e `model User` em `packages/db/schema.prisma` (UUID v7, `tenantId` em `User`, colunas físicas `snake_case` via `@map`, índice único `(tenantId, email)`)
  - [x] 2.3 `prisma.config.ts` real com o driver adapter Postgres (substitui o placeholder `// TODO(Epic 2/3)` deixado pela Story 1.1 em `src/scaffolding/templates/db.ts`)
  - [x] 2.4 Gerar e aplicar a migration inicial

- [x] **Task 3 — `AuthProvider` (AC: #1, #4)**
  - [x] 3.1 Interface `AuthProvider` em `apps/api/src/core/auth/auth-provider.ts`
  - [x] 3.2 Adapter `Argon2AuthProvider` — hash/verify com pepper via `SecretsProvider`, parâmetros de custo OWASP explícitos
  - [x] 3.3 Testes unitários (hash+verify funciona, parâmetros corretos, pepper nunca hardcoded)

- [x] **Task 4 — `TokenRevocationStore` (AC: #7)**
  - [x] 4.1 `model RefreshToken` no schema Prisma + migration (jti, userId, issuedAt, expiresAt, revokedAt nullable — tabela própria, sem reaproveitar colunas de outra)
  - [x] 4.2 Interface `TokenRevocationStore`
  - [x] 4.3 Adapter `PrismaTokenRevocationStore` — `issue`/`isRevoked`/`revoke`. Refresh token opaco = `crypto.randomBytes(32)` codificado base64url (256 bits de entropia) — só o hash (não o valor bruto) é o que se guarda como `jti`/lookup key, mesmo racional do pepper: nunca persistir o segredo em texto recuperável. (Adicionado também `getUserId` — necessidade pragmática descoberta durante a implementação, ver Debug Log.)
  - [x] 4.4 Testes unitários

- [x] **Task 5 — Composição em `providers.ts` + wiring em `context.ts`/`server.ts` (AC: #3)**
  - [x] 5.1 `providers.ts`: único arquivo instanciando os três Providers a partir de config/env
  - [x] 5.2 `apps/api/src/context.ts`: `Context` deixa de ser `{}` — passa a expor `req`/`res` (Fastify) + as instâncias de `providers.ts`; `createContext` monta isso a partir do request real
  - [x] 5.3 `apps/api/src/server.ts`: registrar `@fastify/cookie` (`server.register(fastifyCookie)`) — sem isso `ctx.res.setCookie` não existe em runtime
  - [x] 5.4 **Corrigir `apps/api/src/modules/system/router.test.ts`** (Story 1.1) — os três `createCaller({})` quebram assim que `Context` deixa de ser `{}`. Criar um helper reaproveitável `createTestContext(overrides?)` (ex.: em `apps/api/src/test-utils.ts`) retornando um `Context` mínimo válido (providers reais ou stub simples, `req`/`res` mockados o suficiente pra não quebrar) — reaproveitar esse helper também nos novos testes de `login`/`refresh` (Task 6.5), em vez de duplicar a montagem de contexto em cada arquivo de teste.

- [x] **Task 6 — Procedures `login` + `refresh` (AC: #6, #8, #9, #10)**
  - [x] 6.1 (AC #6) Schemas Zod de input/output em `packages/shared/src/schemas/auth.ts`
  - [x] 6.2 (AC #6; AC #10 parcial — só a emissão, ver nota de escopo ajustado na AC #10) Procedure `login` — autentica, emite JWT (jose, HS256) + refresh opaco, seta cookie `httpOnly`+`SameSite`+`secure` condicional via `@fastify/cookie`
  - [x] 6.3 (AC #8) Procedure `refresh` — troca refresh token válido (não revogado, não expirado) por novo access token
  - [x] 6.4 (AC #9) Mensagem de erro genérica idêntica pra "usuário não existe" e "senha errada"
  - [x] 6.5 (AC #9) Testes via `router.createCaller` (usando `createTestContext` da Task 5.4): login sucesso, senha errada, usuário inexistente, refresh válido, refresh revogado/expirado. **Os dois casos de erro de AC #9 (senha errada vs. usuário inexistente) precisam de um teste que compare as duas respostas e assegure que são byte-idênticas** (mesmo `status`/`title`/`detail`/`type` RFC 9457) — não just "ambas genéricas", uma asserção de igualdade direta entre as duas respostas de erro.

- [x] **Task 7 — Validação final (AC: #11)** — ver ressalva sobre o passo de banco real no Debug Log
  - [x] 7.1 Mesma sequência da Story 1.1: regenerar um projeto via `aether-admin new` num diretório limpo fora do repo (path curto — ver achado do Debug Log da Task 2.4), `pnpm install` real, `pnpm typecheck`/`pnpm lint`/`pnpm format:check`/`pnpm test`, subir o servidor (`logger:true` já presente) e validar `login`→`refresh` de ponta a ponta com `curl` real (cookie setado, access token retornado, refresh funcionando) — corrigir o que quebrar antes de marcar a story `done`. **`login`→`refresh` de ponta a ponta contra um Postgres real NÃO foi possível nesta sessão** (Docker indisponível; o Postgres nativo já instalado nesta máquina exige credenciais que não tenho e não tentei adivinhar) — ver Debug Log pro que foi de fato validado nesse lugar. **[FECHADO em sessão seguinte — ver "Atualização pós-sessão" no Debug Log abaixo]**

### Review Findings

**Revisão adversarial em 3 camadas (Blind Hunter, Edge Case Hunter, Acceptance Auditor) contra o diff completo desta story, 2026-09-02.**

**Decision-needed (1) — resolvido:**

- [x] [Review][Decision] AC #10 exige "Zero Trust interno" — que "todo consumo do access token passa por `AuthProvider.verifyToken`, com `algorithms` explicitamente fixado". Nenhum `verifyToken` existe em lugar nenhum do diff: a interface `AuthProvider` só declara `hash`/`authenticate`, e `jose` só é usado para *emitir* o JWT (`SignJWT`) em `router.ts`, nunca para verificá-lo. **Resolvido pelo Boss: opção (b)** — adiado formalmente pra Epic 3 (primeiro consumidor real de um access token, via o middleware de enforcement), em vez de implementar uma primitiva sem consumidor só pra fechar a AC no papel. AC #10 e Task 6.2 reescritas com nota de escopo ajustado — esta story cobre só a *emissão* Zero-Trust-compatível (JWT assinado, `alg` explícito), não a verificação em si. — [_bmad-output/implementation-artifacts/2-1-login-jwt-refresh.md, ACs #10 e Task 6.2; src/scaffolding/templates/auth.ts, interface `AuthProvider`]

**Patch (13):**

- [x] [Review][Patch] `DATABASE_URL` é lido em `db/client.ts` no top-level do módulo (`new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' })`), mas esse módulo é importado transitivamente por `server.ts` (via `context.ts` → `providers.ts`) *antes* do próprio `loadEnvFile()` de `server.ts` rodar — avaliação de import estático ESM sempre executa o grafo de dependências inteiro antes do corpo do módulo importador. Num `pnpm dev` de verdade, do zero, sem env var já setada no SO, `DATABASE_URL` chega vazio na construção do adapter. Só não apareceu na validação real do lab porque o Docker Compose injeta `DATABASE_URL` como env var do container antes do Node nem iniciar — mascarando o bug pro fluxo de dev local puro que a Task 7.1 documenta. **Corrigido:** env agora carrega via `--env-file=../../.env.development` no script `dev` (nativo do Node, processado antes de qualquer import) em vez de `loadEnvFile()` em runtime dentro de `server.ts` — removido por não resolver o problema (chegava tarde demais de qualquer forma). [src/scaffolding/templates/db.ts, src/scaffolding/templates/api.ts]
- [x] [Review][Patch] Timing side-channel em `Argon2AuthProvider.authenticate()` — retorna cedo (sem chamar `argon2.verify`) quando o usuário não existe, mas paga o custo cheio do Argon2id quando existe com senha errada. Diferença de tempo de resposta mensurável entre os dois casos, mesmo com corpo de erro byte-idêntico — exatamente o oráculo de timing que a defesa da AC #9 deveria fechar. [src/scaffolding/templates/auth.ts:106-127]
- [x] [Review][Patch] `refresh` faz duas consultas separadas e não-atômicas (`isRevoked()` depois `getSubject()`), e `getSubject()` nunca reconfere `revokedAt`/`expiresAt` por conta própria — um token revogado/expirado entre as duas chamadas ainda gera um access token novo. Colapsar em uma única consulta que já valida revogação/expiração resolve as duas coisas (correção + elimina o round-trip duplicado ao banco). [src/scaffolding/templates/auth.ts:335-362, 556-573]
- [x] [Review][Patch] O teste de AC #9 ("byte-idênticas") só compara `TRPCError.code`/`.message` via `router.createCaller` — que nunca passa pelo `errorFormatter`/`buildProblemDetails` (Story 1.1) que de fato produz o envelope RFC 9457. Não verifica o que a própria Task 6.5 pede literalmente (`status`/`title`/`detail`/`type` idênticos). [src/scaffolding/templates/auth.ts:651-684]
- [x] [Review][Patch] Nenhum teste de `login` inspeciona a chamada a `ctx.res.setCookie` — nome do cookie, `httpOnly`/`sameSite`/`secure`/`maxAge` nunca são verificados, apesar de ser o mecanismo central da AC #6. [src/scaffolding/templates/auth.ts:624-649]
- [x] [Review][Patch] Teste "nunca persiste o valor bruto do token" é vazio — faz `findUnique({ where: { jti: rawToken } })`, mas `jti` é sempre `hashToken(rawToken)` por construção; a busca retornaria `null` mesmo que o valor bruto fosse persistido em outra coluna qualquer. Não protege contra a regressão que diz proteger. [src/scaffolding/templates/auth.ts:413-424]
- [x] [Review][Patch] `loginInputSchema.email` só faz `.trim()`, nunca `.toLowerCase()`, enquanto `@@unique([tenantId, email])` é case-sensitive no Postgres — login com email de capitalização diferente do cadastro vai falhar silenciosamente assim que existir um fluxo de registro. Sem alcance nesta story (não há criação de usuário ainda), mas barato de corrigir agora antes do schema virar carga histórica. [src/scaffolding/templates/shared.ts:54-58]
- [x] [Review][Patch] `password` não tem limite superior de tamanho (`z.string().min(1)`) — payload de tamanho arbitrário aceito num endpoint público não-autenticado. [src/scaffolding/templates/shared.ts:54-58]
- [x] [Review][Patch] `argon2.verify` não está protegido contra um `passwordHash` malformado/corrompido — um throw vazaria como 500 não tratado em vez da resposta uniforme de "credenciais inválidas" que a AC #9 promete. [src/scaffolding/templates/auth.ts:119-124]
- [x] [Review][Patch] Teste do pepper é vazio — `expect(hash).not.toContain('test-pepper-not-for-real-use')` passaria mesmo que a opção `secret:` fosse silenciosamente removida da chamada a `argon2.hash()`; não prova que o pepper está sendo aplicado de fato. [src/scaffolding/templates/auth.ts:230-236]
- [x] [Review][Patch] `refreshOutputSchema` duplica `loginOutputSchema` campo a campo em vez de reaproveitar — os dois vão dessincronizar silenciosamente na primeira vez que um precisar carregar mais que `accessToken`. [src/scaffolding/templates/shared.ts:60-66]
- [x] [Review][Patch] Limpeza inconsistente de `process.env` entre os novos testes de auth — `env-secrets-provider.test.ts` limpa em `afterEach`; `argon2-auth-provider.test.ts`/`router.test.ts` setam `ARGON2_PEPPER`/`JWT_SIGNING_KEY` sem nenhum teardown, dependendo (sem documentar) do isolamento por arquivo do vitest. [src/scaffolding/templates/auth.ts]
- [x] [Review][Patch] Comentário de `hashToken` superestima o paralelo de segurança com o pepper ("mesmo racional do pepper") — é um SHA-256 puro, sem HMAC/segredo, seguro só porque a entrada já tem 256 bits de entropia (`randomBytes(32)`), nada parecido com o papel do pepper protegendo uma senha humana de baixa entropia. Risco de confundir um mantenedor futuro. [src/scaffolding/templates/auth.ts:313-317]

**Defer (3):**

- [x] [Review][Defer] **Reclassificado de Patch pra Defer durante a aplicação dos patches** — `aether-admin new` nunca aplica as migrations do Prisma — o pipeline roda `generatePrismaClient` (só codegen do client) mas nunca `prisma migrate deploy`/equivalente. Um projeto recém-scaffolded não tem nenhuma tabela; a primeira chamada de `login` falharia com "relation users does not exist" — contradiz FR-6 e o objetivo de golden-path da Task 7. **Por que não foi corrigido agora:** o fix óbvio (chamar `prisma migrate deploy` dentro de `runNew`) quebraria `aether-admin new` na prática — nada nesse comando sobe o Postgres primeiro; `aether-admin dev` (FR-4), que orquestraria Docker Compose + servidores, é ainda só um placeholder (`root.ts`: `dev: 'echo "aether-admin dev chega na Epic 1 Story 3 (FR-4)"'`). Aplicar migration num banco que ainda não existe falharia sempre, trocando um bug conhecido por outro. Aplicar migrations é responsabilidade de `aether-admin dev`, não de `new` — depende da Story de Epic 1 que implementa FR-4. [src/cli/commands/new.ts]
- [x] [Review][Defer] Negação de build script do pnpm (`prisma:false`/`"@prisma/engines":true` em `pnpm-workspace.yaml`) generalizada pra todo projeto gerado a partir de um bug reproduzido isolado só nesta máquina Windows/Git Bash/pnpm 11.24 — nunca validado em Linux/macOS. [src/scaffolding/templates/root.ts] — deferred, pre-existing
- [x] [Review][Defer] O novo teste de rollback de `generatePrismaClient` (`new.test.ts`) verifica só a ordem de wiring dos mocks, não que `installDependencies` de fato precisa completar antes na implementação real. [src/cli/commands/new.test.ts] — deferred, pre-existing

**Dismissed como ruído/já endereçado (4):** sem rotação/detecção de reuso de refresh token (arquitetura válida, mas fora do escopo de nenhuma AC desta story); ausência de fluxo de criação de usuário (lacuna do PRD já documentada explicitamente nos Dev Notes da própria story); nomenclatura `revoke(jti)`/`isRevoked(jti)` da AC #7 vs. parâmetro `rawToken` recebido (decisão de segurança deliberada e já documentada — nunca persistir o token bruto); coluna `tenantId` denormalizada em `RefreshToken` além do que a AC #7 lista literalmente (achado pragmático da Task 6, já justificado e documentado no Debug Log).

## Dev Notes

### 🎯 Onde este código realmente vive — templates do gerador, não arquivos deste repo

**Achado crítico do review de qualidade desta story — leia antes de tudo o resto.** Todo path citado nas ACs e nas Tasks acima (`apps/api/src/core/auth/...`, `packages/db/schema.prisma`, etc.) é um path **dentro do projeto que `aether-admin new` gera** — não um arquivo deste repositório. Este repo é o gerador (mesmo modelo já estabelecido e verificado na Story 1.1): o código real a escrever fica em `src/scaffolding/templates/*.ts`, como funções builder que retornam `Record<caminhoRelativo, conteúdoDoArquivo>`, compostas por `src/scaffolding/write-structural-seed.ts`.

Dado o volume novo desta story (SecretsProvider, AuthProvider, TokenRevocationStore, `providers.ts`, procedures de login/refresh, vários testes), **criar um novo arquivo de template** `src/scaffolding/templates/auth.ts`, exportando `buildAuthFiles(): Record<string, string>` — mesmo padrão de `buildApiFiles`/`buildDbFiles`/`buildDockerFiles` (paths relativos a `apps/api/`, ex.: `'src/core/secrets/secrets-provider.ts'`). Não amontoar tudo dentro do já grande `api.ts`. Em `write-structural-seed.ts`, mesclar a saída de `buildAuthFiles(...)` no conjunto de arquivos de `apps/api/` (mesmo prefixo de path que `buildApiFiles`) — `write-structural-seed.test.ts` (já existente) pega qualquer erro de prefixo/path errado.

O que muda em arquivos de template **já existentes**:
- `src/scaffolding/templates/db.ts` — `schema.prisma` ganha `model Tenant`/`model User`/`model RefreshToken`; `package.json` do pacote `packages/db` ganha `prisma`/`@prisma/client`/`@prisma/adapter-pg` de verdade; `prisma.config.ts` deixa de ser o placeholder da Story 1.1.
- `src/scaffolding/templates/root.ts` — `pnpm-workspace.yaml` passa a aprovar o build script do `prisma` (ver Task 2.0 abaixo); `.env.development` ganha `ARGON2_PEPPER` e `JWT_SIGNING_KEY` (valores de dev fixos, não-secretos de produção — mesmo espírito do `aether_dev_password` já usado pro Postgres, FR-6 "zero edição manual").
- `src/scaffolding/templates/api.ts` — `context.ts` (Context ganha `req`/`res`/providers), `server.ts` (registra `@fastify/cookie`), `root-router.ts` (agrega `auth: authRouter`), `modules/system/router.test.ts` **precisa ser atualizado** (ver Task 5.4 — quebra quando `Context` deixa de ser `{}`).

**core/auth/router.ts NÃO é um módulo Hexagonal (AD-1 não se aplica a `core/`).** As procedures `login`/`refresh` ficam direto em `core/auth/router.ts` — sem `domain/`/`repository.ts`/`resources.ts` separados, deliberadamente mais simples que o padrão de módulo de negócio (Epic 3). `root-router.ts` combina como `auth: authRouter`, ao lado de `system: systemRouter`.

### ⚠️ Duas restrições de escopo descobertas nesta story — leia antes de implementar

1. **Corte de FR-11 entre Epic 2 e Epic 3 (achado durante `create-story`, corrigido em `epics.md`).** FR-11 original mapeava inteiro pra Epic 3 — mas login (FR-7/FR-8) precisa de um `User` persistido pra autenticar contra algo, e a tabela não existiria até a Epic 3 rodar. Mesma classe de contradição já resolvida no AD-6 da Story 1.1 (lá, dentro de uma epic; aqui, entre epics). **Resolução:** a tabela `User` básica nasce nesta story (Task 2) — id, tenantId, email, passwordHash, timestamps, escopada por Tenant desde já (AD-5, "multitenancy no schema desde o início"). Grupo/Papel/Módulo/`ModuleClosure` e as relações que ligam `User` a eles continuam na Epic 3, como uma migration incremental que **estende** esta tabela, nunca a recria.
2. **FR-9 (revogação) está nesta story por necessidade estrutural, não por acaso.** O fluxo de `refresh` (AC #8) só existe se houver algum lugar pra validar um refresh token — ou seja, o `TokenRevocationStore` completo (tabela + `issue`/`isRevoked`/`revoke`) é pré-requisito de "login funcionar de verdade", não uma feature separável adiável. O que **fica pra depois** é só o *gatilho* de revogação vindo de um humano (botão de logout, tela de admin FR-14) — o `revoke()` em si, como método da classe, é construído e testado aqui.

### Sem tenant-aware Prisma Client Extension (AD-5) nesta story — decisão deliberada

AD-5 exige que todo acesso a modelo escopado por Tenant passe por uma extensão do Prisma Client consciente de `tenantId`, **exceto fluxos pré-autenticação** — que "recebem `tenantId`/`tenantSlug` como input explícito da procedure" (Architecture Spine, AD-5, texto literal). `login` é exatamente esse caso: não existe `ctx.user` autenticado ainda pra extrair `tenantId` dele. A query de `core/auth` (login/refresh) usa o Prisma Client direto, filtrando por `tenantId` explicitamente recebido como input — **não é uma violação da AD-5** (a regra mira `repository.ts` de módulo de negócio gerado, não `core/auth`), é o próprio caminho que a AD-5 já previu pra esse caso. A extensão genérica (usada por `ctx.tenantId` em queries autenticadas de módulos de negócio) é escopo da Epic 3, quando `generate module` passar a produzir `repository.ts` de verdade.

### Sem gatilho de criação de usuário nesta story (lacuna conhecida do PRD)

Não existe nenhuma FR de auto-cadastro no PRD — identidade é sempre admin-managed (import em lote, FR-15, Epic 5; ou reset de senha, FR-19, Epic 4). Isso significa: **não há, ainda, nenhum caminho de produto pra criar o primeiro usuário de um projeto novo.** Pra esta story ser testável (login precisa de um `User` com hash real no banco), os testes criam o usuário de teste diretamente via Prisma no `beforeEach` (usando o próprio `Argon2AuthProvider.hash` pra gerar o hash) — **não** é um script de seed como feature de produto, é infraestrutura de teste. Como o primeiro usuário de um projeto real é criado é uma lacuna do PRD ainda em aberto, não desta story resolver.

### Especificações técnicas atuais (pesquisa web, verificado 2026-08-31)

**Versões atuais confirmadas:** `argon2` 0.45.1 · `jose` 6.2.10 (ESM-only) · `@fastify/cookie` 11.1.2 (declara Fastify `^5.0.0`, compatível). `@trpc/server`/`@trpc/client` continuam pinados em **11.18.0** (já em uso real na Story 1.1, `pnpm install` confirmado várias vezes contra o registry — a pesquisa desta story bateu num valor `11.1.2` de uma única consulta que diverge do que já está empiricamente verificado; **não usar** esse número, manter `11.18.0`).

**`argon2` — API e baseline OWASP confirmados:**
```ts
import * as argon2 from 'argon2';

const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 19456, // KiB — baseline OWASP "opção 2", confirmado atual
  timeCost: 2,
  parallelism: 1,
  secret: pepperBuffer, // pepper via SecretsProvider, como Buffer
});
const ok = await argon2.verify(hash, password, { secret: pepperBuffer });
```
**Importante:** os defaults da própria lib NÃO são o baseline OWASP (default real é `memoryCost:65536, timeCost:3, parallelism:4`) — os três parâmetros têm que ser passados explicitamente, nunca confiar no default.

**`jose` — HS256 escolhido pra esta story (não EdDSA) — reconciliado com a Architecture Spine.** `ARCHITECTURE-SPINE.md` originalmente fixava EdDSA na Stack table; essa story reverteu pra HS256 e **a Spine já foi atualizada** (nota de reconciliação datada 2026-08-31 na própria tabela) — não é mais uma divergência não-resolvida entre este documento e a fonte de verdade. Razão: EdDSA exige gerar/armazenar um keypair PEM via `SecretsProvider`, complexidade de key management sem requisito real do projeto ainda (nenhum verificador externo sem acesso ao segredo, único cenário em que assimetria compra algo). HS256 com chave simétrica de alta entropia lida via `SecretsProvider` (mesmo caminho do pepper) é suficiente pro MVP.
```ts
import { SignJWT, jwtVerify } from 'jose';

const key = new TextEncoder().encode(jwtSigningKeySecret); // string via SecretsProvider → Uint8Array

const jwt = await new SignJWT({ sub: userId, tenantId })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('15m')
  .sign(key);

const { payload } = await jwtVerify(jwt, key, {
  algorithms: ['HS256'], // nunca confiar no alg do próprio token (AC #10)
});
```

**`@fastify/cookie` — setar/ler o refresh token:**
```ts
import fastifyCookie from '@fastify/cookie';
await server.register(fastifyCookie);

// dentro da procedure login, via ctx.res (ver nota tRPC+Fastify abaixo)
ctx.res.setCookie('refresh_token', opaqueRefreshToken, {
  httpOnly: true,
  sameSite: 'strict',
  // `secure:true` fixo quebraria login em todo `pnpm dev` local (sem TLS) — o único
  // ambiente que este MVP alvo (AD-9, sem deploy de produção). Condicional por env,
  // nunca hardcoded true.
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 dias, valor de exemplo — ajustar por env se necessário
});

// requisição seguinte
const token = request.cookies.refresh_token;
```

**tRPC 11 + Fastify — setar cookie de dentro de uma procedure funciona sem gotcha.** Diferente do adapter fetch/Next.js (que expõe só um `resHeaders: Headers`), o adapter Fastify do tRPC passa o `FastifyReply` real via `ctx.res` — o mesmo objeto que o adapter chama `.send()` no final. Cookie setado com `ctx.res.setCookie(...)` dentro da procedure `login` funciona porque o Fastify buffera headers até o `.send()` explícito no fim do request handler. `createContext` já existe desde a Story 1.1 (`apps/api/src/context.ts`) — só precisa passar a expor `req`/`res` no `Context` em vez do objeto vazio atual.

### Arquitetura — o que seguir à risca

- **AD-4 (composição de Providers):** só `providers.ts` instancia as classes concretas; código consumidor só importa o tipo da interface. Chave JWT segue o mesmo caminho do pepper — via `SecretsProvider`, nunca hardcoded.
  [Source: ARCHITECTURE-SPINE.md#AD-4]
- **AD-5 (tenant):** ver seção acima — exceção explícita pra fluxo pré-autenticação.
  [Source: ARCHITECTURE-SPINE.md#AD-5]
- **AD-10 (rate limiting, NÃO desta story):** `RateLimitHit` é tabela própria, separada do `TokenRevocationStore` — fica pra Story 2.2, junto com o plugin de rate limit em `core/auth`.
  [Source: ARCHITECTURE-SPINE.md#AD-10]
- **Consistency Conventions — Autenticação:** access token JWT em memória no cliente; refresh token em cookie `httpOnly`+`SameSite`; nunca em `localStorage`. Zero Trust interno — toda requisição verifica a assinatura do JWT por si mesma.
  [Source: ARCHITECTURE-SPINE.md#Consistency-Conventions]
- **Consistency Conventions — Hashing:** Argon2id via `argon2`, parâmetros OWASP baseline (ver pesquisa web acima pros valores exatos verificados nesta story).
- **Convenção de IDs:** UUID v7 (`@default(uuid(7))`), colunas físicas `snake_case` via `@map`/`@@map`.
- **Convenção de erros:** RFC 9457 Problem Details, `invalid-params[]` em JSON Pointer — mesmo `buildProblemDetails` já construído na Story 1.1 (`apps/api/src/trpc.ts`), reaproveitar, não duplicar.

### Aprendizados da Story 1.1 (aplicar aqui)

- **Rodar `pnpm install` de verdade cedo** — pnpm 11 bloqueia scripts de postinstall por padrão; `prisma`/`@prisma/engines` têm um bug real de `preinstall` neste ambiente específico (Windows/Git Bash) que trava `pnpm install` com "readStream must be readable" — investigar se ainda reproduz antes de assumir que "instalar prisma" é trivial nesta story (Story 1.1 evitou completamente instalar `prisma` por causa disso; esta story não tem como evitar, já que a tabela `User` exige o pacote de verdade).
- **Testar contra o servidor real, não só unit test isolado** — vários bugs da Story 1.1 (Fastify sem `logger:true`, envelope do tRPC, `setErrorHandler` ignorando `statusCode`) só apareceram batendo com `curl` no servidor de verdade.
- **`buildProblemDetails`/`ensureTraceparent` já existem e são reaproveitáveis** — não recriar formatação de erro nem correlação de log, só consumir o que já está em `apps/api/src/trpc.ts`/`traceparent.ts`.
- **Pinar versão exata sempre que a pesquisa mostrar `latest` como armadilha** — `typescript`/`react-router`/`prisma` já se provaram assim; verificar `argon2`/`jose`/`@fastify/cookie` com o mesmo cuidado.

### Testing Standards

- Vitest, testes co-localizados. Testes de `login`/`refresh` via `router.createCaller(ctx)` (mesmo padrão de `router.test.ts` da Story 1.1) — sem precisar de servidor HTTP real pra cobertura automatizada; verificação manual com `curl` continua sendo o passo final de validação (Task 7).
  [Source: ARCHITECTURE-SPINE.md#Consistency-Conventions]

### References

- [Source: prd.md#FR-7] — login, JWT+Refresh.
- [Source: prd.md#FR-8] — Argon2id+Pepper.
- [Source: prd.md#FR-9] — revogação via TokenRevocationStore.
- [Source: prd.md#FR-10] — AuthProvider como ponto de extensão.
- [Source: prd.md#FR-26] — SecretsProvider como ponto de extensão.
- [Source: prd.md§8.1] — Zero Trust interno, NIST SP 800-207.
- [Source: ARCHITECTURE-SPINE.md#AD-4, #AD-5, #AD-10] — composição de Providers, tenant, rate limiting (não desta story).
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-2] — escopo e FRs cobertas, nota do corte de FR-11 com a Epic 3.
- [Source: _bmad-output/implementation-artifacts/1-1-aether-admin-new-scaffolding.md] — `buildProblemDetails`, `ensureTraceparent`, convenções já estabelecidas, achados de ambiente reaproveitáveis.

## Change Log

- **2026-09-02** — Code review pós-`dev-story` (Blind Hunter + Edge Case Hunter + Acceptance Auditor). Decisão do Boss sobre o único achado `decision-needed`: **AC #10 (Zero Trust interno) adiada formalmente pra Epic 3** — `AuthProvider.verifyToken` nunca foi implementado nesta story (só a emissão do JWT via `SignJWT`, nunca a verificação via `jwtVerify`), e não há ainda nenhuma rota protegida que o consumiria; implementar a primitiva sem consumidor real só pra fechar a AC no papel foi rejeitado. AC #10 e Task 6.2 reescritas para refletir o escopo real entregue (emissão Zero-Trust-compatível) em vez de reivindicar verificação que não existe — a verificação nasce junto com o middleware de enforcement da Epic 3. 14 findings `patch` e 2 `defer` também registrados na seção Review Findings.
- **2026-09-01** — Review de qualidade fresh-context (`checklist.md`) aplicado antes de liberar pra `dev-story`. 7 Critical Issues corrigidas: (1) esclarecido que o código-alvo são os templates do gerador (`src/scaffolding/templates/*.ts`), não arquivos deste repo — novo Task 1.0 cria `templates/auth.ts`; (2) Task 2.0 explícita pra aprovação do `prisma` no `pnpm-workspace.yaml`, com plano de contingência documentado pro crash conhecido do pnpm 11 neste ambiente; (3) Task 5.4 corrige a quebra de `modules/system/router.test.ts` (`createCaller({})`) via helper `createTestContext`; (4) Tasks 5.2/5.3 tornam explícito o wiring de providers em `context.ts` e o registro de `@fastify/cookie` em `server.ts` (antes só em Dev Notes); (5) `secure:true` do cookie trocado por condicional a `NODE_ENV` (AC #6, código de exemplo); (6) HS256 vs. EdDSA reconciliado — `ARCHITECTURE-SPINE.md` atualizado com nota de reconciliação, deixa de ser contradição não-resolvida; (7) Task 6.5 exige asserção explícita de igualdade byte-a-byte entre as duas respostas de erro de AC #9. Enhancements aplicados: nota AD-1 sobre `core/auth/router.ts` não ser módulo Hexagonal; Task 2.1 menciona scripts `generate`/`migrate`; entropia do refresh token especificada (Task 4.3); Task 7.1 restaura a sequência de validação completa da Story 1.1; subtasks da Task 6 ganharam tags de AC individuais.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5), via skill `bmad-create-story`

### Debug Log References

- **Task 2.0 — crash do pnpm 11 no preinstall do `prisma` reproduzido e resolvido de verdade.** Isolado num probe fora do repo (`prisma`/`@prisma/client`/`@prisma/adapter-pg` 7.10.0, `pnpm-workspace.yaml` aprovando o build): `pnpm install` crashou com `Error: readStream must be readable` em `pnpm.mjs:31437`, idêntico ao documentado na Story 1.1 — confirmado que é um bug real do pnpm 11.24.0 neste ambiente (Windows), não um erro de configuração. Investigação: só o pacote `prisma` (não `@prisma/engines`, não `@prisma/client`, não `@prisma/adapter-pg`) tem um script de lifecycle (`preinstall: node scripts/preinstall-entry.js`) — e ele é só uma checagem de telemetria não-essencial, com try/catch em volta de tudo (`preinstall-entry.js` engole qualquer erro do require). `@prisma/engines` tem seu próprio `postinstall` (baixa o binário real do schema engine) e **não** crasha. Solução real (não a fallback (c) do Dev Notes — mais limpa): `pnpm approve-builds "!prisma"` gera a sintaxe correta (`allowBuilds: { prisma: false }`), que difere de simplesmente omitir `prisma` de `onlyBuiltDependencies` (isso último ainda deixa `pnpm install` saindo com exit code 1 via `ERR_PNPM_IGNORED_BUILDS`, o que quebraria `installDependencies` da Story 1.1). Com `allowBuilds: { "@prisma/engines": true, prisma: false }`: `pnpm install` sai limpo (exit 0), schema engine baixado e funcional (`pnpm exec prisma --version` confirma o binário), `prisma generate`/`migrate` não dependem do script negado pra nada. Aplicado em `src/scaffolding/templates/root.ts`.
- **Task 2.3/2.4 — API de `prisma.config.ts`/driver adapter verificada contra o pacote real instalado (não documentação/memória).** `@prisma/config` 7.10.0 NÃO tem campo `adapter` em `PrismaConfig` — só `datasource: { url?, shadowDatabaseUrl? }`. O adapter (`PrismaPg`) é opção do `PrismaClient` em runtime (`new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`), confirmado nos tipos gerados (`runtime/client.d.ts`) e num smoke test real (`prisma.user.findMany` existe como function). `pg` não precisa ser dependência direta de `packages/db` — já vem embutido em `@prisma/adapter-pg`.
- **Task 2.4 — migration inicial gerada via `prisma migrate diff --from-empty --to-schema schema.prisma --script` real (não Docker — indisponível neste ambiente/sessão), contra o schema exato desta story.** Primeira tentativa deu `ENOENT` no binário do schema engine mesmo ele existindo no disco — causa raiz: o path do probe (dentro do diretório de scratchpad da sessão) excedia 260 caracteres (MAX_PATH do Windows), e o `spawn()` do Node falha silenciosamente nesse caso mesmo quando `Test-Path`/`ls` enxergam o arquivo. Refeito num path curto (`C:\tmp\pp`) — funcionou de primeira. **Confirma pra Task 7 (validação final): rodar `aether-admin new` sempre num diretório de teste com path curto, não dentro do scratchpad de sessão desta vez.** SQL gerado embutido literalmente em `src/scaffolding/templates/db.ts` (`migrations/20260901000000_init_auth/migration.sql`) — sem `DEFAULT` nas colunas de id: confirmado que `@default(uuid(7))` é gerado pelo Prisma Client antes do INSERT, não uma expressão SQL de banco.

- **Task 3 — achado não previsto no Dev Notes original: `argon2` TAMBÉM tem script de install bloqueado por padrão no pnpm 11 (`ERR_PNPM_IGNORED_BUILDS`).** Não é o mesmo bug do `prisma` (não crasha) — é o padrão comum de resolução de binário nativo pré-compilado (`node-gyp-build`). Testado isolado: aprovar (`allowBuilds: { argon2: true }`) resolve limpo, sem crash. Smoke test real confirmou hash/verify funcionando com os parâmetros OWASP exatos (`$argon2id$v=19$m=19456,p=1,t=2$...`), pepper correto rejeita verify com pepper errado (retorna `false`, não lança). `jose`/`@fastify/cookie` testados também, isolados — nenhum dos dois tem script de build, nenhuma ação necessária. Adicionado a `root.ts`.

- **Task 7 — 4 bugs reais encontrados e corrigidos via regeneração real (`aether-admin new` num diretório limpo, `C:\tmp\...` — path curto, não o scratchpad da sessão):**
  1. `import { prisma } from 'db/client.js'` em `core/providers.ts` — errado; o mapeamento de `exports` de `packages/db/package.json` (`'./client': './src/client.ts'`) segue a mesma regra já documentada na Story 1.1 pro `shared/schemas/*`: consumidor importa SEM a extensão (`db/client`, não `db/client.js`). `tsc --build` reportava `TS2307: Cannot find module 'db/client.js'`.
  2. `@prisma/client` não exporta `PrismaClient` até `prisma generate` rodar — e nada no fluxo de `aether-admin new` rodava isso. Adicionado um novo step explícito `generatePrismaClient` em `src/cli/commands/new.ts` (entre `installDependencies` e `formatGeneratedCode`, injetável, com rollback em caso de falha — mesmo padrão dos steps existentes), rodando `pnpm --filter db run generate`. Trade-off consciente: acrescenta ~1-2s ao `aether-admin new`, mas sem isso o projeto gerado nunca teria tipos corretos "de fábrica" (viola NFR-6 na cara).
  3. `prisma.config.ts` usava o helper `env('DATABASE_URL')`, que LANÇA se a variável não estiver em `process.env` — e nada carrega `.env.development` pro processo que roda `prisma generate` (só `server.ts` faz isso, via `loadEnvFile`, e só quando o servidor sobe). Resultado: `aether-admin new` quebrava sempre na primeira geração (`PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`). Trocado por `process.env.DATABASE_URL ?? '<mesmo valor de .env.development>'` — fallback pro mesmo valor de dev não-secreto já usado em outro lugar, não um valor novo.
  4. Lint real (`eslint .` no projeto gerado) achou 13 erros reais: `@typescript-eslint/require-await` em mocks de teste (`vi.fn(async () => valor)` sem `await` interno — padrão legítimo em teste, não em produção) e `@typescript-eslint/unbound-method` em `expect(objeto.metodo).toHaveBeenCalledWith(...)` (falso-positivo conhecido do typescript-eslint com mocks do Vitest). Adicionado um bloco de override em `eslint.config.js` (root.ts) desligando as duas regras só pra `**/*.test.ts` — não globalmente. Também removida uma linha `eslint-disable-next-line @typescript-eslint/no-restricted-imports` que eu tinha posto por precaução em `core/auth/router.ts` mas que era desnecessária (a regra AD-3 só vale pra `apps/web/**`, não `apps/api/**` importando de `shared`) — lint real reportou como "unused eslint-disable directive".
  - **Depois dos 4 fixes:** `pnpm typecheck` (limpo), `pnpm lint` (limpo), `pnpm format:check` (limpo), `pnpm test` (7 arquivos, 28 testes, todos passando) — todos reais, contra o projeto gerado, não os testes deste repo.
  - **Servidor real, sem banco real disponível:** subi o servidor gerado (`pnpm --filter api run dev`) — boot limpo, `logger:true` funcionando, traceparent correlacionando linhas de log. `curl` em `system.hello`: 200, resposta correta. `curl` em `auth.login` com credenciais inventadas: 500 estruturado (RFC 9457, `title`/`detail` mascarados, sem vazar stack pro cliente) — o servidor não crasha, o erro é tratado, mas a causa raiz é "SASL: client password must be a string" ao tentar conectar num Postgres 17 NATIVO já instalado nesta máquina (não relacionado a este projeto) que também escuta na porta 5432, já que Docker não está disponível neste ambiente e `docker-compose.dev.yml` nunca subiu. **Não tentei descobrir/adivinhar a senha desse Postgres alheio** — não é meu para mexer. Isso significa que o caminho FELIZ de login (credenciais corretas → access token + cookie + refresh funcionando) não foi exercitado contra um banco de verdade nesta sessão — só via `router.createCaller` com stubs (Task 6.5, 28 testes reais passando) e via este teste negativo (DB inacessível → erro estruturado, sem crash). Reportado ao Boss para decisão: aceitar como está (barra automatizável 100% verde) ou fornecer acesso a um Postgres real pra fechar esse último passo.

- **Atualização pós-sessão (2026-09-01/02) — validação real contra Postgres fechada via o Laboratório Integrit compartilhado.** O gap reportado ao Boss na Task 7.1 (login/refresh de ponta a ponta contra um Postgres real, impossível na máquina de dev por falta de Docker/credenciais) foi fechado reaproveitando a infraestrutura compartilhada do laboratório (`ubt-host01`, mesmo lab usado por Tupã/Arandu — ver `docs/Laboratório/laboratorio-integrit-documentacao.md`, seção 46e). `aether-api` deployado em `/opt/aether-app/deploy/lab/` (container novo, reaproveitando o `postgres` compartilhado do lab com um database `aether` dedicado — mesmo padrão do `tupa-app`, não infraestrutura duplicada). Evidência real (`docker logs aether-api`, timestamps 2026-09-01): `POST /trpc/auth.login` → `200`, seguido de `POST /trpc/auth.refresh` → `200` — fluxo feliz completo (credenciais corretas → access token + cookie `refresh_token` → refresh troca por novo access token) validado contra Postgres real, não mock/stub. Duas tentativas anteriores de curl falharam por erro de teste, não da aplicação (`415` por faltar `Content-Type: application/json`, depois `401` por não reaproveitar o cookie entre chamadas — sem cookie jar) — documentado na seção 46e para não confundir os outros 3 projetos com o mesmo engano ao testar fluxos de cookie httpOnly via curl.

- **Task 6 — achado durante a implementação: `TokenRevocationStore.getUserId` (Task 4) não bastava pra `refresh` emitir um novo access token.** JWT precisa de `tenantId` no payload, e o store só sabia `userId`. Em vez de adicionar uma segunda consulta (User por id), denormalizado `tenantId` direto no `RefreshToken` (copiado de `user.tenantId` em `issue()`, sem `@relation` formal pra Tenant — só otimização de leitura). Método renomeado `getUserId` → `getSubject(rawToken): Promise<{userId, tenantId} | null>`; `issue()` passou a receber `{userId, tenantId}` em vez de só `userId`. Migration SQL (Task 2.4) regerada com a coluna `tenant_id` em `refresh_tokens` — mesmo processo real (`prisma migrate diff`) da primeira vez.

- **Aplicação dos patches do code review (2026-09-02) — validação real completa, incluindo um bloqueio de ambiente contornado.** `pnpm` não rodava nesta sessão (pnpm@11.24.0 pinado exige Node ≥22.13; o Node ativo da máquina era 22.11.0, única instalação, sem nvm) — a pedido do Boss, baixado um Node 24.20.0 portátil (zip oficial, sem instalador, sem tocar na instalação global do sistema) pra `corepack enable`/`pnpm` funcionarem só nesta sessão. Com isso, os 13 patches foram validados contra um projeto de verdade regenerado do zero (`aether-admin new` num diretório limpo em `C:\tmp`): `pnpm install`/`prisma generate`/format limpos, `pnpm typecheck` limpo, `pnpm test` 28/28. **3 erros reais de lint apareceram só nessa validação real** (não pegos por leitura de código nem pelos testes deste repo) — todos causados pelos próprios patches: (1) `prefer-optional-chain` em `getSubject()` — corrigido reestruturando o `!record` num early-return separado, mantendo o narrowing de tipo do TS pro acesso a `record.expiresAt` depois; (2) `no-unused-vars` no parâmetro `_options` do fake `setCookie` em `test-utils.ts` — corrigido removendo o parâmetro (não usado pelo corpo do mock, `vi.fn()` já captura qualquer argumento de chamada real independente da assinatura declarada); (3) `no-unsafe-assignment` em `router.test.ts` (`expect.any(Number)` atribuído contextualmente à posição `maxAge: number` de `CookieSerializeOptions`) — mesma classe de falso-positivo do typescript-eslint com matchers assimétricos do Vitest já documentada na Story 1.1 (`require-await`/`unbound-method`); estendido o mesmo override de `**/*.test.ts` em `eslint.config.js` pra incluir `no-unsafe-assignment`, o que por sua vez tornou redundante um `eslint-disable-next-line` já existente em `system/router.test.ts` (Story 1.1) — removido. Depois dessas correções: `pnpm typecheck`/`lint`/`format:check` limpos, `pnpm test` 28/28, servidor sobe via o novo script `dev` (`--env-file`) e `curl` em `auth.login` confirma que `DATABASE_URL` agora carrega corretamente antes da construção do Prisma Client — o erro retornado é "Authentication failed... credentials for `aether_dev` are not valid" (Postgres nativo desta máquina rejeitando as credenciais de dev, mesmo achado não-relacionado já documentado na Task 7 original), não mais o erro de connection string vazia que o bug original causaria.

### Completion Notes List

- Todas as 7 Tasks completas. Estrutural (`write-structural-seed.test.ts`, 8/8) e real (typecheck/lint/format:check/test contra um projeto de verdade gerado por `aether-admin new`, todos limpos — 28/28 testes) ambos passam. Servidor sobe, `system.hello` funciona via `curl`, erro estruturado (sem crash, sem vazamento) quando o banco está inacessível. Este repo próprio (`pnpm vitest run` na raiz) também passa: 30/30. **Login/refresh com credenciais corretas contra um Postgres real foi validado em sessão seguinte** via o Laboratório Integrit compartilhado (`ubt-host01`) — ver "Atualização pós-sessão" no Debug Log: `auth.login`→200, `auth.refresh`→200, evidência em `docker logs aether-api`. **Code review (2026-09-02):** 1 decision-needed resolvido (AC #10 adiada pra Epic 3), 13 patches aplicados e revalidados de ponta a ponta contra um projeto real regenerado (typecheck/lint/format:check limpos, 28/28 testes, servidor sobe com o novo mecanismo `--env-file`), 3 deferidos (2 pré-existentes + a aplicação de migrations em `aether-admin new`, bloqueada até `aether-admin dev`/FR-4 existir), 4 dispensados como ruído/já documentados.
- Este é o primeiro `dev-story` desta story que chega até aqui SEM checkpoint humano intermediário — 4 bugs reais só apareceram na regeneração de verdade (Task 7), nenhum seria pego só por leitura de código ou pelos testes deste repo (que testam GERAÇÃO de string, não o resultado rodando).

### File List

- `src/scaffolding/templates/auth.ts` (novo — SecretsProvider, AuthProvider/Argon2AuthProvider, TokenRevocationStore/PrismaTokenRevocationStore, providers.ts, core/auth/router.ts login+refresh, todos os testes)
- `src/scaffolding/templates/root.ts` (editado — pnpm-workspace.yaml prisma+argon2, .env.development, override de lint pra `**/*.test.ts`)
- `src/scaffolding/templates/db.ts` (editado — package.json, tsconfig.json, schema.prisma, prisma.config.ts com fallback de DATABASE_URL, migrations/, src/client.ts)
- `src/scaffolding/templates/api.ts` (editado — package.json ganha argon2/jose/@fastify/cookie; context.ts, server.ts, root-router.ts, test-utils.ts novo, router.test.ts do módulo system corrigido)
- `src/scaffolding/templates/shared.ts` (editado — novos schemas Zod de login/refresh)
- `src/scaffolding/write-structural-seed.ts` (editado — merge de buildAuthFiles)
- `src/scaffolding/write-structural-seed.test.ts` (editado — expected files + 2 testes reescritos)
- `src/cli/commands/new.ts` (editado — novo step `generatePrismaClient`, injetável, entre install e format)
- `src/cli/commands/new.test.ts` (editado — fake do novo step + teste de rollback)
