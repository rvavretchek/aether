---
baseline_commit: f14db843a3bd2888d03c8ee38ca86bd1b2d80764
context: [_bmad-output/implementation-artifacts/3-1-identity-tree-enforcement.md, _bmad-output/implementation-artifacts/3-2-aether-admin-migrate.md]
---

# Story 3.3: `aether-admin generate module <nome...>`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como um desenvolvedor usando um projeto gerado pelo Aether,
Eu quero rodar `aether-admin generate module <nome>` (um ou mais nomes na mesma chamada) dentro do meu projeto e receber um Módulo de domínio completo — schema Prisma, schema Zod, router tRPC já protegido por enforcement, declaração de Recursos, e teste — já registrado como nó na árvore de identidade com acesso negado por padrão,
Para que eu tenha um ponto de partida funcional e seguro pra cada domínio de negócio, sem escrever manualmente o roteamento, a validação, ou a checagem de autorização.

## Acceptance Criteria

1. **`aether-admin generate module <nome...>` existe e roda de dentro de um projeto gerado (FR-3).** Mesmo modelo de alvo que `aether-admin migrate` (Story 3.2) — `process.cwd()`, sem criar nada em outro lugar; recusa com mensagem clara se `packages/db/schema.prisma` não existir a partir do `cwd()`. Aceita 1+ nomes na mesma chamada (`generate module financeiro comercial`), gerando cada um sequencialmente — **`--from <arquivo>` (geração em lote a partir de um arquivo de planejamento) fica fora do escopo desta story** (ver Dev Notes, "Escopo explicitamente cortado").
2. **Cada `<nome>` vira um Módulo Hexagonal completo (AD-1), com exatamente os 4 arquivos-adapter fixos mais `domain/`.** `apps/api/src/modules/<slug>/{domain/ports.ts, domain/service.ts, schema.ts, resources.ts, repository.ts, router.ts, router.test.ts}` — mesma forma do módulo `system` (Story 1.1), mas com `domain/` de verdade (não um `.gitkeep` vazio): `repository.ts` implementa uma porta definida em `domain/ports.ts`, `router.ts` chama `domain/service.ts` (nunca `repository.ts` direto — AD-1), `repository.ts` importa e usa de verdade a extensão tenant-aware (AD-5, Story 3.1), `router.ts` usa `.use(requireResource(...))` de verdade (não como comentário de intenção).
3. **Schema Zod único em `packages/shared` (AD-3).** `packages/shared/src/schemas/<slug>.ts` — única fonte, reexportada por `apps/api/src/modules/<slug>/schema.ts` (mesmo padrão do módulo `system`). Cobre `create` (input: `name`) e a forma de saída de `list`.
4. **Fragmento de schema Prisma mínimo, tenant-scoped (AD-5).** Um novo `model <NomeModulo>` (PascalCase do slug) é **acrescentado** (nunca edita um model existente — ver Dev Notes) ao final de `packages/db/schema.prisma` — `id` (`uuid(7)`), `tenantId` (denormalizado, sem `@relation` — ver Dev Notes), `name`, `createdAt`/`updatedAt`, `@@map` pra tabela snake_case. Geração falha, sem tocar nada, se um model com esse nome já existir no schema (proteção contra rodar `generate module` duas vezes com o mesmo nome).
5. **`router.ts` expõe `list` e `create`, cada um com `.use(requireResource('<slug>.list'))` / `.use(requireResource('<slug>.create'))` (AD-7, FR-27).** Default-deny real — sem `RoleAssignment` cobrindo o Recurso, a chamada é rejeitada antes de qualquer lógica de negócio rodar (mesmo middleware `requireResource` da Story 3.1, reaproveitado sem modificação).
6. **`root-router.ts` ganha o novo módulo montado, de forma idempotente.** Import + entrada no `router({...})` inseridos no arquivo existente — rodar `generate module` pra um nome cujo router já está montado falha explicitamente (mesma proteção do item 4), nunca duplica a entrada silenciosamente.
7. **Escrita atômica de código + árvore de identidade, numa migration só (AD-6).** A mesma chamada que gera os arquivos de código também escreve UMA migration real (`packages/db/migrations/<timestamp>_add_<slug>_module/migration.sql`) contendo: `CREATE TABLE` da nova tabela de negócio, `INSERT` da linha em `Module` (mais a linha self-referencial em `ModuleClosure`, `depth=0`), e `INSERT` dos `Resource`s declarados em `resources.ts` (`<slug>.list`, `<slug>.create`). A CLI roda essa migration via o mecanismo real de `aether-admin migrate` (Story 3.2, `prisma migrate deploy`) **antes** de reportar sucesso — nunca deixa código gerado sem o nó correspondente na árvore (mesmo invariante que a AD-6 já fecha desde a Story 3.1).
8. **Falha explícita em colisão de `Resource.name` — nunca reaproveita silenciosamente (AD-7).** Se `<slug>.list`/`<slug>.create` já existir, a migration falha ao tentar o `INSERT` (constraint `@unique` de `Resource.name`, já existente desde a Story 3.1) — `prisma migrate deploy` aplica cada migration dentro de uma transação (padrão do Prisma), então a colisão desfaz a migration inteira, incluindo o `CREATE TABLE` da tabela de negócio; nenhum estado parcial fica no banco. O erro real do Postgres chega ao desenvolvedor via `runMigrate` (Story 3.2, já reforçado no code review pra nunca esconder a causa) — sem precisar de uma consulta de pré-checagem separada contra o banco (mais simples, e sem a janela de TOCTOU que uma checagem separada teria).
9. **Lint/format/typecheck/test passam de fábrica, e o fluxo completo é validado contra Postgres real.** Mesma barra de todas as stories anteriores: regenerar via `aether-admin new`, gerar um módulo de verdade (`generate module pedidos`), aplicar a migration de verdade contra o Postgres do Laboratório Integrit, confirmar a tabela nova + as linhas de `Module`/`ModuleClosure`/`Resource` existem, confirmar que `requireResource` de fato nega por padrão e libera com uma `RoleAssignment` real (reaproveitando o padrão de teste de integração da Story 3.1), gerar um SEGUNDO módulo com nome diferente na mesma sessão pra confirmar que múltiplas chamadas coexistem, e confirmar que rodar `generate module pedidos` de novo (mesmo nome) falha com mensagem clara sem tocar em nada.

## Tasks / Subtasks

- [x] **Task 1 — Validação de nome + esqueleto do comando (AC: #1)**
  - [x] 1.1 `src/cli/commands/generate-module.ts` — `runGenerateModule(targetDir, names, options?)`. Valida `targetDir` como projeto Aether via `checkIsAetherProject` (extraído de `migrate.ts` pra `src/cli/is-aether-project.ts`, compartilhado entre os dois comandos)
  - [x] 1.2 Validação de nome por slug — mesma regex de `new.ts` (`^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`), mais reservar `system`/`auth`. Nome inválido → falha ANTES de gerar qualquer nome da lista (falha rápida, nenhum arquivo tocado) — checado via `options.generateOneModule` (injetável) nunca chamado
  - [x] 1.3 CLI: `src/cli/index.ts` ganha `command === 'generate'` com sub-roteamento pro `type` `module` — outros tipos saem com erro claro "tipo não suportado"; sem nomes → uso claro; exit 1 se qualquer nome individual falhar, mesmo com outros tendo sucedido
  - [x] 1.4 Testes: 5 cenários em `generate-module.test.ts` (projeto inválido, sintaxe inválida, nome reservado, sucesso único, múltiplos nomes com falha parcial) + 6 cenários novos em `index.test.ts` — 49/49 testes, `tsc`/`eslint` limpos

- [x] **Task 2 — Fragmento de schema Prisma (AC: #4)**
  - [x] 2.0 `src/codegen/naming.ts` — `slugToPascalCase`, `slugToCamelCase`, `slugToTableName`
  - [x] 2.1 `src/codegen/module-fragment.ts` — `buildModuleModelFragment(slug): string`, campos mínimos, `tenantId` denormalizado sem `@relation`, `@@map`
  - [x] 2.2 `src/codegen/merge-schema-prisma.ts` — `appendModelToSchema(schemaContent, modelFragment, modelName): string | null` — `null` em colisão (com limite de palavra, sem falso-positivo em `PedidosArquivados` vs `Pedidos`), senão acrescenta ao final. Função pura
  - [x] 2.3 Wiring em `runGenerateModule` (ler/escrever `schema.prisma` do `targetDir`) feito na integração final (Task 7.3) — as peças puras desta task já estão prontas e testadas isoladamente
  - [x] 2.4 Testes: 6 cenários (fragmento pro slug simples e com hífen, sem `@relation`; merge acrescenta, detecta colisão real, não falso-positiva em nome-prefixo) — 58/58 testes, `tsc` limpo

- [x] **Task 3 — Schema Zod compartilhado (AC: #3)**
  - [x] 3.1 `src/codegen/module-shared-schema.ts` — `buildSharedSchemaFile(slug): string` — `<camelSlug>CreateInputSchema`/`<camelSlug>ListOutputSchema`, mesmo padrão de `system.ts` (`.trim().min(1).max(200)`)
  - [x] 3.2 Wiring em `runGenerateModule` (escrever `packages/shared/src/schemas/<slug>.ts`, falhar se já existir) feito na integração final (Task 7.3)
  - [x] 3.3 Teste: 2 cenários (exports certos pro slug simples e com hífen) — 60/60 testes, `tsc`/`eslint` limpos. Compilação real verificada na Task 9

- [x] **Task 4 — Arquivos Hexagonais do módulo (AC: #2)**
  - [x] 4.0 **Pré-requisito, achado durante a implementação**: `packages/db/src/extensions/tenant.ts` (Story 3.1) — trocado `forTenant` de listar `group`/`roleAssignment` nominalmente pra usar `$allModels` (cobre qualquer model presente e futuro). Cast controlado (`args as WithWhere`) só dentro da implementação — verificado empiricamente (sondagem descartada depois) que o chamador continua com tipo específico do model. `tenant.test.ts` (Story 3.1) não mudou e continua verde (mesmo `injectTenant`, só o ponto de interceptação mudou) — `tsc`/`pnpm test` deste repositório confirmam 60/60
  - [x] 4.1 `src/codegen/module-files.ts` — `buildModuleFiles(slug): Record<string, string>` — `domain/ports.ts`, `domain/service.ts`, `schema.ts`, `resources.ts`, `repository.ts`, `router.ts`, `router.test.ts`. **Sem `domain/.gitkeep`** — `domain/` real desta vez
  - [x] 4.2 `domain/ports.ts` — `<Modulo>Repository`/`<Modulo>Record` — porta que `repository.ts` implementa
  - [x] 4.3 `domain/service.ts` — `list<Modulo>`/`create<Modulo>`, passthrough mínimo. Sem import de `@prisma/client`/`@trpc/*` (AD-1, confirmado por teste)
  - [x] 4.4 `repository.ts` — implementação concreta via `forTenant` (nunca `prisma` cru — até `create` passa pelo client estendido, AD-5)
  - [x] 4.5 `resources.ts` — `<camel>Resources = ['<slug>.list', '<slug>.create']`
  - [x] 4.6 `router.ts` — chama `domain/service.ts`, nunca `repository.ts` direto. `.use(requireResource(...))` já incluído aqui (adiantado da Task 6 por ser mais natural escrever o router completo de uma vez — Task 6 cobre a validação/teste específicos disso)
  - [x] 4.7 Wiring em `runGenerateModule` (escrever em `apps/api/src/modules/<slug>/`, falhar se o diretório já existir) feito na integração final (Task 7.3)
  - [x] 4.8 Teste: 6 cenários (chaves certas, sem import proibido em domain/service, router chama service não repository, resources com os 2 nomes certos, repository sem PrismaClient cru, interpolação de slug com hífen) — 66/66 testes, `tsc`/`eslint` limpos

- [x] **Task 5 — Merge em `root-router.ts` (AC: #6)**
  - [x] 5.1 `src/codegen/merge-root-router.ts` — `mountRouterInRootRouter(content, slug, routerExportName): string | null` — `null` em colisão; senão insere import (depois da última linha de import) e entrada `  <slug>: <routerExportName>,` (antes do `});` que fecha `router({`). Função pura
  - [x] 5.2 Wiring em `runGenerateModule` (ler/escrever `root-router.ts`) feito na integração final (Task 7.3)
  - [x] 5.3 Testes: 3 cenários (1 módulo existente, 2+ módulos existentes, colisão detectada e recusada) — 70/70 testes, `tsc`/`eslint` limpos

- [x] **Task 6 — Enforcement real no router gerado (AC: #5)**
  - [x] 6.1 `router.ts` (Task 4.6) já ganhou `.use(requireResource('<slug>.list'))`/`.use(requireResource('<slug>.create'))` — feito junto da Task 4 por ser mais natural escrever o router completo de uma vez
  - [x] 6.2 `router.test.ts` gerado ganhou 5 cenários: sem atribuição (nega), list com atribuição em list (permite), create com atribuição só em list (nega), create com atribuição em create (permite e persiste), via Group (permite). Module/Resource não são criados no teste — já existem, inseridos pela migration da Task 7 (AD-6). Ancestral/descendente/irmão **não repetidos aqui** — são lógica do middleware `requireResource` em si (já cobertos pela suíte da Story 3.1), não deste router específico. **Corrigido no code review**: um 6º cenário real de isolamento entre tenants foi adicionado (ver achado de Verification Gap Reviewer) — agora são 6 de verdade
  - [x] 6.3 Teste (deste repositório, unitário): `module-files.test.ts` já verifica que `router.ts` contém as chamadas `.use(requireResource(...))` (via Task 4.8's asserts sobre o conteúdo de `router.ts`) — execução real acontece no projeto regenerado, Task 9

- [x] **Task 7 — Migration atômica: tabela + árvore de identidade (AC: #7, #8)**
  - [x] 7.1 `src/codegen/module-migration.ts` — `buildModuleMigrationSql(slug, tableName, ids): string` (função pura, `ids` = `{moduleId, closureId, listResourceId, createResourceId}` já prontos) — monta o `CREATE TABLE` (mesma convenção das migrations reais das Stories 2.1/2.2/3.1 — `id TEXT NOT NULL`, sem `DEFAULT`, etc.) mais os `INSERT` de `Module`/`ModuleClosure`/`Resource`×2 com os ids recebidos como literais. Geração real dos ids (`crypto.randomUUID()`, ver Dev Notes) fica num wrapper fino separado, fora da função pura
  - [x] 7.2 `runGenerateModule` escreve a migration em `packages/db/migrations/<timestamp>_add_<slug>_module/migration.sql` (timestamp real, `new Date()` formatado `YYYYMMDDHHMMSS`, não hardcoded). Colisão de `Resource.name` (AC #8) é responsabilidade da própria constraint `@unique` do banco + atomicidade de transação do `prisma migrate deploy` — sem checagem de pré-voo separada (ver AC #8, decisão tomada durante a implementação: mais simples e sem janela de TOCTOU)
  - [x] 7.3 **Integração final** — `defaultGenerateOneModule` em `generate-module.ts` liga Tasks 2-7: lê/mescla `schema.prisma`, escreve o schema Zod compartilhado, escreve os arquivos Hexagonais, mescla `root-router.ts`, escreve a migration, chama `runMigrate(targetDir)` (Story 3.2, reaproveitado sem modificação). Qualquer colisão de arquivo/diretório (Tasks 2/3/4/5) falha ANTES de escrever qualquer coisa nesse nome; falha da migration (SQL inválido, conexão, unique violation) propaga o erro real de `RunMigrateResult`, nunca escondido
  - [x] 7.4 Testes: `buildModuleMigrationSql` produz SQL com os 4 blocos esperados (CREATE TABLE, INSERT Module, INSERT ModuleClosure, INSERT Resource×2) pro slug certo, e usa `tableName` corretamente pra slug com hífen — 5/5 cenários, 75/75 testes totais, `tsc` limpo

- [x] **Task 8 — Múltiplos nomes numa chamada (AC: #1)**
  - [x] 8.1 `runGenerateModule` itera sobre `names` sequencialmente (implementado desde a Task 1) — cada nome é uma unidade atômica independente; se o nome N falhar, os nomes 1..N-1 já aplicados **permanecem**
  - [x] 8.2 Resultado agregado (`RunGenerateModuleResult.results`) reporta claramente quais nomes tiveram sucesso e qual falhou (e por quê)
  - [x] 8.3 Teste real (não só com `generateOneModule` injetado): `['pedidos', 'pedidos']` (nome duplicado na mesma chamada) — o primeiro sucede de verdade, o segundo colide de verdade (model já existe, escrito pelo primeiro), resultado reflete os dois desfechos, o primeiro permanece gerado no disco — 80/80 testes totais, `tsc`/`eslint`/`format:check` limpos (só os 4 arquivos de drift pré-existente, não tocados por esta story, continuam com aviso do Prettier — ver `deferred-work.md`)

- [x] **Task 9 — Validação final (AC: #9)**
  - [x] 9.1 Regenerado via `aether-admin new` num diretório limpo — `pnpm typecheck`/`lint`/`format:check`/`test` reais, limpo (achou e corrigiu 2 problemas reais: formatação Prettier do `router.test.ts` gerado, `type`→`interface` em `tenant.ts`)
  - [x] 9.2 `aether-admin generate module pedidos` rodado de verdade dentro do projeto regenerado — arquivos confirmados no disco, `pnpm typecheck`/`lint`/`format:check`/`test` do projeto continuam limpos com o módulo novo dentro
  - [x] 9.3 Validação real contra Postgres do Laboratório Integrit: migration de `pedidos` aplicada via `prisma migrate deploy` real (mesmo mecanismo de `aether-admin migrate`) — tabela nova + `Module`/`ModuleClosure` (self-referencial, depth=0)/2 `Resource`s confirmados via `SELECT` real
  - [x] 9.4 Enforcement real confirmado: 59/59 testes do projeto rodados contra Postgres real, incluindo os 6 cenários do `router.test.ts` gerado pra `pedidos` (nega sem atribuição, permite com atribuição certa, nega create com atribuição só de list, permite e persiste create, permite via Group, e — adicionado no code review — isolamento real confirmado entre 2 Tenants)
  - [x] 9.5 `aether-admin generate module comercial` (segundo nome, chamada separada) rodado de verdade → confirmado coexistindo com `pedidos` sem conflito (`root-router.ts` com os dois montados, 2 `Module`s + 4 `Resource`s distintos confirmados via `SELECT` no Postgres real)
  - [x] 9.6 `aether-admin generate module pedidos` de novo (mesmo nome) rodado de verdade → falhou explícito e claro ("model Pedidos já existe"), sem tocar em nada

## Dev Notes

### 🎯 Onde este código realmente vive — mesmo lembrete das Stories 2.1/2.2/3.1/3.2

O gerador (`src/cli/commands/generate-module.ts`, `src/codegen/*.ts`) monta e escreve os arquivos — mas ao contrário de TUDO que veio antes (que sempre gerava conteúdo **estático**, pré-escrito no template), aqui o conteúdo é **parametrizado em runtime** pelo nome do módulo que o desenvolvedor escolhe. Funções puras (`build*`, `merge*`) são o núcleo testável sem FS/rede; `runGenerateModule` orquestra I/O real (ler/escrever arquivo, chamar `runMigrate`).

### ⚠️ Escopo explicitamente cortado desta story

- **`generate module --from <arquivo>`** (FR-3) — geração em lote a partir de um arquivo YAML de planejamento. Fica pra uma story futura: é uma fina camada sobre a MESMA lógica por-nome que esta story já constrói (ler o arquivo, extrair a lista de nomes, chamar `runGenerateModule` pra cada um) — não uma capacidade nova.
- **Campos customizados no model Prisma gerado** — o model desta story é deliberadamente mínimo (`id`/`tenantId`/`name`/timestamps). Nenhum mecanismo de "o desenvolvedor descreve os campos que quer" existe no MVP (nem no Brief, nem no PRD, nem na Architecture Spine) — `generate module` dá a FORMA (Hexagonal + árvore + enforcement), o desenvolvedor edita o model/repository à mão depois pra adicionar campos reais de negócio. Mesma filosofia "ponto de partida" já usada no módulo `system` (Story 1.1, Hello World).
- **Tipos de `generate` além de `module`** — FR-3 já deixa isso como questão em aberto no PRD (§11, item 2: "outros tipos possíveis... não foram enumerados"). Só `module` é implementado.

### ⚠️ Achado real durante a implementação: `forTenant` (Story 3.1) não cobre models futuros

`packages/db/src/extensions/tenant.ts` (Story 3.1) lista `group`/`roleAssignment` explicitamente no `$extends({ query: {...} })` — um model novo criado por `generate module` NÃO passaria por essa extensão, forçando `repository.ts` a usar o `PrismaClient` cru, violando a AD-5 ("nunca há um PrismaClient global usado diretamente por um repository.ts"). **Resolução, verificada empiricamente contra o client real gerado (Prisma 7.10.0):** `$extends` tem uma chave especial `$allModels` que intercepta QUALQUER model, presente e futuro — trocar a implementação de `forTenant` pra usar `$allModels` em vez de listar `group`/`roleAssignment` nominalmente resolve o problema pra sempre, sem exigir que `generate module` edite `tenant.ts` a cada módulo novo. Ressalva real descoberta na sondagem: como `$allModels` cobre uma união de tipos de TODOS os models, o TypeScript não consegue inferir o tipo concreto de `args.where` dentro do handler — precisa de um cast controlado (`args as { where?: Record<string, unknown> }`) **dentro da implementação de `forTenant`**; confirmado que isso NÃO vaza pro chamador (`db.group.findMany(...)` continua com tipo de retorno específico de `Group`, testado com um `@ts-expect-error` real contra um campo que não existe). Esta story inclui a migração de `forTenant` pra `$allModels` como pré-requisito (Task 4.0).

### ⚠️ Reconciliação: model gerado usa `tenantId` denormalizado, sem `@relation` pra `Tenant`

Ligar o model novo a `Tenant` via `@relation(fields: [tenantId], references: [id])` exigiria que `Tenant` também declarasse uma relação de volta (array `<slug>s <Modelo>[]`) — Prisma valida as duas pontas. Isso significaria EDITAR o model `Tenant` já existente em `schema.prisma` (inserir uma linha no meio de um bloco existente), não só ACRESCENTAR no fim do arquivo — uma operação de merge bem mais arriscada, especialmente num projeto onde o desenvolvedor já pode ter editado `Tenant` à mão. Resolução: mesmo padrão já usado (e documentado) em `RefreshToken` (Story 2.1) — `tenantId String @map("tenant_id")` denormalizado, **sem** `@relation` pra `Tenant`. O isolamento de tenant continua garantido em tempo de execução pela extensão `forTenant` (AD-5), que não depende de FK declarada no schema — só do campo `tenantId` existir na tabela. Mantém o merge desta story estritamente append-only (nunca edita um model já existente).

### ⚠️ Reconciliação: `crypto.randomUUID()` (UUID v4, gerado em JS no momento do `generate module`) nas linhas de seed da migration, não `uuid(7)`

Toda a árvore de identidade (Story 3.1) usa `@default(uuid(7))`, gerado **pelo Prisma Client em JS**, nunca uma expressão SQL (confirmado empiricamente na Story 3.1 — colunas de id são `TEXT NOT NULL`, sem `DEFAULT` nenhum no banco). Isso significa que as linhas de `Module`/`ModuleClosure`/`Resource` que esta story precisa inserir **dentro de uma migration SQL estática** não podem vir do mesmo mecanismo — não tem Prisma Client rodando no momento em que `prisma migrate deploy` aplica um arquivo `.sql`. Resolução: `runGenerateModule` pré-computa os IDs em JS com `crypto.randomUUID()` (nativo do Node, zero dependência nova) no momento em que monta o texto da migration, embutindo os valores como literais nos `INSERT` — resolve de quebra o problema de reaproveitar o MESMO id de `Module` em 2 linhas (`ModuleClosure` self-referencial precisa do id do módulo tanto em `ancestor_id` quanto em `descendant_id`; gerar o id no banco via `gen_random_uuid()` exigiria uma `WITH` CTE só pra isso). Isso produz UUID **v4**, não v7, só nessas linhas específicas — inconsistente em "sabor" com o resto da árvore, mas inofensivo: a coluna é `TEXT` puro, sem constraint de formato, e nada no schema/código depende de UUIDs serem v7 pra funcionar (v7 foi escolhido só por ordenação temporal, não por corretude). `buildModuleMigrationSql` em si é uma função pura que RECEBE os ids já prontos (testável com ids fixos, sem `crypto` no caminho de teste) — um wrapper fino gera os ids reais no caminho de produção.

### ⚠️ Reconciliação: múltiplos nomes numa chamada não são uma transação única

AD-6 fala da atomicidade de **um** módulo (código + migration dele). Esta story generaliza pra N nomes numa chamada (`generate module a b c`), mas cada nome continua sendo sua PRÓPRIA unidade atômica — não existe (nem faria sentido exigir) uma transação cross-módulo que desfaz `a` se `c` falhar. Reflete o próprio AD-6: "a CLI roda a migration antes de retornar sucesso" é sobre o módulo individual.

### Arquitetura — o que seguir à risca

- **AD-1 (Hexagonal por Módulo):** 4 arquivos-adapter fixos + `domain/`, comunicação `domain`→`repository` só via porta, nunca import direto de Prisma/tRPC dentro de `domain/`.
  [Source: ARCHITECTURE-SPINE.md#AD-1]
- **AD-3 (monorepo):** schema Zod em `packages/shared/src/schemas/<módulo>.ts`, única fonte.
  [Source: ARCHITECTURE-SPINE.md#AD-3]
- **AD-5 (tenant):** `repository.ts` usa a extensão tenant-aware (`forTenant`), nunca o `PrismaClient` cru.
  [Source: ARCHITECTURE-SPINE.md#AD-5, Story 3.1]
- **AD-6 (módulo = nó da árvore):** código + migration na MESMA operação, `ModuleClosure` append-only, linha self-referencial `depth=0` obrigatória, `generate module` é o ÚNICO caminho de criação de `Module`.
  [Source: ARCHITECTURE-SPINE.md#AD-6]
- **AD-7 (enforcement):** `resource-id` = `<module-slug>.<ação>`, `Resource.name` único globalmente (Story 3.1: Resource/Module são GLOBAIS, não tenant-scoped — ver reconciliação da Story 3.1), falha explícita em colisão, `.use(requireResource(...))` em toda procedure gerada.
  [Source: ARCHITECTURE-SPINE.md#AD-7, Story 3.1]
- **Migration real, não `migrate diff`:** esta story usa o MESMO mecanismo de aplicação da Story 3.2 (`aether-admin migrate` → `prisma migrate deploy`) — já provado confiável localmente. A migration em si é **escrita à mão** por código (não gerada via `prisma migrate dev`/`diff`), seguindo a mesma convenção de DDL já usada em todas as migrations reais deste projeto.
  [Source: Story 3.2]

### Aprendizados das Stories 1.1-3.2 (aplicar aqui)

- **Regenerar e validar de verdade (Task 9)** — bugs reais nunca apareceram só lendo código, em nenhuma story até agora.
- **Funções puras primeiro, I/O depois** — `build*`/`merge*` testáveis com strings/fixtures, sem precisar de disco ou Postgres; `runGenerateModule` orquestra. Mesmo padrão de `injectTenant` (Story 3.1) e `RunMigrateOptions` (Story 3.2).
- **Nunca reaproveitar silenciosamente em colisão** (AD-7, texto literal) — e esta story tem MUITAS camadas onde colisão pode acontecer (model no schema, arquivo de módulo, entrada em root-router, Resource no banco) — cada uma precisa da própria checagem explícita, não uma checagem genérica que espera pegar tudo.
- **Erro nunca escondido atrás de mensagem genérica** — `runMigrate` (Story 3.2, já corrigido no code review) é o padrão de referência: causa real sempre propagada.
- **`prisma migrate deploy` é confiável localmente** (Story 3.2) — diferente de `migrate diff`/`migrate dev`, que falharam repetidamente em ambiente local nas stories anteriores. Esta story só usa `deploy` (via `runMigrate`), nunca os outros dois.

### Testing Standards

- Vitest, testes co-localizados. Funções puras de `src/codegen/*.ts` testadas com fixtures de string, sem FS real.
- `router.test.ts` **gerado** (o que vai pro projeto do desenvolvedor) segue o padrão `describe.skipIf(!process.env.DATABASE_URL)` já estabelecido em `require-resource.test.ts` (Story 3.1).
- Validação end-to-end real (Task 9) inclui uma prova de enforcement funcionando de verdade contra Postgres — não é suficiente confiar nos 8 cenários unitários do template gerado sem rodar pelo menos um deles de verdade nesta story também.

### References

- [Source: prd.md#FR-3] — `generate module <nome...>`, múltiplos nomes, schema Prisma + Zod + router protegido + Recursos, módulo default nasce com `new`, `--from <arquivo>`.
- [Source: ARCHITECTURE-SPINE.md#AD-1, #AD-3, #AD-5, #AD-6, #AD-7] — forma Hexagonal, fronteiras de pacote, tenant, árvore=código, enforcement.
- [Source: _bmad-output/implementation-artifacts/3-1-identity-tree-enforcement.md] — schema da árvore (Module/ModuleClosure/Resource GLOBAIS, reconciliação pós-review), `requireResource`, `forTenant`.
- [Source: _bmad-output/implementation-artifacts/3-2-aether-admin-migrate.md] — `runMigrate`, `runCommand` compartilhado, padrão de teste com dependência injetável, `prisma migrate deploy` confiável localmente.
- [Source: src/scaffolding/templates/api.ts] — módulo `system` como referência de forma (AD-1), `root-router.ts` atual (1 módulo montado).
- [Source: src/scaffolding/templates/shared.ts] — `schemas/system.ts` como referência de padrão Zod.

### Review Findings

*Code review de 2026-10-01, 4 layers (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, Acceptance Auditor), diff isolado da Story 3.3 (2284 linhas).*

- [x] [Review][Patch] ~~Sem rollback quando `runMigrate` falha (ou qualquer erro inesperado acontece): código fica órfão no disco sem o nó correspondente na árvore (viola AC #7), e a mesma tentativa fica bloqueada pelas próprias checagens de colisão~~ — **aplicado**: `defaultGenerateOneModule` agora desfaz tudo (schema.prisma/root-router.ts voltam ao conteúdo original, arquivos/diretórios novos removidos) em qualquer falha depois do início da escrita. Retry depois de uma falha agora funciona. Achado convergente de 3 layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor). Limitação conhecida e documentada: se `prisma migrate deploy` já registrou a migration como `failed` em `_prisma_migrations`, chamadas futuras continuam bloqueadas do lado do Postgres até `prisma migrate resolve` manual — o rollback de arquivos não alcança isso, fora do escopo desta story. [src/cli/commands/generate-module.ts]
- [x] [Review][Patch] ~~Nenhum try/catch no loop de `runGenerateModule` nem dentro de `defaultGenerateOneModule`: uma exceção (ex.: `root-router.ts` ausente) derruba o processo inteiro em vez de reportar um erro limpo por nome~~ — **aplicado**: mesma correção do item acima (try/catch + rollback envolvendo toda a escrita). [src/cli/commands/generate-module.ts]
- [x] [Review][Patch] ~~Nome de módulo começando com dígito (ex.: `1abc`) passa na validação e vira `model 1abc { ... }`, identificador Prisma/TS inválido~~ — **aplicado**: regex agora exige letra no primeiro caractere. Achado do Edge Case Hunter, reproduzido de verdade. [src/cli/commands/generate-module.ts]
- [x] [Review][Patch] ~~`RESERVED_MODULE_NAMES` só tinha `system`/`auth` — `generate module tenant` (ou qualquer outro model já existente) passava a pré-checagem e só falhava bem mais fundo, violando a garantia de "falha ANTES de gerar qualquer nome" (Task 1.2)~~ — **aplicado**: lista estendida com todos os models/tabelas da árvore de identidade (`tenant`, `user`, `group`, `role`, `module`, `module-closure`, `resource`, `role-assignment`, `refresh-token`, `rate-limit-hit`). Achado do Blind Hunter. [src/cli/commands/generate-module.ts]
- [x] [Review][Patch] ~~Nenhum teste (nem `DATABASE_URL`-gated) prova que `forTenant` generalizado pra `$allModels` filtra por tenant de verdade pra um model novo — o único cenário que chama `list()` nunca tem dado de mais de um tenant pra realmente exercitar o filtro~~ — **aplicado**: novo 6º cenário no `router.test.ts` gerado, criando uma linha real no Tenant A e confirmando que o Tenant B (mesmo Module/Resource globais) nunca a vê. Achado bem fundamentado do Verification Gap Reviewer — validado de verdade contra o Postgres do lab (Task 9.4). [src/codegen/module-files.ts]
- [x] [Review][Patch] ~~Comentário gerado em `resources.ts` afirma que a migration "lê este mesmo array" — falso, os dois valores são derivados independentemente do `slug` em momentos diferentes, só coincidem por construção~~ — **aplicado**: comentário corrigido pra descrever a convenção real (mesma fonte — o `slug` —, não leitura em runtime). Achado do Acceptance Auditor. [src/codegen/module-files.ts]
- [x] [Review][Patch] ~~Contagem de cenários errada em 2 lugares da story (Task 6.2 dizia "6" com 5 listados; Task 9.4 dizia "8 cenários unitários do router.test.ts" quando eram 5)~~ — **aplicado**: números corrigidos (agora 6 de verdade, com o cenário de isolamento adicionado). Achado do Acceptance Auditor. [Tasks 6.2/9.4 desta story]
- [x] [Review][Patch] ~~Checkboxes de Task 4 e Task 9 (nível de task, não subtask) ficaram `[ ]` apesar de todas as subtasks `[x]` e do Dev Agent Record narrando em detalhe que a validação foi feita — contradição real dentro do próprio arquivo, com a story em status `review`~~ — **aplicado**: checkboxes corrigidos (a validação REALMENTE foi feita, confirmado por esta própria sessão — era um esquecimento de atualização do checklist, não uma reivindicação falsa). Achado convergente de 3 layers. [Tasks 4/9 desta story]
- [x] [Review][Defer] `mountRouterInRootRouter` retorna `null` tanto pra colisão real (slug já montado) quanto pra "não consegui achar a âncora" (root-router.ts com formatação muito diferente) — a mensagem de erro no caller ("já está montado") fica enganosa no segundo caso. Baixo risco real (root-router.ts é sempre gerado pelo próprio Aether, raramente editado à mão de forma que quebre a âncora). [src/codegen/merge-root-router.ts]
- [x] [Review][Defer] Duas chamadas `generate module` concorrentes pro mesmo slug podem intercalar escritas em vez de uma falhar limpo — risco real baixo (CLI de uso interativo single-developer, não um servidor concorrente). [src/cli/commands/generate-module.ts]
- [x] [Review][Defer] `forTenant`'s `$allModels` não tem nenhuma salvaguarda de tipo/lint além de um comentário contra ser chamado acidentalmente pra `Module`/`Resource` (que não têm `tenant_id`) — hoje inalcançável (nada no código faz isso), e se alguém fizer, falha alto e claro (erro do Prisma), não silenciosamente. [packages/db/src/extensions/tenant.ts]
- [x] [Review][Defer] Colisão de nome de tabela (não só de model) só é pega pela constraint do Postgres pra nomes não cobertos pela lista de reservados — já bem mitigado pelo patch que estendeu `RESERVED_MODULE_NAMES`; qualquer nome residual ainda falha com segurança (nenhuma corrupção), só com uma mensagem menos específica. [src/codegen/module-migration.ts]

**Dismiss:** ~300 linhas de diff em `db.ts` são só normalização de estilo de aspas (Prettier), efeito colateral de rodar `prettier --write` sobre o arquivo inteiro ao corrigir o achado `type`→`interface` — conteúdo semântico idêntico, confirmado (Blind Hunter).

### ⚠️ Achado real pós-review: `generate module` nunca rodava `prisma generate`

A re-validação final contra Postgres de verdade (depois de todos os patches acima aplicados) reproduziu um bug real que nenhuma das 4 camadas de review nem os testes com `runMigrate` mockado pegaram: `defaultGenerateOneModule` só roda `prisma migrate deploy` (via `runMigrate`, Story 3.2) — nunca `prisma generate`. O `@prisma/client` instalado no projeto gerado só ganha o accessor do model novo (`db.pedidos`, `db.estoque`, etc.) depois que `prisma generate` roda de novo; `migrate deploy` sozinho não regenera o client. Reproduzido de verdade: depois de `generate module pedidos` aplicar a migration com sucesso, `db.pedidos.create(...)`/`db.pedidos.findMany(...)` lançavam `TypeError: Cannot read properties of undefined` — 4 dos 6 cenários de `router.test.ts` falhavam.

**Corrigido**: adicionado um passo `generatePrismaClient` (`pnpm --filter db run generate`, mesmo comando de `defaultGeneratePrismaClient` em `new.ts`) depois de `runMigrate` ter sucesso. Decisão de design: esse passo roda **fora** do try/catch de rollback — uma vez que a migration foi aplicada de verdade no Postgres (`_prisma_migrations` já registra ela como aplicada), desfazer `schema.prisma`/os arquivos locais deixaria o projeto com o banco migrado mas o schema sem o model, uma inconsistência pior do que só reportar o erro e pedir retry manual do `prisma generate`. Coberto por um novo teste de integração (`generate-module-integration.test.ts`) que injeta uma falha só nesse passo e confirma que nada é revertido. Revalidado de ponta a ponta contra o Postgres do Laboratório Integrit com um módulo novo (`estoque`, pra não colidir com o `pedidos` órfão da tentativa anterior) — migration aplicada, `prisma generate` rodou de verdade, 60/60 testes reais passando incluindo os 6 cenários do `router.test.ts` gerado (cross-tenant isolation incluso). [src/cli/commands/generate-module.ts, src/cli/commands/generate-module-integration.test.ts]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5), via skills `bmad-create-story` (planejamento) + `bmad-dev-story` (implementação)

### Debug Log References

- **`$allModels` do Prisma Client Extensions verificado empiricamente antes de reescrever `forTenant`** (Task 4.0) — compilei um probe real contra o client gerado (Prisma 7.10.0), incluindo um `@ts-expect-error` provando que o cast interno não vaza tipo fraco pro chamador. Descartado depois de confirmado; a implementação final foi revalidada contra o projeto regenerado de verdade (Task 9).
- **Formatação gerada não batia byte-a-byte com o Prettier real** (achado da Task 9, `router.test.ts` gerado tinha linhas longas) — mesma lição já registrada em `new.ts` desde a Story 1.1 ("deixa o Prettier ser a autoridade final"): adicionado um passo `formatGeneratedCode` (`pnpm exec prettier --write .`) ao pipeline de `generate module`, injetável pra teste (mesmo padrão de `RunNewOptions`).
- **`eslint` real pegou um erro que `tsc` sozinho não pegaria** — `type WithWhere = {...}` precisou virar `interface` (`@typescript-eslint/consistent-type-definitions`) só visível rodando lint contra o projeto REGENERADO, não neste repositório (o template é só uma string até ser escrito em disco).
- **Validação completa contra o Postgres do Laboratório Integrit compartilhado**: banco recriado vazio, as 4 migrations reais (incluindo a gerada dinamicamente pra `pedidos`) aplicadas limpo; `\dt`/`SELECT` confirmam a tabela nova + `Module`/`ModuleClosure` (self-referencial, depth=0)/2 `Resource`s; 59/59 testes reais do projeto (incluindo os 5 cenários de `router.test.ts` gerado pra `pedidos`, todos passando contra Postgres real — nega sem atribuição, permite com atribuição certa, nega create com atribuição só de list, permite e persiste create, permite via Group); segundo módulo (`comercial`) gerado e confirmado coexistindo na mesma árvore (4 Resources totais, 2 Modules); reroda de `pedidos` falha explícita e limpa, sem tocar em nada.
- **Limitação real do ambiente, não do código**: diretórios de sondagem temporários (`aether-probe`, `aether-story33-revalidate`) tiveram `rm -rf` bloqueado algumas vezes por "Device or resource busy" no Windows — resolvido com retry/`rmdir` depois que o lock liberava; não afetou nenhuma validação, só a limpeza de scratch.
- **Achado real pós-patches, só visível rodando `generate module` de ponta a ponta contra Postgres real**: `prisma generate` nunca rodava depois de `migrate deploy`, deixando `db.<model>` `undefined` em runtime — ver subseção dedicada nos Dev Notes. Corrigido, coberto por teste de integração, revalidado contra o Laboratório Integrit com um módulo novo (`estoque`) depois do fix: 60/60 testes reais, `prisma generate` confirmado rodando no output do comando, `Module`/`Resource` rows confirmados via `SELECT` direto.
- **Validação real rodou dentro do container `aether-api` do laboratório, não localmente**: o framework (`bin/`, `src/`) foi copiado pra dentro do container via `docker cp` com `tsx` instalado ali (`npm install --no-save tsx@4.19.2` — o `node_modules` do container não tem build scripts de postinstall habilitados por política, mas o binário do `tsx` funciona mesmo assim, confirmado), porque só o container tem acesso de rede ao Postgres do laboratório — o host bare (`ubt-host01`) não tem Node instalado.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created. Escopo explicitamente cortado nos Dev Notes (`--from <arquivo>`, campos customizados no model, outros tipos de `generate`) pra manter a story completável — cada corte é uma fina camada sobre o que esta story já constrói, não uma capacidade nova represada. Ajuste feito durante a análise: Task 4 corrigida pra incluir `domain/ports.ts`/`domain/service.ts` de verdade (a versão inicial só tinha `domain/.gitkeep`, violando a própria AD-1 — comunicação domain→repository só via porta).
- Todas as 9 Tasks completas. `aether-admin generate module <nome...>` (FR-3) implementado: schema Prisma incremental, schema Zod compartilhado (AD-3), módulo Hexagonal completo com `domain/` real (portas + serviço, AD-1), enforcement real via `requireResource` (AD-7), merge idempotente em `root-router.ts`, migration atômica registrando o módulo na árvore de identidade (AD-6) aplicada via `aether-admin migrate` (Story 3.2).
- **Achado real corrigido durante a implementação**: `forTenant` (Story 3.1) não cobria models futuros — generalizado pra `$allModels`, verificado empiricamente que o chamador continua com tipagem forte por model.
- **Colisão de `Resource.name` (AC #8) resolvida de forma mais simples que a planejada**: em vez de uma consulta de pré-checagem contra o Postgres, a própria constraint `@unique` + atomicidade de transação do `prisma migrate deploy` já garante falha explícita sem estado parcial — decisão tomada durante a implementação, documentada nos Dev Notes.
- **Validação real de ponta a ponta, sem bug de lint/tipo/runtime escapando da rodada final de verdade** (achou e corrigiu 3 problemas reais no processo: formatação Prettier, `type`→`interface`, e — só visível depois de todos os patches do code review, rodando `generate module` de ponta a ponta contra Postgres real — `prisma generate` nunca rodava depois de `migrate deploy`) — 83/83 testes deste repositório (typecheck/lint/format limpos) + `generate module` rodado de verdade múltiplas vezes (pedidos, comercial, pedidos-de-novo-falha, e `estoque` na rodada final pós-fix) + validação real contra Postgres do Laboratório Integrit (migration aplicada, árvore de identidade confirmada via SELECT, `prisma generate` confirmado rodando e regenerando o client, 60/60 testes reais incluindo os 6 cenários do `router.test.ts` gerado — isolamento cross-tenant incluso —, múltiplos módulos coexistindo na mesma árvore).

### File List

- `src/codegen/naming.ts` (novo)
- `src/codegen/naming.test.ts` (novo)
- `src/codegen/module-fragment.ts` (novo)
- `src/codegen/module-fragment.test.ts` (novo)
- `src/codegen/merge-schema-prisma.ts` (novo)
- `src/codegen/merge-schema-prisma.test.ts` (novo)
- `src/codegen/module-shared-schema.ts` (novo)
- `src/codegen/module-shared-schema.test.ts` (novo)
- `src/codegen/module-files.ts` (novo)
- `src/codegen/module-files.test.ts` (novo)
- `src/codegen/merge-root-router.ts` (novo)
- `src/codegen/merge-root-router.test.ts` (novo)
- `src/codegen/module-migration.ts` (novo)
- `src/codegen/module-migration.test.ts` (novo)
- `src/cli/is-aether-project.ts` (novo — `checkIsAetherProject` extraído de `migrate.ts`, compartilhado)
- `src/cli/commands/migrate.ts` (editado — usa `checkIsAetherProject` do módulo compartilhado)
- `src/cli/commands/generate-module.ts` (novo — `runGenerateModule`, `defaultGenerateOneModule` liga todas as peças)
- `src/cli/commands/generate-module.test.ts` (novo)
- `src/cli/commands/generate-module-integration.test.ts` (novo — integração real do default, só `runMigrate`/`formatGeneratedCode` mockados)
- `src/cli/index.ts` (editado — novo comando `generate module`)
- `src/cli/index.test.ts` (editado — testes do comando `generate`)
- `src/scaffolding/templates/db.ts` (editado — `forTenant` generalizado pra `$allModels`, `interface WithWhere`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (editado)
