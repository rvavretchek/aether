import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { checkIsAetherProject } from '../is-aether-project.js';
import { runMigrate } from './migrate.js';
import { runCommand } from '../run-command.js';
import {
  slugToPascalCase,
  slugToCamelCase,
  slugToTableName,
} from '../../codegen/naming.js';
import { buildModuleModelFragment } from '../../codegen/module-fragment.js';
import { appendModelToSchema } from '../../codegen/merge-schema-prisma.js';
import { buildSharedSchemaFile } from '../../codegen/module-shared-schema.js';
import { buildModuleFiles } from '../../codegen/module-files.js';
import { mountRouterInRootRouter } from '../../codegen/merge-root-router.js';
import { buildModuleMigrationSql } from '../../codegen/module-migration.js';

// Além de `system`/`auth` (módulos que todo projeto gerado já tem), reserva
// todo nome de model/tabela que o schema da árvore de identidade (Story 3.1) já
// usa — um `generate module tenant` ou `generate module role-assignment`
// passaria na checagem de sintaxe mas falharia depois, bem mais fundo no
// pipeline (colisão de tabela no banco, não de model no schema — achado real
// do code review). Falhar aqui, na pré-checagem de TODOS os nomes antes de
// gerar qualquer um, é o que a Task 1.2 já promete.
const RESERVED_MODULE_NAMES = new Set([
  'system',
  'auth',
  'tenant',
  'user',
  'group',
  'role',
  'module',
  'module-closure',
  'resource',
  'role-assignment',
  'refresh-token',
  'rate-limit-hit',
]);
// Primeiro caractere precisa ser letra, não dígito — `1abc` passaria na regex
// antiga e viraria `model 1abc { ... }`, um identificador Prisma/TS inválido
// (achado real do code review, reproduzido de verdade).
const VALID_MODULE_NAME = /^[a-z](?:[a-z0-9-]*[a-z0-9])?$/;
const MAX_MODULE_NAME_LENGTH = 50;

/**
 * Mesma regra de `new.ts` (`VALID_PROJECT_NAME`), com o ajuste de exigir letra
 * no primeiro caractere. Limite de tamanho evita que um nome válido mas muito
 * longo só falhe lá no fundo do pipeline, no limite de 63 bytes de identificador
 * do Postgres (achado real do code review).
 */
function validateModuleName(name: string): string | null {
  if (!VALID_MODULE_NAME.test(name)) {
    return `Nome de módulo inválido: "${name}". Use letras minúsculas, números e hífen, começando com letra.`;
  }
  if (name.length > MAX_MODULE_NAME_LENGTH) {
    return `Nome de módulo muito longo: "${name}" (${String(name.length)} caracteres, máximo ${String(MAX_MODULE_NAME_LENGTH)}).`;
  }
  if (RESERVED_MODULE_NAMES.has(name)) {
    return `"${name}" é um nome reservado — colide com um model/tabela que todo projeto gerado já tem. Escolha outro.`;
  }
  return null;
}

export type GenerateOneModuleResult =
  { ok: true } | { ok: false; error: string };

export interface GenerateModuleOptions {
  /** Injetável para teste — default gera o módulo de verdade (Tasks 2-7). */
  generateOneModule?: (
    targetDir: string,
    slug: string,
  ) => Promise<GenerateOneModuleResult>;
  /**
   * Injetável para teste — default roda `pnpm exec prettier --write .` de
   * verdade. Mesmo racional de `new.ts` (`formatGeneratedCode`): deixa o
   * Prettier ser a autoridade final, em vez de tentar bater byte-a-byte o
   * estilo dele nos templates escritos à mão (achado real da Task 9: o
   * `router.test.ts` gerado tinha linhas longas que o Prettier reformata).
   */
  formatGeneratedCode?: (targetDir: string) => Promise<void>;
  /**
   * Injetável para teste — default roda `pnpm --filter db run generate` de
   * verdade (mesmo comando de `new.ts`'s `defaultGeneratePrismaClient`).
   * Achado real da validação end-to-end contra Postgres de verdade: sem
   * isso, `db.pedidos` fica `undefined` em runtime — o `@prisma/client` só
   * ganha o accessor do model novo depois que `prisma generate` roda de
   * novo, `prisma migrate deploy` sozinho não regenera o client.
   */
  generatePrismaClient?: (targetDir: string) => Promise<void>;
}

export type GenerateModuleNameResult = {
  name: string;
} & GenerateOneModuleResult;

export type RunGenerateModuleResult =
  | { ok: false; error: string }
  | { ok: true; results: GenerateModuleNameResult[] };

/**
 * Implementa `aether-admin generate module <nome...>` (FR-3). Duas fases:
 * pré-checagem (projeto válido + sintaxe/reserva de TODOS os nomes) que falha
 * rápido sem tocar nada; depois geração por nome, sequencial, cada um uma
 * unidade atômica independente (ver Dev Notes da story — sem rollback
 * cross-módulo se um nome falhar depois que outro já foi aplicado; rollback
 * DENTRO de um nome, sim — ver `defaultGenerateOneModule`).
 */
export async function runGenerateModule(
  targetDir: string,
  names: string[],
  options: GenerateModuleOptions = {},
): Promise<RunGenerateModuleResult> {
  const formatGeneratedCode =
    options.formatGeneratedCode ?? defaultFormatGeneratedCode;
  const generatePrismaClient =
    options.generatePrismaClient ?? defaultGeneratePrismaClient;
  const generateOneModule =
    options.generateOneModule ??
    ((dir: string, slug: string) =>
      defaultGenerateOneModule(
        dir,
        slug,
        formatGeneratedCode,
        generatePrismaClient,
      ));

  const projectCheck = await checkIsAetherProject(targetDir);
  if (!projectCheck.ok) {
    return projectCheck;
  }

  for (const name of names) {
    const nameError = validateModuleName(name);
    if (nameError) {
      return { ok: false, error: nameError };
    }
  }

  const results: GenerateModuleNameResult[] = [];
  for (const name of names) {
    const result = await generateOneModule(targetDir, name);
    results.push({ name, ...result });
  }

  return { ok: true, results };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** `YYYYMMDDHHMMSS`, mesma convenção de nome de pasta das migrations reais já existentes. */
function formatMigrationTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    String(date.getFullYear()) +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

async function defaultFormatGeneratedCode(targetDir: string): Promise<void> {
  await runCommand('pnpm exec prettier --write .', targetDir);
}

async function defaultGeneratePrismaClient(targetDir: string): Promise<void> {
  await runCommand('pnpm --filter db run generate', targetDir);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Liga as Tasks 2-7: schema Prisma, schema Zod compartilhado, arquivos
 * Hexagonais, root-router.ts, migration atômica (código + árvore de identidade,
 * AD-6) — aplicada de verdade via `runMigrate` (Story 3.2) antes de retornar
 * sucesso. Qualquer colisão de arquivo/diretório falha ANTES de escrever
 * qualquer coisa nesse nome (AC #4/#6); colisão de `Resource.name` é pega pela
 * constraint `@unique` do banco + atomicidade de transação da migration (AC #8).
 *
 * Se a migration falhar (ou qualquer outro erro inesperado acontecer depois
 * que já começamos a escrever), desfaz tudo que foi escrito — schema.prisma e
 * root-router.ts voltam ao conteúdo original, os arquivos/diretórios novos são
 * removidos — pra nunca deixar código gerado sem o nó correspondente na árvore
 * (AC #7) e pra uma segunda tentativa não ficar bloqueada pelas próprias
 * checagens de colisão (achado real do code review: a versão original não
 * desfazia nada, deixando o projeto num estado quebrado e a mesma tentativa
 * impossível de repetir). Limitação conhecida, fora do escopo desta story: se
 * `prisma migrate deploy` já tiver registrado a migration como `failed` em
 * `_prisma_migrations` antes de rejeitar, chamadas futuras de `migrate`/
 * `generate module` continuam bloqueadas até resolução manual
 * (`prisma migrate resolve`) — o rollback de arquivos não desfaz esse estado
 * do lado do Postgres.
 *
 * Depois que `runMigrate` tem sucesso, o banco já é a fonte da verdade — essa
 * migration está aplicada e registrada em `_prisma_migrations` de verdade, e
 * não há como desfazê-la a partir daqui. Por isso `generatePrismaClient`
 * (`prisma generate`, pra regenerar o `@prisma/client` com o accessor do
 * model novo) roda DEPOIS do `if (!migrateResult.ok)` e FORA do try/catch de
 * rollback: se ela falhar, reverter schema.prisma/migration deixaria o
 * projeto com o banco migrado mas o schema local sem o model — uma
 * inconsistência pior do que simplesmente reportar o erro e pedir retry
 * manual do `prisma generate`.
 */
async function defaultGenerateOneModule(
  targetDir: string,
  slug: string,
  formatGeneratedCode: (targetDir: string) => Promise<void>,
  generatePrismaClient: (targetDir: string) => Promise<void>,
): Promise<GenerateOneModuleResult> {
  const modelName = slugToPascalCase(slug);
  const camel = slugToCamelCase(slug);
  const tableName = slugToTableName(slug);

  const schemaPath = join(targetDir, 'packages/db/schema.prisma');
  const sharedSchemaPath = join(
    targetDir,
    `packages/shared/src/schemas/${slug}.ts`,
  );
  const moduleDir = join(targetDir, `apps/api/src/modules/${slug}`);
  const rootRouterPath = join(targetDir, 'apps/api/src/root-router.ts');
  const migrationDir = join(
    targetDir,
    `packages/db/migrations/${formatMigrationTimestamp(new Date())}_add_${slug.replaceAll('-', '_')}_module`,
  );

  let schemaContent: string;
  let rootRouterContent: string;
  try {
    schemaContent = await readFile(schemaPath, 'utf-8');
    rootRouterContent = await readFile(rootRouterPath, 'utf-8');
  } catch (error) {
    return {
      ok: false,
      error: `Falha ao ler arquivos do projeto: ${errorMessage(error)}`,
    };
  }

  const mergedSchema = appendModelToSchema(
    schemaContent,
    buildModuleModelFragment(slug),
    modelName,
  );
  if (mergedSchema === null) {
    return {
      ok: false,
      error: `model "${modelName}" já existe em packages/db/schema.prisma — "${slug}" já foi gerado antes?`,
    };
  }

  if (await pathExists(sharedSchemaPath)) {
    return {
      ok: false,
      error: `packages/shared/src/schemas/${slug}.ts já existe — "${slug}" já foi gerado antes?`,
    };
  }

  if (await pathExists(moduleDir)) {
    return {
      ok: false,
      error: `apps/api/src/modules/${slug} já existe — "${slug}" já foi gerado antes?`,
    };
  }

  const routerExportName = `${camel}Router`;
  const mergedRootRouter = mountRouterInRootRouter(
    rootRouterContent,
    slug,
    routerExportName,
  );
  if (mergedRootRouter === null) {
    return {
      ok: false,
      error: `"${slug}" já está montado em apps/api/src/root-router.ts — "${slug}" já foi gerado antes?`,
    };
  }

  async function rollback(): Promise<void> {
    await writeFile(schemaPath, schemaContent, 'utf-8').catch(() => undefined);
    await writeFile(rootRouterPath, rootRouterContent, 'utf-8').catch(
      () => undefined,
    );
    await rm(sharedSchemaPath, { force: true }).catch(() => undefined);
    await rm(moduleDir, { recursive: true, force: true }).catch(
      () => undefined,
    );
    await rm(migrationDir, { recursive: true, force: true }).catch(
      () => undefined,
    );
  }

  try {
    // A partir daqui, nenhuma colisão nova é esperada — escreve tudo.
    await writeFile(schemaPath, mergedSchema, 'utf-8');
    await writeFile(sharedSchemaPath, buildSharedSchemaFile(slug), 'utf-8');

    const moduleFiles = buildModuleFiles(slug);
    for (const [relativePath, content] of Object.entries(moduleFiles)) {
      const absolutePath = join(moduleDir, relativePath);
      await mkdir(join(absolutePath, '..'), { recursive: true });
      await writeFile(absolutePath, content, 'utf-8');
    }

    await writeFile(rootRouterPath, mergedRootRouter, 'utf-8');

    await formatGeneratedCode(targetDir);

    const migrationSql = buildModuleMigrationSql(slug, tableName, {
      moduleId: randomUUID(),
      closureId: randomUUID(),
      listResourceId: randomUUID(),
      createResourceId: randomUUID(),
    });
    await mkdir(migrationDir, { recursive: true });
    await writeFile(join(migrationDir, 'migration.sql'), migrationSql, 'utf-8');

    const migrateResult = await runMigrate(targetDir);
    if (!migrateResult.ok) {
      await rollback();
      return migrateResult;
    }
  } catch (error) {
    await rollback();
    return {
      ok: false,
      error: `Falha ao gerar o módulo "${slug}": ${errorMessage(error)}`,
    };
  }

  // Fora do try/catch de rollback de propósito — ver docstring da função.
  try {
    await generatePrismaClient(targetDir);
  } catch (error) {
    return {
      ok: false,
      error: `Módulo "${slug}" gerado e migration aplicada com sucesso, mas \`prisma generate\` falhou: ${errorMessage(error)}. Rode \`pnpm --filter db run generate\` manualmente antes de usar o módulo.`,
    };
  }

  return { ok: true };
}
