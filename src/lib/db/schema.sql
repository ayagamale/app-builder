-- ============================================================================
-- Provider-Agnostic AI Platform Schema
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users & RBAC ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('super_admin', 'admin', 'user')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── AI Providers ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_providers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL UNIQUE,
  base_url            TEXT NOT NULL,
  auth_header_name    TEXT NOT NULL DEFAULT 'Authorization',
  auth_header_prefix  TEXT NOT NULL DEFAULT 'Bearer ',
  compatibility_type  TEXT NOT NULL DEFAULT 'openai'
                      CHECK (compatibility_type IN ('openai', 'anthropic', 'custom')),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  priority            INTEGER NOT NULL DEFAULT 100,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── AI Models ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_models (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  display_name TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  priority     INTEGER NOT NULL DEFAULT 100,
  max_tokens   INTEGER,
  temperature   REAL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, name)
);

-- ─── API Credentials (encrypted at rest) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS api_credentials (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id             UUID NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  label                TEXT NOT NULL,
  encrypted_key        TEXT NOT NULL,
  key_iv               TEXT NOT NULL,
  key_auth_tag         TEXT NOT NULL,
  key_suffix           TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'disabled', 'rate_limited',
                           'quota_exhausted', 'invalid', 'error', 'suspended',
                           'cooling_down', 'testing', 'unknown')),
  priority             INTEGER NOT NULL DEFAULT 100,
  cooldown_until       TIMESTAMPTZ,
  last_used_at         TIMESTAMPTZ,
  total_requests       INTEGER NOT NULL DEFAULT 0,
  successful_requests  INTEGER NOT NULL DEFAULT 0,
  failed_requests      INTEGER NOT NULL DEFAULT 0,
  last_error           TEXT,
  last_error_at        TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_credentials_model ON api_credentials(model_id);
CREATE INDEX IF NOT EXISTS idx_api_credentials_status ON api_credentials(status);

-- ─── Roles & Permissions (RBAC) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'general',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- ─── Routing Rules ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routing_rules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  model_id   UUID NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  priority   INTEGER NOT NULL DEFAULT 100,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Fallback Rules ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fallback_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  from_model_id  UUID NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  to_model_id    UUID NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  priority       INTEGER NOT NULL DEFAULT 100,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Audit Logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  action               TEXT NOT NULL,
  entity_type          TEXT,
  entity_id            TEXT,
  provider_id          UUID,
  model_id             UUID,
  api_credential_id    UUID,
  reason               TEXT,
  outcome              TEXT NOT NULL DEFAULT 'success',
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ─── Notifications ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  level      TEXT NOT NULL DEFAULT 'info'
             CHECK (level IN ('info', 'warning', 'error', 'success')),
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = false;

-- ─── Projects (with user ownership) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'archived', 'building', 'error')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

-- ─── System Settings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I; '
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t
    );
  END LOOP;
END $$;
