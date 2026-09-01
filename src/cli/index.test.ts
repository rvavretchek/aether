import { describe, it, expect, vi, beforeEach } from 'vitest';

const { runNewMock } = vi.hoisted(() => ({ runNewMock: vi.fn() }));

vi.mock('./commands/new.js', () => ({
  runNew: runNewMock,
}));

const { main } = await import('./index.js');

describe('cli main()', () => {
  beforeEach(() => {
    runNewMock.mockReset();
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
});
