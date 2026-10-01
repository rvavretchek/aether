import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runGenerateModule } from './generate-module.js';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'aether-generate-'));
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
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('runGenerateModule', () => {
  it('falha sem gerar nada quando o targetDir não é um projeto Aether', async () => {
    const targetDir = await makeTempDir();
    const generateOneModule = vi.fn();

    const result = await runGenerateModule(targetDir, ['pedidos'], {
      generateOneModule,
    });

    expect(result.ok).toBe(false);
    expect(generateOneModule).not.toHaveBeenCalled();
    if (!result.ok) {
      expect(result.error).toMatch(/projeto Aether/i);
    }
  });

  it('falha sem gerar nada quando algum nome tem sintaxe inválida (pré-checagem de todos antes de gerar qualquer um)', async () => {
    const targetDir = await makeFakeAetherProject();
    const generateOneModule = vi.fn();

    const result = await runGenerateModule(
      targetDir,
      ['pedidos', 'Nome Invalido'],
      {
        generateOneModule,
      },
    );

    expect(result.ok).toBe(false);
    expect(generateOneModule).not.toHaveBeenCalled();
  });

  it('falha sem gerar nada quando um nome é reservado (system/auth)', async () => {
    const targetDir = await makeFakeAetherProject();
    const generateOneModule = vi.fn();

    const result = await runGenerateModule(targetDir, ['system'], {
      generateOneModule,
    });

    expect(result.ok).toBe(false);
    expect(generateOneModule).not.toHaveBeenCalled();
    if (!result.ok) {
      expect(result.error).toMatch(/reservado/i);
    }
  });

  it('gera um único nome válido com sucesso', async () => {
    const targetDir = await makeFakeAetherProject();
    const generateOneModule = vi.fn().mockResolvedValue({ ok: true });

    const result = await runGenerateModule(targetDir, ['pedidos'], {
      generateOneModule,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.results).toEqual([{ name: 'pedidos', ok: true }]);
    }
    expect(generateOneModule).toHaveBeenCalledWith(targetDir, 'pedidos');
  });

  it('múltiplos nomes: o primeiro sucede, o segundo falha numa colisão real — o primeiro permanece gerado, o resultado reflete os dois desfechos', async () => {
    const targetDir = await makeFakeAetherProject();
    const generateOneModule = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: 'model já existe no schema' });

    const result = await runGenerateModule(
      targetDir,
      ['pedidos', 'comercial'],
      {
        generateOneModule,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.results).toEqual([
        { name: 'pedidos', ok: true },
        { name: 'comercial', ok: false, error: 'model já existe no schema' },
      ]);
    }
    expect(generateOneModule).toHaveBeenCalledTimes(2);
  });
});
