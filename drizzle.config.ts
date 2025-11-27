import type { Config } from 'drizzle-kit';

export default {
  schema: './prisma/schema.d1.ts',
  out: './prisma/migrations',
  driver: 'd1',
  dbCredentials: {
    wranglerConfigPath: './wrangler.toml',
    dbName: 'gamification-db',
  },
} satisfies Config;

