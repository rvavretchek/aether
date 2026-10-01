import { describe, it, expect } from 'vitest';
import { buildSharedSchemaFile } from './module-shared-schema.js';

describe('buildSharedSchemaFile', () => {
  it('exporta o input de create e o output de list pro slug dado', () => {
    const content = buildSharedSchemaFile('pedidos');

    expect(content).toContain('pedidosCreateInputSchema');
    expect(content).toContain('pedidosListOutputSchema');
    expect(content).toContain("from 'zod'");
  });

  it('deriva nomes de export em camelCase pra slug com hífen', () => {
    const content = buildSharedSchemaFile('fila-pedidos');

    expect(content).toContain('filaPedidosCreateInputSchema');
    expect(content).toContain('filaPedidosListOutputSchema');
  });
});
