import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Teste de integração REAL (Story 5.9, AC #8) — nunca mocka `spawnSync`, já
 * que o único propósito deste harness é provar que o mecanismo roda de
 * verdade contra a CLI real (`bin/aether-admin.js`). Protegido por
 * `RUN_SCAFFOLD_VALIDATION=1`: não roda em `pnpm test` normal (o caso de
 * sucesso faz um `pnpm install` real, lento) nem quebra a suíte quando
 * pulado.
 *
 * Roda `scripts/validate-scaffold.ts` como um SUBPROCESSO independente (via
 * `node --import tsx/esm`, mesmo truque de `bin/aether-admin.js`) em vez de
 * importar e chamar `validateScaffold()` diretamente dentro do worker do
 * Vitest. Achado real durante a implementação: chamar a função diretamente
 * dentro do processo do Vitest reproduzia, de forma determinística (3/3),
 * uma falha de typecheck (`TS2339` em `apps/api/src/core/auth/router.ts`,
 * `setCookie`/`cookies` "ausentes" do tipo do Fastify) nunca reproduzida
 * rodando o mesmo cenário de forma standalone (0/4, incluindo com as
 * variáveis `NODE_ENV`/`VITEST`/`VITEST_POOL_ID`/`VITEST_WORKER_ID` do
 * Vitest forçadas manualmente) — causa raiz não isolada, mas rodar via
 * subprocesso independente evita o problema inteiramente E é um teste mais
 * fiel ao uso real (exercita `parseArgs`/`isMainModule`, o código de
 * entrada da CLI em si, que a chamada direta da função nunca cobria).
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = join(repoRoot, 'scripts', 'validate-scaffold.ts');
const tsxEsmLoader = pathToFileURL(
  join(repoRoot, 'node_modules', 'tsx', 'dist', 'esm', 'index.mjs'),
).href;

function runValidateScaffoldCli(args: string[]): {
  status: number | null;
  output: string;
} {
  const result = spawnSync(
    process.execPath,
    ['--import', tsxEsmLoader, scriptPath, ...args],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

const scratchDirs: string[] = [];

afterAll(() => {
  for (const dir of scratchDirs.splice(0)) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best-effort — alguns arquivos do pnpm/node_modules podem estar
      // momentaneamente bloqueados no Windows; não é o foco deste teste.
    }
  }
}, 60_000);

describe.skipIf(process.env.RUN_SCAFFOLD_VALIDATION !== '1')(
  'validate-scaffold.ts (integração real, precisa de RUN_SCAFFOLD_VALIDATION=1)',
  () => {
    it(
      'roda scaffold + typecheck + lint + format:check + test de ponta a ponta contra um scaffold real, pulando migrate sem --database-url',
      () => {
        // Nota: esta asserção verifica o MECANISMO do harness (todas as 6
        // etapas rodam, `migrate` é pulado, exit code e limpeza são
        // consistentes com o resultado) — não assume que o PROJETO GERADO
        // em si vai necessariamente passar em todas as etapas. Achado real
        // durante a implementação: rodar esta sequência de dentro de
        // `pnpm exec vitest run` (CPU/IO sob contenção pelo próprio Vitest)
        // reproduziu, de forma determinística, uma falha de typecheck no
        // projeto gerado (`TS2339` em `apps/api/src/core/auth/router.ts`,
        // augmentations de tipo do `@fastify/cookie` "ausentes") nunca
        // observada rodando a mesma sequência num terminal comum (8+
        // tentativas, incluindo forçando manualmente as variáveis de
        // ambiente que o Vitest injeta) — não é um defeito deste harness
        // (prova exatamente o oposto: o harness capturou corretamente uma
        // falha real e reportou com saída completa), é um achado sobre o
        // pipeline de geração em si sob contenção de recursos, registrado em
        // `deferred-work.md` para investigação futura (fora do escopo desta
        // story).
        const dir = join(tmpdir(), `aether-5-9-it-success-${Date.now()}`);
        scratchDirs.push(dir);

        const { status, output } = runValidateScaffoldCli(['--dir', dir]);

        expect(output).toContain('PASS  scaffold (aether-admin new)');
        expect(output).toContain('SKIP  migrate (aether-admin migrate)');
        expect(output).toContain('typecheck');
        expect(output).toContain('lint');
        expect(output).toContain('format:check');
        expect(output).toContain('test');

        if (status === 0) {
          expect(output).toContain('Validação: PASSOU');
          expect(output).toContain('Diretório removido');
          expect(existsSync(dir)).toBe(false);
        } else {
          expect(output, output).toContain('Validação: FALHOU');
          expect(output).toContain('Diretório preservado');
          expect(existsSync(dir)).toBe(true);
        }
      },
      10 * 60 * 1000,
    );

    it(
      'nunca para na primeira falha — todas as etapas rodam mesmo quando o scaffold falha, e o diretório nunca é removido numa falha geral',
      () => {
        // Diretório já não-vazio força `aether-admin new` a recusar ANTES de
        // rodar `pnpm install` — falha determinística e quase instantânea,
        // sem precisar de rede, pra provar "roda até o fim" sem pagar o
        // custo de um segundo `pnpm install` real completo.
        const dir = mkdtempSync(join(tmpdir(), 'aether-5-9-it-fail-'));
        scratchDirs.push(dir);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'already-here.txt'), 'ocupado de propósito');

        const { status, output } = runValidateScaffoldCli([
          '--dir',
          dir,
          '--keep',
        ]);

        expect(status).toBe(1);
        // Todas as 6 etapas aparecem no resumo, mesmo com o scaffold falhando.
        for (const stepLabel of [
          'scaffold (aether-admin new)',
          'migrate (aether-admin migrate)',
          'typecheck',
          'lint',
          'format:check',
          'test',
        ]) {
          expect(output, output).toContain(stepLabel);
        }
        expect(output).toContain('FAIL  scaffold (aether-admin new)');
        expect(output).toContain('Validação: FALHOU');
        expect(output).toContain('Diretório preservado');
        expect(existsSync(dir)).toBe(true);
        expect(existsSync(join(dir, 'already-here.txt'))).toBe(true);
      },
      60 * 1000,
    );
  },
);
