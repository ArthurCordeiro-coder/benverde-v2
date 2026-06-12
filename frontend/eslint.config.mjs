import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "_deadcode-backup/**",
      // Scripts soltos de depuração (gitignored, fora do app)
      "test-*.js",
      "test-*.ts",
      "scripts-tmp-*.mjs",
    ],
  },
];

export default config;
