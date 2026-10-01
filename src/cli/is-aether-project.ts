import { access } from 'node:fs/promises';
import { join } from 'node:path';

export type CheckResult = { ok: true } | { ok: false; error: string };

/**
 * Checagem compartilhada por `migrate` e `generate module` — os dois rodam de
 * dentro de um projeto já gerado (nunca criam um novo), então os dois precisam
 * recusar cedo, com mensagem clara, se `targetDir` não parecer um projeto Aether.
 * Só ENOENT (arquivo/diretório ausente) vira a mensagem "não é um projeto
 * Aether" — qualquer outra causa (EACCES, etc.) propaga a real, senão um
 * problema de permissão num projeto válido fica mascarado como "projeto errado"
 * (achado do code review da Story 3.2).
 */
export async function checkIsAetherProject(
  targetDir: string,
): Promise<CheckResult> {
  try {
    await access(join(targetDir, 'packages/db/schema.prisma'));
  } catch (error) {
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
  return { ok: true };
}
