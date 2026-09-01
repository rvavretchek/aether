export function buildDbFiles(): Record<string, string> {
  return {
    // Sem dependências de Prisma instaladas ainda nesta story (nem `prisma`, nem
    // `@prisma/client`/`@prisma/adapter-pg`) — coerente com "sem banco real nesta story"
    // (ver Dev Notes): sem model nenhum, não há nada real pra Prisma gerar ou conectar
    // ainda. Chegam junto com o primeiro `model` de verdade nas Epics 2/3.
    'package.json':
      JSON.stringify(
        {
          name: 'db',
          version: '0.0.1',
          private: true,
          type: 'module',
          devDependencies: {
            typescript: '5.9.3',
          },
        },
        null,
        2,
      ) + '\n',

    // Sem src/ ainda nesta story (nenhum model, nenhum código de verdade pra empacotar —
    // ver Dev Notes). rootDir fica na raiz do pacote pra cobrir prisma.config.ts até a
    // Epic 2/3 trazer o primeiro model de verdade e um src/ real.
    'tsconfig.json':
      JSON.stringify(
        {
          extends: '../../tsconfig.base.json',
          compilerOptions: {
            composite: true,
            outDir: 'dist',
            rootDir: '.',
          },
          include: ['prisma.config.ts'],
        },
        null,
        2,
      ) + '\n',

    // Prisma 7: o bloco `datasource` só declara o provider — a connection string/adapter
    // vivem em prisma.config.ts (ver Dev Notes da Story 1.1). Sem `model` nesta story —
    // Tenant/User/Group/Role/Module/ModuleClosure/Resource chegam nas Epics 2/3, cada uma
    // criando só as tabelas que precisa (nunca tudo adiantado numa Story 1).
    'schema.prisma': [
      'generator client {',
      '  provider = "prisma-client-js"',
      '}',
      '',
      'datasource db {',
      '  provider = "postgresql"',
      '}',
      '',
      '// Nenhum `model` ainda — ver Dev Notes da Story 1.1 (Epic 1) sobre por que',
      '// as tabelas de identidade (Tenant/User/Group/Role/Module/ModuleClosure/Resource)',
      '// não são criadas nesta story.',
      '',
    ].join('\n'),

    // Placeholder — Prisma 7 usa este arquivo (fora do schema.prisma) pra config de
    // CLI/datasource URL, mas o adapter (@prisma/adapter-pg) só é instalado quando a
    // Epic 2/3 adicionar o primeiro `model` de verdade (ver Dev Notes da Story 1.1).
    'prisma.config.ts': [
      '// TODO(Epic 2/3): configurar o driver adapter (@prisma/adapter-pg) aqui quando',
      '// packages/db/schema.prisma ganhar o primeiro `model` de verdade.',
      'export {};',
      '',
    ].join('\n'),
  };
}
