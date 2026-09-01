#!/usr/bin/env node
// tsx precisa ser carregado via `node --import tsx/esm` — registrar via `module.register()`
// dentro de um processo já rodando não inicializa corretamente (limitação conhecida do tsx).
// Sem passo de build no MVP (AD-9), então este shim reexecuta com o flag certo, herdando o
// cwd de quem chamou (importante: `aether-admin new` cria o projeto relativo a esse cwd, não
// ao diretório do pacote `aether-admin`).
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const runEntry = join(here, '..', 'src', 'cli', 'run.ts');
// `--import tsx/esm` resolveria o especificador relativo ao cwd de quem chama o comando —
// resolvemos o caminho absoluto do próprio node_modules deste pacote pra não depender de onde
// `aether-admin` é invocado.
const tsxEsmLoader = pathToFileURL(
  join(here, '..', 'node_modules', 'tsx', 'dist', 'esm', 'index.mjs'),
).href;

const result = spawnSync(
  process.execPath,
  ['--import', tsxEsmLoader, runEntry, ...process.argv.slice(2)],
  {
    stdio: 'inherit',
  },
);

// `result.error` é populado quando o processo filho nem consegue iniciar (ex.:
// node.exe não encontrado, EPERM) — sem checar isso, uma falha de spawn vira um
// exit code 1 mudo, sem nenhum diagnóstico pro usuário (achado do code review).
if (result.error) {
  console.error(
    `aether-admin: falha ao iniciar o processo Node: ${result.error.message}`,
  );
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
