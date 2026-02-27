import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^next$' }],
      'no-console': 'off',
    },
  },
  {
    ignores: [
      'node_modules/',
      'public/assets/',
      'public/js/bootstrap_js/',
      'public/css/bootstrap_css/',
      '_data/',
      '_templete/',
      'coverage/',
    ],
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
    },
  },
  eslintConfigPrettier,
];
