---
title: "PRD: Aether"
status: final
created: 2026-08-11
updated: 2026-08-14
---

# PRD: Aether
*Working title — confirma.*

## 0. Document Purpose

Este PRD detalha os requisitos funcionais do Aether para quem for desenhar a UX, a arquitetura e as histórias de implementação a partir daqui — humano ou agente de IA. Ele nasce diretamente do Product Brief (`_bmad-output/planning-artifacts/briefs/brief-Aether-2026-08-10/brief.md`) e do addendum associado — não duplica o contexto de mercado e diferenciação já registrado lá, e assume que o leitor já os conhece. Vocabulário ancorado no Glossário (§3); features agrupadas com FRs numerados globalmente (a numeração reflete ordem de criação, não posição no documento — estável mesmo quando features são reorganizadas); suposições marcadas inline e indexadas em §12.

## 1. Visão

Aether é um framework React + Node "baterias incluídas" que entrega de fábrica o que todo projeto novo reconstrói do zero — autenticação robusta, ORM com migrations, comunicação tipada, email transacional — e cujo diferencial central é uma árvore visual de identidade e permissões, gerenciável por arrastar-e-soltar, algo que nenhuma ferramenta de administração do ecossistema JS atual oferece.

Ele existe porque cada projeto React + Node novo repete as mesmas decisões de infraestrutura sem nunca vir pronto de fábrica, e porque a forma como sistemas gerenciam identidade e permissões hoje — formulário atrás de formulário — é, em experiência de uso, pior do que já foi décadas atrás em ferramentas como o Novell NetWare 4.1 / NDS — a referência pessoal do autor por trás da árvore de identidade, mais de 30 anos depois de usá-la, sem equivalente real encontrado no ecossistema atual. O Aether importa porque reduz retrabalho real para quem constrói com ele, é desenhado para ser gerado e estendido com segurança tanto por agentes de IA quanto por humanos, e — mesmo sem adoção externa — já é vantagem competitiva concreta para o próprio autor em trabalho com clientes.

Se bem-sucedido, o Aether se torna, em 2-3 anos, referência entre os frameworks React + Node "baterias incluídas" — e a árvore de identidade vira o padrão do setor, no mesmo sentido em que "ter um Django Admin" virou atalho mental pra "CRUD administrativo resolvido" (detalhado no Product Brief, §Visão).

## 2. Público-Alvo

### 2.1 Jobs To Be Done

- **Funcional**: Quando começo um projeto React + Node novo, quero autenticação, ORM e uma base de administração já prontos, para gastar meu tempo no problema de negócio em vez de reconstruir infraestrutura pela enésima vez.
- **Funcional**: Quando preciso gerenciar usuários, grupos e permissões de um sistema, quero fazer isso visualmente numa árvore, para não depender de telas de formulário fragmentadas e desconectadas.
- **Funcional**: Quando desenvolvo com ajuda de um agente de IA, quero uma estrutura de projeto previsível e decisiva, para o agente gerar código seguro seguindo convenção em vez de inventar uma abordagem nova a cada arquivo.
- **Emocional**: Quero confiar que a base de autenticação e segurança é robusta o suficiente para não precisar auditar ou refazer isso eu mesmo.
- **Social/portfólio** *(motivação do próprio autor, não do usuário final — detalhada no Brief §"A Quem Isso Serve")*: Quero um projeto que demonstre capacidade técnica real e que eu já possa usar como vantagem competitiva com meus próprios clientes, independentemente de adoção externa.

### 2.2 Não-Usuários (v1)

- Times/empresas adotando formalmente em escala — a mesa reconhece valor nisso (Brief, "O Problema"), mas o MVP mira o desenvolvedor individual; adoção organizacional é aspiração de Visão, não alvo de design do v1.
- Quem precisa de arquitetura de microsserviços desde o dia um — esse caso é do framework irmão, Tecton, não do Aether.
- Quem não usa React + Node — sem suporte a outros stacks no v1.

### 2.3 Jornadas de Usuário Chave

- **UJ-1. José vai de zero a "Hello World" sozinho.**
  - **Persona + contexto:** José, dev React + Node, baixando o Aether pela primeira vez, sem ninguém do lado — só a documentação.
  - **Estado de entrada:** nenhum projeto Aether existe ainda; Node já instalado.
  - **Caminho:**
    1. Instala o CLI do Aether (`aether-admin`).
    2. Roda `aether-admin new` — o projeto já nasce com uma página inicial "Hello World" funcional, sem precisar escolher template ou digitar conteúdo.
    3. Roda o setup assistido de banco de dados — guiado por prompts, sem editar arquivo de configuração à mão.
    4. Sobe o dev server (`aether-admin dev`), que já orquestra o Docker Compose de dependências locais automaticamente.
  - **Clímax:** a página inicial carrega no navegador mostrando "Hello World!" — banco conectado, servidor rodando.
  - **Resolução:** projeto funcional, pronto para começar a lógica de negócio de verdade.
  - **Caso de borda:** se o setup assistido de banco falhar (ex.: Postgres não está rodando localmente), o CLI reporta o erro específico sem deixar o projeto num estado inconsistente pela metade.

- **UJ-2. José organiza um sistema de aluguel de ferramentas inteiro em minutos.**
  - **Persona + contexto:** José, agora usando o Aether para um sistema de aluguel de ferramentas — cadastro de clientes, usuários, estoque, compras e vendas/PDV — já construído e no ar.
  - **Estado de entrada:** José autenticado como admin, tela de administração aberta.
  - **Caminho:**
    1. Importa uma lista de vendedores e outra de clientes.
    2. Cadastra um novo usuário (Enzo), que não estava em nenhuma lista, via "+ usuário".
    3. Seleciona os 3 funcionários do estoque e atribui ao grupo "Estoque".
    4. Seleciona os 5 vendedores e atribui a "Vendas".
    5. Seleciona os 3 caixas e atribui a "Caixa".
    6. Atribui o Gerente a "Gerência" e o Comprador a "Compras".
    7. Cada funcionário recebe um email para configurar a própria senha.
  - **Clímax:** todos os funcionários já estão logados e operando o sistema no papel certo, sem José ter escrito uma linha de configuração manual.
  - **Resolução:** José treina a equipe já com o sistema todo organizado; a estrutura de permissões reflete a estrutura real da empresa.

## 3. Glossário

- **Módulo/Submódulo** *(sinônimo: Domínio/Subdomínio — os termos são intercambiáveis na documentação e no código; usar Módulo/Submódulo como padrão para não criar dois vocabulários para o mesmo conceito)* — objeto de primeira classe que representa um contêiner organizacional dentro da árvore de identidade (ex.: "Estoque", "Vendas"). Pode conter outros módulos/submódulos (contenção pai/filho), usuários, grupos e recursos. É também a unidade de organização do código gerado por `aether-admin generate module` (ver §4.1, FR-3).
- **Usuário** — objeto de primeira classe representando uma pessoa autenticável no sistema. Pode ser membro de um ou mais Grupos e receber Papéis diretamente ou por herança.
- **Grupo** — objeto de primeira classe que agrega Usuários para atribuição coletiva de Papéis.
- **Papel** — conjunto nomeado de Recursos (permissões) atribuível a um Usuário ou Grupo sobre um Módulo/Submódulo. A atribuição flui por herança aditiva simples (estilo ReBAC — usuário─membro de─→grupo─tem papel─→objeto, objeto─contém─→objeto) para os descendentes do Módulo/Submódulo (sem bloqueio/override no MVP), e é **aplicada em tempo de execução** (FR-27) — não é só um registro consultável.
- **Recurso** — unidade de permissão dentro de um Papel. No MVP, todo Recurso é uma **Permissão Nomeada** (ex.: "pode editar fatura"); o tipo **Objeto de Negócio Real** (`ResourceType`, ex.: um documento, um ativo) tem a interface prevista mas a implementação fica fora do MVP.
- **Árvore de Identidade** — a estrutura hierárquica completa formada por Módulos/Submódulos, Usuários, Grupos e suas relações. Só a relação de **contenção** (pai/filho entre Módulos/Submódulos) é persistida via Closure Table; **associação** (membro de) e **atribuição** (papel sobre) usam tabelas de junção simples — não são relações de fecho transitivo. Toda consulta é escopada por Tenant (ver FR-11).
- **`AuthProvider`** — interface de extensão para o mecanismo de autenticação. Implementação do MVP: local, com Argon2id + Pepper.
- **`TokenRevocationStore`** — interface de extensão para revogação de refresh token. Implementação do MVP: Postgres/Prisma-backed (sem Redis).
- **`SecretsProvider`** — interface de extensão para acesso a segredos da aplicação (ex.: o pepper do FR-8). Implementação do MVP: variável de ambiente local. Roadmap: OpenBAO (Transit engine).
- **`WorkflowEngineProvider`** — interface de extensão para workflow de aprovação complexo. Fora do MVP (Roadmap) — decisão compartilhada com o projeto irmão Tecton.
- **Tenant** — unidade de isolamento multi-inquilino. Todo dado é escopado por Tenant desde o MVP, mesmo com uma única instalação rodando um só Tenant.

## 4. Features

### 4.1 CLI e Scaffolding de Projeto

**Descrição:** O ponto de entrada de tudo — um único binário (`aether-admin`) que leva o desenvolvedor de "nada instalado" a um projeto rodando, sem edição manual de arquivo de configuração. Realiza UJ-1.

**Requisitos Funcionais:**

#### FR-1: Criar novo projeto

O desenvolvedor pode criar um novo projeto Aether rodando `aether-admin new`. Realiza UJ-1.

**Consequências (testáveis):**
- O comando gera uma estrutura de projeto completa (frontend + backend) pronta para rodar.
- O projeto já nasce com uma página inicial "Hello World" básica e funcional — sem prompt de conteúdo ou escolha de template no MVP.
- O projeto gerado sobe sem erros mesmo antes do banco de dados ser configurado.
- O projeto já nasce com convenção de roteamento decisiva: React Router organiza as páginas do frontend; cada Módulo gerado (FR-3) expõe suas operações como um router tRPC montado no router raiz do backend — nenhuma decisão de roteamento fica em aberto para o desenvolvedor.

**Notas:** outros templates de página inicial (além do "Hello World" padrão) ficam fora do MVP — candidato a fast-follow, conforme demanda de uso real.

#### FR-2: Setup assistido de banco de dados

O desenvolvedor pode configurar a conexão de banco de dados através de um assistente guiado por prompts, sem editar arquivo de configuração manualmente.

**Consequências (testáveis):**
- O assistente pergunta host, porta, credenciais e nome do banco. Defaults de desenvolvimento local: host `localhost`, porta padrão do banco escolhido, usuário padrão e senha gerada automaticamente.
- Quando o projeto é multitenant, o assistente pergunta o nível de isolamento desejado (base compartilhada com `tenant_id`, padrão/recomendado; ou banco dedicado por tenant, maior segurança) — a escolha é do desenvolvedor, nunca imposta pelo framework.
- A configuração final (incluindo o nível de isolamento escolhido) é persistida em variáveis de ambiente/config (`.env`), nunca hardcoded no código.
- Se a conexão falhar, o CLI reporta o erro específico (ex.: "conexão recusada na porta X") sem deixar arquivos de configuração parcialmente escritos.

**Notas:** no MVP, apenas o isolamento por base compartilhada (`tenant_id`) é implementado de fato; a pergunta sobre banco dedicado por tenant já existe na experiência, mas a opção fica marcada como disponível no roadmap — a camada de acesso a dados, porém, já precisa ser desenhada para não travar essa evolução (ver NFR de Segurança em §8).

#### FR-3: Scaffolding de código via `generate`

O desenvolvedor pode gerar código de um tipo específico com `aether-admin generate <tipo> <nome...>`, aceitando múltiplos nomes numa única invocação. O tipo `module` gera um Módulo/Domínio completo (ver Glossário).

**Consequências (testáveis):**
- O comando aceita um ou mais nomes na mesma chamada (ex.: `generate module financeiro comercial`), gerando o conjunto de arquivos correspondente para cada nome.
- `generate module <nome>` produz, no mínimo: um fragmento de schema Prisma (modelo de dados do módulo), um schema de validação Zod para entrada/saída das operações, um router tRPC expondo essas operações (já protegido pelo enforcement da FR-27), e uma declaração dos Recursos (permissões nomeadas) que o módulo expõe para o sistema de Papéis.
- Um projeto novo (`aether-admin new`) já nasce com um módulo default (ex.: "Sistema") para não obrigar o desenvolvedor a pensar em domínios antes de ter maturidade para separá-los.
- `generate module --from <arquivo>` gera múltiplos módulos de uma vez a partir de um arquivo de planejamento (ex.: YAML com nome + descrição por módulo) — para o dev que já chega com os domínios bem definidos.
- Cada geração inclui automaticamente o scaffolding de teste correspondente (FR-21, ver §4.6).

#### FR-4: `dev` — subir a aplicação localmente para desenvolver e testar

O desenvolvedor pode rodar `aether-admin dev` como o único comando necessário para ter a aplicação completa (frontend + backend, servidor HTTP incluso) rodando localmente, em modo desenvolvimento, para usar e testar enquanto codifica.

**Consequências (testáveis):**
- Um único comando sobe frontend e backend simultaneamente — não é necessário nenhum outro comando para "testar a aplicação" localmente.
- `aether-admin dev` sobe automaticamente as dependências do Docker Compose (FR-23 — banco de dados e capturador de email) caso ainda não estejam rodando; o desenvolvedor nunca precisa rodar `docker compose up` manualmente para o fluxo padrão.
- Alteração em arquivo de frontend reflete no navegador via HMR, sem recarregar a página inteira.
- Alteração em arquivo de backend reinicia o processo do servidor automaticamente.

#### FR-5: Aplicar migrations

O desenvolvedor pode aplicar migrations de banco pendentes com `aether-admin migrate`, geradas automaticamente a partir de mudanças no schema.

**Consequências (testáveis):**
- Migrations são geradas a partir de alterações no schema Prisma, sem SQL escrito à mão no fluxo padrão.
- `migrate` aplica apenas migrations pendentes, de forma idempotente.

#### FR-6: Configuração externalizada por ambiente

O sistema lê configuração de variáveis de ambiente e arquivos por ambiente (dev/staging/produção) — nunca hardcoded no código-fonte.

**Consequências (testáveis):**
- Nenhuma credencial ou endpoint aparece hardcoded em arquivo versionado.
- Trocar de ambiente (dev → staging) não exige alteração de código, só de configuração.

### 4.2 Autenticação e Segurança

**Descrição:** A camada de identidade de um usuário autenticado — login, sessão, revogação — implementada de forma robusta o suficiente para não ser alvo de crítica de um dev competente, e desenhada como interface extensível desde o MVP, mesmo com implementação local.

**Requisitos Funcionais:**

#### FR-7: Autenticação por JWT + Refresh Token

Um usuário pode se autenticar e receber um access token de vida curta e um refresh token de vida longa, via `AuthProvider`.

**Consequências (testáveis):**
- Login bem-sucedido retorna access token (JWT) e refresh token.
- O refresh token é entregue via cookie `httpOnly` + `SameSite` — nunca exposto a JavaScript do cliente, resistente a roubo via XSS. O access token trafega em memória no cliente, não em `localStorage`.
- Access token expira em minutos; refresh token tem vida útil configurável, maior.
- Access token expirado é rejeitado pelas rotas protegidas; o cliente usa o refresh token para obter um novo access token sem novo login.

#### FR-8: Hashing de senha com Argon2id + Pepper

O sistema armazena senhas usando Argon2id com pepper (segredo da aplicação, separado do salt por usuário).

**Consequências (testáveis):**
- Nenhuma senha é armazenada em texto plano ou com hashing reversível.
- Os parâmetros de custo do Argon2id (memória, iterações, paralelismo) seguem o baseline mínimo que a OWASP recomenda para esse algoritmo, não uma configuração arbitrária.
- O pepper é lido através do `SecretsProvider` (FR-26), nunca hardcoded.

#### FR-9: Revogação de refresh token via `TokenRevocationStore`

Um usuário (ou um administrador, em nome dele, pela tela de administração — FR-14) pode invalidar um refresh token antes da expiração natural, através da interface `TokenRevocationStore`.

**Consequências (testáveis):**
- Após revogação, o refresh token revogado não gera mais um novo access token válido.
- A implementação MVP é Postgres/Prisma-backed (ver §8.1, sem dependência de Redis).
- A interface é agnóstica de backend, permitindo troca futura por uma implementação Redis-backed sem alterar o código que a consome.

#### FR-10: `AuthProvider` como ponto de extensão

O mecanismo de autenticação é acessado através da interface `AuthProvider`, com uma implementação local (Argon2id + Pepper) no MVP.

**Consequências (testáveis):**
- Nenhum código de negócio depende diretamente do mecanismo de autenticação local — toda chamada passa pela interface `AuthProvider`.
- Trocar a implementação local por um provedor externo (ex.: Keycloak, no roadmap) não exige alterar código que consome `AuthProvider`.

#### FR-26: `SecretsProvider` como ponto de extensão

O acesso a segredos da aplicação (ex.: o pepper do FR-8) é feito através da interface `SecretsProvider`, com uma implementação local (variável de ambiente) no MVP.

**Consequências (testáveis):**
- Nenhum código depende diretamente de onde um segredo está armazenado — toda leitura passa pela interface `SecretsProvider`.
- Trocar a implementação local por um cofre externo (ex.: OpenBAO, no roadmap) não exige alterar código que consome `SecretsProvider`.

#### FR-28: Proteção contra força bruta em autenticação

Os endpoints de login e de solicitação de redefinição de senha aplicam rate limiting por identificador (ex.: email, IP).

**Consequências (testáveis):**
- Excesso de tentativas de login com credenciais inválidas para o mesmo identificador resulta em bloqueio temporário, não em erro comum indistinguível.
- O mesmo limite se aplica a solicitações repetidas de redefinição de senha, para o mesmo identificador, prevenindo enumeração de usuário.
- A implementação MVP usa o mesmo banco de dados já usado pelo `TokenRevocationStore` (ver §8.1, sem dependência de Redis).

**NFRs específicas desta feature:**
- **Isolamento de tenant**: o nível de isolamento (base compartilhada vs. banco dedicado por tenant) é decisão do desenvolvedor no setup do projeto (ver FR-2), nunca imposta pelo framework. A camada de acesso a dados usada por esta feature é acessada através de um resolvedor consciente de tenant, não uma conexão global fixa — para que oferecer banco dedicado por tenant no futuro não exija reforma da camada de auth.
- **Zero Trust na comunicação interna**: alinhado a NIST SP 800-207 e à decisão compartilhada com o Tecton — todo serviço/instância verifica a assinatura do token por si mesmo, sempre; nenhuma chamada, interna ou externa, é implicitamente confiável só por estar "dentro" do processo.

### 4.3 Identidade e Administração

**Descrição:** O modelo hierárquico que sustenta a árvore de identidade, a aplicação real dessas permissões em tempo de execução, e a tela de administração funcional do MVP construída sobre tudo isso — o alicerce sobre o qual a árvore visual completa (roadmap) será construída sem reforma. Realiza UJ-2.

**Requisitos Funcionais:**

#### FR-11: Modelo de entidades hierárquico

O framework mantém Usuário, Grupo, Papel e Módulo/Submódulo como objetos de primeira classe, com relações de contenção (pai/filho), associação (membro de) e atribuição (papel sobre) — ver Glossário para o mecanismo de persistência de cada relação — todas escopadas por Tenant.

**Consequências (testáveis):**
- Ancestrais e descendentes de qualquer Módulo/Submódulo são consultáveis numa única operação, sem recursão N+1 (via Closure Table).
- A estrutura suporta profundidade arbitrária de Módulos/Submódulos.
- Toda consulta à árvore (ancestrais, descendentes, associações, atribuições) é automaticamente escopada por Tenant através do resolvedor consciente de tenant (§8.1) — nenhuma consulta, mesmo mal escrita num Módulo gerado, pode retornar dado de outro Tenant.
- O schema funciona sobre qualquer banco suportado pelo Prisma no MVP (PostgreSQL, MySQL, MS-SQL), sem depender de extensão específica de um banco (ex.: sem `ltree`).

#### FR-12: Herança aditiva de Papéis

Um Papel atribuído a um Usuário ou Grupo sobre um Módulo/Submódulo propaga automaticamente para os descendentes desse Módulo/Submódulo.

**Consequências (testáveis):**
- Um Papel atribuído no módulo "Estoque" também vale, por padrão, em qualquer submódulo de "Estoque", sem atribuição manual redundante.
- Não existe bloqueio/override de herança por nó no MVP — um Papel herdado não pode ser negado seletivamente num descendente específico.

**Out of Scope:**
- Bloqueio/override de herança por nó — roadmap explícito (ver Brief).

#### FR-13: Tipos de Recurso

Um Papel agrega um ou mais Recursos, do tipo Permissão Nomeada (implementado no MVP) ou Objeto de Negócio Real (interface prevista, sem implementação no MVP).

**Consequências (testáveis):**
- O sistema permite declarar e atribuir Permissões Nomeadas (ex.: "pode editar fatura") a um Papel.
- O tipo Objeto de Negócio Real existe como contrato de tipo (`ResourceType`), sem ferramenta de registro genérico de entidade de negócio como recurso no MVP.

#### FR-27: Aplicação de permissões em tempo de execução (default-deny)

Toda procedure tRPC gerada por um Módulo (FR-3) exige, antes de executar, que o usuário autenticado possua o Papel/Recurso correspondente. Por padrão, acesso é **negado** a quem não possui o Recurso necessário — não é preciso "desligar" acesso explicitamente, é preciso "ligá-lo".

**Consequências (testáveis):**
- Uma procedure tRPC gerada rejeita a chamada (erro de autorização) quando o usuário autenticado não possui o Recurso exigido, antes de qualquer lógica de negócio rodar.
- Um Módulo recém-gerado (FR-3) já nasce com essa checagem amarrada a cada procedure — o desenvolvedor não escreve middleware de autorização manualmente para o caso padrão.
- Uma rota explicitamente marcada como pública é a única exceção ao default-deny, e essa marcação é explícita no código gerado (ex.: um decorator/flag visível), nunca um comportamento implícito ou ausência de checagem.

#### FR-14: Tela de administração de identidade

Um administrador pode visualizar, criar, editar, remover e organizar Usuários, Grupos e Papéis através de uma tela de administração funcional, sem interação de arrastar-e-soltar no MVP. Realiza UJ-2.

**Consequências (testáveis):**
- O admin pode listar e consultar Usuários, Grupos e Papéis existentes, com seus atributos e atribuições atuais.
- O admin pode criar um novo Usuário avulso (ex.: "+ Usuário") preenchendo os dados necessários, e editar dados de um Usuário existente (ex.: email).
- O admin pode remover uma atribuição existente (usuário de um grupo, papel de um módulo) — organização não é só aditiva.
- O admin pode selecionar um ou mais Usuários e atribuí-los a um Grupo ou Módulo/Submódulo através de uma ação explícita (ex.: "atribuir a"), sem exigir arrastar-e-soltar.
- O admin pode atribuir um Papel a um Usuário ou Grupo sobre um Módulo/Submódulo específico.
- O admin pode revogar as sessões ativas de um Usuário (FR-9) diretamente pela tela.
- Toda ação de organização (FR-14) ou import (FR-15) reflete imediatamente na árvore consultável (FR-11), sem etapa de sincronização manual.

#### FR-15: Import em lote de Usuários

Um administrador pode importar uma lista de Usuários de uma vez (ex.: arquivo CSV), em vez de cadastrar um por um.

**Consequências (testáveis):**
- O import aceita múltiplos Usuários numa única operação e reporta sucesso/erro por linha.
- Cada Usuário importado recebe um email para configurar a própria senha (ver §4.5, Notificações Transacionais).

**Out of Scope:**
- Import de dados de negócio genéricos, não-Usuário (ex.: registros de clientes de um sistema construído sobre o Aether) — é o tipo Objeto de Negócio Real (FR-13), ainda sem implementação no MVP.

### 4.4 Comunicação Tipada (API)

**Descrição:** O mecanismo único de comunicação entre frontend e backend — decisivo, não configurável, para eliminar a indecisão "REST ou GraphQL" que qualquer outro framework do gênero deixa em aberto.

**Requisitos Funcionais:**

#### FR-16: Comunicação tipada ponta a ponta via tRPC

O frontend consome a API do backend através de procedures tRPC, com tipos inferidos automaticamente do backend para o frontend, sem geração manual de client.

**Consequências (testáveis):**
- Uma mudança de assinatura numa procedure do backend gera erro de tipo no frontend em tempo de compilação, sem rodar um gerador de client separado.
- Não existe REST ou GraphQL alternativo no MVP — tRPC é o único mecanismo de comunicação entre frontend e backend.

#### FR-17: Validação compartilhada via Zod

Toda entrada de uma procedure tRPC é validada por um schema Zod, reaproveitado no frontend para validação de formulário.

**Consequências (testáveis):**
- Uma requisição com dado inválido é rejeitada pelo backend antes de qualquer lógica de negócio rodar, com erro estruturado (formato RFC 9457, ver FR-25).
- O mesmo schema Zod usado na validação do backend é importável e usável diretamente no frontend, sem duplicar a definição.

### 4.5 Notificações Transacionais

**Descrição:** Envio de email transacional atrás de uma interface unificada — o suficiente para fechar os fluxos de senha que a Identidade e Administração (§4.3) e a Autenticação (§4.2) dependem, sem amarrar o framework a um provedor específico.

**Requisitos Funcionais:**

#### FR-18: Envio de email transacional via interface unificada

O sistema envia emails transacionais através de uma interface unificada de provedor de email, com um provedor implementado no MVP.

**Consequências (testáveis):**
- Um evento que dispara email (ex.: import de Usuário, "esqueci minha senha") enfileira/envia o email sem o código de negócio conhecer o provedor concreto.
- Trocar de provedor de email não exige alterar o código que dispara o envio — só a implementação da interface.

#### FR-19: Configuração e redefinição de senha por link

Um Usuário pode configurar (após import, FR-15) ou redefinir sua senha através de um link enviado por email, com token de uso único e expiração.

**Consequências (testáveis):**
- O link contém um token de uso único que expira após um tempo configurável.
- Usar o link após expiração ou reuso resulta em erro no formato RFC 9457 (título e detalhe explícitos, ver FR-25), sem permitir alteração de senha.
- Completar a redefinição de senha invalida todas as sessões/refresh tokens ativos do Usuário (via `TokenRevocationStore`, FR-9) — uma troca de senha por precaução realmente fecha o acesso de quem tinha um token válido antes.

#### FR-20: Captura de email em ambiente de desenvolvimento

Em ambiente de desenvolvimento, o sistema envia emails para um capturador local (ex.: Mailpit) em vez de um provedor real, sem exigir configuração manual do desenvolvedor.

**Consequências (testáveis):**
- Rodando `aether-admin dev`, todo email disparado (FR-18) é capturado por um serviço local incluído no Docker Compose de desenvolvimento (FR-23) e visualizável numa interface web local — nenhum email real é enviado.
- O desenvolvedor não precisa de credenciais de provedor de email para testar fluxos que dependem de envio (ex.: FR-19) durante o desenvolvimento.
- Trocar de ambiente de desenvolvimento para produção troca automaticamente o backend usado, sem alteração de código — mesma interface unificada da FR-18.

### 4.6 Qualidade, Observabilidade e DX

**Descrição:** O que faz o Aether parecer maduro num primeiro olhar técnico — testes, lint, ambiente local reprodutível, logs e erros tratados de fábrica, sem o desenvolvedor montar nada disso à mão.

**Requisitos Funcionais:**

#### FR-21: Scaffolding automático de testes

Toda geração de código via `generate` (FR-3) inclui automaticamente o scaffolding de teste correspondente, usando Vitest.

**Consequências (testáveis):**
- Rodar `generate module financeiro` cria também um arquivo de teste correspondente, pronto para ser preenchido.
- Um projeto recém-criado (`new`) já vem com Vitest configurado, sem setup manual.

#### FR-22: Padronização de lint e formatação

O projeto gerado já vem com ESLint e Prettier configurados.

**Consequências (testáveis):**
- Um projeto recém-criado passa em lint e formatação sem alterações manuais de configuração. Regras padrão: `eslint:recommended` + regras recomendadas do `typescript-eslint`, formatação via Prettier com config default.
- As configurações podem ser sobrescritas pelo desenvolvedor sem quebrar o padrão default.

#### FR-23: Ambiente de desenvolvimento via Docker

O projeto gerado inclui um Dockerfile de desenvolvimento (imagem simples, sem hardening — não é o Dockerfile de produção, ver §6.2 Fast-follow) e um Docker Compose mínimo cobrindo as dependências de desenvolvimento local (banco de dados, capturador de email).

**Consequências (testáveis):**
- `docker compose up` (disparado automaticamente por `aether-admin dev`, FR-4) sobe o banco de dados especificamente escolhido no setup assistido (FR-2) — não um banco fixo/hardcoded — e o capturador de email (FR-20), prontos para uso sem configuração adicional.
- O Dockerfile gerado permite rodar a própria aplicação em container localmente, para paridade com o ambiente de banco/email, sem otimização de build ou hardening de imagem (isso é Fast-follow).
- O Compose do MVP não exige nenhuma outra dependência de infraestrutura (ver §8.1, sem dependência de Redis).

#### FR-24: Logging estruturado

O sistema registra logs estruturados (JSON) por padrão, com níveis configuráveis (debug/info/error).

**Consequências (testáveis):**
- Toda requisição tratada pelo backend gera ao menos uma linha de log estruturado, incluindo identificador de correlação por requisição no formato `traceparent` (W3C Trace Context) — mesmo padrão adotado pelo projeto irmão Tecton.
- O nível de log é configurável por ambiente, sem alteração de código.

#### FR-25: Tratamento de erro global

O sistema centraliza o tratamento de erros não capturados numa camada única, mapeando erros para respostas padronizadas.

**Consequências (testáveis):**
- Um erro não tratado em qualquer procedure não derruba o processo — é capturado pela camada global e retorna uma resposta de erro no formato RFC 9457 Problem Details (com o campo `invalid-params` para erros de validação), mesmo padrão adotado pelo Tecton.
- Respostas de sucesso não usam envelope.
- Erros de negócio (esperados) e erros técnicos (inesperados) são diferenciáveis na resposta.

## 5. Não-Objetivos (Explícitos)

- O Aether não se torna um framework orientado a microsserviços — essa é a proposta do Tecton, projeto irmão. O Aether permanece monolítico por decisão de identidade, não por limitação técnica.
- O Aether não constrói ferramentas de migração de/para microsserviços — nem no MVP, nem no roadmap próximo definido.
- O Aether não vira um gerador genérico de CRUD para qualquer entidade de negócio — o admin gerencia identidade (Usuário/Grupo/Papel/Módulo), não dados de negócio arbitrários do sistema construído sobre ele.
- O Aether não impõe um nível de isolamento de tenant — a escolha entre base compartilhada e banco dedicado é sempre do desenvolvedor.
- O Aether não oferece REST ou GraphQL como alternativa a tRPC — comunicação tipada é decisão única e definitiva.

## 6. Escopo do MVP

### 6.1 Dentro do Escopo

- CLI e scaffolding de projeto, incluindo convenção de roteamento e orquestração automática de Docker (FR-1 a FR-6)
- Autenticação e segurança: JWT + Refresh Token (cookie `httpOnly`), Argon2id + Pepper, `AuthProvider`, `TokenRevocationStore`, `SecretsProvider`, rate limiting (FR-7 a FR-10, FR-26, FR-28)
- Identidade e Administração: modelo hierárquico escopado por Tenant, herança aditiva, tipos de Recurso, tela de admin funcional completa (CRUD + revogação), import de Usuários, **aplicação de permissões em tempo de execução** (FR-11 a FR-15, FR-27)
- Comunicação tipada via tRPC + Zod (FR-16, FR-17)
- Notificações transacionais: email unificado, fluxo de senha com invalidação de sessão, captura em dev (FR-18 a FR-20)
- Qualidade, observabilidade e DX: testes, lint, Docker (dev), logging (`traceparent`), tratamento de erro (RFC 9457) (FR-21 a FR-25)

### 6.2 Fora do Escopo do MVP

- **Fast-follow (logo em seguida)**: cache (Redis), filas assíncronas, internacionalização, Dockerfile/compose de **produção** assistido (build multi-stage, hardening de imagem, gestão de segredos, reaproveitando o padrão de assistente da FR-2) — deixados de fora deliberadamente para não introduzir dependência de infraestrutura ou trabalho de hardening sem necessidade imediata. Distinto do Dockerfile de desenvolvimento, que é MVP (FR-23).
- **Roadmap — próximo marco definido**: autenticação plugável (Keycloak, OpenBAO); árvore visual completa com drag-and-drop; criptografia seletiva com custódia múltipla de chaves (`KeyCustodyProvider`); isolamento de tenant por banco dedicado; canal seguro entre réplicas (mTLS); arquitetura Zero Trust mais completa; workflow de aprovação complexo (`WorkflowEngineProvider`, decisão compartilhada com o Tecton — candidato Temporal).
- **Someday**: sistema de plugins; caminho de migração assistida para o Tecton; gerador de UI CRUD genérico (Objeto de Negócio Real como tipo de Recurso); PWA; WebSockets; upload em streaming; geração de client OpenAPI.
- Bloqueio/override de herança de permissão por nó — reservado como extensão futura explícita sobre o modelo aditivo do MVP (ver FR-12).

## 7. Métricas de Sucesso

**Primárias**
- **SM-1**: Passos até "Hello World" — número de comandos principais, da instalação até a página inicial funcionando. Meta: **≤ 3 comandos** (`new`, setup de banco, `dev`) — mesma contagem que o fluxo equivalente do Django (`startproject` + `migrate` + `runserver`). Valida FR-1, FR-2, FR-4.
- **SM-2**: Um desenvolvedor estranho ao projeto completa esse fluxo sozinho, sem o autor por perto, só com a documentação. Meta: **pelo menos 3 pessoas, idealmente 5**, testadas — calibrado pela heurística de usabilidade da Nielsen Norman Group (5 usuários encontram ~85% dos problemas de usabilidade), reduzido para o realista de um projeto solo sem orçamento de pesquisa. Valida FR-1, FR-2.
- **SM-4**: Organizar N Usuários em M Grupos/Papéis pela tela de administração (cenário UJ-2) exige **O(M) ações, não O(N)** — ou seja, atribuir um grupo de usuários de uma vez via seleção múltipla, nunca uma ação por pessoa. Valida FR-14, FR-15.

**Secundária**
- **SM-3**: O autor constrói pelo menos um projeto real (próprio ou de cliente) sobre o Aether e relata retrabalho percebido menor do que começar do zero. Não valida uma FR específica — valida a proposta de valor como um todo.

**Contrapartidas (não otimizar)**
- **SM-C1**: Número de opções configuráveis expostas no fluxo de `new`/setup. Não deve crescer para "parecer mais flexível" — cada opção nova reintroduz a indecisão que o Aether existe para eliminar. Contrabalança SM-1: é fácil ganhar velocidade percebida de setup adicionando atalhos configuráveis, mas isso trai a filosofia de decisões decisivas.
- **SM-C2**: Exceções ao modelo de herança aditiva de permissões (FR-12). Não deve crescer silenciosamente de volta para bloqueio/override por conveniência pontual — isso reintroduziria a opacidade que foi deliberadamente evitada. Contrabalança a tentação de tornar a tela de administração "mais poderosa" a qualquer custo.

## 8. NFRs Cross-Cutting e Guardrails

*Segurança é a preocupação dominante deste produto — Safety e Cost não se aplicam de forma relevante (o Aether não é um sistema crítico à segurança física, nem um serviço hospedado com custo de operação a otimizar); não forçadas como seções.*

### 8.1 Segurança

- **Instância stateless**: nenhuma implementação MVP depende de sessão, cache ou estado em memória exclusivo de uma instância. Toda persistência de estado (ex.: `TokenRevocationStore`, FR-9) usa o banco de dados. Isso permite escalonamento horizontal (várias réplicas do monólito) sem reforma futura.
- **Sem confiança implícita (Zero Trust interno, NIST SP 800-207)**: toda chamada — interna ou externa — passa pelo `AuthProvider` (FR-10) e é submetida ao enforcement de autorização (FR-27). Nenhum caminho de código bypassa autenticação ou autorização por conveniência de desenvolvimento, nem mesmo temporariamente. Todo serviço/instância verifica a assinatura do token por si mesmo, sempre — decisão compartilhada com o Tecton.
- **Isolamento de tenant é escolha do desenvolvedor**: o framework nunca impõe um nível de isolamento (FR-2); a camada de acesso a dados é sempre acessada através de um resolvedor consciente de tenant, nunca uma conexão global fixa. A árvore de identidade em si (FR-11) é escopada por Tenant em toda consulta.
- **Nenhuma alegação de segurança sem reforço técnico real**: seguindo o mesmo princípio já adotado pelo projeto irmão Tecton, nenhuma funcionalidade futura pode se dizer "segura e auditável" com base só em uma checagem de workflow — precisa de reforço criptográfico ou estrutural de verdade (relevante já agora para não desenhar `KeyCustodyProvider`/`AuthProvider`/`SecretsProvider`/`WorkflowEngineProvider` de um jeito que abra essa exceção no futuro).
- **Sem dependência de infraestrutura desnecessária**: nenhuma implementação MVP (`TokenRevocationStore` — FR-9, rate limiting — FR-28, Docker Compose de desenvolvimento — FR-23) requer Redis. Backends Redis-backed ficam previstos como opção futura, não implementados agora.

### 8.2 Privacidade

- Senha nunca é armazenada em texto plano ou hash reversível (FR-8).
- Nenhuma credencial ou segredo aparece hardcoded em código versionado (FR-2, FR-6, FR-26).
- Dado sensível de tenant permanece isolado por Tenant mesmo no modelo de base compartilhada do MVP (FR-11).
- Refresh token nunca é exposto a JavaScript no cliente (FR-7).

## 9. Superfície Pública / Contratos de API

**Descrição:** Aether expõe pontos de extensão formais para que provedores externos substituam a implementação local sem alterar código consumidor. Nomenclatura sem prefixo de projeto — convenção compartilhada com o projeto irmão Tecton.

### 9.1 Interfaces de extensão

- `AuthProvider` — mecanismo de autenticação. MVP: implementação local (Argon2id + Pepper). Roadmap: Keycloak, OpenBAO.
- `TokenRevocationStore` — revogação de refresh token. MVP: Postgres/Prisma-backed. Roadmap: backend Redis-backed opcional.
- `SecretsProvider` — acesso a segredos da aplicação. MVP: variável de ambiente local. Roadmap: OpenBAO (Transit engine).
- `KeyCustodyProvider` — custódia de chave de criptografia por limiar. Interface prevista; implementação fora do MVP (Roadmap).
- `WorkflowEngineProvider` — workflow de aprovação complexo. Interface prevista; implementação fora do MVP (Roadmap, candidato Temporal) — decisão compartilhada com o Tecton.

### 9.2 Formato de API e erros

Respostas de sucesso não usam envelope. Respostas de erro seguem RFC 9457 Problem Details, com o campo `invalid-params` para erros de validação. Correlação de requisição via header `traceparent` (W3C Trace Context). Convenção compartilhada com o Tecton (ver FR-24, FR-25).

### 9.3 Política de versionamento e breaking changes

Pré-1.0, as interfaces de extensão podem mudar entre versões menores, documentado em changelog. A partir da v1.0, mudança de contrato nessas interfaces exige major version bump (semver).

### 9.4 Metas de linguagem e runtime

- TypeScript é a linguagem de implementação e de consumo — tipagem ponta a ponta é premissa transversal do produto, não uma feature isolada.
- Node.js na versão LTS ativa mais recente no momento de cada release do Aether, sem suporte a versões em fim de vida (EOL).

## 10. Why Now

RedwoodJS está em fim de vida (o time recomenda migrar para outro projeto) e Blitz.js pivotou de "framework monolítico" para um toolkit agnóstico — dois concorrentes diretos de "framework completo e opinativo" saindo do jogo nos últimos anos. O espaço está mais vazio do que estava. Ao mesmo tempo, o Wasp já ocupa o território de "framework para a era de IA" com uma DSL própria — o que significa que o timing do Aether não é de categoria vazia, é de janela de execução: quem entregar robustez tipo Django/Spring Boot, TypeScript idiomático sem linguagem nova, e a identidade em árvore — sem depender de convencer ninguém — tem chance real de ocupar o espaço que os concorrentes deixaram.

## 11. Questões em Aberto

1. Metas de performance (latência, throughput) não foram definidas. Isso deixou de ser um detalhe adiável: com o enforcement de permissão (FR-27) consultando a árvore de identidade (FR-11) em toda requisição autenticada, a performance da árvore está no caminho crítico de tudo. Recomendo priorizar isso já na fase de arquitetura, não tratar como algo secundário.
2. `aether-admin generate` tem o tipo `module` bem definido (FR-3); outros tipos possíveis (ex.: página, componente isolado) não foram enumerados.

## 12. Índice de Suposições

Nenhuma suposição pendente — as duas identificadas durante a redação (política de versionamento semver e versão do Node.js, §9.3 e §9.4) foram confirmadas em conversa e já estão registradas como decisão, não mais como `[ASSUMPTION]`.
