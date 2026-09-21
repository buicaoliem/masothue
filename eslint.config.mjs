import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", ".claude/**", "node_modules/**", "tmp/**", "next-env.d.ts", "docs/**", "public/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
export default config;
