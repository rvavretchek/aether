---
id: SPEC-Aether
companions:
  - 'glossary.md'
  - '../../planning-artifacts/architecture/architecture-Aether-2026-08-14/ARCHITECTURE-SPINE.md'
  - '../../../docs/architecture-uml-Aether.md'
sources:
  - '../../planning-artifacts/prds/prd-Aether-2026-08-11/prd.md'
  - '../../planning-artifacts/briefs/brief-Aether-2026-08-10/brief.md'
  - '../../planning-artifacts/aether-mvp-vision-decisoes.md'
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Aether — MVP

## Why

**Uma dor a resolver + uma visão a realizar.** Todo projeto React+Node novo reconstrói auth, ORM e as mesmas decisões de arquitetura do zero, sem nunca vir pronto de fábrica — perda real de tempo que se agrava em escala (times com múltiplos arquitetos reinventando os mesmos 5 problemas de formas incompatíveis). Ao mesmo tempo, a forma como sistemas gerenciam identidade e permissões hoje — formulário atrás de formulário — regrediu frente ao que ferramentas como o Novell NetWare 4.1/NDS já ofereciam há 30+ anos: uma árvore visual manipulável por arrastar-e-soltar, sem equivalente real no ecossistema JS atual. O Aether existe pra entregar as duas coisas — infraestrutura de fábrica (auth, ORM, comunicação tipada, email) e uma árvore de identidade que se torna, no MVP, o alicerce de dados pronto pra essa visão (a UI drag-and-drop completa é roadmap, não MVP). Importa agora porque RedwoodJS está em fim de vida e Blitz.js pivotou pra longe do formato monolítico — o espaço de "framework completo e opinativo" está mais vazio do que em anos recentes — e porque, mesmo sem adoção externa, já é vantagem competitiva concreta pro autor em trabalho com clientes.

## Capabilities

- **CAP-1 — Scaffolding e ambiente local de zero a Hello World**
  - **intent:** O desenvolvedor cria e sobe um projeto Aether completo (frontend + backend + banco + capturador de email) sem editar arquivo de configuração à mão.
  - **success:** `aether-admin new` → setup de banco → `aether-admin dev` em no máximo 3 comandos principais, terminando com "Hello World!" no navegador, banco conectado e servidor rodando — replicável por um desenvolvedor sem o autor por perto, só com a documentação.

- **CAP-2 — Scaffolding de Módulo via `generate`**
  - **intent:** O desenvolvedor gera um Módulo de domínio completo (schema, validação, router protegido, Recursos declarados, teste) com um comando, para um ou mais nomes de uma vez, ou em lote a partir de um arquivo de planejamento.
  - **success:** `aether-admin generate module <nome...>` produz os 4 arquivos-adapter + `domain/` + arquivo de teste para cada nome informado, e o Módulo já existe como nó consultável na árvore de identidade — sem passo manual adicional.

- **CAP-3 — Autenticação robusta e extensível**
  - **intent:** Um usuário autentica via JWT + Refresh Token com hashing Argon2id + Pepper, através de um `AuthProvider` trocável sem alterar código consumidor.
  - **success:** Login retorna access token em memória no cliente + refresh token em cookie `httpOnly`/`SameSite`; access token expirado é rejeitado pelas rotas protegidas; excesso de tentativas com credenciais inválidas para o mesmo identificador resulta em bloqueio temporário; trocar `AuthProvider`/`SecretsProvider` por outra implementação não exige tocar código de negócio.

- **CAP-4 — Árvore de identidade hierárquica com enforcement em runtime**
  - **intent:** Usuário, Grupo, Papel e Módulo/Submódulo existem como objetos de primeira classe, com herança aditiva de permissão aplicada em tempo real a cada chamada.
  - **success:** Toda procedure tRPC gerada rejeita (default-deny) um usuário sem o Recurso exigido antes de qualquer lógica de negócio rodar; um Papel atribuído num Módulo vale automaticamente nos descendentes, sem atribuição redundante; ancestrais/descendentes de qualquer nó são consultáveis numa única operação (sem N+1); nenhuma consulta, mesmo mal escrita, retorna dado de outro Tenant.

- **CAP-5 — Administração funcional de identidade**
  - **intent:** Um administrador visualiza, cria, edita, remove e organiza Usuários/Grupos/Papéis, importa Usuários em lote, e revoga sessões ativas — tudo pela tela de administração.
  - **success:** Organizar N usuários em M grupos/papéis exige O(M) ações via seleção múltipla — nunca uma ação por pessoa; import CSV reporta sucesso/erro por linha; revogar a sessão de um usuário pela tela invalida seu refresh token imediatamente; toda ação de organização ou import reflete de imediato na árvore consultável, sem sincronização manual.

- **CAP-6 — Comunicação tipada ponta a ponta**
  - **intent:** O frontend consome a API do backend só via procedures tRPC, com validação Zod compartilhada entre as duas pontas sem duplicação.
  - **success:** Uma mudança de assinatura numa procedure do backend gera erro de tipo no frontend em tempo de compilação, sem rodar gerador de client separado; entrada inválida é rejeitada pelo backend, antes de qualquer lógica de negócio, com erro estruturado RFC 9457.

- **CAP-7 — Notificações transacionais**
  - **intent:** O sistema envia email transacional (import de usuário, redefinição de senha) através de uma interface unificada de provedor, capturado localmente em ambiente de desenvolvimento.
  - **success:** O link de redefinição de senha usa um token de uso único com expiração configurável; completar a redefinição invalida todas as sessões/refresh tokens ativos do usuário; rodando `aether-admin dev`, todo email disparado é capturado por um serviço local visualizável numa UI web, sem envio real nem credencial de provedor.

- **CAP-8 — Qualidade, observabilidade e DX de fábrica**
  - **intent:** Todo projeto gerado nasce com testes, lint/formatação, Docker de desenvolvimento, logging estruturado correlacionado e tratamento de erro global — sem o desenvolvedor montar nada disso à mão.
  - **success:** Um projeto recém-criado passa lint e formatação sem alteração manual de configuração; toda requisição tratada pelo backend gera ao menos uma linha de log JSON com identificador de correlação `traceparent`; um erro não tratado não derruba o processo e retorna uma resposta RFC 9457 Problem Details, com `invalid-params` para erro de validação.

## Constraints

- tRPC é o único mecanismo de comunicação frontend↔backend — sem REST/GraphQL alternativo, nem para casos especiais (upload de arquivo usa `FormData`/`Blob` como input de procedure tRPC, nunca um endpoint multipart paralelo).
- Cada Módulo de negócio segue Hexagonal (Ports & Adapters): `domain/` nunca importa `@prisma/client` nem `@trpc/*`; comunicação `domain`-a-`domain` entre Módulos diferentes é proibida — só via `router.ts` do módulo consumido ou uma porta explícita exportada.
- Todo acesso a dado escopado por Tenant passa por uma extensão do Prisma Client consciente de tenant; `$queryRaw`/`$executeRaw`/`$queryRawUnsafe` são proibidos em qualquer `repository.ts` de módulo de negócio.
- Enforcement de permissão é default-deny via um middleware tRPC central único; `resource-id` segue sempre `<module-slug>.<ação>` e é único globalmente — geração de módulo falha explicitamente (nunca reaproveita silenciosamente) em caso de colisão.
- A tabela de fecho da árvore (`ModuleClosure`) é append-only no MVP — sem reparent/mover um Módulo depois de criado.
- Nenhuma implementação MVP depende de Redis — revogação de token, rate limiting e enforcement de permissão são Postgres-backed ou sem cache algum.
- Interfaces de extensão (`AuthProvider`, `SecretsProvider`, `TokenRevocationStore`, e qualquer futura) são instanciadas só num módulo de composição único (`providers.ts`); código de negócio nunca importa a implementação concreta, só recebe a instância via contexto tRPC.
- Herança de Papel é aditiva simples aos descendentes — sem bloqueio/override por nó no MVP.
- O nível de isolamento de tenant (base compartilhada vs. banco dedicado) é sempre escolha do desenvolvedor no setup do projeto — nunca imposto pelo framework.
- Não há alvo de deploy de produção no MVP — o envelope operacional cobre só ambiente de desenvolvimento local via Docker Compose.
- Pré-1.0, as interfaces de extensão (`AuthProvider`, `SecretsProvider`, `TokenRevocationStore` etc.) podem mudar entre versões menores, documentado em changelog; a partir da v1.0, mudança de contrato exige major version bump (semver).
- O número de opções configuráveis expostas no fluxo de `new`/setup não cresce "pra parecer mais flexível" — cada opção nova reintroduz a indecisão que o Aether existe para eliminar.

## Non-goals

- Aether não é um framework de microsserviços — essa é a proposta do Tecton, projeto irmão; Aether é monolítico por decisão de identidade, não por limitação técnica.
- Aether não é um gerador genérico de CRUD para entidade de negócio arbitrária — a administração gerencia identidade (Usuário/Grupo/Papel/Módulo), não dados de negócio de um sistema construído sobre ele.
- Sem suporte a stacks fora de React + Node no v1.
- Sem REST ou GraphQL como alternativa a tRPC.
- Sem bloqueio/override de herança de permissão por nó.
- Sem árvore visual com drag-and-drop no MVP — a tela de administração é funcional, não visual/arrastável.
- Sem autenticação plugável implementada (Keycloak, OpenBAO) — só a interface `AuthProvider` existe no MVP.
- Sem deploy/infraestrutura de produção, Dockerfile hardened ou pipeline de CI/CD.
- Sem cache (Redis), filas assíncronas ou internacionalização.
- Sem implementação de `KeyCustodyProvider` (custódia de chave por limiar) nem `WorkflowEngineProvider` (workflow de aprovação complexo) — interfaces previstas, implementação fora do MVP.

## Success signal

Um desenvolvedor React+Node desconhecido do projeto, sem o autor por perto e só com a documentação, vai de `aether-admin new` a um "Hello World" funcional — banco conectado, servidor rodando — em no máximo 3 comandos principais; testado e confirmado com pelo menos 3 (idealmente 5) pessoas reais. O mesmo tipo de desenvolvedor, já com o sistema no ar, organiza um cenário como o de importar dezenas de usuários e distribuí-los em múltiplos grupos/papéis usando O(M) ações de seleção múltipla — nunca uma ação por pessoa.

## Assumptions

- `resource-id` segue `<module-slug>.<ação>` — decisão do arquiteto tomada durante o reviewer gate da Architecture Spine (fechando um achado de colisão de nome entre módulos), não confirmada literalmente pelo usuário em coaching direto.
- Resolução de tenant em fluxos pré-autenticação (login, redefinição de senha) é via input explícito `tenantId`/`tenantSlug` na procedure — sem resolução por host/subdomínio no MVP. Chamada do arquiteto no reviewer gate, não coached diretamente.
- A chave de assinatura JWT (`jose`) flui pelo `SecretsProvider`, mesmo caminho do pepper Argon2id (FR-8) — inferido por simetria, não afirmado explicitamente pelo PRD.
- O frontend usa `loader` de rota (React Router, modo data router) chamando o client tRPC diretamente, sem TanStack Query no MVP — decisão do arquiteto para evitar duas fontes de cache/tratamento de erro coexistindo entre módulos.
- Rate limiting (`RateLimitHit`) usa uma tabela Postgres própria, separada da tabela de revogação de refresh token — o PRD exige "mesmo banco de dados" (sem Redis), não "mesma tabela"; a leitura mais estrita original foi corrigida no reviewer gate da arquitetura.

## Open Questions

- Quais outros tipos além de `module` o `aether-admin generate` deve suportar (ex.: página, componente isolado)? O PRD (§11) sinaliza a pergunta sem enumerar — segue em aberto aqui também.
- Convenção de componentes/estilo (Tailwind vs. CSS Modules vs. um kit) para as telas de administração (CAP-5) — sem artefato de UX (`bmad-ux`) alimentando a spec ou a spine ainda.
- Reparent/mover um Módulo depois de criado está fora do MVP (`ModuleClosure` é append-only). Quando entrar em escopo, precisa de um protocolo de escrita explícito (delete+reinsert vs. versionamento histórico) ainda não desenhado.
