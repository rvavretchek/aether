---
name: "Aether Admin UI — Autoral"
description: 'Preset visual "Autoral/Distintivo" (1 dos 4 escolhíveis em `aether-admin new`, AD-13) para a Admin UI do Aether — camada de marca sobre shadcn/ui + Tailwind CSS v4; este DESIGN.md especifica só o delta de marca, não reimplementa shadcn do zero.'
colors:
  # ---- Tema claro (default) ----
  # Nomenclatura = convenção canônica shadcn/ui (AD-13). Cada valor é OKLCH
  # convertido fielmente do esboço .working/direction-autoral.html (hex original
  # em comentário, só como referência de proveniência — não é o contrato).
  background: 'oklch(94.7% 0.010 81.8)' # ref #F1EDE6 — bege-pedra claro
  foreground: 'oklch(23.1% 0.025 329.4)' # ref #241923 — ink-ameixa quase-preto
  card: 'oklch(100% 0 89.9)' # ref #FFFFFF
  card-foreground: 'oklch(23.1% 0.025 329.4)' # = foreground
  popover: 'oklch(100% 0 89.9)' # = card
  popover-foreground: 'oklch(23.1% 0.025 329.4)' # = foreground
  muted: 'oklch(96.0% 0.012 79.8)' # ref #F6F1E9 — creme para chrome secundário
  muted-foreground: 'oklch(55.1% 0.016 355.4)' # ref #7A6E72
  border: 'oklch(89.7% 0.018 81.3)' # ref #E3DCD0
  input: 'oklch(89.7% 0.018 81.3)' # = border (convenção shadcn)
  ring: 'oklch(68.0% 0.139 75.5)' # = primary
  primary: 'oklch(68.0% 0.139 75.5)' # ref #C98A12 — âmbar dourado, 1º stop do gradiente de assinatura
  primary-foreground: 'oklch(100% 0 89.9)' # ref #FFFFFF
  accent: 'oklch(94.4% 0.050 86.9)' # ref #FBEBC7 — lavagem âmbar suave (fundo de seleção/chip)
  accent-foreground: 'oklch(39.6% 0.127 5.2)' # ref #7A1F3D — vinho profundo, 2º stop do gradiente de assinatura
  destructive: 'oklch(46.6% 0.149 25.1)' # ref #9C2B2B
  destructive-foreground: 'oklch(100% 0 89.9)' # ref #FFFFFF
  success: 'oklch(43.5% 0.095 142.0)' # verde-musgo terroso/profundo — token novo (extensão AD-13, sem correspondência no esboço .working/direction-autoral.html; ver nota em Colors)
  success-foreground: 'oklch(100% 0 89.9)' # = primary-foreground/destructive-foreground (branco)
  # ---- Tema escuro (par nativo, convenção `-dark`) ----
  background-dark: 'oklch(18.6% 0.022 311.5)' # ref #16101A — ink-ameixa profundo
  foreground-dark: 'oklch(94.9% 0.010 67.7)' # ref #F3EDE7
  card-dark: 'oklch(22.2% 0.022 315.7)' # ref #1F1822
  card-foreground-dark: 'oklch(94.9% 0.010 67.7)' # = foreground-dark
  popover-dark: 'oklch(22.2% 0.022 315.7)' # = card-dark
  popover-foreground-dark: 'oklch(94.9% 0.010 67.7)' # = foreground-dark
  muted-dark: 'oklch(25.1% 0.027 315.3)' # ref #271E2B
  muted-foreground-dark: 'oklch(71.8% 0.022 340.9)' # ref #AE9FA8
  border-dark: 'oklch(31.9% 0.036 316.5)' # ref #3A2D3F
  input-dark: 'oklch(31.9% 0.036 316.5)' # = border-dark
  ring-dark: 'oklch(87.9% 0.162 90.9)' # = primary-dark
  primary-dark: 'oklch(87.9% 0.162 90.9)' # ref #FFD23F — âmbar, mais saturado/claro no escuro
  primary-foreground-dark: 'oklch(22.5% 0.050 66.0)' # ref #2B1600 — ink marrom-escuro
  accent-dark: 'oklch(29.8% 0.042 73.8)' # ref #3A2A14 — lavagem âmbar escura
  accent-foreground-dark: 'oklch(64.6% 0.179 359.8)' # ref #E0558A — rosa-magenta (2º stop no escuro)
  destructive-dark: 'oklch(73.3% 0.136 25.3)' # ref #F2847C
  destructive-foreground-dark: 'oklch(18.6% 0.022 311.5)' # extrapolado = background-dark (ver nota em Colors)
  success-dark: 'oklch(76.0% 0.130 142.0)' # verde-musgo mais claro/saturado no escuro — mesma escalada de luminosidade dos demais pares (primary-dark, destructive-dark)
  success-foreground-dark: 'oklch(18.6% 0.022 311.5)' # = background-dark (ink-ameixa) — mesma lógica de destructive-foreground-dark
typography:
  # body/label/muted/caption herdam a pilha sans padrão do Tailwind/shadcn
  # (ui-sans-serif/system-ui/-apple-system/Segoe UI/Roboto/Helvetica/Arial) —
  # sem override. Só o papel `display` ganha a serifada de marca.
  display:
    fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif'
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  display-sm:
    fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif'
    fontSize: 15px
    fontWeight: '700'
    lineHeight: '1.25'
rounded:
  # shadcn deriva sm/md/lg de --radius por calc(); aqui a escala é explícita
  # porque o preset usa cantos mais generosos que o default shadcn (6/8/12 em
  # vez de 4/6/8) — ver seção Shapes.
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
  DEFAULT: 8px
spacing:
  # Escala de 4px padrão Tailwind/shadcn herdada sem override — nenhum
  # espaçamento nomeado de marca foi identificado no esboço além do grid comum.
components:
  tree-node:
    foreground: '{colors.foreground}'
    radius: '{rounded.sm}'
  tree-node-selected:
    background: '{colors.accent}'
    foreground: '{colors.accent-foreground}'
    borderLeft: '3px solid {colors.primary}'
    radius: '{rounded.sm}'
  table-header:
    foreground: '{colors.muted-foreground}'
    borderBottom: '2px solid {colors.border}'
    fontWeight: '700'
  table-row-selected:
    background: '{colors.accent}'
    borderLeft: '3px solid {colors.primary}'
  button-primary:
    background: 'linear-gradient(135deg, {colors.primary} 0%, {colors.accent-foreground} 100%)'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
  button-secondary:
    background: 'transparent'
    foreground: '{colors.foreground}'
    border: '1px solid {colors.border}'
    radius: '{rounded.md}'
  input:
    background: '{colors.muted}'
    border: '1px solid {colors.border}'
    radius: '{rounded.sm}'
  form-field-error:
    foreground: '{colors.destructive}'
    fontSize: '12px'
  dialog:
    background: '{colors.card}'
    borderTop: '4px solid; border-image: linear-gradient(135deg, {colors.primary}, {colors.accent-foreground}) 1'
    radius: '{rounded.xl}'
  badge:
    enabled:
      background: '{colors.success}'
      foreground: '{colors.success-foreground}'
    disabled:
      background: '{colors.destructive}'
      foreground: '{colors.destructive-foreground}'
    radius: '{rounded.full}'
---

## Brand & Style

"Autoral/Distintivo" é o mais ousado dos 4 presets visuais do Aether Admin (AD-13) — o registro pensado para parecer peça de showroom, não só mais um admin denso. A postura comportamental de árvore+detalhe mestre-detalhe (herdada do padrão ConsoleOne/Tecton) continua igual nos 4 presets; o que muda aqui é a camada de identidade: um gradiente de assinatura **âmbar dourado → vinho profundo**, repetido em micro-escala onde a interface precisa marcar ênfase ou seleção (botão primário, avatar ativo, borda esquerda do nó selecionado, barra superior de diálogo), sobre uma base neutra **ink-ameixa** (nem azul corporativo, nem roxo-SaaS óbvio). Títulos e nomes de entidade usam uma serifada editorial (`{typography.display}`) que contrasta com o corpo em sans-serif — um momento de caráter, não a voz padrão do texto corrido.

Este DESIGN.md herda shadcn/ui + Tailwind CSS v4 (primitiva Radix, componentes vendorizados — AD-13) **por completo** como base; documenta só o delta de marca. Os 16 tokens de cor canônicos do shadcn (ver `colors` acima) são todos preenchidos aqui porque este preset os sobrescreve de ponta a ponta (é a definição da Camada 0 "autoral", não um ajuste pontual) — mas a estrutura, os nomes de token e o mecanismo (`--background`, `--primary`, etc., par `-dark` nativo) são exatamente o contrato shadcn, nunca vocabulário inventado. O par `success`/`success-foreground` (+ par `-dark`) é uma extensão do contrato canônico além desses 16 tokens base — decisão do Boss aplicada de forma consistente aos 4 presets da AD-13, não uma invenção isolada deste documento.

**Primitivos shadcn usados tal como vêm (sem override de marca):** `Separator`, `Sheet`, `Popover`, `DropdownMenu`, `Toast`, `Tabs`, `Checkbox`, `Switch`, `Command`. Qualquer customização nesses componentes é contra a disciplina deste preset.

**Primitivos com override de marca** (cobertos na seção Components abaixo): `Button` (variante primary ganha o gradiente de assinatura), `Dialog` (barra superior em gradiente + cantos `xl`), `Avatar` (estado ativo/selecionado ganha preenchimento em gradiente — ver nota em Components), `Badge`, `Input`/`Select` (fundo `muted` + cantos `sm`), `Table` (cabeçalho + linha selecionada), e um componente de árvore bespoke (não é primitivo shadcn — construído sob medida, mesmo padrão herdado do `tecton-EXPERIENCE.md`).

## Colors

- **`primary` (Âmbar Dourado, `oklch(68.0% 0.139 75.5)` claro / `oklch(87.9% 0.162 90.9)` escuro — ref. `#C98A12` / `#FFD23F`)** — 1º stop do gradiente de assinatura. Usado em botões primários, foco (`ring`), e como borda esquerda de 3px do nó de árvore selecionado. Nunca usado isolado para decorar chrome neutro.
- **`accent-foreground` (Vinho Profundo, `oklch(39.6% 0.127 5.2)` claro / rosa-magenta `oklch(64.6% 0.179 359.8)` escuro — ref. `#7A1F3D` / `#E0558A`)** — 2º stop do mesmo gradiente, e também o texto legível sobre `accent`. O **gradiente de assinatura** (`linear-gradient(135deg, {colors.primary} 0%, {colors.accent-foreground} 100%)`) aparece em: preenchimento do botão primário, preenchimento do avatar quando o registro está ativo/selecionado, borda superior de diálogos, e a barra de destaque de 4px no topo do app shell. O esboço original tinha um stop intermediário mais claro (`#F2B705` claro / `#F2A33E` escuro — `oklch(81.1% 0.166 85.0)` / `oklch(77.6% 0.146 68.7)`) que não foi promovido a token canônico por não ter uso isolado fora do próprio gradiente; onde a implementação quiser preservar esse brilho intermediário, é uma parada adicional de gradiente usando esse valor de referência, documentada aqui só em prosa.
- **`accent` (lavagem âmbar suave, `oklch(94.4% 0.050 86.9)` claro / `oklch(29.8% 0.042 73.8)` escuro — ref. `#FBEBC7` / `#3A2A14`)** — fundo de destaque suave: linha de árvore selecionada, chip de grupo (não o badge de status "habilitado"/"desabilitado" — esse par usa `success`/`destructive`, ver abaixo), item de menu em destaque. Sempre pareado com `accent-foreground` para contraste de texto.
- **`background`/`foreground`** — base da tela: bege-pedra claro / ink-ameixa profundo no escuro, texto quase-preto / quase-branco quente.
- **`card`/`popover`** — superfícies elevadas (painel de detalhe, modal, dropdown): branco puro no claro, um tom de ameixa ligeiramente mais claro que `background` no escuro — nunca idêntico a `background`, para manter separação de camada visível.
- **`muted`/`muted-foreground`** — chrome secundário: fundo da sidebar, campo de input/select, texto de anotação (e-mail, texto auxiliar). Nunca para texto principal.
- **`border`/`input`** — divisórias entre árvore e detalhe, bordas de card/input. Mesmo valor nos dois tokens (convenção shadcn).
- **`destructive`/`destructive-foreground`** — vermelho terroso claro / coral-salmão escuro, reservado a ações destrutivas (ex. "Revogar sessões") e erro de validação. **Lacuna registrada**: o esboço HTML não mostra nenhum elemento com fundo `destructive` preenchido (só texto `--danger` em botão ghost) — `destructive-foreground-dark` foi extrapolado como igual a `background-dark` (ink-ameixa) para garantir contraste sobre o coral-salmão claro do `destructive-dark`; esse par não foi validado visualmente pelo Boss e deve ser conferido na primeira implementação real.
- **`success`/`success-foreground` (Verde-Musgo Terroso, `oklch(43.5% 0.095 142.0)` claro / `oklch(76.0% 0.130 142.0)` escuro)** — extensão do contrato canônico (AD-13) introduzida pelo Boss para o par de status "habilitado"/"desabilitado" de badge, consistente nos 4 presets. Hue escolhido deliberadamente mais terroso/profundo (baixo chroma, ~142° na roda OKLCH) do que um verde vívido genérico, para não competir com o gradiente de assinatura âmbar→vinho nem destoar da base ink-ameixa — não há correspondência no esboço `.working/direction-autoral.html` (token novo, sem hex de proveniência). `success-foreground` reaproveita o mesmo branco de `primary-foreground`/`destructive-foreground` no claro; no escuro reaproveita `background-dark` (ink-ameixa), mesma lógica de `destructive-foreground-dark`. Uso exclusivo: badge "habilitado" (ver Components). Nunca para seleção/ênfase — esse é papel de `primary`/`accent`.

Shadows/elevação usam uma cor de sombra **tingida de ameixa**, não preto neutro — documentado em prosa na seção Elevation & Depth, não como token `colors` (o campo `colors` do frontmatter é só preenchimento sólido, não cor com alfa de sombra).

**Nunca**: usar `accent`/`accent-foreground` para estado de erro ou permissão (só para seleção/ênfase "isto é especial"); usar `destructive` para o gradiente de assinatura; introduzir uma 3ª cor de marca além de âmbar e vinho; usar `success` fora do badge de status "habilitado" (não é cor de seleção, ênfase ou decoração).

## Typography

Corpo, rótulo e texto auxiliar herdam a pilha sans padrão do Tailwind/shadcn sem override — este preset não troca a fonte de leitura corrida. Só o papel **`display`** (serifada `Georgia`/`Iowan Old Style`/`Palatino`, fallback `Times New Roman`) é de marca, aparecendo em:

- Nome da entidade no cabeçalho do painel de detalhe (usuário/grupo/papel/empresa selecionado) — `{typography.display}`
- Título de diálogo/modal (ex. "Atribuir Papel") — `{typography.display-sm}`
- Wordmark "Aether Admin" no topo da sidebar — `{typography.display-sm}`

A serifada é pontuação editorial, não a voz padrão — texto de tabela, label de campo, chip e texto auxiliar continuam 100% sans-serif.

## Layout & Spacing

Escala de espaçamento 4px padrão Tailwind/shadcn herdada sem override. Layout mestre-detalhe de dois painéis (árvore à esquerda ~276px fixo, painel de detalhe fluido à direita) — mesmo padrão comportamental dos 4 presets, herdado do ConsoleOne/Tecton. Sem breakpoint de marca definido aqui; a definição de Foundation/responsividade é escopo do `EXPERIENCE.md` (desktop-first, mesmo racional do `tecton-EXPERIENCE.md`).

## Elevation & Depth

Duas camadas de elevação, ambas com sombra **tingida de ameixa** em vez do preto neutro do shadcn default — reforça a base ink-ameixa em vez de parecer uma sombra genérica de qualquer app:

- **Repouso** (card, frame do app shell): sombra difusa suave, ref. `rgba(50, 20, 30, 0.14)` claro — equivalente tingido no escuro é mais sutil (superfícies escuras já têm pouco contraste de sombra utilizável, a separação vem mais de `border`/`card` vs. `background`).
- **Overlay** (diálogo/modal): sombra mais larga e mais escura, ref. `rgba(30, 10, 20, 0.3)` claro — comunica "isto flutua acima de tudo".

Esses valores de sombra são documentados aqui só em prosa (referência de proveniência), não promovidos a token `colors` — o campo `colors` do frontmatter é tokens de preenchimento sólido; cor de sombra com alfa é tratada como detalhe de implementação do componente `dialog`/`card`, não um token reutilizável nomeado.

## Shapes

Cantos mais generosos que o default shadcn (que deriva sm/md/lg de `calc(var(--radius) ± 2px/4px)` a partir de um `--radius` único, tipicamente 6px): aqui a escala é explícita e maior — `sm` 6px (nó de árvore, campo de input), `md` 8px (botões, select), `lg` 12px (cards, avatar grande, frame do app), `xl` 16px (diálogo/modal), `full` (badge/chip). A leitura é "showroom poído", não "ferramenta densa" — o oposto deliberado da crispness do preset `tecnico-premium`.

## Components

- **`tree-node` / `tree-node-selected`** — nó em repouso: texto `{colors.foreground}`, sem fundo. Nó selecionado: fundo `{colors.accent}` (lavagem âmbar suave), texto `{colors.accent-foreground}` (vinho/magenta) em negrito, borda esquerda de 3px em `{colors.primary}` — no esboço original essa borda é um gradiente vertical sutil de `primary` para `accent-foreground` (`border-image: linear-gradient(180deg, {colors.primary}, {colors.accent-foreground})`); a versão sólida em `{colors.primary}` é a simplificação aceitável onde o componente de árvore não suportar `border-image`.
- **`table-header`** — texto `{colors.muted-foreground}`, versalete (uppercase, tracking largo), peso 700, borda inferior de 2px em `{colors.border}`.
- **`table-row-selected`** — extrapolado do mesmo padrão do nó de árvore selecionado (o esboço só mostra a 1ª linha de uma tabela de papéis com esse tratamento, não um estado de seleção de tabela genérico): fundo `{colors.accent}`, borda esquerda de 3px em `{colors.primary}`. **Lacuna registrada**: não há validação visual do Boss especificamente para seleção de linha em `TanStack Table` (o esboço mostra só o padrão análogo em árvore) — extrapolação de baixo risco por reusar o mesmo vocabulário visual já aprovado, mas não é um "sim" literal do Boss para este componente específico.
- **`button-primary`** — preenchimento em gradiente de assinatura (`{colors.primary}` → `{colors.accent-foreground}`, 135°), texto `{colors.primary-foreground}`, cantos `{rounded.md}`.
- **`button-secondary`** — fundo transparente, texto `{colors.foreground}`, borda 1px `{colors.border}`, cantos `{rounded.md}` (variante "outline/ghost" do esboço — não a variante `secondary` preenchida com `muted` que o shadcn default usaria; override deliberado deste preset).
- **`input`** — fundo `{colors.muted}` (não `background`/`card` — reforça "campo preenchido", não "campo em branco flutuante"), borda 1px `{colors.border}`, cantos `{rounded.sm}`.
- **`form-field-error`** — texto `{colors.destructive}`, tamanho 12px, aparece abaixo do campo; a borda do input em estado de erro troca para `{colors.destructive}`.
- **`dialog`** — fundo `{colors.card}`, cantos `{rounded.xl}`, barra superior de 4px no gradiente de assinatura (`border-top` com `border-image: linear-gradient(135deg, {colors.primary}, {colors.accent-foreground})`). Título usa `{typography.display-sm}`.
- **`badge`** — par binário de status (ex. "Empresa habilitada"/"Empresa desabilitada", chip de grupo). Variante **habilitado**: fundo `{colors.success}`, texto `{colors.success-foreground}`, cantos `{rounded.full}`, peso 700. Variante **desabilitado**: fundo `{colors.destructive}`, texto `{colors.destructive-foreground}`, mesmos cantos/peso. Este par `success`/`destructive` é extensão do contrato AD-13 decidida pelo Boss para os 4 presets — substitui o par `accent`/`muted` que uma revisão anterior deste documento usava (o `accent` ali violava a própria disciplina deste preset de reservar `accent` só para seleção/ênfase, nunca para indicar estado de permissão; ver **Nunca** em Colors). Não há mais variante neutra/muted de badge "desabilitado" neste preset — desabilitado agora é sinalizado como oposição direta a habilitado, não como estado neutro.
- **Avatar (fora da lista pedida, mas parte inseparável da assinatura visual)** — em repouso usa `{colors.muted}`/`{colors.muted-foreground}`; no estado ativo/selecionado (o mesmo gatilho de `tree-node-selected`) ganha preenchimento no gradiente de assinatura com texto `{colors.primary-foreground}`. Não tokenizado separadamente porque segue 1:1 as mesmas regras de `tree-node-selected` + `button-primary` — não é um componente com vocabulário de cor próprio.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Usar o gradiente de assinatura (`{colors.primary}` → `{colors.accent-foreground}`) só nos pontos de ênfase máxima: botão primário, avatar ativo, barra de diálogo, borda de seleção | Aplicar o gradiente em chrome neutro, fundo de página ou texto corrido |
| Reservar `{typography.display}`/`display-sm` para nome de entidade, título de diálogo e wordmark | Usar a serifada em texto de tabela, label ou texto auxiliar |
| Badge "habilitado" em `{colors.success}`, "desabilitado" em `{colors.destructive}` (par binário de status) | Usar `{colors.accent}`/`{colors.muted}` para indicar estado habilitado/desabilitado — esses tokens são reservados a seleção/ênfase e chrome secundário, não a status |
| Cantos generosos (`sm` 6 / `md` 8 / `lg` 12 / `xl` 16) em toda a superfície | Usar a escala crispada de 4/6/8 do `tecnico-premium` — dilui a diferenciação entre presets |
| Sombra tingida de ameixa (ref. `rgba(50,20,30,…)` / `rgba(30,10,20,…)`) | Sombra preta neutra padrão shadcn — perde a assinatura de base ink-ameixa |
| Herdar shadcn tal como vem em `Separator`/`Sheet`/`Popover`/`DropdownMenu`/`Toast`/`Tabs`/`Checkbox`/`Switch`/`Command` | Reescrever esses primitivos "só para combinar" — a disciplina é não tocar no que não precisa de marca |
