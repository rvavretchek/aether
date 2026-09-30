import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { runCommand } from '../run-command.js';

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

  try {
    await access(join(targetDir, 'packages/db/schema.prisma'));
  } catch (error) {
    // Só ENOENT (arquivo/diretório ausente) vira a mensagem "não é um projeto
    // Aether" — qualquer outra causa (EACCES, etc.) propaga a real, senão um
    // problema de permissão num projeto válido fica mascarado como "projeto
    // errado" (achado do code review, mesma causa raiz da AC #4 aplicada um
    // passo antes de `runMigrateDeploy`).
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {
        ok: false,
        error: `"${targetDir}" não parece um projeto Aether — packages/db/schema.prisma não encontrado. Rode a partir da raiz de um projeto gerado por \`aether-admin new\`.`,
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Falha ao verificar "${targetDir}": ${message}`,
    };
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
