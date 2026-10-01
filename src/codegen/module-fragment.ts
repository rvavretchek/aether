import { slugToPascalCase, slugToTableName } from './naming.js';

/**
 * Model Prisma mínimo pra um módulo gerado — ponto de partida, não a forma
 * final (o desenvolvedor edita à mão pra adicionar campos reais de negócio, ver
 * Dev Notes "Escopo explicitamente cortado"). `tenantId` é denormalizado, sem
 * `@relation` pra `Tenant` — ver Dev Notes da story pra reconciliação (evita
 * editar o model `Tenant` já existente; isolamento de tenant continua garantido
 * em runtime pela extensão `forTenant`, AD-5). `@@index([tenantId])` porque
 * `list()` (repository.ts gerado) sempre filtra por `tenantId` via `forTenant`
 * — sem índice, toda leitura seria um full table scan (achado real do retro
 * do Épico 3); precisa estar aqui E no `CREATE INDEX` de `module-migration.ts`
 * pra `schema.prisma` e a migration não ficarem dessincronizados.
 */
export function buildModuleModelFragment(slug: string): string {
  const modelName = slugToPascalCase(slug);
  const tableName = slugToTableName(slug);

  return [
    `model ${modelName} {`,
    '  id        String   @id @default(uuid(7))',
    '  tenantId  String   @map("tenant_id")',
    '  name      String',
    '  createdAt DateTime @default(now()) @map("created_at")',
    '  updatedAt DateTime @updatedAt @map("updated_at")',
    '',
    '  @@index([tenantId])',
    `  @@map("${tableName}")`,
    '}',
  ].join('\n');
}
