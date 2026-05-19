import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "#shared": resolve(__dirname, "src/shared"),
      "#server": resolve(__dirname, "src/server"),
      "#tests": resolve(__dirname, "tests"),
    },
  },
  test: {
    include: ["tests/server/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/server/**/*.ts"],
      exclude: [
        'src/server/application/ports/**/*.ts',
        "src/server/index.ts",
        "src/server/server.ts",
      ],
      thresholds: {
        // Domain and application layers: 100%
        "src/server/domain/**/*.ts": {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        "src/server/application/**/*.ts": {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        // Infrastructure and presentation: broad coverage
        "src/server/infrastructure/**/*.ts": {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        "src/server/presentation/**/*.ts": {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
