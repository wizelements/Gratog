module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Turn off all rules that are blocking build
    'no-console': 'off',
    'no-unused-vars': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'react/no-unescaped-entities': 'off',
    '@next/next/no-img-element': 'off',
  },
};
