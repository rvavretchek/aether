---
name: 'Review Adversarial — Update 2026-10-16'
type: architecture-review
target: ARCHITECTURE-SPINE.md (Aether) — foco em AD-13, 2026-10-15
method: 'duas unidades de implementação hipotéticas, cada uma obedecendo cada AD à letra, buscando pares de decisões legítimas-mas-incompatíveis (forma de dado compartilhado colidindo, dois "donos" da mesma entidade, caminhos conflitantes de mutação de estado)'
created: '2026-10-16'
status: draft
---

# Review Adversarial — Update de 2026-10-16 (foco AD-13)

## Veredito

AD-13 fecha a lacuna que se propôs a fechar (qual UI kit, quantos presets, quando é escolhido) mas abre pelo menos duas lacunas novas sérias — a mais grave sendo que o artefato que ela cita como fonte da verdade dos 4 presets (`DESIGN.md`/`EXPERIENCE.md` da sessão de UX) está **vazio** (stub de front-matter), deixando cada preset com uma única fonte real em rascunhos HTML não normalizados em `.working/` — e isso, combinado com decisões que AD-13 deixa implícitas (nomes de custom property do shadcn, mecanismo de toggle de dark mode, dono do estado de paginação/ordenação), é suficiente para duas sessões/agentes 100% conformes produzirem admin UIs visual e estruturalmente incompatíveis.

## Metodologia

Para cada achado: (a) a regra da AD que ambas as sessões hipotéticas obedecem à letra; (b) a ambiguidade que a regra deixa aberta; (c) a leitura A e a leitura B, ambas defensáveis; (d) a colisão concreta de forma de dado / dono de entidade / caminho de mutação que resulta; (e) evidência do repo quando aplicável; (f) a AD nova ou mais rígida que fecha o buraco.

---

## Achado 1 (CRÍTICO) — A fonte da verdade dos 4 presets citada por AD-13 está vazia; não existe token spec normalizado

**AD-13, linha 127:** *"cada um com variante clara e escura via CSS custom properties — ver `DESIGN.md`s da sessão de UX"*; e no `Prevents` (linha 126): *"desperdiça exploração visual já validada com o Boss"*.

**Fato verificado nesta revisão:**
- `_bmad-output/planning-artifacts/ux-designs/ux-Aether-2026-10-07/DESIGN.md` = 4 linhas, só front-matter (`status: draft`), **zero conteúdo**.
- `EXPERIENCE.md` da mesma sessão = 4 linhas, mesmo estado.
- O `.memlog.md` da própria sessão de UX confirma que isso é trabalho pendente, não concluído: *"Custo real está no AUTORAL AGORA: as 4 direções (hoje esboços HTML) precisam virar 4 DESIGN.md completos (tokens + Do's/Don'ts)... trabalho 4x maior no Finalize desta sessão de UX, não depois."* — ou seja, o Finalize que geraria o `DESIGN.md` real nunca rodou.
- A única fonte concreta hoje é `.working/direction-{minimal-saas,acolhedor,tecnico-premium,autoral}.html` — rascunhos exploratórios, pasta de trabalho (não artefato final), com:
  - Cores em **hex puro** (`--accent: #4F46E5`), não OKLCH — mas AD-13/Stack exigem `@theme` CSS-first "cores OKLCH".
  - Nomes de custom property **não-canônicos do shadcn** (`--bg`, `--panel`, `--panel-alt`, `--text`, `--text-muted`, `--accent`, `--accent-soft`, `--danger`) — o shadcn/ui espera `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--border`, `--destructive`, `--ring` etc., referenciados pelas classes Tailwind já escritas dentro de cada componente copiado (`bg-background`, `text-foreground`...).
  - Toggle claro/escuro implementado via **classe** (`.theme-light` / `.theme-dark` num ancestral), não via `prefers-color-scheme` nem `data-theme` — mecanismo nunca mencionado por AD-13.
  - Tokens quase-mas-não-totalmente uniformes entre direções: `autoral` tem `--gradient` extra, `tecnico-premium` tem `--mono-id` extra — nenhum dos dois existe nas outras 2 direções.

**Leitura A vs. Leitura B:**
- **Sessão A** lê "ver DESIGN.md" literalmente, não encontra nada, decide que a responsabilidade é dela: abre os 4 HTMLs, extrai os hex, converte para OKLCH com sua própria ferramenta/heurística, e **renomeia** os tokens para o vocabulário canônico do shadcn (`--bg`→`--background`, `--accent`→`--primary`...) para que os componentes copiados funcionem sem edição.
- **Sessão B** faz a mesma extração mas **preserva os nomes originais** dos mockups (`--bg`, `--panel`...) por fidelidade ao que "já foi validado com o Boss" (linha do Prevents), e então precisa editar manualmente as classes Tailwind dentro de cada arquivo de componente shadcn copiado para apontar para os novos nomes.

**Colisão concreta:** duas formas de "tema" fisicamente incompatíveis. Pegar o `Button.tsx` da Sessão A com o `theme.css` da Sessão B (ou vice-versa) resulta em componente sem estilo (classes resolvendo para nada). Mesmo dentro de uma única sessão, os valores OKLCH exatos são um artefato da ferramenta de conversão escolhida — duas conversões de `#4F46E5` para OKLCH por caminhos diferentes não batem bit-a-bit, então mesmo duas sessões que **concordam** no vocabulário de nomes ainda produzem `@theme` blocks numericamente distintos, sem nenhum valor OKLCH canônico registrado em lugar nenhum do repo hoje.

**AD nova/mais rígida proposta:** AD-13 não deveria citar um artefato vazio como fonte normativa. Antes de qualquer sessão de implementação começar, rodar o Finalize da sessão de UX (gerar os 4 `DESIGN.md` reais, com os valores OKLCH já calculados e nomeados no vocabulário canônico do shadcn, não em hex/nomes ad-hoc de mockup) — ou, se isso não for prioridade imediata, adicionar uma regra explícita a AD-13: "os 4 presets usam o vocabulário de CSS custom properties do shadcn/ui sem renomear (lista fixa: `--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--muted`, `--muted-foreground`, `--border`, `--destructive`, `--ring`...); os valores OKLCH de cada preset são computados uma única vez e commitados em `packages/shared` ou em um arquivo de referência versionado — nenhuma sessão re-deriva valor de cor a partir do hex do mockup."

---

## Achado 2 (ALTO) — Mecanismo de toggle claro/escuro e dono do estado persistido não são especificados

**AD-13, linha 127:** *"dark mode é parte do default desde o início"* — não diz **como** o usuário alterna entre claro/escuro, nem onde esse booleano vive.

**Leitura A:** toggle explícito controlado por JS, persistido em `localStorage` (ex.: `data-theme` no `<html>`, lido num `useEffect` antes do primeiro paint) — cliente-only, nunca toca o backend.

**Leitura B:** nenhum toggle explícito — tema segue só `prefers-color-scheme` do SO, sem estado de aplicação algum (lendo "variante clara e escura via CSS custom properties" como "ambas existem, o browser decide").

**Leitura C (perigosa):** um agente bem-intencionado decide que a preferência deveria **persistir por usuário entre dispositivos**, e a implementa como um campo dentro do `attributes JSONB` que a AD-11 já adicionou a cada tabela de extensão (`User.attributes`) — isso **viola diretamente** a própria AD-11 (linha 111: *"Toda extensão pode ter uma coluna `attributes JSONB` própria... schema-ready, **nunca populada por nenhuma procedure no MVP**"*), mas nada em AD-13 fecha essa porta explicitamente a partir do lado da UI — a proibição só existe no texto da AD-11, sem referência cruzada.

**Colisão concreta:** Sessão A entrega um toggle com estado em `localStorage`; Sessão B entrega zero controle de UI (tema 100% automático); se uma terceira sessão (ou o próprio Boss) pedir "um botão de alternar tema" depois, ela herda ambiguidade sobre se isso é um retrofit client-only trivial (compatível com B) ou se já deveria ter existido desde o início (A) — e um agente que tentar "fazer bem" ao persistir a preferência no servidor abre uma violação de AD-11 que nenhuma AD avisa explicitamente para quem está implementando a camada de UI.

**AD nova/mais rígida proposta:** adicionar a AD-13 (ou a uma convenção): "o modo claro/escuro é alternável via um controle explícito na UI (não só `prefers-color-scheme`); o estado é mantido exclusivamente em `localStorage` no cliente — nenhuma procedure tRPC lê ou escreve preferência de tema, inclusive via `User.attributes` (reforça a proibição da AD-11 a partir do lado do consumidor)."

---

## Achado 3 (ALTO) — Dono do estado de paginação/ordenação/filtro das tabelas: URL+loader vs. estado local do widget

**AD-13, linha 128:** *"TanStack Table (headless...) para sort/filtro/paginação."* **Consistency Conventions, linha 147:** *"Data fetching (frontend): `loader` de rota... chamando o client tRPC diretamente; sem TanStack Query no MVP."*

Nenhuma das duas regras diz se a paginação/ordenação/filtro da tabela é **server-side (manual)**, disparando um novo `loader` via navegação com search-params na URL, ou **client-side**, com o `loader` buscando a lista inteira uma vez e o TanStack Table paginando em memória via seu próprio estado React interno.

**Leitura A (server-side):** `loader` lê `?page=2&sort=email` da URL, chama a procedure tRPC com esses parâmetros, `TanStack Table` configurado com `manualPagination`/`manualSorting: true`; navegar = re-executar o loader. Estado "fonte da verdade" = URL.

**Leitura B (client-side):** `loader` busca a lista completa uma vez; `TanStack Table` gerencia página/ordenação/filtro inteiramente em `useState` interno, sem nunca re-invocar o loader. Estado "fonte da verdade" = memória do componente, perdido ao recarregar a página.

**Colisão concreta:** comportamentos de produto incompatíveis e não-intercambiáveis — URL compartilhável/bookmarkável e botão "voltar" funcional (A) vs. não (B); e para a lista de import CSV ou para "Usuários" em instalação grande, a escolha decide se a procedure tRPC recebe parâmetros de paginação como input obrigatório (A, muda `schema.ts`) ou não (B, lista completa sempre). Duas sessões implementando módulos administrativos diferentes (ex.: tela de Usuários vs. relatório de import CSV) sob essa ambiguidade plausivelmente escolhem padrões opostos, e o resultado é inconsistente dentro do **mesmo** app — exatamente o tipo de "duas convenções coexistindo" que o próprio `Prevents` de AD-13 (linha 126) diz querer evitar, só que um nível abaixo (estado de tabela, não biblioteca de componente).

**AD nova/mais rígida proposta:** estender a convenção "Data fetching" para cobrir listas: "toda lista paginada do Admin UI é server-side; página/ordenação/filtro vivem como search-params da URL, lidos pelo `loader` e passados à procedure; `TanStack Table` é configurado com `manualPagination`/`manualSorting`/`manualFiltering: true` em todo lugar — nunca paginação em memória para uma lista potencialmente grande."

---

## Achado 4 (MÉDIO-ALTO) — `generate module` escala para o lado web, ou Admin UI continua exclusivamente hand-built?

AD-6 fixa que `generate module` cria código em `apps/api/src/modules/<slug>/` + linha no `Module`/`ModuleClosure` — nunca menciona `apps/web`. AD-13 resolve "a convenção" de componente/visual do Admin UI, mas nunca diz se essa convenção é **aplicada automaticamente pelo gerador** para cada novo módulo de negócio, ou se o Admin UI continua restrito às entidades fixas de identidade (Usuários/Grupos/Papéis/Empresas) já hand-built na Epic 5.

**Leitura A:** agora que a convenção visual está fechada, é natural que `generate module` passe a também gerar uma tela de lista (TanStack Table) + formulário CRUD (RHF+Zod) em `apps/web/src/routes/<slug>/` para todo módulo de negócio novo — a Structural Seed ganharia uma pasta nova não documentada hoje.

**Leitura B:** Admin UI (FR-14) é escopo fechado nas entidades de identidade; módulos de negócio gerados por `generate module` não recebem UI nenhuma automaticamente no MVP — API apenas.

**Colisão concreta:** sob Leitura A, um agente adiciona um passo inteiro de geração de arquivos em `apps/web` dentro do comando `generate module`, mudando radicalmente a Structural Seed e criando uma nova classe de arquivo-adapter (análoga aos 4 fixos de AD-1, mas do lado do front) que nenhuma AD governa — nomenclatura, onde o `loader` fica, como ele descobre o `resource-id` de AD-7 para proteger a rota no cliente, etc. Sob Leitura B, isso simplesmente não existe. As duas sessões produzem monorepos com contagens de arquivo e convenções totalmente diferentes para "o que `generate module` entrega", e isso nem aparece nos testes de uma sessão porque cada uma só valida contra a própria leitura.

**AD nova/mais rígida proposta:** uma frase explícita em AD-6 ou AD-13: "`generate module` no MVP produz **apenas** os artefatos de AD-1 (`apps/api`); nenhuma tela de Admin UI é gerada automaticamente para módulos de negócio — telas administrativas continuam exclusivamente as entidades de identidade já especificadas (FR-14). Gerador de tela por módulo é Deferred, mesmo status de `generate directory-object`." (Ou o inverso, se essa for de fato a intenção do Boss — mas precisa estar escrito, não implícito.)

---

## Achado 5 (MÉDIO) — Dado client-side da "árvore grande" (TanStack Virtual): árvore completa vs. lazy-load por nó

AD-13 linha 129 só nomeia a biblioteca (`TanStack Virtual`) para o Key Flow "busca em árvore grande" (herdado do `tecton-EXPERIENCE.md`). Não especifica o contrato de dados entre o `router.ts` e o componente: a árvore completa de `Module`/`ModuleClosure` (que, pela reconciliação da Story 3.1, é **global**, não por tenant — potencialmente grande com múltiplos tenants de uma instalação) é buscada de uma vez e virtualizada inteiramente em memória, ou é carregada incrementalmente por nó conforme o usuário expande (lazy-load)?

**Leitura A:** uma procedure `tree.getAll()` retorna a árvore inteira; componente mantém um array plano e virtualiza por índice.
**Leitura B:** uma procedure `tree.getChildren(parentId)` é chamada por nó expandido; componente mantém um mapa incrementalmente populado, nunca com a árvore inteira em memória.

**Colisão concreta:** shapes de procedure e de estado de componente totalmente diferentes — não dá para trocar um pelo outro sem reescrever `resources.ts`/`schema.ts` do módulo de árvore E o componente. Como esse mesmo padrão de árvore vale tanto para a navegação principal quanto (achado do memlog de UX) para o seletor de membros de grupo, a divergência se propagaria para pelo menos dois componentes.

**AD nova/mais rígida proposta:** adicionar a AD-13 (ou a uma nota junto ao Key Flow): "a árvore de módulos é buscada por completo numa única chamada (`tree.getAll()`), nunca lazy-load por nó — o volume esperado no MVP (estrutura de código, não dado de tenant) não justifica paginação incremental; `TanStack Virtual` resolve a performance de renderização, não a de fetch."

---

## Achado 6 (MÉDIO) — Campos de formulário que não existem no schema Zod do procedure (UI-only) não têm dono definido

AD-13 linha 130 diz que os formulários de CRUD reusam "os schemas Zod que `packages/shared/src/schemas/admin.ts` já tem", e AD-3 (linha 60) é taxativa: schema de módulo vive só em `packages/shared`, nunca duplicado. Mas formulários reais quase sempre têm campos que não vão para o backend (confirmação de senha, checkbox de "enviar e-mail de boas-vindas" que na verdade é side-effect e não payload, step de preview antes de confirmar import CSV). AD-13 não diz onde esses campos UI-only são declarados.

**Leitura A:** o schema de `packages/shared` é estendido localmente dentro do componente via `schema.extend({...})` só para o resolver do RHF, sem tocar `packages/shared` — única fonte continua lá, extensão é estritamente aditiva e local.
**Leitura B:** um agente, sob pressão de "não devo modificar o pacote compartilhado para um detalhe de UI", escreve um schema Zod **paralelo e duplicado** direto em `apps/web`, copiando os campos reais do schema de admin.ts à mão — exatamente a duplicação que AD-3 proíbe, mas nascida de uma lacuna de AD-13, não de ignorância de AD-3.

**Colisão concreta:** sob Leitura B, quando `admin.ts` ganha um campo novo ou uma regra de validação muda, o formulário duplicado da Sessão B diverge silenciosamente — exatamente o cenário que AD-3 foi escrita para prevenir, reaberto por uma AD mais nova que não repetiu a restrição no contexto específico de formulário.

**AD nova/mais rígida proposta:** uma frase em AD-13: "campos de formulário sem correspondente no schema Zod do procedure (ex.: confirmação de senha, opções de side-effect) são declarados via `.extend()`/`.merge()` sobre o schema importado de `packages/shared` dentro do componente — nunca um schema Zod paralelo redeclarando campos que já existem lá."

---

## Observação fora de AD-13 estrito

O memlog da sessão de UX revela que o mesmo padrão de "escolha em tempo de geração, sem registro durável do que foi escolhido" se repete para o **form factor** (simples / multi-tenant / SaaS 2 níveis, decidido mas sem AD própria ainda) — o que sugere que o buraco do Achado 1/4 não é um acidente isolado de AD-13, e sim um padrão estrutural: toda decisão "`aether-admin new` pergunta X" carece de uma AD-6-like que diga onde X fica registrado de forma legível depois (preset escolhido, form factor escolhido). Vale uma AD transversal própria quando o form factor for formalizado, em vez de reabrir essa mesma discussão peça por peça.
