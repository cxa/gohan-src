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
        'react-hooks/exhaustive-deps': 'off',
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'react',
                importNames: ['useMemo', 'useCallback', 'memo'],
                message:
                  'React Compiler handles memoization. Do not use useMemo/useCallback/React.memo.',
              },
            ],
          },
        ],
        'no-restricted-properties': [
          'error',
          {
            object: 'React',
            property: 'useMemo',
            message: 'React Compiler handles memoization. Do not use useMemo.',
          },
          {
            object: 'React',
            property: 'useCallback',
            message:
              'React Compiler handles memoization. Do not use useCallback.',
          },
          {
            object: 'React',
            property: 'memo',
            message:
              'React Compiler handles memoization. Do not use React.memo.',
          },
        ],
      },
    },
  ],
};
