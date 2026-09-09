CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(254) UNIQUE NOT NULL CHECK (email = lower(email)),
  password_hash TEXT NOT NULL,
  center_id UUID NOT NULL REFERENCES centers(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'teacher', 'parent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disabled_at TIMESTAMPTZ
);
CREATE TABLE app_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX app_sessions_expiry_idx ON app_sessions (expires_at);
CREATE INDEX app_sessions_user_idx ON app_sessions (user_id);
CREATE TABLE login_attempts (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX login_attempts_expiry_idx ON login_attempts (expires_at);
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES app_users(id),
  center_id UUID NOT NULL REFERENCES centers(id),
  action TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_center_time_idx ON audit_events (center_id, created_at);
