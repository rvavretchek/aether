import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Este repo é só o CLI aether-admin (src/, bin/) — o resto do diretório é a
    // instalação do BMAD Method (planejamento, não código do CLI), fora do escopo do lint.
    ignores: [
      'node_modules/**',
      '_bmad/**',
      '_bmad-output/**',
      'design-artifacts/**',
      'docs/**',
      '.agent/**',
      '.agents/**',
      '.claude/**',
      '.qwen/**',
      '.opencode/**',
      '.github/**',
    ],
  },
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js', 'bin/aether-admin.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
