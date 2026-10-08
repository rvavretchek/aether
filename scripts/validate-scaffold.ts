/**
 * Harness reutilizável de validação pós-geração (Story 5.9).
 *
 * Roda `aether-admin new` → (opcional) `aether-admin migrate` → `typecheck` →
 * `lint` → `format:check` → `test` contra um projeto gerado de verdade, sempre
 * via o entrypoint público real da CLI (`bin/aether-admin.js`, nunca os
 * módulos internos de `src/cli/`). Todas as etapas rodam até o fim mesmo que
 * uma falhe — o resumo final mostra o que passou/falhou/foi pulado, com a
 * saída completa capturada de qualquer etapa que tenha falhado.
 *
 * Uso: `tsx scripts/validate-scaffold.ts [--dir <caminho>] [--database-url <url>] [--keep]`
 * (ou `pnpm validate:scaffold -- --dir ...`).
 */
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const MAX_BUFFER_BYTES = 64 * 1024 * 1024;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const binPath = join(repoRoot, 'bin', 'aether-admin.js');

/**
 * Variáveis que ferramentas que podem estar invocando este próprio script
 * (Vitest, `pnpm exec`, outro `npm`/`pnpm` lifecycle já em andamento) deixam
 * no ambiente — nunca variáveis do sistema/usuário (PATH, HOME, TEMP, etc.).
 * Achado real durante a implementação: rodar este harness de dentro de
 * `pnpm exec vitest run` (em vez de um shell comum) reproduzia, de forma
 * determinística, uma falha de typecheck no projeto gerado (`TS2339` em
 * `apps/api/src/core/auth/router.ts`, augmentations de tipo do
 * `@fastify/cookie` "ausentes") nunca observada rodando a mesma sequência
 * via `tsx scripts/validate-scaffold.ts` direto num terminal comum — a
 * causa raiz exata entre essas variáveis não foi isolada (nenhuma sozinha
 * reproduziu o problema padrão), mas o ponto arquitetural é o mesmo
 * independentemente da causa exata: esta é uma ferramenta que existe para
 * provar o que um usuário comum, num terminal comum, obtém rodando
 * `aether-admin new` — ela nunca deveria herdar, sem filtro, o estado
 * ambiental de QUALQUER processo que por acaso esteja rodando-a (Vitest,
 * CI, outro gerenciador de pacote já em andamento). Os processos filhos
 * (scaffold/migrate/typecheck/lint/format:check/test) sempre rodam contra
 * um ambiente saneado, nunca `process.env` bruto.
 */
const ENV_KEYS_TO_STRIP = [
  'NODE_ENV',
  'NODE_OPTIONS',
  'NODE_PATH',
  'VITEST',
  'VITEST_MODE',
  'VITEST_POOL_ID',
  'VITEST_WORKER_ID',
  'MODE',
  'TEST',
  'DEV',
  'PROD',
  'SSR',
  'BASE_URL',
];
const ENV_KEY_PREFIXES_TO_STRIP = ['npm_', 'NPM_', 'PNPM_', 'VITE_'];
// `PNPM_HOME` é a localização real do próprio pnpm/corepack (precisa
// sobreviver ao saneamento) — só o prefixo `PNPM_` de variáveis de
// lifecycle/config é removido, nunca essa.
const ENV_KEYS_TO_KEEP_DESPITE_PREFIX = new Set(['PNPM_HOME']);

function sanitizeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const sanitized: NodeJS.ProcessEnv = { ...env };
  for (const key of Object.keys(sanitized)) {
    if (ENV_KEYS_TO_KEEP_DESPITE_PREFIX.has(key)) continue;
    const stripByName = ENV_KEYS_TO_STRIP.includes(key);
    const stripByPrefix = ENV_KEY_PREFIXES_TO_STRIP.some((prefix) =>
      key.startsWith(prefix),
    );
    if (stripByName || stripByPrefix) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

export type StepStatus = 'pass' | 'fail' | 'skip';

export interface StepResult {
  name: string;
  status: StepStatus;
  output: string;
  durationMs: number;
}

export interface ValidateScaffoldOptions {
  /** Diretório onde o projeto será gerado. Default: um diretório descartável sob `os.tmpdir()`. */
  dir?: string;
  /** Se fornecida, roda `aether-admin migrate` e habilita os testes `DATABASE_URL`-gated. */
  databaseUrl?: string;
  /** Mantém o diretório gerado mesmo em caso de sucesso completo. */
  keep?: boolean;
}

export interface ValidateScaffoldResult {
  ok: boolean;
  dir: string;
  steps: StepResult[];
  /** Verdadeiro quando o diretório gerado foi preservado (falha, ou sucesso com `--keep`). */
  kept: boolean;
}

function defaultTargetDir(): string {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return join(tmpdir(), `aether-scaffold-validation-${unique}`);
}

function toOutput(result: SpawnSyncReturns<string>): string {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

/**
 * Roda o entrypoint real da CLI (`node bin/aether-admin.js <args...>`) via
 * `spawnSync` — array de args, sem shell, para nunca depender de quoting.
 * Nunca lança: uma falha de spawn (`result.error`, ex.: ENOENT) vira um
 * resultado `fail` com a mensagem do erro, como qualquer outra falha.
 */
function runCliStep(
  name: string,
  cliArgs: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): StepResult {
  const start = Date.now();
  const result = spawnSync(process.execPath, [binPath, ...cliArgs], {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER_BYTES,
  });
  const durationMs = Date.now() - start;

  if (result.error) {
    return {
      name,
      status: 'fail',
      output: `${result.error.name}: ${result.error.message}`,
      durationMs,
    };
  }

  return {
    name,
    status: result.status === 0 ? 'pass' : 'fail',
    output: toOutput(result),
    durationMs,
  };
}

/**
 * Roda um script `pnpm` (`pnpm run <script>`) dentro do projeto gerado.
 * Comando único + `shell: true` — mesmo padrão de `src/cli/run-command.ts`
 * (necessário no Windows para os shims `.cmd`/`.ps1` do pnpm).
 */
function runPnpmScriptStep(
  scriptName: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
): StepResult {
  const start = Date.now();
  const result = spawnSync(`pnpm run ${scriptName}`, {
    cwd,
    env,
    shell: true,
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER_BYTES,
  });
  const durationMs = Date.now() - start;

  if (result.error) {
    return {
      name: scriptName,
      status: 'fail',
      output: `${result.error.name}: ${result.error.message}`,
      durationMs,
    };
  }

  return {
    name: scriptName,
    status: result.status === 0 ? 'pass' : 'fail',
    output: toOutput(result),
    durationMs,
  };
}

function skippedStep(name: string, reason: string): StepResult {
  return { name, status: 'skip', output: reason, durationMs: 0 };
}

/**
 * Executa a sequência completa de validação. Pura função síncrona (todo o
 * trabalho real é feito por `spawnSync`) — nunca para na primeira falha: as 6
 * etapas sempre rodam, independentemente do resultado das anteriores.
 */
export function validateScaffold(
  options: ValidateScaffoldOptions = {},
): ValidateScaffoldResult {
  const targetDir = resolve(options.dir ?? defaultTargetDir());
  const parentDir = dirname(targetDir);
  const projectName = basename(targetDir);
  const keep = options.keep ?? false;
  const databaseUrl = options.databaseUrl;

  const env: NodeJS.ProcessEnv = sanitizeEnv(
    databaseUrl ? { ...process.env, DATABASE_URL: databaseUrl } : process.env,
  );

  // O diretório-pai precisa existir ANTES do `spawnSync` poder nem iniciar o
  // processo filho — responsabilidade do harness, não do gerador (que só cria
  // o diretório-ALVO em si). Puramente filesystem local, nunca banco/Docker.
  mkdirSync(parentDir, { recursive: true });

  const steps: StepResult[] = [];

  console.log(`> rodando: scaffold (aether-admin new ${projectName})...`);
  const scaffoldStep = runCliStep(
    'scaffold (aether-admin new)',
    ['new', projectName],
    parentDir,
    env,
  );
  steps.push(scaffoldStep);
  console.log(
    `  ${scaffoldStep.status.toUpperCase()} (${scaffoldStep.durationMs}ms)`,
  );

  if (databaseUrl) {
    console.log('> rodando: migrate (aether-admin migrate)...');
    const migrateStep = runCliStep(
      'migrate (aether-admin migrate)',
      ['migrate'],
      targetDir,
      env,
    );
    steps.push(migrateStep);
    console.log(
      `  ${migrateStep.status.toUpperCase()} (${migrateStep.durationMs}ms)`,
    );
  } else {
    steps.push(
      skippedStep(
        'migrate (aether-admin migrate)',
        'Pulado: nenhum --database-url fornecido.',
      ),
    );
    console.log('> pulando: migrate (nenhum --database-url fornecido)');
  }

  for (const scriptName of ['typecheck', 'lint', 'format:check', 'test']) {
    console.log(`> rodando: ${scriptName}...`);
    const step = runPnpmScriptStep(scriptName, targetDir, env);
    steps.push(step);
    console.log(`  ${step.status.toUpperCase()} (${step.durationMs}ms)`);
  }

  const ok = steps.every((step) => step.status !== 'fail');

  let kept: boolean;
  if (ok && !keep) {
    rmSync(targetDir, { recursive: true, force: true });
    kept = false;
  } else {
    kept = true;
  }

  return { ok, dir: targetDir, steps, kept };
}

function formatStatus(status: StepStatus): string {
  if (status === 'pass') return 'PASS';
  if (status === 'fail') return 'FAIL';
  return 'SKIP';
}

function printSummary(result: ValidateScaffoldResult): void {
  console.log('');
  console.log('Resumo da validação:');
  for (const step of result.steps) {
    console.log(
      `  ${formatStatus(step.status).padEnd(4)}  ${step.name}  (${step.durationMs}ms)`,
    );
  }

  const failedSteps = result.steps.filter((step) => step.status === 'fail');
  for (const step of failedSteps) {
    console.log('');
    console.log(`--- Saída completa: ${step.name} ---`);
    console.log(step.output);
    console.log(`--- Fim da saída: ${step.name} ---`);
  }

  console.log('');
  console.log(`Diretório: ${result.dir}`);
  console.log(
    result.kept
      ? 'Diretório preservado (falha, ou --keep).'
      : 'Diretório removido (sucesso completo, sem --keep).',
  );
  console.log(result.ok ? 'Validação: PASSOU' : 'Validação: FALHOU');
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isMainModule()) {
  const { values } = parseArgs({
    options: {
      dir: { type: 'string' },
      'database-url': { type: 'string' },
      keep: { type: 'boolean', default: false },
    },
    strict: true,
    allowPositionals: false,
  });

  const result = validateScaffold({
    dir: values.dir,
    databaseUrl: values['database-url'],
    keep: values.keep,
  });

  printSummary(result);
  process.exitCode = result.ok ? 0 : 1;
}
