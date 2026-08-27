---
title: "Product Brief: Aether"
status: draft
created: 2026-08-10
updated: 2026-08-11
---

# Product Brief: Aether

## Sumário Executivo

Aether é um framework React + Node "baterias incluídas" com um gancho que nenhum concorrente do mercado JS atual tem: gerencie usuários, grupos e permissões arrastando e soltando numa árvore visual — não preenchendo formulário atrás de formulário. Ele entrega de fábrica o que todo projeto novo reconstrói do zero — autenticação robusta, ORM com migrations, comunicação tipada ponta a ponta, email transacional — para que o desenvolvedor gaste tempo no problema de negócio, não reinventando auth pela enésima vez.

O problema é familiar a qualquer dev React + Node: cada projeto novo repete as mesmas decisões — auth, ORM, arquitetura — sem nunca vir pronto de fábrica, e em escala (times, empresas com múltiplos arquitetos e squads) essa fragmentação vira perda real de produtividade. O Aether responde com decisões decisivas em vez de opções configuráveis, e com uma estrutura previsível o suficiente para que tanto um humano quanto um agente de IA gerem código nela com segurança. O timing favorece: RedwoodJS está em fim de vida, Blitz.js pivotou pra longe do formato monolítico, e o espaço de "framework completo e opinativo" está mais vazio do que há poucos anos.

O objetivo principal é ser uma peça de portfólio genuinamente diferenciada; o secundário é reduzir de verdade o tempo de desenvolvimento — inclusive do próprio autor, que já usa o diferencial de identidade em árvore como vantagem competitiva com seus próprios clientes, independentemente de adoção externa.

## O Problema

Todo projeto React + Node novo começa resolvendo os mesmos problemas de sempre: montar autenticação do zero, decidir entre Prisma e TypeORM, escrever mais uma vez o endpoint de "esqueci minha senha", validar dados nas duas pontas, decidir como logar erros e como estruturar a arquitetura. Nada disso é difícil — já foi resolvido incontáveis vezes por outras pessoas — mas nunca vem pronto de fábrica. O jeito de contornar isso hoje é copiar de um boilerplate antigo, recomeçar do zero mesmo, ou colar peças isoladas e excelentes (Prisma, NextAuth, Nodemailer) que resolvem sua fatia mas deixam a integração entre elas por conta do desenvolvedor.

Um desenvolvedor sozinho sente esse ganho real de tempo ao adotar um framework decente. Em escala, o problema se agrava: imagine uma empresa com 5 arquitetos, cada um com sua própria preferência de padrão, atendendo 6 squads cada — são pelo menos 30 formas diferentes de resolver os mesmos 5 problemas básicos. Sem uma base comum, não existe ganho de produtividade organizacional possível.

## A Solução

Aether é um framework React + Node "baterias incluídas": um comando (`aether-admin new`) entrega um projeto com autenticação robusta (JWT + Refresh Token, Argon2id + Pepper), ORM com migrations automáticas (Prisma), comunicação tipada ponta a ponta (tRPC), validação compartilhada entre front e back (Zod), envio de email e uma base de administração de usuários, grupos e papéis — tudo já pronto, sem que o desenvolvedor precise tomar essas decisões de novo a cada projeto.

Cada peça é uma escolha decisiva, não uma opção configurável — um jeito de fazer cada coisa, não dois ("REST ou GraphQL, tanto faz"), porque indecisão embutida no framework vira trabalho extra pra quem usa. Essa mesma previsibilidade tem um segundo efeito: a estrutura fica clara o suficiente para um agente de IA (Claude Code, Codex) gerar e estender código com segurança, seguindo convenção em vez de inventar uma abordagem nova a cada arquivo.

A base de administração entregue no MVP é o primeiro degrau de uma peça maior: uma árvore visual de identidade e permissões, gerenciável por arrastar-e-soltar — cuja ambição está descrita na seção Visão.

## O Que Torna Isto Diferente

O gancho central do Aether é a árvore de gestão de identidade e permissões arrastável — hierarquia visual estilo NDS/Novell NetWare. É o item mais defensável do projeto: nenhum concorrente pesquisado (Django Admin, Keycloak, Directus, Strapi) oferece isso hoje. Keycloak lançou hierarquia de grupos recentemente, mas via botão "mover para", não árvore arrastável; Django Admin precisa de pacote de terceiro pra ter visão em árvore; Directus e Strapi têm fricção documentada em RBAC hierárquico em escala. Ninguém tem o que o Aether propõe.

Honestidade sobre a segunda frente: "framework batteries-included pensado para a era de IA" não é território vazio — o Wasp já ocupa essa posição publicamente, com números de eficiência de token publicados. A diferença defensável do Aether ali não é "somos os únicos pensando em IA", é **TypeScript idiomático de ponta a ponta, sem linguagem de configuração nova para aprender** — o Wasp exige uma DSL própria; o Aether não.

A terceira frente — robustez tipo Django/Spring Boot em React + Node — é real, mas não é exclusiva: T3 Stack e AdonisJS disputam o mesmo território de "convenção sobre configuração". O timing ajuda: RedwoodJS está em fim de vida e Blitz.js pivotou pra longe do formato monolítico — o espaço de "framework completo, opinativo, ainda vivo" está mais vazio do que há poucos anos, mas isso é janela de oportunidade, não fosso.

Nenhuma dessas frentes é uma queda de braço contra Wasp, T3 ou qualquer outro. A aposta é que, sendo bom o suficiente, o Aether se adota por conta própria — por praticidade, não por convencimento. E, mesmo sem adoção externa, o diferencial já entrega valor direto: é o que o autor usa hoje para oferecer algo diferenciado aos próprios clientes.

## A Quem Isso Serve

**Primário**: desenvolvedores React + Node, individualmente ou em pequenas equipes, que hoje reconstroem autenticação, ORM e as mesmas decisões de arquitetura a cada projeto novo — o público que precisa achar o Aether genuinamente bom para o Aether "vencer" organicamente, sem depender de convencimento.

**Secundário (motivação pessoal do autor)**: o próprio criador, usando o Aether como peça de portfólio pública e, em paralelo, como ferramenta real em trabalho com clientes — mesmo sem adoção externa, entregar o diferencial da árvore de identidade e a robustez de autenticação já é uma vantagem competitiva concreta hoje.

## Critérios de Sucesso

O teste é usabilidade por um estranho: um dev React + Node qualquer, sem o autor por perto, consegue ir de instalação a um "Hello World" funcional sozinho, só lendo documentação. A régua concreta é a quantidade mínima de cliques, comandos e edições de arquivo necessários até esse ponto — comparável ao `django-admin startproject` + `python manage.py startapp` do Django, ou ao fluxo do Spring Initializr. Não é sobre impressionar quem lê currículo; é sobre reduzir retrabalho de verdade para quem usa.

Sinal de sucesso complementar, sem depender de adoção externa: o próprio autor constrói pelo menos um projeto real (próprio ou de cliente) sobre o Aether e sente, na prática, menos retrabalho do que começar do zero.

## Escopo

**Dentro (MVP)**: fundação (roteamento, configuração externalizada, logging, tratamento de erro global, dev server com hot-reload); comunicação tipada tRPC + validação Zod compartilhada; Prisma com migrations automáticas; autenticação JWT + Refresh Token (Argon2id + Pepper), com `AuthProvider` e `TokenRevocationStore` como interfaces extensíveis e implementação MVP local/Postgres (sem Redis); CLI enxuto (`new`, `generate`, `migrate`, `dev`); testes com scaffolding automático via Vitest; email transacional (interface unificada, um provedor); ESLint/Prettier; Docker mínimo (Dockerfile + compose só para banco local); base de administração de usuários/grupos/papéis funcional — sem drag-and-drop — construída sobre um modelo de dados hierárquico já preparado para a árvore visual completa; decisões de arquitetura preparatórias sem custo de escopo (multitenancy no schema, modelo de entidades genérico e hierárquico, abstrações prontas para provedores externos de auth e segredos).

**Fast-follow (logo após o MVP, não no MVP)**: cache (Redis), filas assíncronas, internacionalização, Docker de produção assistido (build multi-stage, gestão de segredos).

**Roadmap — próximo marco definido**: autenticação plugável (Keycloak, OpenBAO), a árvore visual completa com drag-and-drop, criptografia seletiva com custódia múltipla de chaves (multi-custodiante), isolamento de tenant por banco dedicado (nível de segurança escolhido pelo desenvolvedor no setup, nunca imposto pelo framework), canal seguro entre réplicas (mTLS, quando WebSockets/jobs agendados exigirem coordenação entre instâncias), e uma arquitetura Zero Trust mais completa (identidade de dispositivo/serviço, verificação contínua, PDP/PEP formal) construída sobre o schema de permissões estilo ReBAC já decidido.

**Someday (sem compromisso de prazo)**: sistema de plugins; caminho de migração assistida para o Tecton (framework irmão do mesmo autor, orientado a microsserviços por domínio — não o Aether virando microsserviços) para quando um projeto precisar escalar além do monólito; gerador de UI CRUD genérico; PWA; WebSockets; upload em streaming; geração de client OpenAPI.

## Visão

Nos próximos 2-3 anos, a ambição é o Aether se tornar um dos frameworks mais consolidados para desenvolvimento React + Node — citado no mesmo fôlego que Django, Rails ou Spring Boot quando alguém procura "framework completo, baterias incluídas" para esse stack. Mais especificamente, que a árvore de gestão de identidade e permissões vire **a** referência do setor: o jeito como se espera que um bom admin funcione, do mesmo jeito que "ter um Django Admin" virou atalho mental pra "CRUD administrativo resolvido".

Essa ambição nasce de uma experiência pessoal concreta: mais de 30 anos depois de usar o Novell NetWare 4.1 e o NDS, o autor ainda não encontrou nada no ecossistema atual que chegue perto daquela forma de gerenciar usuários, grupos e recursos numa árvore visual, manipulável por arrastar-e-soltar. O Aether é a tentativa de trazer essa ideia de volta, atualizada para 2026.

Se um projeto construído sobre o Aether crescer além do que um monólito aguenta, o caminho natural é migrar para o Tecton — o framework irmão do mesmo autor, desenhado desde a origem para microsserviços por domínio, compartilhando o mesmo núcleo de identidade e segurança. O Aether é o ponto de partida; o Tecton é para onde se cresce.

E, como já registrado nos Critérios de Sucesso: nada disso depende de adoção em massa para valer a pena. Enquanto o resto do mercado ainda não escolheu, o Aether já é uma vantagem competitiva real oferecida aos próprios clientes do autor.
