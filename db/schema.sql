-- SUMAT Eastvicians database schema
-- Students never create accounts (the portal uses a per-report verification form,
-- not a login), so only staff/admin accounts live in the users table.

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'SYSTEM_OPERATOR',
    'PRINCIPAL',
    'GUIDANCE_COUNSELOR',
    'CHILD_PROTECTION_COMMITTEE',
    'ICT_ADMINISTRATOR',
    'SSLG_PRESIDENT',
    'DESIGNATED_SCHOOL_ADMINISTRATOR'
  )),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  report_id TEXT NOT NULL UNIQUE,
  reporter_full_name TEXT NOT NULL,
  reporter_grade_level TEXT NOT NULL,
  reporter_section TEXT NOT NULL,
  reporter_student_id TEXT,
  privacy_mode TEXT NOT NULL CHECK (privacy_mode IN ('confidential_report', 'confidential_identity')),
  category_key TEXT NOT NULL,
  category_label TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  title TEXT NOT NULL,
  report_date DATE,
  report_location TEXT,
  description TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_office TEXT,
  assigned_personnel TEXT,
  internal_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN (
    'Pending', 'Under Review', 'Forwarded', 'Waiting for Student', 'Resolved', 'Closed', 'Rejected'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
CREATE INDEX IF NOT EXISTS reports_category_idx ON reports(category_key);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports(created_at DESC);

CREATE TABLE IF NOT EXISTS report_history (
  id BIGSERIAL PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  remarks TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_sequence (
  sequence_key INTEGER PRIMARY KEY CHECK (sequence_key = 1),
  current_value BIGINT NOT NULL DEFAULT 0
);

INSERT INTO report_sequence (sequence_key, current_value)
VALUES (1, 0)
ON CONFLICT (sequence_key) DO NOTHING;
