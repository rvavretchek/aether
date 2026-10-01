import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  mkdtemp,
  rm,
  mkdir,
  writeFile,
  readFile,
  access,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { runMigrateMock, runCommandMock } = vi.hoisted(() => ({
  runMigrateMock: vi.fn(),
  runCommandMock: vi.fn(),
}));

vi.mock('./migrate.js', () => ({ runMigrate: runMigrateMock }));
// Mockado só pra capturar os comandos reais que `defaultFormatGeneratedCode`/
// `defaultGeneratePrismaClient` disparam quando NENHUM override é passado —
// achado do retro do Épico 3: todo outro teste deste arquivo sobrescreve as
// duas funções via `options`, então a string de comando real nunca era
// exercitada (mesmo formato de ponto cego que já causou o bug real do `prisma
// generate` ausente). Mesmo padrão de `migrate.test.ts` pro comando de migrate.
vi.mock('../run-command.js', () => ({ runCommand: runCommandMock }));

const { runGenerateModule } = await import('./generate-module.js');

const rootRouterTemplate = [
  "import { router } from './trpc.js';",
  "import { systemRouter } from './modules/system/router.js';",
  "import { authRouter } from './core/auth/router.js';",
  '',
  'export const appRouter = router({',
  '  system: systemRouter,',
  '  auth: authRouter,',
  '});',
  '',
  'export type AppRouter = typeof appRouter;',
  '',
].join('\n');

const schemaTemplate = [
  'generator client {',
  '  provider = "prisma-client-js"',
  '}',
  '',
  'model Tenant {',
  '  id String @id',
  '}',
  '',
].join('\n');

const tempDirs: string[] = [];

// Fixtures de teste não têm Prettier instalado — `formatGeneratedCode` real
// seria testado em vão aqui (a formatação real É validada na Task 9, contra um
// projeto de verdade regenerado, não nestes fixtures sintéticos).
const noopFormat = () => Promise.resolve();
// `prisma generate` de verdade exigiria um workspace pnpm real — os fixtures
// sintéticos deste arquivo não têm isso (mesmo racional de `noopFormat`); o
// comportamento real É validado contra um projeto de verdade (Task 9).
const noopGenerate = () => Promise.resolve();

async function makeFakeAetherProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'aether-generate-int-'));
  tempDirs.push(dir);
  await mkdir(join(dir, 'packages/db'), { recursive: true });
  await mkdir(join(dir, 'packages/shared/src/schemas'), { recursive: true });
  await mkdir(join(dir, 'apps/api/src'), { recursive: true });
  await writeFile(join(dir, 'packages/db/schema.prisma'), schemaTemplate);
  await writeFile(join(dir, 'apps/api/src/root-router.ts'), rootRouterTemplate);
  return dir;
}

beforeEach(() => {
  runMigrateMock.mockReset();
  runMigrateMock.mockResolvedValue({ ok: true });
  runCommandMock.mockReset();
  runCommandMock.mockResolvedValue(undefined);
});

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('runGenerateModule (integração real do default, migrate mockado)', () => {
  it('path default (sem options de formatGeneratedCode/generatePrismaClient) roda exatamente `pnpm exec prettier --write .` e `pnpm --filter db run generate` via runCommand', async () => {
    const targetDir = await makeFakeAetherProject();

    const result = await runGenerateModule(targetDir, ['pedidos']);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.results[0]).toEqual({ name: 'pedidos', ok: true });
    }
    expect(runCommandMock).toHaveBeenCalledWith(
      'pnpm exec prettier --write .',
      targetDir,
    );
    expect(runCommandMock).toHaveBeenCalledWith(
      'pnpm --filter db run generate',
      targetDir,
    );
  });

  it('gera um módulo completo: schema, shared schema, arquivos hexagonais, root-router, migration, e chama runMigrate', async () => {
    const targetDir = await makeFakeAetherProject();

    const result = await runGenerateModule(targetDir, ['pedidos'], {
      formatGeneratedCode: noopFormat,
      generatePrismaClient: noopGenerate,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.results).toEqual([{ name: 'pedidos', ok: true }]);
    }
    expect(runMigrateMock).toHaveBeenCalledWith(targetDir);

    const schema = await readFile(
      join(targetDir, 'packages/db/schema.prisma'),
      'utf-8',
    );
    expect(schema).toContain('model Pedidos {');
    expect(schema).toContain('model Tenant {'); // preservado

    const sharedSchema = await readFile(
      join(targetDir, 'packages/shared/src/schemas/pedidos.ts'),
      'utf-8',
    );
    expect(sharedSchema).toContain('pedidosCreateInputSchema');

    await expect(
      access(join(targetDir, 'apps/api/src/modules/pedidos/router.ts')),
    ).resolves.toBeUndefined();
    await expect(
      access(join(targetDir, 'apps/api/src/modules/pedidos/domain/ports.ts')),
    ).resolves.toBeUndefined();

    const rootRouter = await readFile(
      join(targetDir, 'apps/api/src/root-router.ts'),
      'utf-8',
    );
    expect(rootRouter).toContain('pedidos: pedidosRouter,');
    expect(rootRouter).toContain('system: systemRouter,'); // preservado

    const migrationFiles = await import('node:fs/promises').then((fs) =>
      fs.readdir(join(targetDir, 'packages/db/migrations')),
    );
    expect(migrationFiles).toHaveLength(1);
    expect(migrationFiles[0]).toMatch(/^\d{14}_add_pedidos_module$/);
    const migrationSql = await readFile(
      join(
        targetDir,
        'packages/db/migrations',
        migrationFiles[0],
        'migration.sql',
      ),
      'utf-8',
    );
    expect(migrationSql).toContain('CREATE TABLE "pedidos"');
    expect(migrationSql).toContain("'pedidos.list'");
  });

  it('falha explícita sem escrever nada quando o model já existe (segunda geração do mesmo nome)', async () => {
    const targetDir = await makeFakeAetherProject();
    await runGenerateModule(targetDir, ['pedidos'], {
      formatGeneratedCode: noopFormat,
      generatePrismaClient: noopGenerate,
    });
    runMigrateMock.mockClear();

    const result = await runGenerateModule(targetDir, ['pedidos'], {
      formatGeneratedCode: noopFormat,
      generatePrismaClient: noopGenerate,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.results[0]?.ok).toBe(false);
    }
    expect(runMigrateMock).not.toHaveBeenCalled();
  });

  it('propaga falha real de runMigrate sem esconder a causa, e desfaz tudo que já tinha escrito (rollback, AC #7)', async () => {
    const targetDir = await makeFakeAetherProject();
    runMigrateMock.mockResolvedValue({
      ok: false,
      error: 'Postgres inacessível',
    });

    const result = await runGenerateModule(targetDir, ['pedidos'], {
      formatGeneratedCode: noopFormat,
      generatePrismaClient: noopGenerate,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.results[0]).toEqual({
        name: 'pedidos',
        ok: false,
        error: 'Postgres inacessível',
      });
    }

    // Rollback real: nenhum vestígio do módulo fica no disco — senão o código
    // gerado fica sem o nó correspondente na árvore (viola AC #7), e uma
    // segunda tentativa ficaria bloqueada pelas checagens de colisão.
    const schemaAfter = await readFile(
      join(targetDir, 'packages/db/schema.prisma'),
      'utf-8',
    );
    expect(schemaAfter).toBe(schemaTemplate);
    const rootRouterAfter = await readFile(
      join(targetDir, 'apps/api/src/root-router.ts'),
      'utf-8',
    );
    expect(rootRouterAfter).toBe(rootRouterTemplate);
    await expect(
      access(join(targetDir, 'packages/shared/src/schemas/pedidos.ts')),
    ).rejects.toThrow();
    await expect(
      access(join(targetDir, 'apps/api/src/modules/pedidos')),
    ).rejects.toThrow();
    const migrationsDirEntries = await import('node:fs/promises').then((fs) =>
      fs.readdir(join(targetDir, 'packages/db/migrations')).catch(() => []),
    );
    expect(migrationsDirEntries).toEqual([]);
  });

  it('se `prisma generate` falhar DEPOIS de runMigrate ter sucesso, NÃO desfaz nada (banco já é a fonte da verdade) e reporta o erro com instrução de retry manual', async () => {
    const targetDir = await makeFakeAetherProject();
    const generateError = new Error('prisma generate explodiu');

    const result = await runGenerateModule(targetDir, ['pedidos'], {
      formatGeneratedCode: noopFormat,
      generatePrismaClient: () => Promise.reject(generateError),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.results[0]?.ok).toBe(false);
      if (!result.results[0]?.ok) {
        expect(result.results[0]?.error).toContain('prisma generate explodiu');
        expect(result.results[0]?.error).toContain(
          'pnpm --filter db run generate',
        );
      }
    }

    // Sem rollback: migration já aplicada de verdade (runMigrateMock resolve
    // ok por padrão no beforeEach), então desfazer o schema/arquivos locais
    // deixaria o projeto com o banco migrado mas o schema sem o model —
    // pior do que só reportar o erro.
    const schema = await readFile(
      join(targetDir, 'packages/db/schema.prisma'),
      'utf-8',
    );
    expect(schema).toContain('model Pedidos {');
    await expect(
      access(join(targetDir, 'apps/api/src/modules/pedidos/router.ts')),
    ).resolves.toBeUndefined();
  });

  it('depois de um rollback, gerar o mesmo nome de novo funciona (retry não fica bloqueado)', async () => {
    const targetDir = await makeFakeAetherProject();
    runMigrateMock.mockResolvedValueOnce({
      ok: false,
      error: 'Postgres inacessível',
    });
    await runGenerateModule(targetDir, ['pedidos'], {
      formatGeneratedCode: noopFormat,
      generatePrismaClient: noopGenerate,
    });

    runMigrateMock.mockResolvedValueOnce({ ok: true });
    const retryResult = await runGenerateModule(targetDir, ['pedidos'], {
      formatGeneratedCode: noopFormat,
      generatePrismaClient: noopGenerate,
    });

    expect(retryResult.ok).toBe(true);
    if (retryResult.ok) {
      expect(retryResult.results[0]).toEqual({ name: 'pedidos', ok: true });
    }
  });

  it('erro inesperado (não só falha de runMigrate) também é capturado com clareza, sem crashar o processo', async () => {
    const targetDir = await makeFakeAetherProject();
    // Remove root-router.ts pra forçar um ENOENT real, não previsto pelas
    // checagens de colisão normais.
    await rm(join(targetDir, 'apps/api/src/root-router.ts'));

    const result = await runGenerateModule(targetDir, ['pedidos'], {
      formatGeneratedCode: noopFormat,
      generatePrismaClient: noopGenerate,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.results[0]?.ok).toBe(false);
      if (!result.results[0]?.ok) {
        expect(result.results[0]?.error).toBeTruthy();
      }
    }
  });

  it('dois nomes numa chamada: root-router.ts acaba com os dois montados', async () => {
    const targetDir = await makeFakeAetherProject();

    const result = await runGenerateModule(
      targetDir,
      ['pedidos', 'comercial'],
      {
        formatGeneratedCode: noopFormat,
        generatePrismaClient: noopGenerate,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.results).toEqual([
        { name: 'pedidos', ok: true },
        { name: 'comercial', ok: true },
      ]);
    }
    const rootRouter = await readFile(
      join(targetDir, 'apps/api/src/root-router.ts'),
      'utf-8',
    );
    expect(rootRouter).toContain('pedidos: pedidosRouter,');
    expect(rootRouter).toContain('comercial: comercialRouter,');
  });

  it('múltiplos nomes, um duplicado na mesma chamada: o primeiro sucede, o segundo colide de verdade (model já existe) — o primeiro permanece gerado', async () => {
    const targetDir = await makeFakeAetherProject();

    const result = await runGenerateModule(targetDir, ['pedidos', 'pedidos'], {
      formatGeneratedCode: noopFormat,
      generatePrismaClient: noopGenerate,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.results[0]).toEqual({ name: 'pedidos', ok: true });
      expect(result.results[1]?.ok).toBe(false);
    }
    // O primeiro continua gerado — nenhum rollback cross-módulo (Dev Notes).
    await expect(
      access(join(targetDir, 'apps/api/src/modules/pedidos/router.ts')),
    ).resolves.toBeUndefined();
  });
});
