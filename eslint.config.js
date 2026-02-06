import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'build/'],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        chrome: 'readonly',
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-var': 'off',
      ...prettierConfig.rules,
    },
  }
);
