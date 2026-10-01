import { describe, it, expect } from 'vitest';
import { mountRouterInRootRouter } from './merge-root-router.js';

const oneModuleRootRouter = [
  "import { router } from './trpc.js';",
  "import { systemRouter } from './modules/system/router.js';",
  "import { authRouter } from './core/auth/router.js';",
  '',
  'export const appRouter = router({',
  '  system: systemRouter,',
  '  auth: authRouter,',
  '});',
  '',
  'export type AppRouter = typeof appRouter;',
  '',
].join('\n');

describe('mountRouterInRootRouter', () => {
  it('insere o import e a entrada do router num root-router.ts com 1 módulo existente', () => {
    const result = mountRouterInRootRouter(
      oneModuleRootRouter,
      'pedidos',
      'pedidosRouter',
    );

    expect(result).not.toBeNull();
    expect(result).toContain(
      "import { pedidosRouter } from './modules/pedidos/router.js';",
    );
    expect(result).toMatch(/pedidos: pedidosRouter,\n\}\);/);
    // Preserva tudo que já existia.
    expect(result).toContain('system: systemRouter,');
    expect(result).toContain('auth: authRouter,');
    expect(result).toContain('export type AppRouter = typeof appRouter;');
  });

  it('insere corretamente quando já existem 2+ módulos montados', () => {
    const withTwoModules = mountRouterInRootRouter(
      oneModuleRootRouter,
      'pedidos',
      'pedidosRouter',
    )!;

    const result = mountRouterInRootRouter(
      withTwoModules,
      'comercial',
      'comercialRouter',
    );

    expect(result).not.toBeNull();
    expect(result).toContain(
      "import { comercialRouter } from './modules/comercial/router.js';",
    );
    expect(result).toContain('pedidos: pedidosRouter,');
    expect(result).toContain('comercial: comercialRouter,');
  });

  it('retorna null (colisão) quando o slug já está montado', () => {
    const withPedidos = mountRouterInRootRouter(
      oneModuleRootRouter,
      'pedidos',
      'pedidosRouter',
    )!;

    const result = mountRouterInRootRouter(
      withPedidos,
      'pedidos',
      'pedidosRouter',
    );

    expect(result).toBeNull();
  });
});
