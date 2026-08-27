# Addendum — Product Brief: Aether

Contexto capturado durante a sessão que não cabe na prosa enxuta do brief, mas que vale preservar para quem for trabalhar nos artefatos seguintes (PRD, arquitetura).

## Por que o pitch não referencia NDS/Novell diretamente

O gancho de identidade em árvore é inspirado numa experiência pessoal do autor com o Novell NetWare 4.1 / NDS, mais de 30 anos atrás. A referência histórica foi deliberadamente mantida fora do Sumário Executivo e do "O Que Torna Isto Diferente": o público-alvo (devs React + Node) provavelmente não tem esse contexto — ter usado o NDS exige ter hoje pelo menos 55 anos, o que é exceção nesse público, não regra. A imagem que vende sozinha é o gesto concreto (arrastar e soltar numa árvore, como Google Drive ou Trello), não o nome do sistema que inspirou. A história pessoal do NDS foi reservada para a seção Visão, onde funciona como origem/motivação, não como argumento de venda.

## Relação técnica com o Tecton

O Aether tem um projeto irmão, **Tecton** (mesmo autor, repositório separado, framework orientado a microsserviços por domínio — ver `docs/aether-tecton-compatibility.md` no repositório do Aether). Os dois projetos convergiram de forma independente em várias decisões centrais (a regra de escopo "teste de duas perguntas"/"desenhar o encaixe agora", o core de identidade em árvore, o domínio de custódia de chaves) e mantêm uma política vinculante: uma decisão de arquitetura aprovada de um lado que afete o outro vale automaticamente para os dois.

Decisões técnicas já herdadas do Tecton para o Aether via esse mecanismo:
- Especificação completa do domínio de custódia de chaves (quórum configurável, auto-recuperação estilo unseal do Vault/OpenBAO, aprovação criptograficamente forçada para ações sensíveis, interface `KeyCustodyProvider`).
- Padrão de persistência da hierarquia: Closure Table (portável entre bancos).
- Modelo de herança de permissões: aditivo simples no MVP (sem bloqueio/override por nó) — decisão revisada após crítica do lado do Aether, por risco de opacidade em sistemas de permissão com bloqueio/override complexo.
- ORM unificado (Prisma) e vocabulário de CLI (`new`, `generate`, `dev`, `migrate`) idênticos nos dois projetos.

`docs/aether-tecton-compatibility.md` é a fonte de verdade técnica para esse relacionamento — deve ser consultado por quem for trabalhar em PRD ou arquitetura do Aether, especialmente nos subsistemas de identidade, autenticação e segurança.
