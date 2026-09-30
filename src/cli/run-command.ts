import { spawn } from 'node:child_process';

/**
 * `spawn` com comando único (não array de args) + shell:true evita o
 * DeprecationWarning de escaping, e stdio:'inherit' é necessário — sem isso os
 * scripts de postinstall do pnpm (esbuild, aprovado no pnpm-workspace.yaml gerado)
 * quebram com "readStream must be readable" por falta de stream real.
 */
export function runCommand(command: string, cwd: string): Promise<void> {
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
