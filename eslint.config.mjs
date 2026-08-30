import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'prefer-const': 'warn',
      'react/jsx-no-comment-textnodes': 'warn',
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      // Next 16 enables React Compiler diagnostics in its default ruleset.
      // The compiler is deliberately disabled in this application, so retain
      // these findings as visible migration warnings instead of launch errors.
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/use-memo': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'archive/**',
    'coverage/**',
    'node_modules/**',
    'test-results/**',
  ]),
]);
