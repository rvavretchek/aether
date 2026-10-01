import { runCommand } from '../run-command.js';
import { checkIsAetherProject } from '../is-aether-project.js';

async function defaultRunMigrateDeploy(targetDir: string): Promise<void> {
  // `prisma migrate deploy`, não `migrate dev` — aplica só o que já está em
  // packages/db/migrations/, nunca gera uma migration nova nem pergunta nada
  // interativamente (AC #2). Via `exec`, não `run`, porque não existe (e não deve
  // existir) um script de package.json com esse nome — packages/db já tem um
  // script `migrate` próprio (`prisma migrate dev`, pro desenvolvedor autorar
  // schema manualmente) que significa outra coisa; reaproveitar o nome confundiria
  // os dois fluxos.
  await runCommand('pnpm --filter db exec prisma migrate deploy', targetDir);
}

export interface RunMigrateOptions {
  /** Injetável para teste — default roda `prisma migrate deploy` de verdade. */
  runMigrateDeploy?: (targetDir: string) => Promise<void>;
}

export type RunMigrateResult = { ok: true } | { ok: false; error: string };

/**
 * Implementa `aether-admin migrate` (FR-5). Ao contrário de `runNew`, o alvo já
 * existe — este comando roda de dentro de um projeto gerado pelo Aether, nunca cria
 * nada. Recusa rodar se `targetDir` não parecer um projeto Aether (sem
 * packages/db/schema.prisma), em vez de deixar o Prisma falhar com um erro
 * genérico sem contexto.
 */
export async function runMigrate(
  targetDir: string,
  options: RunMigrateOptions = {},
): Promise<RunMigrateResult> {
  const runMigrateDeploy = options.runMigrateDeploy ?? defaultRunMigrateDeploy;

  const projectCheck = await checkIsAetherProject(targetDir);
  if (!projectCheck.ok) {
    return projectCheck;
  }

  try {
    await runMigrateDeploy(targetDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Falha ao aplicar migrations: ${message}`,
    };
  }

  return { ok: true };
}
