import { config } from "@remotion/eslint-config-flat";

export default [
  ...config,
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
];
