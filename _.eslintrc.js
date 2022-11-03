module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'eslint-plugin-prettier',
    'autofix',
    'import',
    'compat',
    'prettier',
    'unused-imports',
    'react-perf'
  ],
  ignorePatterns: ['**/proto_ts/**/*'],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-var-requires': 0,
    '@typescript-eslint/ban-ts-comment': 0,
    '@typescript-eslint/no-empty-interface': 0,
    '@typescript-eslint/ban-types': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-non-null-assertion': 0,
    'prettier/prettier': 'error',
    'import/order': 'error',
    'function-paren-newline': ['error', 'consistent'],
    'array-callback-return': 0,
    '@typescript-eslint/no-unused-vars': 1,
    'function-paren-newline': 0,
    'unused-imports/no-unused-imports-ts': 2,
    camelcase: 0,
    'react-hooks/exhaustive-deps': 1,
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error']
  },
  extends: [
    'react-app',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:markdown/recommended'
  ]
}
