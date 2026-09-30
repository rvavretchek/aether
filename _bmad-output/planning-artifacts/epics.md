---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics]
inputDocuments:
  - '_bmad-output/planning-artifacts/prds/prd-Aether-2026-08-11/prd.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-Aether-2026-08-14/ARCHITECTURE-SPINE.md'
  - '_bmad-output/specs/spec-Aether/SPEC.md'
  - '_bmad-output/specs/spec-Aether/glossary.md'
  - 'docs/architecture-uml-Aether.md'
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

Nenhum documento de UX (`bmad-ux`) existe ainda para o Aether. A convenção de componentes/estilo para as telas de administração (FR-14) fica como item em aberto (ver Architecture Spine → Deferred, e SPEC.md → Open Questions) — não travada por nenhuma epic/história abaixo além do necessário para uma UI funcional mínima.

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
FR14: Epic 5 - CRUD+organização de Usuários/Grupos/Papéis (revogar sessão aqui invoca o mecanismo da Epic 2)
FR15: Epic 5 - import em lote (CSV) + email de config (reaproveita mecanismo de token único-uso construído na Epic 4)
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

### Observações de planejamento (não travam nenhuma epic)

- **Risco de exposição de portfólio:** o valor visualmente demonstrável do diferencial do produto (árvore de identidade navegável) só existe a partir da Epic 5, a última do MVP. Epics 1–2 entregam valor real (CLI, auth) mas não são o "gancho" do pitch; Epic 3 entrega o motor mas sem tela. Se o cronograma apertar, a Epic 5 é a candidata natural a cortar — e é justamente a única que torna o diferencial visível. Sem mudança de estrutura por ora (decisão do Boss); registrado para referência em priorização futura caso o prazo aperte.
