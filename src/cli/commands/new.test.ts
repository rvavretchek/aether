import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runNew } from './new.js';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'aether-new-'));
  tempDirs.push(dir);
  return dir;
}

function fakeSetupOptions() {
  return {
    writeSeed: vi.fn().mockImplementation(async (dir: string) => {
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, 'pnpm-workspace.yaml'),
        'packages:\n  - "apps/*"\n',
      );
    }),
    installDependencies: vi.fn().mockResolvedValue(undefined),
    generatePrismaClient: vi.fn().mockResolvedValue(undefined),
    formatGeneratedCode: vi.fn().mockResolvedValue(undefined),
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('runNew', () => {
  it('writes the structural seed, installs, formats, and succeeds when the target dir is empty', async () => {
    const root = await makeTempDir();
    const targetDir = join(root, 'my-app');
    const options = fakeSetupOptions();

    const result = await runNew(targetDir, 'my-app', options);

    expect(result).toEqual({ ok: true });
    expect(options.installDependencies).toHaveBeenCalledWith(targetDir);
    expect(options.generatePrismaClient).toHaveBeenCalledWith(targetDir);
    expect(options.formatGeneratedCode).toHaveBeenCalledWith(targetDir);
    await expect(
      access(join(targetDir, 'pnpm-workspace.yaml')),
    ).resolves.toBeUndefined();
  });

  it('succeeds when the target dir does not exist yet (creates it)', async () => {
    const root = await makeTempDir();
    const targetDir = join(root, 'brand-new');

    const result = await runNew(targetDir, 'brand-new', fakeSetupOptions());

    expect(result).toEqual({ ok: true });
  });

  it('refuses and writes nothing when the target dir already has files (AC #2)', async () => {
    const root = await makeTempDir();
    const targetDir = join(root, 'occupied');
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, 'existing-file.txt'), 'já tem algo aqui');
    const options = fakeSetupOptions();

    const result = await runNew(targetDir, 'occupied', options);

    expect(result.ok).toBe(false);
    expect(options.installDependencies).not.toHaveBeenCalled();
    // não escreveu nada novo além do arquivo pré-existente
    await expect(
      access(join(targetDir, 'pnpm-workspace.yaml')),
    ).rejects.toThrow();
    await expect(
      access(join(targetDir, 'existing-file.txt')),
    ).resolves.toBeUndefined();
  });

  it('rolls back (deletes target dir) when install fails, and reports the error (AC #2)', async () => {
    const root = await makeTempDir();
    const targetDir = join(root, 'install-fails');
    const options = fakeSetupOptions();
    options.installDependencies.mockRejectedValue(
      new Error('network unreachable'),
    );

    const result = await runNew(targetDir, 'install-fails', options);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('network unreachable');
    }
    await expect(access(targetDir)).rejects.toThrow();
  });

  it('rolls back (deletes target dir) when generating the Prisma client fails after a successful install (AC #2, Story 2.1)', async () => {
    const root = await makeTempDir();
    const targetDir = join(root, 'prisma-generate-fails');
    const options = fakeSetupOptions();
    options.generatePrismaClient.mockRejectedValue(
      new Error('prisma generate explodiu'),
    );

    const result = await runNew(targetDir, 'prisma-generate-fails', options);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('prisma generate explodiu');
    }
    expect(options.formatGeneratedCode).not.toHaveBeenCalled();
    await expect(access(targetDir)).rejects.toThrow();
  });

  it('rolls back (deletes target dir) when formatting fails after a successful install (AC #2)', async () => {
    const root = await makeTempDir();
    const targetDir = join(root, 'format-fails');
    const options = fakeSetupOptions();
    options.formatGeneratedCode.mockRejectedValue(
      new Error('prettier explodiu'),
    );

    const result = await runNew(targetDir, 'format-fails', options);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('prettier explodiu');
    }
    await expect(access(targetDir)).rejects.toThrow();
  });

  it('rolls back (deletes target dir) when writing the structural seed itself fails — not just install/format (AC #2, achado do code review)', async () => {
    const root = await makeTempDir();
    const targetDir = join(root, 'seed-write-fails');
    const options = fakeSetupOptions();
    options.writeSeed.mockImplementation(async (dir: string) => {
      // Simula falha no MEIO da escrita (ex.: disco cheio) — alguns arquivos já
      // foram escritos quando o erro acontece.
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'partial-file.txt'), 'só isso foi escrito');
      throw new Error('ENOSPC: no space left on device');
    });

    const result = await runNew(targetDir, 'seed-write-fails', options);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('ENOSPC');
    }
    expect(options.installDependencies).not.toHaveBeenCalled();
    // o diretório inteiro (inclusive o arquivo parcial) foi revertido, não só ficou "incompleto"
    await expect(access(targetDir)).rejects.toThrow();
  });

  describe('validação de projectName (achado do code review)', () => {
    it.each([
      ['..', 'travessia de caminho'],
      ['../sibling', 'travessia de caminho com separador'],
      ['Meu-Projeto', 'maiúsculas — nome de pacote npm inválido'],
      ['meu projeto', 'espaço'],
      ['-comeca-com-hifen', 'começa com hífen'],
      ['', 'string vazia'],
    ])(
      'rejeita "%s" (%s) sem chamar install nem escrever nada',
      async (badName) => {
        const root = await makeTempDir();
        const targetDir = join(root, 'target-for-bad-name');
        const options = fakeSetupOptions();

        const result = await runNew(targetDir, badName, options);

        expect(result.ok).toBe(false);
        expect(options.writeSeed).not.toHaveBeenCalled();
        expect(options.installDependencies).not.toHaveBeenCalled();
      },
    );

    it.each(['api', 'web', 'shared', 'db'])(
      'rejeita "%s" por colidir com um pacote fixo do workspace gerado',
      async (reservedName) => {
        const root = await makeTempDir();
        const targetDir = join(root, 'target-for-reserved-name');
        const options = fakeSetupOptions();

        const result = await runNew(targetDir, reservedName, options);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toContain('reservado');
        }
        expect(options.writeSeed).not.toHaveBeenCalled();
      },
    );

    it('aceita um nome kebab-case válido', async () => {
      const root = await makeTempDir();
      const targetDir = join(root, 'minha-loja');
      const options = fakeSetupOptions();

      const result = await runNew(targetDir, 'minha-loja', options);

      expect(result.ok).toBe(true);
    });
  });
});
