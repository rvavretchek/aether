# Revisão Adversarial — PRD: Aether

**Alvo:** `_bmad-output/planning-artifacts/prds/prd-Aether-2026-08-11/prd.md`
**Lido para contexto:** Product Brief + addendum, `docs/aether-tecton-compatibility.md`
**Método:** leitura adversarial completa, contra o próprio texto, contra o Brief, e contra a fonte de verdade cross-projeto (compatibility doc). Achados ordenados do mais grave para o mais leve.

---

## 1. Nenhum FR estabelece enforcement de autorização — o diferencial central do produto é modelado, mas nunca aplicado

**Onde:** §4.3 (FR-11 a FR-15), §8.1 ("Sem confiança implícita"), §9.1

O que existe nos FRs é só o *modelo* de permissão: declarar Papéis, atribuir Papéis a Usuário/Grupo sobre um Módulo, herdar aditivamente. Nenhum FR diz que uma procedure tRPC gerada verifica, antes de executar, se o usuário chamador tem o Recurso/Papel exigido — e retorna erro se não tiver. FR-3 (`generate module`) produz "uma declaração dos Recursos que o módulo expõe", mas declarar um recurso não é o mesmo que aplicá-lo como gate de acesso. FR-13 só permite "declarar e atribuir" Permissões Nomeadas a um Papel — de novo, modelagem, não checagem em tempo de requisição.

A NFR "Sem confiança implícita: toda chamada — interna ou externa — passa pelo `AuthProvider` (FR-10)" (§8.1) conflita autenticação (validar identidade via `AuthProvider`) com autorização (checar permissão sobre um recurso). FR-10 só garante que nenhum código de negócio depende diretamente do mecanismo de auth — isso não implica que toda procedure é bloqueada por padrão para quem não tem o Papel necessário.

**Por que importa:** este é o produto cujo gancho de venda inteiro é "árvore de identidade e permissões". Sem um FR que amarre "Papel atribuído" a "requisição negada/permitida", o que foi especificado é um CRUD de organograma — não um sistema de controle de acesso. Um arquiteto ou dev pegando este PRD não tem nenhuma base para decidir se autorização é default-deny (nada funciona até o dev escrever o middleware) ou algo que cada `generate module` deveria vir com por padrão. Essa decisão muda a arquitetura inteira do router tRPC gerado.

---

## 2. Isolamento de tenant é uma NFR asserida, não uma capacidade testável — e o próprio FR-11 (árvore de identidade) não menciona tenant

**Onde:** §8.1 ("Isolamento de tenant é escolha do desenvolvedor"), §8.2, FR-11, Glossário ("Tenant")

O Glossário afirma categoricamente: "Todo dado é escopado por Tenant desde o MVP." A NFR de §8.1 exige "a camada de acesso a dados é sempre acessada através de um resolvedor consciente de tenant, nunca uma conexão global fixa." Mas nenhum FR torna isso testável. FR-11, que define o modelo hierárquico persistido via Closure Table (a própria árvore de identidade — Usuário, Grupo, Papel, Módulo), não menciona `tenant_id` nem escopo de tenant em nenhuma de suas consequências testáveis. Não há nenhuma consequência do tipo "uma consulta de ancestrais/descendentes nunca atravessa fronteira de tenant" ou "toda query Prisma gerada é automaticamente filtrada por tenant".

**Por que importa:** a própria árvore de identidade — o objeto mais sensível do sistema (quem tem acesso a quê) — é exatamente onde vazamento cross-tenant seria mais grave, e é exatamente onde a spec é silenciosa. Sem um FR que force o resolvedor consciente de tenant a ser usado (e não uma query Prisma direta escrita por engano num módulo gerado), a alegação de §8.2 ("Dado sensível de tenant permanece isolado por Tenant mesmo no modelo de base compartilhada") é uma promessa sem mecanismo especificado.

---

## 3. O PRD já nasce desatualizado contra a própria fonte de verdade cross-projeto que ele deveria respeitar

**Onde:** FR-25 (Tratamento de erro global), FR-24 (Logging), §8.1, §9.1 vs. `docs/aether-tecton-compatibility.md` linhas 119–125 e 129

O compatibility doc — citado no addendum como "fonte de verdade técnica... deve ser consultado por quem for trabalhar em PRD ou arquitetura do Aether" — registra duas decisões explicitamente vinculantes para os dois projetos:
- **2026-08-11**: formato de erro fechado como RFC 9457 Problem Details (+`invalid-params`), sucesso sem envelope, correlação via header `traceparent` (W3C Trace Context).
- **2026-08-12/13**: Zero Trust na comunicação interna fechado — "todo serviço verifica a assinatura do token ele mesmo, sempre; toda chamada leste-oeste carrega credencial verificável" (NIST SP 800-207) — decisão originada por uma pergunta do próprio autor do lado do Aether.

O PRD tem `updated: 2026-08-13` no frontmatter — ou seja, foi tocado depois das duas decisões — mas FR-25 só diz "mapeando erros para respostas padronizadas" (sem citar RFC 9457), FR-24 fala em "identificador de correlação por requisição" genérico (sem citar `traceparent`), e §8.1 fala em "nenhum caminho de código bypassa autenticação" sem referenciar a decisão NIST SP 800-207 que foi debatida especificamente no contexto do Aether. Nenhuma das duas decisões aparece em §9 (Contratos de API), que seria o lugar natural para elas.

**Por que importa:** isso não é uma lacuna teórica — é uma decisão já fechada e registrada como vinculante que o PRD deveria ter herdado e não herdou, apesar da janela de tempo permitir. Um arquiteto que só ler o PRD vai reinventar (ou pior, inventar diferente) um formato de erro que já existe e que o Tecton já está implementando — quebrando a compatibilidade que é o objetivo declarado da política vinculante.

---

## 4. Primitivo de aprovação + `WorkflowEngineProvider` — decidido como aplicável aos dois projetos — está ausente do PRD

**Onde:** ausente de §4, §5 (Não-Objetivos), §6.2 (Fora do Escopo), §9.1 (Interfaces de extensão) vs. compatibility doc linhas 74–76

O compatibility doc registra: "Decisão para os dois projetos: primitivo nativo e leve de aprovação simples... sempre disponível, sem motor externo... interface `WorkflowEngineProvider`... Candidato relevante a compartilhamento de código real." Isso não aparece em nenhum lugar do PRD — nem como FR do MVP, nem como Fast-follow, nem como Roadmap, nem como Someday. `KeyCustodyProvider` (também do Tecton) foi corretamente importado para §9.1 como "interface prevista, fora do MVP" — mas `WorkflowEngineProvider` não recebeu o mesmo tratamento, apesar do mesmo status de decisão vinculante.

**Por que importa:** é uma lacuna de escopo silenciosa. Se a decisão realmente vale para os dois projetos, o PRD do Aether deveria pelo menos registrar a interface no roadmap (como fez com `KeyCustodyProvider`) para não ser "esquecida ou reinventada de forma incompatível depois" — que é textualmente o motivo de existir do compatibility doc.

---

## 5. Closure Table está sendo usada para três tipos de relação semanticamente distintos — uma escolha de schema que vai confundir quem for desenhar a arquitetura

**Onde:** FR-11, Glossário ("Árvore de Identidade", "Papel")

FR-11 diz que contenção (pai/filho), associação (membro de) e atribuição (papel sobre) são todas "persistidos via Closure Table". Closure Table é uma técnica específica para modelar fecho transitivo de uma relação de ancestralidade hierárquica (todo ancestral × todo descendente) — ela resolve bem contenção (Módulo dentro de Módulo). Ela não é o padrão certo para "membro de" (associação Usuário↔Grupo, tipicamente não-transitiva e não-hierárquica) nem para "papel sobre" (atribuição Papel↔Objeto, uma tupla, não uma relação de fecho). O Glossário reforça isso descrevendo o modelo como "estilo ReBAC" com tuplas (usuário─membro de─→grupo─tem papel─→objeto), que é uma modelagem de grafo de relações, tecnicamente incompatível com "tudo numa Closure Table única."

**Por que importa:** um arquiteto lendo "persistidos via Closure Table" para as três relações vai ou (a) tentar forçar associação e atribuição dentro de uma única Closure Table de forma incorreta, ou (b) ter que adivinhar que na verdade só a contenção usa Closure Table e as outras duas usam tabelas de junção simples — decisão que o PRD deveria ter deixado explícita, já que é a base literal de todo o resto do sistema de permissões.

---

## 6. FR-14 promete "editar" e "visualizar" mas nenhuma consequência testável cobre isso

**Onde:** FR-14 (Tela de administração de identidade)

A frase de abertura do FR-14 diz "Um administrador pode **visualizar, criar, editar e organizar** Usuários, Grupos e Papéis". As quatro consequências testáveis listadas cobrem: criar usuário avulso, atribuir usuários a grupo/módulo, atribuir papel, e sincronização imediata com a árvore. Nenhuma consequência testa "visualizar" (listar/consultar) nem "editar" (alterar um Usuário/Grupo/Papel já existente) nem remoção/desatribuição.

**Por que importa:** isso é exatamente o padrão de FR "cuja consequência não prova a capacidade" que a revisão foi pedida para caçar. Um QA ou dev implementando contra este FR não tem critério de aceite para edição — e edição de usuário (ex.: trocar email, desativar conta) é operação básica de qualquer admin de identidade, não um nice-to-have.

---

## 7. Contradição de orquestração entre `dev` (FR-4), captura de email (FR-20) e Docker Compose (FR-23)

**Onde:** FR-4, FR-20, FR-23, UJ-1 (§2.3)

FR-20 afirma: "Rodando `aether-admin dev`, todo email disparado (FR-18) é capturado por um serviço local incluído no Docker Compose de desenvolvimento (FR-23)" — como se rodar `dev` sozinho já garantisse a captura. Mas FR-4 (o próprio FR que define o comando `dev`) só promete subir frontend e backend — nenhuma consequência de FR-4 menciona iniciar containers Docker. FR-23 trata `docker compose up` como um comando distinto que sobe banco de dados e capturador de email. Não fica definido se `aether-admin dev` dispara `docker compose up` internamente, ou se o desenvolvedor precisa rodar os dois comandos, em que ordem. UJ-1 (a jornada "zero a Hello World") também nunca menciona Docker como passo — só "roda o setup assistido de banco" e "sobe o dev server" — apesar de o banco de dados local padrão presumivelmente rodar em container.

**Por que importa:** é uma decisão de fluxo de trabalho que qualquer implementador vai precisar resolver sozinho, e as duas leituras possíveis (auto-orquestração vs. dois comandos manuais) têm impacto direto na primeira impressão do produto (SM-1/SM-2, os próprios critérios de sucesso do MVP são sobre número de passos até "Hello World" funcionando).

---

## 8. Nenhum FR trata proteção contra força bruta, e o local de armazenamento do token no cliente nunca é decidido

**Onde:** §4.2 (descrição da feature: "robusta o suficiente para não ser alvo de crítica de um dev competente"), FR-7, FR-8, FR-19

FR-7 define o par access/refresh token, mas não diz onde o cliente armazena esses tokens (cookie `httpOnly` + `SameSite`, vs. `localStorage`/memória) — decisão fundamental para resistência a XSS, que qualquer "dev competente" cobraria exatamente na auditoria que a descrição da feature diz querer evitar. Nenhum FR em §4.2 ou §4.5 (login, `/forgot-password`, redefinição de senha) especifica rate limiting, lockout progressivo, ou CAPTCHA/throttling contra tentativa de força bruta ou enumeração de usuário.

**Por que importa:** a própria descrição da seção declara robustez de auth como objetivo explícito e mensurável ("não ser alvo de crítica"). Faltam exatamente os dois itens que um revisor de segurança júnior verificaria primeiro num sistema de login.

---

## 9. FR-9 promete revogação "em nome do usuário" pelo admin, mas não existe superfície (UI ou CLI) especificada para acionar isso

**Onde:** FR-9 vs. FR-14

FR-9: "Um usuário (ou um administrador, em nome dele) pode invalidar um refresh token." Mas FR-14, o único FR que define a tela de administração, não lista nenhuma ação de "revogar sessão/token" entre suas consequências testáveis, e não existe nenhum comando de CLI (`aether-admin ...`) especificado em §4.1 para isso.

**Por que importa:** é uma capacidade declarada sem interface — não há como testar "consequência" nenhuma do FR-9 para o caso do administrador, porque a única forma prevista de um administrador interagir com o sistema (FR-14) não expõe essa ação.

---

## 10. Palavras vagas substituindo especificação real ("sensato(a)")

**Onde:** FR-2 ("defaults sensatos para desenvolvimento local"), FR-22 ("regras padrão sensatas")

FR-2 não diz quais são os defaults (host `localhost`? porta padrão do banco escolhido? usuário `postgres`?). FR-22 não diz se "sensato" significa `eslint:recommended`, Airbnb, Standard, ou uma config própria do Aether — decisões com impacto real em DX e em quanto código gerado por um agente de IA vai (ou não) passar no lint de primeira.

**Por que importa:** são exatamente o tipo de palavra que o próprio processo de revisão foi instruído a caçar — decisão apresentada como fechada ("Consequências testáveis") quando na verdade nenhum critério de aceite real existe por trás dela.

---

## 11. FR-8: a consequência "não trivialmente craqueável" não é testável como escrita, e os parâmetros de custo do Argon2id nunca são definidos

**Onde:** FR-8

"Um vazamento isolado do banco de dados não expõe hashes de senha trivialmente craqueáveis" não tem limiar definido — craqueável em quanto tempo, com que hardware, é o critério? Sem parâmetros de custo do Argon2id (memória, iterações, paralelismo) especificados em nenhum lugar do FR, não há como um QA validar essa consequência — ela depende inteiramente de uma escolha de parâmetro que o PRD nunca faz.

**Por que importa:** é uma "consequência testável" que na prática não é testável sem uma decisão adicional (os parâmetros) que o documento nunca toma — mascarando indecisão real atrás de linguagem que soa como critério de aceite.

---

## 12. SM-1 não é uma métrica falsificável

**Onde:** §7, SM-1

"Meta: mesma ordem de grandeza que `django-admin startproject` + `manage.py startapp`, ou o fluxo do Spring Initializr." Sem um número concreto de passos/comandos, "ordem de grandeza" não tem como reprovar nada — qualquer contagem de passos pode ser racionalizada como "mesma ordem de grandeza." (Herdado do Brief, mas o PRD, que existe justamente para tornar coisas testáveis, não corrige isso.)

**Por que importa:** é a métrica primária de sucesso do MVP inteiro (valida FR-1, FR-2, FR-4) e não tem como falhar por construção.

---

## 13. FR-19 não especifica se trocar a senha invalida sessões/tokens existentes

**Onde:** FR-19

Redefinição de senha via link é especificada (token de uso único, expiração), mas nada diz se refresh tokens já emitidos antes da redefinição continuam válidos depois. Expectativa de segurança padrão (e coerente com a "robustez" prometida em §4.2) seria invalidar todas as sessões ativas ao trocar a senha — isso nunca é mencionado, nem como FR nem como consequência.

**Por que importa:** se um invasor já tiver um refresh token válido, uma redefinição de senha "de precaução" pelo usuário não fecha a porta que ele estava tentando fechar — a menos que essa invalidação seja implementada por acidente, não por especificação.

---

## 14. Desempenho da árvore de identidade é adiado para arquitetura, mas a árvore está no caminho crítico de toda checagem de autorização futura

**Onde:** §11 (item 1), FR-11

§11 admite honestamente que metas de performance não foram definidas. Isso é razoável em si — mas combinado com o achado #1 (autorização vai eventualmente precisar consultar a árvore em toda requisição) e #2 (isolamento de tenant não especificado no schema), o adiamento de performance da Closure Table deixa de ser "detalhe de arquitetura" e passa a ser um risco de produto: se/quando a checagem de permissão for amarrada a cada procedure tRPC (que o PRD atualmente nem especifica que existirá — achado #1), toda requisição autenticada passa a depender da latência de consulta na árvore. Não há nem reconhecimento dessa dependência no PRD.

**Por que importa:** o PRD trata "performance" e "modelo de permissão" como preocupações independentes quando estruturalmente não são — a lacuna do achado #1 esconde essa dependência.

---

## 15. SM-2 valida usabilidade do fluxo de instalação com amostra de uma pessoa

**Onde:** §7, SM-2

"Meta: sim, verificado por teste real com pelo menos uma pessoa fora do projeto." Uma pessoa é a amostra mínima possível — qualquer resultado (positivo ou negativo) tem poder estatístico zero. (Herdado do Brief sem revisão.)

**Por que importa:** achado menor comparado aos anteriores, mas é a métrica de validação de duas das FRs mais visíveis do produto (FR-1, FR-2) — vale pelo menos reconhecer explicitamente como sinal fraco, não como "critério de sucesso" com o mesmo peso textual dos outros.

---

## Resumo por tema

- **Segurança que não fecha o círculo:** achados 1, 2, 8, 9, 11, 13 — o PRD descreve mecanismos de segurança isolados (hash, token, revogação, modelo de permissão) mas não amarra a peça que faria deles um sistema de controle de acesso de fato, nem cobre os dois vetores mais óbvios de ataque a um fluxo de login (força bruta, XSS via storage de token).
- **PRD desalinhado com sua própria fonte de verdade vinculante:** achados 3, 4 — decisões já fechadas no compatibility doc, dentro da janela de tempo em que o PRD foi editado, não foram herdadas.
- **Especificação vaga disfarçada de decisão fechada:** achados 10, 11, 12, 15.
- **Contradição de fluxo entre FRs:** achado 7.
- **FR cuja consequência não prova a capacidade declarada:** achado 6.
- **Ambiguidade de modelagem de dados:** achado 5.
