import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const connectionString = process.env.DATABASE_URL.trim().replace(/^["']|["']$/g, '');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: connectionString },
	verbose: true,
	strict: true
});
