import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parser: tsParser },
    plugins: { '@typescript-eslint': tsPlugin, 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error', // the key rule (BUG-1 class)
      '@typescript-eslint/no-explicit-any': ['warn', { ignoreRestArgs: true }],
    },
  },
];
