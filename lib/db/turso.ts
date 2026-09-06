import 'server-only';
import { connect } from '@tursodatabase/serverless';

let connection: ReturnType<typeof connect> | undefined;

export function getTursoConnection() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('TURSO_DATABASE_URL is required on the server');
  if (!authToken) throw new Error('TURSO_AUTH_TOKEN is required on the server');
  connection ??= connect({ url, authToken, defaultQueryTimeout: 15_000 });
  return connection;
}

export function getDatabaseProvider(): 'mongodb' | 'turso' {
  const provider = process.env.DATABASE_PROVIDER ?? 'mongodb';
  if (provider !== 'mongodb' && provider !== 'turso') {
    throw new Error('DATABASE_PROVIDER must be mongodb or turso');
  }
  return provider;
}
