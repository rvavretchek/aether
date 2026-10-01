function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Insere a montagem de um módulo novo em `root-router.ts` existente — nunca edita
 * uma entrada já montada. Retorna `null` (sinaliza colisão) se `slug` já estiver
 * montado (import ou entrada no `router({...})` já presentes). Âncoras: a nova
 * linha de import entra depois da ÚLTIMA linha de import existente; a nova entrada
 * do router entra logo antes do `});` que fecha `router({` — função pura,
 * testável só com strings, sem precisar do arquivo real.
 */
export function mountRouterInRootRouter(
  content: string,
  slug: string,
  routerExportName: string,
): string | null {
  const importPath = `./modules/${slug}/router.js`;
  const alreadyMounted =
    content.includes(importPath) ||
    new RegExp(`\\n\\s*${escapeRegExp(slug)}:\\s`).test(content);
  if (alreadyMounted) {
    return null;
  }

  const importLine = `import { ${routerExportName} } from '${importPath}';`;
  const lines = content.split('\n');
  const lastImportIndex = lines.reduce(
    (lastIndex, line, index) =>
      line.startsWith('import ') ? index : lastIndex,
    -1,
  );
  if (lastImportIndex === -1) {
    return null;
  }
  lines.splice(lastImportIndex + 1, 0, importLine);

  const withImport = lines.join('\n');

  const routerEntryLine = `  ${slug}: ${routerExportName},`;
  const closingBracePattern = /\n\}\);/;
  const closingBraceMatch = closingBracePattern.exec(withImport);
  if (!closingBraceMatch) {
    return null;
  }
  const insertAt = closingBraceMatch.index;
  return (
    withImport.slice(0, insertAt) +
    `\n${routerEntryLine}` +
    withImport.slice(insertAt)
  );
}
