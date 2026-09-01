import { readdir, rm, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { writeStructuralSeed } from '../../scaffolding/write-structural-seed.js';

function runCommand(command: string, cwd: string): Promise<void> {
  // `spawn` com comando único (não array de args) + shell:true evita o
  // DeprecationWarning de escaping, e stdio:'inherit' é necessário — sem isso os
  // scripts de postinstall do pnpm (esbuild, aprovado no pnpm-workspace.yaml gerado)
  // quebram com "readStream must be readable" por falta de stream real.
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, { cwd, shell: true, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (exitCode, signal) => {
      if (exitCode === 0) {
        resolve();
      } else if (signal) {
        reject(new Error(`\`${command}\` foi encerrado pelo sinal ${signal}`));
      } else {
        reject(new Error(`\`${command}\` saiu com código ${String(exitCode)}`));
      }
    });
  });
}

const RESERVED_WORKSPACE_NAMES = new Set(['api', 'web', 'shared', 'db']);
const VALID_PROJECT_NAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * Restringe `projectName` a um charset seguro (letras minúsculas, dígitos, hífen) —
 * previne travessia de caminho (sem `/`, `\`, `..`), nome de pacote npm inválido, e
 * injeção em YAML/HTML gerados (docker-compose.dev.yml, index.html) que interpolam
 * o valor cru. Também recusa colisão com os nomes fixos dos pacotes do workspace
 * gerado (apps/api, apps/web, packages/shared, packages/db seriam duplicados).
 */
function validateProjectName(projectName: string): string | null {
  if (!VALID_PROJECT_NAME.test(projectName)) {
    return `Nome de projeto inválido: "${projectName}". Use letras minúsculas, números e hífen (ex.: "minha-loja"), começando e terminando com letra ou número.`;
  }
  if (RESERVED_WORKSPACE_NAMES.has(projectName)) {
    return `"${projectName}" é um nome reservado — colide com um pacote do workspace gerado (apps/api, apps/web, packages/shared ou packages/db). Escolha outro nome.`;
  }
  return null;
}

async function defaultInstallDependencies(targetDir: string): Promise<void> {
  await runCommand('pnpm install', targetDir);
}

async function defaultFormatGeneratedCode(targetDir: string): Promise<void> {
  // Deixa o Prettier (já instalado pelo install acima) ser a autoridade final de
  // formatação — mais robusto do que tentar bater byte-a-byte o estilo dele nos
  // templates escritos à mão (AC #8 passa por construção, não por ajuste manual).
  await runCommand('pnpm exec prettier --write .', targetDir);
}

async function isEmptyOrMissing(targetDir: string): Promise<boolean> {
  try {
    const entries = await readdir(targetDir);
    return entries.length === 0;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return true;
    }
    throw error;
  }
}

export interface RunNewOptions {
  /** Injetável para teste — default escreve a árvore real do Structural Seed. */
  writeSeed?: (targetDir: string, projectName: string) => Promise<void>;
  /** Injetável para teste — default roda `pnpm install` de verdade no diretório gerado. */
  installDependencies?: (targetDir: string) => Promise<void>;
  /** Injetável para teste — default roda `pnpm exec prettier --write .` no diretório gerado. */
  formatGeneratedCode?: (targetDir: string) => Promise<void>;
}

export type RunNewResult = { ok: true } | { ok: false; error: string };

/**
 * Implementa `aether-admin new <nome-projeto>` (FR-1). Sem estado parcial em nenhum
 * caminho de falha (AC #2): recusa diretório não-vazio sem escrever nada, e reverte
 * (apaga o diretório gerado) se `pnpm install` falhar.
 */
export async function runNew(
  targetDir: string,
  projectName: string,
  options: RunNewOptions = {},
): Promise<RunNewResult> {
  const nameError = validateProjectName(projectName);
  if (nameError) {
    return { ok: false, error: nameError };
  }

  const writeSeed = options.writeSeed ?? writeStructuralSeed;
  const installDependencies =
    options.installDependencies ?? defaultInstallDependencies;
  const formatGeneratedCode =
    options.formatGeneratedCode ?? defaultFormatGeneratedCode;

  if (!(await isEmptyOrMissing(targetDir))) {
    return {
      ok: false,
      error: `O diretório "${targetDir}" já existe e não está vazio. Escolha um diretório vazio ou inexistente.`,
    };
  }

  // Todo o resto (escrita do Structural Seed + install + format) fica num único
  // try/catch — antes só install/format estavam cobertos, e uma falha em
  // writeStructuralSeed (disco cheio, permissão) deixava estado parcial sem
  // reverter, violando a própria AC #2 (achado do code review).
  try {
    await mkdir(targetDir, { recursive: true });
    await writeSeed(targetDir, projectName);
    await installDependencies(targetDir);
    await formatGeneratedCode(targetDir);
  } catch (error) {
    await rm(targetDir, { recursive: true, force: true });
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Falha ao preparar o projeto: ${message}. Nenhum arquivo foi deixado no disco.`,
    };
  }

  return { ok: true };
}
