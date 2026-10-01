import { slugToCamelCase } from './naming.js';

/**
 * Schema Zod único (AD-3) pro módulo gerado — mesmo padrão de
 * `packages/shared/src/schemas/system.ts` (Story 1.1): `.trim().min(1).max(200)`
 * no input de texto (nunca aceitar string só-espaço, sempre limitar tamanho —
 * mesmo achado de code review já aplicado em `system.ts`).
 */
export function buildSharedSchemaFile(slug: string): string {
  const camel = slugToCamelCase(slug);

  return [
    "import { z } from 'zod';",
    '',
    `// Fonte única dos schemas do módulo "${slug}" (AD-3) — importados por apps/api e apps/web, nunca duplicados.`,
    `export const ${camel}CreateInputSchema = z.object({`,
    '  name: z.string().trim().min(1).max(200),',
    '});',
    '',
    `export const ${camel}RecordSchema = z.object({`,
    '  id: z.string(),',
    '  name: z.string(),',
    '  createdAt: z.coerce.date(),',
    '});',
    '',
    `export const ${camel}ListOutputSchema = z.array(${camel}RecordSchema);`,
    '',
  ].join('\n');
}
