import { describe, it, expect } from 'vitest';
import { buildModuleMigrationSql } from './module-migration.js';

const ids = {
  moduleId: 'module-id-1',
  closureId: 'closure-id-1',
  listResourceId: 'list-resource-id-1',
  createResourceId: 'create-resource-id-1',
};

describe('buildModuleMigrationSql', () => {
  it('produz CREATE TABLE pra tabela do módulo', () => {
    const sql = buildModuleMigrationSql('pedidos', 'pedidos', ids);

    expect(sql).toContain('CREATE TABLE "pedidos"');
    expect(sql).toContain('"tenant_id" TEXT NOT NULL');
    expect(sql).toContain('CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")');
  });

  it('insere a linha de Module com o id recebido', () => {
    const sql = buildModuleMigrationSql('pedidos', 'pedidos', ids);

    expect(sql).toContain(
      `INSERT INTO "modules" ("id", "slug", "name", "created_at") VALUES ('${ids.moduleId}', 'pedidos', 'pedidos', now());`,
    );
  });

  it('insere a linha self-referencial de ModuleClosure (ancestor=descendant=moduleId, depth=0)', () => {
    const sql = buildModuleMigrationSql('pedidos', 'pedidos', ids);

    expect(sql).toContain(
      `INSERT INTO "module_closures" ("id", "ancestor_id", "descendant_id", "depth") VALUES ('${ids.closureId}', '${ids.moduleId}', '${ids.moduleId}', 0);`,
    );
  });

  it('insere as 2 linhas de Resource (list e create), ambas apontando pro moduleId', () => {
    const sql = buildModuleMigrationSql('pedidos', 'pedidos', ids);

    expect(sql).toContain(
      `INSERT INTO "resources" ("id", "module_id", "name", "kind") VALUES ('${ids.listResourceId}', '${ids.moduleId}', 'pedidos.list', 'NAMED_PERMISSION');`,
    );
    expect(sql).toContain(
      `INSERT INTO "resources" ("id", "module_id", "name", "kind") VALUES ('${ids.createResourceId}', '${ids.moduleId}', 'pedidos.create', 'NAMED_PERMISSION');`,
    );
  });

  it('usa o tableName pro nome da tabela quando diferente do slug (slug com hífen)', () => {
    const sql = buildModuleMigrationSql('fila-pedidos', 'fila_pedidos', ids);

    expect(sql).toContain('CREATE TABLE "fila_pedidos"');
    expect(sql).toContain("'fila-pedidos.list'");
  });
});
