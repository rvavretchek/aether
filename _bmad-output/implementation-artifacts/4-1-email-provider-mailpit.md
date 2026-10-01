---
baseline_commit: fac398d2c256f09e75eedd47a7e928959c4654b1
context: [_bmad-output/implementation-artifacts/1-1-aether-admin-new-scaffolding.md, _bmad-output/implementation-artifacts/2-1-login-jwt-refresh.md, _bmad-output/implementation-artifacts/3-3-generate-module.md, _bmad-output/implementation-artifacts/epic-3-retro-2026-10-01.md]
---

# Story 4.1: `EmailProvider` (interface unificada) + captura local via Mailpit

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como desenvolvedor usando o Aether,
eu quero uma interface unificada de envio de email transacional, com uma implementação que em desenvolvimento captura tudo localmente via Mailpit sem nenhuma configuração manual,
para que os fluxos que dependem de email (redefinição de senha, Épico 4; import em lote, Épico 5) possam ser construídos e testados sem depender de um provedor de email real nem de credenciais.

## Acceptance Criteria

1. Existe uma interface `EmailProvider` (porta, AD-4) com um único método de envio — não um método por tipo de email (`sendPasswordReset`, `sendWelcome`, ...). Trocar de implementação não exige alterar nenhum código consumidor (FR-18).
2. A interface é desenhada para múltiplos templates desde o início (`password-reset` implementado nesta story; outros, como `welcome`, são acrescentados depois só como um novo membro do tipo — sem mudar a assinatura do método `send`). Cada template tem seu próprio shape de dados (TypeScript), não um `Record<string, unknown>` solto.
3. Existe uma implementação concreta `SmtpEmailProvider` (SMTP real, via biblioteca madura — ver Dev Notes) que renderiza o template `password-reset` (assunto + corpo texto e HTML) e envia via SMTP.
4. `SmtpEmailProvider` é a ÚNICA implementação do MVP (FR-18 — "um provedor implementado") — não existe uma segunda classe "MailpitEmailProvider"/"DevEmailProvider". Em desenvolvimento, a MESMA classe aponta para o Mailpit já scaffolded (Story 1.1, `docker-compose.dev.yml`) via configuração (host/porta), nunca por um branch de código `if (dev)`.
5. `EmailProvider` é instanciado uma única vez, em `core/providers.ts` (AD-4) — nenhum outro arquivo importa `SmtpEmailProvider` diretamente, só o tipo `EmailProvider`.
6. Host/porta do SMTP são lidos de variáveis de ambiente (`SMTP_HOST`, `MAILPIT_SMTP_PORT` — reaproveita o nome já seedado pela Story 1.1 em `.env.development`), nunca hardcoded. `EMAIL_FROM` idem. NÃO passam por `SecretsProvider` — não são segredos (mesma categoria de `DATABASE_URL`/`API_PORT`), e o Mailpit de dev não exige autenticação nenhuma.
7. Teste de integração real (não mockado) prova o envio: chama `emailProvider.send(...)` com o template `password-reset`, depois consulta a API HTTP do Mailpit (`GET /api/v1/messages`) e confirma que a mensagem chegou com destinatário/assunto/corpo esperados. Roda só quando o Mailpit está alcançável (`describe.skipIf`, mesmo padrão de `DATABASE_URL` já usado em `require-resource.test.ts`/`router.test.ts` gerado).
8. `pnpm typecheck`/`lint`/`format:check`/`test` passam limpos no projeto GERADO (não só no gerador) — validado de ponta a ponta contra um projeto `aether-admin new` real, com o Mailpit do `docker-compose.dev.yml` de fato rodando (mesma disciplina empírica das Stories 3.1-3.3: nunca confiar só em teste mockado pra uma integração externa).

## Tasks / Subtasks

- [x] Task 1: Interface `EmailProvider` + tipos de template (AC: #1, #2)
  - [x] 1.1 `apps/api/src/core/notifications/email-provider.ts`: `export interface EmailProvider { send(message: EmailMessage): Promise<void>; }`
  - [x] 1.2 `EmailMessage` como union discriminada por `template`: hoje só `{ template: 'password-reset'; to: string; data: { resetLink: string; expiresInMinutes: number } }`. Comentário explícito: novo template = novo membro da union, nunca um novo método na interface.
- [x] Task 2: `SmtpEmailProvider` (AC: #3, #4, #6)
  - [x] 2.1 Escolher e adicionar a dependência SMTP (ver Dev Notes — `nodemailer`) em `apps/api/package.json`.
  - [x] 2.2 `apps/api/src/core/notifications/smtp-email-provider.ts`: construtor recebe `{ host, port, from }` (injetado, não lido de `process.env` dentro da classe — quem monta a instância em `providers.ts` é que lê o env, mesmo padrão de `Argon2AuthProvider`/`EnvSecretsProvider`).
  - [x] 2.3 Função `renderTemplate(message: EmailMessage): { subject: string; text: string; html: string }` — um `switch` exaustivo sobre `message.template` (TypeScript força tratar todo membro da union; adicionar um template sem `case` correspondente é erro de compilação, não bug silencioso).
  - [x] 2.4 `send()` chama `renderTemplate` e envia via SMTP (biblioteca da Task 2.1), usando `from`/`host`/`port` do construtor.
- [x] Task 3: Wiring em `providers.ts` + env vars (AC: #5, #6)
  - [x] 3.1 `core/providers.ts`: `export const emailProvider: EmailProvider = new SmtpEmailProvider({ host: process.env.SMTP_HOST ?? 'localhost', port: Number(process.env.MAILPIT_SMTP_PORT ?? 1025), from: process.env.EMAIL_FROM ?? 'no-reply@aether.local' });` — fallbacks cobrem o caso de dev (Mailpit já sobe em `localhost:1025`, Story 1.1). Também wireado em `context.ts`/`test-utils.ts` (ctx.emailProvider), seguindo AD-4 à risca (acesso via ctx, nunca import direto em router/domain).
  - [x] 3.2 Adicionado `SMTP_HOST=localhost` e `EMAIL_FROM=no-reply@aether.local` em `.env.development` (template `root.ts`) — `MAILPIT_SMTP_PORT` já existia desde a Story 1.1, reaproveitado sem mudança.
- [x] Task 4: Teste de integração real contra Mailpit (AC: #7)
  - [x] 4.1 `apps/api/src/core/notifications/smtp-email-provider.test.ts`: `describe.skipIf(!process.env.MAILPIT_SMTP_PORT)` (mesmo padrão `DATABASE_URL`-gated já usado nas Stories 3.1/3.3).
  - [x] 4.2 Antes de cada teste, limpa a caixa do Mailpit (`DELETE /api/v1/messages` da API HTTP dele) — mesmo racional do achado do retro do Épico 3 (F4): não acumular mensagens entre execuções no Mailpit compartilhado do Laboratório Integrit.
  - [x] 4.3 Cenário: envia `password-reset`, consulta `GET /api/v1/messages`, confirma destinatário/assunto/corpo (link de reset) na mensagem capturada.
- [x] Task 5: Validação real de ponta a ponta (AC: #8)
  - [x] 5.1 Projeto novo gerado (`aether-admin new`); Mailpit subido via container real no Laboratório Integrit compartilhado (ambiente local sem Docker — ver Debug Log), `SMTP_HOST`/`MAILPIT_SMTP_PORT`/`MAILPIT_UI_PORT` setados no ambiente do teste apontando pra ele.
  - [x] 5.2 `pnpm typecheck`/`lint`/`format:check`/`test` passam limpos no projeto gerado — confirmado o teste da Task 4 passando de verdade contra o Mailpit real (não só `skipIf` pulando) — ver Debug Log.
  - [x] 5.3 Debug Log/Completion Notes atualizados com os números reais.

## Dev Notes

### 🎯 Onde este código realmente vive — mesmo lembrete das Stories 2.1/2.2/3.1-3.3

Tudo aqui é código GERADO pelo `aether-admin` (templates em `src/scaffolding/templates/` deste repositório, o gerador) — não código de um projeto Aether específico. `apps/api/src/core/notifications/...` nos Tasks acima é o caminho DENTRO do projeto que `aether-admin new` gera; o trabalho real desta story é editar `src/scaffolding/templates/*.ts` (provavelmente um novo arquivo `notifications.ts`, mesmo padrão de `auth.ts`/`authz.ts`/`docker.ts`) pra que o template gerado tenha esse conteúdo.

### ⚠️ Escopo explicitamente cortado desta story

- **`aether-admin dev`** (FR-4, orquestração de Docker Compose + migrate + servidores) continua um placeholder — não é construído aqui. FR-20 descreve "rodando `aether-admin dev`, todo email é capturado automaticamente" como o estado final, mas essa orquestração é responsabilidade de uma story de Epic 1 ainda não criada (mesmo padrão já aceito no `deferred-work.md` desde a Story 2.1, pro caso análogo de `prisma migrate deploy`). Esta story entrega a PARTE que não depende disso: o `docker-compose.dev.yml` já tem o serviço `mailpit` (Story 1.1); hoje o desenvolvedor sobe ele manualmente (`docker compose -f docker/docker-compose.dev.yml up`), exatamente como já faz pro Postgres. Quando `aether-admin dev` existir, ele só precisa chamar esse mesmo compose — nada do que esta story constrói muda.
- **Template `welcome`** (mencionado na nota de implementação do Épico 4, reaproveitado pela Epic 5/FR-15) — a Task 1.2 projeta a union pra aceitar um novo membro sem reestruturar a interface, mas NÃO implementa o `welcome` em si (nenhuma AC desta story exige — quem precisa dele é a Epic 5). Não escreva um `case 'welcome'` especulativo em `renderTemplate` — o `switch` exaustivo do TypeScript vai forçar esse `case` a existir no momento exato em que o membro for adicionado à union, não antes.
- **Credenciais SMTP de um provedor real de produção** — fora do MVP (AD-9: "sem alvo de deploy de produção"). `SmtpEmailProvider` já aceita `host`/`port` via construtor (não hardcoded), então trocar pra um relay real no futuro é só mudar os valores passados em `providers.ts` — mas ISSO é trabalho de uma story de Roadmap, não desta.
- **Fila/retry de envio** — FR-18 diz "enfileira/envia", mas nenhuma AC desta story exige fila assíncrona; `send()` é só `await` direto. Revisitar se/quando houver volume real.

### ⚠️ Reconciliação: `EmailProvider` não está listado no PRD §9.1 (Superfície Pública)

O PRD (`§9.1 Interfaces de extensão`) lista `AuthProvider`/`TokenRevocationStore`/`SecretsProvider`/`KeyCustodyProvider`/`WorkflowEngineProvider`, mas não `EmailProvider`. A arquitetura (AD-4) já cobre esse caso explicitamente: "o protocolo vale para QUALQUER interface de extensão que qualquer módulo introduza, não só as listadas em Binds" — então o padrão de composição única (só `providers.ts` instancia a classe concreta) se aplica aqui do mesmo jeito, mesmo sem uma entrada formal no PRD. Não é bloqueante; só não espere achar `EmailProvider` listado lá.

### ⚠️ `SMTP_HOST`/`MAILPIT_SMTP_PORT`/`EMAIL_FROM` não passam por `SecretsProvider`

AD-4 exige `SecretsProvider` pra SEGREDOS (pepper do Argon2id, chave de assinatura JWT) — não pra configuração de conexão. `DATABASE_URL`/`API_PORT` já são o precedente de "config lida direto de `process.env`, sem passar pelo `SecretsProvider`". Host/porta/remetente de SMTP são da mesma categoria. O Mailpit de dev não pede usuário/senha — não há segredo real nenhum pra proteger nesta story.

### Arquitetura — o que seguir à risca

- **AD-4 (Composição de Providers sem DI)**: `EmailProvider` é só mais uma interface de extensão — mesmo protocolo de `AuthProvider`/`SecretsProvider` já implementado em `core/providers.ts` (Story 2.1). Só esse arquivo instancia `SmtpEmailProvider`; todo consumidor importa o TIPO `EmailProvider`.
- **FR-18 (interface unificada)**: um `send(message: EmailMessage)` só — nunca um método por tipo de email.
- **FR-20 (captura em dev)**: ver "Escopo cortado" acima — a parte que depende de `aether-admin dev` não é desta story; a parte que não depende (apontar `SmtpEmailProvider` pro Mailpit via env var) é.

### Arquivos a criar (novo template no gerador)

- `src/scaffolding/templates/notifications.ts` (novo, no GERADOR) — `email-provider.ts`, `smtp-email-provider.ts`, `smtp-email-provider.test.ts` (conteúdo do PROJETO GERADO).
- `src/scaffolding/templates/auth.ts` (editado, no GERADOR) — `providers.ts` ganha `emailProvider`.
- `src/scaffolding/templates/root.ts` (editado, no GERADOR) — `.env.development` ganha `SMTP_HOST`/`EMAIL_FROM`.
- `src/scaffolding/write-structural-seed.ts` (editado, no GERADOR) — importar `buildNotificationFiles` de `./templates/notifications.js` e adicionar `...prefixKeys('apps/api', buildNotificationFiles())` na lista (mesmo padrão exato de `buildApiFiles`/`buildAuthFiles`, linhas 35-36 hoje).

### Biblioteca SMTP

Nenhuma dependência SMTP existe ainda no projeto gerado. `nodemailer` é a biblioteca madura padrão do ecossistema Node pra isso (ampla adoção, mantida, zero-config pra SMTP simples sem TLS — exatamente o caso do Mailpit). Mesma disciplina já seguida pras outras dependências (`jose`/`argon2` nas Stories 1.1/2.1):

- **Pinar versão exata** (`npm view nodemailer version` pra confirmar a atual) — nunca `^`/`latest` no `package.json` gerado. Achado real da Story 2.1: `typescript`/`react-router`/`prisma`/uma consulta de versão do `@trpc/server` já se provaram armadilha (número errado vindo de uma única fonte de pesquisa divergente do que já estava empiricamente instalado).
- **Verificar se o install do `nodemailer` fica bloqueado por `ERR_PNPM_IGNORED_BUILDS`** (pnpm 11+ bloqueia script de postinstall por padrão) — achado real da Story 2.1 com `argon2` (resolvido com `allowBuilds` em `pnpm-workspace.yaml`, mesmo arquivo que já tem a entrada do `prisma`). `nodemailer` é puro JS (sem binário nativo), então provavelmente NÃO tem esse problema — mas confirmar de verdade (`pnpm install` + checar o warning), não assumir.

### Aprendizados das Stories 1.1-3.3 (aplicar aqui)

- **Injetar config via construtor, nunca ler `process.env` dentro da classe concreta** — mesmo padrão de `Argon2AuthProvider(secretsProvider, prisma)`/`PrismaTokenRevocationStore(prisma)` (Story 2.1): só `providers.ts` lê env/monta a instância; a classe recebe valores já resolvidos. Facilita teste (injeta host/porta de teste sem tocar `process.env` global).
- **Nunca confiar só em teste mockado pra uma integração externa** — toda a disciplina das Stories 3.1-3.3 (Postgres real) se aplica aqui pro Mailpit: o teste da Task 4 tem que rodar contra o Mailpit de verdade pelo menos uma vez antes da story fechar, não só com `skipIf` sempre pulando.
- **Pinar versão exata, nunca `latest`/`^`** — achado repetido (`typescript`, `prisma`, `argon2`, `@trpc/server`) de que uma única consulta de "versão mais recente" já divergiu do que estava empiricamente funcionando.
- **Verificar `ERR_PNPM_IGNORED_BUILDS` pra toda dependência nova** — `prisma` e `argon2` já precisaram de entrada em `allowBuilds` (`pnpm-workspace.yaml`); não assumir que uma lib pura-JS está livre disso sem checar de verdade.
- **Erro nunca escondido atrás de mensagem genérica** — se o envio SMTP falhar (Mailpit fora do ar, por exemplo), propagar a causa real, mesmo padrão já exigido em `runMigrate`/`generate module`.

### Testing Standards

- Teste de integração real contra o Mailpit (Task 4) — nunca mockar o transporte SMTP; o Mailpit JÁ É o "fake" seguro pra isso, mesmo racional de nunca mockar o Postgres quando um real está disponível (padrão de todo o Épico 3).
- `describe.skipIf(!process.env.MAILPIT_SMTP_PORT)` — mesmo padrão de `DATABASE_URL`-gated já estabelecido.
- Limpar a caixa do Mailpit entre execuções (Task 4.2) — achado do retro do Épico 3 (F4): testes de integração contra infraestrutura COMPARTILHADA sempre precisam de cleanup, nunca confiar só em nomes aleatorizados.

### References

- [Source: _bmad-output/planning-artifacts/prds/prd-Aether-2026-08-11/prd.md#FR-18, #FR-19, #FR-20] — requisitos funcionais da Epic 4.
- [Source: _bmad-output/planning-artifacts/prds/prd-Aether-2026-08-11/prd.md#9.1] — Superfície Pública (EmailProvider não listado — ver reconciliação acima).
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4] — objetivo da epic, FRs cobertas, nota de implementação (multi-template desde o início, mecanismo de token reaproveitado pela Epic 5).
- [Source: _bmad-output/planning-artifacts/architecture/architecture-Aether-2026-08-14/ARCHITECTURE-SPINE.md#AD-4] — protocolo de composição de Providers.
- [Source: src/scaffolding/templates/docker.ts] — `docker-compose.dev.yml` já tem o serviço `mailpit` (Story 1.1), portas 1025 (SMTP)/8025 (UI).
- [Source: src/scaffolding/templates/root.ts] — `.env.development` já tem `MAILPIT_SMTP_PORT=1025`/`MAILPIT_UI_PORT=8025` (Story 1.1, seedado antes do consumidor existir).
- [Source: src/scaffolding/templates/auth.ts#providers.ts] — padrão exato de composição única (AD-4) a seguir pra `emailProvider`.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — precedente da Story 2.1 pro mesmo tipo de corte de escopo (`aether-admin dev` ainda não existe).

### Review Findings

*Code review de 2026-10-01, 4 camadas (Blind Hunter, Edge-Case Hunter, Verification Gap, Acceptance Auditor), diff isolado da Story 4.1.*

- [x] [Review][Patch] ~~Comentário em `providers.ts` afirma que trocar pra um relay SMTP real de produção "só mudaria os valores injetados aqui, nunca o código" — impreciso: `SmtpEmailProviderOptions` não tem campos de TLS/auth, e `secure: false` está hardcoded dentro da classe; um relay real precisaria editar a classe, não só os valores.~~ — **aplicado**: comentário reescrito pra deixar explícito que um relay real exigiria estender a classe (TLS/auth), não só mudar valores. [src/scaffolding/templates/auth.ts#providers.ts]
- [x] [Review][Patch] ~~AC #7 exige confirmar "assunto esperado", mas tanto o teste de `renderTemplate` quanto o teste de integração contra o Mailpit só checam `toBeTruthy()` no assunto — nunca comparam contra o texto real esperado.~~ — **aplicado**: as duas assertivas agora comparam o assunto exato (`'Redefinição de senha'`), mesmo padrão de destinatário/corpo. [src/scaffolding/templates/notifications.ts]
- [x] [Review][Patch] ~~Defeito de formatação no comentário do gerador: `FR-18: "um provedor ---` / `implementado").` — o delimitador `---` ficou dentro da citação.~~ — **aplicado**: comentário reescrito sem o delimitador decorativo no meio da citação. [src/scaffolding/templates/notifications.ts:31]
- [x] [Review][Patch] ~~`context:` do frontmatter desta story só lista Stories 1.1/2.1, mas os Dev Notes se apoiam em várias lições do Épico 3 sem declará-las como contexto lido.~~ — **aplicado**: frontmatter estendido com `3-3-generate-module.md` e `epic-3-retro-2026-10-01.md`. [frontmatter desta story]

**Rejeitados:**
- `false` — Dev Notes citam o padrão "mesma disciplina das Stories 3.1-3.3"/"achado do retro do Épico 3 (F4)" sem que esses arquivos apareçam em `deferred-work.md` como novo item — na verdade `deferred-work.md` só registra achados DE REVIEW, nunca cortes de escopo decididos pelo próprio autor da story (que corretamente vivem em "Escopo cortado" nos Dev Notes, mesmo padrão exato da Story 3.3). Nenhuma convenção violada.
- `false` — PRD §9.1 não lista `EmailProvider` — já coberto explicitamente por AD-4 ("vale pra qualquer interface de extensão... não só as listadas em Binds"), nenhuma contradição real a resolver.
- `false` — `import nodemailer from 'nodemailer'` (default) vs `import * as argon2 from 'argon2'` (namespace) não é uma inconsistência de estilo arbitrária — cada biblioteca dita seu próprio idioma de import correto pela forma real do seu module exports; `nodemailer` documenta e exporta um default real, `argon2` não.
- `low` — Nenhum teste cobre o caminho de falha de `send()` (Mailpit fora do ar) — mas `send()` não tem try/catch nenhum, então um erro já propaga por construção; não há nada "escondido" pra verificar. Adicionar um teste de falha seria trabalho novo sem defeito real por trás.
- `low` — `MAILPIT_SMTP_PORT`/`SMTP_HOST` vazios ou não-numéricos produzem porta `0`/`NaN`/host vazio sem validação — mesmo padrão já aceito e deferido desde a Story 1.1 pra `API_PORT`/`WEB_PORT` ("ferramenta de dev local, risco real baixo"); não é um achado novo, é a mesma categoria de risco já decidida.
- `low` — `beforeEach` limpa a caixa do Mailpit inteira, o que não protege contra suítes CONCORRENTES batendo no mesmo Mailpit — real em teoria, mas hoje só existe UMA suíte usando Mailpit; inalcançável até uma segunda suíte (ex. `welcome`) existir.
- `low` — `message?.To[0]?.Address` lançaria se `message.To` fosse `undefined`/não-array — exigiria uma resposta malformada do próprio Mailpit, fora do controle deste código; array vazio (`[]`) não lança (`[][0]` é só `undefined`).
- `low` — `DELETE /api/v1/messages` de limpeza não verifica `res.ok` — falha silenciosa deixaria mensagens órfãs, mas pressupõe o Mailpit (precondição do `describe.skipIf`) ficar instável no meio do teste; especulativo.
- `low` — `fetch` sem timeout explícito pra API do Mailpit — não trava indefinidamente de verdade, o timeout padrão do Vitest (5s) já limita o caso; só produz uma mensagem de erro menos específica.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5), via skills `bmad-create-story` (planejamento) + `bmad-dev-story` (implementação)

### Debug Log References

- **`npm view nodemailer version`** confirmou `10.0.13` antes de fixar no `package.json` gerado (disciplina da Story 2.1 — nunca `latest`/`^`). `npm view nodemailer types` confirmou que a lib já ships seus próprios tipos (`dist/cjs/nodemailer.d.ts`) — nenhum `@types/nodemailer` necessário.
- **`ERR_PNPM_IGNORED_BUILDS` verificado de verdade, não assumido**: `pnpm install` num projeto gerado real não mostrou nenhum warning de build ignorado pro `nodemailer` — confirma que é puro JS, sem script de postinstall, como esperado.
- **Achado real durante a validação de ponta a ponta (Task 5)**: o host da API HTTP do Mailpit usado pelo teste de integração estava hardcoded como `localhost` — funciona no fluxo real (desenvolvedor roda `pnpm test` no host, com as portas do Mailpit publicadas via `docker-compose.dev.yml`), mas quebrou no ambiente de validação real usado aqui (teste rodando num container alcançando o Mailpit por nome de container, não por `localhost`). Corrigido reaproveitando `SMTP_HOST` (a mesma variável já usada pro SMTP) como host da API HTTP também — mesmo "onde o Mailpit está" serve pros dois protocolos; nunca hardcoded. Sem este ambiente de validação real (sem Docker local, replicado via o Laboratório Integrit compartilhado), esse bug teria ficado invisível até alguém rodar os testes fora do fluxo "localhost" assumido — mesmo padrão de achado já repetido no Épico 3 (bugs reais só aparecem rodando de verdade, nunca lendo código).
- **Validação real de ponta a ponta sem Docker local**: esta máquina não tem Docker instalado — mesmo workaround já usado nas Stories 3.1-3.3 (Postgres) foi aplicado aqui pro Mailpit: projeto sincronizado (tar/scp, sem `node_modules`) pro container `aether-api` já rodando no Laboratório Integrit, um container `mailpit` real (`axllent/mailpit:latest`) subido na mesma rede Docker (`infra-lab_lab-network`), `pnpm install`/`prisma generate`/testes rodados de dentro do `aether-api` com `SMTP_HOST` apontando pro nome do container do Mailpit. Projeto gerado local (`aether-admin new`) validado primeiro sem Mailpit (`pnpm typecheck`/`lint`/`format:check`/`test` — 46 passaram, 10 pularam, incluindo o teste Mailpit-gated pulando corretamente) e depois com Mailpit real (56/56 passaram, incluindo os 2 cenários de `smtp-email-provider.test.ts` — `renderTemplate` puro + o envio real capturado pelo Mailpit). Scratch (container Mailpit, diretório sincronizado, tarballs) limpo ao final.

- **Revalidação pós-patches do code review**: os 4 patches (comentário de `providers.ts` corrigido, assunto exato verificado em ambos os testes, comentário com `---` corrigido, `context:` do frontmatter estendido) revalidados de ponta a ponta: projeto regenerado localmente (typecheck/lint/format/test limpos, 46 passaram/10 pularam) e depois contra um Mailpit real novo no Laboratório Integrit (56/56 passaram, incluindo o teste de integração agora comparando o assunto exato `'Redefinição de senha'`, não só truthiness).

### Completion Notes List

- Todas as 5 Tasks completas. `EmailProvider` (FR-18, AD-4) implementado: interface de um único método `send`, union discriminada por `template` (só `password-reset` nesta story, union desenhada pra aceitar novos membros sem mudar a assinatura — `welcome`/Epic 5 não implementado, por escolha de escopo documentada nos Dev Notes). `SmtpEmailProvider` é a única implementação do MVP (FR-18), a mesma classe atende dev (Mailpit) e, no futuro, produção, via configuração injetada no construtor — nunca um branch `if (dev)`. Wireado em `providers.ts` (AD-4, composição única) e exposto via `ctx.emailProvider` (`context.ts`/`test-utils.ts`), nunca importado diretamente por código consumidor.
- **Achado real corrigido durante a validação (Task 5)**: host da API HTTP do Mailpit no teste de integração estava hardcoded — generalizado para reaproveitar `SMTP_HOST`, ver Debug Log.
- **Escopo cortado conforme planejado nos Dev Notes, nenhum ajuste necessário**: `aether-admin dev` continua placeholder (Mailpit sobe manualmente via `docker compose`, como já se fazia pro Postgres); template `welcome` não implementado (só a union está pronta pra receber); credenciais SMTP de produção fora do MVP (AD-9); sem fila/retry de envio.
- **Validação real de ponta a ponta, sem bug escapando da primeira rodada contra infraestrutura real** (achou e corrigiu 1 problema real: host hardcoded no teste) — projeto gerado local limpo (typecheck/lint/format/test, Mailpit-gated test pulando corretamente sem Mailpit) + validação real contra um Mailpit de verdade no Laboratório Integrit compartilhado (56/56 testes, incluindo o envio real capturado e verificado via a API HTTP do próprio Mailpit).

### File List

- `src/scaffolding/templates/notifications.ts` (novo — `email-provider.ts`, `smtp-email-provider.ts`, `smtp-email-provider.test.ts` do projeto gerado)
- `src/scaffolding/write-structural-seed.ts` (editado — import + wiring de `buildNotificationFiles`)
- `src/scaffolding/write-structural-seed.test.ts` (editado — 3 novos arquivos esperados)
- `src/scaffolding/templates/api.ts` (editado — `nodemailer` em `package.json`; `emailProvider` em `context.ts`/`test-utils.ts`)
- `src/scaffolding/templates/auth.ts` (editado — `emailProvider` instanciado em `providers.ts`)
- `src/scaffolding/templates/root.ts` (editado — `SMTP_HOST`/`EMAIL_FROM` em `.env.development`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (editado)
