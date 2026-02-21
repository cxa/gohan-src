module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      excludedFiles: [
        '__tests__/**/*.ts',
        '__tests__/**/*.tsx',
        'src/route-tree.gen.ts',
      ],
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
      },
      rules: {
        '@typescript-eslint/no-deprecated': 'error',
      },
    },
  ],
};
