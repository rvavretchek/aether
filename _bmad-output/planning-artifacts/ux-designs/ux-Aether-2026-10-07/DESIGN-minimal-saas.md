---
name: "Aether Admin UI — Minimal SaaS"
description: 'Preset visual "Minimal SaaS" (Camada 0, 1 de 4) do runtime shadcn/ui + Tailwind v4 de `apps/web`, inspirado em Linear/Vercel/Raycast. Especifica só a camada de marca/override sobre shadcn — nomenclatura de token, cor e componente seguem o contrato vinculante da AD-13 (ARCHITECTURE-SPINE.md).'
colors:
  # Convenção token / token-dark (spec DESIGN.md). Valores em OKLCH (Tailwind v4 /
  # contrato AD-13 — NUNCA hex, mesmo a convenção default do spec sendo hex strings).
  # Hex original do esboço .working/direction-minimal-saas.html documentado em
  # comentário à direita, só como referência de onde cada valor veio.
  background: "oklch(1 0 0)"                             # #FFFFFF
  background-dark: "oklch(0.141 0.005 285.823)"           # #0A0A0B (≈ zinc-950)
  foreground: "oklch(0.21 0.006 285.885)"                 # #18181B (zinc-900 exato)
  foreground-dark: "oklch(0.967 0.001 286.375)"           # #F4F4F5 (zinc-100 exato)
  card: "oklch(0.985 0 0)"                                 # #FAFAFA (zinc-50 exato) — painel da árvore
  card-dark: "oklch(0.175 0.005 285.85)"                  # #141416 (tom customizado, interpolado entre zinc-950 e zinc-900 — não é um stop padrão do Tailwind)
  card-foreground: "{colors.foreground}"
  card-foreground-dark: "{colors.foreground-dark}"
  popover: "{colors.card}"
  popover-dark: "{colors.card-dark}"
  popover-foreground: "{colors.foreground}"
  popover-foreground-dark: "{colors.foreground-dark}"
  muted: "oklch(0.967 0.001 286.375)"                     # #F4F4F5 (zinc-100 exato) — panel-alt
  muted-dark: "oklch(0.21 0.006 285.885)"                 # #1B1B1E (≈ zinc-900)
  muted-foreground: "oklch(0.552 0.016 285.938)"          # #71717A (zinc-500 exato)
  muted-foreground-dark: "oklch(0.705 0.015 286.067)"     # #A1A1AA (zinc-400 exato)
  border: "oklch(0.92 0.004 286.32)"                      # #E4E4E7 (zinc-200 exato)
  border-dark: "oklch(0.274 0.006 286.033)"               # #27272A (zinc-800 exato)
  input: "{colors.border}"
  input-dark: "{colors.border-dark}"
  primary: "oklch(0.511 0.262 276.966)"                   # #4F46E5 (indigo-600 exato)
  primary-dark: "oklch(0.673 0.182 276.935)"              # #818CF8 (indigo-400 exato)
  primary-foreground: "oklch(1 0 0)"                      # #FFFFFF
  primary-foreground-dark: "{colors.background-dark}"     # #0A0A0B
  accent: "oklch(0.962 0.018 272.314)"                    # #EEF0FF (≈ indigo-50, aproximação — o hex do esboço não bate 1:1 com o stop oficial)
  accent-dark: "oklch(0.26 0.045 276)"                    # #1E1F3B (tom customizado, indigo escurecido/dessaturado — não é um stop padrão)
  accent-foreground: "{colors.primary}"
  accent-foreground-dark: "{colors.primary-dark}"
  destructive: "oklch(0.577 0.245 27.325)"                # #DC2626 (red-600 exato)
  destructive-dark: "oklch(0.704 0.191 22.216)"           # #F87171 (red-400 exato)
  destructive-foreground: "oklch(1 0 0)"                  # #FFFFFF
  destructive-foreground-dark: "{colors.background-dark}" # texto escuro sobre red-400 claro, mesmo raciocínio de primary-foreground-dark
  success: "oklch(0.58 0.115 167)"                        # #128F6C (verde-teal customizado — adicionado em 2026-10-19 ao contrato canônico via AD-13; NÃO é stock Tailwind emerald/green, dessaturado e puxado pro teal pra soar controlado/preciso e coerente com o índigo frio do preset, não o verde genérico de qualquer design system)
  success-dark: "oklch(0.72 0.125 167)"                   # #42BD94 (mesmo hue, mais claro e levemente menos saturado — mesma relação primary→primary-dark/destructive→destructive-dark)
  success-foreground: "oklch(1 0 0)"                      # #FFFFFF
  success-foreground-dark: "{colors.background-dark}"     # texto escuro sobre o verde claro, mesmo raciocínio de primary-foreground-dark/destructive-foreground-dark
  ring: "{colors.primary}"
  ring-dark: "{colors.primary-dark}"
typography:
  # Pilha sans do sistema operacional (não Geist) — escolha explícita do preset,
  # não um override de default shadcn (shadcn/Tailwind não prescrevem fonte).
  heading:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 20px
    fontWeight: "800"
    lineHeight: "1.3"
    letterSpacing: -0.01em
  heading-sm:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 16px
    fontWeight: "800"
    lineHeight: "1.3"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 13.5px
    fontWeight: "400"
    lineHeight: "1.5"
  label:
    # Rótulo de seção, cabeçalho de tabela, field-label de formulário — sempre uppercase
    # (tracking aberto); textTransform não é chave do spec, documentado em prosa abaixo.
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 11.5px
    fontWeight: "700"
    lineHeight: "1.3"
    letterSpacing: 0.06em
  caption:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 12px
    fontWeight: "400"
    lineHeight: "1.55"
  button:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 13px
    fontWeight: "600"
    lineHeight: "1.2"
  mono:
    # Reservado para identificador técnico (UUID v7 de DirectoryObject, objectClass bruto),
    # nunca rótulo/texto corrido — padrão comportamental herdado do tecton-DESIGN.md
    # (extrapolação: não aparece no esboço HTML, que não tem tela com ID técnico visível).
    fontFamily: '"SF Mono", "Cascadia Code", Consolas, monospace'
    fontSize: 12.5px
    fontWeight: "400"
    lineHeight: "1.4"
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  full: 9999px
  DEFAULT: 8px
spacing:
  # Escala numérica 4-based do Tailwind/shadcn (4, 8, 12, 16, 24, 32, 40, 48, 64) herdada
  # como está — sem override. Só os tokens nomeados de layout abaixo são novos.
  sidebar-width: 272px
  detail-padding-x: 36px
  detail-padding-y: 32px
  section-gap: 24px
  tree-row-gap: 4px
components:
  tree-node:
    foreground: "{colors.foreground}"
    fontSize: "{typography.body.fontSize}"
    radius: "{rounded.sm}"
    gap: "{spacing.tree-row-gap}"
  tree-node-selected:
    background: "{colors.accent}"
    foreground: "{colors.accent-foreground}"
    radius: "{rounded.sm}"
  table-header:
    foreground: "{colors.muted-foreground}"
    border: "{colors.border}"
    fontSize: "{typography.label.fontSize}"
    fontWeight: "{typography.label.fontWeight}"
  table-row-selected:
    background: "{colors.accent}"
    foreground: "{colors.accent-foreground}"
  button-primary:
    background: "{colors.primary}"
    foreground: "{colors.primary-foreground}"
    radius: "{rounded.md}"
  button-secondary:
    background: "transparent"
    foreground: "{colors.foreground}"
    border: "{colors.border}"
    radius: "{rounded.md}"
  input:
    background: "{colors.background}"
    border: "{colors.input}"
    radius: "{rounded.md}"
    focusRing: "{colors.ring}"
  form-field-error:
    border: "{colors.destructive}"
    foreground: "{colors.destructive}"
    fontSize: "{typography.caption.fontSize}"
  dialog:
    background: "{colors.card}"
    foreground: "{colors.card-foreground}"
    border: "{colors.border}"
    radius: "{rounded.lg}"
  badge:
    background: "{colors.success}"
    foreground: "{colors.success-foreground}"
    border: "{colors.border}"
    radius: "{rounded.full}"
---

## Brand & Style

Minimal SaaS é a tradução direta, pro contrato de token do Aether, da referência visual Linear/Vercel/Raycast validada pelo Boss em `.working/direction-minimal-saas.html`: espaço em branco generoso, bordas de 1px (`{colors.border}`) carregando toda a hierarquia estrutural, zero sombra decorativa (a única sombra real do preset é o `dialog` flutuante), e um único acento índigo preciso (`{colors.primary}`) usado com disciplina — nunca decorativo, sempre "isto é a ação/seleção corrente". Títulos usam peso 800 com tracking levemente negativo (`-0.01em` em `{typography.heading}`) contra um corpo de texto regular — o mesmo contraste de peso que dá a "SaaS moderno" dos produtos de referência, em vez da leitura "ferramenta densa" do ConsoleOne/Tecton (ver nota de herança comportamental abaixo). Rótulos de seção, cabeçalho de tabela e `field-label` de formulário são sempre caixa-alta com tracking aberto (`{typography.label}`, `letterSpacing: 0.06em` + `text-transform: uppercase` em CSS — a chave `textTransform` não existe no spec de frontmatter, por isso só documentada aqui em prosa) — é o recurso tipográfico que substitui ornamento visual para marcar hierarquia secundária.

Herança comportamental explícita, não visual: o padrão árvore+detalhe (mestre-detalhe, seleção de nó, seletor de membros com mini-árvore) vem do ConsoleOne/Tecton (ver `.memlog.md`, decisão de 2026-10-16), mas a superfície final deste preset é deliberadamente a oposta da paleta neutra "ferramenta, não produto" do `tecton-DESIGN.md` — o Boss pediu polimento nível consumer ("stakes" documentado no memlog) e uma identidade visual autoral, não a paleta azul-neutra substituível do Tecton herdada literalmente.

Minimal SaaS herda shadcn/ui + Tailwind v4 (Radix UI por baixo, AD-13) quase integralmente. Este DESIGN.md especifica só o delta de marca: as duas cores de ênfase (`primary` índigo, `accent` como tom suave de seleção — não uma segunda cor de marca, é o mesmo índigo em baixa saturação), a tipografia (pilha sans do sistema operacional, não a fonte default de um template shadcn qualquer), cantos discretamente mais arredondados que o Tecton (6/8/10px) e os componentes de árvore/tabela que não existem como primitiva shadcn upstream (construídos à mão sobre Radix, mesmo padrão do Tecton). Os primitivos shadcn que não aparecem na lista de "Components" abaixo herdam o visual default shadcn/Radix sem nenhuma alteração.

## Colors

- **`background`/`foreground`** (branco puro / zinc-900 claro, quase-preto / zinc-100 escuro) — par de alto contraste, base de toda tela. Segue exatamente a escala zinc do Tailwind v4 (`foreground` claro = zinc-900 oklch(0.21 0.006 285.885) é um match exato com um stop oficial do Tailwind, não uma aproximação).
- **`card`/`popover`** (zinc-50 claro / tom customizado `#141416` escuro) — superfície do painel de árvore (sidebar) e do modal. O valor escuro não corresponde a nenhum stop padrão do Tailwind (o esboço usa um tom entre zinc-950 e zinc-900 pra dar profundidade sutil ao painel sem ficar idêntico ao `background`); documentado como interpolação, não um match exato.
- **`muted`/`muted-foreground`** (zinc-100/zinc-500 claro, zinc-900/zinc-400 escuro) — chrome secundário: fundo de chip/badge, texto de apoio (email, descrição, estado vazio). Nunca usado como texto principal.
- **`border`/`input`** (zinc-200 claro / zinc-800 escuro, ambos matches exatos da escala Tailwind) — toda divisória: sidebar↔painel de detalhe, linha de tabela, borda de input e de dialog. `input` reaproveita literalmente o valor de `border` (o esboço não define uma borda de campo distinta).
- **`primary`/`primary-foreground`** (índigo-600 claro / índigo-400 escuro — ambos matches exatos da escala Tailwind) — a única cor de ênfase de ação do preset. Usada em `button-primary` (Atribuir Papel, Confirmar) e como base semântica de `ring` (foco de teclado/inputs — não pictured no esboço estático, que não captura estado de foco; herda a convenção padrão shadcn de `ring` ≈ `primary`).
- **`accent`/`accent-foreground`** (tom suave de índigo claro / índigo escurecido-dessaturado no escuro) — reservado exclusivamente a estado de **seleção/destaque corrente**: nó de árvore selecionado (`tree-node-selected`), linha de tabela selecionada (`table-row-selected`), opção de mini-árvore marcada no modal "Atribuir Papel". Nunca usado para texto corrido, chrome ou ação.
- **`destructive`/`destructive-foreground`** (vermelho-600 claro / vermelho-400 escuro — ambos matches exatos) — erro de validação de formulário (`form-field-error`) e ação destrutiva (botão "Revogar sessões" no esboço, variante ghost-danger de `button-secondary`).
- **`success`/`success-foreground`** (verde-teal customizado claro / mesmo hue mais claro e menos saturado no escuro) — **adicionado em 2026-10-19** ao contrato canônico de token da AD-13, a pedido do Boss, pra cobrir o estado positivo que faltava (ver nota resolvida em Components abaixo). Não é um stop stock de nenhuma paleta (Tailwind emerald/green inclusive) — chroma e hue foram ajustados deliberadamente pra soar controlado/preciso e puxar pro teal, coerente com o índigo frio do resto do preset, em vez do verde genérico de prateleira. Único uso hoje: fundo sólido de `badge` no estado "Empresa habilitada".

`accent-dark`, `card-dark` e os dois tokens `success`/`success-dark` são os valores deste preset sem correspondência exata num stop oficial da paleta Tailwind v4 — os dois primeiros documentados acima como aproximação/interpolação deliberada preservando a leitura visual do esboço aprovado, e `success`/`success-dark` como cor nova, customizada desde a origem (não havia hex de esboço pra aproximar — ver bullet acima).

## Typography

Pilha sans do sistema operacional (`-apple-system, "Segoe UI", Roboto, ...`) em todos os papéis — escolha intencional do preset (sem custo de carregamento de fonte web), não um Geist Sans herdado de template. Escala:

- **`heading`** (20px/800, tracking -0.01em) — nome da entidade no painel de detalhe (ex. "José Matos"), título de seção de nível 1.
- **`heading-sm`** (16px/800) — título de dialog (ex. "Atribuir Papel").
- **`body`** (13.5px/400) — texto corrido, linha de árvore, célula de tabela.
- **`label`** (11.5px/700, uppercase, tracking 0.06em) — rótulo de campo de formulário, cabeçalho de coluna de tabela (`table-header`), título de seção ("Grupos", "Papéis atribuídos").
- **`caption`** (12px/400, line-height 1.55) — texto de apoio/ajuda (ex. explicação de herança aditiva de módulo no modal), e-mail abaixo do nome.
- **`button`** (13px/600) — rótulo de `button-primary`/`button-secondary`.
- **`mono`** — reservado a identificador técnico (UUID v7 de `DirectoryObject`), nunca em rótulo ou texto corrido. Extrapolação explícita: o esboço aprovado não tem tela mostrando um ID técnico; este papel é herdado por convenção comportamental do `tecton-DESIGN.md` (mesma regra, "nunca em texto corrido") para o dia em que a Admin UI precisar expor um UUID.

## Layout & Spacing

Escala numérica 4-based do Tailwind/shadcn herdada sem override. Dois painéis fixos: sidebar de árvore em `{spacing.sidebar-width}` (272px, largura fixa — o esboço não mostra comportamento responsivo/colapsável; FOUNDATION/breakpoints ficam a cargo do EXPERIENCE.md) e painel de detalhe fluido com `{spacing.detail-padding-x}`/`{spacing.detail-padding-y}` (36px/32px) de respiro interno. Seções dentro do painel de detalhe (Grupos, Papéis atribuídos) são separadas por `{spacing.section-gap}` (24px). Linhas de árvore usam `{spacing.tree-row-gap}` (4px) entre si — denso o bastante para listar muitos objetos sem parecer apertado, graças ao contraste tipográfico (não à distância) carregando a hierarquia.

## Elevation & Depth

Superfície quase inteiramente plana: bordas de 1px (`{colors.border}`) substituem sombra como divisor em toda tela principal — nenhum card ou linha de tabela recebe `box-shadow`. A única elevação real do preset é o **`dialog`**, que recebe uma sombra suave e larga (`0 20px 40px rgba(0,0,0,0.12)` no claro, mesma receita no escuro) para se destacar do conteúdo por trás — reforçada por um overlay de fundo em `{colors.background}` a ~60% de opacidade com leve desfoque (`backdrop-filter: blur(1px)`), uma variação deliberada do overlay preto/50% default do shadcn `Dialog` — override de marca explícito, não um esquecimento.

## Shapes

Escala de cantos discretamente mais arredondada que o Tecton (`sm` 4px/`md` 6px lá vs. `sm` 6px/`md` 8px/`lg` 10px aqui): o suficiente para ler "produto SaaS moderno" sem virar o estilo "pill" de app de consumo. `{rounded.sm}` em nó de árvore e badge; `{rounded.md}` em botão e input; `{rounded.lg}` em dialog; `{rounded.full}` reservado a avatar circular (iniciais do usuário na árvore e no cabeçalho de detalhe) — único lugar onde o preset usa cantos totalmente arredondados.

## Components

Primitivos shadcn usados **como estão, sem override de marca** (herdam o visual default shadcn/Radix): `Tabs`, `Separator`, `Sheet` (sidebar em viewport estreito), `Popover`, `DropdownMenu`, `Toast`/`Sonner`, `Checkbox`, chrome interno de `Select`. Não customizar estes — o contrato é "shadcn default é a decisão certa aqui".

Componentes com override de marca (ou construídos à mão sobre Radix, sem equivalente shadcn upstream):

- **`tree-node`** — texto em `{typography.body}`, cor `{colors.foreground}`, sem fundo. Não é um primitivo shadcn (shadcn não tem um componente de árvore); construído sobre Radix (mesmo padrão do Tecton) com `role="treeitem"` (acessibilidade herdada do `tecton-EXPERIENCE.md`, a detalhar no EXPERIENCE.md desta sessão).
- **`tree-node-selected`** — fundo `{colors.accent}`, texto `{colors.accent-foreground}`, `{rounded.sm}`, sem borda adicional. Usado tanto na árvore principal (sidebar) quanto na mini-árvore de módulo dentro do `dialog` "Atribuir Papel" (`mini-node.selected` no esboço) — mesmo par de tokens nos dois contextos.
- **`table-header`** — texto `{typography.label}` (uppercase, tracking aberto) em `{colors.muted-foreground}`, borda inferior `{colors.border}`. Usado em toda lista via TanStack Table (Usuários, Grupos, Papéis, relatório de import CSV).
- **`table-row-selected`** — fundo `{colors.accent}`, texto `{colors.accent-foreground}`. Extrapolação direta de `tree-node-selected`: o esboço aprovado não tem uma tela de tabela com linha selecionada, mas aplica o mesmo par de tokens por consistência do padrão de seleção do preset (mesmo princípio do `selected-bg` único do Tecton, agora dividido em `accent`/`accent-foreground` pela nomenclatura canônica shadcn).
- **`button-primary`** — fundo `{colors.primary}`, texto `{colors.primary-foreground}`, `{rounded.md}`. Ação principal de cada tela (+ Atribuir Papel, Confirmar).
- **`button-secondary`** — fundo transparente, texto `{colors.foreground}`, borda `{colors.border}`, `{rounded.md}` (variante "ghost" do esboço: Cancelar). Variante destrutiva (Revogar sessões) troca só a cor do texto/borda para `{colors.destructive}`, mantendo fundo transparente — não é um componente novo, é `button-secondary` com a cor de texto trocada.
- **`input`** — fundo `{colors.background}`, borda `{colors.input}`, `{rounded.md}`, anel de foco `{colors.ring}`. Cobre `<input>` de busca da sidebar e `<select>` de formulário (field-select do modal).
- **`form-field-error`** — borda do input substituída por `{colors.destructive}`, mensagem abaixo do campo em `{colors.destructive}` + `{typography.caption}`. Não pictured no esboço aprovado (que não mostra estado de erro); herda o padrão de comportamento já fixado no `tecton-DESIGN.md` importado (borda destrutiva + texto de erro abaixo do campo) — mesma regra, nomenclatura de token traduzida pro contrato canônico shadcn.
- **`dialog`** — fundo `{colors.card}`, texto `{colors.card-foreground}`, borda `{colors.border}`, `{rounded.lg}`, sombra larga (ver Elevation), overlay com leve desfoque (ver Elevation). Usado no modal "Atribuir Papel" (seletor de Papel + mini-árvore de Módulo).
- **`badge`** — fundo `{colors.success}`, texto `{colors.success-foreground}`, borda `{colors.border}`, `{rounded.full}` (pill). Variante de estado habilitado usada para "Empresa habilitada" — agora com cor semântica de positivo (fundo verde sólido), não só a palavra "habilitada" carregando o significado. Variante de estado desabilitado continua trocando só para borda+texto `{colors.destructive}` sobre `{colors.background}` (outline destrutivo), mantendo o mesmo `{rounded.full}`.

**Resolvido em 2026-10-19**: token `success`/`success-foreground` adicionado ao contrato canônico (AD-13), a pedido do Boss, pra cobrir o estado semântico de positivo que faltava. Badge de status "Empresa habilitada" passa a usar `success`/`success-foreground` (verde) em vez do neutro/`muted` anterior; "desabilitada" continua `destructive` (outline), sem mudança.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Usar `{colors.primary}` só em ação primária e `{colors.ring}` de foco | Introduzir uma segunda cor de marca além do índigo |
| Reservar `{colors.accent}`/`{colors.accent-foreground}` exclusivamente para seleção/destaque corrente (árvore, tabela, mini-árvore) | Usar `accent` para chrome, hover decorativo ou estado de sucesso |
| Deixar bordas de 1px (`{colors.border}`) carregarem a hierarquia estrutural | Adicionar `box-shadow` em card, linha de tabela ou painel — só `dialog` eleva |
| Peso 800 + tracking negativo em `{typography.heading}`, uppercase+tracking aberto em `{typography.label}` para hierarquia | Usar `{typography.heading}` em texto corrido "pra ficar bonito" |
| Cantos 6/8/10px (`{rounded.sm}`/`md`/`lg`), `{rounded.full}` só em avatar | Usar `rounded.full` em botão, badge de ação ou card (vira "app de consumo", não "SaaS moderno") |
| Badge de status com cor semântica do contrato canônico (`success` habilitado / `destructive` outline desabilitado) | Inventar um token de cor fora do contrato fixado pela AD-13 sem passar pela arquitetura |
| Tratar `tree-node`/árvore como componente custom sobre Radix, coerente com o padrão Tecton | Tentar forçar a árvore num primitivo shadcn que não existe pra isso (ex. aninhar `Accordion`) |
