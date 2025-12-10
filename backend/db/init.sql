-- MonitorHealth Database Initialization
-- This script creates all necessary tables, indexes, and constraints
-- Run this on a fresh PostgreSQL database

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  refresh_token TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS username_idx ON users(username);
CREATE INDEX IF NOT EXISTS email_idx ON users(email);

-- ============================================
-- COLLECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS collection_user_id_idx ON collections(user_id);

-- ============================================
-- MONITORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS monitors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  auth_type VARCHAR(50) NOT NULL DEFAULT 'none',
  auth_config JSONB NOT NULL DEFAULT '{}',
  validation_rules JSONB NOT NULL DEFAULT '{"statusCode": 200}',
  check_interval INTEGER NOT NULL DEFAULT 30,
  alert_emails JSONB NOT NULL DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  last_check_time TIMESTAMP,
  next_check_time TIMESTAMP,
  last_latency INTEGER,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  total_checks INTEGER NOT NULL DEFAULT 0,
  successful_checks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_id_idx ON monitors(user_id);
CREATE INDEX IF NOT EXISTS collection_id_idx ON monitors(collection_id);
CREATE INDEX IF NOT EXISTS enabled_next_check_idx ON monitors(enabled, next_check_time);
CREATE INDEX IF NOT EXISTS status_idx ON monitors(status);

-- ============================================
-- CHECK RESULTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS check_results (
  id SERIAL PRIMARY KEY,
  monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  http_status INTEGER,
  latency INTEGER NOT NULL,
  error_message TEXT,
  validation_errors JSONB NOT NULL DEFAULT '[]',
  response_data TEXT,
  response_metadata JSONB,
  checked_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS monitor_id_idx ON check_results(monitor_id);
CREATE INDEX IF NOT EXISTS monitor_id_checked_at_idx ON check_results(monitor_id, checked_at);
CREATE INDEX IF NOT EXISTS status_checked_at_idx ON check_results(status, checked_at);
CREATE INDEX IF NOT EXISTS checked_at_idx ON check_results(checked_at);

-- ============================================
-- ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  recipients JSONB NOT NULL,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_error TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alert_monitor_id_idx ON alerts(monitor_id);
CREATE INDEX IF NOT EXISTS monitor_id_sent_at_idx ON alerts(monitor_id, sent_at);
CREATE INDEX IF NOT EXISTS alert_type_idx ON alerts(alert_type);

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS settings_key_idx ON settings(key);

-- ============================================
-- INITIAL DATA (Optional)
-- ============================================

-- Insert default SMTP settings (if not exists)
INSERT INTO settings (key, value, description)
VALUES (
  'smtp',
  '{
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "",
      "pass": ""
    },
    "from": "noreply@monitorhealth.com"
  }',
  'SMTP email configuration'
)
ON CONFLICT (key) DO NOTHING;

-- Insert default alert settings (if not exists)
INSERT INTO settings (key, value, description)
VALUES (
  'alerts',
  '{
    "suppressionTime": 300,
    "retryCount": 3,
    "enabled": true
  }',
  'Alert configuration'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Uncomment to verify installation:
-- SELECT 'Users table' as table_name, COUNT(*) as count FROM users
-- UNION ALL
-- SELECT 'Monitors table', COUNT(*) FROM monitors
-- UNION ALL
-- SELECT 'Check Results table', COUNT(*) FROM check_results
-- UNION ALL
-- SELECT 'Alerts table', COUNT(*) FROM alerts
-- UNION ALL
-- SELECT 'Settings table', COUNT(*) FROM settings;
