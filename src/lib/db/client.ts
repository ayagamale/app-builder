import { Pool } from "pg";

let pool: Pool | null = null;

/**
 * Lazily create a single PostgreSQL connection pool for the whole app.
 * The DATABASE_URL is set by docker-compose; in dev it points at the
 * `db` service, in production it would be a managed Postgres / Supabase URL.
 */
export function getDb(): Pool {
  if (pool) return pool;

  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://vibebuild:vibebuild_dev@db:5432/vibebuild";

  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on("error", (err) => {
    console.error("[db] pool error:", err);
  });

  return pool;
}

/** Run a parameterised query and return the rows. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = getDb();
  const res = await db.query(text, params);
  return res.rows as T[];
}

/** Run a parameterised query and return the first row (or null). */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}
