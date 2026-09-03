export function buildDbFiles(): Record<string, string> {
  return {
    // Primeira vez de verdade instalando prisma/@prisma/client/@prisma/adapter-pg —
    // Story 1.1 deixou isso pendente deliberadamente (sem model, nada real pra gerar).
    // `pg` não precisa entrar aqui: já é dependência direta de @prisma/adapter-pg.
    'package.json':
      JSON.stringify(
        {
          name: 'db',
          version: '0.0.1',
          private: true,
          type: 'module',
          exports: {
            './client': './src/client.ts',
          },
          scripts: {
            generate: 'prisma generate',
            migrate: 'prisma migrate dev',
          },
          dependencies: {
            prisma: '7.10.0',
            '@prisma/client': '7.10.0',
            '@prisma/adapter-pg': '7.10.0',
          },
          devDependencies: {
            typescript: '5.9.3',
          },
        },
        null,
        2,
      ) + '\n',

    // prisma.config.ts fica na raiz do pacote (fora de src/) — convenção do Prisma 7,
    // não pode mover. rootDir continua '.' por causa disso; src/ entra no include também.
    'tsconfig.json':
      JSON.stringify(
        {
          extends: '../../tsconfig.base.json',
          compilerOptions: {
            composite: true,
            outDir: 'dist',
            rootDir: '.',
          },
          include: ['prisma.config.ts', 'src/**/*.ts'],
        },
        null,
        2,
      ) + '\n',

    // Tenant/User (FR-11 parcial, ver Dev Notes da Story 2.1 sobre o corte com a Epic 3) +
    // RefreshToken (FR-9, TokenRevocationStore). Sem `@default` de banco pro id — uuid(7) é
    // gerado pelo próprio Prisma Client antes do INSERT, não uma expressão SQL (confirmado
    // via `prisma migrate diff` real contra este schema — a migration abaixo reflete isso:
    // colunas de id são TEXT NOT NULL, sem DEFAULT).
    'schema.prisma': [
      'generator client {',
      '  provider = "prisma-client-js"',
      '}',
      '',
      'datasource db {',
      '  provider = "postgresql"',
      '}',
      '',
      'model Tenant {',
      '  id        String   @id @default(uuid(7))',
      '  name      String',
      '  createdAt DateTime @default(now()) @map("created_at")',
      '  updatedAt DateTime @updatedAt @map("updated_at")',
      '  users     User[]',
      '',
      '  @@map("tenants")',
      '}',
      '',
      '// Grupo/Papel/Módulo/ModuleClosure e as relações que ligam User a eles ficam pra',
      '// Epic 3 (FR-11 parcial) — ver Dev Notes da Story 2.1. Esta migration é a base que',
      '// a Epic 3 estende, nunca recria.',
      'model User {',
      '  id           String   @id @default(uuid(7))',
      '  tenantId     String   @map("tenant_id")',
      '  email        String',
      '  passwordHash String   @map("password_hash")',
      '  createdAt    DateTime @default(now()) @map("created_at")',
      '  updatedAt    DateTime @updatedAt @map("updated_at")',
      '',
      '  tenant        Tenant         @relation(fields: [tenantId], references: [id])',
      '  refreshTokens RefreshToken[]',
      '',
      '  @@unique([tenantId, email])',
      '  @@map("users")',
      '}',
      '',
      '// jti é o hash do refresh token opaco (crypto.randomBytes(32) base64url), nunca o',
      '// valor bruto — mesmo racional do pepper (Story 2.1, Task 4.3): nunca persistir um',
      '// segredo em texto recuperável. tenantId é denormalizado de User (sem @relation pra',
      '// Tenant — só otimização de leitura pro refresh não precisar de um segundo join;',
      '// consistência garantida na escrita, copiado de user.tenantId em issue()).',
      'model RefreshToken {',
      '  jti       String    @id',
      '  userId    String    @map("user_id")',
      '  tenantId  String    @map("tenant_id")',
      '  issuedAt  DateTime  @default(now()) @map("issued_at")',
      '  expiresAt DateTime  @map("expires_at")',
      '  revokedAt DateTime? @map("revoked_at")',
      '',
      '  user User @relation(fields: [userId], references: [id])',
      '',
      '  @@index([userId])',
      '  @@map("refresh_tokens")',
      '}',
      '',
    ].join('\n'),

    // Prisma 7: `datasource` no schema.prisma só declara o provider — a connection string
    // real vem daqui (nunca hardcoded no schema). Sem `adapter` aqui — isso é opção do
    // PrismaClient em runtime (ver src/client.ts), não do config file (confirmado nos
    // tipos de @prisma/config 7.10.0: PrismaConfig não tem campo `adapter`).
    //
    // NÃO usa o helper `env()` do @prisma/config — ele LANÇA se a variável não estiver
    // em process.env, e nada carrega .env.development pro processo que roda `prisma
    // generate`/`migrate` (o `--env-file` só está no script `dev` de apps/api, não nos
    // comandos de CLI do Prisma disparados por `aether-admin new`) — achado real da
    // Story 2.1, Task 7: `aether-admin new` quebrava na primeira
    // regeneração porque `prisma generate` roda como parte do próprio `new`, sem
    // servidor nenhum no ar ainda. Fallback pro mesmo valor de dev não-secreto já usado
    // em .env.development/docker-compose.dev.yml (FR-6, zero edição manual) — DATABASE_URL
    // real (produção) sempre tem prioridade se estiver setada.
    'prisma.config.ts': [
      "import { defineConfig } from 'prisma/config';",
      '',
      'export default defineConfig({',
      "  schema: 'schema.prisma',",
      '  datasource: {',
      '    url:',
      '      process.env.DATABASE_URL ??',
      "      'postgresql://aether_dev:aether_dev_password@localhost:5432/aether_dev',",
      '  },',
      '});',
      '',
    ].join('\n'),

    // Migration inicial gerada via `prisma migrate diff --from-empty --to-schema
    // schema.prisma --script` real contra este schema exato (sem precisar de Postgres
    // rodando — só computa o diff local). Nome de pasta segue a convenção de timestamp
    // do Prisma (YYYYMMDDHHMMSS_nome).
    'migrations/migration_lock.toml': [
      '# Please do not edit this file manually',
      '# It should be added in your version-control system (e.g., Git)',
      'provider = "postgresql"',
      '',
    ].join('\n'),

    'migrations/20260901000000_init_auth/migration.sql': [
      '-- CreateSchema',
      'CREATE SCHEMA IF NOT EXISTS "public";',
      '',
      '-- CreateTable',
      'CREATE TABLE "tenants" (',
      '    "id" TEXT NOT NULL,',
      '    "name" TEXT NOT NULL,',
      '    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,',
      '    "updated_at" TIMESTAMP(3) NOT NULL,',
      '',
      '    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")',
      ');',
      '',
      '-- CreateTable',
      'CREATE TABLE "users" (',
      '    "id" TEXT NOT NULL,',
      '    "tenant_id" TEXT NOT NULL,',
      '    "email" TEXT NOT NULL,',
      '    "password_hash" TEXT NOT NULL,',
      '    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,',
      '    "updated_at" TIMESTAMP(3) NOT NULL,',
      '',
      '    CONSTRAINT "users_pkey" PRIMARY KEY ("id")',
      ');',
      '',
      '-- CreateTable',
      'CREATE TABLE "refresh_tokens" (',
      '    "jti" TEXT NOT NULL,',
      '    "user_id" TEXT NOT NULL,',
      '    "tenant_id" TEXT NOT NULL,',
      '    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,',
      '    "expires_at" TIMESTAMP(3) NOT NULL,',
      '    "revoked_at" TIMESTAMP(3),',
      '',
      '    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("jti")',
      ');',
      '',
      '-- CreateIndex',
      'CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");',
      '',
      '-- CreateIndex',
      'CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");',
      '',
      '-- AddForeignKey',
      'ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
      '',
      '-- AddForeignKey',
      'ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
      '',
    ].join('\n'),

    // Instância única do PrismaClient com o driver adapter Postgres (sem engine binário
    // de query — Prisma 7 usa WASM query-compiler + driver adapter). Lida por
    // core/providers.ts (Task 5) e pelo repository.ts de módulos de negócio (Epic 3) — não
    // é uma extensão tenant-aware ainda (ver Dev Notes da Story 2.1, AD-5).
    'src/client.ts': [
      "import { PrismaPg } from '@prisma/adapter-pg';",
      "import { PrismaClient } from '@prisma/client';",
      '',
      'const adapter = new PrismaPg({',
      '  connectionString: process.env.DATABASE_URL ?? \'\',',
      '});',
      '',
      'export const prisma = new PrismaClient({ adapter });',
      '',
    ].join('\n'),
  };
}
