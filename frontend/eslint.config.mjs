import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  // Pulls in default Next.js configurations
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript'],
  }),

  // Overrides formatting rules to let Prettier handle them
  ...compat.config({
    extends: ['prettier'],
  }),
];

export default eslintConfig;
