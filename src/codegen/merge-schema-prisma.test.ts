import { describe, it, expect } from 'vitest';
import { appendModelToSchema } from './merge-schema-prisma.js';

const baseSchema = [
  'generator client {',
  '  provider = "prisma-client-js"',
  '}',
  '',
  'model Tenant {',
  '  id String @id',
  '}',
  '',
].join('\n');

describe('appendModelToSchema', () => {
  it('acrescenta o fragmento ao final do schema quando o model não existe ainda', () => {
    const result = appendModelToSchema(
      baseSchema,
      'model Pedidos {\n  id String @id\n}',
      'Pedidos',
    );

    expect(result).not.toBeNull();
    expect(result).toContain(baseSchema);
    expect(result).toContain('model Pedidos {');
  });

  it('retorna null (colisão) quando o model já existe no schema', () => {
    const schemaWithPedidos =
      baseSchema + '\nmodel Pedidos {\n  id String @id\n}\n';

    const result = appendModelToSchema(
      schemaWithPedidos,
      'model Pedidos {\n  id String @id\n}',
      'Pedidos',
    );

    expect(result).toBeNull();
  });

  it('não detecta falso-positivo quando outro model tem o nome como prefixo (ex.: PedidosArquivados vs Pedidos)', () => {
    const schemaWithSimilar =
      baseSchema + '\nmodel PedidosArquivados {\n  id String @id\n}\n';

    const result = appendModelToSchema(
      schemaWithSimilar,
      'model Pedidos {\n  id String @id\n}',
      'Pedidos',
    );

    expect(result).not.toBeNull();
  });
});
