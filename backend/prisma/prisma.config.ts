import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { config as dotenvConfig } from 'dotenv';

// Load .env before reading environment variables
dotenvConfig({ path: path.join(__dirname, '..', '.env') });

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
