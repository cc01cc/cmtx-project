import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: { 
      globals: globals.node 
    },
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      // 禁止在函数内使用动态导入（强制使用顶层静态导入）
      "no-restricted-syntax": [
        "error",
        {
          selector: "AwaitExpression > ImportExpression",
          message: "Use static imports at the top of the file instead of dynamic imports inside functions. Dynamic imports should only be used for code splitting or conditional loading.",
        },
        {
          selector: "CallExpression[callee.type='Import']",
          message: "Use static imports at the top of the file instead of dynamic import(). Dynamic imports should only be used for code splitting or conditional loading.",
        },
      ],
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
