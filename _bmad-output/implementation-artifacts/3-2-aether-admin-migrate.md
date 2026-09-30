---
baseline_commit: 676c6ed3bb5a589acd503f949912570466ce44ad
context: [_bmad-output/implementation-artifacts/3-1-identity-tree-enforcement.md]
---

# Story 3.2: `aether-admin migrate`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como um desenvolvedor usando um projeto gerado pelo Aether,
Eu quero rodar `aether-admin migrate` dentro do meu projeto pra aplicar as migrations Prisma pendentes no banco configurado,
Para que eu não precise rodar comandos Prisma manualmente, e para que `generate module` (Story 3.3, FR-3/AD-6) tenha um mecanismo confiável e já testado pra aplicar a migration que ele escreve atomicamente junto com o código gerado.

## Acceptance Criteria

1. **`aether-admin migrate` existe como comando real do CLI (FR-5).** Ao contrário de `new` (que recebe um nome de projeto e cria um diretório novo em outro lugar), `migrate` roda **de dentro** do projeto gerado que o desenvolvedor já está usando — alvo é `process.cwd()`, sem argumento posicional obrigatório. Se `packages/db/schema.prisma` não existir a partir do `cwd()`, falha com mensagem clara ("não parece um projeto Aether — rode a partir da raiz de um projeto gerado por `aether-admin new`"), sem tentar rodar Prisma.
2. **`migrate` aplica só migrations pendentes, nunca gera uma nova (FR-5, "Consequências").** Usa `prisma migrate deploy` — não `prisma migrate dev` (que é interativo e pode gerar migration nova a partir de drift de schema). Gerar uma migration nova continua sendo responsabilidade de quem autora a mudança de schema (`generate module`, Story 3.3, que escreve o arquivo de migration como parte da própria AD-6 — ou o desenvolvedor rodando `prisma migrate dev` manualmente durante desenvolvimento). Esta story só cobre **aplicar** o que já existe em `packages/db/migrations/`.
3. **Idempotente (FR-5).** Rodar `migrate` num projeto sem nenhuma migration pendente (banco já atualizado) é sucesso, não erro — mesma saída de "nada a fazer", exit code 0. Rodar duas vezes seguidas sem mudança nenhuma no meio produz o mesmo resultado (idempotência real, validada rodando duas vezes contra Postgres real — não só lida do comportamento documentado do Prisma).
4. **Falha de conexão/aplicação é reportada com clareza, nunca engolida.** Banco inacessível, credenciais erradas, ou uma migration que falha ao aplicar — o comando sai com código não-zero e propaga a saída real do Prisma (mesmo padrão já usado em `runCommand`/`new.ts`: `stdio: 'inherit'`), nunca um erro genérico sem contexto.
5. **`DATABASE_URL` resolvida do mesmo jeito que o resto do projeto gerado já resolve (AD-9, FR-6).** `migrate` não introduz uma segunda forma de configurar conexão — usa o `prisma.config.ts` do projeto gerado (env var `DATABASE_URL`, com fallback pro valor de dev não-secreto já usado em `.env.development`/`docker-compose.dev.yml`), exatamente como `prisma generate` já faz hoje dentro de `runNew`.
6. **Lint/format/typecheck/test passam de fábrica, e a aplicação real é validada contra Postgres de verdade.** Mesma barra das Stories 1.1/2.1/2.2/3.1: regenerar via `aether-admin new` num diretório limpo, confirmar que **as 3 migrations existentes** (`init_auth`, `add_rate_limit_hit`, `add_identity_tree`) aplicam limpo num banco vazio de verdade, e que rodar `migrate` uma SEGUNDA vez (zero pendente) também sai limpo e idempotente — não é suficiente confiar no comportamento documentado do `prisma migrate deploy`, tem que rodar de verdade (mesma lição de todas as stories anteriores).

## Tasks / Subtasks

- [x] **Task 1 — Extrair `runCommand` pra um módulo compartilhado (AC: #4)**
  - [x] 1.1 `src/cli/run-command.ts` — mover a função `runCommand` de dentro de `src/cli/commands/new.ts` pra cá (mesma implementação: `spawn` com `shell: true, stdio: 'inherit'`, rejeita em exit code != 0 ou sinal), exportada
  - [x] 1.2 `new.ts` importa de `../run-command.js` em vez de definir a própria cópia — sem mudança de comportamento, só remove duplicação (esta story vai precisar da mesma função pra `migrate`)
  - [x] 1.3 Teste: `new.test.ts` continua passando sem alteração (prova que a extração não mudou comportamento) — 32/32 testes + `tsc --noEmit` limpos

- [x] **Task 2 — `runMigrate` (AC: #1, #2, #3, #4, #5)**
  - [x] 2.1 `src/cli/commands/migrate.ts` — `runMigrate(targetDir, options?)` — verifica `access(join(targetDir, 'packages/db/schema.prisma'))`; se ausente, retorna `{ok: false, error: '...'}` sem rodar nada
  - [x] 2.2 Se presente, roda `pnpm --filter db exec prisma migrate deploy` via `runCommand` (mesmo padrão de `pnpm --filter db run generate` já usado por `generatePrismaClient` em `new.ts`)
  - [x] 2.3 `RunMigrateOptions` com `runMigrateDeploy?: (targetDir: string) => Promise<void>` injetável — mesmo padrão de `RunNewOptions` (testável sem rodar Prisma de verdade)
  - [x] 2.4 Erro do `runMigrateDeploy` (qualquer exit != 0) propagado como `{ok: false, error: ...}` com a mensagem real do processo — nunca um catch genérico que esconde a causa
  - [x] 2.5 Testes: schema.prisma ausente → falha sem chamar `runMigrateDeploy`; presente → chama `runMigrateDeploy` com `targetDir` e retorna `{ok: true}`; `runMigrateDeploy` rejeitando → retorna `{ok: false, error}` com a mensagem propagada — 3/3 passando, `tsc --noEmit` limpo (+ 2 testes adicionados no code review: `access()` falhando por motivo diferente de ENOENT propaga a causa real; path default sem `options` roda o comando exato via spy em `runCommand` — 5/5 no total em `migrate.test.ts`)

- [x] **Task 3 — Wiring do CLI (AC: #1)**
  - [x] 3.1 `src/cli/index.ts` — `command === 'migrate'` chama `runMigrate(process.cwd())`, sem argumento posicional (diferente de `new`, que exige nome de projeto) — reconciliação: `migrate` roda de dentro de um projeto já existente, não cria um novo em outro lugar
  - [x] 3.2 stdout em sucesso confirma o que rodou ("Migrations aplicadas.")
  - [x] 3.3 stderr + exit 1 em falha, reaproveitando a mensagem de `RunMigrateResult.error`
  - [x] 3.4 Teste: `index.test.ts` — mesmo padrão de `new` (`vi.mock('./commands/migrate.js', ...)` com `vi.hoisted`), cobrindo sucesso/falha de `main(['migrate'])` — 37/37 testes **deste repositório** (o gerador), `tsc`/`eslint` limpos

- [x] **Task 4 — Validação final (AC: #6)**
  - [x] 4.1 Regenerado via `aether-admin new` num diretório limpo (`/c/tmp/aether-story32-revalidate`) — `pnpm install`/`prisma generate`/`typecheck`/`lint`/`format:check`/`test` reais, tudo limpo de primeira: 45/45 testes **do projeto regenerado** (suíte diferente da deste repositório — inclui todos os testes das Stories 1.1-3.1 já embutidos no template) + 9 skipped (gated por `DATABASE_URL`, esperado sem Postgres local)
  - [x] 4.2 Validação real contra Postgres do Laboratório Integrit compartilhado: banco `aether` recriado vazio, `prisma migrate deploy` (mesmo mecanismo que `runMigrateDeploy` invoca) aplicou as 3 migrations reais (`init_auth`, `add_rate_limit_hit`, `add_identity_tree`) — confirmado via `\dt`: 13 tabelas (10 de negócio + `_GroupToUser`/`_ResourceToRole`/`_prisma_migrations`). Rodado uma SEGUNDA vez imediatamente depois → `"No pending migrations to apply."`, exit code 0 confirmado explicitamente — idempotência real, não assumida do comportamento documentado.
  - [x] 4.3 Validação do caminho de erro, local: `node bin/aether-admin.js migrate` num diretório sem `packages/db/schema.prisma` → mensagem clara, exit code 1, sem stack trace. Validado também o caminho de falha de conexão (projeto válido, Postgres local inexistente): erro real do Prisma (`P1000: Authentication failed...`) propagado com a mensagem de `RunMigrateResult.error` por cima — nunca escondido atrás de erro genérico (AC #4 confirmado empiricamente, não só por design)

## Dev Notes

### 🎯 Onde este código realmente vive — mesmo lembrete das Stories 2.1/2.2/3.1

Tudo aqui é sobre o **gerador** (`src/cli/commands/migrate.ts`, `src/cli/run-command.ts`) — o comando `aether-admin migrate` que um desenvolvedor roda **dentro de um projeto que o Aether já gerou**. Nenhuma mudança de schema/model nesta story — `packages/db/migrations/` já tem as 3 migrations reais das Stories 2.1/2.2/3.1; esta story só constrói o mecanismo de **aplicar** o que já existe.

### ⚠️ Por que esta story existe antes de `generate module` (Story 3.3) — dependência real, não escolha arbitrária

Ver a nota "Segundo split" em `epics.md` (Epic 3, 2026-09-30). `generate module` (AD-6) precisa aplicar, como parte do mesmo comando, a migration que insere a linha em `Module`/`ModuleClosure` — "a CLI roda a migration antes de retornar sucesso" (texto literal da AD-6). Sem um mecanismo de aplicação de migration já construído e testado, `generate module` não tem em cima do que rodar essa parte. Esta story fecha esse mecanismo isoladamente, testável sem precisar de nenhum codegen novo.

### ⚠️ Reconciliação: `aether-admin migrate` roda de dentro de um projeto gerado, não do repo do framework

`aether-admin new <nome>` roda a partir do repositório do **framework** (este repo, `Aether`) e recebe o nome/diretório de um projeto que ainda não existe. `aether-admin migrate` é diferente por natureza: o desenvolvedor já tem um projeto gerado e quer aplicar migrations **nele**. Duas leituras possíveis:
1. **`migrate` usa `process.cwd()` como alvo** (a que esta story implementa) — mesmo modelo de `prisma`/`eslint`/quase toda CLI de dev tooling: o desenvolvedor roda o comando de dentro do diretório que quer afetar.
2. `aether-admin` vira uma devDependency de todo projeto gerado (via `pnpm exec aether-admin migrate`), com seu próprio `bin`, resolvendo o alvo via `process.cwd()` do processo que o invoca — na prática funciona igual à opção 1 pro propósito desta story, mas levanta uma questão maior ainda não resolvida em nenhuma story: **como o projeto gerado ganha acesso ao binário `aether-admin` depois do `new`** (o `package.json` gerado hoje não lista `aether-admin` como dependência — `root.ts`, script `dev` é só um placeholder de echo). Essa questão maior fica **fora do escopo desta story** — não bloqueia `runMigrate(targetDir)` funcionar corretamente quando chamado com o `cwd` certo, seja por invocação direta do binário deste repo (mesmo jeito que `new` é testado/rodado hoje nesta sessão) ou por uma forma de distribuição futura. Revisitar quando `aether-admin dev` (FR-4, Epic 1) ou a primeira publicação real do pacote vierem à tona.

### ⚠️ `packages/db/package.json` já tem um script `migrate` — não reaproveitar, é outra coisa

O `package.json` de `packages/db` (template em `db.ts`) já define `"migrate": "prisma migrate dev"` — é pro desenvolvedor rodar manualmente durante autoria de schema (gera E aplica, interativo). O comando desta story (`aether-admin migrate` → `prisma migrate deploy`, não-interativo, só aplica) é uma coisa DIFERENTE — não deve chamar `pnpm --filter db run migrate` (que rodaria `migrate dev`, errado pro propósito daqui). Chamar `pnpm --filter db exec prisma migrate deploy` diretamente (mesmo padrão de `exec` que `pnpm --filter db run generate` já usa via `run`, mas aqui via `exec` porque não existe — e não deve existir — um script `scripts.migrate:deploy` que colida em nome com o `migrate` existente). Deixar os dois scripts coexistirem sem confusão de nome é intencional.

### Arquitetura — o que seguir à risca

- **AD-9 (sem alvo de produção no MVP):** `migrate` é ferramenta de dev local — mesmo envelope operacional de `new`, sem pipeline de CI/CD ou hardening de produção.
  [Source: ARCHITECTURE-SPINE.md#AD-9]
- **FR-6 (config externalizada):** `DATABASE_URL` nunca hardcoded — mesma resolução já usada por `prisma.config.ts` (env var, fallback pro valor de dev não-secreto).
  [Source: prd.md#FR-6, src/scaffolding/templates/db.ts (`prisma.config.ts`)]
- **Padrão de injeção de dependência pra teste:** mesmo formato de `RunNewOptions` em `new.ts` — funções de efeito colateral (`runMigrateDeploy`) injetáveis via options, default real roda `pnpm`/Prisma de verdade via `runCommand`.
  [Source: src/cli/commands/new.ts]

### Aprendizados das Stories 1.1/2.1/2.2/3.1 (aplicar aqui)

- **Regenerar e validar de verdade (Task 4)** — bugs reais nunca apareceram só lendo código.
- **`prisma migrate diff` foi não-confiável localmente em todas as stories anteriores** (Stories 2.1/2.2/3.1) — mas esta story usa `prisma migrate deploy`, um comando DIFERENTE (aplica migrations já existentes, não computa diff nenhum). Não assumir que o mesmo problema se repete — verificar empiricamente na Task 4.2, mas não há motivo a priori pra esperar a mesma falha (mecanismo interno completamente diferente: `migrate deploy` só lê os arquivos `.sql` já no disco e aplica os que faltam, rastreados via tabela `_prisma_migrations`).
- **`stdio: 'inherit'` é necessário pra scripts de postinstall funcionarem** (achado da Story 1.1, `runCommand`) — reaproveitado sem mudança.
- **Erro nunca escondido atrás de mensagem genérica** — mesma disciplina das Stories 2.1 (rate limiter fail-closed) e 3.1 (erro de configuração vs. erro de usuário).

### Testing Standards

- Vitest, testes co-localizados (`migrate.test.ts` ao lado de `migrate.ts`, `run-command.test.ts` se fizer sentido isolar).
- Mesma disciplina de `new.test.ts`: temp dirs reais via `mkdtemp`, injeção de dependência pra evitar rodar Prisma/pnpm de verdade nos testes rápidos — a validação REAL contra Postgres acontece na Task 4.2, fora da suíte `pnpm test` padrão (mesmo espírito do `describe.skipIf(!process.env.DATABASE_URL)` já usado em `require-resource.test.ts`, embora aqui a validação real seja manual/scriptada na Task 4, não necessariamente um teste automatizado gated — avaliar durante a implementação se vale a pena automatizar como teste `DATABASE_URL`-gated também).

### References

- [Source: prd.md#FR-5] — `aether-admin migrate`, aplica apenas pendentes, idempotente.
- [Source: ARCHITECTURE-SPINE.md#AD-9] — envelope operacional dev-only do MVP.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3] — nota do "Segundo split" (2026-09-30), dependência real entre `migrate` e `generate module`.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — `aether-admin new` nunca aplica migrations (Story 2.1); esta story não fecha esse item diretamente (ele é sobre `new`, não sobre um comando `migrate` separado), mas constrói o mecanismo que uma futura revisão desse item poderia reaproveitar.
- [Source: src/cli/commands/new.ts] — padrão de `runCommand`, injeção de dependência, tratamento de erro sem estado parcial.

### Review Findings

*Code review de 2026-09-30, 4 layers (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, Acceptance Auditor), diff isolado da Story 3.2 (459 linhas).*

- [x] [Review][Patch] ~~`catch` do `access()` engole qualquer tipo de erro~~ — **aplicado**: só `ENOENT` vira a mensagem "não é um projeto Aether"; qualquer outra causa (`EACCES`, etc.) propaga a mensagem real. Novo teste cobre o caso. [src/cli/commands/migrate.ts:36-49]
- [x] [Review][Patch] ~~`defaultRunMigrateDeploy` nunca exercitado por nenhum teste~~ — **aplicado**: novo teste chama `runMigrate(targetDir)` sem `options` (path default real), com `runCommand` mockado, verificando a string exata do comando. [src/cli/commands/migrate.ts, src/cli/commands/migrate.test.ts]
- [x] [Review][Patch] ~~Nenhum teste `DATABASE_URL`-gated cobre idempotência/aplicação real~~ — **resolvido de forma diferente da sugerida**: um teste de integração real não se encaixa na arquitetura atual (`require-resource.test.ts` roda DENTRO de projetos gerados; `migrate.test.ts` vive no gerador, sem `packages/db` próprio — montar isso só pra este teste seria desproporcional). O novo teste de spy em `runCommand` já fecha o risco mais grave (comando errado); idempotência é garantia do próprio Prisma, já provada empiricamente na Task 4.2. Decisão documentada nas Completion Notes em vez de deixada em aberto. [Completion Notes desta story]
- [x] [Review][Patch] ~~Debug Log impreciso sobre `RunMigrateResult.error`~~ — **aplicado**: wording corrigido, deixando claro que o erro real chega via `stdio: 'inherit'` no terminal, não capturado na string retornada. [Debug Log desta story]
- [x] [Review][Patch] ~~Frase solta em inglês nas Completion Notes~~ — **aplicado**: removida. [Dev Agent Record desta story]
- [x] [Review][Patch] ~~Contagem de testes "37/37" vs. "45/45 + 9" parece inconsistente~~ — **aplicado**: wording esclarece que são duas suítes diferentes (este repositório vs. o projeto regenerado). [Tasks 3.4/4.1 desta story]
- [x] [Review][Defer] `main()` não valida argumentos posicionais extras em `aether-admin migrate <algo>` — ignora silenciosamente em vez de rejeitar, diferente de `new`. Nenhuma AC exige isso, risco real baixo (comando sem argumentos esperados, uso indevido não corrompe nada). [src/cli/index.ts]
- [x] [Review][Defer] TOCTOU entre o `access()` de pré-checagem e a execução real de `runMigrateDeploy` — se o schema sumir nesse intervalo, o usuário vê o erro cru do Prisma em vez da mensagem mais clara. Janela de tempo extremamente pequena, consequência é só uma mensagem menos amigável, não perda de dado. [src/cli/commands/migrate.ts]
- [x] [Review][Defer] Nenhuma documentação de usuário (README/texto de uso) pro novo comando `aether-admin migrate` — gap real, mas nenhuma AC desta story pede isso, e nenhuma story anterior (`new`) criou esse tipo de doc tampouco — padrão já existente no projeto, não regressão desta story. [sem arquivo — ausência]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5), via skill `bmad-create-story` (planejamento)

### Debug Log References

- **`prisma migrate deploy` funcionou de primeira, local e contra o lab** — diferente de `prisma migrate diff`, que falhou repetidamente em máquina local nas Stories 2.1/2.2/3.1. Confirma a hipótese registrada nos Dev Notes: mecanismo interno diferente (`deploy` só lê `.sql` já existentes e aplica os pendentes, rastreando via `_prisma_migrations`; `diff` precisa computar um diff de schema, que é o que falhava). Nenhum workaround necessário nesta story.
- **Idempotência real confirmada com exit code explícito**, não só a mensagem "No pending migrations to apply." — rodei `prisma migrate deploy` duas vezes seguidas contra o Postgres do lab (banco recriado vazio antes) e capturei o exit code da segunda chamada (`0`), além de conferir as 13 tabelas esperadas via `\dt`.
- **Caminho de erro de conexão testado de verdade, não só via mock**: rodei `aether-admin migrate` contra um projeto Aether válido sem Postgres local acessível — Prisma retornou `P1000: Authentication failed...`. **Correção pós-review**: essa mensagem chega ao usuário via `stdio: 'inherit'` (herdado direto no terminal), não capturada dentro da string de `RunMigrateResult.error` (que continua sendo só `` `${command}` saiu com código ${exitCode}` ``, já que `runCommand` nunca captura stdout/stderr). AC #4 continua satisfeita — o usuário vê o erro real no terminal, exatamente como a própria AC define ("mesmo padrão já usado em runCommand/new.ts: stdio: 'inherit'") — mas a afirmação original aqui sobre o campo `error` especificamente estava imprecisa (achado do code review).
- **`Shell cwd was reset`** apareceu algumas vezes ao rodar comandos `pnpm`/`node` dentro do diretório temporário de validação — comportamento do ambiente da sessão (Bash tool), não um bug do código; cada comando precisou de `cd` explícito de novo, sem efeito no resultado da validação.

### Completion Notes List

- Escopo desdobrado a partir do que seria "Story 3.2 — generate module" pra "Story 3.2 — aether-admin migrate" + "Story 3.3 — generate module", por dependência real descoberta durante a criação desta story (ver "Segundo split" em epics.md e a seção "Por que esta story existe antes de generate module" acima).
- Todas as 4 Tasks completas. `aether-admin migrate` implementado via `prisma migrate deploy` (não `migrate dev`), idempotente, com mensagem de erro clara quando o diretório não é um projeto Aether ou quando a conexão falha. `runCommand` extraído de `new.ts` pra um módulo compartilhado (`src/cli/run-command.ts`), reaproveitado por `migrate.ts` sem duplicação.
- **Validação real de ponta a ponta** — 37/37 testes deste repositório (o gerador: CLI + comandos, dependências injetadas) + regeneração de um projeto limpo via `aether-admin new`, onde `typecheck`/`lint`/`format:check`/`test` rodaram de novo (45/45 testes *daquele projeto regenerado*, um codebase diferente com todas as suítes das Stories 1.1-3.1 já embutidas — 9 skipped por serem gated em `DATABASE_URL`, esperado sem Postgres local) + validação manual real contra Postgres do Laboratório Integrit compartilhado (aplicação das 3 migrations reais numa base vazia, idempotência com exit code confirmado, caminho de erro de conexão real). `prisma migrate deploy` provou ser mais confiável localmente do que `prisma migrate diff` já foi em qualquer story anterior.
- **Code review (2026-09-30, 4 layers) achou 6 patches, todos aplicados**: `catch` de `access()` corrigido pra só tratar ENOENT como "não é projeto Aether" (qualquer outro erro propaga a causa real); novo teste cobrindo o path default de `runMigrateDeploy` (spy em `runCommand`, confirma a string exata do comando — protege contra o typo `run migrate`/`exec ... deploy` que os próprios Dev Notes já avisavam); wording do Debug Log corrigido sobre `RunMigrateResult.error`; boilerplate solto removido; contagem de testes esclarecida (duas suítes diferentes, não uma inconsistência). **Um item do review não foi resolvido do jeito sugerido**: a sugestão de um teste `DATABASE_URL`-gated de integração real (paralelo a `require-resource.test.ts` da Story 3.1) não se encaixa na arquitetura atual de testes — `require-resource.test.ts` é um template que roda DENTRO de projetos gerados (schema/DB já existem ali); `migrate.test.ts` vive no GERADOR, que não tem `packages/db` próprio, então um teste real exigiria montar um mini-workspace pnpm com Prisma instalado de verdade só pra isso — desproporcional considerando que (a) o novo teste de spy em `runCommand` já fecha o risco real mais grave (comando errado silenciosamente trocado), e (b) "idempotência" é uma garantia do próprio `prisma migrate deploy`, não uma lógica desta story pra testar — já provada empiricamente na Task 4.2 e não algo que um teste unitário desta wrapper reproduziria de forma significativa. Mantida a validação manual como método de verificação intencional pra esse aspecto, documentado aqui em vez de deixado como pergunta em aberto.

### File List

- `src/cli/run-command.ts` (novo — `runCommand` extraído de `new.ts`)
- `src/cli/commands/new.ts` (editado — importa `runCommand` do módulo compartilhado em vez de definir a própria cópia)
- `src/cli/commands/migrate.ts` (novo — `runMigrate`, aplica migrations pendentes via `prisma migrate deploy`)
- `src/cli/commands/migrate.test.ts` (novo)
- `src/cli/index.ts` (editado — novo comando `migrate`)
- `src/cli/index.test.ts` (editado — testes do comando `migrate`)
- `_bmad-output/planning-artifacts/epics.md` (editado — nota do "Segundo split" do Epic 3)
- `_bmad-output/implementation-artifacts/deferred-work.md` (editado — referências de "Story 3.2" atualizadas pra "Story 3.3" onde o assunto é `generate module`)
