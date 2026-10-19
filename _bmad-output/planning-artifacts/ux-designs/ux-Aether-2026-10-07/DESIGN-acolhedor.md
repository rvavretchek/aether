---
name: "Aether Admin UI — Acolhedor e Confiável"
description: "Preset visual 'Acolhedor e Confiável' (1 dos 4 presets de Camada 0, AD-13) para a Admin UI do Aether — base shadcn/ui + Tailwind CSS v4 (Radix UI, vendorizado); este DESIGN.md especifica só a camada de marca (cores, tipografia, raio) sobre esse contrato, não reimplementa shadcn do zero."
colors:
  # Convenção canônica shadcn (AD-13) — nomes nunca inventados. Luz/escuro como
  # pares `token`/`token-dark`. Hex original do esboço .working/direction-acolhedor.html
  # comentado ao lado de cada valor OKLCH para rastreabilidade; OKLCH é o contrato
  # (Tailwind v4, config CSS-first via @theme) — hex nunca entra no código gerado.
  background: 'oklch(98.35% 0.0090 78.28)'        # #FDF9F3 (--bg claro)
  background-dark: 'oklch(23.08% 0.0109 60.90)'   # #211C18 (--bg escuro)
  foreground: 'oklch(31.09% 0.0269 66.57)'        # #3A2E22 (--text claro)
  foreground-dark: 'oklch(93.86% 0.0194 72.57)'   # #F3E9DD (--text escuro)
  card: 'oklch(100% 0 89.88)'                     # #FFFFFF (--panel claro)
  card-dark: 'oklch(26.68% 0.0129 51.62)'         # #2B2420 (--panel escuro)
  card-foreground: 'oklch(31.09% 0.0269 66.57)'   # = foreground
  card-foreground-dark: 'oklch(93.86% 0.0194 72.57)' # = foreground-dark
  popover: 'oklch(100% 0 89.88)'                  # = card (modal usa --panel no esboço)
  popover-dark: 'oklch(26.68% 0.0129 51.62)'      # = card-dark
  popover-foreground: 'oklch(31.09% 0.0269 66.57)' # = foreground
  popover-foreground-dark: 'oklch(93.86% 0.0194 72.57)' # = foreground-dark
  primary: 'oklch(67.24% 0.1308 38.76)'           # #D97757 (--accent claro, terracota)
  primary-dark: 'oklch(74.83% 0.1257 41.35)'      # #F0916D (--accent escuro)
  primary-foreground: 'oklch(100% 0 89.88)'       # #FFFFFF (--accent-text claro)
  primary-foreground-dark: 'oklch(21.41% 0.0219 43.60)' # #221611 (--accent-text escuro)
  muted: 'oklch(96.25% 0.0203 74.66)'             # #FBF1E4 (--panel-alt claro)
  muted-dark: 'oklch(29.70% 0.0170 55.64)'        # #342B25 (--panel-alt escuro)
  muted-foreground: 'oklch(59.06% 0.0368 69.97)'  # #8C7A66 (--text-muted claro)
  muted-foreground-dark: 'oklch(72.88% 0.0351 70.17)' # #B6A490 (--text-muted escuro)
  border: 'oklch(90.87% 0.0303 78.77)'            # #ECDFCB (--border claro)
  border-dark: 'oklch(35.92% 0.0248 59.44)'       # #473A30 (--border escuro)
  input: 'oklch(90.87% 0.0303 78.77)'             # = border (esboço usa --border na borda dos campos)
  input-dark: 'oklch(35.92% 0.0248 59.44)'        # = border-dark
  ring: 'oklch(67.24% 0.1308 38.76)'              # = primary (não desenhado no esboço estático; convenção shadcn — anel de foco usa a cor de marca)
  ring-dark: 'oklch(74.83% 0.1257 41.35)'         # = primary-dark
  accent: 'oklch(93.13% 0.0333 54.17)'            # #FBE3D4 (--accent-soft claro)
  accent-dark: 'oklch(34.51% 0.0369 42.27)'       # #4A332A (--accent-soft escuro)
  accent-foreground: 'oklch(67.24% 0.1308 38.76)' # #D97757 — mesmo valor de `primary`; ver nota em Colors
  accent-foreground-dark: 'oklch(74.83% 0.1257 41.35)' # = primary-dark
  destructive: 'oklch(57.52% 0.1493 31.61)'       # #C1503D (--danger claro)
  destructive-dark: 'oklch(76.87% 0.1050 37.70)'  # #EE9C83 (--danger escuro)
  destructive-foreground: 'oklch(100% 0 89.88)'   # #FFFFFF — não desenhado no esboço (só há botão ghost-danger); inferido do par shadcn padrão
  destructive-foreground-dark: 'oklch(21.41% 0.0219 43.60)' # #221611 — reaproveita o mesmo marrom escuro de primary-foreground-dark (texto escuro sobre superfície clara em modo escuro)
  success: 'oklch(91.00% 0.0320 122.00)'          # #DDE5CE (par novo, AD-13 — ver nota em Colors) — tingido sálvia/creme claro, mesmo papel de "fundo suave" que `accent`
  success-dark: 'oklch(29.00% 0.0280 125.00)'     # #282E1F — superfície escura tingida de sálvia, mesmo papel de `accent-dark`
  success-foreground: 'oklch(43.00% 0.0800 125.00)' # #465722 — verde-oliva/sálvia profundo, legível como texto sobre `success`, `muted` ou `background`
  success-foreground-dark: 'oklch(77.00% 0.0850 125.00)' # #A8BE82 — verde-sálvia claro, legível sobre `success-dark`/`muted-dark`
typography:
  # Único papel de marca realmente autoral deste preset: a família "rounded sans"
  # substitui o Geist Sans default do shadcn em todos os papéis — é o que dá a
  # sensação "acolhedor" (cantos de letra macios, não só cantos de componente).
  # Tamanhos ficam próximos da escala default do shadcn (corpo ~14px, rótulo ~12px,
  # título ~20px); `mono` não é sobrescrito (shadcn default), não há uso de
  # identificador técnico (UUID/objectClass) na superfície deste preset.
  body:
    fontFamily: 'ui-rounded, "SF Pro Rounded", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 13.5px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: 'ui-rounded, "SF Pro Rounded", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 11.5px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: 0.06em
  heading:
    fontFamily: 'ui-rounded, "SF Pro Rounded", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 19px
    fontWeight: '700'
    lineHeight: '1.25'
rounded:
  # Visivelmente mais arredondado que o default shadcn (sm 4 / md 6 / lg 8) — é a
  # segunda marca registrada do preset, ao lado da paleta terracota.
  sm: 10px
  md: 12px
  lg: 14px
  xl: 16px
  2xl: 22px
  full: 9999px
  DEFAULT: 14px
spacing:
  # Escala default do Tailwind v4 (4px-based: 4/8/12/16/20/24/28/32/36/40/48/64)
  # herdada sem override de valor — a generosidade do preset ("espaçamento
  # generoso", ver Brand & Style) vem de ESCOLHER os degraus mais largos dessa
  # mesma escala (20/28/32px) pra padding de cartão/diálogo/painel, não de inventar
  # uma escala nova. Ver Layout & Spacing.
components:
  tree-node:
    foreground: '{colors.muted-foreground}'
    fontFamily: '{typography.body.fontFamily}'
    fontSize: '{typography.body.fontSize}'
    radius: '{rounded.md}'
  tree-node-selected:
    background: '{colors.card}'
    foreground: '{colors.primary}'
    fontWeight: '700'
    radius: '{rounded.md}'
    shadow: 'sm'
  table-header:
    foreground: '{colors.muted-foreground}'
    fontFamily: '{typography.label.fontFamily}'
    fontSize: '{typography.label.fontSize}'
    letterSpacing: '{typography.label.letterSpacing}'
  table-row-selected:
    background: '{colors.accent}'
    foreground: '{colors.accent-foreground}'
    fontWeight: '700'
    radius: '{rounded.sm}'
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.lg}'
    shadow: 'sm'
  button-secondary:
    background: '{colors.muted}'
    foreground: '{colors.foreground}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
  input:
    background: '{colors.muted}'
    foreground: '{colors.foreground}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
  form-field-error:
    foreground: '{colors.destructive}'
    border: '{colors.destructive}'
    fontFamily: '{typography.label.fontFamily}'
    fontSize: '{typography.label.fontSize}'
  dialog:
    background: '{colors.popover}'
    foreground: '{colors.popover-foreground}'
    radius: '{rounded.2xl}'
    shadow: 'lg'
  badge:
    enabled:
      background: '{colors.success}'
      foreground: '{colors.success-foreground}'
    disabled:
      background: '{colors.muted}'
      foreground: '{colors.destructive}'
      border: '{colors.border}'
    radius: '{rounded.full}'
---

## Brand & Style

"Acolhedor e Confiável" é a leitura de uma ferramenta corporativa que não intimida: cantos bem arredondados (letra e componente), paleta quente em terracota sobre papel creme, e sombras suaves e tingidas de calor em vez de cinza neutro — cada cartão "flutua" levemente para guiar o olhar sem parecer frio. A densidade de informação do mestre-detalhe (árvore + painel de detalhe) se mantém intacta — é a mesma Information Architecture dos outros 3 presets — mas embrulhada em espaçamento generoso e tipografia "rounded sans", convidando ao uso diário em vez de impor a frieza de console técnico que o Tecton herdou do ConsoleOne.

Este preset herda shadcn/ui + Tailwind v4 (Radix UI, componentes vendorizados — AD-13) quase por completo. A camada de marca aqui é: (1) recolorir os tokens canônicos para a paleta terracota/creme, com par claro/escuro nativo; (2) trocar a família tipográfica do Geist Sans default por uma pilha "rounded sans" (`ui-rounded`/SF Pro Rounded); (3) abrir o raio de canto bem além do default shadcn (22px no maior, contra ~8–10px do shadcn puro). Fora esses três deltas, qualquer primitivo shadcn que não apareça na seção Components abaixo é usado sem alteração.

## Colors

- **`background`/`foreground`** — papel creme quente (`#FDF9F3` claro / `#211C18` escuro) e tinta marrom-escura (`#3A2E22` claro / creme `#F3E9DD` escuro). Base de toda tela; nunca usados para ênfase.
- **`card`/`card-foreground`, `popover`/`popover-foreground`** — mesmo branco puro (claro) / marrom-carvão (escuro) do painel de detalhe, linhas de tabela e do diálogo modal. O esboço não distingue painel de cartão e painel de popover/diálogo — ambos herdam o mesmo par de valores aqui; se um popover futuro precisar de contraste próprio contra o `card` que o contém, essa é uma decisão de Camada 1 (override pelo dev), não deste preset.
- **`primary`/`primary-foreground`** — o terracota (`#D97757` claro / `#F0916D` escuro) é a ÚNICA cor de ênfase de ação do preset. Usado em botão primário (Atribuir Papel, Confirmar), no texto+avatar do item ativo da árvore, e como `ring` de foco. Nunca usado decorativamente nem para indicar status positivo/negativo (isso é papel do par `accent`/`destructive` — ver abaixo).
- **`muted`/`muted-foreground`** — o creme mais escuro (`#FBF1E4`/`#8C7A66` claro, `#342B25`/`#B6A490` escuro) que pinta a barra lateral, as seções do painel de detalhe (fundo dos cartões "Grupos"/"Papéis atribuídos"), o botão secundário/ghost e o rótulo de seção. É o chão visual da "superfície secundária" em todo o preset — nunca para texto de corpo principal.
- **`border`/`input`** — mesmo tom bege-areia (`#ECDFCB` claro / `#473A30` escuro) para toda divisória e borda de campo; o esboço não diferencia borda de chrome de borda de input, então este preset também não diferencia.
- **`ring`** — não desenhado no esboço estático (que não renderiza estado de foco), mas fixado aqui como igual a `primary`, convenção padrão shadcn (o anel de foco usa a cor de marca). **Gap registrado**: nenhum valor de foco foi validado visualmente com o Boss; se o contraste do anel terracota sobre `background` precisar de ajuste de acessibilidade, é um ajuste de Camada 1 a validar depois, não uma lacuna desta tradução.
- **`accent`/`accent-foreground`** — o par "terracota suave" (`#FBE3D4`/`#D97757` claro, `#4A332A`/`#F0916D` escuro) que pinta o chip de grupo, o nó selecionado da mini-árvore do modal "Atribuir Papel" e o texto de ajuda (`helper-text`) do mesmo modal. **Nota de tradução**: `accent-foreground` resulta no mesmo valor numérico de `primary` — não é erro, é uma característica deliberada deste preset (a superfície suave e a cor de marca compartilham o mesmo matiz terracota, só variando luminosidade/par de superfície).
- **`destructive`/`destructive-foreground`** — vermelho-terracota (`#C1503D` claro / `#EE9C83` escuro), reservado a "Revogar sessões" e qualquer erro de validação. `destructive-foreground` no modo escuro reaproveita o marrom escuro de `primary-foreground-dark` (texto escuro sobre a superfície clara do vermelho em modo escuro) — nenhum hex novo introduzido, só reuso de um valor já existente no preset.
- **`success`/`success-foreground`** — **par novo (extensão do contrato canônico AD-13, decidida pelo Boss em 2026-10-19)**: `success` é a superfície suave tingida de sálvia (`#DDE5CE` claro / `#282E1F` escuro — mesmo papel estrutural que `accent`, mas em verde), `success-foreground` é o texto verde-oliva/sálvia legível sobre ela (`#465722` claro / `#A8BE82` escuro). Hue deliberadamente puxado para o lado quente/orgânico do verde (oliva/sálvia, H≈122–125 em OKLCH) em vez de um verde genérico frio, pra combinar com o registro terracota/creme do preset em vez de destoar dele. Único uso hoje: estado "habilitada" do badge de status (ver Components). Reservado exclusivamente para indicar positivo/sucesso — não usar para seleção, ênfase ou decoração.

Evitar: uma terceira cor de marca (o preset é estritamente bicolor — terracota de ênfase + bege/creme neutro), saturação alta fora do par `primary`/`accent`, e qualquer token cinza-frio (o preset é deliberadamente quente em toda a escala neutra, diferente do cinza-frio `#F4F4F5` que o Tecton usa).

## Typography

Corpo, rótulo e título herdam a mesma família "rounded sans" (`ui-rounded`, com fallback `SF Pro Rounded` → `-apple-system` → `Segoe UI` → `Roboto` → sans-serif genérico) — é a assinatura tipográfica do preset, a letra levemente arredondada reforça "acolhedor" tanto quanto a cor. Tamanhos ficam próximos da escala default do shadcn (corpo 13.5px, rótulo 11.5px maiúsculo com leve tracking, título 19px/700) — nenhuma escala nova foi inventada, só a família trocada.

`mono` não é sobrescrito por este preset (herda o monoespaçado default do shadcn) — nenhuma tela do esboço mostra identificador técnico (UUID, `objectClass`); se uma tela futura precisar exibir um, usa o default herdado, não um valor novo.

## Layout & Spacing

Escala de espaçamento do Tailwind v4 herdada sem alteração de valor (4px-based: 4/8/12/16/20/24/28/32/36/40/48/64). O que diferencia este preset de um preset mais denso (ex. `tecnico-premium`) é a ESCOLHA dos degraus: o painel de detalhe usa o degrau mais largo da escala (`32`, ~`spacing-8`) como padding externo, os cartões de seção e o diálogo modal usam o degrau intermediário (`20`–`28`, `spacing-5`–`spacing-7`) como padding interno — onde um preset denso escolheria `12`–`16`. Layout mestre-detalhe de dois painéis (árvore 280px fixa + painel de detalhe fluido), igual à Information Architecture dos outros 3 presets (EXPERIENCE.md é compartilhado); nenhuma regra de breakpoint nova — desktop-first, mesma convenção herdada do Tecton via EXPERIENCE.md.

## Elevation & Depth

Duas características tingidas de calor, não de cinza neutro:

- **Modo claro**: sombra com tom marrom-terracota (`rgba(120, 72, 32, 0.10)` no esboço) — não preto neutro. Reforça a sensação de "luz quente" do papel creme.
- **Modo escuro**: sombra volta a ser preto neutro puro e mais opaco (`rgba(0, 0, 0, 0.35)`) — o calor da superfície já vem da própria paleta de fundo escura, a sombra não precisa carregar matiz.

Três níveis qualitativos, por ordem crescente de profundidade:

- **`sm`** — nó ativo da árvore (`tree-node-selected`) e linha de tabela "flutuando" sobre o fundo de seção; deslocamento vertical pequeno (~4px), raio de desfoque curto (~12px).
- **`md`** — botão primário; reforça affordance de clique sem exagerar.
- **`lg`** — diálogo modal; a maior profundidade do preset, reforça que o modal é uma camada à parte flutuando sobre o conteúdo.

Nenhum token de cor novo é necessário para expressar isso — a sombra é propriedade de camada (CSS `box-shadow`), não um custom property de cor do contrato AD-13; por isso não aparece no frontmatter `colors`.

## Shapes

O raio é, junto da cor, a segunda assinatura visual do preset — visivelmente mais arredondado que o default shadcn (`sm` 4 / `md` 6 / `lg` 8): aqui `sm` já começa em 10px e o maior raio (`2xl`, 22px) é reservado ao diálogo modal, a superfície "mais flutuante" da interface. Chips e badges usam `full` (pílula) — único lugar onde o raio deixa de ser sutil para virar forma geométrica completa. Nenhum componente do preset usa canto 100% reto; mesmo o menor raio (`sm`, 10px) já é suave o bastante para nunca ler como "ferramenta densa" (contraste deliberado com o `tecnico-premium` e com o próprio Tecton).

## Components

**Primitivos shadcn usados tal como vêm, sem override de marca** (ganham a repintura global de tokens — cor/raio — mas nenhum objeto de componente próprio neste DESIGN.md): `Card`, `Popover`, `DropdownMenu`, `Tabs`, `Sheet`, `Tooltip`, `Checkbox`, `Avatar`, `Separator`, `Toast`/`Sonner`, `Select` (o trigger do Select compartilha a mesma pintura do componente `input` abaixo, igual ao próprio shadcn). O contrato: não customizar estes além da repintura automática de tokens.

Componentes com override de marca (listados no frontmatter `components` acima):

- **`tree-node` / `tree-node-selected`** — compõem a árvore de objetos (Usuários/Grupos/Papéis/Empresas). Nó default: texto em `{colors.muted-foreground}`, família `body`, sem fundo. Nó selecionado (rota ativa — ex. José Matos aberto no painel de detalhe): ganha fundo `{colors.card}` "flutuando" com sombra `sm`, texto em `{colors.primary}` e peso 700; o avatar do nó também vira preenchido com `primary`/`primary-foreground`. Este é o estado de **navegação ativa** — distinto de `table-row-selected` abaixo.
- **`table-header`** — cabeçalho de qualquer lista via TanStack Table (Usuários/Grupos/Papéis/RoleAssignments/relatório de import CSV). Texto `{colors.muted-foreground}`, família/tamanho/tracking de `label`, maiúsculo, sem fundo — fica "flutuando" acima das linhas.
- **`table-row-selected`** — **gap registrado e resolvido por extrapolação, não por desenho literal do esboço**: o esboço estático não renderiza uma lista com linha selecionável (só a árvore de navegação e a mini-árvore de módulo do modal). O padrão "selecionado = fundo `accent` suave + texto `accent-foreground` em negrito" já existe no esboço aplicado ao nó da mini-árvore do modal (`mini-node.selected`) — este componente transfere esse MESMO padrão para a linha de tabela, cobrindo o caso de seleção múltipla descrito no `.memlog.md` (Jornada 1b: selecionar José Matos e Jairo Castro dentro do grupo Vendedores para adicionar em lote a um grupo novo). É deliberadamente visualmente diferente de `tree-node-selected` (que usa `card`+sombra, não `accent`) porque representa um conceito distinto: seleção múltipla transitória de picker, não a rota/página atualmente aberta.
- **`button-primary` / `button-secondary`** — primary: fundo `{colors.primary}`, texto `{colors.primary-foreground}`, raio `{rounded.lg}` (14px), sombra `sm` — usado em "+ Atribuir Papel", "Confirmar". Secondary (ghost): fundo `{colors.muted}`, texto `{colors.foreground}`, borda `{colors.border}`, mesmo raio — usado em "Cancelar". O botão ghost-danger ("Revogar sessões") é uma variante do secondary com texto trocado para `{colors.destructive}` — não é um componente novo, é `button-secondary` + cor de texto.
- **`input`** — campos de formulário e o trigger do Select (ex. seletor de Papel no modal). Fundo `{colors.muted}`, borda `{colors.border}`, raio `{rounded.lg}`. A barra de busca da árvore (`search-input` no esboço) usa fundo `{colors.background}` em vez de `{colors.muted}` — tratamento "afundado" deliberado para diferenciá-la de um campo de formulário comum; é a única exceção ao token `input` neste preset.
- **`form-field-error`** — **gap registrado**: o esboço não renderiza nenhum estado de erro de formulário. Especificado por inferência do padrão já estabelecido no `tecton-DESIGN.md` importado (borda do input substituída por `destructive`, mensagem abaixo do campo com `destructive` + família `label`) — mesmo mecanismo, cores deste preset.
- **`dialog`** — o modal "Atribuir Papel" (e qualquer outro diálogo do Admin UI). Fundo `{colors.popover}`, raio `{rounded.2xl}` (22px — o maior raio do preset, reforça que o diálogo é a superfície mais "flutuante"), sombra `lg`. Contém a mini-árvore de Módulos (reaproveita a lógica visual de `tree-node`/`tree-node-selected` em miniatura, mas com nó selecionado usando `accent`/`accent-foreground` em vez de `card`+sombra — mesmo caso do `table-row-selected`, é seleção de picker, não navegação).
- **`badge`** — status (ex. Empresa habilitada/desabilitada, tela "Empresas" do admin de sistema). **Não aparece no esboço visual** (que cobre só a tela de usuário e o modal de papel). Variante "habilitada" usa `{colors.success}`/`{colors.success-foreground}` (verde-sálvia novo — ver Colors); variante "desabilitada" reaproveita o par ghost-danger já estabelecido no restante do preset (`muted` + `destructive`, com borda `border`). Raio `{rounded.full}` (pílula), igual ao chip de grupo. **Resolvido em 2026-10-19**: token `success` adicionado ao contrato canônico (AD-13) — a variante "habilitada" deixou de reaproveitar `accent`/`accent-foreground` (cor de marca sem semântica de positivo) e passou a ter cor semântica própria.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Usar `primary` (terracota) só para ação principal, seleção ativa e o anel de foco | Introduzir uma segunda cor de marca além do par terracota/bege |
| Usar `accent` (terracota suave) para seleção de picker/multi-select e chips informativos | Usar `accent` para indicar sucesso/erro — isso é papel de `success`/`destructive` |
| Distinguir `tree-node-selected` (navegação ativa, fundo `card`+sombra) de `table-row-selected`/seleção de picker (fundo `accent`) | Misturar os dois padrões de "selecionado" — cada um comunica um conceito diferente |
| Raio generoso em toda a superfície (`sm` 10px no mínimo, `2xl` 22px no diálogo) | Usar cantos retos ou o raio apertado do shadcn/Tecton default (4/6/8px) — quebra a leitura "acolhedor" |
| Sombra tingida de calor no modo claro (`rgba` com matiz marrom) | Usar sombra cinza/preta neutra no modo claro — perde o "calor" que diferencia este preset |
| Família tipográfica "rounded sans" em corpo/rótulo/título | Misturar com uma pilha de fontes neutra de sistema (`system-ui` puro) — dilui a assinatura do preset |
| Reaproveitar `button-secondary` + cor de texto para variantes ghost-danger | Criar um componente de botão novo só para a ação destrutiva |
