---
name: 'Revisão Adversarial — Acessibilidade (WCAG 2.2 AA)'
status: draft
created: '2026-10-19'
reviewer: 'lente adversarial de acessibilidade (Claude)'
scope:
  - EXPERIENCE.md (Accessibility Floor, Component Patterns, Interaction Primitives, State Patterns, Key Flows)
  - DESIGN-minimal-saas.md (Colors, Components)
  - DESIGN-acolhedor.md (Colors, Components)
  - DESIGN-tecnico-premium.md (Colors, Components)
  - DESIGN-autoral.md (Colors, Components)
---

# Revisão Adversarial — Acessibilidade WCAG 2.2 AA

**Veredito geral**: a promessa "WCAG 2.2 AA em toda a superfície" (`EXPERIENCE.md`, Accessibility Floor) é uma afirmação de intenção bem escrita, mas em pelo menos quatro pontos ela promete uma garantia comportamental que o texto não entrega — ou que a biblioteca escolhida não dá de graça — e em um ponto (navegação por teclado da árvore em RTL) ela se contradiz dentro do próprio documento. Nenhum dos 4 `DESIGN.md` documenta um número de contraste calculado; a conformidade de cor é afirmada, nunca demonstrada.

---

## 1. Contraste de cor: afirmado, nunca demonstrado

**Onde**: `EXPERIENCE.md` → Accessibility Floor, linha "Comportamental — contraste visual vive em `DESIGN.md` (paleta verificada para WCAG 2.2 AA nos 4 presets)."; e as seções **Colors** dos 4 `DESIGN-*.md`.

**O que falta**: busquei em todo o diretório por qualquer razão de contraste numérica (`4.5:1`, `3:1`, "contrast ratio", "razão de contraste") — não existe nenhuma, em nenhum dos 4 arquivos. Cada `DESIGN.md` documenta proveniência de cor (hex do esboço → OKLCH, qual stop do Tailwind cada token usa) com um rigor de rastreabilidade real e elogiável, mas o salto de "este é o valor de cor" para "este par passa AA" nunca é mostrado — é assumido. O próprio arquivo herdado `imports/tecton-directory-admin/tecton-DESIGN.md` (linha 90) repete o mesmo padrão: "Escolha neutra e amplamente testada para contraste AA" — uma afirmação sem o teste anexado.

Fiz uma verificação própria (fora do texto, como checagem de plausibilidade, não como citação dos arquivos) em dois pares que pareciam mais arriscados:
- `minimal-saas`: `primary-foreground-dark` (`{colors.background-dark}`, quase-preto) sobre `primary-dark` (índigo-400 claro) → ≈6,6:1, passa confortavelmente.
- `minimal-saas`: `muted-foreground` (zinc-500, `#71717A`) sobre `background` branco, usado em `table-header`/`label` (11,5px/700) → ≈4,83:1 — passa, mas por uma margem mínima (o piso AA para texto pequeno é 4,5:1), e exatamente o tipo de par que uma verificação documentada deveria ter capturado e registrado como "margem estreita, não trocar o tom sem reconferir."

Esse spot-check não prova uma falha real — prova que o espaço de risco existe e que a "verificação" alegada no `EXPERIENCE.md` não está, de fato, registrada em lugar nenhum que um implementador possa auditar depois.

**Consequência concreta**: um dev gerando a partir destes `DESIGN.md` não tem como saber QUAIS pares já foram validados e quais não — a frase "paleta verificada" no `EXPERIENCE.md` dá falsa confiança de que todo o trabalho de acessibilidade de cor já foi feito, quando na realidade nenhum número sobrevive no artefato. Se um par realmente falhar AA (ex. um ajuste futuro de tom em `muted-foreground` para "ficar mais sutil"), não há bloqueio documental nenhum que avise o dev.

---

## 2. Árvore ARIA — cobertura real, mas o texto não reafirma os 3 usos no ponto que importa

**Onde**: `EXPERIENCE.md` → Accessibility Floor: "Árvore lateral (navegação primária) e árvore de picker: mesmo padrão ARIA Tree View completo... `aria-expanded`, `aria-level`, `aria-selected`, `aria-posinset`, `aria-setsize`."

**O que falta**: Component Patterns (linha da tabela `tree-node`) enumera **três** usos: árvore lateral, mini-árvore de Módulos e "navegador de Grupo-de-origem" (seletor de membros). Interaction Primitives reforça isso explicitamente com a frase "árvore de picker (Módulo, Grupo-de-origem)". Mas a frase da Accessibility Floor usa só "árvore de picker" no singular genérico, sem repetir o parênteses "(Módulo, Grupo-de-origem)" que as outras duas seções tomam o cuidado de escrever. A cobertura das três árvores *provavelmente* é a intenção — mas é a única seção do documento que depende de o leitor inferir isso por extensão de outra seção, em vez de nomear os três contextos como todas as outras tabelas fazem. Para uma seção cujo propósito inteiro é ser o contrato comportamental de acessibilidade, essa é a única subseção que relaxa o próprio padrão de precisão do documento.

**Consequência concreta**: um dev lendo só a Accessibility Floor (sem cruzar com Component Patterns) pode implementar `aria-level`/`aria-posinset`/`aria-setsize` só na árvore lateral e deixar o "navegador de Grupo-de-origem" do seletor de membros (Flow 1b) como uma lista semi-acessível sem a semântica de posição ("item 3 de 12") — exatamente o cenário que a seção promete evitar.

---

## 3. Tabela (TanStack Table v9): a promessa de ARIA não é nativa da biblioteca — e o documento não avisa isso

**Onde**: `EXPERIENCE.md` → Accessibility Floor: "Tabela (coadjuvante, dentro de um ramo): `<th scope="col">` correto, estado de ordenação exposto via `aria-sort`, linha selecionável anunciando `aria-selected`"; e Foundation/Component Patterns, que descrevem TanStack Table só pelo lado de estado (sort/filtro/página na URL).

**O que falta**: TanStack Table (v8/v9) é uma biblioteca **headless** — ela não renderiza `<table>`/`<th>`/`<td>` nem atributos ARIA; ela só expõe estado e funções (`getSortedRowModel`, `row.getIsSelected()`, etc.). `aria-sort`, `<th scope="col">` e `aria-selected` **não vêm de graça** — é trabalho de implementação manual do dev gerado, exatamente como `form-field-error`/foco em erro de validação. O documento trata essa garantia ARIA como se fosse uma "regra comportamental" simples, no mesmo nível de confiança que, por exemplo, "`Esc` fecha o diálogo" (que É nativo do Radix `Dialog`, biblioteca usada de propósito por isso). Em nenhum lugar — nem em Foundation, nem em Component Patterns, nem na própria Accessibility Floor — o documento registra que essa é uma lacuna de implementação explícita a cobrir, ao contrário de outras decisões do mesmo documento que SÃO cuidadosas em marcar "gap registrado" (ex. camada Empresas sem backend, mecanismo de i18n Deferred).

**Consequência concreta**: se o gerador (`aether-admin new`) ou a `bmad-dev-story` que implementar esta tela tratar a tabela como "TanStack Table já cuida disso" (leitura razoável do texto atual), a tabela sai sem `aria-sort`/`scope="col"`/`aria-selected` reais — um leitor de tela não anuncia a coluna de ordenação corrente nem a linha selecionada em lote (cenário do Flow 1b, "Adicionar em lote").

---

## 4. Formulário (RHF + Zod): `aria-live` não é comportamento nativo do React Hook Form

**Onde**: `EXPERIENCE.md` → Accessibility Floor: "Formulário de CRUD (RHF + Zod): todo campo com `label` associado; erro de validação anunciado via `aria-live` (região polida) no momento em que aparece."

**O que falta**: React Hook Form gerencia estado e `formState.errors`; ele não injeta `aria-live`, `aria-invalid` nem `aria-describedby` automaticamente — isso é markup que o componente `form-field-error` tem que implementar manualmente (região `aria-live="polite"` ou `role="alert"` ao redor da mensagem, e idealmente `aria-invalid="true"` + `aria-describedby` no `<input>` apontando pro id da mensagem de erro). O documento nomeia a garantia de `aria-live` como se fosse consequência automática de "usar RHF + Zod", sem mencionar `aria-invalid`/`aria-describedby` em nenhum lugar — nem na Accessibility Floor, nem na linha `form-field-error` de Component Patterns ("Inline, abaixo do campo... campo com erro recebe foco").

**Consequência concreta**: sem `aria-describedby`, um usuário de leitor de tela que tabula de volta para um campo já marcado como erro (depois do anúncio inicial via `aria-live` ter passado) não tem como saber, ao focar o campo novamente, que ele está em estado de erro nem reler a mensagem — o leitor de tela anuncia só o `label` do campo, nunca "campo inválido: {mensagem}".

---

## 5. Dark mode × contraste: os 4 `DESIGN.md` não verificam o par `-dark` separadamente — e dois admitem isso por escrito

**Onde**: Colors de todos os 4 `DESIGN-*.md`; achados textuais diretos em `DESIGN-acolhedor.md` (linha do token `ring`: *"Gap registrado: nenhum valor de foco foi validado visualmente com o Boss; se o contraste do anel terracota sobre `background` precisar de ajuste de acessibilidade, é um ajuste de Camada 1..."*) e em `DESIGN-autoral.md` (linha do token `destructive`: *"Lacuna registrada: ... `destructive-foreground-dark` foi extrapolado... esse par não foi validado visualmente pelo Boss e deve ser conferido na primeira implementação real."*).

**O que falta**: os 4 presets constroem o par `-dark` por uma heurística visual consistente (mesmo matiz, luminosidade/saturação ajustada) — não por um segundo cálculo de contraste independente do par claro. Dois presets (`acolhedor`, `autoral`) são honestos sobre isso e documentam a lacuna explicitamente nos pontos onde a extrapolação é mais arriscada (foco, destructive-foreground-dark). Os outros dois (`minimal-saas`, `tecnico-premium`) **não têm nenhuma marca de "gap registrado" equivalente** — o que é pior, não melhor: ou esses dois presets realmente verificaram o par escuro (e não deixaram rastro, voltando ao achado nº1), ou simplesmente não verificaram e não acharam necessário avisar, ao contrário dos outros dois presets da mesma sessão de design.

**Consequência concreta**: a garantia "WCAG 2.2 AA em toda a superfície" do `EXPERIENCE.md` não distingue tema claro de escuro — mas a evidência textual mostra que, na prática, só o tema claro tem qualquer tipo de verificação implícita (herança de stops oficiais do Tailwind, nos presets que usam zinc/stops exatos); o escuro é inferência de design, não verificação de acessibilidade, em pelo menos 2 dos 4 presets por admissão própria do documento.

---

## 6. Teclado: o menu de contexto não tem gatilho por teclado documentado

**Onde**: `EXPERIENCE.md` → Component Patterns (linha "Menu de contexto (clique direito)") e Interaction Primitives (linha "Clique direito num nó — abre menu de contexto").

**O que falta**: a única forma documentada de abrir o menu de contexto de um nó é **clique direito do mouse**. Interaction Primitives lista `Enter`/clique, `→`/`←`, `↑`/`↓`, clique direito, `Esc` — não existe nenhuma tecla ou combinação (ex. tecla "Menu"/"Context Menu", `Shift+F10`, ou um atalho alternativo) para abrir esse mesmo menu sem mouse. Isso importa porque, pela própria tabela de Component Patterns, o menu de contexto é onde moram ações como "Editar" e "Remover do grupo" — e **nenhum Key Flow do documento mostra um botão direto equivalente para "Editar"** um Usuário/Grupo/Papel existente a partir do painel de detalhe (os Key Flows cobrem associar grupo, importar CSV, atribuir papel, revogar sessões e gerenciar Empresas — nunca "editar" os campos próprios da entidade). Pelo texto como está, "Editar" parece ser uma ação **só alcançável por mouse**.

**Consequência concreta**: um usuário operando só por teclado (requisito explícito da própria Accessibility Floor, "Totalmente navegável por teclado... sem depender de mouse") não consegue, pelo texto documentado, acionar "Editar" em nenhum nó — uma falha direta e concreta de WCAG 2.1.1 (Keyboard), na própria superfície que o documento promete ser 100% navegável por teclado.

---

## 7. i18n × acessibilidade: a garantia de independência de idioma se contradiz com as próprias teclas de seta da árvore

**Onde**: `EXPERIENCE.md` → Accessibility Floor, última linha: *"i18n: ... não bloqueia a acessibilidade de teclado/leitor de tela, que independe do idioma do texto."*; contra Interaction Primitives: *"`→`/`←` — expande/colapsa nó focado"* (fixo, sem variação).

**O que falta**: a afirmação é verdadeira para idiomas LTR (inclui pt-BR e a maioria do público-alvo "devs fora do Brasil" mencionado na decisão de i18n obrigatório), mas é factualmente falsa para qualquer idioma RTL (árabe, hebraico) — nesses casos, a prática de autoria ARIA estabelecida para árvores (APG — Tree View Pattern) espera que `→` colapse e `←` expanda quando a direção de leitura é invertida, exatamente o oposto do que este documento fixa de forma incondicional. O `EXPERIENCE.md` não faz nenhuma ressalva de escopo (“isto vale desde que RTL não seja suportado”) — ele afirma a independência de idioma sem qualificação, no mesmo parágrafo em que descreve i18n como decisão arquitetural aberta a "devs fora do Brasil" em geral, sem excluir RTL explicitamente.

**Consequência concreta**: se o framework algum dia ganhar suporte a um idioma RTL (não descartado pelo texto — só "Deferred" quanto ao mecanismo, nunca quanto ao conjunto de idiomas), a árvore herdaria o comportamento de seta LTR sem qualquer aviso de que isso precisa ser revisitado — contradizendo a própria frase que diz que teclado "independe do idioma". É uma garantia absoluta sobre um recorte (LTR) que o documento nunca declara como recorte.

Quanto à segunda parte do item 7 (comprimento de string variável quebrando `aria-label`): não encontrei no texto nenhum `aria-label` com interpolação de variável cujo comprimento seja estruturalmente arriscado (os exemplos citados — "Nenhum usuário encontrado para '{termo}'", "item 3 de 12" — são mensagens de texto visível, não atributos `aria-label` truncados por CSS); este sub-ponto não tem base textual suficiente para ser reportado como achado e foi descartado para não inventar um problema que o texto não sustenta.

---

## Resumo por severidade

| # | Achado | Severidade |
|---|---|---|
| 3 | TanStack Table não dá ARIA de graça; documento não avisa | Alta — lacuna de implementação disfarçada de regra simples |
| 6 | Menu de contexto sem gatilho de teclado; "Editar" pode ficar inacessível | Alta — violação direta de 2.1.1 na própria superfície "100% teclado" |
| 4 | `aria-live` não é nativo do RHF; falta `aria-invalid`/`aria-describedby` | Média-alta — anúncio funciona uma vez, re-foco no campo não |
| 1 | Contraste "verificado" sem nenhum número documentado nos 4 presets | Média — risco de regressão silenciosa, não falha confirmada |
| 5 | Par `-dark` sem verificação própria; 2 presets admitem, 2 ficam em silêncio | Média — mesma raiz do achado 1, agravada no escuro |
| 7 | Independência de idioma contradita pelas setas fixas em RTL | Baixa-média — só se materializa se RTL for suportado no futuro |
| 2 | Accessibility Floor não reafirma os 3 usos de árvore por nome | Baixa — provavelmente coberto por extensão, mas é a única seção que relaxa o próprio padrão de precisão do doc |
