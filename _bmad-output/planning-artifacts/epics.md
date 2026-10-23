---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-01-validate-prerequisites-2026-10-20, step-02-design-epics-2026-10-20]
inputDocuments:
  - '_bmad-output/planning-artifacts/prds/prd-Aether-2026-08-11/prd.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-Aether-2026-08-14/ARCHITECTURE-SPINE.md'
  - '_bmad-output/specs/spec-Aether/SPEC.md'
  - '_bmad-output/specs/spec-Aether/glossary.md'
  - 'docs/architecture-uml-Aether.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-Aether-2026-10-07/EXPERIENCE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-Aether-2026-10-07/DESIGN-minimal-saas.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-Aether-2026-10-07/DESIGN-acolhedor.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-Aether-2026-10-07/DESIGN-tecnico-premium.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-Aether-2026-10-07/DESIGN-autoral.md'
---

# Aether - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Aether, decomposing the requirements from the PRD, the finalized Architecture Spine, and the distilled SPEC (kernel + companions) into implementable stories. No UX design contract exists yet — component/styling convention for admin screens stays an explicit open item (Deferred in the Architecture Spine, Open Question in the SPEC).

## Requirements Inventory

### Functional Requirements

```
FR1: O desenvolvedor pode criar um novo projeto Aether rodando `aether-admin new` — estrutura completa (frontend+backend), página inicial "Hello World" funcional, roteamento decisivo (React Router no front, router tRPC por Módulo no back).
FR2: O desenvolvedor pode configurar a conexão de banco de dados via assistente guiado por prompts (host/porta/credenciais/nome, nível de isolamento de tenant se multitenant), sem editar arquivo de config à mão; config final persistida em `.env`.
FR3: O desenvolvedor pode gerar código de um tipo específico com `aether-admin generate <tipo> <nome...>` (múltiplos nomes numa chamada). `generate module <nome>` produz schema Prisma, schema Zod, router tRPC protegido, e declaração de Recursos. `generate module --from <arquivo>` gera vários módulos de uma vez.
FR4: O desenvolvedor pode rodar `aether-admin dev` como único comando pra subir frontend+backend localmente, com Docker Compose de dependências automático, HMR no front e restart automático no back.
FR5: O desenvolvedor pode aplicar migrations pendentes com `aether-admin migrate`, geradas a partir de mudanças no schema Prisma, aplicação idempotente.
FR6: O sistema lê configuração de variáveis de ambiente/arquivos por ambiente — nunca hardcoded no código-fonte.
FR7: Um usuário pode se autenticar e receber access token (JWT, vida curta) + refresh token (vida longa) via `AuthProvider`; refresh token em cookie httpOnly+SameSite, access token em memória no cliente.
FR8: O sistema armazena senha com Argon2id + Pepper (baseline de custo OWASP); pepper lido via `SecretsProvider`.
FR9: Um usuário (ou admin em nome dele) pode revogar um refresh token antes da expiração via `TokenRevocationStore` (MVP: Postgres/Prisma-backed).
FR10: O mecanismo de autenticação é acessado via interface `AuthProvider`, com implementação local (Argon2id+Pepper) no MVP.
FR11: O framework mantém Usuário, Grupo, Papel e Módulo/Submódulo como objetos de 1a classe, com contenção/associação/atribuição, escopados por Tenant; ancestrais/descendentes consultáveis numa única operação (Closure Table), sem depender de extensão específica de banco.
FR12: Um Papel atribuído a um Usuário/Grupo sobre um Módulo propaga automaticamente pros descendentes (herança aditiva simples, sem bloqueio/override no MVP).
FR13: Um Papel agrega um ou mais Recursos — Permissão Nomeada (implementado no MVP) ou Objeto de Negócio Real (`ResourceType`, interface prevista, sem implementação no MVP).
FR14: Um administrador pode visualizar, criar, editar, remover e organizar Usuários/Grupos/Papéis (sem drag-and-drop no MVP), incluindo atribuir papel/grupo via seleção múltipla e revogar sessões ativas — tudo refletindo imediatamente na árvore.
FR15: Um administrador pode importar uma lista de Usuários em lote (ex.: CSV), com sucesso/erro reportado por linha; cada usuário importado recebe email de configuração de senha.
FR16: O frontend consome a API só via procedures tRPC, tipos inferidos automaticamente do backend — sem REST/GraphQL alternativo.
FR17: Toda entrada de procedure tRPC é validada por schema Zod, reaproveitado no frontend sem duplicar.
FR18: O sistema envia email transacional via interface unificada de provedor (um provedor implementado no MVP).
FR19: Um usuário pode configurar/redefinir senha via link com token de uso único e expiração; completar a redefinição invalida todas as sessões ativas.
FR20: Em ambiente de dev, emails vão pra um capturador local (Mailpit, via Docker Compose) em vez de provedor real.
FR21: Toda geração de código via `generate` inclui scaffolding de teste automático (Vitest).
FR22: O projeto gerado já vem com ESLint + Prettier configurados (regras recomendadas, sobrescrevíveis).
FR23: O projeto gerado inclui Dockerfile de dev (sem hardening) + Docker Compose mínimo (banco escolhido + capturador de email).
FR24: O sistema registra logs estruturados (JSON), níveis configuráveis por ambiente, com identificador de correlação `traceparent` (W3C Trace Context) por requisição.
FR25: O sistema centraliza tratamento de erro numa camada única — erro não tratado não derruba o processo, retorna RFC 9457 Problem Details com `invalid-params` pra validação; sucesso sem envelope.
FR26: O acesso a segredos da aplicação é feito via interface `SecretsProvider`, implementação local (variável de ambiente) no MVP.
FR27: Toda procedure tRPC gerada exige, antes de executar, que o usuário possua o Papel/Recurso correspondente — default-deny; exceção só via marcação explícita de rota pública.
FR28: Os endpoints de login e de solicitação de redefinição de senha aplicam rate limiting por identificador (email/IP), mesmo banco de dados do TokenRevocationStore (sem Redis).
```

### NonFunctional Requirements

```
NFR1 (Stateless): Nenhuma implementação MVP depende de sessão/cache/estado em memória exclusivo de uma instância — toda persistência de estado usa o banco de dados, permitindo escalonamento horizontal sem reforma.
NFR2 (Zero Trust interno, NIST SP 800-207): Toda chamada — interna ou externa — verifica a assinatura do token por si mesma; nenhum caminho de código confia implicitamente por "estar dentro do processo", nem mesmo temporariamente.
NFR3 (Isolamento de tenant): Nível de isolamento é sempre escolha do desenvolvedor (nunca imposto pelo framework); camada de acesso a dados sempre via resolvedor consciente de tenant, nunca conexão global fixa.
NFR4 (Sem alegação de segurança sem reforço técnico real): Nenhuma interface de extensão (AuthProvider/SecretsProvider/TokenRevocationStore/futuras) pode se dizer "segura" só por checagem de workflow — precisa de reforço criptográfico/estrutural real.
NFR5 (Sem infraestrutura desnecessária): Nenhuma implementação MVP (TokenRevocationStore, rate limiting, Docker Compose de dev) requer Redis.
NFR6 (Performance do enforcement): Consulta de ancestralidade + resolução de Papel/Recurso (FR-27) com meta p95 < 10ms em escala de dev/pequena equipe, sem camada de cache.
NFR7 (Privacidade): Senha nunca em texto plano/hash reversível; nenhuma credencial hardcoded em código versionado; dado sensível de tenant isolado mesmo em base compartilhada; refresh token nunca exposto a JavaScript no cliente.
NFR8 (Usabilidade — setup): Do zero ao "Hello World" funcional em no máximo 3 comandos principais (new/setup de banco/dev); replicável por um desenvolvedor desconhecido do projeto, só com documentação.
NFR9 (Usabilidade — administração): Organizar N usuários em M grupos/papéis exige O(M) ações via seleção múltipla, nunca uma ação por pessoa.
NFR10 (Versionamento): Pré-1.0, interfaces de extensão podem mudar entre versões menores (documentado em changelog); a partir da v1.0, mudança de contrato exige major version bump (semver).
NFR11 (Padrão de API/erro): Sucesso sem envelope; erro em RFC 9457 Problem Details (+ `invalid-params` em formato JSON Pointer RFC 6901); correlação via `traceparent` — convenção compartilhada com o projeto irmão Tecton.
NFR12 (Internacionalização): Toda string de UI do Admin UI é autorada preparada para múltiplos idiomas desde o início — sempre chave+interpolação, nunca concatenação de string ou template literal com texto fixo intercalado a variável. Mecanismo concreto (biblioteca, formato de chave, onde strings vivem) é decisão de arquitetura separada, ainda em aberto (Deferred) — esta NFR fixa a disciplina de autoria, não a ferramenta. Decidida na sessão de UX `ux-Aether-2026-10-07` (2026-10-19).
```

### Additional Requirements

```
- Sem starter template externo: o próprio `aether-admin new` É o scaffolding — a Architecture Spine define a forma do projeto gerado diretamente (Structural Seed), não um template de terceiros. Epic 1/Story 1 escreve esse scaffolding do zero, seguindo a Structural Seed da spine.
- Monorepo pnpm workspaces: `apps/web` (SPA Vite+React Router, sem SSR), `apps/api` (Fastify+tRPC), `packages/shared` (Zod schemas + tipos), `packages/db` (Prisma schema + extensão de tenant). Fronteiras de import fixadas em AD-3 (única exceção: `import type AppRouter` em `apps/web/src/trpc/client.ts`).
- Paradigma Hexagonal por Módulo (AD-1): todo Módulo de negócio gerado tem `domain/` (sem import de Prisma/tRPC), `router.ts`, `repository.ts`, `schema.ts`, `resources.ts`; domain-a-domain entre módulos diferentes proibido.
- Isolamento de tenant via Prisma Client Extension (AD-5), construída por request a partir do `tenantId` do contexto tRPC; raw SQL proibido em repository de módulo de negócio; fluxos pré-autenticação recebem `tenantId`/`tenantSlug` explícito.
- Módulo de código = nó da árvore de identidade (AD-6): `generate module` escreve código + aplica migration de Module/ModuleClosure na mesma operação; ModuleClosure é append-only no MVP (sem reparent); self-row + depth obrigatórios.
- Enforcement via middleware tRPC central (AD-7/AD-8): `resource-id` = `<module-slug>.<ação>`, único globalmente, geração falha explícito em colisão; meta de latência cobre o middleware inteiro, não só a subconsulta.
- Composição de Providers sem DI container (AD-4): único arquivo `providers.ts` instancia AuthProvider/SecretsProvider/TokenRevocationStore (e qualquer Provider futuro) a partir de config/env; propagação só via `ctx` tRPC.
- Rate limiting Postgres-backed em tabela própria `RateLimitHit`, separada da tabela de revogação de refresh token (AD-10).
- Stack pinada (verificada contra a web em 2026-08): Node 24 LTS, TypeScript 5.9, pnpm 11.x, Fastify 5.x, tRPC 11.13.x, Prisma 7.x, Zod 4.4.x, React 19.x, React Router ^7, Vite 8.x, ESLint 10.x, Prettier 3.x, argon2, jose, Pino.
- Convenções: IDs UUID v7; colunas físicas Postgres em snake_case via `@map`; testes co-localizados (`*.test.ts` junto do arquivo fonte); `.env.development` único ambiente scaffolded no MVP; data-fetching no front via `loader` de rota + client tRPC, sem TanStack Query.
- Sem alvo de deploy de produção no MVP (AD-9) — só ambiente de dev local via Docker Compose; Dockerfile de produção/CI/CD ficam fora do escopo de qualquer epic aqui.
```

### UX Design Requirements

Sessão `bmad-ux` `ux-Aether-2026-10-07` finalizada (2026-10-19) — spine pair `EXPERIENCE.md` (comportamento/IA, um arquivo pros 4 presets) + 4 `DESIGN.md` (minimal-saas, acolhedor, tecnico-premium, autoral — Camada 0 do token de componente, AD-13 da Architecture Spine). Resolve o item antes em aberto (convenção de componentes/estilo pra FR-14).

```
UX-DR1: Admin UI usa shadcn/ui + Tailwind CSS v4 (Radix UI, componentes vendorizados — AD-13) como base; 4 presets visuais completos (claro+escuro nativo cada) escolhidos em `aether-admin new` (tempo de geração), nunca seletor em runtime.
UX-DR2: Navegação primária é uma árvore lateral persistente (mestre-detalhe, padrão ConsoleOne/NDS) com ramos de categoria — Usuários/Grupos/Papéis — cada um expandindo em folhas (uma entidade por folha); busca no topo filtra e auto-expande até o nó encontrado.
UX-DR3: Formulários de criar/editar User/Group/Role são desenhados por entidade (React Hook Form + `@hookform/resolvers/zod`, AD-13), reaproveitando os schemas Zod já existentes em `packages/shared/src/schemas/admin.ts` — nunca um formulário genérico gerado de schema em runtime.
UX-DR4: Listas longas dentro de um ramo (muitos Usuários) e o relatório de import CSV usam TanStack Table v9 como coadjuvante da árvore — estado de sort/filtro/página sempre na URL (search params), nunca cache próprio competindo com o padrão `loader`+tRPC já fixado.
UX-DR5: Associação Usuário↔Grupo tem dois caminhos de UI: a partir do Usuário (selecionar Grupo existente, Adicionar) e a partir do Grupo (seletor de membros navegável por Grupo de origem, multi-seleção, Adicionar em lote).
UX-DR6: Atribuição de Papel com escopo por Módulo via modal dedicado — seletor de Papel + mini-árvore de Módulos (TanStack Virtual) para escolher o módulo-alvo; texto fixo explicando herança aditiva ("vale para este módulo e todos abaixo dele").
UX-DR7: Importação de Usuários em lote (CSV) com prévia antes de confirmar (contagem válidos/duplicados/inválidos) e relatório linha-a-linha pós-confirmação — nunca só um resumo agregado de sucesso.
UX-DR8: Revogar sessões de um Usuário é ação pontual com diálogo de confirmação nomeando a consequência real ("Ele(a) precisará entrar novamente"), nunca "Tem certeza?" genérico.
UX-DR9: Menu de contexto (nó da árvore) sempre alcançável por teclado (clique direito OU tecla de menu de contexto/`Shift+F10`) — e qualquer ação crítica como "Editar" nunca fica exclusiva do menu de contexto, sempre também um botão visível no painel de detalhe.
UX-DR10: Accessibility Floor — WCAG 2.2 AA; árvore com ARIA Tree View completo (`aria-expanded`/`aria-level`/`aria-selected`/`aria-posinset`/`aria-setsize`); tabela com `aria-sort`/`aria-selected`/`<th scope="col">` (wiring manual — TanStack Table v9 não emite isso nativamente); formulário com `aria-invalid`/`aria-describedby`/`aria-live` em erro (wiring manual — React Hook Form não injeta isso automaticamente); convenção de seta `→`/`←` da árvore é LTR-only, RTL fora de escopo.
UX-DR11: Voice and tone — microcopy profissional e direta ("internal-tool com polimento consumer", não ferramenta pura nem produto de consumo celebrativo); nunca emoji, nunca "Tem certeza mesmo??", sempre números concretos em prévias (ex. "12 válidos, 2 duplicados, 1 inválido").
UX-DR12: State patterns completos por superfície — carregando (skeleton no formato do que está vindo, nunca spinner genérico), vazio (com ação alternativa quando aplicável, ex. "Importar Usuários"), busca sem resultado, falha de carregamento (RFC 9457 + "Tentar novamente"), erro de validação inline com foco no campo, falha ao salvar com dados preservados.
UX-DR13: **Fora do escopo de construção desta epic** — a camada "Empresas" (admin de sistema cross-tenant: listar/habilitar-desabilitar Tenant, bootstrap de admin via o mesmo fluxo único de convite por e-mail de qualquer usuário novo) é documentada no `EXPERIENCE.md` como experiência-alvo da forma de rota "SaaS 2 níveis", mas decisão do Boss (2026-10-20): deve ser **viabilizável por uma epic futura, nunca implementada nativamente agora** — é framework, não produto; um dev que não precisar dessa capacidade não deve carregá-la. Corrigido por Second-Order Thinking: como "simples"/"multi-tenant" produzem a MESMA UI, o PRÓPRIO prompt de 3 opções em `aether-admin new` (AD-13) teria efeito zero nesta epic — também fica deferido, não só a camada Empresas em si. Esta epic constrói uma UI só, incondicional, sem perguntar forma de rota.
```

**Nota de escopo**: como UX-DR13 remove a camada Empresas do build, as formas "simples" e "multi-tenant" (AD-13) produzem a MESMA superfície (árvore com ramos Usuários/Grupos/Papéis) — esta epic constrói uma única IA de verdade, não três.

### FR Coverage Map

```
FR1:  Epic 1 - aether-admin new (scaffolding completo)
FR2:  Epic 1 - assistente de config de banco (nível de isolamento de tenant é escolha capturada aqui; enforcement real vem na Epic 3)
FR3:  Epic 3 - generate module <nome...>
FR4:  Epic 1 - aether-admin dev (front+back+HMR+restart)
FR5:  Epic 3 - aether-admin migrate
FR6:  Epic 1 - config externalizada via env/.env
FR7:  Epic 2 - login: access+refresh token via AuthProvider
FR8:  Epic 2 - hashing Argon2id+Pepper
FR9:  Epic 2 - revogação de refresh token (TokenRevocationStore) — reaproveitada pela Epic 5 (revogação via UI) e Epic 4 (invalidação em massa no reset)
FR10: Epic 2 - AuthProvider como interface (impl. local no MVP)
FR11: Epic 2 (parcial: tabela User básica) + Epic 3 (parcial: Grupo/Papel/Módulo/ModuleClosure + relações)
FR12: Epic 3 - herança aditiva de Papel sobre Módulo
FR13: Epic 3 - Papel agrega Recursos (Permissão Nomeada MVP)
FR14: Epic 5 (backend tRPC) + Epic 7 (UI real — árvore+detalhe, CRUD+organização) - revogar sessão aqui invoca o mecanismo da Epic 2
FR15: Epic 5 (backend tRPC) + Epic 7 (UI real — import CSV com prévia/relatório) - email de config reaproveita mecanismo de token único-uso da Epic 4
FR16: Epic 1 - frontend só via tRPC, tipos inferidos
FR17: Epic 1 - validação Zod compartilhada
FR18: Epic 4 - interface unificada de email transacional
FR19: Epic 4 - reset de senha via token de uso único
FR20: Epic 4 - captura local via Mailpit em dev
FR21: Epic 3 - scaffolding de teste automático (Vitest) para módulo gerado
FR22: Epic 1 - ESLint+Prettier configurados
FR23: Epic 1 - Dockerfile dev + Compose mínimo
FR24: Epic 1 - logging estruturado (JSON+traceparent)
FR25: Epic 1 - tratamento de erro global (RFC 9457)
FR26: Epic 2 - SecretsProvider (interface, impl. local no MVP)
FR27: Epic 3 - enforcement via middleware tRPC central
FR28: Epic 2 (parcial: infra do rate limiter + endpoint de login) + Epic 4 (parcial: aplicação no endpoint de solicitação de reset, mesma tabela RateLimitHit)
```

Todas as 28 FRs mapeadas, nenhuma órfã. NFRs (stateless, Zero Trust interno, isolamento de tenant, sem Redis, p95<10ms, versionamento semver, etc.) são transversais — constraint permanente de todas as epics que tocam a área correspondente, não entrega isolada de nenhuma.

## Epic List

### Epic 1: Do Zero ao "Hello World" — Scaffolding e Ambiente de Dev Local
O desenvolvedor cria um projeto Aether completo (`aether-admin new` → config de banco guiada → `aether-admin dev`) e sobe front+back+banco localmente em até 3 comandos — já com comunicação tRPC+Zod ponta a ponta, lint, logging estruturado, tratamento de erro global e Docker Compose de dev configurados de fábrica.
**FRs cobertas:** FR1, FR2, FR4, FR6, FR16, FR17, FR22, FR23, FR24, FR25
**Depende de:** nenhuma (fundação)

### Epic 2: Autenticação e Tokens de Acesso
Um usuário se autentica com segurança via `AuthProvider` trocável (JWT + Refresh, Argon2id+Pepper), com revogação de token antes da expiração e rate limiting no login — tudo Postgres-backed, sem Redis.
**FRs cobertas:** FR7, FR8, FR9, FR10, FR11 (parcial — tabela `User` básica), FR26, FR28 (parcial — infra + login)
**Depende de:** Epic 1
**Nota de implementação (achado durante `create-story` da Story 2.1, 2026-08-31):** FR11 original mapeava inteiro pra Epic 3, mas login (FR7/FR8) precisa de um `User` persistido pra autenticar contra algo — mesma classe de contradição já resolvida no AD-6 da Story 1.1, dessa vez entre epics. Resolução: a tabela `User` básica (id, tenantId, email, passwordHash, timestamps — escopada por Tenant desde já, AD-5) nasce aqui, na Epic 2. Grupo/Papel/Módulo/ModuleClosure e as relações que ligam `User` a eles (associação/atribuição) continuam na Epic 3 — extensão incremental do schema via nova migration, não retrabalho da tabela já criada.

### Epic 3: Módulos de Domínio — Geração, Árvore de Identidade e Enforcement
O desenvolvedor gera um Módulo de domínio completo (schema Prisma, schema Zod, router tRPC protegido, Recursos, teste Vitest) com um comando, e esse Módulo já nasce registrado como nó na árvore de identidade com enforcement ativo por padrão-negado. Um Papel atribuído sobre um Módulo propaga automaticamente aos descendentes.
**FRs cobertas:** FR3, FR5, FR11 (parcial — Grupo/Papel/Módulo/ModuleClosure + relações com `User`, ver nota na Epic 2), FR12, FR13, FR21, FR27
**Depende de:** Epic 1, Epic 2 (o middleware de enforcement precisa de um `ctx.user` autenticado pra checar Papel/Recurso, e a tabela `User` já existe pra Epic 3 estender)
**Nota de implementação:** Geração de código e árvore de identidade são a mesma operação atômica (AD-6) — não são capacidades separáveis, por isso vivem numa única epic. A escrita da Module/ModuleClosure é o único caminho de código reexecutado por todo `generate module` futuro (nesta epic e em qualquer módulo gerado depois, inclusive pós-MVP). Um defeito aqui não fica contido — corrompe a árvore de todo módulo gerado a partir dele. Exigir cobertura de teste com múltiplos níveis de ancestralidade e verificação de depth antes de considerar a epic concluída.
**Split de stories (achado durante `create-story` da Story 3.1, 2026-09-03):** `generate module` (AD-6) gera código que já chama `.use(requireResource(...))` e insere linhas em tabelas que precisam existir antes — sequência obrigatória, não escolha arbitrária. **Story 3.1** constrói só a fundação, sem nenhum codegen: schema da árvore (Group/Role/Module/ModuleClosure/RoleAssignment/Resource), extensão Prisma tenant-aware (AD-5), middleware `requireResource` (AD-7/AD-8) — e fecha de caminho a AC #10 pendente da Story 2.1 (`AuthProvider.verifyToken`, Zero Trust), já que é a primeira consumidora real de um access token no projeto.

**Segundo split (achado durante `create-story` da Story 3.2, 2026-09-30):** `generate module` (AD-6) precisa aplicar, como parte do mesmo comando, a migration que insere a linha em `Module`/`ModuleClosure` — mas nenhuma story até agora implementou um mecanismo real de aplicação de migration em runtime (`aether-admin new` só roda `prisma generate`, nunca `migrate deploy` — ver `deferred-work.md`). Sem isso, `generate module` não tem em cima do que rodar a parte atômica da AD-6. **Story 3.2** constrói `aether-admin migrate` (FR-5) sozinho — idempotente, aplica só migrations pendentes, testável isoladamente contra Postgres real sem precisar de nenhum codegen novo. **Story 3.3** constrói `generate module` (FR-3) em cima do mecanismo de migration da 3.2: schema Prisma incremental, schema Zod, router tRPC protegido, declaração de Recursos, e a escrita atômica de código+migration que a AD-6 exige.

### Epic 4: Recuperação de Senha
Um usuário esquecido de senha recebe um link de redefinição por email (capturado localmente via Mailpit em dev), redefine a senha com token de uso único, e todas as sessões ativas são invalidadas ao final.
**FRs cobertas:** FR18, FR19, FR20, FR28 (parcial — endpoint de reset)
**Depende de:** Epic 1, Epic 2
**Nota de implementação:** interface de provedor de email desenhada para múltiplos templates (reset, welcome) desde o início; mecanismo de token de uso único (geração/expiração/consumo) construído aqui de forma reutilizável — a Epic 5 (FR15, senha inicial no import em lote) reaproveita o mesmo mecanismo, não reimplementa.

### Epic 5: Administração de Identidade
Um administrador visualiza, cria, edita, remove e organiza Usuários/Grupos/Papéis (seleção múltipla, sem drag-and-drop no MVP), importa usuários em lote via CSV (com email de configuração de senha) e revoga sessões ativas — tudo refletindo na árvore em tempo real.
**FRs cobertas:** FR14, FR15
**Depende de:** Epic 1, Epic 2, Epic 3, Epic 4

### Epic 6: Migração de Usuário/Grupo/Papel para Objeto Genérico (Class Table Inheritance)
Reescrita arquitetural (sem feature nova, sem mudança de comportamento observável) de User/Group/Role — hoje modelos Prisma concretos independentes (Epic 5) — para o padrão `DirectoryObject` (tabela base genérica + extensão tipada por classe, AD-11/AD-12 da Architecture Spine), com `RoleAssignment.subjectId`+`subjectObjectClass` substituindo as colunas `userId`/`groupId` separadas. Motivada pela retomada do UX do admin (reaproveitando o UX já finalizado do Directory Service do Tecton, projeto irmão) e pela decisão do Boss de alinhar o core de identidade do Aether ao mesmo padrão "domínio = classe de objeto" do Tecton, preservando garantias reais de banco (unicidade/FK/índice) que o Tecton não preserva.
**FRs cobertas:** nenhuma nova — reescreve a base de FR14/FR15 (já entregues pela Epic 5) sob uma forma física diferente.
**Depende de:** Epic 5 (reescreve o que ela entregou).
**Nota de implementação:** decisão do Boss (2026-10-09) de executar como uma única story grande, sem quebra por sub-recurso (diferente do padrão de stories pequenas usado na Epic 5) — schema + os 4 routers (`users`/`groups`/`roles`/`roleAssignments`) + todos os testes reescritos juntos numa só entrega. Ver `docs/aether-tecton-compatibility.md` e a Architecture Spine (AD-11/AD-12, atualizada 2026-10-09) para o desenho completo.

### Epic 7: Admin UI — Interface de Administração de Identidade
Um administrador de tenant visualiza, cria, edita, remove e organiza Usuários/Grupos/Papéis através de uma interface real (árvore+detalhe, shadcn/ui) — sem precisar de chamadas tRPC manuais ou Postgres direto — importa usuários em lote via CSV com prévia e relatório, atribui Papel com escopo por Módulo, e revoga sessões ativas. Reaproveita 100% do backend já pronto (Epic 5) e o modelo `DirectoryObject`/Class Table Inheritance (Epic 6), sem nenhuma mudança de contrato de API tRPC. **Requisito explícito desde a motivação original (Discovery da sessão de UX):** a Admin UI não é só uma demo do framework — um dev que construir sua própria aplicação sobre o Aether DEVE conseguir reaproveitar essa interface dentro da própria aplicação dele (montável como sub-rota/sub-árvore dentro do layout do app do dev, nunca uma página isolada e intransferível), reduzindo o custo de construir do zero um mecanismo próprio de administração.
**FRs cobertas:** FR14, FR15 (camada de apresentação — backend já entregue pela Epic 5)
**Depende de:** Epic 5 (backend tRPC de Usuários/Grupos/Papéis/RoleAssignments), Epic 6 (modelo de dados `DirectoryObject`)
**UX-DRs cobertos:** UX-DR1 a UX-DR12, ver seção "UX Design Requirements" acima (fonte: sessão `bmad-ux` `ux-Aether-2026-10-07`, `EXPERIENCE.md`+4 `DESIGN.md`, finalizada 2026-10-19).
**Nota de escopo (decisão do Boss, 2026-10-20, corrigida 2026-10-20 por Second-Order Thinking):** UX-DR13 (camada "Empresas"/admin de sistema cross-tenant) fica **fora do escopo de construção** desta epic — é framework, não produto; essa capacidade deve ficar viabilizável por uma epic futura, nunca implementada nativamente, pra não forçar todo dev a carregar uma capacidade que talvez nunca precise. **Correção**: como "simples" e "multi-tenant" (AD-13) produzem a MESMA UI (Empresas é a única diferença entre as 3 formas, e ela não é construída), o PRÓPRIO prompt de 3 opções em `aether-admin new` teria efeito zero durante toda a vida desta epic — construí-lo agora seria esforço numa escolha invisível/morta, risco de confundir o dev. Esta epic constrói **uma UI só, incondicional** (sem perguntar forma de rota); o prompt de 3 opções fica deferido junto da própria camada de Empresas, pra quando uma epic futura construir a camada de sistema de verdade. Nenhuma story desta epic constrói backend cross-tenant, telas de Empresas, ou o prompt de escolha de forma em `aether-admin new`.
**Nota de implementação (achado de pre-mortem, 2026-10-20 — ver Advanced Elicitation):** diferente da Story 6.1 ("numa tacada só", decisão deliberada porque era uma reescrita mecânica de schema+routers, um tipo só de transformação), esta epic cobre 5 frentes tecnicamente distintas e NÃO-mecânicas — tema visual (4 presets como código real), widget de árvore de navegação, 3 formulários de CRUD por entidade, fluxo de import CSV, modal de atribuição com mini-árvore de Módulo — mais wiring manual de ARIA (TanStack Table/RHF não fazem isso de graça) e disciplina de i18n. É também a PRIMEIRA vez que o projeto testa frontend de verdade (Epics 1-6 foram 100% backend) — nenhuma convenção de teste de componente/árvore/formulário existe ainda. Risco real de repetir o padrão de múltiplas tentativas/rate-limit que a Story 6.1 já viveu, agravado por não ter um script de transformação mecânica salvador. **Quebrar em stories pequenas desde o início** (oposto da 6.1), sugestão de sequência natural: (1) fundação visual+tema (presets como código real, convenção de teste de componente estabelecida), (2) árvore de navegação + painel de detalhe, (3) CRUD de Usuário + import CSV, (4) CRUD de Grupo/Papel + atribuição com escopo de Módulo, (5) revogar sessões + acessibilidade/polish final.
**Achado de Assumption Audit (2026-10-20)**: as procedures `users.list`/`groups.list`/`roles.list` (Epic 5) não têm `.input()` nenhum — zero suporte a sort/filtro/paginação no servidor, contradizendo ao pé da letra a AD-13 ("estado de sort/filtro/página sempre na URL, lido pelo loader"). **Resolvido sem tocar backend**: sort/filtro/página do TanStack Table ficam 100% client-side, sobre a lista completa que o `loader` já busca de uma vez — mesma lógica de escala "dev/pequena-equipe" que a AD-13 já usa pra árvore/Virtual (sem lazy-load por nó). Nenhuma story desta epic deve adicionar paginação de servidor sem reabrir essa decisão primeiro.

### Observações de planejamento (não travam nenhuma epic)

- **Risco de exposição de portfólio (atualizado 2026-10-20):** o valor visualmente demonstrável do diferencial do produto (árvore de identidade navegável) só existe a partir da Epic 7 — a Epic 5 entregou só backend (procedures tRPC), nenhuma tela real; a nota original achava que a Epic 5 já seria o "gancho" visível, mas sem UI não há nada pra mostrar. Epics 1–2 entregam valor real (CLI, auth) mas não são o "gancho" do pitch; Epic 3 entrega o motor mas sem tela; Epics 5/6 entregam o backend+modelo de dados sem superfície visível. Se o cronograma apertar, a Epic 7 é a candidata MENOS cortável das últimas — é a única que torna o diferencial do produto visível de verdade.
