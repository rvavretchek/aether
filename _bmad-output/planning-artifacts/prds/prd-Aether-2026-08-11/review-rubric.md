# PRD Quality Review — Aether

## Overall verdict

This is a well-built PRD: the FRs are mostly testable, the Non-Goals and MVP-scope tiering are honest and reasoned rather than asserted, the glossary is used consistently, and IDs/cross-references resolve cleanly. It also does real work integrating a binding cross-project decision log (`docs/aether-tecton-compatibility.md`) — most of those decisions (Closure Table, additive-inheritance-only, `AuthProvider`/`TokenRevocationStore`/`SecretsProvider`/`KeyCustodyProvider` naming, Prisma target databases) show up accurately in the FRs. What's at risk: no Success Metric validates the admin identity screen (FR-14/UJ-2) — the MVP proxy for the product's own headline differentiator — and two other already-decided cross-project items (the API error/response standard, the approval-primitive interface) are consulted for some subsystems but silently missing for others, which reads as an oversight rather than a deliberate scoping choice.

## Decision-readiness — strong

Decisions are stated as decisions, not softened into "considerations": FR-2's note that only shared-database tenancy ships in the MVP while dedicated-database isolation is asked-but-deferred; FR-12's explicit "Out of Scope: Bloqueio/override de herança por nó"; §8's opening line that Safety and Cost NFR categories are deliberately *not* forced into the document because they don't apply. The two Open Questions in §11 (performance targets undefined; `generate` types beyond `module` unenumerated) are genuinely open — no answer smuggled into the next sentence. No findings.

### Findings
_None — dimension is strong._

## Substance over theater — strong

No persona bloat (a single named protagonist, José, carries both UJs, each tied to specific FRs). §0 explicitly declines to re-litigate market differentiation because the Brief already owns it — avoiding differentiation-section theater by design rather than by omission. §8's Security bullets are concrete mechanisms ("nenhuma implementação MVP depende de sessão, cache ou estado em memória exclusivo de uma instância"; "nenhuma alegação de segurança sem reforço técnico real") rather than "must be secure" boilerplate. Vision (§1) is anchored in a specific, non-swappable personal reference (Novell NetWare 4.1/NDS) rather than generic ambition language.

### Findings
_None — dimension is strong._

## Strategic coherence — adequate

The thesis ("decisive, not configurable" infrastructure + a legible permission model an AI agent can reason about) is consistent across FR prioritization: one comm mechanism (FR-16, no REST/GraphQL alternative), one routing convention (FR-1), additive-only inheritance chosen explicitly to avoid opacity (FR-12, cross-referenced to the Tecton compatibility doc's reasoning). Counter-metrics SM-C1/SM-C2 are genuinely tied to specific temptations (config-option creep undermining SM-1; admin-screen "power" creeping back toward block/override) rather than decorative.

### Findings
- **high** No Success Metric validates FR-14 / UJ-2 (§7, §4.3) — The three Success Metrics (SM-1, SM-2, SM-3) all validate FR-1/FR-2/FR-4 (the "Hello World" path) or are a vague catch-all ("relata retrabalho percebido menor"). UJ-2 — the scenario purpose-built to demonstrate the admin identity screen, the MVP proxy for the product's stated core differentiator — has no metric of its own. A PRD whose thesis rests partly on "the tree becomes the industry reference" ships an MVP with zero measurement of whether the non-drag-and-drop admin screen actually reduces the "formulário atrás de formulário" pain it exists to fix. *Fix:* add a metric scoped to FR-14/UJ-2 (e.g., steps/time to bulk-organize N users into groups+roles via the admin screen), or explicitly flag in §11 that the admin screen's own success measure is deferred and why.

## Done-ness clarity — adequate

Most FRs carry specific, falsifiable "Consequências (testáveis)" — FR-9's revocation behavior, FR-11's ancestor/descendant query and cross-database constraint, FR-16's compile-time type error on signature change are all genuinely testable. The dimension is pulled down by a small number of FRs that fall back on unbounded language exactly where the rubric warns to look, in a PRD that otherwise avoids that pattern everywhere else.

### Findings
- **medium** FR-25/FR-24 don't cite the already-decided API standard (§4.6, FR-24, FR-25) — FR-25's consequence reads "mapeando erros para respostas padronizadas" and FR-24's reads "identificador de correlação por requisição" — both vague on what "standardized" or "correlation identifier" mean concretely. `docs/aether-tecton-compatibility.md` — which the Brief's addendum explicitly instructs PRD authors to consult — already closed this exact question on 2026-08-11 ("resolve a última pergunta em aberto do documento"): RFC 9457 Problem Details + `invalid-params` for errors, no-envelope success, `traceparent` (W3C Trace Context) for correlation. The PRD adopted this doc's decisions faithfully everywhere else (Closure Table, additive inheritance, provider interface names) but not here. *Fix:* cite RFC 9457 / `traceparent` directly in FR-24/FR-25's consequences, or add a note pointing implementers at the compat doc so architecture doesn't have to re-derive or re-decide it.
- **medium** FR-8's crackability claim has no bound (§4.2, FR-8) — "Um vazamento isolado do banco de dados não expõe hashes de senha trivialmente craqueáveis" is an unbounded comparative with no concrete parameter (Argon2id memory/time/parallelism cost, or an OWASP-baseline reference). This is the one NFR-shaped claim in the security section that reads as adjective rather than bound, in a section (§8.1) that is otherwise unusually concrete. *Fix:* cite a specific parameter floor (e.g., OWASP-recommended Argon2id settings) or explicitly defer exact tuning to architecture with a note.
- **low** FR-19's "erro claro" is adjective-only (§4.5, FR-19) — "resulta em erro claro" doesn't specify what makes the error clear or testable. *Fix:* tie to the same RFC 9457 format (`title`/`detail` fields) referenced in the FR-25 finding above — one fix likely closes both.

## Scope honesty — adequate

§5 (Non-Goals) and §6.2 (Fora do Escopo) are the strongest parts of the document on this dimension: omissions are stated with reasoning ("por decisão de identidade, não por limitação técnica"), and the Fast-follow / Roadmap / Someday tiering mirrors the Brief's own tiering without drift. The Assumptions Index (§12) shows an honest roundtrip — two assumptions identified during drafting, both since confirmed and promoted out of `[ASSUMPTION]` status rather than left dangling.

### Findings
- **medium** The compat doc's approval-primitive decision is absent (no PRD location — should be in §5, §6.2, or §11) — `docs/aether-tecton-compatibility.md` records a 2026-08-11 decision binding "para os dois projetos": a lightweight native "aprovação simples" primitive (reusing the ACL/tree model) plus a `WorkflowEngineProvider` interface for complex workflows. Nothing in the Aether PRD — not §5 Non-Goals, not §6.2 scope tiers, not §11 Open Questions — mentions it, even though every other decision from the same log entry range shows up correctly elsewhere in this PRD. Because the PRD is otherwise faithful to this source document, the silence reads as an oversight, and a reader can't tell whether it was deliberately excluded or simply missed. *Fix:* add an explicit Non-Goal/Roadmap line for the approval primitive, or an Open Question if its MVP applicability to Aether specifically (as opposed to Tecton) is genuinely undecided.

## Downstream usability — strong

Glossary terms (Módulo/Submódulo, Usuário, Grupo, Papel, Recurso, Permissão Nomeada, Objeto de Negócio Real, Tenant, and the four provider interfaces) are used identically across FRs — no case or synonym drift found. FR IDs run 1–26 with no gaps or duplicates; the one out-of-sequence placement (FR-26 physically sits in §4.2 among FR-7–10 rather than after FR-25) is explained upfront in §0 ("a numeração reflete ordem de criação, não posição no documento") and is genuinely not a defect once that's known. Both UJs carry a named protagonist (José) who appears again in the FRs he realizes, not floating references.

### Findings
_None — dimension is strong. One cosmetic note carried to Mechanical notes below._

## Shape fit — strong

This is a chain-top PRD (§0: feeds UX, architecture, and story creation) for a hybrid product — a CLI/capability-spec shape for the scaffolding features (§4.1, §4.6) and a real-UX shape for the admin screen (§4.3) — and the PRD matches its formalism to each half correctly: two UJs, proportionate rather than inflated, each anchored to the FRs it realizes; Success Metrics are developer-experience metrics (steps to Hello World, real outsider usability test) appropriate to a dev-tool product rather than consumer engagement metrics forced onto it. No over- or under-formalization found.

### Findings
_None — dimension is strong._

## Mechanical notes

- **Glossary drift**: none found. Terms (Módulo/Submódulo, Papel/Papéis, Recurso, Objeto de Negócio Real, Permissão Nomeada) are capitalized and used consistently across the Glossário and all FRs.
- **ID continuity**: FR-1 through FR-26 all present, unique, no gaps. FR-26 is physically out of numeric sequence (placed in §4.2 rather than after FR-25 in §4.6) but this is explained by §0's stated numbering policy (creation order, not document position) — not a defect.
- **Assumptions Index roundtrip**: clean. §12 states zero pending `[ASSUMPTION]` tags; the two identified during drafting (semver policy §9.2, Node LTS policy §9.3) are noted as resolved into firm decisions rather than left as inline tags with no index entry (or vice versa).
- **UJ protagonist naming**: both UJ-1 and UJ-2 carry José as a named, contextualized protagonist; UJ-2 additionally names a secondary character (Enzo) for the "new user not on any import list" edge case. No floating UJs.
- **Cross-references**: all internal section references (e.g., "ver §4.5," "ver NFR de Segurança em §8," "§9.2 e §9.3" in §12) resolve to sections that exist and say what they're cited for. Cross-references into the Product Brief ("Brief, 'O Problema'," "Brief §'A Quem Isso Serve'," "detalhado no Product Brief, §Visão") match the Brief's actual section titles.
- **Minor**: `ResourceType` (§4.3, FR-13) — the TypeScript-facing name of the "Objeto de Negócio Real" contract — is introduced inline in a single FR and not added as a Glossary entry, unlike every other code-facing interface name (`AuthProvider`, `TokenRevocationStore`, `SecretsProvider`, `KeyCustodyProvider`), which are all indexed in §3. Low-cost fix: fold it into the existing "Recurso" Glossary entry.
