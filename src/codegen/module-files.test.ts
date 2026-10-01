import { describe, it, expect } from 'vitest';
import { buildModuleFiles } from './module-files.js';

describe('buildModuleFiles', () => {
  it('produz as 7 chaves esperadas', () => {
    const files = buildModuleFiles('pedidos');

    expect(Object.keys(files).sort()).toEqual(
      [
        'domain/ports.ts',
        'domain/service.ts',
        'repository.ts',
        'resources.ts',
        'router.test.ts',
        'router.ts',
        'schema.ts',
      ].sort(),
    );
  });

  it('domain/service.ts não importa @prisma/client nem @trpc/* (AD-1)', () => {
    const files = buildModuleFiles('pedidos');

    expect(files['domain/service.ts']).not.toMatch(
      /from ['"]@prisma\/client['"]/,
    );
    expect(files['domain/service.ts']).not.toMatch(/from ['"]@trpc\//);
  });

  it('router.ts chama as funções de domain/service (não métodos do repository direto — AD-1)', () => {
    const files = buildModuleFiles('pedidos');

    expect(files['router.ts']).toMatch(/from '\.\/domain\/service\.js'/);
    expect(files['router.ts']).toContain('listPedidos(pedidosRepository');
    expect(files['router.ts']).toContain('createPedidos(pedidosRepository');
  });

  it('router.ts protege list/create com requireResource nos nomes de Recurso certos (AC #5)', () => {
    const files = buildModuleFiles('pedidos');

    expect(files['router.ts']).toContain("requireResource('pedidos.list')");
    expect(files['router.ts']).toContain("requireResource('pedidos.create')");
  });

  it('resources.ts declara os dois Recursos esperados', () => {
    const files = buildModuleFiles('pedidos');

    expect(files['resources.ts']).toContain("'pedidos.list'");
    expect(files['resources.ts']).toContain("'pedidos.create'");
  });

  it('repository.ts usa forTenant, nunca o PrismaClient cru (AD-5)', () => {
    const files = buildModuleFiles('pedidos');

    expect(files['repository.ts']).toContain("from 'db/extensions/tenant'");
    expect(files['repository.ts']).not.toMatch(/from 'db\/client'/);
  });

  it('interpola o slug com hífen corretamente nos nomes de model/recurso', () => {
    const files = buildModuleFiles('fila-pedidos');

    expect(files['domain/ports.ts']).toContain('FilaPedidosRepository');
    expect(files['resources.ts']).toContain("'fila-pedidos.list'");
    expect(files['repository.ts']).toContain('db.filaPedidos');
  });
});
