export function buildSharedFiles(): Record<string, string> {
  return {
    'package.json':
      JSON.stringify(
        {
          name: 'shared',
          version: '0.0.1',
          private: true,
          type: 'module',
          exports: {
            './schemas/*': './src/schemas/*.ts',
          },
          dependencies: {
            zod: '4.4.3',
          },
          devDependencies: {
            typescript: '5.9.3',
            vitest: '4.1.11',
          },
        },
        null,
        2,
      ) + '\n',

    'tsconfig.json':
      JSON.stringify(
        {
          extends: '../../tsconfig.base.json',
          compilerOptions: {
            composite: true,
            outDir: 'dist',
            rootDir: 'src',
          },
          include: ['src/**/*.ts'],
        },
        null,
        2,
      ) + '\n',

    'vitest.config.ts': [
      "import { sharedTestConfig } from '../../vitest.shared.js';",
      '',
      'export default sharedTestConfig;',
      '',
    ].join('\n'),

    'src/schemas/system.ts': [
      "import { z } from 'zod';",
      '',
      '// Fonte única dos schemas de `system.hello` (AD-3) — importados por apps/api e apps/web, nunca duplicados.',
      '// Input opcional só pra este único procedure da story já exercitar validação Zod de',
      '// verdade (FR-17) — sem isso, nada nesta story testaria o caminho de erro RFC 9457.',
      'export const systemHelloInputSchema = z',
      '  .object({',
      '    // .trim() + .max() — string só-espaço não deve passar em .min(1), e nada',
      '    // limitava o tamanho aceito/logado antes (achado do code review).',
      '    name: z.string().trim().min(1).max(200).optional(),',
      '  })',
      '  .optional();',
      '',
      'export const systemHelloOutputSchema = z.object({',
      '  message: z.string(),',
      '});',
      '',
      'export type SystemHelloOutput = z.infer<typeof systemHelloOutputSchema>;',
      '',
    ].join('\n'),
  };
}
