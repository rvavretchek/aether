function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Acrescenta `modelFragment` ao final de `schemaContent` — nunca edita um model
 * já existente (ver Dev Notes da story). Retorna `null` (sinaliza colisão) se um
 * model com `modelName` já existir — checado com limite de palavra pra não dar
 * falso-positivo em `PedidosArquivados` ao procurar por `Pedidos`.
 */
export function appendModelToSchema(
  schemaContent: string,
  modelFragment: string,
  modelName: string,
): string | null {
  const collisionPattern = new RegExp(
    `\\bmodel\\s+${escapeRegExp(modelName)}\\s*\\{`,
  );
  if (collisionPattern.test(schemaContent)) {
    return null;
  }

  const trimmed = schemaContent.replace(/\n+$/, '');
  return `${trimmed}\n\n${modelFragment}\n`;
}
