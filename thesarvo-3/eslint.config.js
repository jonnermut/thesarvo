//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      // Indexed access isn't typed as possibly-undefined, so this rule misfires on defensive checks.
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/naming-convention': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    // Readers never download the editor: public code reaches it only through a lazy import(), which this rule allows.
    // `npm run check-bundle` checks the built files as well.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/guide/edit/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['#/guide/edit', '#/guide/edit/*', '**/guide/edit', '**/guide/edit/*'], allowTypeImports: true, message: 'The editor is loaded lazily: use import() so readers never download it.' }] },
      ],
    },
  },
  {
    ignores: ['eslint.config.js', 'prettier.config.js', 'dist/**', '.output/**', 'public/**'],
  },
]
