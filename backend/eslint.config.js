import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';

export default [
  // 1. Standard Recommended Rules
  js.configs.recommended,

  // 2. Project-Specific Configuration (Handles Code Quality and Environment)
  {
    languageOptions: {
      // Use modern ECMAScript features
      ecmaVersion: 2022,
      sourceType: 'module',
      // Define global variables used in Node.js environment
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    rules: {
      // QUALITY RULES: Rules for logic, not formatting.
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_', // Allow unused args starting with underscore
          varsIgnorePattern: '^_', // Allow unused vars starting with underscore
        },
      ],
      'no-console': 'off', // Allow console.log
      'prefer-const': 'error', // Enforce 'const' over 'let' where possible
      'no-var': 'error', // Ban 'var'
      eqeqeq: 'error', // Enforce '===' instead of '=='
      // All formatting rules (indent, quotes, semi, curly) are intentionally
      // omitted here, as Prettier will handle them.
    },
  },

  // 3. Prettier Integration (MUST BE LAST)
  // This turns off all ESLint rules that conflict with Prettier.
  prettierConfig,

  // 4. Ignored Files
  {
    ignores: ['node_modules/**', 'drizzle/**', '*.min.js'],
  },
];
