module.exports = {
  extends: ['airbnb', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': [
      'error',
      { singleQuote: true, printWidth: 100, trailingComma: 'all', arrowParens: 'avoid' },
    ],
    'no-console': 'off',
  },
};
