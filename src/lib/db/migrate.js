// Database migration runner — executes schema.sql on startup.
// Plain JS (CommonJS) so it runs with `node` directly, no TS compiler needed.
const { readFileSync } = require("fs");
const { join, dirname } = require("path");
const { fileURLToPath } = require("url");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://vibebuild:vibebuild_dev@db:5432/vibebuild";

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 10_000 });

  // Wait for the database to be ready (retry for up to 30s)
  for (let i = 0; i < 15; i++) {
    try {
      await pool.query("SELECT 1");
      break;
    } catch (e) {
      if (i === 14) throw new Error("Database not ready after 30s: " + e.message);
      console.log("[migrate] waiting for database...");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Run the schema
  const schemaPath = join(__dirname, "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  await pool.query(schema);
  console.log("[migrate] schema applied");

  // Seed the initial admin user if none exists
  const existing = await pool.query(
    "SELECT id FROM users WHERE role = 'super_admin' LIMIT 1"
  );
  if (existing.rows.length === 0) {
    const email = process.env.ADMIN_EMAIL || "admin@vibebuild.local";
    const password = process.env.ADMIN_PASSWORD || "admin123456";
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'super_admin') ON CONFLICT (email) DO NOTHING",
      [email, hash]
    );
    console.log("[migrate] created super_admin: " + email);
  }

  // Seed default system settings
  await pool.query(`
    INSERT INTO system_settings (key, value) VALUES
      ('platform_name', 'VibeBuild'),
      ('default_compatibility_type', 'openai'),
      ('cooldown_seconds', '60'),
      ('max_retries_per_model', '3')
    ON CONFLICT (key) DO NOTHING
  `);
  console.log("[migrate] system settings seeded");

  await pool.end();
  console.log("[migrate] done");
}

main().catch((err) => {
  console.error("[migrate] FAILED:", err);
  process.exit(1);
});
