import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "schema.prisma"),
  migrate: {
    async resolve({ datasourceUrl }) {
      return datasourceUrl ?? process.env.DATABASE_URL!;
    },
  },
});
