import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Strip quotes and whitespace (env files / Docker can leave these on)
const connectionString = env.DATABASE_URL.trim().replace(/^["']|["']$/g, '');

const client = neon(connectionString);

export const db = drizzle(client, { schema });
