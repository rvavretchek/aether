---
review: UX spine contract validation — ux-Aether-2026-10-07
reviewed:
  - EXPERIENCE.md
  - DESIGN-minimal-saas.md
  - DESIGN-acolhedor.md
  - DESIGN-tecnico-premium.md
  - DESIGN-autoral.md
calibration-used:
  - .claude/skills/bmad-ux/assets/design-example-shadcn.md
  - .claude/skills/bmad-ux/assets/experience-example-shadcn.md
  - .claude/skills/bmad-ux/assets/experience-example-mobile.md
date: 2026-10-19
---

# Review Rubric — Validação do par EXPERIENCE/DESIGN (Admin UI do Aether)

## Veredito geral: **ADEQUATE**

O contrato é consumível por um downstream direto na maior parte — token completude e disciplina de herança de alto nível são **strong** (nenhum token de cor crítico faltando, todas as `sources` resolvem, a única divergência de nomenclatura de componente já documentada é genuína e bem registrada). Mas há 7 achados reais, nenhum crítico, concentrados em: cobertura de Flow (1 falha mal coberta), cobertura de estado (sublistas vazias no painel de detalhe), citação de referência visual (3 arquivos órfãos), uma inconsistência estrutural real no token `badge` entre os 4 presets (a mais severa — afeta consumo mecânico/automatizado), e uma lacuna de contrato responsivo (`Sheet`) não reconciliada entre presets. Nenhum achado bloqueia a extração, mas 4 deles (F1–F4, mais F7) exigem decisão humana ou pequena correção de texto antes que um gerador — humano ou IA — possa seguir os spines sem ambiguidade residual.

**Contagem de achados por severidade:** Critical: 0 · High: 1 · Medium: 4 · Low: 2 (total 7)

---

## Veredito por categoria (as 8)

| # | Categoria | Veredito |
|---|---|---|
| 1 | Cobertura de Flow | adequate |
| 2 | Completude de token | **strong** |
| 3 | Cobertura de componente | adequate |
| 4 | Cobertura de estado | adequate |
| 5 | Cobertura de referência visual | adequate |
| 6 | Bloat/overespecificação | adequate |
| 7 | Disciplina de herança | adequate (cross-ref #3) |
| 8 | Encaixe de forma | adequate |

---

## Pass 1 — Cobertura Mecânica

### 1. Cobertura de Flow (EXPERIENCE.md) — **adequate**

| Flow | Protagonista nomeado | Passos numerados | Clímax marcado | Caminho de falha |
|---|---|---|---|---|
| 1 (1a+1b) — associar User↔Group | Renato (+ José Matos/Jairo Castro) | Sim (3 / 4) | Sim, nos dois sub-flows | Sim, nos dois ("já é membro" / linha some da seleção) |
| 2 — import CSV | Renato | Sim (5) | Sim | Sim (arquivo malformado) |
| 3 — Atribuir Papel por Módulo | Renato / José Matos | Sim (3, via Tela 1/2/3) | Sim | Sim (Cancelar, sem confirmação extra) |
| 4 — Revogar sessões | Renato | Sim (4) | Sim | Sim (falha de rede) |
| 5 — Godofredo gerencia Empresas | Godofredo | Sim (4) | Sim | **Ver achado F1** |

**F1 (Medium)** — Flow 5 é o único dos 5 cujo parágrafo de "Falha" não cobre uma falha da própria ação de clímax (disparar o convite de admin — ex. e-mail já em uso, falha de envio). Em vez disso, o parágrafo "Falha / segunda ação relacionada" pivota para uma ação totalmente distinta (desabilitar uma Empresa). Um consumidor que implemente Flow 5 literalmente não tem especificação do que acontece se "Adicionar admin" falhar — só sabe o que acontece numa ação não relacionada.
*Localização:* `EXPERIENCE.md`, seção Key Flows, Flow 5, parágrafo final.

Fora isso, os 5 flows batem o padrão de calibração (`experience-example-shadcn.md`/`experience-example-mobile.md`): protagonista nomeado, passos numerados, clímax em negrito, falha nomeada.

### 2. Completude de token (4 DESIGN.md) — **strong**

Todos os 18 pares de token de cor canônicos (16 do contrato shadcn + o par `success`/`success-foreground` estendido pela AD-13 em 2026-10-19) estão presentes **com valor OKLCH + comentário hex + variante `-dark`** nos 4 arquivos, sem excepção:

| Preset | 18 pares presentes c/ dark | `success`/`success-foreground` (+dark) |
|---|---|---|
| minimal-saas | Sim | Sim |
| acolhedor | Sim | Sim |
| tecnico-premium | Sim | Sim |
| autoral | Sim | Sim |

Toda referência `{colors.X}`, `{typography.X}`, `{rounded.X}`, `{spacing.X}` na prosa e no bloco `components:` de cada arquivo resolve para uma chave definida no próprio frontmatter — não há referência pendurada (dangling) em nenhum dos 4. Nenhum token de cor crítico (sem hex ou sem par claro/escuro) encontrado. Zero achados nesta categoria.

### 3. Cobertura de componente (EXPERIENCE.md + 4 DESIGN.md) — **adequate**

Todo componente citado em EXPERIENCE.md → Component Patterns (`tree-node`/`tree-node-selected`, `table-header`/`table-row-selected`, menu de contexto, `button-primary`/`button-secondary`, `input`, `form-field-error`, `dialog`, `badge`, formulário de CRUD por entidade) tem linha correspondente nos 4 DESIGN.md, com um achado real:

**F7 (High)** — O token `badge` tem **forma de YAML diferente em 3 padrões distintos**, não só nome diferente (a divergência já documentada em EXPERIENCE.md cobre só isso: "badge único com variante vs. badge/badge-success dedicado no tecnico-premium"):
- **minimal-saas**: `badge` é um objeto **plano único**, que já É a skin positiva/"habilitada" (`background: {colors.success}`); o estado "desabilitada" só existe em prosa, nunca ganha chave própria no frontmatter.
- **acolhedor** e **autoral**: `badge` é um objeto com **sub-chaves aninhadas `enabled`/`disabled`**.
- **tecnico-premium**: `badge` e `badge-success` são **duas chaves irmãs no nível raiz** — e aqui `badge` (sem qualificador) significa **neutro/metadado genérico** (chip de grupo), não positivo — papel semântico diferente do `badge` desqualificado dos outros 3 presets.

Adicionalmente, o tratamento visual do estado "desabilitada" diverge em intensidade sem isso ser declarado como decisão: minimal-saas/acolhedor/tecnico-premium usam contorno sutil (texto/borda `destructive` sobre fundo neutro), autoral usa fundo `destructive` sólido preenchido — mudança de registro que nenhum dos 4 textos marca como divergência intencional (ao contrário da divergência de nomenclatura, que o EXPERIENCE.md explicitamente reconhece e aceita).

**Impacto downstream:** um gerador de template (humano ou IA) que tente ler `badge`/`badge.disabled`/`badge-success` programaticamente por um único caminho de acesso não consegue — precisa de lógica especial por preset. É exatamente o tipo de inconsistência que o enunciado da tarefa chama de "implementação dos templates do gerador" — isto quebra consumo mecânico, não só estético.
*Localização:* frontmatter `components.badge` em `DESIGN-minimal-saas.md`, `DESIGN-acolhedor.md`, `DESIGN-tecnico-premium.md` (+ `badge-success`), `DESIGN-autoral.md`.

Fora esse ponto, os demais componentes (árvore, tabela, botões, input, erro de campo, diálogo) têm papel semântico idêntico nos 4 — inclusive o `Avatar` (tratado como incidental em minimal-saas/acolhedor, como primitiva herdada explícita em tecnico-premium, como componente próprio com gradiente em autoral) segue a mesma regra comportamental em todos (preenchimento = estado ativo), só variando o grau de formalização — não considerado achado por si.

### 4. Cobertura de estado (EXPERIENCE.md) — **adequate**

Superfícies da IA percorridas: árvore (+ 4 ramos), detalhe (User/Group/Role/Empresa), import CSV, modal Atribuir Papel.

| Superfície | Vazio | Carregando | Erro | Sem-permissão |
|---|---|---|---|---|
| Árvore (nível ramo) | Sim ("Ramo vazio") | Sim | Sim (busca sem resultado + falha de carga) | N/A, justificado (sem ACL por nó) |
| Painel de detalhe (nível ramo, seleção inicial) | Sim ("Nenhuma seleção") | Sim | Sim | N/A |
| **Sublistas dentro do detalhe** (Grupos do User, Papéis atribuídos, Membros do Group) | **Ver F2** | Não explicitado (herda "Carregando detalhe" genérico) | Não explicitado | N/A |
| Picker (mini-árvore de Módulo, navegador de Grupo-origem) | Sim (mensagem de busca sem resultado) | Sim | — | N/A |
| Import CSV | Prévia com contagem (não é bem "vazio") | Sim | Sim (malformado, só na narrativa do Flow, não na tabela de State Patterns) | N/A |
| Modal Atribuir Papel | — | Sim (picker) | Sim (validação) | N/A |

**F2 (Medium)** — A tabela de State Patterns cobre vazio/carregando/erro no nível de **ramo da árvore** ("Ramo vazio", "Carregando árvore") e no nível de **painel de detalhe como um todo** ("Nenhuma seleção", "Carregando detalhe"), mas não especifica o tratamento quando uma **sublista dentro do painel de detalhe** está vazia — ex. Flow 1b descreve explicitamente o grupo "Projeto Alpha" como recém-criado/vazio, mas nenhuma linha da tabela de State Patterns diz o que aparece na seção "Membros" antes do primeiro membro ser adicionado (nem o equivalente para "Grupos" vazio no detalhe de um User novo, ou "Papéis atribuídos" vazio). Um implementador fica sem a cópia/tratamento exatos para esse estado, que é usado na narrativa mas nunca especificado como estado reutilizável.
*Localização:* `EXPERIENCE.md`, seção State Patterns (lacuna de linha), referência cruzada com Flow 1b.

Achado secundário, menor, não elevado a item de severidade própria: a falha de upload de CSV malformado só aparece na narrativa do Flow 2 ("Falha: upload de arquivo não-CSV..."), não como linha própria na tabela de State Patterns — redundância inversa da categoria 6 (estado real existe, mas só documentado em um lugar).

### 5. Cobertura de referência visual — **adequate**

**`.working/` (desta sessão) — cobertura total, zero órfãos:**

| Arquivo | Citado em | O que ilustra, nomeado? |
|---|---|---|
| `direction-minimal-saas.html` | `DESIGN-minimal-saas.md` (Brand & Style, frontmatter) | Sim — "tradução direta... validada pelo Boss" |
| `direction-acolhedor.html` | `DESIGN-acolhedor.md` (frontmatter, Elevation) | Sim |
| `direction-tecnico-premium.html` | `DESIGN-tecnico-premium.md` (frontmatter) | Sim |
| `direction-autoral.html` | `DESIGN-autoral.md` (frontmatter, Colors) | Sim |
| `flow-atribuir-papel-modulo-2026-10-15.excalidraw` | `EXPERIENCE.md` (`sources` + IA, "3 telas, Key Flow 3") | Sim |

**`imports/tecton-directory-admin/` (herdado do projeto irmão) — 2 de 5 citados por nome de arquivo:**

| Arquivo | Citado por nome de arquivo em algum spine final? | Órfão |
|---|---|---|
| `tecton-EXPERIENCE.md` | Sim (`EXPERIENCE.md` `sources`, prosa em Inspiration & Anti-patterns) | Não |
| `tecton-DESIGN.md` | Sim (`DESIGN-minimal-saas.md` e `DESIGN-acolhedor.md`, por nome) | Não |
| `directory-admin.html` | **Não** — nenhuma citação por nome de arquivo em EXPERIENCE.md ou nos 4 DESIGN.md | **Sim** |
| `flow-directory-admin-2026-09-03.excalidraw` | **Não** | **Sim** |
| `novell-consoleone-v1.3-main-window-display.png` | **Não** | **Sim** |

**F3 (Medium)** — 3 dos 5 arquivos de `imports/tecton-directory-admin/` nunca são citados por nome de arquivo em nenhum dos spines finais, embora o conceito que ilustram (padrão ConsoleOne, mockup HTML do Tecton) seja referenciado genericamente ("Tecton", "ConsoleOne/NDS") em vários pontos. Um consumidor que tente rastrear "qual arquivo-fonte sustenta esta decisão visual" arquivo por arquivo não encontra citação direta para o mockup HTML do Tecton, o wireframe Excalidraw do Tecton, nem o PNG do ConsoleOne (a referência "North Star" original do Boss, segundo `.memlog.md`) — só o `.memlog.md` registra a importação desses 3 arquivos como evento, não os spines finais.
*Localização:* ausência de citação em `EXPERIENCE.md` e nos 4 `DESIGN-*.md`; arquivos vivem em `imports/tecton-directory-admin/`.

---

## Pass 2 — Julgamento

### 6. Bloat/overespecificação — **adequate**

**F5 (Low)** — Cada um dos 4 DESIGN.md termina a seção "Colors" com uma lista inline "Evitar"/"Avoid"/"Nunca" que duplica substancialmente regras já repetidas na tabela terminal "Do's and Don'ts" (ex. `DESIGN-autoral.md`: "Nunca: ...usar success fora do badge..." reaparece como linha da tabela final "Badge 'habilitado' em success... Don't: usar accent/muted"). Impacto downstream baixo (as duas dizem a mesma coisa), mas é spec restated em dois lugares do mesmo documento — risco de deriva se uma for editada sem a outra.
*Localização:* todos os 4 DESIGN.md, fim da seção "Colors" + tabela "Do's and Don'ts".

**F6 (Low)** — Em `DESIGN-minimal-saas.md` e `DESIGN-tecnico-premium.md`, o frontmatter `typography` repete a mesma string longa de pilha de fonte de sistema **verbatim** em cada papel tipográfico (heading, heading-sm, body, label, caption, button) em vez de um `fontFamily` default único + deltas de tamanho/peso por papel — padrão que os próprios arquivos usam em outro lugar (`rounded.DEFAULT`). Repetição mecânica sem ganho de informação por repetição; baixo impacto porque não introduz ambiguidade, só volume.
*Localização:* frontmatter `typography` em `DESIGN-minimal-saas.md` e `DESIGN-tecnico-premium.md`.

Nenhuma seção identificada que um consumidor downstream simplesmente não leria — as notas de "gap registrado"/"extrapolação"/"nota de tradução" (inclusive o apêndice não-normativo de tradução hex→OKLCH em `tecnico-premium`) são rastreabilidade genuína, explicitamente marcada como tal, e valiosa para quem for implementar — não bloat.

### 7. Disciplina de herança — **adequate** (cross-ref F7)

- `sources` do frontmatter de `EXPERIENCE.md` resolvem de verdade: `ARCHITECTURE-SPINE.md` (AD-13) ✓, `tecton-EXPERIENCE.md` ✓, `.memlog.md` ✓, o `.excalidraw` do Flow 3 ✓, os 4 `DESIGN-*.md` ✓ — todos os 5 caminhos existem e foram lidos.
- Nomes de componente entre EXPERIENCE.md e os 4 DESIGN.md batem por papel semântico em todos os casos **exceto** o já descrito em F7 (`badge`), que vai além de uma variação de nome e chega a uma variação de forma/papel semântico não reconhecida no texto.
- Toda referência de token do EXPERIENCE.md (`{colors.primary}`, `{colors.destructive}`, `{colors.success}`/`{colors.success-foreground}`) resolve por nome nos 4 DESIGN.md sem exceção.

A divergência de nomenclatura que o próprio EXPERIENCE.md reconhece e aceita (badge único vs. badge/badge-success) é, na verdade, evidência de **boa** disciplina — foi documentada, não just happened. O problema real (F7) é que a documentação da divergência é incompleta: cobre só o nome, não a mudança de forma/papel semântico do `badge` desqualificado.

### 8. Encaixe de forma — **adequate**

**Ordem canônica dos 4 DESIGN.md** (Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts): **100% conforme** nos 4 arquivos, sem exceção — inclusive o apêndice não-normativo de `tecnico-premium` vem depois de "Do's and Don'ts", sem quebrar a ordem.

**EXPERIENCE.md**: as 8 seções obrigatórias (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows) presentes e na ordem do padrão de calibração, mais Inspiration & Anti-patterns disparada e presente antes de Key Flows (mesma posição do exemplo `experience-example-shadcn.md`). Responsive & Platform ausente — justificado em texto por "desktop-first" e ausência de gatilho multi-superfície — **mas ver F4**.

**F4 (Medium)** — A primitiva shadcn `Sheet` (colapso de sidebar em viewport estreito) aparece na lista de primitivas herdadas "como estão" em **3 dos 4** DESIGN.md (`minimal-saas`, explicitamente anotado "sidebar em viewport estreito"; `acolhedor`; `autoral`), mas está **ausente** da lista equivalente em `tecnico-premium`. Ao mesmo tempo, `EXPERIENCE.md` omite inteiramente a seção "Responsive & Platform" e nunca define breakpoint, gatilho, ou mesmo se o Admin UI precisa suportar viewport estreito — a justificativa "desktop-first" não resolve a inconsistência entre os presets (por que 3 preveem fallback de sidebar e 1 não?). Downstream, isto deixa em aberto se o comportamento responsivo é um requisito real (e então falta no contrato comportamental e falta em 1 dos 4 presets visuais) ou um resíduo de boilerplate sem decisão por trás (e então deveria ser removido dos 3 que o citam).
*Localização:* `DESIGN-minimal-saas.md`, `DESIGN-acolhedor.md`, `DESIGN-autoral.md` (seção Components, lista de primitivas herdadas) vs. `DESIGN-tecnico-premium.md` (mesma lista, sem `Sheet`); `EXPERIENCE.md` (ausência de seção Responsive & Platform / regra de breakpoint).

---

## Tabela consolidada de achados

| ID | Severidade | Categoria | Arquivo(s) | Resumo |
|---|---|---|---|---|
| F7 | **High** | #3 Componente / #7 Herança | 4x `DESIGN-*.md`, `components.badge` | Token `badge` tem 3 formas de YAML distintas entre presets, e em `tecnico-premium` o `badge` desqualificado muda de papel semântico (neutro vs. positivo) sem isso ser reconhecido como divergência |
| F1 | Medium | #1 Flow | `EXPERIENCE.md`, Flow 5 | Falha do Flow 5 não cobre a própria ação de clímax (convite), pivota para ação não relacionada (desabilitar Empresa) |
| F2 | Medium | #4 Estado | `EXPERIENCE.md`, State Patterns | Sem estado especificado para sublistas vazias dentro do painel de detalhe (Grupos/Papéis/Membros com zero itens) |
| F3 | Medium | #5 Referência visual | `imports/tecton-directory-admin/` | 3 de 5 arquivos importados do Tecton nunca citados por nome de arquivo nos spines finais |
| F4 | Medium | #8 Forma | 4x `DESIGN-*.md`, `EXPERIENCE.md` | `Sheet` (fallback responsivo) presente em 3/4 presets, ausente em 1, sem contrato comportamental em EXPERIENCE.md |
| F5 | Low | #6 Bloat | 4x `DESIGN-*.md` | "Evitar/Nunca" inline em Colors duplica a tabela final Do's and Don'ts |
| F6 | Low | #6 Bloat | `DESIGN-minimal-saas.md`, `DESIGN-tecnico-premium.md` | Pilha de fonte repetida verbatim em cada papel tipográfico em vez de default + deltas |

**Critical: 0 · High: 1 · Medium: 4 · Low: 2**

Nenhum achado impede a extração direta do contrato por um consumidor downstream hoje; F7, F1, F2 e F4 são os que mais valem resolver antes da implementação dos templates do gerador, por tocarem exatamente o tipo de ambiguidade que um consumo automatizado (não só humano) tropeçaria primeiro.
