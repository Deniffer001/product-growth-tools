import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    server: {
      deps: {
        // @deniffer/cli-kit ships raw .ts (bun-native); inline it so vitest transpiles it.
        inline: [/@deniffer\/cli-kit/],
      },
    },
  },
});
