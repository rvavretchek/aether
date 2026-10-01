import { describe, it, expect, vi, beforeEach } from 'vitest';

const { runNewMock, runMigrateMock, runGenerateModuleMock } = vi.hoisted(
  () => ({
    runNewMock: vi.fn(),
    runMigrateMock: vi.fn(),
    runGenerateModuleMock: vi.fn(),
  }),
);

vi.mock('./commands/new.js', () => ({
  runNew: runNewMock,
}));

vi.mock('./commands/migrate.js', () => ({
  runMigrate: runMigrateMock,
}));

vi.mock('./commands/generate-module.js', () => ({
  runGenerateModule: runGenerateModuleMock,
}));

const { main } = await import('./index.js');

describe('cli main()', () => {
  beforeEach(() => {
    runNewMock.mockReset();
    runMigrateMock.mockReset();
    runGenerateModuleMock.mockReset();
  });

  it('returns 1 and does not call runNew when project name is missing for `new`', async () => {
    const code = await main(['new']);
    expect(code).toBe(1);
    expect(runNewMock).not.toHaveBeenCalled();
  });

  it('calls runNew with the resolved target dir and project name, returns 0 on success', async () => {
    runNewMock.mockResolvedValue({ ok: true });

    const code = await main(['new', 'my-app']);

    expect(code).toBe(0);
    expect(runNewMock).toHaveBeenCalledWith(
      expect.stringContaining('my-app'),
      'my-app',
    );
  });

  it('returns 1 when runNew fails', async () => {
    runNewMock.mockResolvedValue({ ok: false, error: 'deu ruim' });

    const code = await main(['new', 'my-app']);

    expect(code).toBe(1);
  });

  it('returns 1 for an unknown command', async () => {
    const code = await main(['bogus']);
    expect(code).toBe(1);
    expect(runNewMock).not.toHaveBeenCalled();
  });

  it('calls runMigrate with process.cwd() and returns 0 on success', async () => {
    runMigrateMock.mockResolvedValue({ ok: true });

    const code = await main(['migrate']);

    expect(code).toBe(0);
    expect(runMigrateMock).toHaveBeenCalledWith(process.cwd());
  });

  it('returns 1 when runMigrate fails', async () => {
    runMigrateMock.mockResolvedValue({ ok: false, error: 'deu ruim' });

    const code = await main(['migrate']);

    expect(code).toBe(1);
  });

  it('returns 1 and does not call runGenerateModule when `generate module` has no names', async () => {
    const code = await main(['generate', 'module']);

    expect(code).toBe(1);
    expect(runGenerateModuleMock).not.toHaveBeenCalled();
  });

  it('returns 1 for an unsupported `generate` type', async () => {
    const code = await main(['generate', 'bogus-type', 'algo']);

    expect(code).toBe(1);
    expect(runGenerateModuleMock).not.toHaveBeenCalled();
  });

  it('calls runGenerateModule with process.cwd() and the given names, returns 0 when all succeed', async () => {
    runGenerateModuleMock.mockResolvedValue({
      ok: true,
      results: [
        { name: 'pedidos', ok: true },
        { name: 'comercial', ok: true },
      ],
    });

    const code = await main(['generate', 'module', 'pedidos', 'comercial']);

    expect(code).toBe(0);
    expect(runGenerateModuleMock).toHaveBeenCalledWith(process.cwd(), [
      'pedidos',
      'comercial',
    ]);
  });

  it('returns 1 when runGenerateModule fails at the whole-call level', async () => {
    runGenerateModuleMock.mockResolvedValue({ ok: false, error: 'deu ruim' });

    const code = await main(['generate', 'module', 'pedidos']);

    expect(code).toBe(1);
  });

  it('returns 1 when any individual module name fails, even if others succeeded', async () => {
    runGenerateModuleMock.mockResolvedValue({
      ok: true,
      results: [
        { name: 'pedidos', ok: true },
        { name: 'comercial', ok: false, error: 'model já existe' },
      ],
    });

    const code = await main(['generate', 'module', 'pedidos', 'comercial']);

    expect(code).toBe(1);
  });
});
