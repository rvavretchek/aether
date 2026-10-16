---
review-of: ARCHITECTURE-SPINE.md (Update 2026-10-15/16 — AD-13 e dependências)
reviewer: rubric walker (pré-handoff)
date: 2026-10-16
---

# Revisão rubric-walker — Update AD-13 (camada de componente/visual de `apps/web`)

**Veredito:** AD-13 não passa o bar de handoff como está — a decisão central (4 presets shadcn/Tailwind) se apoia em artefatos de UX que ainda estão vazios/draft e em uma lacuna de escopo (tier "Empresas"/admin de sistema) que a própria sessão de UX identificou e a spine não registrou em nenhum AD, mapa de capacidade ou Deferred, e o mecanismo de integração do shadcn/ui (versão, `--base` primitive, ponto de vendoring) fica totalmente sem pino — três vetores reais de divergência entre sessões que o checklist pede para fechar.

---

## CRÍTICO

### C1 — AD-13 (linhas 123–133) se apoia em `DESIGN.md`/`EXPERIENCE.md` da sessão de UX que ainda estão vazios (status: draft)

`_bmad-output/planning-artifacts/ux-designs/ux-Aether-2026-10-07/DESIGN.md` e `EXPERIENCE.md` contêm **só o frontmatter** (`status: draft`, 4 linhas cada, sem nenhum conteúdo de token/componente). AD-13 (linha 127) cita esses arquivos como a fonte dos "4 presets visuais completos" (`minimal-saas`, `acolhedor`, `tecnico-premium`, `autoral`) e do dark-mode-desde-o-início. Na realidade, o que existe hoje são só esboços HTML em `.working/direction-*.html` e notas de `.memlog.md`. O próprio `.memlog.md` da sessão (linha 18) diz isso explicitamente: *"Custo real está no AUTORAL AGORA: as 4 direções (hoje esboços HTML) precisam virar 4 DESIGN.md completos (tokens + Do's/Don'ts) conforme os componentes forem especificados — trabalho 4x maior no Finalize desta sessão, não depois."* E `docs/aether-tecton-compatibility.md` (linha 100) confirma que o plano é fechar o `DESIGN.md` só **depois** de validação visual do Boss sobre as direções.

Ou seja: a spine (`status: final`) fixa AD-13 como decisão fechada, mas a Rule de AD-13 não é hoje verificável nem executável por uma sessão de implementação — não existe uma especificação formal (tokens OKLCH exatos, variantes de componente) para 3 dos 4 presets, só rascunhos visuais e decisões de memlog. Duas sessões/agentes tentando transformar os mesmos esboços HTML em tokens Tailwind reais vão, sem um `DESIGN.md` fechado para convergir, produzir valores/variantes incompatíveis — exatamente o tipo de divergência entre unidades paralelas que o Deferred deveria sinalizar e não sinaliza (o item em Deferred, linha 292, trata isso como "resolvido em 2026-10-15", o que não é verdade na camada de artefato).

**Risco concreto:** uma story "implementar os 4 presets" rodada por duas sessões diferentes (ou retomada após um gap) terá que inventar os tokens reais a partir de HTML de rascunho, sem base de verificação comum.

### C2 — Tier "Empresas" / admin de sistema (Godofredo) e o eixo "form factor" ficaram fora da spine inteira

A própria sessão de UX que alimenta AD-13 identificou um achado de escopo real (`.memlog.md`, linha 12): uma tela nova "Empresas" (Tenants) visível só para uma camada de permissão **acima** do `isAdmin` tenant-scoped atual, exigindo trabalho de **backend novo** que não existe hoje — "tier de permissão 'admin de sistema' cross-tenant, procedures list/enable-disable Tenant, bootstrap-admin" — e nota explicitamente: *"ACHADO DE ESCOPO... fora do que a Epic 5 construiu."* A mesma sessão também fechou uma decisão irmã (`.memlog.md`, linha 13): `aether-admin new` vai perguntar um **segundo** eixo de escolha em tempo de geração — forma do projeto (simples / multi-tenant / multi-tenant SaaS 2 níveis) — independente do eixo de preset visual que AD-13 cobre.

Nenhum dos dois aparece na spine fora de uma única menção de passagem em AD-13 (linha 128): *"Tabelas (... Empresas ...): TanStack Table"* — que trata "Empresas" como só mais uma lista a paginar, assumindo silenciosamente que a capacidade de backend já existe (ela não existe: AD-5/AD-7 não modelam um tier cross-tenant, `RoleAssignment`/`ModuleClosure` não cobrem "gerenciar outros Tenants"). Não há AD novo, não há linha no Capability Map (linha 272, FR-14), e não há entrada em Deferred reconhecendo isso como decidido/deferido/pergunta aberta. Isso é exatamente a "dimensão real silenciosamente ignorada" que o checklist pede para caçar — duas sessões futuras vão divergir sobre SE e COMO construir "Empresas" porque a spine não disse nem que é Deferred nem que é escopo fechado.

### C3 — `shadcn/ui` na tabela Stack (linha 166) e na Rule de AD-13 não tem versão, mecanismo nem primitiva-base pinados

A linha `shadcn/ui | CLI atual` é a única da tabela Stack sem nenhum número de versão (toda outra linha, até as mais genéricas como `Fastify 5.x`/`Prisma 7.x`, pina ao menos o major). Verificação na web (2026-10-16): o pacote `shadcn` está em `4.21.5`; a CLI v4 (GA março/2026) introduziu uma flag `--base` que escolhe entre **Radix UI**, **Base UI** e (changelog de outubro/2026) **React Aria**, através de 8 estilos visuais diferentes — isto é, hoje existem múltiplas famílias de primitivas incompatíveis entre si por trás do mesmo nome "shadcn/ui". AD-13 (linhas 127–131) nunca escolhe uma: não diz qual `--base`, qual estilo, nem **quando/como** os componentes são vendorizados — se `aether-admin new`/`generate` chama `npx shadcn@latest add` ao vivo a cada geração (dependente do registry, deriva com o tempo) ou se o próprio `aether-admin` vai vendorizar o código do componente uma vez nos seus templates de scaffolding (como já faz hoje para `react-router` 7.18.2 em `src/scaffolding/templates/web.ts`, pinado e estático).

Isso é precisamente o tipo de "tecnologia nomeada não travada" que o checklist pede para verificar, e também um vetor real de divergência entre unidades paralelas que nenhuma linha do Deferred cobre: duas gerações de projeto (ou duas sessões implementando a story que grava os componentes nos templates do `aether-admin`) meses/versões de CLI shadcn apart podem terminar com primitivas (Radix vs. Base UI vs. React Aria) e/ou estilos diferentes por trás do mesmo "Camada 0", sem que a spine tenha fixado qual.

---

## ALTO

### A1 — Frontmatter `sources`/`companions` (linhas 12–18) não foi atualizado para citar a sessão de UX que origina AD-13

AD-13 cita `ux-Aether-2026-10-07` (DESIGN.md/EXPERIENCE.md) repetidamente como base da decisão (linhas 125, 127), mas o `sources:` do frontmatter (linhas 12–16) continua listando só PRD/brief/vision-decisoes/compat-doc, e `companions:` (linhas 17–18) só lista o `architecture-uml`. Quem for rastrear a proveniência de AD-13 pelos metadados do próprio documento não vai achar a sessão de UX — gap de rastreabilidade que fica pior justamente porque (ver C1) o conteúdo citado ainda não existe no artefato referenciado.

### A2 — AD-13 (linha 127) cita AD-6 como precedente de "escolha em tempo de geração", mas AD-6 não estabelece esse padrão

A frase *"mesmo padrão de escolha em tempo de geração já usado por `generate module`, AD-6"* não corresponde ao texto real de AD-6 (linhas 74–78): a Rule de AD-6 é sobre atomicidade código+migration (`generate module` grava arquivo e linha no Closure Table no mesmo comando), não sobre apresentar ao usuário uma lista de opções para escolher. Conferido também no código real: `src/cli/commands/new.ts` (119 linhas) e `src/cli/commands/generate-module.ts` não têm hoje nenhuma lógica de prompt/inquirer/pergunta interativa — ou seja, o "padrão já usado" citado não existe nem na spine nem no código. O precedente real (perguntar ao usuário uma opção em tempo de `new`) vem da própria decisão de "form factor" da sessão de UX (`.memlog.md`, linha 13), que por sua vez (ver C2) também não está registrada em nenhum AD. Uma citação de precedente que não se sustenta nem no texto da AD citada nem no código é o tipo de Rule não verificável que o checklist pede para pegar.

### A3 — Nenhuma biblioteca de ícones pinada, embora o padrão visual citado (ConsoleOne) exija ícone por classe de objeto

`.memlog.md` (linha 6) descreve a referência visual adotada (ConsoleOne da Novell) como "árvore à esquerda (**ícone por classe**, indentação, expand/collapse)" — ou seja, a UI de árvore que AD-13 governa via TanStack Virtual (linha 129) depende de um conjunto de ícones por `objectClass` (User/Group/Role/Module) e affordances de árvore (expand/collapse). AD-13 não pina nenhuma biblioteca de ícones (ex.: `lucide-react`, padrão do próprio shadcn/ui) nem diz onde esses ícones vêm. É uma dimensão real da camada de componente — do mesmo tipo que TanStack Table/Virtual/RHF que AD-13 já trata — deixada de fora.

---

## MÉDIO

### M1 — Referência "`DESIGN.md`s" (linha 127) mal formatada e factualmente adiantada

O texto *"ver `DESIGN.md`s da sessão de UX"* usa crase só em `DESIGN.md` e deixa o `s` de plural fora, sugerindo a existência de múltiplos arquivos `DESIGN.md` (um por preset) — que não existem hoje (há um único `DESIGN.md`, vazio, na pasta da sessão; ver C1). Mesmo corrigindo a formatação, a frase pressupõe um artefato que ainda não foi produzido. Ajustar a redação (e a citação) quando os 4 `DESIGN.md` por preset existirem de fato, ou marcar explicitamente como "a produzir" até lá.

---

## BAIXO

### B1 — Nenhum problema de versão desatualizada nas demais linhas novas da tabela Stack

Verificação na web em 2026-10-16 confirma que `@tanstack/react-table` (9.x → atual 9.3.1), `@tanstack/react-virtual` (3.14.x → atual 3.14.18), `react-hook-form` (7.90.x → atual 7.90.0) e `@hookform/resolvers` (5.9.x → atual 5.9.1) e `Tailwind CSS v4.x` (atual 4.3.x) estão todos alinhados com o lançamento mais recente na data da spine — nenhum travado em versão velha. `shadcn/ui` é a única exceção real (ver C3). Não é uma ação necessária, só registro de que essa parte da verificação não achou problema.
