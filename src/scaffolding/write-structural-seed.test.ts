import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeStructuralSeed } from './write-structural-seed.js';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'aether-seed-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('writeStructuralSeed', () => {
  it('writes every file of the Structural Seed tree for this story scope', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-app');

    const expectedFiles = [
      'pnpm-workspace.yaml',
      'package.json',
      'tsconfig.json',
      'tsconfig.base.json',
      'eslint.config.js',
      '.prettierrc',
      '.prettierignore',
      '.env.development',
      '.gitignore',
      '.nvmrc',
      'vitest.config.ts',
      'vitest.shared.ts',
      'apps/web/package.json',
      'apps/web/tsconfig.json',
      'apps/web/vitest.config.ts',
      'apps/web/vite.config.ts',
      'apps/web/index.html',
      'apps/web/src/routes/home.ts',
      'apps/web/src/routes/home-page.tsx',
      'apps/web/src/main.tsx',
      'apps/web/src/trpc/client.ts',
      'apps/api/package.json',
      'apps/api/tsconfig.json',
      'apps/api/vitest.config.ts',
      'apps/api/src/trpc.ts',
      'apps/api/src/trpc.test.ts',
      'apps/api/src/traceparent.ts',
      'apps/api/src/traceparent.test.ts',
      'apps/api/src/server.ts',
      'apps/api/src/root-router.ts',
      'apps/api/src/context.ts',
      'apps/api/src/modules/system/router.ts',
      'apps/api/src/modules/system/router.test.ts',
      'apps/api/src/modules/system/repository.ts',
      'apps/api/src/modules/system/schema.ts',
      'apps/api/src/modules/system/resources.ts',
      'packages/shared/package.json',
      'packages/shared/tsconfig.json',
      'packages/shared/vitest.config.ts',
      'packages/shared/src/schemas/system.ts',
      'packages/db/package.json',
      'packages/db/tsconfig.json',
      'packages/db/schema.prisma',
      'packages/db/prisma.config.ts',
      'docker/docker-compose.dev.yml',
      'docker/Dockerfile.dev',
    ];

    for (const relPath of expectedFiles) {
      await expect(
        access(join(targetDir, relPath)),
        `expected ${relPath} to exist`,
      ).resolves.toBeUndefined();
    }
  });

  it('creates the domain/ folder for the system module (Hexagonal shape, AD-1)', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-app');

    // domain/ has no fixed filename mandated yet (no business logic in this story) —
    // it must exist as a directory so future stories/generate module can drop files into it.
    const domainMarker = join(
      targetDir,
      'apps/api/src/modules/system/domain/.gitkeep',
    );
    await expect(access(domainMarker)).resolves.toBeUndefined();
  });

  it('substitutes the project name into pnpm-workspace root package.json', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-cool-app');

    const rootPkg = JSON.parse(
      await readFile(join(targetDir, 'package.json'), 'utf-8'),
    ) as { name: string };
    expect(rootPkg.name).toBe('my-cool-app');
  });

  it('router.ts for the system module does NOT wire requireResource (AC #6 — enforcement deferred to Epic 3)', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-app');

    const routerSource = await readFile(
      join(targetDir, 'apps/api/src/modules/system/router.ts'),
      'utf-8',
    );
    const codeOnly = routerSource
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(codeOnly).not.toMatch(/\.use\(\s*requireResource/);
    expect(routerSource).toContain('TODO(Epic 3)');
  });

  it('packages/db/schema.prisma has no model block (no real DB tables in this story)', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-app');

    const schema = await readFile(
      join(targetDir, 'packages/db/schema.prisma'),
      'utf-8',
    );
    expect(schema).not.toMatch(/\bmodel\s+\w+\s*\{/);
    expect(schema).toContain('generator');
    expect(schema).toContain('datasource');
  });

  it('pre-approves the esbuild build script in pnpm-workspace.yaml — otherwise `pnpm install` fails with ERR_PNPM_IGNORED_BUILDS on pnpm 11 (verified against a real install)', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-app');

    const workspaceYaml = await readFile(
      join(targetDir, 'pnpm-workspace.yaml'),
      'utf-8',
    );
    expect(workspaceYaml).toContain('esbuild');
    expect(workspaceYaml).toMatch(/onlyBuiltDependencies:/);
  });

  it('does not install prisma/@prisma/client/@prisma/adapter-pg yet (no model exists — verified against a real pnpm install that otherwise crashes on the prisma preinstall script in this environment)', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-app');

    const dbPkg = JSON.parse(
      await readFile(join(targetDir, 'packages/db/package.json'), 'utf-8'),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = { ...dbPkg.dependencies, ...dbPkg.devDependencies };
    expect(Object.keys(allDeps)).not.toContain('prisma');
    expect(Object.keys(allDeps)).not.toContain('@prisma/client');
    expect(Object.keys(allDeps)).not.toContain('@prisma/adapter-pg');
  });

  it('does not import @prisma/client or @trpc/* in domain/ (AD-1) — nothing to check yet since domain/ is empty, but repository.ts must not query Prisma', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-app');

    const repositorySource = await readFile(
      join(targetDir, 'apps/api/src/modules/system/repository.ts'),
      'utf-8',
    );
    expect(repositorySource).not.toMatch(/from ['"]@prisma\/client['"]/);
  });
});
