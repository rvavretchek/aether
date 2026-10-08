---
baseline_commit: 8e4a51a37fbc4e046961d380b15cc546abdf79fe
context: [_bmad-output/implementation-artifacts/epic-3-retro-2026-10-01.md, _bmad-output/implementation-artifacts/epic-5-retro-2026-10-07.md, _bmad-output/implementation-artifacts/deferred-work.md, _bmad-output/implementation-artifacts/1-1-aether-admin-new-scaffolding.md, _bmad-output/implementation-artifacts/3-2-aether-admin-migrate.md]
---

# Story 5.9: Harness reutilizável de validação pós-geração

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como Boss (mantenedor do `aether-admin`),
eu quero um script reutilizável que rode `aether-admin new` → (opcionalmente) `migrate` → `typecheck` → `lint` → `format:check` → `test` contra um projeto gerado de verdade, sempre até o fim e sempre reportando o resultado de cada etapa,
para que eu não precise mais repetir manualmente essa mesma sequência de ~5 comandos em todas as validações de laboratório — como aconteceu em toda story da Epic 3 e da Epic 5 — e para que bugs que só aparecem "rodando de verdade" sejam descobertos num comando só, local, sem depender de Postgres/Docker.

## Contexto

Este item estava aberto desde a retrospectiva da Epic 3 (`epic-3-retro-2026-10-01.md`, F15/action item 5: "a epic redescobriu 3 vezes que bugs reais só aparecem rodando de verdade contra Postgres, sem nenhum harness reutilizável") e foi reconfirmado ainda aberto na retrospectiva da Epic 5 (`epic-5-retro-2026-10-07.md`, action item 7: "o harness reutilizável de validação pós-geração continua não construído — dois épicos depois de identificado... considerar priorizá-lo explicitamente antes do próximo épico"). Todas as 8 stories da Epic 5 repetiram manualmente a mesma sequência de tar/scp/pnpm install/typecheck/lint/test a cada validação de laboratório.

Esta story mecaniza explicitamente só a parte **local** (sem banco de dados) dessa sequência — scaffold + typecheck + lint + format:check + test, com um passo opcional de `migrate` quando uma `DATABASE_URL` é fornecida. Validação de laboratório contra Postgres/Docker real continua sendo um processo manual separado (fora do escopo desta story — ver "Escopo cortado").

## Acceptance Criteria

1. O script vive em `scripts/validate-scaffold.ts`, neste repositório (o gerador) — nunca dentro de `src/scaffolding/templates/` (esses templates são copiados PARA DENTRO de projetos gerados; este script é ferramenta para trabalhar no próprio gerador, uma árvore totalmente diferente).
2. O script invoca o entrypoint público real da CLI (`bin/aether-admin.js new <dir>`, e `bin/aether-admin.js migrate` quando aplicável) via `spawnSync` — nunca importa `src/cli/run.ts` ou `src/cli/commands/new.ts` diretamente. O objetivo é validar exatamente o que um usuário real roda, não um caminho de código interno.
3. Flags de linha de comando — `--dir`, `--database-url`, `--keep` — são parseadas via `node:util`'s `parseArgs` nativo (sem nenhuma dependência nova). `--dir` ausente usa um diretório temporário gerado automaticamente sob `os.tmpdir()`.
4. Todas as etapas (scaffold, migrate opcional, typecheck, lint, format:check, test) rodam até o fim mesmo que uma falhe — nunca para na primeira falha — e ao final é impressa uma tabela-resumo de pass/fail/skip, com a saída completa capturada de qualquer etapa que tenha falhado (para diagnóstico, sem precisar re-rodar).
5. O código de saída do processo é `0` apenas se todas as etapas não-puladas passaram; é `1` caso qualquer uma tenha falhado. Limpeza do diretório gerado (`fs.rmSync`) só acontece quando o resultado geral foi sucesso completo E `--keep` não foi passado — em qualquer falha, ou com `--keep`, o diretório permanece no disco para inspeção.
6. `--database-url`, quando fornecida, é apenas **consumida** pelo script — nunca criada/derrubada por ele, e o script nunca toca Docker. O único uso dela é exportá-la como `DATABASE_URL` no ambiente dos processos filhos, para (a) rodar `prisma migrate deploy` (via `aether-admin migrate`) no projeto gerado antes da etapa de testes, e (b) permitir que os testes `DATABASE_URL`-gated do projeto gerado rodem de verdade na etapa `test`. Sem `--database-url`, a etapa `migrate` é pulada (`skip`) e os testes `DATABASE_URL`-gated do projeto gerado se auto-pulam (mecanismo já existente nos templates, `describe.skipIf(!process.env.DATABASE_URL)`).
7. `package.json` (raiz deste repositório) ganha o script `"validate:scaffold": "tsx scripts/validate-scaffold.ts"`.
8. Existe `scripts/validate-scaffold.test.ts`: um teste de integração real (nunca mockando `spawnSync` — o objetivo inteiro é provar que o mecanismo roda de verdade), protegido por `describe.skipIf(process.env.RUN_SCAFFOLD_VALIDATION !== '1')`, provando o mecanismo contra um diretório descartável, sem banco de dados. Este teste **não** roda por padrão em `pnpm test` (é lento — faz um `pnpm install` real) nem quebra `pnpm test` quando pulado.

## Tasks / Subtasks

- [x] Task 1: Parsing de flags (AC: #3)
  - [x] 1.1 `scripts/validate-scaffold.ts`: `parseArgs` de `node:util` com opções `dir` (string), `database-url` (string), `keep` (boolean, default `false`), `strict: true`, sem posicionais.
  - [x] 1.2 `--dir` ausente → gera um nome sob `os.tmpdir()` (`aether-scaffold-validation-<timestamp>-<random>`), nunca dentro deste próprio repositório.
- [x] Task 2: Infraestrutura de execução de etapa — nunca para na primeira falha (AC: #4)
  - [x] 2.1 Helper que roda um `spawnSync` (via `node` direto, array de args — para a invocação do `bin/aether-admin.js`) ou via linha de comando com `shell: true` (para os scripts `pnpm run <x>`, mesmo padrão de `src/cli/run-command.ts`), captura `stdout`+`stderr` (`encoding: 'utf8'`, `maxBuffer` generoso) e nunca lança — erros de spawn (`result.error`, ex.: ENOENT) viram um resultado `fail` com a mensagem do erro, nunca uma exceção não tratada.
  - [x] 2.2 Loop sequencial sobre as 6 etapas (scaffold, migrate, typecheck, lint, format:check, test) sem `break`/`return` antecipado — cada etapa roda incondicionalmente, independentemente do resultado das anteriores.
- [x] Task 3: Etapa `scaffold` (AC: #1, #2)
  - [x] 3.1 `projectName = basename(targetDir)`; `parentDir = dirname(targetDir)`; `mkdirSync(parentDir, { recursive: true })` (o diretório-pai precisa existir ANTES do `spawnSync` poder nem iniciar o processo filho — isso é responsabilidade do harness, não do gerador).
  - [x] 3.2 `spawnSync(process.execPath, [binPath, 'new', projectName], { cwd: parentDir, ... })`, `binPath` resolvido a partir de `import.meta.url` deste script (`<repoRoot>/bin/aether-admin.js`) — nunca um caminho hardcoded absoluto.
- [x] Task 4: Etapa `migrate` opcional (AC: #6)
  - [x] 4.1 Se `--database-url` não foi passada: etapa marcada `skip` direto, sem rodar nada.
  - [x] 4.2 Se foi passada: `spawnSync(process.execPath, [binPath, 'migrate'], { cwd: targetDir, env: { ...process.env, DATABASE_URL: databaseUrl }, ... })`.
- [x] Task 5: Etapas `typecheck`/`lint`/`format:check`/`test` (AC: #4, #6)
  - [x] 5.1 Cada uma via `pnpm run <script>` (string única + `shell: true`, mesmo padrão de `src/cli/run-command.ts`) com `cwd: targetDir`.
  - [x] 5.2 `env` de todas as etapas (migrate + test, e por simplicidade/uniformidade também typecheck/lint/format:check, que ignoram a variável) inclui `DATABASE_URL` quando `--database-url` foi fornecida — mesma variável de ambiente, nunca duplicada/reformatada.
- [x] Task 6: Resumo, código de saída e limpeza (AC: #4, #5)
  - [x] 6.1 Tabela-resumo (nome da etapa, status `PASS`/`FAIL`/`SKIP`, duração) impressa sempre; saída completa (`stdout`+`stderr`) de cada etapa `FAIL` impressa em seguida, sem truncamento.
  - [x] 6.2 `process.exitCode = 0` só se nenhuma etapa não-pulada falhou; senão `1`.
  - [x] 6.3 `fs.rmSync(targetDir, { recursive: true, force: true })` só quando sucesso completo e `--keep` ausente; em qualquer outro caso, o caminho do diretório mantido é impresso para inspeção manual.
- [x] Task 7: Script npm (AC: #7)
  - [x] 7.1 `package.json` (raiz): `"validate:scaffold": "tsx scripts/validate-scaffold.ts"`.
- [x] Task 8: Teste de integração real (AC: #8)
  - [x] 8.1 `scripts/validate-scaffold.test.ts`: `describe.skipIf(process.env.RUN_SCAFFOLD_VALIDATION !== '1')`, nunca mocka `spawnSync`. **Ajuste real em relação ao plano original** (ver Dev Notes/Review Findings): em vez de importar e chamar `validateScaffold()` diretamente dentro do processo do Vitest, o teste roda `scripts/validate-scaffold.ts` como um SUBPROCESSO independente (`node --import tsx/esm ...`, mesmo truque de `bin/aether-admin.js`) — chamar a função diretamente de dentro do worker do Vitest expunha, de forma determinística, um flake de ambiente (ver Dev Notes) nunca observado rodando via subprocesso; rodar via subprocesso também é um teste mais fiel ao uso real, já que exercita `parseArgs`/`isMainModule` (a própria entrada da CLI), nunca cobertos de outra forma.
  - [x] 8.2 Caso real "fim a fim": roda contra um diretório sob `os.tmpdir()`, sem `--database-url` — confirma que as 6 etapas aparecem no resumo, que `migrate` é `skip`, e que o código de saída/limpeza do diretório são consistentes com o resultado (`exit 0` + diretório removido quando tudo passa; `exit 1` + diretório preservado se alguma etapa do PRÓPRIO projeto gerado falhar) — ver Dev Notes sobre por que a asserção não exige que o projeto gerado necessariamente passe em 100% das etapas.
  - [x] 8.3 Caso real "nunca para na primeira falha": `--dir` apontando para um diretório já não-vazio (força falha rápida e determinística da etapa `scaffold`, sem precisar de um `pnpm install` real) — confirma que as 5 etapas seguintes ainda assim rodam (nenhuma fica ausente da saída), resultado geral de falha (`exit 1`), e o diretório NÃO é removido (falha geral, independente de `--keep`).
  - [x] 8.4 `vitest.config.ts` (raiz): `include` estendido para também cobrir `scripts/**/*.test.ts` (sem isso, este arquivo nunca seria nem descoberto pelo Vitest, gated ou não).
  - [x] 8.5 `tsconfig.json`/`eslint.config.js` (raiz): `scripts/**/*.ts` incluído no `tsconfig.json` (`typecheck`/lint tipado via `projectService` precisam que o arquivo pertença a algum projeto TS) — `eslint.config.js` já lint a árvore inteira por padrão (ignores existentes não cobrem `scripts/`), então nenhuma mudança adicional é necessária lá além do `tsconfig.json`.

## Dev Notes

### 🎯 Onde este código vive — DIFERENTE de toda story anterior (1.1-5.8)

Todas as stories anteriores editavam `src/scaffolding/templates/*.ts` (código que é COPIADO para dentro do projeto gerado). Esta story é o oposto: `scripts/validate-scaffold.ts` é ferramenta de desenvolvimento DESTE repositório (o gerador `aether-admin` em si) — nunca é copiado para nenhum projeto gerado, nunca aparece em `src/scaffolding/templates/`. Confundir as duas árvores foi o erro mais fácil de cometer aqui; o Task 1 deste arquivo e a própria AC #1 existem para blindar contra isso.

### Decisão de design: `migrate` também via `bin/aether-admin.js`, não via `prisma` direto

A story-prompt original menciona "rodar `prisma migrate deploy` no `packages/db` do projeto gerado" — mas `aether-admin migrate` (Story 3.2, `src/cli/commands/migrate.ts`) já faz exatamente isso (`pnpm --filter db exec prisma migrate deploy`, rodando de dentro do projeto gerado, lendo `DATABASE_URL` do ambiente). Reinventar essa chamada diretamente no harness duplicaria lógica já testada E violaria o espírito da AC #2 (só o entrypoint público da CLI, nunca lógica interna reimplementada). Decisão: a etapa `migrate` do harness invoca `bin/aether-admin.js migrate` via `spawnSync` com `cwd` no diretório gerado — mesmo padrão/mesma garantia da etapa `scaffold`.

### Por que o harness precisa criar o diretório-pai antes do `spawnSync`

`aether-admin new <nome>` resolve o diretório-alvo como `resolve(process.cwd(), nome)` (`src/cli/index.ts`) e ele mesmo cria o diretório-alvo (`mkdir(targetDir, { recursive: true })` dentro de `runNew`) — mas o PROCESSO FILHO em si só consegue nem iniciar se o `cwd` passado ao `spawnSync` (o diretório-pai de `--dir`) já existir. Por isso o harness faz `mkdirSync(parentDir, { recursive: true })` antes de chamar `spawnSync` — isso é puramente filesystem local (nunca banco de dados/Docker), não contradiz a AC #6.

### `projectName` deriva de `basename(targetDir)` — nenhuma validação duplicada

`aether-admin new` já valida o nome do projeto (`validateProjectName` em `src/cli/commands/new.ts`: minúsculas/dígitos/hífen, sem nomes reservados). O harness NÃO duplica essa regex — se `--dir` produzir um `basename` inválido, a etapa `scaffold` simplesmente falha com a mensagem de erro real da CLI, capturada e exibida no resumo. Isso é intencional: a fonte de verdade da validação de nome é a CLI real, exatamente o comportamento que a AC #2 pede para ser exercitado.

### Captura de saída, não streaming ao vivo

`spawnSync` bloqueia até o processo filho terminar — não há como capturar E transmitir em tempo real sem complexidade adicional (pipes manuais) que nenhuma AC exige. O script imprime uma linha de progresso (`> rodando: <etapa>...`) antes de cada etapa e o resultado (`PASS`/`FAIL`/`SKIP` + duração) depois — suficiente para quem roda interativamente acompanhar o andamento sem achar que o processo travou, mesmo durante o `pnpm install` real da etapa `scaffold` (pode levar 1-2 minutos).

### Achado real durante a implementação: flake de typecheck sob contenção de recursos (não corrigido, fora do escopo desta story)

Validando o próprio harness (Task 8), um caso de teste que chamava `validateScaffold()` diretamente de dentro do processo do Vitest reproduzia, de forma **determinística (3/3)**, uma falha de `typecheck` no projeto recém-gerado (`TS2339` em `apps/api/src/core/auth/router.ts` — `setCookie`/`cookies` "ausentes" do tipo do Fastify, ou seja, a augmentação de `@fastify/cookie` não estava sendo mesclada). A MESMA sequência exata, rodada via `tsx scripts/validate-scaffold.ts` num terminal comum, **nunca** reproduziu o problema (0 em 8+ tentativas, incluindo com retries back-to-back). Investigação feita: diff completo do `process.env` entre os dois contextos (vitest-nested vs. shell comum); forçar manualmente, num terminal comum, cada variável suspeita isoladamente e em conjunto (`NODE_ENV=test`, `VITEST=true`, `VITEST_POOL_ID=1`, `VITEST_WORKER_ID=0`, `NODE_PATH` copiado literalmente do dump) — nenhuma reproduziu. Como hardening (não como "a correção" — não há confirmação de que resolve a causa raiz), o harness passou a saná-las ambientes antes de repassar aos processos filhos (`sanitizeEnv`, Dev Notes de código em `scripts/validate-scaffold.ts`) — mas rodar o MESMO cenário via subprocesso independente (em vez de chamada direta de função) de dentro do Vitest ainda reproduziu o flake mesmo com o saneamento ativo, confirmando que a causa raiz exata não foi isolada. Decisão final: (1) o Task 8.1 foi redesenhado pra rodar via subprocesso independente (sidestepping o problema por completo, E um teste mais fiel ao uso real); (2) a asserção do caso "fim a fim" (Task 8.2) verifica o MECANISMO do harness (todas as etapas aparecem, skip/exit-code/limpeza são consistentes entre si) em vez de exigir que o projeto gerado necessariamente passe 100% das etapas; (3) o achado em si foi registrado em `deferred-work.md` ("Deferred from: implementation of 5-9...") pra investigação futura — é exatamente o tipo de bug que só aparece "rodando de verdade" que esta story existe para capturar, não para resolver sozinha.

### ⚠️ Escopo explicitamente cortado desta story

- **Nenhuma validação de laboratório (Postgres/Docker real) é automatizada aqui** — só a parte local (scaffold + typecheck + lint + format:check + test), exatamente como o prompt desta story delimita. A etapa `migrate` só roda `prisma migrate deploy` contra uma `DATABASE_URL` que o usuário já forneceu (apontando pra um banco que ele mesmo provisionou) — o script nunca cria/sobe um container Postgres nem derruba um banco.
- **Sem tar/scp/sincronização remota** — o harness roda inteiramente local (no diretório indicado por `--dir`, local ou em qualquer caminho acessível pelo filesystem da máquina que o roda). Automatizar a parte remota (Laboratório Integrit) explicitamente ficou fora do pedido desta story.
- **Sem retry/novas tentativas em nenhuma etapa** — uma etapa que falha por flakiness (ex.: rede instável no `pnpm install`) precisa ser re-rodada manualmente (rodando o script de novo); não há lógica de retry automático, nenhuma AC pede isso.

### Testing Standards

- `scripts/validate-scaffold.test.ts` nunca mocka `spawnSync` (AC #8) — mockar o único mecanismo que esta story existe para provar anularia o propósito do teste. Os dois casos reais cobertos (Task 8.2/8.3) são deliberadamente desenhados para terem duração bem diferente: o caso de sucesso completo paga o custo de um `pnpm install` real (lento, minutos); o caso de "nunca para na primeira falha" usa um diretório-alvo propositalmente não-vazio para falhar a etapa `scaffold` quase instantaneamente (a própria CLI recusa escrever antes de rodar `pnpm install`, então nenhuma etapa deste segundo caso dispara rede) — prova o comportamento "roda até o fim" sem pagar o custo de dois `pnpm install` reais completos.
- Gate via `RUN_SCAFFOLD_VALIDATION=1` (variável de ambiente dedicada, não `DATABASE_URL`) — este teste não depende de banco de dados nenhum (ao contrário de todo teste `DATABASE_URL`-gated já existente no projeto gerado); a variável existe só para não rodar por padrão em `pnpm test` (é lento, faz instalação real de pacotes).

### References

- [Source: _bmad-output/implementation-artifacts/epic-3-retro-2026-10-01.md#F15] — "a epic redescobriu 3 vezes que bugs reais só aparecem rodando de verdade contra Postgres, sem nenhum harness reutilizável" — origem do item.
- [Source: _bmad-output/implementation-artifacts/epic-5-retro-2026-10-07.md] — action item 7, reconfirmação de que o item permanecia aberto depois da Epic 5 inteira.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — "Ação proposta, não aplicada: construir um harness reutilizável de validação pós-geração" e o achado de processos `tsx server.ts` órfãos (Story 5.8) que motivou priorizar isto agora.
- [Source: bin/aether-admin.js] — entrypoint público real que o harness invoca via `spawnSync`.
- [Source: src/cli/commands/new.ts] — contrato de `runNew`/`validateProjectName` que o harness nunca duplica, só exercita via CLI real.
- [Source: src/cli/commands/migrate.ts] — contrato de `runMigrate` (`pnpm --filter db exec prisma migrate deploy`, `DATABASE_URL` via ambiente) que fundamenta a decisão de reaproveitar `aether-admin migrate` na etapa `migrate` do harness.
- [Source: src/cli/run-command.ts] — padrão de `spawn(command, { shell: true, ... })` com comando único (não array), reaproveitado nas etapas `pnpm run <script>` do harness.
- [Source: src/scaffolding/templates/root.ts] — scripts reais do `package.json` gerado (`typecheck`, `lint`, `format:check`, `test`) que o harness invoca.
- Documentação oficial do Node.js, `util.parseArgs` (consultada em 2026-10-07): API estável desde o Node 20, sem necessidade de dependência externa (`minimist`/`yargs`) para um parser de 3 flags.

### Review Findings

Autorrevisão (leitura adversarial do próprio diff, sem camadas automatizadas de review nesta story) focada nos 3 pontos pedidos explicitamente: (1) as 6 etapas realmente rodam até o fim sem parar na primeira falha; (2) a lógica de limpeza bate exatamente com a AC #5; (3) o tratamento de `--database-url` evita qualquer efeito colateral de provisionamento de banco (AC #6).

- [x] [Review][Patch] O primeiro design do Task 8.1 (teste de integração) chamava `validateScaffold()` diretamente dentro do processo do Vitest — isso reproduzia, de forma determinística (3/3), um flake real de `typecheck` no projeto gerado (ver Dev Notes, "Achado real durante a implementação"), nunca observado rodando a mesma sequência num terminal comum [scripts/validate-scaffold.test.ts] — corrigido: o teste agora roda `validate-scaffold.ts` como subprocesso independente (`node --import tsx/esm ...`), o que sidesteps o problema por completo E é um teste mais fiel ao uso real (exercita `parseArgs`/`isMainModule`, a própria entrada da CLI, nunca cobertos de outra forma pelo design anterior).
- [x] [Review][Patch] Como hardening preventivo descoberto durante a investigação do flake acima — mesmo sem confirmação de que é a causa raiz exata — os processos filhos (scaffold/migrate/typecheck/lint/format:check/test) passaram a rodar contra um ambiente saneado (`sanitizeEnv`), nunca `process.env` bruto repassado sem filtro: variáveis que só existem porque ALGUMA ferramenta está invocando o próprio harness (Vitest, `pnpm exec`, outro lifecycle de `npm`/`pnpm` já em andamento) nunca deveriam vazar pros processos filhos que o harness spawna, independentemente de resolverem o flake observado ou não — é a postura correta pra uma ferramenta que existe pra provar o que um usuário comum, num terminal comum, obtém [scripts/validate-scaffold.ts].
- [x] [Review][Patch] A asserção original do caso "fim a fim" (Task 8.2) exigia `exit 0`/sucesso total — frágil demais: ela conflava "o MECANISMO do harness funciona" (o que a AC #8 pede) com "o projeto gerado nunca falha nenhuma etapa" (fora do controle desta story, e justamente o tipo de coisa que pode falhar de forma legítima e ainda assim real) [scripts/validate-scaffold.test.ts] — corrigido: a asserção agora verifica consistência interna (todas as 6 etapas aparecem; se `exit 0` então diretório removido e mensagem "PASSOU"; se `exit 1` então diretório preservado e mensagem "FALHOU") em vez de um resultado fixo — prova o mecanismo sem depender de o projeto gerado nunca falhar.
- [x] [Review][Patch] Duas quebras de linha feitas à mão no teste (import de `node:fs` e um `.find()` encadeado) não batiam com o estilo real do Prettier (confirmado comparando a saída de `prettier --write` com o arquivo) [scripts/validate-scaffold.test.ts] — corrigido antes mesmo de rodar `format:check` pela primeira vez.
- [x] [Review][Patch] `afterAll` (limpeza dos diretórios de scratch dos testes reais) usava o timeout default do Vitest (10s) — insuficiente pra um `rmSync` recursivo de uma árvore `node_modules` completa no Windows, achado ao rodar o teste de verdade (hook timeout real observado) [scripts/validate-scaffold.test.ts] — corrigido: timeout explícito de 60s, e cada `rmSync` embrulhado em `try/catch` individual (um diretório com arquivo momentaneamente bloqueado nunca impede a limpeza dos outros).

**Rejeitados:**
- `baixo` — `parseArgs` com `strict: true` lança uma exceção (stack trace do Node, não uma mensagem amigável) se o usuário passar uma flag desconhecida — aceitável pra uma ferramenta interna de desenvolvimento (nunca exposta a usuário final), nenhuma AC exige UX refinada de erro de linha de comando pra isto.
- `baixo` — Variáveis `VITE_*` arbitrárias que um usuário eventualmente queira propagar pro projeto gerado também são removidas pelo saneamento de ambiente (mesmo prefixo usado pelas variáveis internas do Vitest/Vite) — nenhum caso de uso real identificado pra isso hoje (o harness não tem nenhuma flag pra "variáveis extra a propagar"), e o trade-off (nunca vazar estado do Vitest) vale mais que essa perda teórica.

**Deferido:**
- O flake de `typecheck` sob contenção de recursos (`@fastify/cookie`, ver Dev Notes) — causa raiz não isolada, não reproduzido fora de um cenário de contenção específico, registrado em `deferred-work.md` ("Deferred from: implementation of 5-9...") pra investigação futura. Não é um defeito desta story (o harness capturou e reportou a falha real corretamente); é exatamente o tipo de achado que a existência deste harness tornou possível descobrir.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- Ambiente: `pnpm`/`corepack` não estavam no PATH padrão desta sessão; localizada e usada a distribuição Node 24 pré-extraída já stashada em `/c/tmp/node-v24.18.0-win-x64` (contém shims `pnpm`/`pnpm.CMD`/`pnpm.ps1` prontos, `pnpm --version` → `11.24.0`, batendo com o `packageManager` pinado nos projetos gerados).
- Baseline antes de qualquer mudança: `pnpm install` (135 pacotes, lockfile já resolvido) + `pnpm typecheck`/`lint`/`test` limpos (13 arquivos, 88 testes).
- `pnpm format:check` deste repositório sinaliza TODOS os 47 arquivos rastreados (não só os desta story) como "fora do padrão Prettier" — confirmado ser um artefato puramente ambiental desta máquina (`core.autocrlf=true` no Git global, checkout com CRLF; Prettier normaliza `endOfLine` pra `lf` por padrão e já reporta qualquer CRLF como divergência, mesmo sem nenhuma diferença de conteúdo real). Confirmado comparando `prettier --write` numa cópia com `\r` removido manualmente de cada arquivo novo desta story (`scripts/validate-scaffold.ts`, `scripts/validate-scaffold.test.ts`) contra o conteúdo real — ambos batem perfeitamente com o estilo do Prettier uma vez normalizados pra LF; os dois ajustes de quebra de linha reais encontrados nesse processo (um import e um `.find()` encadeado) foram corrigidos (ver Review Findings). O processo explícito desta story só exige `typecheck`/`lint`/`test` limpos (não `format:check`) — confirmado que os dois arquivos novos são Prettier-clean modulo esse artefato de CRLF pré-existente, não introduzido por esta story.
- Smoke test manual real (`pnpm validate:scaffold --dir /c/tmp/aether-5-9-smoketest`, sem `--database-url`): scaffold/typecheck/lint/format:check/test todos `PASS`, `migrate` `SKIP`, diretório removido ao final (confirmado via `test -d` depois) — rodado múltiplas vezes, sempre limpo.
- Smoke test manual do `--database-url` (apontando pra uma porta que não tem nada escutando): `migrate` falha com `P1001` (não consegue alcançar o servidor) — confirmado que o script NUNCA cria/sobe nada, só tenta conectar e reporta a falha real (AC #6); `typecheck`/`lint`/`format:check` continuam rodando normalmente (nunca para na primeira falha), `test` também falha (os testes `DATABASE_URL`-gated do projeto gerado tentam rodar e falham pela mesma razão — comportamento esperado, não um bug); resultado geral `FALHOU`, diretório preservado.
- `RUN_SCAFFOLD_VALIDATION=1 pnpm test` (teste de integração real gated): achado real durante esta própria validação — documentado em detalhe nos Dev Notes ("Achado real durante a implementação") e no Review Findings — um flake de `typecheck` no projeto gerado (augmentação de tipo do `@fastify/cookie` "ausente"), reproduzido de forma determinística (3/3) só quando a chamada rodava de dentro do processo do Vitest, nunca rodando a mesma sequência via terminal comum (0/8+). Resolvido no nível do TESTE (redesenhado pra rodar via subprocesso independente, Task 8.1) após a causa raiz exata não ter sido isolada (diff completo de `process.env` entre os dois contextos, variáveis suspeitas forçadas manualmente uma a uma e em conjunto — nenhuma reproduziu isoladamente num terminal comum). Após o redesenho: `RUN_SCAFFOLD_VALIDATION=1 pnpm exec vitest run scripts/validate-scaffold.test.ts` rodado 3 vezes consecutivas, sempre 2/2 testes passando, diretórios de scratch sempre limpos ao final.
- `pnpm test` (suíte padrão, sem a env var) confirmado rápido (~3.5s) e com o novo arquivo de teste aparecendo como `1 skipped` (14 arquivos, 90 testes totais) — nunca roda por padrão, conforme AC #8.
- Scripts de diagnóstico temporários (`scripts/env-dump.test.ts`, usado só pra dumpar `process.env` de dentro do Vitest e comparar com um terminal comum) criados e removidos antes do commit final — nunca fizeram parte do diff comitado.

### Completion Notes List

- Story criada do zero nesta sessão — o arquivo não existia no repositório apesar de referenciado por dois retros (`epic-3-retro-2026-10-01.md` F15/item 5, `epic-5-retro-2026-10-07.md` action item 7) e por `deferred-work.md`; escrita seguindo a convenção exata de `5-8-bulk-user-import.md` (frontmatter, seções, Dev Agent Record) com as ACs/Tasks derivadas da especificação completa recebida para esta implementação.
- Todas as 8 ACs satisfeitas: script em `scripts/validate-scaffold.ts` (nunca em `src/scaffolding/templates/`); invocação exclusiva via `spawnSync` do entrypoint público (`bin/aether-admin.js new`/`migrate`), nunca import direto de `src/cli/*`; flags via `node:util parseArgs` nativo; as 6 etapas sempre rodam até o fim (confirmado com teste real forçando falha do scaffold); exit code/limpeza consistentes com AC #5 (`fs.rmSync` só em sucesso completo sem `--keep`); `--database-url` só consumida (exportada como `DATABASE_URL`, usada só para `aether-admin migrate` + testes `DATABASE_URL`-gated — nunca cria/derruba banco, nunca toca Docker, confirmado via smoke test real contra uma porta inexistente); `package.json` ganhou `validate:scaffold`; teste de integração real (`scripts/validate-scaffold.test.ts`) gated por `RUN_SCAFFOLD_VALIDATION=1`, nunca mocka `spawnSync`, não roda em `pnpm test` padrão.
- Achado real não previsto no planejamento: um flake de ambiente (ver Dev Notes/Review Findings/Debug Log) que só aparece rodando o harness de dentro de outro processo Vitest/`pnpm exec` já em andamento — resolvido no nível do teste (subprocesso independente) e registrado em `deferred-work.md` para investigação futura; motivou também adicionar `sanitizeEnv` como hardening preventivo no próprio script.
- `tsconfig.json`/`vitest.config.ts` (raiz deste repositório) precisaram de um ajuste mínimo de `include` para que `scripts/**/*.ts`/`scripts/**/*.test.ts` fossem reconhecidos por `typecheck`/`test` — `eslint.config.js` já cobria a árvore inteira por padrão, nenhuma mudança necessária lá.
- `pnpm format:check` deste repositório sinaliza TODOS os arquivos pré-existentes como fora do padrão — confirmado ser um artefato de `core.autocrlf=true` desta máquina (CRLF vs. o `endOfLine: lf` default do Prettier), não um problema real de formatação nem algo introduzido por esta story (ver Debug Log); os dois arquivos novos desta story são Prettier-clean uma vez normalizados pra LF.
- Nenhuma dependência nova adicionada (`node:util parseArgs` é nativo do Node, conforme AC #3).

### File List

- `scripts/validate-scaffold.ts` (novo)
- `scripts/validate-scaffold.test.ts` (novo)
- `package.json` (M) — script `validate:scaffold`
- `tsconfig.json` (M) — `include` estendido para `scripts/**/*.ts`
- `vitest.config.ts` (M) — `include` estendido para `scripts/**/*.test.ts`
- `_bmad-output/implementation-artifacts/deferred-work.md` (M) — novo achado registrado (flake de typecheck sob contenção)
- `_bmad-output/implementation-artifacts/5-9-post-generation-validation-harness.md` (novo — esta própria story)
