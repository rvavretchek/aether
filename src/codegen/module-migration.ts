export interface ModuleSeedIds {
  moduleId: string;
  closureId: string;
  listResourceId: string;
  createResourceId: string;
}

/**
 * Migration atômica (AD-6) pra um módulo gerado: `CREATE TABLE` da tabela de
 * negócio nova mais os `INSERT` que registram o módulo na árvore de identidade
 * (Module + linha self-referencial de ModuleClosure, depth=0 + os 2 Resources
 * declarados em `resources.ts`). Mesma convenção de DDL já usada nas migrations
 * reais das Stories 2.1/2.2/3.1 (`id TEXT NOT NULL`, sem `DEFAULT`, timestamps
 * `TIMESTAMP(3)`). `ids` já vem pronto (gerado por um wrapper fora desta função
 * pura — ver Dev Notes da story, `crypto.randomUUID()`).
 */
export function buildModuleMigrationSql(
  slug: string,
  tableName: string,
  ids: ModuleSeedIds,
): string {
  return [
    '-- CreateTable',
    `CREATE TABLE "${tableName}" (`,
    '    "id" TEXT NOT NULL,',
    '    "tenant_id" TEXT NOT NULL,',
    '    "name" TEXT NOT NULL,',
    '    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,',
    '    "updated_at" TIMESTAMP(3) NOT NULL,',
    '',
    `    CONSTRAINT "${tableName}_pkey" PRIMARY KEY ("id")`,
    ');',
    '',
    '-- Seed: registro na árvore de identidade (AD-6) — Module + linha',
    '-- self-referencial de ModuleClosure (depth=0) + os Resources deste módulo.',
    '-- Ids pré-computados em JS (crypto.randomUUID(), UUID v4 — ver Dev Notes da',
    '-- story pra reconciliação com uuid(7) do resto da árvore).',
    `INSERT INTO "modules" ("id", "slug", "name", "created_at") VALUES ('${ids.moduleId}', '${slug}', '${slug}', now());`,
    `INSERT INTO "module_closures" ("id", "ancestor_id", "descendant_id", "depth") VALUES ('${ids.closureId}', '${ids.moduleId}', '${ids.moduleId}', 0);`,
    `INSERT INTO "resources" ("id", "module_id", "name", "kind") VALUES ('${ids.listResourceId}', '${ids.moduleId}', '${slug}.list', 'NAMED_PERMISSION');`,
    `INSERT INTO "resources" ("id", "module_id", "name", "kind") VALUES ('${ids.createResourceId}', '${ids.moduleId}', '${slug}.create', 'NAMED_PERMISSION');`,
    '',
  ].join('\n');
}
