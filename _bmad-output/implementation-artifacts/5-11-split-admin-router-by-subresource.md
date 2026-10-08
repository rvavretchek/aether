---
baseline_commit: c368d51009ca08f5b369970194aa2a6cd9801fad
context: [_bmad-output/implementation-artifacts/epic-5-retro-2026-10-07.md]
---

# Story 5.11: Dividir admin.ts por sub-recurso (users/groups/roles/roleAssignments)

Status: done

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

- [x] Task 1: Mapear dependências exatas antes de mover nada (AC: #1, #2)
  - [x] 1.1 Confirmar contra o `admin.ts` ATUAL (não confiar só nesta story — o arquivo pode ter mudado desde que foi escrita) qual helper é usado por qual sub-router. Mapa conhecido no momento desta story: `isUniqueConstraintError` (P2002) → `users.create/update` E `roles.create/update` (compartilhado); `isRoleInUseError` (P2003) → só `roles.delete`; `isRecordNotFoundError` (P2025) → `groups.addMember/removeMember` E `roles.addResource/removeResource` (compartilhado); `assertUserInTenant`/`updateGroupMembership` → só `groups`; `updateRoleResources`/`assertResourceExists` → só `roles`; `assertAssigneeInTenant` → só `roleAssignments`; `createUserWithSetupEmail`/`ACCOUNT_SETUP_TOKEN_TTL_MS`/`MAX_BULK_IMPORT_ROWS`/`MAX_BULK_IMPORT_BYTES`/`UploadedFormData` → só `users`. Se o mapa real divergir do que está escrito aqui, siga o código real, não esta lista. **Confirmado contra o código real: o mapa estava correto — única divergência encontrada foi em `makeModuleRoleFixture` (Task 7, ver Review Findings), não neste mapa de helpers de produção.**
- [x] Task 2: `prisma-errors.ts` (AC: #1)
  - [x] 2.1 Novo arquivo no template `admin.ts` (nova entrada no `Record` retornado por `buildAdminFiles()`, chave `'src/core/admin/prisma-errors.ts'`): os 3 helpers de código Prisma, com os MESMOS comentários explicativos que já têm hoje (não reescrever a justificativa, só mover).
- [x] Task 3: `users.router.ts` + `users.router.test.ts` (AC: #1, #2)
  - [x] 3.1 Mover `ACCOUNT_SETUP_TOKEN_TTL_MS`, `MAX_BULK_IMPORT_ROWS`, `UploadedFormData`, `MAX_BULK_IMPORT_BYTES`, `createUserWithSetupEmail`, e o sub-router `users` inteiro (list/create/bulkImport/update/revokeSessions) pra este arquivo novo. Importa `isUniqueConstraintError`/`isRecordNotFoundError` (se usado) de `./prisma-errors.js`.
  - [x] 3.2 Mover todos os testes de `users.*` pra `users.router.test.ts`, importando de `./admin-test-helpers.js` (Task 7) em vez de redefinir `cleanupTenant`/`makeAdminCtx`/`csvFormData` localmente.
- [x] Task 4: `groups.router.ts` + `groups.router.test.ts` (AC: #1, #2, #5)
  - [x] 4.1 Mover `assertUserInTenant`, `updateGroupMembership`, e o sub-router `groups` inteiro (list/create/update/delete/addMember/removeMember/listMembers). Importa `isRecordNotFoundError` de `./prisma-errors.js`.
  - [x] 4.2 Mover todos os testes de `groups.*`.
- [x] Task 5: `roles.router.ts` + `roles.router.test.ts` (AC: #1, #2)
  - [x] 5.1 Mover `updateRoleResources`, `assertResourceExists`, e o sub-router `roles` inteiro (list/create/update/delete/addResource/removeResource/listResources). Importa `isUniqueConstraintError`/`isRoleInUseError`/`isRecordNotFoundError` de `./prisma-errors.js`.
  - [x] 5.2 Mover todos os testes de `roles.*`.
- [x] Task 6: `role-assignments.router.ts` + `role-assignments.router.test.ts` (AC: #1, #2, #5)
  - [x] 6.1 Mover `assertAssigneeInTenant` e o sub-router `roleAssignments` inteiro (list/create/delete).
  - [x] 6.2 Mover todos os testes de `roleAssignments.*`.
- [x] Task 7: `admin-test-helpers.ts` compartilhado (AC: #2)
  - [x] 7.1 Novo arquivo de teste-helper (não é teste em si, só utilitário importado pelos 4 arquivos de teste): `cleanupTenant`, `makeAdminCtx` (factory — precisa receber `tenantId` como parâmetro agora, já que cada arquivo de teste tem seu PRÓPRIO `beforeEach`/`tenantId`, não um compartilhado), `makeModuleRoleFixture`, `cleanupModuleRoleFixture`, `csvFormData`. Cada um dos 4 arquivos de teste importa daqui em vez de redefinir. **Achado durante a implementação (ver Review Findings): `makeModuleRoleFixture` também fechava sobre o `tenantId` do describe block compartilhado (não só `makeAdminCtx`, como os Dev Notes citavam explicitamente) — mesmo ajuste de assinatura aplicado (`tenantId` como primeiro parâmetro), todos os call sites atualizados.**
- [x] Task 8: `router.ts` reduzido a composição (AC: #1)
  - [x] 8.1 `src/core/admin/router.ts` (template): só os 4 imports de sub-router + `export const adminRouter = router({...})`. Nenhum helper, nenhuma lógica de procedure sobra aqui. **Nota: a AC #1 lista "importa os 4 sub-routers + `requireAdmin`", mas esta subtask (mais específica) não cita `requireAdmin` — seguido o texto da subtask: `router.ts` NÃO importa `requireAdmin` (cada sub-router já aplica `.use(requireAdmin())` procedure a procedure, importar aqui sem uso real falharia `pnpm lint` com import não utilizado). Ver Review Findings.**
- [x] Task 9: Validação de equivalência comportamental (AC: #3)
  - [x] 9.1 Contar os testes ANTES da divisão (rodar a suíte local, anotar o número total) e DEPOIS (mesmo número — nenhum teste perdido, nenhum duplicado). Divergência de contagem é sinal de erro na divisão, não algo a investigar depois. **84 testes em `router.test.ts` antes (87 `it()` no arquivo original, 3 em `require-admin.test.ts` intocados + 84 no monólito) → 84 depois, divididos em `users.router.test.ts` (32) + `groups.router.test.ts` (18) + `roles.router.test.ts` (23) + `role-assignments.router.test.ts` (11) = 84. Contagem confirmada via grep antes de mover qualquer coisa, e novamente após, nos 4 arquivos novos.**
  - [x] 9.2 Rodar a suíte completa gerada contra Postgres real (Laboratório Integrit) — mesma disciplina de toda story anterior, mesmo sendo uma refatoração sem mudança de comportamento (a Epic 3 já ensinou que "é só estrutural" não é desculpa pra pular validação real). **Confirmado pela sessão orquestradora**: harness da Story 5.9 rodado contra Postgres real (`aether_5_11_validate`) + Mailpit real (`mailpit-5-11-validate`) no Laboratório Integrit — scaffold/migrate/typecheck/lint/format:check/test, todos PASS. Ver Debug Log References.

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

claude-sonnet-5

### Debug Log References

- Processo mecânico: `buildAdminFiles()` do template `admin.ts` atual foi primeiro DESPEJADO em arquivos reais via um script `tsx` descartável (chamando a função e escrevendo cada chave num arquivo de verdade num diretório temporário), permitindo editar/dividir os 4 arquivos como TypeScript normal (sem lidar com escaping de array-de-strings linha a linha). Um segundo script reconstruiu o `admin.ts` a partir dos 13 arquivos finais (encoding automático, sem digitação manual de escapes). Antes de substituir o arquivo real, um ROUND-TRIP foi verificado: o `admin.ts` gerado foi importado de novo, `buildAdminFiles()` chamado, as 13 saídas despejadas de novo num segundo diretório, e `diff -rq` contra o diretório de origem confirmou **zero diferenças, byte a byte** — garantia de que a reconstrução do template não introduziu nenhuma corrupção de conteúdo antes de tocar no arquivo real do repositório.
- Contagem de testes (Task 9.1): 87 `it(...)` totais no `admin.ts` original — 3 em `require-admin.test.ts` (intocado por esta story) + 84 em `router.test.ts` (o monólito a dividir). Após a divisão: `users.router.test.ts` (32) + `groups.router.test.ts` (18) + `roles.router.test.ts` (23) + `role-assignments.router.test.ts` (11) = 84. Contagem confirmada via grep em ambos os momentos.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (suíte do próprio gerador, sem `DATABASE_URL`): todos limpos após o split. Um teste pré-existente (`write-structural-seed.test.ts`, "writes every file of the Structural Seed tree for this story scope") falhou na primeira rodada — a lista fixa de arquivos esperados ainda citava `apps/api/src/core/admin/router.ts`/`router.test.ts` (os 2 nomes antigos); corrigido para listar as 13 chaves novas que `buildAdminFiles()` agora retorna (mudança mecânica, consequência direta da própria divisão, não um achado de bug).
- `pnpm format:check` deste repositório gerador (não o do projeto gerado) falha — mas confirmado **pré-existente e não relacionado a esta story**: `git show HEAD:src/scaffolding/templates/admin.ts` (a versão ANTES de qualquer mudança desta story) também falha `prettier --check`, e um arquivo nunca tocado por esta story (`src/scaffolding/templates/api.ts`) falha da mesma forma. Causa raiz identificada: `core.autocrlf=true` neste checkout Windows (sem `.gitattributes` normalizando) faz todo arquivo ser materializado com CRLF, enquanto o Prettier (default `endOfLine: "lf"`) espera LF — drift de ambiente pré-existente em todo o repositório, não algo introduzido aqui.
- Validação via harness da Story 5.9 (`npx tsx scripts/validate-scaffold.ts --dir <tmp>`, sem `--database-url`): `scaffold` PASS, `lint` PASS, `format:check` PASS, `test` PASS — `typecheck` FAIL com 2 erros em `apps/api/src/core/auth/router.ts` (`TS2339` em `setCookie`/`cookies`, augmentação de tipo do `@fastify/cookie` "ausente"). **Confirmado pré-existente e não relacionado à divisão do admin router**: rodei o MESMO harness, no MESMO diretório de trabalho, contra o `admin.ts` ORIGINAL (stash temporário das minhas mudanças, restaurado depois via `git stash apply` + `git stash drop` — nunca um `git stash pop` bruto) — resultado idêntico, mesmos 2 erros, mesmas 2 linhas, em `core/auth/router.ts` (arquivo nunca tocado por esta story). O próprio harness já documenta esse padrão de falha em comentário próprio (ambiente-dependente, relacionado a hoisting de tipos do `@fastify/cookie` via pnpm, não ao código gerado). Não é um "PASS em toda etapa" limpo, mas a causa está isolada e comprovadamente fora do escopo desta story.
- Validação real contra Postgres (Laboratório Integrit, Task 9.2): **confirmada pela sessão orquestradora**. Projeto gerador sincronizado (`/generator-5-11`), banco dedicado `aether_5_11_validate` + Mailpit dedicado `mailpit-5-11-validate` (com `SMTP_HOST` exportado antes de invocar o harness, mesma necessidade já descoberta na Story 5.10 — o teste pré-existente de `users.bulkImport` que depende de `emailProvider`/`passwordResetTokenStore` reais precisa de Mailpit alcançável). Única invocação do harness (`validate-scaffold.ts --database-url ...`): scaffold, `migrate` (nenhuma migration nova desta story, as já existentes aplicadas limpo), `typecheck`, `lint`, `format:check`, `test` — **todos PASS** contra Postgres/Mailpit reais. Confirma que o flake de `typecheck` observado no worktree isolado (item acima) é mesmo ambiente-dependente e não se manifesta no Laboratório Integrit — consistente com o mesmo flake já catalogado em `deferred-work.md` pela própria Story 5.9. Cleanup: banco e Mailpit dedicados removidos, diretório sincronizado removido do container, tarball local removido.

### Completion Notes List

- `buildAdminFiles()` (template `admin.ts`) agora retorna 13 chaves em vez de 4: `require-admin.ts`/`require-admin.test.ts` (intocados), `prisma-errors.ts`, `users.router.ts`+teste, `groups.router.ts`+teste, `roles.router.ts`+teste, `role-assignments.router.ts`+teste, `admin-test-helpers.ts`, e `router.ts` reduzido a composição pura. Nenhuma mudança em `write-structural-seed.ts` (confirmado antes de começar — `prefixKeys('apps/api', buildAdminFiles())` já espalha qualquer conjunto de chaves sem lista hardcoded).
- AC #5 (decisão explícita) confirmada no código final: `assertUserInTenant` (`groups.router.ts`) e `assertAssigneeInTenant` (`role-assignments.router.ts`) permanecem duas funções separadas — grep confirmou zero import de um `*.router.ts` por outro.
- `prisma-errors.ts` confirmado como folha da árvore de imports: zero imports próprios, só os 4 sub-routers importam dele.
- Teste pré-existente `write-structural-seed.test.ts` ajustado (lista fixa de arquivos esperados) — único arquivo fora do escopo nominal da story tocado, e só pela consequência mecânica direta de `buildAdminFiles()` ter mudado de forma (Task 8/9 exigem que a suíte do gerador fique limpa).
- Validação real contra Postgres (lab) confirmada pela sessão orquestradora — ver Debug Log References. Comportamento idêntico ao de antes da divisão, 84/84 testes preservados, confirmado também contra infraestrutura real.

### File List

- `src/scaffolding/templates/admin.ts` (M) — `buildAdminFiles()` dividido em 13 chaves.
- `src/scaffolding/write-structural-seed.test.ts` (M) — lista fixa de arquivos esperados atualizada para os novos nomes de arquivo do core/admin.
- `_bmad-output/implementation-artifacts/5-11-split-admin-router-by-subresource.md` (M) — este arquivo.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (M) — status da story `5-11-split-admin-router-by-subresource` para `review`.

## Review Findings

Self-review (leitura completa do diff por mim mesmo, sem camadas adversariais separadas — ver instrução da sessão orquestradora) focado em: (a) ciclo de import entre os arquivos novos, (b) `router.ts` reduzido a composição pura de verdade, (c) AC #5 (duas funções separadas) de fato sem cross-import acidental.

- [x] [Review][Patch] `makeModuleRoleFixture` (hoje `admin-test-helpers.ts`) fechava sobre a variável `tenantId` do `describe` block compartilhado do monólito original — os Dev Notes desta story só citavam `makeAdminCtx` precisando do ajuste de assinatura (`tenantId` como parâmetro explícito), mas a mesma razão (cada um dos 4 arquivos de teste novos tem seu PRÓPRIO `beforeEach`/`tenantId` local, não um compartilhado) se aplica identicamente a `makeModuleRoleFixture` [`_bmad-output/implementation-artifacts/5-11-split-admin-router-by-subresource.md` Task 1.1/Dev Notes estava incompleto neste ponto] — corrigido: `makeModuleRoleFixture(tenantId: string)` com `tenantId` como primeiro parâmetro explícito, todos os call sites nos 2 arquivos de teste que o usam (`roles.router.test.ts`, `role-assignments.router.test.ts`) atualizados para `makeModuleRoleFixture(tenantId)`.
- [x] [Review][Patch] Teste pré-existente `write-structural-seed.test.ts` ("writes every file of the Structural Seed tree for this story scope") falhava após a divisão — sua lista fixa de arquivos esperados ainda citava os 2 nomes antigos (`core/admin/router.ts`/`router.test.ts`) em vez dos 13 novos [`src/scaffolding/write-structural-seed.test.ts`] — corrigido: lista atualizada para as 13 chaves atuais de `buildAdminFiles()`, prefixadas com `apps/api/`.
- [x] [Review][Patch] Chamadas de teste que antes passavam por `adminRouter.createCaller(ctx).users.list()` (etc.) precisavam ser adaptadas pra `usersRouter.createCaller(ctx).list()` (etc.) — mecânica inevitável de testar cada sub-router isoladamente em vez de através da composição `adminRouter`, mas vale registrar explicitamente como a "mudança mecânica de import" que a AC #3 já antecipava, não uma mudança de comportamento [todos os 4 `*.router.test.ts` novos].

**Rejeitados:**
- `baixo` — a AC #1 descreve `router.ts` como importando "os 4 sub-routers + `requireAdmin`", mas a Task 8.1 (mais específica) e a implementação final NÃO importam `requireAdmin` em `router.ts` — cada sub-router já aplica `.use(requireAdmin())` procedure a procedure (comportamento idêntico ao router monolítico original, que também aplicava por procedure, nunca uma vez só no nível do router composto). Importar `requireAdmin` em `router.ts` sem nenhum uso real falharia `pnpm lint` (import não utilizado) — segui a Task (mais operacional) sobre a redação solta da AC, documentado aqui em vez de "corrigir" introduzindo um import morto só para casar com o texto da AC.
- `baixo` — `pnpm format:check` deste repositório gerador falha (CRLF vs. LF, `core.autocrlf=true` sem `.gitattributes`) — confirmado pré-existente (presente no `admin.ts` ANTES desta story e em arquivos nunca tocados por ela, como `api.ts`). Fora do escopo desta story corrigir a configuração de line-ending do repositório inteiro; registrado em Debug Log References, não "corrigido" aqui.
- `baixo` — o harness da Story 5.9 (`validate-scaffold.ts`) reporta `FAIL` na etapa de `typecheck` do projeto GERADO (`@fastify/cookie`, `core/auth/router.ts`) — confirmado pré-existente e idêntico rodando o MESMO harness contra o `admin.ts` ORIGINAL (antes desta story), no mesmo ambiente. Arquivo afetado nunca foi tocado por esta story. Fora do escopo corrigir aqui; documentado em Debug Log References.

**Deferido:**
- Validação real contra Postgres (Laboratório Integrit) — Task 9.2 exige essa rodada, mas este worktree isolado não tem acesso a lab/SSH. Explicitamente deferido para a sessão orquestradora, que tem esse acesso e deve rodá-la antes de marcar esta story como `done`.
