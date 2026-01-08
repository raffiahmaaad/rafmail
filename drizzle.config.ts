import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load environment variables from .env.local (Next.js standard)
config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
