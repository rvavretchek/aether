---
name: "Aether Admin UI — Técnico Premium"
description: 'Preset visual "Técnico Premium" (1 dos 4 presets de Camada 0 fixados pela AD-13) para o Admin UI do Aether — shadcn/ui + Tailwind CSS v4, camada de marca por cima, registro denso tipo Stripe Dashboard/GitHub.'
status: final
created: '2026-10-07'
updated: '2026-10-19'
colors:
  # Camada 0 sobre shadcn/ui — nomenclatura canônica de CSS custom property
  # (AD-13, vinculante). Valores em OKLCH (Tailwind v4); hex original do
  # esboço .working/direction-tecnico-premium.html documentado em comentário
  # ao lado de cada token, só como referência de tradução.
  #
  # Tema claro
  background: 'oklch(1 0 0)'                      # #FFFFFF
  foreground: 'oklch(0.254 0.011 254)'             # #1F2328
  card: 'oklch(0.978 0.003 248)'                   # #F6F8FA (sketch: --panel)
  card-foreground: 'oklch(0.254 0.011 254)'        # = foreground
  popover: 'oklch(0.978 0.003 248)'                # reusa --card (sem popover próprio no esboço)
  popover-foreground: 'oklch(0.254 0.011 254)'     # = foreground
  muted: 'oklch(0.947 0.007 248)'                  # #EAEEF2 (sketch: --panel-alt)
  muted-foreground: 'oklch(0.531 0.017 251)'       # #656D76 (também cobre --mono-id, ver Colors)
  border: 'oklch(0.876 0.012 248)'                 # #D0D7DE
  input: 'oklch(0.876 0.012 248)'                  # = border (esboço não diferencia)
  ring: 'oklch(0.520 0.094 223)'                   # = primary
  primary: 'oklch(0.520 0.094 223)'                # #0E7490 (sketch: --accent, ciano)
  primary-foreground: 'oklch(1 0 0)'               # #FFFFFF
  accent: 'oklch(0.943 0.040 212)'                 # #CFF4FC (sketch: --accent-soft)
  accent-foreground: 'oklch(0.520 0.094 223)'      # = primary (mesmo ciano, texto sobre accent)
  destructive: 'oklch(0.552 0.205 25)'             # #CF222E
  destructive-foreground: 'oklch(1 0 0)'           # #FFFFFF
  success: 'oklch(0.552 0.145 148)'                # #1F883D (verde "terminal/status", registro GitHub Primer success.emphasis)
  success-foreground: 'oklch(1 0 0)'               # #FFFFFF
  # Tema escuro (sufixo -dark; espelha 1:1 a lista acima)
  background-dark: 'oklch(0.176 0.014 258)'        # #0D1117
  foreground-dark: 'oklch(0.943 0.011 244)'        # #E6EDF3
  card-dark: 'oklch(0.220 0.016 257)'              # #161B22
  card-foreground-dark: 'oklch(0.943 0.011 244)'
  popover-dark: 'oklch(0.220 0.016 257)'
  popover-foreground-dark: 'oklch(0.943 0.011 244)'
  muted-dark: 'oklch(0.246 0.015 257)'             # #1C2128
  muted-foreground-dark: 'oklch(0.662 0.018 251)'  # #8B949E (idêntico ao --mono-id do escuro)
  border-dark: 'oklch(0.330 0.015 252)'            # #30363D
  input-dark: 'oklch(0.330 0.015 252)'
  ring-dark: 'oklch(0.797 0.134 212)'
  primary-dark: 'oklch(0.797 0.134 212)'           # #22D3EE
  primary-foreground-dark: 'oklch(0.247 0.039 209)' # #04262B
  accent-dark: 'oklch(0.283 0.038 206)'            # #0E2F33
  accent-foreground-dark: 'oklch(0.797 0.134 212)' # = primary-dark
  destructive-dark: 'oklch(0.665 0.205 27)'        # #F85149
  destructive-foreground-dark: 'oklch(1 0 0)'
  success-dark: 'oklch(0.546 0.147 146)'           # #238636
  success-foreground-dark: 'oklch(1 0 0)'          # #FFFFFF
typography:
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: 0.06em
  heading:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 16px
    fontWeight: '700'
    lineHeight: '1.25'
  heading-sm:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 14.5px
    fontWeight: '700'
    lineHeight: '1.3'
  mono:
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", monospace'
    fontSize: 12.5px
    fontWeight: '400'
    lineHeight: '1.4'
  caption:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 11.5px
    fontWeight: '400'
    lineHeight: '1.55'
rounded:
  # Mais discreto que o padrão shadcn (que costuma ir a 0.5rem/8px+ por default) —
  # reforça o registro "ferramenta densa", não "app de consumo".
  sm: 4px
  md: 6px
  lg: 8px
  full: 9999px
  DEFAULT: 6px
spacing:
  # Base numérica 4px do Tailwind/shadcn é herdada sem override. Os tokens
  # nomeados abaixo são os paddings específicos que dão a este preset sua
  # densidade de informação (mais apertados que um preset "acolhedor" usaria).
  row-y: 4px
  row-x: 8px
  panel-y: 24px
  panel-x: 30px
  section-gap: 22px
  dialog-padding: 22px
components:
  tree-node:
    foreground: '{colors.foreground}'
    fontFamily: '{typography.body.fontFamily}'
    fontSize: '{typography.body.fontSize}'
    paddingY: '{spacing.row-y}'
    paddingX: '{spacing.row-x}'
    radius: '{rounded.sm}'
    borderLeft: 'transparent'
  tree-node-selected:
    background: '{colors.accent}'
    foreground: '{colors.accent-foreground}'
    fontWeight: '600'
    borderLeft: '{colors.primary}'
    radius: '{rounded.sm}'
  table-header:
    background: '{colors.card}'
    foreground: '{colors.muted-foreground}'
    fontFamily: '{typography.label.fontFamily}'
    fontSize: '{typography.label.fontSize}'
    letterSpacing: '{typography.label.letterSpacing}'
    borderBottom: '{colors.border}'
  table-row-selected:
    background: '{colors.accent}'
    foreground: '{colors.accent-foreground}'
    borderBottom: '{colors.border}'
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
    fontSize: 12px
    fontWeight: '600'
  button-secondary:
    background: '{colors.card}'
    foreground: '{colors.foreground}'
    border: '{colors.border}'
    radius: '{rounded.md}'
    fontSize: 12px
    fontWeight: '600'
  input:
    background: '{colors.background}'
    border: '{colors.border}'
    foreground: '{colors.foreground}'
    radius: '{rounded.md}'
    fontSize: '{typography.body.fontSize}'
  form-field-error:
    foreground: '{colors.destructive}'
    fontFamily: '{typography.label.fontFamily}'
    fontSize: '{typography.caption.fontSize}'
  dialog:
    background: '{colors.card}'
    foreground: '{colors.card-foreground}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
    padding: '{spacing.dialog-padding}'
    shadow: '0 12px 32px oklch(0 0 0 / 0.2)'
    backdrop: 'oklch(from {colors.foreground} l c h / 10%)'
  badge:
    enabled:
      background: '{colors.success}'
      foreground: '{colors.success-foreground}'
      border: '{colors.success}'
    disabled:
      background: '{colors.muted}'
      foreground: '{colors.destructive}'
      border: '{colors.border}'
    fontFamily: '{typography.mono.fontFamily}'
    fontSize: '{typography.caption.fontSize}'
    radius: '{rounded.sm}'
  skeleton-loading:
    background: '{colors.muted}'
    highlight: '{colors.border}'
    radius: '{rounded.sm}'
---

## Brand & Style

Técnico Premium é o registro "developer tool denso" do Aether Admin UI — o mesmo território visual de um Stripe Dashboard ou de uma tela de repositório do GitHub: grid de linhas finas, contraste alto, densidade de informação maior que a de um app de consumo, porque quem usa esta tela administra o sistema o dia inteiro e prefere ver mais coisa de uma vez a rolar mais telas bonitas. Um único acento ciano preciso sobre uma base grafite/neutra marca "isto é interativo ou está selecionado" e nada mais — não há segunda cor de destaque. Identificadores técnicos (e-mail, escopo de módulo, UUID, valor de `<select>`) aparecem sempre em monospace, reforçando que o conteúdo por trás desta tela é infraestrutura real, não um formulário genérico.

Este DESIGN.md herda shadcn/ui + Tailwind CSS v4 (Radix UI por baixo, componentes vendorizados — contrato da AD-13) como base e especifica apenas a **camada de marca**: paleta (incluindo o par claro/escuro completo, nativo desde o default), a escolha tipográfica (pilha de sistema + monospace dedicado a identificadores), cantos mais discretos que o padrão shadcn, e um punhado de componentes com override explícito. Qualquer primitiva shadcn não listada na seção Components herda o comportamento/visual padrão do shadcn sem alteração.

## Colors

- **`background`/`foreground`** — neutros de altíssimo contraste (quase-branco/quase-preto, puxados pro cinza-azulado, não pro cinza puro) — a base de qualquer superfície da tela: canvas do painel de detalhe, inputs.
- **`card`/`card-foreground`** — superfície "elevada" discreta (`#F6F8FA` claro / `#161B22` escuro no esboço) usada na sidebar da árvore, no header da tabela, no diálogo e no botão secundário. `popover` reaproveita o mesmo valor de `card` — o esboço não desenha um popover próprio, e a diferença visual entre uma superfície "card" e uma "popover" não é um dos oito cenários cobertos por este preset.
- **`muted`/`muted-foreground`** — preenchimento de baixa ênfase (`#EAEEF2` claro / `#1C2128` escuro): fundo de avatar, de chip/badge, de skeleton, de caixa de texto auxiliar (helper text). `muted-foreground` também absorve o `--mono-id` do esboço (`#57606A` claro / `#8B949E` escuro) — no tema escuro os dois valores já eram idênticos (`#8B949E`); no tema claro a diferença é de poucos pontos de luminosidade, imperceptível, e colapsar os dois evita um token de cor não-canônico sobrevivendo no contrato (ver nota de tradução ao final do documento).
- **`border`/`input`** — divisória entre painel de árvore e painel de detalhe, bordas de input/select/tabela. O esboço nunca diferencia a borda de um input da borda genérica — `input` reaproveita o valor de `border`.
- **`primary` (ciano `#0E7490` claro / `#22D3EE` escuro)** — a única cor de ênfase do tema. Usada em: botão primário (Atribuir Papel, Confirmar), na borda esquerda de 2px de um nó de árvore selecionado, e como `ring` de foco. `primary-foreground` garante contraste (branco no claro, quase-preto `#04262B` no escuro, porque o ciano claro do tema escuro é luminoso demais para texto branco em cima).
- **`accent`/`accent-foreground`** — o par "fundo + texto" do estado selecionado/realçado: fundo é um ciano muito claro (`accent`, `#CFF4FC`/`#0E2F33`), o texto por cima é o próprio ciano de `primary` (`accent-foreground`). É o par usado no nó de árvore ativo e na linha de tabela selecionada — nunca em chrome decorativo.
- **`destructive`/`destructive-foreground`** — vermelho reservado a ações destrutivas (Revogar sessões) e erro de validação. Nunca usado para indicar "desabilitado" no sentido neutro — só para "isto é perigoso ou está bloqueado".
- **`success`/`success-foreground`** — verde "terminal/status" (`#1F883D` claro / `#238636` escuro, texto branco nos dois temas) reservado estritamente a estado positivo confirmado — hoje só o badge "Empresa habilitada" (ver variante `enabled` de `badge` em Components). Não é uma segunda cor de marca/decoração: assim como `destructive`, só aparece quando o sistema precisa comunicar um status semântico (aqui, positivo), nunca como realce de seleção — esse papel continua exclusivo de `accent`/`primary`.

Avoid: uma segunda cor de marca decorativa além do ciano (o par semântico `success` não conta — está reservado a status positivo confirmado, nunca a chrome ou seleção); usar `accent` fora do par seleção/realce (ex. como cor decorativa de badge "ok"); reintroduzir hex literal em qualquer tela gerada a partir deste preset — tudo entra via token OKLCH.

## Typography

Pilha de fontes de sistema (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`) para todo texto de interface — sem custo de carregamento de webfont, reforçando o registro "ferramenta", não "produto de marca com tipografia autoral". Papéis:

- **`body`** (13px/400) — texto corrido padrão: nome em linha de árvore, célula de tabela, texto de botão.
- **`label`** (11px/700, uppercase, `letterSpacing` 0.06em) — rótulos de seção, cabeçalho de tabela, rótulo de campo de formulário. No esboço esse padrão varia entre 0.05em e 0.08em conforme o contexto (cabeçalho de grupo na árvore vs. cabeçalho de tabela); 0.06em é o valor representativo adotado como token único.
- **`heading`** (16px/700) — nome da entidade no cabeçalho do painel de detalhe (ex. "José Matos").
- **`heading-sm`** (14.5px/700) — título de diálogo (ex. "Atribuir Papel").
- **`mono`** (12.5px/400, pilha `ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", monospace`) — **reservado a identificador técnico**: e-mail, escopo de módulo (`vendas/regiao-sul`), valor de `<select>`, badge. Nunca usado em rótulo ou texto corrido comum.
- **`caption`** (11.5px/400, `lineHeight` 1.55) — texto auxiliar de baixa ênfase: helper text de diálogo, mensagem de erro de campo.

## Layout & Spacing

Escala numérica de 4px do Tailwind/shadcn herdada sem override — este preset não redefine a escala em si, só é **mais econômico em qual degrau usa**: onde um preset "acolhedor" escolheria `spacing.6`/`spacing.8` para padding de card, Técnico Premium prefere `spacing.1`/`spacing.2`. Os tokens nomeados abaixo capturam os paddings específicos que dão a este preset sua densidade:

- **`row-y`/`row-x`** (4px/8px) — padding vertical/horizontal de cada nó da árvore de objetos e de cada linha de skeleton — a unidade mais repetida da tela.
- **`panel-y`/`panel-x`** (24px/30px) — padding do painel de detalhe (assimétrico de propósito: mais respiro horizontal que vertical, mantendo blocos de informação compactos na vertical para caber mais seção na tela sem rolar).
- **`section-gap`** (22px) — espaço entre seções do painel de detalhe (Grupos, Papéis atribuídos).
- **`dialog-padding`** (22px) — padding interno do diálogo modal.

Layout mestre-detalhe de dois painéis (sidebar de árvore fixa + painel de detalhe rolável) — sem grade responsiva adicional definida aqui; convenção de breakpoint/responsividade fica a cargo do EXPERIENCE.md (Foundation).

## Elevation & Depth

Elevação é usada com parcimônia, reservada ao diálogo modal: `box-shadow: 0 12px 32px oklch(0 0 0 / 0.2)` — uma sombra difusa e relativamente forte (opacidade 20%), que separa claramente o modal do conteúdo por trás. O scrim por trás do modal não é um preto neutro, e sim o próprio token `foreground` do tema a 10% de opacidade (`oklch(from {colors.foreground} l c h / 10%)`, sintaxe de cor relativa do Tailwind v4) — no tema claro isso produz um escurecimento sutil; no tema escuro, como `foreground` já é quase-branco, o resultado é um clareamento muito leve do fundo, não um escurecimento adicional. Fora do diálogo, nenhuma outra superfície usa sombra — cards, sidebar e tabela se diferenciam só por cor de fundo (`card` vs. `background`) e borda de 1px, nunca por profundidade.

## Shapes

Cantos discretos, mais fechados que o default do shadcn: `rounded.sm` (4px) para o realce de seleção da árvore e para badge/chip; `rounded.md` (6px) para botão, input, select e container de tabela; `rounded.lg` (8px) para o diálogo modal. Não há uso de `rounded.full` neste preset além do valor estar disponível por convenção de escala — nenhum elemento pill aparece no esboço (nem os badges de status são pílulas). A leitura pretendida é "grade técnica", não "superfície macia".

## Components

Shadcn primitives usadas **as-is**, sem override de marca: `Card` (estrutura/API, com cor sobrescrita conforme acima), `Separator`, `Tabs`, `DropdownMenu`, `Tooltip`, `Avatar` (estrutura; cor de preenchimento vem de `muted`), `Checkbox`, `Select` (estrutura; estilo de valor em `mono` é camada de marca, ver `input` abaixo). Nenhum desses ganha anatomia nova — o contrato é "não mexer".

Componentes com override de marca, nomes estáveis para referência futura do EXPERIENCE.md:

- **`tree-node` / `tree-node-selected`** — linha da árvore de objetos (Usuários/Grupos/Papéis/Empresas). Estado base: texto em `body`, sem fundo, borda esquerda transparente de 2px reservada (evita deslocamento de layout quando o item fica selecionado). Estado selecionado: fundo `{colors.accent}`, texto `{colors.accent-foreground}` em `fontWeight 600`, borda esquerda sólida de 2px em `{colors.primary}` — o mesmo padrão "fundo claro + texto/borda no tom forte" se repete em `table-row-selected`.
- **`table-header` / `table-row-selected`** — cabeçalho e linha selecionada de qualquer lista via TanStack Table (Usuários, Grupos, Papéis, relatório de import CSV). Cabeçalho: fundo `{colors.card}`, texto em `label` com a cor `{colors.muted-foreground}`, borda inferior `{colors.border}`. Linha selecionada: mesmo par `{colors.accent}`/`{colors.accent-foreground}` do nó de árvore selecionado — extrapolação deliberada do padrão de seleção já validado visualmente (o esboço só desenha o estado selecionado na árvore, não numa tabela; aplicar o mesmo par de tokens a uma segunda estrutura seletora é consistência de sistema, não um valor novo inventado).
- **`button-primary` / `button-secondary`** — primário: fundo `{colors.primary}`, texto `{colors.primary-foreground}`, `{rounded.md}`, 12px/600 (ex. "+ Atribuir Papel", "Confirmar"). Secundário (ghost): fundo `{colors.card}`, texto `{colors.foreground}`, borda `{colors.border}` (ex. "Cancelar"). Existe também uma variante ghost-destructive no esboço (ex. "Revogar sessões"): mesmo fundo/borda do secundário, só o texto trocado para `{colors.destructive}` — não ganha token de frontmatter próprio por ser puramente uma troca de cor de texto sobre a mesma anatomia do `button-secondary`.
- **`input`** — fundo `{colors.background}`, borda `{colors.border}`, `{rounded.md}`. Campos cujo valor é um identificador técnico (o `<select>` de Papel, o `<select>` de Módulo) usam `{typography.mono.fontFamily}` para o valor exibido — camada de marca sobre o `Input`/`Select` do shadcn, cuja anatomia (altura, foco, estado desabilitado) não muda.
- **`form-field-error`** — texto `{colors.destructive}` em `{typography.label.fontFamily}`, tamanho `caption`. Substitui a borda do campo por `{colors.destructive}` (herdado do padrão shadcn de campo inválido, sem override adicional aqui).
- **`dialog`** — modal "Atribuir Papel" e qualquer outro diálogo de confirmação (ex. habilitar/desabilitar Empresa). Fundo `{colors.card}`, borda `{colors.border}`, `{rounded.lg}`, padding `{spacing.dialog-padding}`, sombra e scrim conforme a seção Elevation & Depth acima.
- **`badge`** (texto em `mono`, `{rounded.sm}`) — par de estado binário, forma nested consistente com os outros 3 presets (achado do Reviewer Gate de 2026-10-19: a forma anterior tinha `badge`/`badge-success` como duas chaves irmãs em vez de um único componente com duas variantes — quebrava consumo mecânico por um gerador de template). `enabled`: fundo `{colors.success}`, texto `{colors.success-foreground}`, borda `{colors.success}` — usado em "Empresa habilitada". `disabled`: fundo `{colors.muted}`, texto `{colors.destructive}`, borda `{colors.border}` — usado em "Empresa desabilitada", mesmo raciocínio do botão ghost-destructive. *Resolvido em 2026-10-19*: o gap antes registrado aqui (ausência de token semântico de "positivo/habilitado" no contrato canônico) foi fechado pela extensão da AD-13 com o par `success`/`success-foreground` (+ `-dark`); este documento já reflete o par novo. **Chip de metadado genérico** (ex. grupo associado a um usuário) não é o componente `badge` — é reuso informal de `{colors.muted}`/`{colors.foreground}`/`{rounded.sm}` sem token/componente próprio nomeado, mesmo tratamento que os outros 3 presets dão a esse caso (nenhum deles formaliza um componente "chip" separado).
- **`skeleton-loading`** — placeholder de carregamento de linha de árvore/tabela (variação de estado já ilustrada no esboço deste preset). Barra com gradiente `{colors.muted}` → `{colors.border}` → `{colors.muted}` em animação de 1.4s `ease-in-out` infinita (`background-position` de 100% a 0%), avatar/ícone placeholder em bloco sólido `{colors.muted}`, `{rounded.sm}`.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Usar `{colors.primary}` (ciano) só para ação principal, foco e borda de seleção | Introduzir uma segunda cor de destaque além do ciano |
| Reservar `{colors.accent}`/`{colors.accent-foreground}` para "isto está selecionado/realçado" (árvore, tabela) | Usar `accent` como cor decorativa de chrome ou como indicador de status positivo |
| Texto em `mono` só para identificador técnico (e-mail, escopo, UUID, valor de select) | Usar `mono` em rótulo, botão ou texto corrido |
| Cantos discretos (`sm`/`md`/`lg` = 4/6/8px) em toda a superfície | Usar `rounded.full` ou cantos largos — não é a leitura pretendida deste preset |
| Elevação (sombra) só no diálogo modal | Adicionar sombra decorativa em card, sidebar ou linha de tabela |
| Dark mode nativo via par `token`/`token-dark` desde o primeiro componente | Hardcodar um valor de cor fixo e tratar o escuro como retrofit depois |
| Tratar `destructive` como "perigoso/bloqueado" (revogar sessão, desabilitar Empresa) | Usar `destructive` para indicar "neutro/padrão" ou qualquer estado não-destrutivo |
| Usar `{colors.success}`/`{colors.success-foreground}` só para status positivo confirmado (ex. badge "Empresa habilitada") | Usar `success` como cor de seleção/realce ou chrome decorativo — esse papel é de `accent`/`primary` |

---

> **Nota de tradução (hex → OKLCH e nomenclatura)** — registrada aqui para rastreabilidade, não é conteúdo normativo do preset:
> 1. O ciano de marca do esboço (`--accent: #0E7490` claro / `#22D3EE` escuro) virou `{colors.primary}` na nomenclatura canônica — o esboço chamava de "accent" o que no vocabulário shadcn é `primary` (cor de ação principal); o `{colors.accent}` canônico deste documento é, em vez disso, o par de realce suave que o esboço chamava de `--accent-soft`.
> 2. `--mono-id` (`#57606A` claro / `#8B949E` escuro) foi absorvido por `{colors.muted-foreground}` em vez de virar um token extra — no escuro os dois valores do esboço já eram idênticos, e no claro a diferença é de poucos pontos de luminosidade em OKLCH; manter os dois como tokens distintos violaria a disciplina de não multiplicar vocabulário sem uma distinção visual real.
> 3. O par `--panel`/`--panel-alt` do esboço não mapeia 1:1 para um único token canônico — `--panel` virou `{colors.card}` (superfície elevada: sidebar, cabeçalho de tabela, diálogo, botão secundário) e `--panel-alt` virou `{colors.muted}` (preenchimento de baixa ênfase: avatar, chip, skeleton, caixa de ajuda), porque o próprio esboço já usa os dois valores com esse padrão de uso diferente, não como sinônimos.
