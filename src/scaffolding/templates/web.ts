export function buildWebFiles(projectName: string): Record<string, string> {
  return {
    'package.json':
      JSON.stringify(
        {
          name: 'web',
          version: '0.0.1',
          private: true,
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'vite build',
          },
          dependencies: {
            react: '19.2.8',
            'react-dom': '19.2.8',
            'react-router': '7.18.2',
            '@trpc/client': '11.18.0',
          },
          devDependencies: {
            // 'api' entra aqui, não em dependencies — só usado via `import type`
            // (AC #5/AD-3), mesma razão que @trpc/server.
            api: 'workspace:*',
            '@trpc/server': '11.18.0',
            '@vitejs/plugin-react': '6.1.1',
            vite: '8.2.2',
            typescript: '5.9.3',
            vitest: '4.1.11',
            '@types/react': '19.2.0',
            '@types/react-dom': '19.2.0',
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
            jsx: 'react-jsx',
            lib: ['ES2023', 'DOM', 'DOM.Iterable'],
            types: ['vite/client'],
          },
          include: ['src/**/*.ts', 'src/**/*.tsx'],
          references: [{ path: '../api' }],
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

    'vite.config.ts': [
      "import { defineConfig, loadEnv } from 'vite';",
      "import react from '@vitejs/plugin-react';",
      '',
      '// process.env aqui é só o ambiente do SO — Vite não carrega .env.development pra',
      '// process.env sozinho (só pra import.meta.env do cliente, via envDir abaixo).',
      "// loadEnv (prefixo '') resolve isso pra uso dentro deste próprio config",
      '// (achado do code review, AC #7 — antes WEB_PORT nunca vinha do arquivo de verdade).',
      'export default defineConfig(({ mode }) => {',
      "  const env = loadEnv(mode, '../../', '');",
      '  return {',
      '    plugins: [react()],',
      '    // .env.development mora na raiz do monorepo, não em apps/web — envDir também',
      '    // controla quais VITE_-prefixadas ficam expostas em import.meta.env no cliente.',
      "    envDir: '../../',",
      '    server: {',
      '      port: Number(env.WEB_PORT ?? 5173),',
      '    },',
      '  };',
      '});',
      '',
    ].join('\n'),

    'index.html': [
      '<!doctype html>',
      '<html lang="pt-BR">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      `    <title>${projectName}</title>`,
      '  </head>',
      '  <body>',
      '    <div id="root"></div>',
      '    <script type="module" src="/src/main.tsx"></script>',
      '  </body>',
      '</html>',
      '',
    ].join('\n'),

    // --- Client tRPC vanilla — SEM TanStack Query (proibido pela spine; useTRPC/useTRPCClient
    // não funcionariam dentro de um loader de qualquer forma, ver Dev Notes Story 1.1) ---
    'src/trpc/client.ts': [
      "import { createTRPCClient, httpBatchLink, type TRPCClient } from '@trpc/client';",
      "import type { AppRouter } from 'api/router'; // único import type de apps/api em todo apps/web (AC #5), via pacote workspace",
      '',
      '// Anotação de tipo explícita — sem ela, o TS (projeto composite) reclama que o tipo',
      '// inferido de `trpc` não pode ser nomeado sem referenciar node_modules/api (TS2742).',
      'export const trpc: TRPCClient<AppRouter> = createTRPCClient<AppRouter>({',
      '  links: [',
      '    httpBatchLink({',
      '      url: `http://localhost:${import.meta.env.VITE_API_PORT ?? 3001}/trpc`,',
      '    }),',
      '  ],',
      '});',
      '',
    ].join('\n'),

    'src/routes/home.ts': [
      "import { trpc } from '../trpc/client.js';",
      '',
      '// loader roda fora da árvore de componentes — por isso o client tRPC vanilla, não hooks (Dev Notes).',
      'export async function homeLoader() {',
      '  return trpc.system.hello.query();',
      '}',
      '',
    ].join('\n'),

    'src/routes/home-page.tsx': [
      "import { useLoaderData } from 'react-router';",
      "import type { homeLoader } from './home.js';",
      '',
      'export function HomePage() {',
      '  const data = useLoaderData<typeof homeLoader>();',
      '  return <h1>{data.message}</h1>;',
      '}',
      '',
    ].join('\n'),

    'src/main.tsx': [
      "import { StrictMode } from 'react';",
      "import { createRoot } from 'react-dom/client';",
      "import { createBrowserRouter, RouterProvider } from 'react-router';",
      "import { HomePage } from './routes/home-page.js';",
      "import { homeLoader } from './routes/home.js';",
      '',
      'const router = createBrowserRouter([',
      '  {',
      "    path: '/',",
      '    Component: HomePage,',
      '    loader: homeLoader,',
      '  },',
      ']);',
      '',
      "const rootElement = document.getElementById('root');",
      'if (!rootElement) {',
      "  throw new Error('#root element not found');",
      '}',
      '',
      'createRoot(rootElement).render(',
      '  <StrictMode>',
      '    <RouterProvider router={router} />',
      '  </StrictMode>,',
      ');',
      '',
    ].join('\n'),
  };
}
