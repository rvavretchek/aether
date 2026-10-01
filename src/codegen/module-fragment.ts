import { slugToPascalCase, slugToTableName } from './naming.js';

/**
 * Model Prisma mínimo pra um módulo gerado — ponto de partida, não a forma
 * final (o desenvolvedor edita à mão pra adicionar campos reais de negócio, ver
 * Dev Notes "Escopo explicitamente cortado"). `tenantId` é denormalizado, sem
 * `@relation` pra `Tenant` — ver Dev Notes da story pra reconciliação (evita
 * editar o model `Tenant` já existente; isolamento de tenant continua garantido
 * em runtime pela extensão `forTenant`, AD-5).
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
    `  @@map("${tableName}")`,
    '}',
  ].join('\n');
}
