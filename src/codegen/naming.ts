/** `pedidos` → `Pedidos`, `fila-pedidos` → `FilaPedidos`. */
export function slugToPascalCase(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** `pedidos` → `pedidos`, `fila-pedidos` → `filaPedidos`. */
export function slugToCamelCase(slug: string): string {
  const pascal = slugToPascalCase(slug);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Nome de tabela — hífen vira underscore, sem pluralização automática (pluralizar
 * programaticamente um slug arbitrário, possivelmente já em português, não é
 * confiável; o desenvolvedor escolhe o nome do módulo já no plural se quiser,
 * como `pedidos`).
 */
export function slugToTableName(slug: string): string {
  return slug.replace(/-/g, '_');
}
