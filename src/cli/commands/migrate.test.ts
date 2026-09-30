import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runMigrate } from './migrate.js';
import { runCommand } from '../run-command.js';

// `access` mockado (chamando através pro real por padrão) só pra poder simular,
// num único teste, uma falha que NÃO é ENOENT (ex.: EACCES) — sem isso não dá
// pra distinguir "erro real de permissão" de "arquivo ausente" de forma confiável
// entre plataformas (achado do code review).
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, access: vi.fn(actual.access) };
});

// `runCommand` mockado pra poder verificar, sem rodar Prisma de verdade, o
// comando EXATO que `defaultRunMigrateDeploy` (o path real de produção, usado
// quando `runMigrate` é chamado sem `options`) de fato dispara — sem isso nada
// protege contra um typo silencioso trocando `exec ... deploy` por `run migrate`
// (que rodaria `prisma migrate dev`, errado — achado do code review).
vi.mock('../run-command.js', () => ({ runCommand: vi.fn() }));

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'aether-migrate-'));
  tempDirs.push(dir);
  return dir;
}

async function makeFakeAetherProject(): Promise<string> {
  const dir = await makeTempDir();
  await mkdir(join(dir, 'packages/db'), { recursive: true });
  await writeFile(join(dir, 'packages/db/schema.prisma'), '// fake schema\n');
  return dir;
}

afterEach(async () => {
  vi.mocked(access).mockClear();
  vi.mocked(runCommand).mockClear();
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('runMigrate', () => {
  it('falha sem rodar nada quando packages/db/schema.prisma não existe (não é um projeto Aether)', async () => {
    const targetDir = await makeTempDir();
    const runMigrateDeploy = vi.fn().mockResolvedValue(undefined);

    const result = await runMigrate(targetDir, { runMigrateDeploy });

    expect(result.ok).toBe(false);
    expect(runMigrateDeploy).not.toHaveBeenCalled();
    if (!result.ok) {
      expect(result.error).toMatch(/projeto Aether/i);
    }
  });

  it('propaga a causa real quando access() falha por um motivo que não é "arquivo ausente" (ex.: permissão)', async () => {
    const targetDir = await makeFakeAetherProject();
    const runMigrateDeploy = vi.fn().mockResolvedValue(undefined);
    const permissionError = Object.assign(
      new Error('EACCES: permission denied'),
      {
        code: 'EACCES',
      },
    );
    vi.mocked(access).mockRejectedValueOnce(permissionError);

    const result = await runMigrate(targetDir, { runMigrateDeploy });

    expect(result.ok).toBe(false);
    expect(runMigrateDeploy).not.toHaveBeenCalled();
    if (!result.ok) {
      expect(result.error).not.toMatch(/projeto Aether/i);
      expect(result.error).toContain('EACCES: permission denied');
    }
  });

  it('roda runMigrateDeploy com o targetDir e retorna ok quando o projeto é válido', async () => {
    const targetDir = await makeFakeAetherProject();
    const runMigrateDeploy = vi.fn().mockResolvedValue(undefined);

    const result = await runMigrate(targetDir, { runMigrateDeploy });

    expect(result).toEqual({ ok: true });
    expect(runMigrateDeploy).toHaveBeenCalledWith(targetDir);
  });

  it('propaga o erro real quando runMigrateDeploy rejeita, sem esconder a causa', async () => {
    const targetDir = await makeFakeAetherProject();
    const runMigrateDeploy = vi
      .fn()
      .mockRejectedValue(
        new Error('`prisma migrate deploy` saiu com código 1'),
      );

    const result = await runMigrate(targetDir, { runMigrateDeploy });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(
        'prisma migrate deploy` saiu com código 1',
      );
    }
  });

  it('path default (sem options) roda exatamente `pnpm --filter db exec prisma migrate deploy` via runCommand — não `run migrate` (que seria `prisma migrate dev`, errado)', async () => {
    const targetDir = await makeFakeAetherProject();
    vi.mocked(runCommand).mockResolvedValue(undefined);

    const result = await runMigrate(targetDir);

    expect(result).toEqual({ ok: true });
    expect(runCommand).toHaveBeenCalledWith(
      'pnpm --filter db exec prisma migrate deploy',
      targetDir,
    );
  });
});
