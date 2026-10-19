---
name: 'Aether Admin UI — Experience'
status: final
created: '2026-10-07'
updated: '2026-10-19'
sources:
  - '_bmad-output/planning-artifacts/architecture/architecture-Aether-2026-08-14/ARCHITECTURE-SPINE.md (AD-13)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-Aether-2026-10-07/imports/tecton-directory-admin/tecton-EXPERIENCE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-Aether-2026-10-07/.memlog.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-Aether-2026-10-07/.working/flow-atribuir-papel-modulo-2026-10-15.excalidraw'
  - '_bmad-output/planning-artifacts/ux-designs/ux-Aether-2026-10-07/DESIGN-{minimal-saas,acolhedor,tecnico-premium,autoral}.md'
---

# Aether Admin UI — Experience

> Admin UI de identidade do Aether (FR-14): Usuários, Grupos, Papéis, RoleAssignments — e, na forma "SaaS 2 níveis", Empresas (Tenants). Referencia tokens por papel semântico (`{colors.primary}`, nome de componente) — nunca valor literal — e é **o mesmo arquivo para os 4 presets visuais** (`DESIGN-minimal-saas.md`, `DESIGN-acolhedor.md`, `DESIGN-tecnico-premium.md`, `DESIGN-autoral.md`). Irmão comportamental do `tecton-EXPERIENCE.md` (mesmo núcleo de identidade — `docs/aether-tecton-compatibility.md`), com duas diferenças reais de modelo: (1) sem ACL por objeto/nó — todo o Admin UI é gated por `requireAdmin`, nunca granular por item; (2) entidades concretas (User/Group/Role) com formulários de CRUD próprios (React Hook Form + Zod), nunca um formulário genérico gerado de JSON Schema.

## Foundation

Web, desktop-first — SPA servida por `apps/web` (AD-2), a mesma SPA do resto do Aether gerado, não um sub-app visualmente isolado (consistente com AD-13: uma única convenção de componente em `apps/web`). Camada de componente: **shadcn/ui + Tailwind CSS v4** sobre **Radix UI** (acessibilidade), vendorizado no repositório do dev gerado — nunca dependência opaca de `node_modules` (AD-13). Tema (claro+escuro nativo, `.dark` class) é um dos **4 presets visuais** escolhidos em tempo de geração (`aether-admin new`) — este documento é comportamental e vale igual para os 4; a aparência vive nos `DESIGN.md` por preset.

Multi-tenant: cada Tenant é um compartimento de dados próprio (herdado de AD-2/AD-5). Diferente do Tecton, **não há contenção pai-filho real entre User/Group/Role no schema** — são coleções irmãs e planas dentro do Tenant (join tables para associação, ex. User↔Group — ver ERD/AD-11/AD-12). Isso não impede reaproveitar o padrão visual de árvore do ConsoleOne/Tecton como **widget de organização por categoria**, exatamente como os mockups já validados mostram: um painel de árvore lateral persistente, com "Usuários"/"Grupos"/"Papéis" (e, na forma SaaS 2 níveis, "Empresas") como ramos de categoria expansíveis, cada um listando suas entidades como folhas — a árvore organiza a NAVEGAÇÃO, não implica hierarquia real no dado. **TanStack Table** entra como coadjuvante: dentro de uma categoria com muitos itens (paginação/ordenação de uma lista longa de Usuários, por exemplo) e no relatório de import CSV — nunca como substituto da árvore de navegação primária. A árvore de **Módulos** (`Module`/`ModuleClosure`, AD-6, essa sim hierarquia real) é reaproveitada do mesmo padrão comportamental dentro do seletor de escopo do fluxo de atribuição de Papel.

**Sem ACL por nó.** O Tecton esconde objeto sem permissão de leitura (Zero Trust por objeto, FR-7 do Tecton). O Aether não tem esse modelo: o Admin UI inteiro é gated por `requireAdmin` — um admin de tenant vê todos os Usuários/Grupos/Papéis do próprio tenant, sem granularidade por item. Nenhuma superfície deste documento esconde linha/nó por permissão individual.

**Formulários são por entidade, nunca genéricos.** O Tecton gera formulário de atributo em runtime a partir de `objectClass.attributes` (`@rjsf/core`) porque seu core trata tudo como objeto genérico. O Aether tem entidades concretas com schemas Zod já existentes (`packages/shared/src/schemas/admin.ts`, Epic 5) — toda tela de criar/editar User/Group/Role é desenhada por entidade, usando **React Hook Form + `@hookform/resolvers/zod`** (AD-13), reaproveitando o mesmo schema do backend sem duplicar validação (FR-17).

**Árvore de categorias** (navegação primária — Usuários/Grupos/Papéis/Empresas como ramos): **TanStack Virtual** virtualiza só a renderização dos nós; o `loader` da rota busca a árvore inteira (categorias + suas entidades) via tRPC de uma vez, sem lazy-load por nó (AD-13 — volume esperado é escala dev/pequena-equipe). **Tabelas** (lista longa dentro de uma categoria, relatório de import CSV): TanStack Table v9, estado de sort/filtro/página sempre na URL (search params), nunca cache próprio — lido pelo `loader` da rota (AD-13, convenção "Data fetching"). **Árvore de Módulos** (seletor de escopo, modal Atribuir Papel): mesmo mecanismo de virtualização, mesma disciplina de carregar tudo via `loader` de uma vez.

**Forma de rota (decisão "Opção B", escolhida em tempo de geração — `aether-admin new`)**: a composição de rotas do Admin UI é uma de três formas, não três codebases — as mesmas telas, compostas diferente. Ver Information Architecture para a tabela completa.

**i18n obrigatório** (decisão do Boss): framework reaproveitável, destinado também a devs fora do Brasil — toda string de UI é escrita preparada para internacionalização desde o início: sempre chave + interpolação (`t('users.invite.sent', { email })`), nunca concatenação de string nem template literal com texto fixo intercalado a variável. **Mecanismo (biblioteca, formato de chave, onde strings vivem) é Deferred na Architecture Spine** — esta decisão fixa a disciplina de autoria, não a ferramenta; não inventar aqui qual lib será usada.

## Information Architecture

A forma escolhida em `aether-admin new` muda **quais ramos a árvore tem** — não como ela se comporta. Superfície única (mesmo padrão do Tecton: `/admin`, árvore + detalhe, sem roteamento por coleção); a tabela abaixo descreve os ramos e os painéis de detalhe que abrem a partir deles. Coluna "Formas" marca em quais das 3 o ramo aparece:

| Ramo / Painel | Alcançado por | Formas | Propósito |
|---|---|---|---|
| `/admin` (árvore + detalhe) | Login, se `requireAdmin` | Simples, Multi-tenant, SaaS 2 níveis | Superfície única — árvore lateral com ramos de categoria; nenhuma seleção inicial no detalhe |
| Ramo "Usuários" | Árvore lateral | Simples, Multi-tenant, SaaS 2 níveis | Expande em folhas (um Usuário por folha); busca filtra+auto-expande até a folha |
| Detalhe do Usuário | Folha do ramo Usuários | Simples, Multi-tenant, SaaS 2 níveis | Dados do usuário, Grupos (associar/remover), Papéis atribuídos (+ Atribuir Papel), Revogar sessões |
| Importar Usuários (CSV) | Botão "Importar" no painel do ramo Usuários | Simples, Multi-tenant, SaaS 2 níveis | Upload → prévia (válidos/duplicados/inválidos) → confirmação → relatório linha-a-linha (TanStack Table) |
| Ramo "Grupos" | Árvore lateral | Simples, Multi-tenant, SaaS 2 níveis | Expande em folhas (um Grupo por folha) |
| Detalhe do Grupo | Folha do ramo Grupos | Simples, Multi-tenant, SaaS 2 níveis | Membros do grupo (buscar/filtrar por grupo de origem, multi-selecionar, Adicionar em lote) |
| Ramo "Papéis" | Árvore lateral | Simples, Multi-tenant, SaaS 2 níveis | Expande em folhas (catálogo de Papéis do tenant; atribuição em si acontece a partir do Usuário) |
| Modal "Atribuir Papel" | "+ Atribuir Papel" no Detalhe do Usuário | Simples, Multi-tenant, SaaS 2 níveis | Seletor de Papel + mini-árvore de Módulos (escopo), herança aditiva só desce — ver Key Flow 3 |
| Ramo "Empresas" | Árvore lateral, só visível ao admin de sistema | **Só SaaS 2 níveis** | Expande em folhas (uma Empresa/Tenant por folha); folha mostra status habilitada/desabilitada |
| Detalhe da Empresa | Folha do ramo Empresas | **Só SaaS 2 níveis** | "Adicionar admin" / "adicionar usuário" — mesmo fluxo único de convite por e-mail nos dois casos (ver Key Flow 5); habilitar/desabilitar com confirmação |

Diferenças por forma, por extenso:
- **Simples**: sem a palavra "Tenant" em lugar nenhum da UI; a árvore tem só os ramos Usuários/Grupos/Papéis.
- **Multi-tenant**: idêntico à Simples na superfície (mesmos ramos) — o tenant existe no modelo de dados mas a UI não expõe seleção/troca de tenant nem o ramo Empresas. É o que a Epic 5 já entrega hoje.
- **Multi-tenant SaaS 2 níveis**: a árvore ganha o ramo "Empresas" inteiro (tier Godofredo, admin de sistema) além dos ramos de "Minha Organização" (Usuários/Grupos/Papéis do tenant corrente). **A camada Empresas depende de backend que ainda não existe** — procedures cross-tenant (listar/habilitar-desabilitar Tenant, bootstrap de admin) estão registradas como Deferred na Architecture Spine. Este documento descreve a experiência pretendida dessa camada, não implica que já é implementável hoje.
- Upgrade de forma depois de gerado (ex. Simples → SaaS 2 níveis) exige re-rodar/migrar o gerador — trade-off aceito explicitamente pelo Boss, mais barato que carregar um ramo fantasma em todo deploy simples.

→ Composição visual de referência: `.working/flow-atribuir-papel-modulo-2026-10-15.excalidraw` (3 telas, Key Flow 3). Este spine vence em conflito.

## Voice and Tone

Microcopy funcional, mas **não tão neutra quanto o Tecton** — o Boss tratou esta tela como "internal-tool com padrão de polimento consumer" (diferencial competitivo, peça de portfólio), não "ferramenta pura, sem enfeite". Profissional e direta, nunca celebrativa; identidade visual vive em `DESIGN.md`.

| Do | Don't |
|---|---|
| "3 usuários adicionados ao grupo." | "Sucesso! 3 usuários foram adicionados com êxito 🎉" |
| "Nenhum usuário encontrado para '{termo}'." | lista vazia sem explicação |
| "Não foi possível salvar. Tentando novamente." | "Erro 500: Internal Server Error" (sempre RFC 9457 `title`/`detail` traduzido, AD-6) |
| "12 válidos, 2 duplicados, 1 inválido." (prévia de import) | "Processamos seu arquivo!" sem números |
| "Revogar as sessões de {nome}? Ele(a) precisará entrar novamente." | "Tem certeza mesmo?? ⚠️" |
| Mensagens curtas, sem emoji; pode soar levemente mais cordial que um console puramente técnico, nunca "celebrativo" | Tom de produto de consumo (confete, badges de conquista) — isto continua sendo um painel administrativo |

## Component Patterns

Comportamental — especificação visual vive em `DESIGN.md.Components` (mesmos nomes nos 4 presets).

| Componente | Uso | Regras comportamentais |
|---|---|---|
| `tree-node` / `tree-node-selected` | Árvore lateral (navegação primária — ramos Usuários/Grupos/Papéis/Empresas), mini-árvore de Módulos (modal Atribuir Papel), navegador de Grupo-de-origem (seletor de membros) | Reaproveita o padrão comportamental do Tecton: expand/collapse por clique no chevron, clique único seleciona e carrega o painel de detalhe. Ícone por tipo de ramo/categoria (Usuário, Grupo, Papel, Empresa — cada um visualmente distinto, ver `DESIGN.md`). Busca no topo filtra e **expande automaticamente até o nó** (auto-expand + destaque), igual ao Flow 2 do Tecton. **Sem ícone por "classe de objeto ACL-sensível"** — todo nó é sempre visível a quem chegou até a tela (já gated por `requireAdmin`), nunca escondido por permissão individual. |
| `table-header` / linha de `table-row-selected` | Lista longa dentro de um ramo (ex. muitos Usuários), relatório de import CSV | TanStack Table v9, coadjuvante — nunca substitui a árvore de navegação primária. Clique no cabeçalho ordena (estado na URL); clique na linha abre detalhe. Seleção múltipla via checkbox na primeira coluna quando a tela permite ação em lote (ex. seletor de membros do Flow 1b). |
| Menu de contexto (clique direito, ou tecla de menu de contexto/`Shift+F10` no nó focado) | Nó da árvore (Usuário/Grupo/Papel/Empresa) | Mostra as ações disponíveis para aquele nó (Ver detalhes, Editar, Revogar sessões se Usuário, Remover do grupo se dentro do Detalhe do Grupo). **Sempre alcançável por teclado**, nunca só clique direito (achado do Reviewer Gate de 2026-10-19 — "Editar" nunca pode viver SÓ aqui, ver linha "Editar atributos" abaixo). **Nunca esconde item por permissão individual** — diferente do Tecton, toda a tela já está atrás de `requireAdmin`; se uma ação não existe pra aquele tipo de nó ela simplesmente não está na lista, não aparece esmaecida. |
| "Editar" (botão visível no painel de detalhe) | Cabeçalho do painel de detalhe (Usuário/Grupo/Papel/Empresa) | Mesma ação do item "Editar" do menu de contexto, mas **nunca exclusiva dele** — sempre existe também como botão visível no painel de detalhe (achado do Reviewer Gate de 2026-10-19: o menu de contexto sozinho deixaria a ação de editar inacessível a quem navega só por teclado sem o atalho de menu de contexto). |
| `button-primary` / `button-secondary` | Toda ação primária/secundária de tela (Salvar, Confirmar, Cancelar, Importar, + Atribuir Papel) | Primário: 1 por tela/diálogo. Secundário/"ghost": Cancelar, e variante destrutiva (texto/borda trocados para `{colors.destructive}`) para ações como "Revogar sessões", "Desabilitar Empresa". |
| `input` | Campo de formulário (RHF), busca de tabela, busca de árvore (picker) | Validação Zod no blur/submit; busca com debounce ~250ms antes de filtrar/auto-expandir. |
| `form-field-error` | Qualquer formulário de CRUD (User/Group/Role) e o modal Atribuir Papel | Inline, abaixo do campo — nunca só toast genérico; campo com erro recebe foco. Herdado 1:1 do padrão do `tecton-EXPERIENCE.md`. |
| `dialog` | Atribuir Papel, confirmações destrutivas (Revogar sessões, Habilitar/Desabilitar Empresa), formulário de criar/editar quando não justifica rota própria | Abre com foco no primeiro campo/item; `Esc` fecha e devolve foco à origem. Confirmação destrutiva sempre nomeia a consequência ("Ele(a) precisará entrar novamente"), nunca só "Tem certeza?". |
| `badge` (`enabled`/`disabled`) | Status de Empresa na folha/nó do ramo Empresas | "Habilitada" (`enabled`) usa o par `{colors.success}`/`{colors.success-foreground}` (token estendido na AD-13 em 2026-10-19 especificamente para este caso); "desabilitada" (`disabled`) usa `{colors.destructive}` (outline). Forma nested padronizada nos 4 `DESIGN.md` após achado do Reviewer Gate de 2026-10-19 (a forma anterior variava entre objeto plano, nested e duas chaves irmãs — quebrava consumo mecânico por um gerador de template); mesmo papel semântico e mesma forma de acesso (`badge.enabled`/`badge.disabled`) nos 4 presets agora. |
| Formulário de CRUD por entidade (User/Group/Role) | Criar/editar via rota ou `dialog` | **Nunca gerado de schema em runtime** (diferente do Tecton/`@rjsf/core`) — desenhado à mão por entidade, reaproveitando o schema Zod de `packages/shared/src/schemas/admin.ts` tanto na validação do form quanto no backend (FR-17). |

## State Patterns

| Estado | Superfície | Tratamento |
|---|---|---|
| Carregando árvore | `/admin`, primeira carga | `Skeleton` no formato de árvore (ramos de categoria) — não spinner genérico, já sugere a estrutura que está vindo (mesmo padrão do Tecton). |
| Ramo vazio | Categoria sem itens (ex. tenant novo sem Grupos) | "Nenhum {grupo/usuário/papel} ainda." Em Usuários, inclui ação "Importar Usuários" como caminho alternativo ao convite individual. |
| Nenhuma seleção | Painel de detalhe, estado inicial | "Selecione um item na árvore à esquerda." — mesmo padrão do Tecton (master-detail de página única; diferente de uma navegação por rota por coleção). |
| Busca sem resultado (árvore) | Árvore lateral (qualquer ramo) | "Nenhum {usuário/grupo/papel} encontrado para '{termo}'." |
| Busca sem resultado (árvore, picker) | Mini-árvore de Módulos, navegador de Grupo-de-origem | Mesma mensagem, herdada do Tecton: nunca árvore que simplesmente não reage. |
| Carregando árvore (picker) | Modal Atribuir Papel, seletor de membros | Skeleton no formato de árvore. |
| Lista interna carregando | Dentro de um ramo com muitos itens (TanStack Table coadjuvante) | Skeleton de linhas no formato de tabela. |
| Carregando detalhe | Painel de detalhe, ao trocar seleção na árvore | Skeleton de seções (Dados, Grupos, Papéis atribuídos). |
| Falha ao carregar árvore/lista/detalhe | Qualquer painel | RFC 9457 (`title`/`detail` já traduzido) + botão "Tentar novamente". Nunca tela em branco. |
| Erro de validação ao salvar | Qualquer formulário de CRUD, modal Atribuir Papel | Inline via `form-field-error`, campo recebe foco (ver Component Patterns). |
| Falha ao salvar (servidor/rede) | Qualquer formulário | RFC 9457 acima do formulário + dados preservados (nunca perde o que o usuário digitou). |
| Prévia de import CSV carregando | Importar Usuários, após upload | Skeleton de linhas da prévia; some ao resolver contagem válidos/duplicados/inválidos. |
| Prévia de import com erros | Importar Usuários | Contagem clara (válidos/duplicados/inválidos) antes de confirmar — nunca só "arquivo processado". Confirmação só importa os válidos; duplicados/inválidos aparecem no relatório final linha-a-linha. |
| Import parcialmente falho | Relatório pós-confirmação | Relatório linha-a-linha (linha N: importado / duplicado / erro + motivo) — nunca um resumo agregado só de sucesso. |
| Ação destrutiva pendente | Revogar sessões, Habilitar/Desabilitar Empresa | `dialog` de confirmação nomeando a consequência (ver Component Patterns); nunca ação de um clique sem confirmação quando o efeito é irreversível/visível ao usuário afetado. |
| Camada "Empresas" sem backend ainda | Empresas, Detalhe da Empresa | Não é um estado de runtime — é uma nota de implementação: estas telas descrevem a experiência-alvo; a procedure cross-tenant que as alimenta é Deferred na Architecture Spine. |
| Sub-lista vazia no painel de detalhe | Detalhe do Usuário (Grupos / Papéis atribuídos sem nenhum item) | Mensagem curta dentro da própria seção, nunca a seção inteira some: "Nenhum grupo." / "Nenhum papel atribuído." + o botão de ação da seção (Adicionar/+ Atribuir Papel) continua visível — achado do Reviewer Gate de 2026-10-19 (gap não coberto na primeira versão). |

## Interaction Primitives

**Mouse/teclado, sem drag** — mesma postura do Tecton; nenhuma tela do Admin UI do Aether tem reordenação ou containment por arrastar.

Árvore lateral (navegação primária — ramos Usuários/Grupos/Papéis/Empresas) e árvore de picker (Módulo, Grupo-de-origem) — herdado do Tecton:
- `Enter` ou clique — seleciona nó / confirma busca
- `→`/`←` — expande/colapsa nó focado
- `↑`/`↓` — move foco entre nós visíveis
- Clique direito num nó, ou tecla de menu de contexto/`Shift+F10` no nó focado — abre menu de contexto (ver Component Patterns)
- `Esc` — fecha o picker / cancela a busca em andamento

Tabela (TanStack Table, coadjuvante — lista longa dentro de um ramo, relatório de import CSV):
- `Enter` ou clique na linha — abre detalhe
- `↑`/`↓` — move foco entre linhas
- `Space` (quando a coluna de seleção existe) — alterna checkbox da linha focada, para ação em lote (Flow 1b)
- Clique no cabeçalho de coluna — ordena (estado refletido na URL)

Global:
- `Esc` — fecha diálogo/menu de contexto, descarta edição em andamento no modal (sem confirmação extra — mesma regra do Tecton: edição é de baixo risco, confirmação desnecessária adiciona fricção)
- `Tab` — ordem de leitura: busca → árvore → painel de detalhe → ações

**Banido:** qualquer drag-and-drop (mover usuário entre grupos arrastando, reordenar Módulo — fora de escopo), infinite scroll em árvore grande (busca+auto-expand, nunca rolagem manual de centenas de nós) ou em tabela (paginação real, estado na URL).

## Accessibility Floor

Comportamental — contraste visual vive em `DESIGN.md` (paleta verificada para WCAG 2.2 AA nos 4 presets).

- **WCAG 2.2 AA** em toda a superfície.
- Árvore lateral (navegação primária) e árvore de picker: mesmo padrão ARIA Tree View completo herdado do `tecton-EXPERIENCE.md` — cada nó expõe `aria-expanded`, `aria-level`, `aria-selected`, `aria-posinset`, `aria-setsize`; leitor de tela anuncia posição na hierarquia ("item 3 de 12"), não só o rótulo. Totalmente navegável por teclado (setas + Enter), sem depender de mouse. **Sem a parte de "nó invisível por ACL"** — não existe no Aether, todo nó (de categoria, folha, Módulo ou Grupo-de-origem) é sempre visível a quem chegou até a tela (já gated por `requireAdmin`).
- Tabela (coadjuvante, dentro de um ramo): `<th scope="col">` correto, estado de ordenação exposto via `aria-sort`, linha selecionável anunciando `aria-selected`; navegação completa por teclado sem depender de mouse (ver Interaction Primitives). **Nota de implementação (achado do Reviewer Gate de 2026-10-19)**: TanStack Table v9 é headless — não emite esses atributos ARIA por padrão; são wiring explícito da implementação dos templates do gerador, não comportamento automático da lib.
- Formulário de CRUD (RHF + Zod): todo campo com `label` associado; erro de validação anunciado via `aria-live` (região polida) no momento em que aparece, com o campo em erro marcando `aria-invalid="true"` e `aria-describedby` apontando pro texto de `form-field-error`. **Nota de implementação**: React Hook Form gerencia estado de validação, não injeta esses atributos ARIA automaticamente — é wiring explícito no componente de campo, não gratuito por usar a lib.
- Foco visível (anel de foco em `{colors.primary}`, convenção padrão shadcn `ring`) em todo elemento interativo — linha de tabela, nó de árvore, botão, campo, item de menu de contexto.
- Menu de contexto e diálogo abrem com foco no primeiro item/campo; `Esc` devolve foco à origem. Menu de contexto é alcançável por teclado via a tecla de menu de contexto/`Shift+F10` no nó/linha focado — nunca só clique direito (ver Component Patterns: "Editar" também precisa existir como ação visível no painel de detalhe, não só dentro do menu de contexto, pra não ficar preso atrás de uma interação que nem todo leitor de tela/teclado aciona igual).
- **Direção de texto**: convenções de teclado acima (`→`/`←` expande/colapsa) valem para LTR. RTL (árabe/hebraico) não é meta desta sessão — se/quando suportado, a convenção de seta precisa inverter; registrado aqui pra não presumir independência de idioma onde não há.
- **i18n**: rótulos/mensagens de erro/microcopy preparados para múltiplos idiomas desde a autoria (chave+interpolação) — mecanismo concreto (biblioteca) é Deferred (ver Foundation); não bloqueia a acessibilidade de leitor de tela (que lê a string traduzida normalmente), mas a convenção de teclado direcional acima é LTR-only (ver nota de Direção de texto).

## Inspiration & Anti-patterns

- **Lifted do `tecton-EXPERIENCE.md` (e, por trás dele, do ConsoleOne/NDS):** o padrão de árvore com busca-e-auto-expand, navegação por teclado completa (setas + Enter), menu de contexto restrito às ações que a tela realmente tem — como **navegação primária** (ramos Usuários/Grupos/Papéis/Empresas), igual ao padrão do Tecton e aos mockups visuais já validados pelo Boss. Diferença real: a árvore aqui organiza coleções irmãs por CATEGORIA (widget de navegação), não reflete contenção pai-filho real no schema — distinção que vale registrar (ver Foundation), mas não muda o comportamento visível. Referências visuais de origem (citadas por nome aqui — achado do Reviewer Gate de 2026-10-19, antes só registradas no `.memlog.md`): `imports/tecton-directory-admin/novell-consoleone-v1.3-main-window-display.png` (a captura do ConsoleOne 1.3 que o Boss trouxe como North Star original), `imports/tecton-directory-admin/directory-admin.html` (mockup HTML do Directory Service do Tecton, mestre-detalhe) e `imports/tecton-directory-admin/flow-directory-admin-2026-09-03.excalidraw` (wireframe do Tecton) — todos superados pelas 4 direções visuais e pelo wireframe próprios desta sessão (`.working/direction-*.html`, `.working/flow-atribuir-papel-modulo-2026-10-15.excalidraw`), mas mantidos como registro de proveniência.
- **Lifted do `tecton-EXPERIENCE.md`:** o vocabulário de State Patterns (skeleton no formato do que está carregando, nunca spinner genérico; mensagem de busca-sem-resultado explícita; erro sempre RFC 9457 + dados preservados).
- **Rejeitado — tabela como navegação primária substituindo a árvore:** cogitado numa iteração anterior deste documento (dado plano no schema → tabela), mas contradizia os mockups visuais já aprovados (árvore lateral com ramos Usuários/Grupos). Corrigido: árvore é a navegação primária; TanStack Table fica reservado a listas longas dentro de um ramo e ao relatório de import CSV.
- **Rejeitado — nó/linha invisível por ACL individual:** ver Foundation/Accessibility Floor — o Aether não tem Zero Trust por objeto; esconder item por permissão granular seria inventar um modelo de segurança que o backend não tem.
- **Rejeitado — formulário gerado em runtime de JSON Schema (`@rjsf/core`, padrão Tecton):** o Aether tem entidades concretas com schema Zod já existente; um formulário genérico reintroduziria uma camada de indireção sem necessidade real, e pioraria a qualidade de UX que o Boss pediu nível-consumer (campo compacto bem desenhado por entidade bate um form genérico renderizado de schema em qualquer critério de polimento).
- **Rejeitado — dois fluxos diferentes para "adicionar admin" vs. "adicionar usuário" em Empresas:** correção explícita do Boss durante o Discovery — é o mesmo fluxo único de convite por e-mail (`createUserWithSetupEmail`) nos dois casos; a UI nunca bifurca em dois formulários/diálogos distintos para isso.
- **Rejeitado — seletor de tema em runtime:** decisão já fechada na AD-13 (custo recorrente de QA 4x); o preset visual é escolha de geração, não uma `Theme Switcher` runtime nesta UI.

## Key Flows

### Flow 1 — Renato associa Usuário e Grupo (dois caminhos)

Renato, admin do tenant, precisa colocar um usuário recém-chegado no grupo certo — e, separadamente, está montando um grupo novo cross-funcional puxando gente de outros grupos.

**1a — a partir do Usuário:**
1. Renato expande o ramo "Usuários" na árvore lateral e clica em José Matos — o painel de detalhe abre.
2. Na seção Grupos, seleciona um Grupo existente de uma lista/busca.
3. **Clímax:** clica "Adicionar" — a seção Grupos atualiza imediatamente mostrando o novo grupo, sem navegar para fora da tela onde ele estava.

Falha: grupo já continha o usuário — mensagem inline ("Já é membro deste grupo"), sem erro de servidor.

**1b — a partir do Grupo (grupo "Projeto Alpha", recém-criado):**
1. Renato expande o ramo "Grupos" na árvore lateral e clica em "Projeto Alpha" (vazio) — o painel de detalhe abre.
2. Abre o seletor de membros — que navega **por Grupo de origem** (ex. filtra "dentro do grupo Vendedores"), usando o padrão de `tree-node`/busca herdado do Tecton para achar rápido em qual grupo cada candidato já está.
3. Multi-seleciona José Matos e Jairo Castro (checkbox de linha/nó).
4. **Clímax:** clica "Adicionar em lote" — ambos aparecem na lista de membros de "Projeto Alpha" imediatamente, com contagem atualizada ("2 membros"), sem reload de tela.

Falha: um dos selecionados já é membro — a linha dele some da seleção em lote antes de confirmar, com nota explicando por quê (nunca erro silencioso).

### Flow 2 — Importação em lote de Usuários via CSV

Renato precisa dar acesso a um time inteiro de uma vez.

1. No ramo "Usuários" da árvore lateral, clica "Importar" (ação do painel, não de um nó específico).
2. Faz upload do CSV.
3. Prévia carrega: contagem clara de válidos / duplicados / inválidos, antes de qualquer escrita no banco.
4. Renato confirma a importação (só os válidos entram).
5. **Clímax:** relatório linha-a-linha aparece — cada linha do CSV original marcada como importada, duplicada ou com erro (e o motivo) — Renato sabe exatamente o que aconteceu com cada usuário do arquivo, sem precisar adivinhar a partir de um resumo agregado.

Falha: upload de arquivo não-CSV ou malformado — mensagem clara antes da prévia tentar rodar, nunca uma prévia quebrada silenciosamente.

### Flow 3 — Atribuição de Papel com escopo por Módulo (segue o wireframe à risca)

Renato quer dar a José Matos o papel de Operador, mas só dentro do módulo "Vendas", nunca em toda a organização.

1. **Tela 1 (Detalhe do Usuário, antes):** José Matos já tem "Gerente de Vendas — Vendas" na lista de Papéis atribuídos. Renato clica "+ Atribuir Papel".
2. **Tela 2 (modal "Atribuir Papel"):** seleciona o Papel ("Operador") num campo `select`; abaixo, uma mini-árvore de Módulos (Vendas › Região Sul / Região Norte, Produção, Contabilidade) usando o padrão `tree-node`/`tree-node-selected`. Ele seleciona "Região Sul". Nota fixa no modal: "A concessão vale para este módulo e todos os módulos abaixo dele na árvore" — herança aditiva, só desce, nunca sobe para o módulo pai.
3. **Clímax:** clica "Confirmar" — o modal fecha e a **Tela 3 (Detalhe do Usuário, depois)** mostra a nova linha "Operador — Vendas > Região Sul" na lista de Papéis atribuídos, marcada como recém-adicionada, ao lado do papel anterior "Gerente de Vendas — Vendas" (ambos coexistem — múltiplas atribuições por usuário são normais).

Falha: clica "Cancelar" a qualquer momento antes de Confirmar — modal fecha sem salvar nada, Tela 1 permanece exatamente como estava (sem confirmação extra de "tem certeza", mesma regra de baixo risco do Tecton).

### Flow 4 — Revogar sessões de um Usuário

Ação pontual de segurança, sem árvore envolvida.

1. Renato abre o Detalhe de um Usuário suspeito de sessão comprometida.
2. Clica "Revogar sessões" (variante destrutiva de `button-secondary`).
3. `dialog` de confirmação nomeia a consequência: "Revogar as sessões de {nome}? Ele(a) precisará entrar novamente."
4. **Clímax:** confirma — todas as sessões ativas daquele usuário são invalidadas; o Detalhe do Usuário mostra confirmação inline ("Sessões revogadas.") sem navegar para fora da tela.

Falha: falha de rede ao revogar — RFC 9457 acima do diálogo (que permanece aberto), Renato tenta de novo sem perder o contexto.

### Flow 5 — Godofredo gerencia Empresas (só existe na forma "SaaS 2 níveis")

Godofredo, admin de **sistema** (não de um tenant específico), onboarda um cliente novo. **Esta camada depende de backend que ainda não existe hoje** (procedures cross-tenant, Deferred na Architecture Spine) — o flow abaixo descreve a experiência pretendida.

1. Godofredo expande o ramo "Empresas" na árvore lateral — cada folha é um Tenant, com nome e `badge` de status (habilitada/desabilitada).
2. Clica numa Empresa recém-criada, sem admin ainda.
3. Clica "Adicionar admin" — formulário simples (nome/sobrenome/e-mail).
4. **Clímax:** confirma — dispara o **mesmo fluxo único de convite por e-mail** que qualquer "adicionar usuário" em qualquer tenant usa (`createUserWithSetupEmail`, Story 5.1/5.8) — Godofredo não aprende um segundo mecanismo de convite só porque está bootstrapando o primeiro admin; é a mesma ação, só que de um lugar diferente da UI.

Falha do próprio clímax: e-mail já cadastrado em outra Empresa — mensagem inline no formulário ("Este e-mail já está em uso."), sem erro de servidor; Godofredo corrige e confirma de novo sem perder nome/sobrenome já digitados.

Falha / segunda ação relacionada: Godofredo quer desabilitar uma Empresa (ex. cliente inadimplente) — clica o toggle no Detalhe da Empresa (ou via menu de contexto no nó), `dialog` de confirmação nomeia a consequência real ("Desabilitar {empresa}? Todos os usuários dela perdem acesso ao sistema."), nunca um checkbox que já muda estado sem confirmação.
