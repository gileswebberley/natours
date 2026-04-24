import { defineConfig } from 'eslint/config';
import prettier from 'eslint-plugin-prettier';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import globals from 'globals';
import { fixupConfigRules } from '@eslint/compat';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  {
    files: ['**/*.{js,jsx}'],

    // 2. Set up the environment (Node and Browser)
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    extends: [
      ...fixupConfigRules(
        compat.extends('airbnb', 'prettier', 'plugin:node/recommended'),
      ),
    ],

    plugins: {
      prettier,
    },
    // 2. Explicitly set React version to '999.999.999' or 'detect' to bypass auto-detection crash
    settings: {
      react: {
        version: 'detect',
      },
    },

    rules: {
      // 1. Fix Windows line-ending errors
      'prettier/prettier': ['error', { endOfLine: 'auto' }],

      // 2. Allow .js extensions in imports (Required for Node ESM)
      'import/extensions': 'off',

      // 3. Allow named exports even if there is only one
      'import/prefer-default-export': 'off',
      'import/no-extraneous-dependencies': 'off',
      'spaced-comment': 'off',
      'no-console': 'off',
      'consistent-return': 'off',
      'func-names': 'off',
      'object-shorthand': 'off',
      'no-process-exit': 'off',
      'no-param-reassign': 'off',
      'no-return-await': 'off',
      'no-else-return': 'off',
      'no-underscore-dangle': 'off',
      'class-methods-use-this': 'off',
      'prefer-object-spread': 'off',
      'prefer-const': 'warn',
      'lines-between-class-members': 'off',
      'prefer-arrow-callback': 'off',
      'no-use-before-define': ['error', { functions: false }],

      'prefer-destructuring': [
        'error',
        {
          object: true,
          array: false,
        },
      ],

      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: 'req|res|next|val',
        },
      ],
      // React specific override if needed:
      'react/prop-types': 'off',
    },
  },
]);
