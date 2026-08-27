---
name: 'Review Adversarial — Spine Aether'
type: architecture-review
lens: 'Ataque à spine: dois construtores independentes, cada um obedecendo a Rule ao pé da letra, produzindo unidades incompatíveis entre si'
target: '_bmad-output/planning-artifacts/architecture/architecture-Aether-2026-08-14/ARCHITECTURE-SPINE.md'
created: '2026-08-15'
status: draft
---

# Review Adversarial — ARCHITECTURE-SPINE.md (Aether)

## Método

Para cada AD-1..AD-10 e para a tabela de Consistency Conventions, tentei construir um par concreto **(Epic/Módulo A, Epic/Módulo B)** — construídos em sessões/momentos diferentes, cada um lendo só a spine (não o código um do outro) — que respeita a *Rule* ao pé da letra e ainda assim produz artefatos incompatíveis: formato de erro divergente, dono duplo de uma tabela, escrita conflitante em estado compartilhado, ou nomenclatura colidente. Cada achado abaixo traz: cenário, por que os dois lados são individualmente compliant, e o tightening sugerido (novo AD, cláusula adicional na Rule, ou linha nova na tabela de convenções).

Severidade: **CRÍTICO** (corrompe dado/segurança/invariante central), **ALTO** (dois epics ficam garantidamente incompatíveis em integração), **MÉDIO** (divergência real, impacto contido), **BAIXO** (cosmético/baixo risco de colisão prática).

---

## AD-6 — Módulo de código = nó da árvore de identidade (probe prioritário: protocolo do Closure Table)

Esta é a AD mais frágil da spine porque é a única que descreve uma **operação composta com efeito colateral em duas superfícies** (código + dado) e a única cujo protocolo de escrita num relacionamento self-referencial (`MODULE_CLOSURE`) fica inteiramente implícito.

### Achado 6.1 — "Quem" escreve o Closure Table e "quando" não está pinado — **CRÍTICO**

**Cenário:** Epic A implementa `generate module` como um comando CLI puro de codegen. Para cumprir "cria, na mesma operação, o código do módulo e o registro correspondente na árvore", o builder A faz o CLI abrir uma conexão Prisma direta ao Postgres de dev no momento do `generate` e fazer `INSERT` síncrono em `Module`+`ModuleClosure` antes de escrever os arquivos — ou seja, `generate module` passa a exigir banco de dev *up* e populado. Epic B (sessão diferente, meses depois) lê a mesma Rule e conclui que "registro correspondente" significa emitir uma **migration/seed Prisma** (`prisma/migrations/xxxx_add_module_orders/migration.sql` com os `INSERT`s) que só é aplicada quando alguém rodar `prisma migrate dev` — ou seja, o código gerado e o nó da árvore ficam dessincronizados até a próxima migration, exatamente o cenário que a Rule diz "prevenir".

Os dois são individualmente compliant: ambos fazem "a mesma operação" criar código + registro, no sentido de que nenhum passo manual extra é necessário do ponto de vista de cada builder. Mas são operacionalmente incompatíveis — um exige DB ativo em generate-time (acopla o gerador a infraestrutura, quebra geração offline/CI), o outro exige um passo de migration que pode nunca rodar. Combinados no mesmo monorepo (um módulo gerado pela CLI-A, outro pela CLI-B, ou pior, o próprio `aether-admin` evoluindo entre as duas escolhas em versões diferentes) o time humano/agente não tem como saber qual protocolo está em vigor para um módulo específico sem inspecionar como cada um foi gerado.

**Tightening sugerido:** AD-6 precisa declarar explicitamente o mecanismo de escrita: por exemplo "`generate module` escreve os arquivos de código E emite/aplica uma migration Prisma idempotente contendo os `INSERT`s de `Module`+`ModuleClosure` como parte do mesmo comando (a CLI roda `prisma migrate dev` internamente antes de retornar sucesso); nenhum outro caminho (API em runtime, seed manual) pode criar linhas de `Module`." Isso fecha tanto o "quem" quanto o "quando".

### Achado 6.2 — Linha self-referencial (`ancestorId == descendantId`) não é pinada — **ALTO**

**Cenário:** Builder A implementa o padrão clássico de closure table: toda criação de nó insere, além das linhas herdadas do pai, uma linha `(ancestorId=novoId, descendantId=novoId, depth=0)`. Builder B, numa epic diferente que consome `ModuleClosure` para construir a UI da árvore (FR-14), assume que "ancestor" e "descendant" nunca coincidem (leitura literal de "ancestor/descendant" como relação estritamente hierárquica) e escreve uma query de contagem de descendentes como `COUNT(*) WHERE ancestorId = :moduleId` esperando que o resultado *não* inclua o próprio módulo, somando +1 manualmente quando precisa incluir "este nó e todos abaixo". Se o módulo consumido foi gerado pelo padrão do Builder A (com self-row), a contagem de B fica errada em +1 sistematicamente — e o inverso acontece se A não incluir a self-row mas AD-7 (que "sobe a `ModuleClosure` a partir do Módulo alvo") depender implicitamente de encontrar o próprio módulo na tabela para resolver Role Assignments feitos diretamente sobre ele.

Ambos "obedecem" a AD-6 porque a Rule só diz que a criação do nó gera "entradas em ModuleClosure" (plural, sem especificar quais).

**Tightening sugerido:** especificar no ERD/AD-6: "toda criação de módulo insere uma linha self-referencial `(ancestorId=id, descendantId=id, depth=0)` mais uma linha `(ancestorId=A, descendantId=id, depth=k+1)` para cada ancestral A do pai (depth herdado +1). `ModuleClosure` inclui obrigatoriamente a coluna `depth`." — e adicionar `depth` ao ERD, que hoje só é citado de passagem (AD-8 menciona o índice `ancestorId, descendantId` mas nunca `depth`, então nem está claro que a coluna existe).

### Achado 6.3 — Reparent/move do módulo é operação órfã — **ALTO**

AD-6 só especifica o protocolo de **criação**. A tabela de Deferred lista "Árvore visual com drag-and-drop" como Roadmap — mas não deixa claro se **qualquer** forma de mover um nó (ex.: um formulário não-drag-and-drop em FR-14, "administração") está dentro do MVP. Se estiver (a Rule de AD-6 até cita "nó criado fora de generate module/administração" como as duas fontes legítimas — "administração" sugerindo que a admin UI de FR-14 também escreve na árvore, não só cria), então:

**Cenário:** Epic A (admin UI, FR-14) implementa "mover módulo" fazendo `DELETE FROM ModuleClosure WHERE descendantId IN (subtree) AND ancestorId NOT IN (subtree)` seguido de re-inserção das linhas para os novos ancestrais — reescrevendo só as linhas que cruzam a fronteira da subárvore movida (otimização padrão de closure table). Epic B, ao adicionar uma feature de auditoria/histórico sobre `ModuleClosure` (ex.: FR-15 trilha de auditoria), assume que linhas de closure são **imutáveis e append-only** (i.e., nunca há `DELETE`, só inserção de novas gerações, como um log), porque nada na spine diz que `ModuleClosure` pode sofrer `DELETE`. O builder B constrói uma consulta de "histórico de posição do módulo" que faz `SELECT * FROM ModuleClosure WHERE descendantId=:id ORDER BY created_at` esperando ver todas as posições passadas — mas ela quebra silenciosamente porque A de fato deleta linhas antigas.

**Tightening sugerido:** ou (a) declarar explicitamente que mover/reparent de módulo está fora do MVP (reforçar em Deferred, não só "drag-and-drop" mas "qualquer reparent pós-criação"), ou (b) se estiver dentro do escopo via "administração" de FR-14, adicionar uma AD/cláusula fixando o protocolo de update do closure table (delete+reinsert vs append-only) e se `ModuleClosure` é ou não fonte de auditoria histórica.

### Achado 6.4 — "Nó sem módulo" via administração pode reintroduzir exatamente o que AD-6 previne — **MÉDIO**

A Rule diz "Não existe módulo de código sem nó, nem nó criado fora de `generate module`/administração (FR-14)" — isso implica que a UI de administração (FR-14) **também** pode criar linhas em `Module` diretamente, sem passar pelo gerador de código. Mas a spine em outro lugar trata Módulo e nó da árvore como *a mesma entidade* ("a mesma entidade que é unidade de código gerada por `generate module` e nó da árvore de identidade"). Isso é contraditório: se administração pode criar um nó sem gerar código correspondente, então existe sim "nó sem módulo" (de código), o exato cenário que AD-6 diz prevenir.

**Cenário:** Epic A (backend de `generate module`) assume que toda linha em `Module` tem um diretório `apps/api/src/modules/<nome>/` correspondente e usa isso como invariante para, por exemplo, resolver dinamicamente o router do módulo a partir do nome (`import(\`./modules/${module.slug}/router\`)`). Epic B (admin UI, FR-14) implementa "criar node organizacional" (ex.: uma pasta agrupadora sem lógica de negócio, só para organizar a árvore visualmente) permitido pela leitura literal da Rule — e agora existe uma linha em `Module` cujo `import()` dinâmico do Epic A falha em runtime.

**Tightening sugerido:** a Rule precisa dizer explicitamente se `Module` é uma entidade única (todo nó = módulo de código, "administração" só pode editar metadados/mover, nunca criar do zero) ou se existem dois "kinds" de nó (análogo ao `RESOURCE.kind` já usado em outro lugar do ERD) — e nesse caso o ERD precisa de uma coluna `Module.kind` (`CODE_MODULE` vs `ORG_NODE`) e AD-1/AD-6 precisam dizer que só `CODE_MODULE` tem os 4 arquivos-adapter.

---

## AD-1 — Hexagonal por Módulo

### Achado 1.1 — Import direto domain→domain entre módulos não é vedado — **ALTO**

**Cenário:** Módulo `orders` (Epic A) precisa validar, na criação de um pedido, que o cliente não excedeu um limite de crédito calculado pelo módulo `billing` (Epic B). Builder A lê a Rule ("domain sem import de `@prisma/client` nem `@trpc/*`") e conclui que chamar diretamente `import { checkCreditLimit } from '../billing/domain/credit'` dentro do domain de `orders` é compliant — nenhuma das duas importações proibidas ocorre. Builder B, construindo `billing` de forma independente, assume que a única superfície pública do seu módulo é o `router.ts` (adapter IN) e por isso reorganiza livremente as funções internas de `domain/credit.ts` num refactor (renomeia `checkCreditLimit` para `evaluateCreditExposure`, muda a assinatura) sem considerar quebra de compatibilidade — porque, do ponto de vista de B, `domain/` é implementação interna do módulo, não uma porta pública. O build de `orders` quebra sem que B tenha violado nenhuma Rule.

Pior: mesmo sem refactor, isso cria acoplamento direto módulo-a-módulo não mediado por porta nenhuma — o oposto do que "fatia vertical autocontida" promete no parágrafo do Design Paradigm.

**Tightening sugerido:** adicionar à AD-1 uma frase explícita: "Comunicação entre `domain/` de módulos diferentes é proibida; um módulo só pode consumir outro módulo via seu `router.ts` (chamada tRPC interna) ou via uma porta explícita exportada e versionada do módulo consumido (ex.: `<modulo>/ports/index.ts`)." Sem isso, `domain/` de cada módulo tem uma superfície de "público" ambígua.

### Achado 1.2 — Onde mora a regra "ownership" (autorização em nível de registro, não de recurso) — **MÉDIO**

AD-7 cobre autorização por Recurso nomeado (RBAC hierárquico), mas nada na spine diz onde vive uma checagem tipo "usuário só pode editar o **próprio** pedido" (ownership check, ortogonal ao RBAC). Builder A coloca essa checagem no `router.ts` (ao lado do `requireResource`, tratando-a como parte do "adapter de entrada"); Builder B a coloca em `domain/`, argumentando que é regra de negócio. Nenhum dos dois viola a letra de AD-1 (router pode ter lógica de adapter; domain pode ter regra de negócio) — mas o resultado é que, para um agente de IA gerando o próximo módulo, não há um padrão único a copiar, e pior: se a checagem fica em `router.ts` em alguns módulos, chamadas domain-a-domain (achado 1.1) **pulam** essa checagem porque só o router a aplica — abrindo um caminho silencioso de bypass de ownership exatamente no ponto de acoplamento que AD-1 já não veda.

**Tightening sugerido:** declarar explicitamente que checagens de autorização — tanto RBAC (AD-7) quanto ownership/regra de negócio — pertencem ao `domain/` (que recebe o usuário autenticado como parâmetro explícito), nunca ao router, precisamente para que qualquer caminho de chamada (via router ou via chamada interna futura) preserve a checagem.

---

## AD-2 — Topologia SPA, sem SSR

### Achado 2.1 — Padrão de data-fetching / apresentação de erro no frontend não é pinado — **BAIXO**

AD-2 fixa a topologia (SPA, React Router data router, tRPC/HTTP) mas não fixa **como** cada módulo busca dado no frontend. Builder A usa os `loader`s do React Router chamando o client tRPC diretamente (padrão "data router" idiomático); Builder B usa TanStack Query por cima do client tRPC dentro de componentes (padrão mais comum em apps tRPC "vanilla"). Ambos "consomem `apps/api` só via tRPC/HTTP" — a Rule não escolhe entre os dois. O resultado prático: cache/retry/staleness de dado é gerenciado de dois jeitos diferentes entre módulos vizinhos, e o tratamento do envelope de erro RFC 9457 (Consistency Conventions) tende a divergir junto (loaders costumam usar `ErrorBoundary` de rota; TanStack Query costuma usar `onError`/estado local) — dois módulos mostram erro de validação de formas visualmente diferentes.

**Tightening sugerido:** severidade baixa porque não corrompe dado nem quebra integração backend — é inconsistência de UX/DX, não de contrato. Vale uma linha na Consistency Conventions ("Data fetching: todo módulo usa `loader` de rota + client tRPC; nenhum uso de TanStack Query no MVP" ou o inverso) mas não precisa de AD nova.

---

## AD-3 — Monorepo com fronteiras de pacote

### Achado 3.1 — Import type-only de `apps/api` em `apps/web` — a letra da Rule proíbe o padrão idiomático do tRPC — **ALTO**

**Cenário:** O padrão canônico de tRPC monorepo é `apps/web` importar `import type { AppRouter } from '@aether/api'` para tipar o client (`createTRPCClient<AppRouter>(...)`), obtendo type-safety end-to-end sem duplicar schemas manualmente. Builder A implementa exatamente isso — tecnicamente um import de `apps/api` a partir de `apps/web`, mas só de tipo (apagado em runtime). Builder B lê a Rule ao pé da letra ("`apps/web` nunca importa de `apps/api`") e a interpreta sem exceção para type-only, então cria um `packages/shared/src/router-types.ts` que reexporta manualmente os tipos de retorno de cada procedure — um mecanismo paralelo e mais frágil (precisa ser mantido a mão a cada procedure nova) só para não violar a Rule.

Se módulos diferentes do mesmo monorepo forem gerados sob as duas leituras (comum se a Rule mudar de interpretação entre sessões do agente, ou se dois agentes diferentes gerarem módulos em momentos diferentes), `apps/web` acaba com dois estilos de tipagem de client tRPC coexistindo — um deles quebra o isolamento de pacote que a própria AD-3 existe para proteger (o build de `apps/web` passa a depender de `apps/api` compilar, quebrando build independente de frontend).

**Tightening sugerido:** a Rule precisa uma exceção explícita: "`apps/web` nunca importa **valor** de `apps/api`; import `type`-only do `AppRouter` (tRPC) é a única exceção permitida, exclusivamente em `apps/web/src/trpc/client.ts`."

### Achado 3.2 — Sem dono para schema Zod compartilhado entre módulos (tipos de domínio comuns) — **ALTO**

**Cenário:** Módulo `orders` (Epic A) e módulo `invoices` (Epic B) precisam ambos de um schema `Money` (`{ amount: number, currency: string }`) e de `Address`. A Structural Seed só define `packages/shared/src/schemas/<modulo>.ts` — um arquivo por módulo, sem convenção para tipos compartilhados entre módulos. Builder A define `Money` dentro de `packages/shared/src/schemas/orders.ts` e o Builder B, sem saber que já existe (ou por não querer criar uma dependência `invoices.ts` → `orders.ts` entre arquivos de schema, o que parece violar a simetria "um arquivo por módulo"), define seu próprio `Money` dentro de `invoices.ts` — com uma pequena diferença (Builder A valida `currency` como enum ISO-4217 de 3 letras; Builder B valida como string livre, ou usa `amount` como `number` vs Builder A como string decimal para evitar erro de ponto flutuante). Resultado: dois formatos de "dinheiro" no mesmo sistema, cada um Zod-válido no seu módulo, incompatíveis quando `invoices` referencia um valor vindo de `orders` (ex.: gerar fatura a partir de um pedido).

**Tightening sugerido:** acrescentar a AD-3 (ou nova convenção): "Tipos de domínio compartilhados por 2+ módulos (`Money`, `Address`, etc.) vivem em `packages/shared/src/schemas/common.ts`, nunca duplicados em arquivo de módulo específico; `generate module` deve checar `common.ts` antes de definir um schema já presente."

---

## AD-4 — Composição de Providers sem container de DI

### Achado 4.1 — Providers introduzidos por features fora da lista de Binds ficam fora da Rule — **MÉDIO**

AD-4 lista explicitamente as interfaces cobertas (`AuthProvider`, `SecretsProvider`, `TokenRevocationStore`, `KeyCustodyProvider`/`WorkflowEngineProvider` futuros). Um módulo de negócio gerado numa epic futura (ex.: `payments`) plausivelmente precisa de um `PaymentGatewayProvider` — não está nos Binds de AD-4. Builder A (payments), lendo a Rule como escopada aos Binds listados, importa a classe concreta `StripeGateway` direto no `repository.ts` do módulo, exatamente o padrão que AD-4 existe para proibir, mas sem tecnicamente violar a Rule (que só fala dos providers nomeados). Builder B, construindo outro módulo com necessidade similar (`WorkflowEngineProvider`, que na verdade já é citado como Deferred/roadmap em AD-4), segue o padrão `providers.ts`. Resultado: dois estilos de extensibilidade coexistindo, um dos quais reintroduz o acoplamento que toda a AD existe pra evitar.

**Tightening sugerido:** generalizar a Rule: "Qualquer interface de extensão introduzida por qualquer módulo (não só as listadas em Binds) segue o mesmo protocolo: implementação concreta só instanciada em `providers.ts`, resto do código só referencia o tipo."

### Achado 4.2 — Mecanismo de propagação da instância (contexto tRPC vs import de singleton) não é pinado — **MÉDIO**

A Rule só proíbe importar a **classe concreta** fora de `providers.ts` — importar a **instância já pronta** exportada por `providers.ts` em qualquer outro arquivo é compliant ao pé da letra. Builder A propaga providers via `ctx` do tRPC (um `createContext` que injeta `{ auth, secrets, ... }` a partir de `providers.ts`, permitindo mock em testes por override de contexto). Builder B, num módulo diferente, importa direto `import { authProvider } from '~/core/providers'` dentro do seu `repository.ts`, criando uma dependência de módulo global estática. Os dois passam a letra de AD-4. Mas testes de unidade do módulo de B não conseguem mockar `authProvider` sem hackear o module system (jest.mock/vi.mock no arquivo `providers.ts` inteiro, afetando todos os outros testes que rodam no mesmo processo) — quebrando isolamento de teste (FR-21/22) de um jeito que não acontece com o padrão de A.

**Tightening sugerido:** fixar o mecanismo de propagação: "Toda instância de Provider chega a `router.ts`/`domain/` exclusivamente via `ctx` do tRPC (injetado uma vez em `createContext` a partir de `providers.ts`); nenhum arquivo fora de `providers.ts`/`createContext` importa a instância diretamente."

---

## AD-5 — Isolamento de tenant via Prisma Client Extension

### Achado 5.1 — Raw SQL e operações sem contexto tRPC não são cobertas — **CRÍTICO**

**Cenário:** Módulo `reports` (Epic A), por necessidade de performance numa agregação pesada, usa `prisma.$queryRaw` diretamente dentro de `repository.ts` para um relatório cross-registro. A Rule diz "todo acesso a modelo escopado por Tenant passa por um Prisma Client estendido... construído por request a partir do `tenantId` do contexto tRPC" — tecnicamente `$queryRaw` **passa** pelo client estendido (é o mesmo objeto `prisma` retornado pela extensão), então Builder A julga estar em compliance; mas Prisma Client Extensions não interceptam SQL bruto da mesma forma que interceptam `findMany`/`create`/etc — dependendo de como a extensão de tenant foi implementada (query-level middleware via `$allOperations` não cobre `$queryRaw`), o filtro de `tenant_id` simplesmente não é aplicado, e o relatório vaza dado de outros tenants. Builder B, em outro módulo, nunca usa `$queryRaw` e nunca percebe o problema — o módulo dele está "correto" e mascara o buraco estrutural que a Rule deixou aberto para qualquer módulo que precise de raw SQL (comum em relatórios/agregações).

**Tightening sugerido:** AD-5 precisa proibir explicitamente `$queryRaw`/`$executeRaw`/`$queryRawUnsafe` em qualquer `repository.ts`, ou — se necessário para performance — exigir que toda raw query inclua `AND tenant_id = $1` obrigatoriamente revisado (lint rule/codegen check), com o `tenantId` vindo só do contexto tRPC, nunca de input do usuário.

### Achado 5.2 — Operações sem `tenantId` de contexto tRPC (jobs, seeds, admin cross-tenant) não têm protocolo — **ALTO**

A Rule ancora a extensão de tenant em "construído por request a partir do `tenantId` do contexto tRPC autenticado" — o que deixa qualquer código que roda fora de uma request tRPC (seed scripts, jobs agendados, uma eventual feature "super-admin vê todos os tenants") sem cobertura. Builder A (seed de dev) instancia `new PrismaClient()` puro (não estendido) porque não há `tenantId`/contexto disponível em um script de seed — o que a Rule até parece permitir ("nunca há um PrismaClient global usado diretamente por um `repository.ts`", implicitamente permitindo fora de `repository.ts`). Builder B, implementando uma feature de admin cross-tenant, também precisa de acesso não escopado e, lendo a mesma frase, também instancia Prisma puro **dentro** de um `repository.ts` de um módulo `core/admin`, violando a letra pela primeira vez que um caso legítimo de bypass aparece dentro de um adapter de repositório — sem que a spine diga que esse é o único lugar permitido para tal exceção.

**Tightening sugerido:** adicionar uma cláusula: "Os únicos usos legítimos de `PrismaClient` não-estendido são scripts fora do runtime de request (seed/migration) e, dentro do runtime, exclusivamente `core/admin/repository.ts` sob checagem explícita de super-admin — nenhum outro `repository.ts` de módulo de negócio pode instanciar Prisma não-estendido."

---

## AD-7 — Enforcement de permissão via middleware central (default-deny)

### Achado 7.1 — Nenhum esquema de nomenclatura/namespacing para `resource-id`, e `RESOURCE` é uma tabela global — colisão entre módulos — **CRÍTICO**

Este é o achado central para o probe que o prompt pediu especificamente ("conflicting resource-naming schemes for FR-27's `requireResource('...')` calls").

**Cenário:** `resources.ts` de cada módulo declara os Recursos (linhas em `RESOURCE`, join global com `ROLE`). A Rule de AD-7 só diz `.use(requireResource('<resource-id>'))` — nunca especifica o formato do `<resource-id>`. Builder A, gerando o módulo `orders`, segue um instinto natural e nomeia seus recursos de forma curta e genérica: `create`, `read`, `update`, `delete` (assumindo implicitamente escopo por módulo, como se resource-id fosse namespaced automaticamente por módulo — o que a Rule nunca confirma nem nega). Builder B, gerando `invoices` meses depois, faz exatamente a mesma escolha: `create`, `read`, `update`, `delete`. Como `RESOURCE` é uma tabela **global** (ERD: `ROLE }o--o{ RESOURCE`, sem FK para `MODULE`), os dois módulos colidem no mesmo valor de `resource-id`. Duas leituras possíveis do sistema, ambas ruins:
  - Se `resource-id` é chave única em `RESOURCE`, o `generate module` de B falha ao tentar inserir `create` de novo (erro de unicidade) — ou pior, silenciosamente reutiliza a linha `create` já existente de `orders`, e agora **um único Recurso "create" cobre dois módulos de negócio diferentes**: um Papel que concede "create" em `orders` automaticamente também concede "create" em `invoices`, sem que ninguém tenha decidido isso — falha de autorização (privilege leak) que passa despercebida porque cada módulo, isoladamente, "funciona".
  - Se não é única (permite duplicata), agora existem duas linhas `RESOURCE` com o mesmo nome de exibição e a UI de administração de papéis (FR-14/FR-15) não consegue distinguir qual "create" pertence a qual módulo ao montar a tela de concessão de Papel.

**Tightening sugerido:** fixar no AD-7 (ou AD-3, junto da convenção de naming): "`resource-id` é sempre `<module-slug>.<ação>` (ex.: `orders.create`), gerado automaticamente por `generate module` a partir do nome do módulo — nunca uma string livre escolhida por sessão. `RESOURCE.name` tem constraint de unicidade global e `generate module` deve falhar explicitamente (não silenciosamente reaproveitar) se colidir." E o ERD deveria explicitar essa unicidade.

---

## AD-8 — Orçamento de latência do enforcement, sem cache

### Achado 8.1 — O p95 <10ms está pinado só na subconsulta de ancestralidade, não na decisão de autorização inteira — **MÉDIO**

**Cenário:** Builder A implementa `requireResource` como um único JOIN SQL (`ModuleClosure` ⋈ `RoleAssignment` ⋈ `Role_Resource` ⋈ `Resource`) que resolve tudo — ancestralidade e cobertura de recurso — numa única ida ao banco, cumprindo folgadamente o budget de 10ms mesmo de ponta a ponta. Builder B lê a Rule ("a consulta de ancestralidade usada por AD-7 tem meta p95 <10ms") e a implementa literalmente: uma primeira query rápida e indexada só em `ModuleClosure` (cumpre os <10ms à risca, usando o índice composto obrigatório), seguida de uma segunda consulta em `RoleAssignment`/`Resource` sem índice equivalente exigido por AD-8 (que só manda indexar `ModuleClosure`). Isoladamente a "consulta de ancestralidade" de B também é <10ms — B está 100% compliant com a letra — mas o middleware inteiro (que é o que efetivamente importa para UX/NFR) pode ficar em 50-80ms por causa da segunda query lenta, sem que nenhuma Rule tenha sido violada.

**Tightening sugerido:** reescrever a métrica para cobrir a decisão inteira: "o middleware `requireResource` completo (ancestralidade + resolução de Papel + cobertura de Recurso) tem meta p95 <10ms, medido ponta a ponta; índices obrigatórios cobrem toda tabela tocada pelo caminho crítico (`ModuleClosure(ancestorId, descendantId)`, `RoleAssignment(assigneeId, targetModuleId)`, `Role_Resource(roleId, resourceId)`)."

---

## AD-9 — Sem alvo de deploy de produção no MVP

### Achado 9.1 — Convenção de Config lista 3 ambientes; AD-9 só cobre 1 — **BAIXO**

A linha "Config" da tabela de Consistency Conventions fala em "arquivo por ambiente (dev/staging/produção)" como se os três fossem esperados a existir, enquanto AD-9 fecha o envelope operacional do MVP só em dev local. Builder A (scaffolding de `generate`) cria só `.env.development` seguindo AD-9 à risca; Builder B, seguindo a tabela de convenções à risca, faz o scaffold gerar `.env.development`, `.env.staging` e `.env.production` como templates vazios "porque a convenção lista os três". Não corrompe nada, mas gera scaffolding inconsistente entre módulos/gerações — arquivos de config órfãos sem consumidor real no MVP.

**Tightening sugerido:** ajustar a linha de Config para "no MVP, só `.env.development`/`.env.dev.local` existem de fato; `staging`/`produção` são nomes reservados para quando AD-9 for revisitado (Fast-follow), não scaffoldados agora."

---

## AD-10 — Rate limiting Postgres-backed

### Achado 10.1 — "Mesma tabela" do `TokenRevocationStore` sem schema compartilhado definido — dois donos de uma tabela — **ALTO**

**Cenário:** FR-9 (`TokenRevocationStore`) e FR-28 (rate limiting) são requisitos distintos, plausivelmente implementados em epics/stories diferentes (auth core vs. hardening de segurança), possivelmente em sessões de agente diferentes. Builder A implementa primeiro `TokenRevocationStore` (FR-9) e desenha uma tabela `RevokedToken(jti PK, userId, revokedAt, expiresAt)` — schema natural para revogação de token, sem nenhuma coluna de janela de tempo/contagem de tentativas. Builder B, meses depois, implementa o rate limiting (FR-28/AD-10) e lê a Rule ao pé da letra: "contra a mesma tabela Postgres usada pelo `TokenRevocationStore`". Sem um schema definido para isso na spine, Builder B tem duas saídas ruins e ambas "compliant" na superfície:
  (a) reaproveita literalmente `RevokedToken`, abusando de colunas (`jti` passa a às vezes conter `"ratelimit:<email>:<window>"`, `revokedAt` vira "última tentativa"), produzindo uma tabela semanticamente confusa e queries de revogação que agora precisam filtrar linhas de rate-limit para não tratá-las como tokens revogados (bug de segurança: um "rate-limit record" mal filtrado podendo ser lido como token revogado válido, ou vice-versa);
  (b) decide que "mesma tabela" era inviável e cria uma tabela nova (`RateLimitHit`), tecnicamente divergindo da Rule mas sem alternativa clara, e ninguém documentou a decisão — o próximo builder que ler a Rule ainda vai tentar (a).

Além disso, `core/auth` é um módulo `core/` único (linha da Structural Seed), então as duas features escrevem no **mesmo arquivo/pasta** `apps/api/src/core/auth/` sem que a spine diga quem é dono da migration desse schema compartilhado — risco real de duas stories, em paralelo, gerarem migrations Prisma conflitantes sobre a mesma tabela.

**Tightening sugerido:** AD-10 precisa fixar o schema mínimo da tabela compartilhada (ex.: `SecurityLedger(id, kind: 'REVOKED_TOKEN'|'RATE_LIMIT_HIT', identifier, createdAt, expiresAt, metadata jsonb)`) ou, mais simples, admitir que são tabelas fisicamente diferentes mas no mesmo módulo/arquivo Prisma, e trocar "mesma tabela" por "mesmo mecanismo (Postgres, não in-process), no mesmo módulo `core/auth`, schemas definidos juntos na mesma migration inicial de auth para evitar duas fontes de verdade".

---

## Consistency Conventions

### Achado C.1 — Formato de `invalid-params` para erros Zod aninhados/array não é pinado — **MÉDIO**

A convenção de Erros fixa RFC 9457 + `invalid-params` para validação, mas não diz como o `name` de cada entrada de `invalid-params` deve representar um campo aninhado ou de array. Builder A (usando `error.flatten().fieldErrors` do Zod) produz `invalid-params: [{name: "items.2.price", reason: "..."}]` (dot-path, índice numérico inline). Builder B (usando `error.issues` diretamente e montando o path com `path.join('/')` por preferir JSON Pointer, mais alinhado ao espírito RFC 9457 que já é usado em `type`/`instance`) produz `invalid-params: [{name: "/items/2/price", reason: "..."}]`. Ambos batem a letra da convenção ("RFC 9457 + `invalid-params`"). Um formulário genérico no frontend (`packages/shared` reaproveitado "sem duplicar" para form, conforme convenção de Validação) que tenta mapear `invalid-params[].name` de volta para o campo do formulário funciona para módulos gerados por A e quebra silenciosamente (erro não aparece no campo certo) para módulos gerados por B, ou vice-versa, dependendo de qual convenção o componente de formulário genérico assumiu primeiro.

**Tightening sugerido:** fixar explicitamente o formato: "`invalid-params[].name` é sempre JSON Pointer relativo (RFC 6901) ao input da procedure, ex.: `/items/2/price`; erros aninhados/array nunca são flattened em dot-notation."

### Achado C.2 — Dono do ciclo de refresh do token no client não é definido — **MÉDIO**

A convenção de Autenticação fixa *onde* o access token vive (memória) e *onde* o refresh vive (cookie httpOnly) e que toda requisição verifica via `AuthProvider` — mas isso é tudo do lado do backend. Do lado do frontend, nada diz **quem** é o dono único do estado do access token em memória nem do fluxo de refresh (quando expira, quem dispara o refresh, como outras chamadas em voo esperam o novo token). Builder A implementa um `AuthContext` React (Context API) na raiz de `apps/web`, com um único `refreshTokenIfNeeded()` centralizado que todas as chamadas tRPC usam via link customizado. Builder B, construindo uma feature isolada (ex.: um módulo com upload ou uma chamada fora do client tRPC padrão, tipo download de arquivo via `fetch` direto), não tem acesso fácil ao Context React fora da árvore de componentes e implementa seu próprio cache local do access token (lido de um singleton/`window.__accessToken`) — path secundário e não sincronizado com o refresh do Context A. Numa corrida de expiração de token, o path de B usa token stale e recebe 401 enquanto o path de A já renovou.

**Tightening sugerido:** adicionar linha na Consistency Conventions: "Estado do access token e lógica de refresh vivem exclusivamente no client tRPC (link/middleware único em `apps/web/src/trpc/client.ts`); qualquer chamada HTTP fora do client tRPC padrão (upload, download binário) é proibida ou deve obrigatoriamente importar o token do mesmo módulo singleton — nunca duplicar o estado."

### Achado C.3 — Naming de coluna de banco (camelCase Prisma + `@map` vs snake_case direto) não é pinado — **BAIXO**

A convenção de naming cobre arquivos/tipos/funções mas não a convenção de campo em `schema.prisma` vs coluna física no Postgres. Builder A usa `camelCase` nos models Prisma com `@map("snake_case")` em cada campo (padrão comum para manter consistência com TS); Builder B, gerando outro módulo, usa `camelCase` sem `@map`, deixando o Prisma criar colunas físicas literalmente em camelCase (Postgres aceita, mas exige aspas em qualquer SQL manual/relatório). Qualquer relatório SQL cross-módulo (inclusive o Achado 5.1 sobre `$queryRaw`) que assuma snake_case quebra nas tabelas do Builder B.

**Tightening sugerido:** linha nova na tabela: "Colunas físicas: sempre `snake_case` via `@map`/`@@map` no `schema.prisma`; nomes de campo TS/Prisma continuam `camelCase`."

---

## Resumo por severidade

| # | AD / Convenção | Achado | Severidade |
| --- | --- | --- | --- |
| 6.1 | AD-6 | Protocolo de escrita do Closure Table (quem/quando) não pinado | CRÍTICO |
| 5.1 | AD-5 | Raw SQL não coberto pela extensão de tenant | CRÍTICO |
| 7.1 | AD-7 | `resource-id` sem namespace — colisão global em `RESOURCE` | CRÍTICO |
| 6.2 | AD-6 | Self-row / `depth` do Closure Table não especificados | ALTO |
| 6.3 | AD-6 | Reparent/move do módulo é operação órfã | ALTO |
| 1.1 | AD-1 | Import domain→domain entre módulos não vedado | ALTO |
| 3.1 | AD-3 | Import type-only `apps/api`→`apps/web` contradiz a letra da Rule | ALTO |
| 3.2 | AD-3 | Sem dono para schema Zod compartilhado entre módulos | ALTO |
| 5.2 | AD-5 | Operações sem `tenantId` de contexto (seed/admin cross-tenant) sem protocolo | ALTO |
| 10.1 | AD-10 | "Mesma tabela" de rate-limit/revocation sem schema definido | ALTO |
| 6.4 | AD-6 | Nó sem módulo via "administração" reabre o buraco que AD-6 fecha | MÉDIO |
| 1.2 | AD-1 | Local da checagem de ownership (router vs domain) não pinado | MÉDIO |
| 4.1 | AD-4 | Providers fora dos Binds listados escapam da Rule | MÉDIO |
| 4.2 | AD-4 | Mecanismo de propagação (ctx vs singleton import) não pinado | MÉDIO |
| 8.1 | AD-8 | Budget de latência cobre só a subconsulta, não a decisão inteira | MÉDIO |
| C.1 | Convenções/Erros | Formato de `invalid-params[].name` para campos aninhados não pinado | MÉDIO |
| C.2 | Convenções/Auth | Dono do ciclo de refresh de token no client não definido | MÉDIO |
| 2.1 | AD-2 | Padrão de data-fetching/erro no frontend não pinado | BAIXO |
| 9.1 | AD-9 | Convenção de Config lista 3 ambientes, AD-9 só cobre 1 | BAIXO |
| C.3 | Convenções/Naming | camelCase vs snake_case em colunas físicas não pinado | BAIXO |
