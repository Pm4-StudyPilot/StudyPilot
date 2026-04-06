import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import requireConsoleErrorInCatch from './eslint/rules/require-console-error.mjs';
import noConsole from './eslint/rules/no-console.mjs';

const lintingPlugin = {
  meta: {},
  rules: {
    'require-console-error-in-catch': requireConsoleErrorInCatch,
    'no-console': noConsole,
  },
};

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    plugins: {
      'linting-rules': lintingPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'linting-rules/require-console-error-in-catch': 'error',
      'linting-rules/no-console': 'error',
    },
  },
  prettierConfig
);
