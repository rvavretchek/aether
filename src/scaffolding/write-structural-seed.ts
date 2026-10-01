import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { buildRootFiles } from './templates/root.js';
import { buildApiFiles } from './templates/api.js';
import { buildAuthFiles } from './templates/auth.js';
import { buildRateLimitFiles } from './templates/rate-limit.js';
import { buildAuthzFiles } from './templates/authz.js';
import { buildWebFiles } from './templates/web.js';
import { buildSharedFiles } from './templates/shared.js';
import { buildDbFiles } from './templates/db.js';
import { buildDockerFiles } from './templates/docker.js';
import { buildNotificationFiles } from './templates/notifications.js';

function prefixKeys(
  prefix: string,
  files: Record<string, string>,
): Record<string, string> {
  const prefixed: Record<string, string> = {};
  for (const [relPath, content] of Object.entries(files)) {
    prefixed[join(prefix, relPath)] = content;
  }
  return prefixed;
}

/**
 * Escreve a árvore completa do Structural Seed (Architecture Spine) num diretório alvo,
 * restrita ao escopo da Story 1.1 — sem tabelas de negócio reais, sem enforcement/árvore de
 * identidade registrada (ver Dev Notes da story para o porquê).
 */
export async function writeStructuralSeed(
  targetDir: string,
  projectName: string,
): Promise<void> {
  const allFiles: Record<string, string> = {
    ...prefixKeys('.', buildRootFiles(projectName)),
    ...prefixKeys('apps/api', buildApiFiles()),
    ...prefixKeys('apps/api', buildAuthFiles()),
    ...prefixKeys('apps/api', buildRateLimitFiles()),
    ...prefixKeys('apps/api', buildAuthzFiles()),
    ...prefixKeys('apps/api', buildNotificationFiles()),
    ...prefixKeys('apps/web', buildWebFiles(projectName)),
    ...prefixKeys('packages/shared', buildSharedFiles()),
    ...prefixKeys('packages/db', buildDbFiles()),
    ...prefixKeys('docker', buildDockerFiles(projectName)),
  };

  for (const [relPath, content] of Object.entries(allFiles)) {
    const absPath = join(targetDir, relPath);
    await mkdir(dirname(absPath), { recursive: true });
    await writeFile(absPath, content, 'utf-8');
  }
}
