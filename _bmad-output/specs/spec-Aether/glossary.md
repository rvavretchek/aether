# Glossário — Aether

Vocabulário canônico do domínio. `Módulo/Submódulo` (sinônimo: Domínio/Subdomínio — intercambiáveis, `Módulo/Submódulo` é o padrão de código e documentação).

- **Módulo/Submódulo** — objeto de primeira classe: contêiner organizacional na árvore de identidade (ex.: "Estoque", "Vendas") **e**, ao mesmo tempo, a unidade de código gerada por `aether-admin generate module` (mesma entidade, ver Architecture Spine AD-6). Pode conter outros Módulos/Submódulos (contenção pai/filho), Usuários, Grupos e Recursos.
- **Usuário** — objeto de primeira classe representando uma pessoa autenticável. Pode ser membro de um ou mais Grupos e receber Papéis diretamente ou por herança.
- **Grupo** — objeto de primeira classe que agrega Usuários para atribuição coletiva de Papéis.
- **Papel** — conjunto nomeado de Recursos (permissões) atribuível a um Usuário ou Grupo sobre um Módulo/Submódulo. Flui por herança **aditiva simples** (estilo ReBAC: usuário─membro de─→grupo─tem papel─→objeto, objeto─contém─→objeto) para os descendentes — sem bloqueio/override no MVP — e é aplicada em tempo de execução (default-deny), não só um registro consultável.
- **Recurso** — unidade de permissão dentro de um Papel. MVP: só **Permissão Nomeada** (ex.: `orders.create`), nome único globalmente, formato `<module-slug>.<ação>`. **Objeto de Negócio Real** (`ResourceType`) tem a interface prevista, sem implementação no MVP.
- **Árvore de Identidade** — estrutura hierárquica completa de Módulos/Submódulos, Usuários, Grupos e suas relações. Só **contenção** (pai/filho entre Módulos) é persistida via Closure Table (append-only no MVP); **associação** (membro de) e **atribuição** (papel sobre) usam tabelas de junção simples. Toda consulta é escopada por Tenant.
- **Tenant** — unidade de isolamento multi-inquilino. Todo dado é escopado por Tenant desde o MVP, mesmo com uma única instalação rodando um só Tenant. Nível de isolamento (base compartilhada vs. banco dedicado) é sempre escolha do desenvolvedor.

## Interfaces de extensão (Superfície Pública)

Sem prefixo de projeto — convenção compartilhada com o framework irmão Tecton. Instanciadas só no módulo de composição (`providers.ts`); nunca importadas por implementação concreta fora dele.

- **`AuthProvider`** — mecanismo de autenticação. MVP: implementação local (Argon2id + Pepper, JWT via `jose`). Roadmap: Keycloak, OpenBAO.
- **`TokenRevocationStore`** — revogação de refresh token. MVP: Postgres/Prisma-backed. Roadmap: backend Redis-backed opcional.
- **`SecretsProvider`** — acesso a segredos da aplicação (pepper do Argon2id, chave de assinatura JWT). MVP: variável de ambiente local. Roadmap: OpenBAO (Transit engine).
- **`KeyCustodyProvider`** — custódia de chave de criptografia por limiar (multi-custodiante). Interface prevista; implementação fora do MVP.
- **`WorkflowEngineProvider`** — workflow de aprovação complexo. Interface prevista; implementação fora do MVP (candidato: Temporal) — decisão compartilhada com o Tecton.

## Formato de API e erros

Sucesso sem envelope. Erro em RFC 9457 Problem Details (`type`/`title`/`status`/`detail`/`instance`), com `invalid-params[]` (formato JSON Pointer RFC 6901, ex. `/items/2/price`) para erro de validação. Correlação via header `traceparent` (W3C Trace Context). Convenção compartilhada com o Tecton.
