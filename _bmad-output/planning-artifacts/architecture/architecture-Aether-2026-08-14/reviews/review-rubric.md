# Rubric Review — ARCHITECTURE-SPINE.md (Aether, 2026-08-14)

Reviewer: independent rubric walker. Inputs read in full: `ARCHITECTURE-SPINE.md`, `.memlog.md`, `prd-Aether-2026-08-11/prd.md`.

Overall the spine is well-constructed: all 28 FRs and every §8 NFR bullet trace to at least one row in the Capability→Architecture Map, the ADs are mostly concrete and mechanically checkable, the Deferred list matches the PRD's own Fast-follow/Roadmap/Someday cuts (nothing deferred contradicts something the PRD scoped as MVP), and both diagrams are syntactically valid and substantive. The findings below are the real gaps: two are genuine unresolved divergence points at this altitude (file upload path, tenant resolution), several are dimensions this altitude owns that were left silent instead of decided/deferred, and a few are small clarity/consistency nits.

---

## Findings

### F1 — HIGH — FR-15 (CSV import) has no resolved transport, and appears to strain the AD-2/FR-16 "tRPC is the only mechanism" rule

**Quote (FR-16):** "Não existe REST ou GraphQL alternativo no MVP — tRPC é o único mecanismo de comunicação entre frontend e backend."
**Quote (FR-15):** "Um administrador pode importar uma lista de Usuários de uma vez (ex.: arquivo CSV)... O import aceita múltiplos Usuários numa única operação e reporta sucesso/erro por linha."
**Quote (spine map):** "FR-11, FR-12, FR-13, FR-14, FR-15 (árvore de identidade + admin) → AD-6, AD-8, ERD" — no AD addresses the file-upload transport at all.

Nothing in the spine says how a CSV file physically gets from the browser to the backend given the "tRPC only, no REST alternative" invariant (AD-2/FR-16). Plain JSON-RPC-style tRPC procedures don't naturally carry multipart file payloads. This is exactly the kind of divergence point the spine exists to close: one builder could base64-encode the file into a JSON tRPC input, another could add a raw Fastify multipart route (which would itself violate "tRPC é o único mecanismo"), a third could reach for tRPC 11's newer FormData-input support. All three are plausible, mutually incompatible, and none is ruled in or out by any AD, Convention, or Deferred entry. Recommend a one-line AD (or an addition to AD-2/AD-3) naming the concrete mechanism (e.g., "file inputs use tRPC's FormData/Blob input support; no parallel REST/multipart endpoint").

### F2 — HIGH — AD-5 never states how `tenantId` is resolved before authentication exists

**Quote (AD-5 Rule):** "todo acesso a modelo escopado por Tenant passa por um Prisma Client estendido... construído por request a partir do `tenantId` do contexto tRPC autenticado."

This rule presupposes an authenticated context already carries `tenantId`. But login itself (and any pre-auth flow: password-reset request, invited-user password setup via FR-19) happens *before* that context exists, and must still resolve a tenant to authenticate against — the PRD explicitly allows multi-tenant installs ("Quando o projeto é multitenant..." FR-2) as well as single-tenant ones. The spine never decides how a pre-auth request identifies its tenant: subdomain/host header, an explicit path/header param, or "MVP assumes exactly one Tenant row per instance, resolved implicitly." Two builders implementing `core/auth`'s login procedure and `core/tenant`'s resolver independently could genuinely diverge here — one hardcoding a single default tenant lookup, another expecting a header that nothing else in the stack sets. This is squarely an architecture-altitude decision (it shapes `core/tenant/`, referenced in the Structural Seed) and is currently silent rather than decided or deferred.

### F3 — MODERATE — Frontend data-fetching/cache layer for tRPC consumption is unspecified

**Quote (Stack table):** lists `React 19.x`, `React Router ^7`, `Vite 7.x`, `Vitest` — no data-fetching/query/cache library.
**Quote (AD-2 Rule):** "`apps/web`... consumindo `apps/api` só via tRPC/HTTP."

`AD-2` fixes the topology (SPA, tRPC/HTTP) but not how components actually call procedures and manage server-state (loading/error/cache/invalidation) — normally `@trpc/react-query` + `@tanstack/react-query`, but that pairing is entirely absent from the Stack table and Structural Seed (`apps/web/src/trpc/` is listed only as "client tRPC tipado", no library named). Given FR-14's admin screens (list/create/edit/remove/assign, with "reflete imediatamente na árvore consultável" — i.e., cache invalidation after mutations matters), this is a real point where two independently-built modules' frontend code could diverge on the data layer itself, not just on styling.

### F4 — MODERATE — FR-21's mandatory test-scaffold has no location/naming convention, and the Structural Seed omits test files entirely

**Quote (FR-21):** "Toda geração de código via `generate` (FR-3) inclui automaticamente o scaffolding de teste correspondente... Rodar `generate module financeiro` cria também um arquivo de teste correspondente."
**Quote (map):** "FR-21, FR-22 (testes/lint) | scaffolding gerado por `generate` | Stack" — "Stack" only pins the Vitest *version*, not any convention.

The Structural Seed's `modules/system/` listing enumerates exactly `domain/`, `router.ts`, `repository.ts`, `schema.ts`, `resources.ts` — no test file, despite FR-21 mandating one on every generation. Co-located (`router.test.ts` beside `router.ts`) vs. a `__tests__/`/`tests/` subfolder vs. a top-level test tree are all live options nothing here rules out; the very artifact meant to be the concrete file-tree example is silent on the one file type a PRD requirement says must exist.

### F5 — MODERATE — JWT signing-key provisioning is unaddressed (unlike the Argon2 pepper, which is explicit)

**Quote (Stack):** `jose | assinatura/verificação de JWT (EdDSA)`.
**Quote (Consistency Conventions, Hashing de senha):** "O pepper é lido através do `SecretsProvider`... (FR-8)" — analogous explicit rule for the Argon2 pepper.

FR-8's pepper explicitly flows through `SecretsProvider`; nothing parallel is said for the EdDSA key pair `jose` uses to sign/verify access tokens. Is it read via `SecretsProvider` too (consistent with FR-26's "nenhum código depende diretamente de onde um segredo está armazenado")? Generated once at `aether-admin new` and written to `.env`? Generated at first boot and persisted where? Any of these is plausible and none is stated — a real key-management decision left to chance at build time.

### F6 — MODERATE — No component/styling convention for the FR-14 admin screens, and it isn't deferred either

FR-14 requires a non-trivial CRUD+assignment admin UI (list/create/edit/remove entities, multi-select assignment, session revocation) realizing UJ-2. The spine's Structural Seed shows only `routes/` and `trpc/` under `apps/web/src/` — no `components/`, no styling approach (Tailwind/CSS Modules/a component kit), and `companions: []` in the frontmatter confirms no UX artifact is feeding this spine yet. This is a whole dimension (UI composition/styling) that the checklist asks to be decided, deferred, or flagged as an open question — here it's simply absent from both the AD list and Deferred.

### F7 — MINOR — PRD §8.1's "no security claim without real technical reinforcement" NFR has no governing AD/convention/Deferred entry

**Quote (PRD §8.1):** "Nenhuma alegação de segurança sem reforço técnico real: ...nenhuma funcionalidade futura pode se dizer 'segura e auditável' com base só em uma checagem de workflow — precisa de reforço criptográfico ou estrutural de verdade (relevante já agora para não desenhar `KeyCustodyProvider`/`AuthProvider`/`SecretsProvider`/`WorkflowEngineProvider` de um jeito que abra essa exceção no futuro)."

This bullet is explicitly called out by the PRD as relevant *now*, for how the extension-point interfaces are shaped, yet it isn't picked up anywhere in the spine's AD-4 (provider composition) discussion or Consistency Conventions. Low risk to MVP build (it mostly constrains future interface design), but per a strict FR/NFR sweep it is an ungoverned NFR bullet.

### F8 — MINOR / cosmetic — Mermaid flowchart's `classDef forbidden` styles the wrong element

**Quote:**
```
classDef forbidden stroke:#c92a2a,stroke-dasharray: 4 4
Domain -.->|nunca importa direto| DB
class Domain forbidden
```
Mermaid's `classDef`/`class` apply to **nodes**, not edges (edge styling needs `linkStyle`). As written, the red dashed styling will render around the `Domain` node's border, not on the `Domain -.-> DB` arrow it's meant to flag as forbidden — readable as "the Domain node is forbidden" rather than "this dependency edge is forbidden." Diagram is syntactically valid and still conveys the dependency direction correctly; this is just an authoring slip that undercuts the intended visual warning.

### F9 — MINOR — AD-6's Rule governs `generate module` CLI behavior, which the Deferred section says is out of this spine's scope

**Quote (AD-6 Rule):** "`generate module <nome>` cria, na mesma operação, o código do módulo (AD-1) **e** o registro correspondente na árvore de identidade..."
**Quote (Deferred, item 1):** "Arquitetura interna do próprio `aether-admin` CLI (o gerador) — esta spine governa o projeto gerado, não a ferramenta que o gera."

Read literally, AD-6 dictates CLI-internal behavior (what `generate module` does, atomically) while Deferred disclaims exactly that territory. The more charitable — and almost certainly intended — reading is that AD-6 fixes an invariant on the **generated project's data model** (every code Module must have a corresponding tree node, full stop, regardless of how the CLI internally achieves that), not the CLI's implementation. Worth one clarifying clause so a future reader doesn't treat this as a genuine scope contradiction.

### F10 — MINOR — AD-5's mapping doesn't cover FR-2's requirement that the setup wizard still *asks* about isolation level

**Quote (FR-2):** "Quando o projeto é multitenant, o assistente pergunta o nível de isolamento desejado (base compartilhada... ou banco dedicado...) — a escolha é do desenvolvedor... no MVP, apenas o isolamento por base compartilhada... é implementado de fato; a pergunta... já existe na experiência."

The map row `FR-2, FR-11, §8.1 Isolamento de tenant → AD-5` covers the runtime query-scoping mechanism well, but AD-5's Rule text says nothing about the CLI wizard still needing to surface the (currently no-op) dedicated-DB question. Low risk — Deferred correctly scopes dedicated-DB isolation as Roadmap — but the wizard-UX half of FR-2 isn't traceable to any Rule text, only to the map row's label.

### F11 — MINOR / note — ERD collapses the closure table's two FKs into one relationship line

**Quote:** `MODULE ||--o{ MODULE_CLOSURE : "ancestor/descendant"`

A closure table actually needs two FK relationships to `MODULE` (`ancestorId`, `descendantId` — both referenced explicitly in AD-8's Rule: "índice composto obrigatório (`ancestorId, descendantId`)"), not one. The ERD's single combined line is a reasonable simplification for a high-level illustrative diagram and doesn't block understanding, but a reader generating the literal Prisma schema from this ERD alone would need to know to split it into two relations.

---

## Checklist walk-through summary

1. **Divergence points fixed, none missed** — mostly yes; F1 and F2 are the two points that materially were missed.
2. **AD-1..AD-10 individually enforceable** — all ten are concrete and reviewable via static checks (import boundaries, file presence, middleware wiring), except AD-8's p95<10ms figure which is a target requiring a load-test story rather than a static rule — expected for a latency NFR, not a defect.
3. **Nothing Deferred is secretly load-bearing** — checked all 12 Deferred bullets against PRD §6.2/§9/§11; all match an explicit PRD Fast-follow/Roadmap/Someday/Out-of-Scope cut. No issue found.
4. **Named tech internally consistent** — no internal contradictions found between Stack table, Consistency Conventions, and memlog (TS 5.9 vs. TS7, React Router ^7 vs. v8, Prisma uuid(7)/5.18 vs. Prisma 7.x, all consistent with each other). Not independently version-verified per instructions.
5. **Every FR-1..FR-28 and §8 NFRs covered** — all 28 FRs have a Capability Map row (verified by enumeration). §8.1 has 5 bullets: 4 are governed (stateless→AD-2/AD-9, Zero Trust→Conventions, tenant-choice→AD-5/Deferred, no-Redis→AD-8/AD-10/Deferred); the 5th ("no security claim without real reinforcement") is ungoverned — see F7. §8.2 privacy bullets all trace to FRs already covered.
6. **Parent spine inheritance** — N/A, skipped as instructed.
7. **Every dimension this altitude owns is decided/deferred/open** — operational envelope (deploy/infra/ops) is explicitly and correctly deferred via AD-9 + Deferred item 2, satisfying the specific concern called out in the task. However F2 (tenant resolution), F3 (frontend data layer), F4 (test-file convention), F5 (JWT key provisioning), and F6 (UI component/styling convention) are dimensions this altitude plausibly owns that are neither decided nor listed in Deferred.

## Diagram sanity check

Both diagrams are syntactically valid Mermaid and convey real, non-trivial structure (dependency direction with an explicit forbidden edge; a 9-entity ERD covering the whole identity-tree model). One cosmetic authoring issue noted in F8; one modeling simplification noted in F11. Neither is a rendering-breaking or placeholder-diagram issue.
