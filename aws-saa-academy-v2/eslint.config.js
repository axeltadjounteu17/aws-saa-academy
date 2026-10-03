import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'legacy/**', 'playwright-report/**', 'test-results/**', 'dev-dist/**', 'src/data/**/*.json'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}', 'tests/unit/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Interdits par la CSP et dangereux par nature.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'react/no-danger': 'off',
      'react/jsx-no-target-blank': 'error',
    },
  },
  {
    files: ['tests/unit/**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // Outils exécutés par Node : configuration, scripts de génération, test navigateur.
    files: ['*.js', 'scripts/**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
  },
  {
    // Test navigateur : code Node, plus des fonctions exécutées dans la page (document, window).
    files: ['tests/e2e/**/*.{js,mjs}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
  },
  {
    // Script classique chargé avant React (pas un module).
    files: ['public/**/*.js'],
    languageOptions: { ecmaVersion: 2020, sourceType: 'script', globals: { ...globals.browser } },
  },
];
