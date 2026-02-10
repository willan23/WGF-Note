import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL not set — using local sqlite at ./drizzle/dev.sqlite for development');
}

const isSqliteFallback = !connectionString;

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: isSqliteFallback ? "sqlite" : "mysql",
  dbCredentials: isSqliteFallback
    ? {
        url: `file:./drizzle/dev.sqlite`,
      }
    : {
        url: connectionString,
      },
});
