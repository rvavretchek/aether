import { describe, it, expect } from 'vitest';
import { buildModuleModelFragment } from './module-fragment.js';

describe('buildModuleModelFragment', () => {
  it('produz um model Prisma mínimo, tenant-scoped, sem relação com Tenant', () => {
    const fragment = buildModuleModelFragment('pedidos');

    expect(fragment).toContain('model Pedidos {');
    expect(fragment).toContain('tenantId  String   @map("tenant_id")');
    expect(fragment).toContain('name      String');
    expect(fragment).toContain('@@map("pedidos")');
    expect(fragment).not.toContain('@relation');
  });

  it('deriva o nome do model e da tabela de um slug com hífen', () => {
    const fragment = buildModuleModelFragment('fila-pedidos');

    expect(fragment).toContain('model FilaPedidos {');
    expect(fragment).toContain('@@map("fila_pedidos")');
  });
});
