import { resolve } from 'node:path';
import { runNew } from './commands/new.js';
import { runMigrate } from './commands/migrate.js';
import { runGenerateModule } from './commands/generate-module.js';

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (command === 'new') {
    const [projectName] = rest;
    if (!projectName) {
      console.error('Uso: aether-admin new <nome-projeto>');
      return 1;
    }

    const targetDir = resolve(process.cwd(), projectName);
    const result = await runNew(targetDir, projectName);

    if (!result.ok) {
      console.error(result.error);
      return 1;
    }

    console.log(`Projeto "${projectName}" criado em ${targetDir}`);
    console.log(
      'Próximo passo: configure o banco de dados (aether-admin setup — Epic 1 Story 2).',
    );
    return 0;
  }

  if (command === 'migrate') {
    // Diferente de `new`: roda de dentro de um projeto já existente (`process.cwd()`),
    // não recebe nome/diretório de projeto novo (AC #1, reconciliação nos Dev Notes).
    const result = await runMigrate(process.cwd());

    if (!result.ok) {
      console.error(result.error);
      return 1;
    }

    console.log('Migrations aplicadas.');
    return 0;
  }

  if (command === 'generate') {
    const [type, ...names] = rest;

    if (type !== 'module') {
      console.error(
        `Tipo de \`generate\` não suportado: "${type ?? ''}". Tipos disponíveis: module.`,
      );
      return 1;
    }

    if (names.length === 0) {
      console.error('Uso: aether-admin generate module <nome...>');
      return 1;
    }

    const result = await runGenerateModule(process.cwd(), names);

    if (!result.ok) {
      console.error(result.error);
      return 1;
    }

    let anyFailed = false;
    for (const nameResult of result.results) {
      if (nameResult.ok) {
        console.log(`Módulo "${nameResult.name}" gerado.`);
      } else {
        console.error(`Módulo "${nameResult.name}": ${nameResult.error}`);
        anyFailed = true;
      }
    }

    return anyFailed ? 1 : 0;
  }

  console.error(
    `Comando desconhecido: "${command ?? ''}". Comandos disponíveis: new, migrate, generate.`,
  );
  return 1;
}
