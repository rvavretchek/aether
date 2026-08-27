---
title: "Aether — Diagramas UML (companion da Architecture Spine)"
status: final
created: 2026-08-17
updated: 2026-08-17
source: "_bmad-output/planning-artifacts/architecture/architecture-Aether-2026-08-14/ARCHITECTURE-SPINE.md"
---

# Aether — Diagramas UML

Companion visual da [Architecture Spine](../_bmad-output/planning-artifacts/architecture/architecture-Aether-2026-08-14/ARCHITECTURE-SPINE.md) (AD-1 a AD-10). Não introduz nenhuma decisão nova — cada diagrama aqui é uma projeção UML das ADs já fechadas, pra servir de referência visual antes de destilar o SPEC via `bmad-spec`. Se algum diagrama divergir da spine no futuro, a spine é a autoridade — atualizar aqui para igualar, não o contrário.

## 1. Diagrama de Classes — Domínio de Identidade + Interfaces de Extensão

Modelo de dados (ERD da spine, em notação UML) + as portas Hexagonais (AD-4) com seus adapters MVP.

```mermaid
classDiagram
    class Tenant {
        +UUID id
        +string name
    }
    class Module {
        +UUID id
        +UUID tenantId
        +string slug
        +string name
    }
    class ModuleClosure {
        +UUID ancestorId
        +UUID descendantId
        +int depth
    }
    class User {
        +UUID id
        +UUID tenantId
        +string email
        +string passwordHash
    }
    class Group {
        +UUID id
        +UUID tenantId
        +string name
    }
    class Role {
        +UUID id
        +UUID tenantId
        +string name
    }
    class Resource {
        +UUID id
        +UUID tenantId
        +string name
        +ResourceKind kind
    }
    class ResourceKind {
        <<enumeration>>
        NAMED_PERMISSION
        BUSINESS_OBJECT
    }
    class RoleAssignment {
        +UUID id
        +AssigneeType assigneeType
        +UUID assigneeId
        +UUID targetModuleId
        +UUID roleId
    }
    class RefreshToken {
        +UUID id
        +UUID userId
        +DateTime issuedAt
        +DateTime expiresAt
        +DateTime revokedAt
    }
    class RateLimitHit {
        +string identifier
        +DateTime windowStart
        +int count
    }

    Tenant "1" --> "*" Module : escopa
    Tenant "1" --> "*" User : escopa
    Tenant "1" --> "*" Group : escopa
    Module "1" --> "*" ModuleClosure : ancestorId
    Module "1" --> "*" ModuleClosure : descendantId
    User "*" -- "*" Group : GroupMembership
    User "1" --> "*" RefreshToken : possui
    RoleAssignment "*" --> "1" Role
    RoleAssignment "*" --> "1" Module : targetModuleId
    RoleAssignment "*" --> "0..1" User : assignee usuário
    RoleAssignment "*" --> "0..1" Group : assignee grupo
    Role "*" -- "*" Resource : concede
    Resource --> ResourceKind

    class AuthProvider {
        <<interface>>
        +authenticate(credentials) AuthResult
        +verifyToken(token) Claims
    }
    class SecretsProvider {
        <<interface>>
        +getSecret(key) string
    }
    class TokenRevocationStore {
        <<interface>>
        +revoke(jti)
        +isRevoked(jti) bool
    }
    class KeyCustodyProvider {
        <<interface>>
        <<Deferred - Roadmap>>
    }
    class WorkflowEngineProvider {
        <<interface>>
        <<Deferred - Roadmap>>
    }
    class Argon2AuthProvider {
        <<adapter MVP>>
    }
    class EnvSecretsProvider {
        <<adapter MVP>>
    }
    class PrismaTokenRevocationStore {
        <<adapter MVP>>
    }
    Argon2AuthProvider ..|> AuthProvider
    EnvSecretsProvider ..|> SecretsProvider
    PrismaTokenRevocationStore ..|> TokenRevocationStore
```

**Notas de leitura** (não repetir na spine, só aqui como legenda):
- `ModuleClosure` tem as duas FKs pra `Module` (AD-6) — toda criação insere a linha self-referencial (`depth=0`) mais uma por ancestral do pai.
- `Resource.name` é único globalmente, formato `<module-slug>.<ação>` (AD-7) — por isso não há FK direta `Resource → Module` no ERD original: o namespace já embute a origem.
- `RateLimitHit` (AD-10) é infraestrutura de `core/auth`, deliberadamente sem relação com `RefreshToken` — tabelas fisicamente separadas mesmo banco.
- `KeyCustodyProvider`/`WorkflowEngineProvider` aparecem tracejados por convenção só pra mostrar onde entram na composição (AD-4) quando implementados — sem adapter MVP.

## 2. Diagrama de Componentes

Fronteiras de pacote (AD-3) e a fatia Hexagonal por módulo (AD-1), com as interfaces expostas/consumidas entre `core/` e os módulos de negócio.

```mermaid
flowchart TB
    subgraph WEB["apps/web (SPA — AD-2)"]
        Routes["routes/ (loaders)"]
        TrpcClient["trpc/client.ts<br/>(único import type AppRouter — AD-3)"]
    end

    subgraph SHARED["packages/shared"]
        Schemas["schemas/&lt;módulo&gt;.ts + schemas/common.ts"]
    end

    subgraph API["apps/api"]
        RootRouter["root-router.ts"]

        subgraph CORE["core/ (AD-4)"]
            Providers["providers.ts<br/>(composição — único ponto de instanciação)"]
            AuthMod["auth/ (AuthProvider port + Argon2id/jose adapter)"]
            AuthzMod["authz/ (middleware requireResource — AD-7/AD-8)"]
            TenantMod["tenant/ (Prisma Client Extension — AD-5)"]
            SecretsMod["secrets/ (SecretsProvider port + env adapter)"]
            NotifMod["notifications/ (interface e-mail + Mailpit dev)"]
        end

        subgraph MOD["modules/&lt;nome&gt; (vertical slice — AD-1)"]
            Domain["domain/ (regra de negócio,<br/>sem import Prisma/tRPC)"]
            Router["router.ts (adapter IN)"]
            Repo["repository.ts (adapter OUT)"]
            ResourcesDecl["resources.ts"]
        end
    end

    subgraph DB["packages/db"]
        PrismaClient["Prisma Client + driver adapter por banco"]
        TenantExt["extensions/tenant.ts"]
    end

    Routes --> TrpcClient
    TrpcClient -->|tRPC/HTTP| RootRouter
    TrpcClient -.->|import type| RootRouter
    Routes --> Schemas
    Router --> Schemas

    RootRouter --> Router
    Router --> AuthzMod
    Router --> Domain
    AuthzMod --> TenantMod
    Domain -->|via porta| Repo
    Repo --> TenantExt
    TenantExt --> PrismaClient
    AuthMod --> Providers
    SecretsMod --> Providers
    TenantMod --> Providers
    NotifMod --> Providers
    Providers -.->|ctx tRPC, AD-4| RootRouter

    Domain -.->|"PROIBIDO: import direto de outro domain/ (AD-1)"| MOD
```

## 3. Diagramas de Sequência

### 3.1 Login + emissão de token (FR-7, FR-8, Zero Trust §8.1)

```mermaid
sequenceDiagram
    actor U as Usuário
    participant Web as apps/web (client tRPC)
    participant Router as core/auth router
    participant AuthP as AuthProvider (Argon2id)
    participant Secrets as SecretsProvider
    participant DB as Postgres (via tenant extension)

    U->>Web: submete email + senha + tenantId/tenantSlug
    Web->>Router: login(email, senha, tenantId)
    Router->>Secrets: getSecret("argon2-pepper")
    Secrets-->>Router: pepper
    Router->>AuthP: authenticate(email, senha, pepper)
    AuthP->>DB: SELECT User WHERE tenantId + email
    DB-->>AuthP: User(passwordHash)
    AuthP->>AuthP: Argon2id.verify(senha+pepper, passwordHash)
    AuthP-->>Router: OK (claims)
    Router->>Secrets: getSecret("jwt-signing-key")
    Secrets-->>Router: chave (jose)
    Router->>Router: assina access token (JWT, minutos) + refresh token
    Router->>DB: INSERT RefreshToken(jti, userId, expiresAt)
    Router-->>Web: access token (corpo) + refresh token (cookie httpOnly/SameSite)
    Web->>Web: guarda access token em memória (nunca localStorage)
```

### 3.2 Enforcement de permissão numa chamada protegida (FR-27, AD-7, AD-8)

```mermaid
sequenceDiagram
    actor U as Usuário
    participant Web as apps/web
    participant Mid as core/authz middleware<br/>(requireResource)
    participant AuthP as AuthProvider
    participant DB as Postgres

    U->>Web: ação em orders.create
    Web->>Mid: chamada tRPC (access token no header)
    Mid->>AuthP: verifyToken(access token)
    AuthP-->>Mid: claims (userId, tenantId) — verificação própria, sempre (Zero Trust)
    Mid->>DB: 1 query — ModuleClosure(ancestorId) ⋈ RoleAssignment ⋈ Role_Resource<br/>WHERE resource = "orders.create"
    DB-->>Mid: coberto? (herança aditiva, sem override)
    alt papel cobre o recurso
        Mid->>Mid: default-deny → ALLOW
        Mid-->>Web: segue para domain/ do módulo orders
    else não cobre
        Mid-->>Web: 403 (RFC 9457 Problem Details)
    end
```

### 3.3 `generate module` — código + nó da árvore na mesma operação (AD-6)

```mermaid
sequenceDiagram
    actor Dev as Dev / agente de IA
    participant CLI as aether-admin generate module
    participant FS as sistema de arquivos
    participant Prisma as Prisma Migrate

    Dev->>CLI: aether-admin generate module financeiro
    CLI->>FS: escreve domain/, router.ts, repository.ts, schema.ts, resources.ts
    CLI->>Prisma: gera + aplica migration:<br/>INSERT Module(slug="financeiro")<br/>INSERT ModuleClosure self-row (depth=0)<br/>INSERT ModuleClosure por ancestral do pai (depth+1)
    Prisma-->>CLI: migration aplicada
    CLI-->>Dev: sucesso (código + nó da árvore já existem juntos)
    Note over CLI,Prisma: Se a migration falhar, CLI reporta erro específico<br/>sem deixar código gerado "órfão" (sem nó correspondente)
```

### 3.4 Redefinição de senha por link (FR-19) invalidando sessões (FR-9)

```mermaid
sequenceDiagram
    actor U as Usuário
    participant Web as apps/web
    participant Router as core/auth router
    participant Revoc as TokenRevocationStore
    participant DB as Postgres

    U->>Web: clica no link de redefinição (token de uso único)
    Web->>Router: resetPassword(token, novaSenha)
    Router->>DB: valida token (não expirado, não usado)
    alt token inválido/expirado/reusado
        Router-->>Web: erro RFC 9457 (title/detail explícitos)
    else token válido
        Router->>DB: atualiza passwordHash (Argon2id + pepper)
        Router->>Revoc: revoke(todos os RefreshToken ativos do usuário)
        Revoc->>DB: UPDATE RefreshToken SET revokedAt = now() WHERE userId = ...
        Router-->>Web: sucesso — sessões antigas mortas
    end
```

## 4. Diagrama de Estados — Refresh Token (FR-7, FR-9)

```mermaid
stateDiagram-v2
    [*] --> Emitido: login bem-sucedido (FR-7)
    Emitido --> Ativo: cookie httpOnly entregue
    Ativo --> Ativo: usado pra renovar access token
    Ativo --> Revogado: revoke() explícito<br/>(logout, admin FR-14, ou reset de senha FR-19)
    Ativo --> Expirado: passou expiresAt
    Revogado --> [*]: TokenRevocationStore nega novo access token
    Expirado --> [*]: TokenRevocationStore nega novo access token
```

## Rastreabilidade

| Diagrama | ADs / FRs cobertos |
| --- | --- |
| Classes | AD-4, AD-5, AD-6, AD-7, AD-10 · FR-7, FR-8, FR-9, FR-11, FR-12, FR-13, FR-26, FR-28 |
| Componentes | AD-1, AD-2, AD-3, AD-4 · FR-1, FR-3, FR-4, FR-16, FR-17 |
| Sequência 3.1 (login) | AD-4 · FR-7, FR-8, §8.1 Zero Trust |
| Sequência 3.2 (enforcement) | AD-7, AD-8 · FR-27 |
| Sequência 3.3 (generate module) | AD-6 · FR-3 |
| Sequência 3.4 (reset senha) | AD-5 · FR-9, FR-19 |
| Estados (refresh token) | FR-7, FR-9 |
