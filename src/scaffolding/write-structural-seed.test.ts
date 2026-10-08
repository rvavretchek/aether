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
      'apps/api/src/test-utils.ts',
      'apps/api/src/core/providers.ts',
      'apps/api/src/modules/system/router.ts',
      'apps/api/src/modules/system/router.test.ts',
      'apps/api/src/modules/system/repository.ts',
      'apps/api/src/modules/system/schema.ts',
      'apps/api/src/modules/system/resources.ts',
      'apps/api/src/core/secrets/secrets-provider.ts',
      'apps/api/src/core/secrets/env-secrets-provider.ts',
      'apps/api/src/core/secrets/env-secrets-provider.test.ts',
      'apps/api/src/core/auth/auth-provider.ts',
      'apps/api/src/core/auth/user-lookup.ts',
      'apps/api/src/core/auth/argon2-auth-provider.ts',
      'apps/api/src/core/auth/argon2-auth-provider.test.ts',
      'apps/api/src/core/auth/token-revocation-store.ts',
      'apps/api/src/core/auth/refresh-token-store.ts',
      'apps/api/src/core/auth/prisma-token-revocation-store.ts',
      'apps/api/src/core/auth/prisma-token-revocation-store.test.ts',
      'apps/api/src/core/auth/router.ts',
      'apps/api/src/core/auth/router.test.ts',
      'apps/api/src/core/auth/rate-limiter.ts',
      'apps/api/src/core/auth/rate-limit-store.ts',
      'apps/api/src/core/auth/prisma-rate-limiter.ts',
      'apps/api/src/core/auth/prisma-rate-limiter.test.ts',
      'apps/api/src/core/notifications/email-provider.ts',
      'apps/api/src/core/notifications/smtp-email-provider.ts',
      'apps/api/src/core/notifications/smtp-email-provider.test.ts',
      'apps/api/src/core/admin/require-admin.ts',
      'apps/api/src/core/admin/require-admin.test.ts',
      'apps/api/src/core/admin/prisma-errors.ts',
      'apps/api/src/core/admin/users.router.ts',
      'apps/api/src/core/admin/users.router.test.ts',
      'apps/api/src/core/admin/groups.router.ts',
      'apps/api/src/core/admin/groups.router.test.ts',
      'apps/api/src/core/admin/roles.router.ts',
      'apps/api/src/core/admin/roles.router.test.ts',
      'apps/api/src/core/admin/role-assignments.router.ts',
      'apps/api/src/core/admin/role-assignments.router.test.ts',
      'apps/api/src/core/admin/admin-test-helpers.ts',
      'apps/api/src/core/admin/router.ts',
      'packages/shared/src/schemas/auth.ts',
      'packages/shared/src/schemas/admin.ts',
      'packages/shared/package.json',
      'packages/shared/tsconfig.json',
      'packages/shared/vitest.config.ts',
      'packages/shared/src/schemas/system.ts',
      'packages/db/package.json',
      'packages/db/tsconfig.json',
      'packages/db/schema.prisma',
      'packages/db/prisma.config.ts',
      'packages/db/src/client.ts',
      'packages/db/migrations/migration_lock.toml',
      'packages/db/migrations/20260901000000_init_auth/migration.sql',
      'packages/db/migrations/20260902000000_add_rate_limit_hit/migration.sql',
      'packages/db/migrations/20260904000000_add_identity_tree/migration.sql',
      'packages/db/migrations/20261002000000_add_password_reset_token/migration.sql',
      'packages/db/migrations/20261002000100_add_user_is_admin/migration.sql',
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

  it('packages/db/schema.prisma has Tenant/User/RefreshToken models, scoped by Tenant (Story 2.1, AC #5/#7)', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-app');

    const schema = await readFile(
      join(targetDir, 'packages/db/schema.prisma'),
      'utf-8',
    );
    expect(schema).toContain('generator');
    expect(schema).toContain('datasource');
    expect(schema).toMatch(/model\s+Tenant\s*\{/);
    expect(schema).toMatch(/model\s+User\s*\{/);
    expect(schema).toMatch(/model\s+RefreshToken\s*\{/);
    expect(schema).toContain('tenantId');
  });

  it('packages/db/schema.prisma has RateLimitHit, physically separate from RefreshToken (Story 2.2, AD-10)', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-app');

    const schema = await readFile(
      join(targetDir, 'packages/db/schema.prisma'),
      'utf-8',
    );
    expect(schema).toMatch(/model\s+RateLimitHit\s*\{/);
    expect(schema).toContain('@@unique([identifier, windowStart])');
  });

  it('packages/db/schema.prisma has the identity tree models — Group/Role/Module/ModuleClosure/Resource/RoleAssignment (Story 3.1, FR-11/12/13/27)', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-app');

    const schema = await readFile(
      join(targetDir, 'packages/db/schema.prisma'),
      'utf-8',
    );
    expect(schema).toMatch(/model\s+Group\s*\{/);
    expect(schema).toMatch(/model\s+Role\s*\{/);
    expect(schema).toMatch(/model\s+Module\s*\{/);
    expect(schema).toMatch(/model\s+ModuleClosure\s*\{/);
    expect(schema).toMatch(/model\s+Resource\s*\{/);
    expect(schema).toMatch(/model\s+RoleAssignment\s*\{/);
    // append-only (AD-6): unique em (ancestorId, descendantId), depth obrigatório
    expect(schema).toContain('@@unique([ancestorId, descendantId])');
    expect(schema).toContain('depth        Int');
    // Resource.name único globalmente (AD-7) — não escopado por tenant
    expect(schema).toContain('name     String       @unique');
  });

  it('packages/db/schema.prisma has PasswordResetToken, unique token_hash, nullable used_at (Story 4.2, FR-19/FR-9)', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-app');

    const schema = await readFile(
      join(targetDir, 'packages/db/schema.prisma'),
      'utf-8',
    );
    expect(schema).toMatch(/model\s+PasswordResetToken\s*\{/);
    expect(schema).toContain('tokenHash String    @unique @map("token_hash")');
    expect(schema).toContain('usedAt    DateTime? @map("used_at")');
  });

  it('packages/db/schema.prisma has User.isAdmin, default false (Story 5.1, FR-14)', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-app');

    const schema = await readFile(
      join(targetDir, 'packages/db/schema.prisma'),
      'utf-8',
    );
    expect(schema).toContain(
      'isAdmin      Boolean  @default(false) @map("is_admin")',
    );
  });

  it('apps/api/src/root-router.ts actually wires adminRouter (Story 5.1, AC #4/#5/#6 — achado do code review: só existência era checada antes)', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-app');

    const routerSource = await readFile(
      join(targetDir, 'apps/api/src/root-router.ts'),
      'utf-8',
    );
    expect(routerSource).toContain(
      "import { adminRouter } from './core/admin/router.js';",
    );
    expect(routerSource).toContain('admin: adminRouter,');
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

  it('installs prisma/@prisma/client/@prisma/adapter-pg for real now that Tenant/User exist (Story 2.1) and denies only the crashing prisma preinstall script', async () => {
    const targetDir = await makeTempDir();

    await writeStructuralSeed(targetDir, 'my-app');

    const dbPkg = JSON.parse(
      await readFile(join(targetDir, 'packages/db/package.json'), 'utf-8'),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = { ...dbPkg.dependencies, ...dbPkg.devDependencies };
    expect(Object.keys(allDeps)).toContain('prisma');
    expect(Object.keys(allDeps)).toContain('@prisma/client');
    expect(Object.keys(allDeps)).toContain('@prisma/adapter-pg');

    const workspaceYaml = await readFile(
      join(targetDir, 'pnpm-workspace.yaml'),
      'utf-8',
    );
    // @prisma/engines precisa rodar (baixa o binário do schema engine); o preinstall do
    // pacote `prisma` em si é negado explicitamente (readStream must be readable — bug
    // reproduzido isolado neste ambiente, ver comentário no template de root.ts).
    expect(workspaceYaml).toMatch(/@prisma\/engines['"]?:\s*true/);
    expect(workspaceYaml).toMatch(/prisma:\s*false/);
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
