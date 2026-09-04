import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';
export default ts.config(
  {ignores:['node_modules/**','server/**','build/**','.docusaurus/**','generated-docs/**']},
  js.configs.recommended, ...ts.configs.recommended,
  {languageOptions:{globals:{...globals.node,...globals.browser}}},
);

