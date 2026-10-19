import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => ({
  test: {
    include: ["src/**/*.test.js"],
    // Lê o .env e o .env.local (o "" carrega todas as variáveis, não só as VITE_),
    // para os testes de contrato do PostgreSQL usarem a base de dados real.
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
