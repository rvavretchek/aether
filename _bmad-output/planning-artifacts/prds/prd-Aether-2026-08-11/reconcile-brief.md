---
title: "Reconciliação: Brief vs PRD — Aether"
created: 2026-08-13
input_original:
  - "_bmad-output/planning-artifacts/briefs/brief-Aether-2026-08-10/brief.md"
  - "_bmad-output/planning-artifacts/briefs/brief-Aether-2026-08-10/addendum.md"
input_resultante: "_bmad-output/planning-artifacts/prds/prd-Aether-2026-08-11/prd.md"
---

# Reconciliação: Product Brief (+ addendum) vs PRD — Aether

Checagem de fechamento (Finalize). Não é uma revisão de qualidade do PRD — é uma comparação de conteúdo: o que o Brief prometeu/estabeleceu e o PRD não capturou em nenhuma FR, NFR, ou seção (nem mesmo como nota).

Convenção de severidade usada abaixo: **Gap de escopo** (item do Escopo MVP do Brief sem FR correspondente), **Gap qualitativo** (tom/filosofia/história que sumiu por completo), **Contradição/divergência** (fato técnico que diverge entre os dois documentos).

---

## 1. Roteamento — ausente de qualquer FR (Gap de escopo)

**Onde no Brief:** Seção "Escopo", Dentro (MVP): *"fundação (roteamento, configuração externalizada, logging, tratamento de erro global, dev server com hot-reload)"*.

**O que o PRD tem:** Dos cinco itens listados como "fundação" no Brief, quatro têm FR clara — configuração externalizada (FR-6), logging (FR-24), tratamento de erro global (FR-25), dev server com hot-reload (FR-4). **Roteamento não aparece em nenhum FR, glossário ou nota do PRD.** Busquei por "rotea"/"routing" no documento inteiro e não há ocorrência.

**Por que importa:** roteamento (front e/ou back) é peça de fundação explicitamente listada ao lado de itens que viraram FR — não é um item menor do Escopo que ficou de fora por decisão editorial, parece ter sido perdido na transição prosa → FRs numeradas.

---

## 2. Dockerfile da aplicação — só o Compose sobreviveu (Gap de escopo)

**Onde no Brief:** Escopo MVP: *"Docker mínimo (**Dockerfile** + compose só para banco local)"* — dois artefatos distintos: um Dockerfile (presumivelmente da aplicação) e um compose escopado a "banco local".

**O que o PRD tem:** FR-23 ("Ambiente de desenvolvimento via Docker") descreve só o Docker Compose, cobrindo banco de dados **e** capturador de email (Mailpit/FR-20) — nenhuma menção a um Dockerfile no MVP. A única ocorrência de "Dockerfile" no PRD inteiro é em §6.2, no item de Fast-follow ("Dockerfile/compose de **produção** assistido").

**Duas divergências aqui, não uma:**
- O Dockerfile da aplicação (dev) sumiu — não está no MVP nem no Fast-follow explicitamente como item de dev.
- O escopo do compose do MVP foi ampliado em relação ao Brief: o Brief diz "compose só para banco local"; o PRD inclui o capturador de email (Mailpit) no mesmo compose (FR-23, consequência testável). Isso pode ser uma evolução razoável (FR-20 é nova no PRD e precisa de algo para capturar email em dev), mas é uma expansão de escopo do Brief que vale confirmar como intencional.

---

## 3. "Abstrações prontas para provedores externos de segredos" — só a parte de auth sobreviveu (Gap de escopo)

**Onde no Brief:** Escopo MVP, item de "decisões de arquitetura preparatórias sem custo de escopo": *"abstrações prontas para provedores externos de **auth e segredos**"* (grifo meu — dois provedores, não um).

**O que o PRD tem:** `AuthProvider` (FR-10, §9.1) cobre a parte de auth. Não há nenhuma interface ou abstração equivalente para segredos (algo como um `SecretsProvider` apontando para Vault/OpenBAO/etc.) — o pepper (FR-8) e outras credenciais são tratados apenas como "lidos de configuração externa (variável de ambiente/secret)", sem menção a uma interface de extensão preparatória para trocar por um provedor de segredos externo no futuro.

**Nota relacionada:** `KeyCustodyProvider` (§9.1) é sobre custódia de chave de criptografia por limiar (multi-custodiante), um conceito diferente — não substitui a abstração de "provedor de segredos" genérica que o Brief menciona ao lado de auth.

---

## 4. A história pessoal do NDS e a ambição de longo prazo (Visão do Brief) não migraram — só a comparação genérica ficou (Gap qualitativo)

**Onde no Brief:** Addendum, seção "Por que o pitch não referencia NDS/Novell diretamente" — explica que a referência ao Novell NetWare 4.1/NDS foi deliberadamente reservada para a seção **Visão** do Brief, "onde funciona como origem/motivação". A seção Visão do Brief (não o addendum) conta essa história: *"mais de 30 anos depois de usar o Novell NetWare 4.1 e o NDS, o autor ainda não encontrou nada no ecossistema atual que chegue perto..."* — e também estabelece a ambição de 2-3 anos: o Aether citado "no mesmo fôlego que Django, Rails ou Spring Boot", e a árvore de identidade virando **"a" referência do setor**, do jeito que "Django Admin" virou atalho mental.

**O que o PRD tem:** O §1 do PRD se chama "Visão", mas o conteúdo é na prática um resumo de Sumário Executivo + Diferencial do Brief, não a seção Visão do Brief. Ele menciona "Novell NDS" uma única vez, de forma genérica e comparativa — *"pior do que já foi décadas atrás em ferramentas como o Novell NDS"* — sem a história pessoal (os 30 anos, o NetWare 4.1) e sem a ambição de longo prazo (2-3 anos, "referência do setor", comparação com Django/Rails/Spring Boot). Nenhuma dessas duas coisas aparece em nenhum outro lugar do PRD.

**Por que importa:** o addendum foi explícito que a história pessoal deveria sobreviver *em algum lugar* do artefato voltado a quem vai construir o produto (PRD/arquitetura) — mesmo não sendo material de venda. Da forma como está, o PRD reduziu a referência ao NDS a uma linha de comparação de UX, perdendo tanto a origem pessoal quanto a ambição declarada de 2-3 anos. Não precisa virar FR, mas hoje não está em lugar nenhum do PRD — nem como nota, nem em Visão, nem em Why Now.

---

## 5. "Não é queda de braço" — tom do Brief não tem eco no PRD (Gap qualitativo, provavelmente intencional)

**Onde no Brief:** Seção "O Que Torna Isto Diferente": *"Nenhuma dessas frentes é uma queda de braço contra Wasp, T3 ou qualquer outro. A aposta é que, sendo bom o suficiente, o Aether se adota por conta própria — por praticidade, não por convencimento."*

**O que o PRD tem:** Nada — nem em §1 (Visão), nem em §10 (Why Now), nem em nenhuma nota. Isso é provavelmente intencional: o PRD declara explicitamente em §0 que "não duplica o contexto de mercado e diferenciação já registrado" no Brief. Ainda assim, sinalizando por completude: essa é a peça de tom/filosofia do Brief com menor sobrevivência no PRD — vale confirmar que a omissão foi mesmo por essa razão editorial e não um esquecimento, já que §10 (Why Now) do PRD *reintroduz* parte do contexto de mercado (RedwoodJS, Blitz.js, Wasp) sem reintroduzir esse contraponto de tom.

---

## 6. "ReBAC" como nome do estilo de schema de permissões — termo não aparece no PRD (Gap terminológico / possível contradição)

**Onde no Brief:** Escopo, "Roadmap — próximo marco definido": a Zero Trust mais completa seria *"construída sobre o schema de permissões estilo **ReBAC** já decidido"* — ou seja, o Brief trata "ReBAC" (Relationship-Based Access Control) como uma decisão técnica já tomada para o modelo de permissões do Aether.

**O que o PRD tem:** Os FRs de modelo de permissões (FR-11 a FR-13, Papel/Recurso/herança aditiva) descrevem o comportamento, mas o termo "ReBAC" não aparece em nenhum lugar do PRD — nem no Glossário (§3), nem nas NFRs, nem no roadmap (§6.2, que menciona "Zero Trust mais completa" sem a cláusula "construída sobre ReBAC").

**Por que importa:** não é claro se a omissão é só estilística (o PRD prefere descrever o comportamento a nomear o padrão) ou se há uma divergência real sobre se o modelo implementado é de fato "estilo ReBAC" — vale confirmar, porque é o tipo de rótulo técnico que orienta decisões de arquitetura downstream.

---

## 7. `docs/aether-tecton-compatibility.md` não é citado no PRD (Gap de referência)

**Onde no Brief:** Addendum, seção "Relação técnica com o Tecton": esse documento é chamado de *"fonte de verdade técnica para esse relacionamento — deve ser consultado por quem for trabalhar em PRD ou arquitetura do Aether, especialmente nos subsistemas de identidade, autenticação e segurança."*

**O que o PRD tem:** §0 (Document Purpose) cita a proveniência do PRD a partir do brief.md e do addendum, mas não menciona `docs/aether-tecton-compatibility.md` em nenhum lugar — apesar do PRD tratar extensivamente de identidade (§4.3), autenticação (§4.2) e segurança (§8), exatamente os subsistemas que o addendum aponta como dependentes desse documento.

**Por que importa:** é mais uma lacuna de rastreabilidade do que de conteúdo — as decisões técnicas herdadas do Tecton (Closure Table, herança aditiva, `KeyCustodyProvider`, vocabulário de CLI) parecem ter chegado corretamente ao PRD por outro caminho, mas quem for para a fase de arquitetura não tem, dentro do PRD, o apontamento de onde está a fonte de verdade desse relacionamento.

---

## Contradições factuais diretas encontradas

Nenhuma contradição factual direta e inequívoca (nome de comando, decisão técnica revertida) foi encontrada entre Brief+addendum e PRD. Os itens acima que mais se aproximam de "contradição" são:
- item 2 (expansão do escopo do Compose do MVP além de "só banco local"), e
- item 6 (termo "ReBAC" do Brief não confirmado nem contradito no PRD, apenas ausente).

Todo o restante checado — nomes de CLI (`new`, `generate`, `migrate`, `dev`), decisões herdadas do Tecton (Closure Table, herança aditiva simples, Prisma, `KeyCustodyProvider`), Fast-follow (Redis/filas/i18n/Docker de produção), Roadmap (auth plugável, árvore drag-and-drop, isolamento por banco dedicado, mTLS) e Someday (plugins, migração Tecton, CRUD genérico, PWA, WebSockets, upload streaming, OpenAPI client) — está consistente entre os dois documentos.
