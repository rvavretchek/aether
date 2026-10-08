---
baseline_commit: d3862d260b9317e75fd07759c0568898a069bd0b
context: [_bmad-output/implementation-artifacts/epic-5-retro-2026-10-07.md, _bmad-output/implementation-artifacts/5-4-roles-crud-backend.md]
---

# Story 5.10: Unicidade real de Role.name por tenant

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como administrador,
eu quero que o sistema rejeite a criação/renomeação de um Papel pra um nome já usado por outro Papel do mesmo tenant,
para que eu nunca tenha dois Papéis com o mesmo nome me confundindo numa tela de administração (hoje isso é permitido silenciosamente — nenhum erro, nenhum aviso).

Esta story resolve dois action items da retrospectiva da Epic 5 (`epic-5-retro-2026-10-07.md`) de uma vez: o item #4 (decisão do Boss: "sim, `Role.name` deveria ter `@@unique([tenantId, name])` de verdade") e, como consequência direta, o item #1 (o comentário em `shared.ts` que afirmava falsamente que Role já era único por design — depois desta story, a afirmação passa a ser verdadeira, então o comentário só precisa ser corrigido pra citar a fonte certa, não mais removido).

## Acceptance Criteria

1. O schema Prisma de `Role` ganha `@@unique([tenantId, name])` — reforçado por uma nova migration (`CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name")`, mesmo estilo de DDL já usado por `users_tenant_id_email_key`). Dois Papéis com o mesmo nome no MESMO tenant nunca mais coexistem; o mesmo nome em tenants DIFERENTES continua permitido (mesma relação de `User.email`, já tenant-scoped desde a Story 2.1).
2. `roles.create` rejeita com `CONFLICT` (mensagem `'Já existe um Papel com este nome.'`) quando o nome já existe no tenant do admin — nunca vaza o erro bruto do Prisma (P2002), mesmo padrão de `users.create`/`users.update`.
3. `roles.update` rejeita com o MESMO `CONFLICT` quando o novo nome colide com outro Papel do tenant (nunca o próprio Papel sendo editado — renomear um Papel pro nome que ele JÁ TEM não é um conflito) — e continua retornando `NOT_FOUND` quando `roleId` não existe/é de outro tenant, exatamente como hoje.
4. O comentário em `shared.ts` (atualmente "Role/Resource SÃO únicos por design, AD-7") é corrigido — a unicidade de Role não vem da AD-7 (que é só sobre `Resource.name`, global); vem desta story, é tenant-scoped, e nasceu de uma decisão de produto explícita (retro da Epic 5), não da arquitetura original.

## Tasks / Subtasks

- [x] Task 1: Schema + migration (AC: #1)
  - [x] 1.1 `packages/db/schema.prisma` (template `db.ts`): adicionar `@@unique([tenantId, name])` ao model `Role`, imediatamente ANTES de `@@map("roles")` (mesma posição relativa de `@@unique` em todo outro model deste schema que tem os dois — `users_tenant_id_email_key`, `rate_limit_hits_...`, `module_closures_...` — todos com `@@unique` antes de `@@map`; achado do code review: o texto original desta subtask dizia "logo após", invertido em relação à convenção real já seguida em todo o resto do arquivo).
  - [x] 1.2 `migrations/20261007000000_add_role_name_unique/migration.sql` (novo, template `db.ts`): `-- CreateIndex` + `CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name");` — mesmo estilo exato de `users_tenant_id_email_key` (Story 2.1) e `rate_limit_hits_identifier_window_start_key` (Story 2.2).
- [x] Task 2: `isDuplicateRoleNameError` + `roles.create`/`roles.update` (AC: #2, #3)
  - [x] 2.1 `admin.ts` (template): **ajustado durante o code review** — o rascunho original criava uma nova função `isDuplicateRoleNameError`, byte-a-byte idêntica à `isDuplicateEmailError` já existente (mesma checagem estrutural `'code' in err && err.code === 'P2002'`). Achado do Blind Hunter: isso repetia, nesta mesma story, exatamente a duplicação que o action item #2 da retro da Epic 5 pediu pra nunca mais acontecer. Corrigido: `isDuplicateEmailError` renomeada pra `isUniqueConstraintError` (genérica, reaproveitada por QUALQUER índice único do router — hoje email de User e nome de Role), ambos os call sites de `users.create`/`update` atualizados pro novo nome, nenhuma função nova criada.
  - [x] 2.2 `roles.create`: envolver `db.role.create(...)` em try/catch, mapear `isDuplicateRoleNameError` → `CONFLICT` (AC #2), mesmo padrão exato de `users.create`.
  - [x] 2.3 `roles.update`: envolver `db.role.updateMany(...)` em try/catch ANTES do `if (result.count === 0)` já existente — um erro P2002 de `updateMany` chega da mesma forma que chegaria de `update()`; mapear pro mesmo `CONFLICT` (AC #3). A ordem importa: o catch de P2002 vem primeiro (mutação pode falhar por nome duplicado ANTES de sabermos se o roleId existe), o `count === 0` continua depois, inalterado.
- [x] Task 3: Corrigir o comentário em `shared.ts` (AC: #4)
  - [x] 3.1 Reescrever o comentário acima de `createRoleInputSchema`/próximo da declaração de `listGroupsOutputSchema` (onde hoje diz "Role/Resource SÃO únicos por design, AD-7") — a nova versão explica: `Resource.name` é único globalmente por AD-7 (isso nunca mudou); `Role.name` é único POR TENANT desde a Story 5.10 (decisão de produto da retro da Epic 5, não arquitetura original); `Group.name` continua sem nenhuma unicidade (nenhuma AC/FR exige).
- [x] Task 4: Testes (AC: todas)
  - [x] 4.1 `router.test.ts` (template): `roles.create` rejeita com `CONFLICT` quando o nome já existe no mesmo tenant (fixture cria um Role com nome X, tenta criar outro com o MESMO X no mesmo tenant).
  - [x] 4.2 `roles.create` com o MESMO nome em TENANTS DIFERENTES continua funcionando (não é `CONFLICT`) — prova que a unicidade é por tenant, não global (confundir isso com `Resource.name`, que É global, seria o erro mais fácil de cometer aqui).
  - [x] 4.3 `roles.update` rejeita com `CONFLICT` ao tentar renomear um Papel pro nome de OUTRO Papel do mesmo tenant.
  - [x] 4.4 `roles.update` NÃO rejeita ao "renomear" um Papel pro nome que ele JÁ TEM (no-op de nome, deve ter sucesso — é o mesmo registro colidindo consigo mesmo, não um conflito de verdade).
  - [x] 4.5 `roles.update` continua retornando `NOT_FOUND` (não `CONFLICT`) quando `roleId` não existe/é de outro tenant — teste já existente da Story 5.4, confirmar que não regride.

## Dev Notes

### 🎯 Onde este código vive

Mesmo padrão de toda story desde a 1.1: os Tasks acima editam `src/scaffolding/templates/db.ts`/`admin.ts`/`shared.ts` (o GERADOR), nunca um projeto gerado diretamente.

### ⚠️ Escopo explicitamente cortado desta story

- **Nenhuma migração de dados existente** — não há nenhum projeto Aether real em produção ainda (AD-9, sem alvo de deploy); a migration só precisa funcionar contra um banco criado do zero ou já em uso só por projetos de desenvolvimento/teste. Se dois Papéis com o mesmo nome já existissem num banco real antes desta migration, `prisma migrate deploy` falharia ao criar o índice único — cenário aceitável de se ignorar no MVP (mesmo espírito de outras decisões AD-9).
- **`Group.name` continua sem unicidade** — não é uma lacuna desta story, é uma decisão já tomada (Story 5.3) e reafirmada pela própria pergunta que o Boss respondeu (só Role foi perguntado).

### Arquitetura — o que seguir à risca

- **AD-5 (isolamento de tenant)**: o índice é `(tenant_id, name)`, nunca só `(name)` — um nome igual em tenants diferentes nunca deveria colidir (mesma relação de `users_tenant_id_email_key`). Confundir isso com `resources_name_key` (que É global, por design — Resource não tem fronteira de tenant, AD-7) seria o erro mais fácil de introduzir nesta story; os dois padrões coexistem no mesmo arquivo de schema por motivos genuinamente diferentes.
- **P2002 em `updateMany`**: mesmo mecanismo já usado em `users.update` (Story 5.1/5.2) — `updateMany` lança P2002 normalmente quando a mutação violaria um índice único, mesmo não lançando por "registro não encontrado" (que é `count: 0`, não uma exceção). As duas checagens (catch de P2002, depois `count === 0`) são independentes e não se substituem.

### Testing Standards

- Mesmo padrão `DATABASE_URL`-gated de toda `admin/router.test.ts` desde a Story 5.1.
- Task 4.2 é o teste mais importante desta story — sem ele, um futuro refactor que acidentalmente trocasse `@@unique([tenantId, name])` por `@@unique([name])` (global, errado) passaria despercebido por todo o resto da suíte.

### References

- [Source: _bmad-output/implementation-artifacts/epic-5-retro-2026-10-07.md#Action items] — item #4 (decisão do Boss, confirmada) e item #1 (comentário incorreto a corrigir).
- [Source: src/scaffolding/templates/db.ts#users_tenant_id_email_key] — estilo exato de migration de índice único composto a replicar.
- [Source: src/scaffolding/templates/admin.ts#isDuplicateEmailError] — padrão estrutural exato do helper a espelhar.
- [Source: _bmad-output/implementation-artifacts/5-4-roles-crud-backend.md] — implementação original de `roles.create`/`update`/`delete`, sem tratamento de nome duplicado (o gap que esta story fecha).

### Review Findings

Revisão adversarial de 4 camadas (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, Acceptance Auditor) sobre o diff de 3 arquivos (`db.ts`, `admin.ts`, `shared.ts`) desta story, com `review_mode: full` contra este spec + contexto da retro da Epic 5/Story 5.4.

- [x] [Review][Patch] (Blind Hunter) `isDuplicateRoleNameError` era byte-a-byte idêntica à `isDuplicateEmailError` já existente — repetindo, NESTA MESMA story, a exata duplicação que o action item #2 da retro da Epic 5 pediu pra nunca mais acontecer [src/scaffolding/templates/admin.ts] — corrigido: `isDuplicateEmailError` renomeada pra `isUniqueConstraintError` (genérica), `isDuplicateRoleNameError` removida, todos os call sites (`users.create`/`update`, `roles.create`/`update`) apontando pro mesmo helper único.
- [x] [Review][Patch] (Blind Hunter) `sprint-status.yaml` registrava `review` enquanto o próprio arquivo da story já declarava `Status: done` — as duas fontes de verdade discordando sobre se a story estava terminada [_bmad-output/implementation-artifacts/5-10-role-name-uniqueness.md] — corrigido: `Status` mantido em `review` até este patch round terminar, só virando `done` depois, junto com `sprint-status.yaml`.
- [x] [Review][Patch] (Acceptance Auditor) As ACs #2/#3 especificam a mensagem exata (`'Já existe um Papel com este nome.'`) como parte do contrato observável, mas os 2 testes novos de CONFLICT só conferiam `code`, nunca a mensagem — exatamente a mesma classe de lacuna já achada e corrigida uma vez no `roles.delete`/RESTRICT desta mesma story-irmã (5.4, achado #2: "uma regressão de texto passaria pela suíte sem ser notada") [src/scaffolding/templates/admin.ts] — corrigido: os 2 testes agora conferem `code` E `message`.
- [x] [Review][Patch] (Acceptance Auditor) Task 1.1 dizia "logo após `@@map(\"roles\")`", mas a implementação (corretamente) colocou `@@unique` ANTES de `@@map`, igual a todo outro par `@@unique`/`@@map` já existente no schema — o texto da subtask estava invertido em relação à própria convenção que ela mesma cita [_bmad-output/implementation-artifacts/5-10-role-name-uniqueness.md] — corrigido o texto da subtask, nenhuma mudança de código (o código já estava certo).

**Rejeitados:**
- `baixo` — (Blind Hunter) `isUniqueConstraintError` só checa `err.code === 'P2002'`, nunca qual índice específico disparou — um segundo índice único futuro em `Role` faria essa checagem reportar o conflito errado. Mesmo padrão estrutural JÁ usado por `isRoleInUseError`/`isRecordNotFoundError` (só código do Prisma, nunca `meta.target`) em todo o resto do arquivo desde a Story 5.1 — não é uma lacuna nova introduzida aqui, é a convenção já estabelecida do projeto inteiro; mudar isso seria uma decisão maior que esta story não deveria tomar isoladamente.
- `baixo` — (Blind Hunter) Nenhuma checagem preflight de nomes duplicados já existentes antes de aplicar a migration em um banco populado — `prisma migrate deploy` simplesmente falharia nesse cenário. Já documentado explicitamente nos Dev Notes como aceitável (AD-9, sem alvo de produção no MVP, mesmo espírito de outras decisões já tomadas) — não é uma omissão, é uma decisão já registrada.
- `baixo` — (Blind Hunter) A frase de justificativa ("decisão de produto da retro da Epic 5, nunca arquitetura original") se repete em 4 lugares (comentário em `admin.ts`, `db.ts`, `shared.ts`, e este arquivo de story) sem um único ponto de referência cruzado — estilístico, cada ocorrência serve contexto local pra quem está lendo AQUELE arquivo especificamente; não compensa introduzir indireção só pra eliminar a repetição de uma frase.

**Deferido:**
- **Unicidade é case-sensitive** (`"Manager"` e `"manager"` coexistem sem conflito) — achado real do Blind Hunter: a própria motivação da story ("nunca ter dois Papéis me confundindo") não fecha totalmente esse caso, e nenhuma decisão foi registrada sobre isso (diferente do corte explícito já feito pra `Group.name`). O Boss só decidiu "Role.name deve ser único" — case-insensitividade é uma decisão de produto adicional, não implícita nessa frase, e fica fora do escopo que foi autorizado. Registrado em `deferred-work.md` pra decisão futura do Boss.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- Validação local (`aether-5-10-validate`, sem `DATABASE_URL`, via `scripts/validate-scaffold.ts` — PRIMEIRO uso real do harness da Story 5.9): `pnpm typecheck`/`lint`/`format:check` limpos; `pnpm test` → clean.
- Validação real (Laboratório Integrit, container `aether-api`, projeto gerador sincronizado e instalado): banco `aether_5_10_validate` dedicado; migration nova (`20261007000000_add_role_name_unique`) aplicada limpo via `aether-admin migrate`, acionado pelo próprio harness com `--database-url`. Primeira rodada via o harness: 165/166 passaram (a 1ª tentativa real de usar `--database-url` fora do ambiente que o acabou de construir), 1 skipped — o único "falhou" foi um teste PRÉ-EXISTENTE da Story 5.8 (`users.bulkImport não aborta o lote numa falha inesperada...`) que depende do `emailProvider`/`passwordResetTokenStore` REAIS (nunca mockados nesse teste específico) — e esta validação nunca tinha provisionado Mailpit (só Postgres, via `--database-url`), porque Story 5.10 não toca nada de email. Corrigido provisionando um Mailpit dedicado (`mailpit-5-10-validate`) e rodando `pnpm test` de novo (fora do harness, direto, pra isolar a causa) — **167/167 passaram, 0 skipped**, confirmando que a falha nunca foi da Story 5.10 em si.
- **Achado real sobre o próprio harness (Story 5.9), não um bug — comportamento correto, mas levou a um erro meu de operação**: `--database-url` do harness NUNCA escreve no `.env.development` do projeto gerado (por design, AC #5 da própria Story 5.9 — "só consome a URL") — é só uma env var passada ao processo filho durante aquela ÚNICA invocação. Ao tentar re-rodar manualmente (`source .env.development && pnpm test`) pra isolar a falha do Mailpit, esqueci que o arquivo em disco ainda tinha o `DATABASE_URL` DEFAULT (não o real), causando 93/167 falhas em cascata (banco inatingível) — nada a ver com Story 5.10, um erro de operação meu ao testar manualmente por fora do harness. Corrigido ajustando o `.env.development` em disco manualmente antes da rodada final.
- Cleanup: banco `aether_5_10_validate` dropado, container `mailpit-5-10-validate` removido, diretórios sincronizados (`/tmp/aether-5-10-lab`, `/generator-5-10`) removidos do container, tarball e diretório local removidos.
- Re-validação pós-patch do code review (Laboratório Integrit, generator sincronizado de novo em `/generator-5-10-review`): banco `aether_5_10_review` + Mailpit `mailpit-5-10-review` dedicados, `SMTP_HOST` exportado ANTES de invocar o harness (pra que o teste pré-existente da Story 5.8 que depende de Mailpit real, sem gate por env var, tivesse um Mailpit de verdade alcançável). Uma ÚNICA invocação do harness (`validate-scaffold.ts --database-url ...`) desta vez — scaffold, `migrate` (migration nova aplicada de verdade), `typecheck`, `lint`, `format:check`, `test`: **todos PASS**, diretório removido automaticamente (sucesso completo). Confirma que `isUniqueConstraintError` (renomeado) e as mensagens exatas dos 2 testes fortalecidos seguram contra Postgres real.

### Completion Notes List

- Todas as 4 ACs satisfeitas e validadas de ponta a ponta contra Postgres real — incluindo o próprio índice único novo, exercitado por 4 testes novos (duplicata mesmo tenant rejeitada, mesmo nome em tenant diferente aceito, rename pra nome de outro Role rejeitado, rename pro próprio nome aceito).
- Primeira story a usar o harness da Story 5.9 (`validate-scaffold.ts`) de verdade — funcionou exatamente como projetado; o único "problema" encontrado foi um erro de operação meu (não re-exportar `DATABASE_URL` manualmente da mesma forma que o harness faz internamente), não um defeito do harness.
- Resolve 2 dos 8 action items da retro da Epic 5 de uma vez (item #4, a decisão em si; item #1, o comentário incorreto que essa decisão torna correto por construção).
- `Group.name` permanece sem unicidade — decisão já tomada (Story 5.3), não revisitada aqui (o Boss só decidiu sobre Role).

### File List

- `src/scaffolding/templates/db.ts` (M)
- `src/scaffolding/templates/admin.ts` (M)
- `src/scaffolding/templates/shared.ts` (M)
