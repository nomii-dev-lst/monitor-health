# Database Setup Guide

## Overview

MonitorHealth uses PostgreSQL as its database. This directory contains the database schema and initialization scripts.

---

## Quick Start

### Option 1: Using Drizzle Kit (Recommended)

```bash
cd backend
npx drizzle-kit push:pg
```

This will automatically sync your database schema with the definitions in `schema.js`.

### Option 2: Manual SQL Initialization

```bash
# Connect to your PostgreSQL database
psql "postgresql://username:password@host:port/database"

# Run the initialization script
\i backend/db/init.sql
```

### Option 3: Using psql Command Line

```bash
psql -h hostname -U username -d database -f backend/db/init.sql
```

---

## Files

### `schema.js`
- **Purpose**: Drizzle ORM schema definitions
- **Usage**: Used by the application at runtime
- **Contains**: Table definitions, relations, and indexes

### `init.sql`
- **Purpose**: Complete database initialization script
- **Usage**: For fresh database setup or manual installation
- **Contains**: All CREATE TABLE statements, indexes, and initial data

### `index.js`
- **Purpose**: Database connection and configuration
- **Usage**: Imported by the application to access the database

---

## Database Schema

### Tables

#### `users`
- User accounts and authentication
- Fields: id, username, password, email, role, refresh_token
- Indexes: username, email

#### `monitors`
- API monitoring endpoints
- Fields: id, user_id, name, url, auth_type, auth_config, validation_rules, check_interval, alert_emails, enabled, status, timestamps, statistics
- Indexes: user_id, enabled+next_check_time, status
- **Foreign Key**: user_id → users(id) ON DELETE CASCADE

#### `check_results`
- Individual health check results
- Fields: id, monitor_id, status, http_status, latency, error_message, validation_errors, response_data, response_metadata, checked_at
- Indexes: monitor_id, monitor_id+checked_at, status+checked_at, checked_at
- **Foreign Key**: monitor_id → monitors(id) ON DELETE CASCADE

#### `alerts`
- Alert notifications for status changes
- Fields: id, monitor_id, alert_type, message, recipients, email_sent, email_error, sent_at
- Indexes: monitor_id, monitor_id+sent_at, alert_type
- **Foreign Key**: monitor_id → monitors(id) ON DELETE CASCADE

#### `settings`
- Application configuration (key-value store)
- Fields: id, key, value (JSONB), description, timestamps
- Indexes: key (unique)

---

## Environment Variables

Configure your database connection in `.env`:

```env
# PostgreSQL Connection
DATABASE_URL=postgresql://username:password@host:port/database

# Or individual components
DB_HOST=localhost
DB_PORT=5432
DB_NAME=monitorhealth
DB_USER=postgres
DB_PASSWORD=your_password
```

---

## Initial Data

The `init.sql` script automatically creates:

1. **Default SMTP Settings**
   - Host: smtp.gmail.com
   - Port: 587
   - Secure: false
   - From: noreply@monitorhealth.com

2. **Default Alert Settings**
   - Suppression Time: 300 seconds (5 minutes)
   - Retry Count: 3
   - Enabled: true

**Note**: These are placeholder values. Update them through the application settings page.

---

## Migrations

### Current Approach
We use Drizzle Kit for schema management. Changes to `schema.js` can be pushed to the database using:

```bash
npx drizzle-kit push:pg
```

### Manual Migrations
If you need to run custom migrations:

1. Create a new SQL file in `backend/db/migrations/`
2. Run it manually using psql
3. Document the change in this README

---

## Verification

After initialization, verify your setup:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check row counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'monitors', COUNT(*) FROM monitors
UNION ALL
SELECT 'check_results', COUNT(*) FROM check_results
UNION ALL
SELECT 'alerts', COUNT(*) FROM alerts
UNION ALL
SELECT 'settings', COUNT(*) FROM settings;

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

---

## Backup & Restore

### Backup

```bash
# Full database backup
pg_dump -h hostname -U username database > backup.sql

# Schema only
pg_dump -h hostname -U username --schema-only database > schema.sql

# Data only
pg_dump -h hostname -U username --data-only database > data.sql
```

### Restore

```bash
# Restore from backup
psql -h hostname -U username database < backup.sql
```

---

## Troubleshooting

### Connection Issues

```bash
# Test connection
psql "postgresql://username:password@host:port/database" -c "SELECT version();"
```

### Permission Issues

```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE monitorhealth TO username;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO username;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO username;
```

### Reset Database

```bash
# Drop all tables (CAUTION: This deletes all data!)
psql -h hostname -U username database -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-initialize
psql -h hostname -U username database -f backend/db/init.sql
```

---

## Production Considerations

1. **Use Connection Pooling**: Configure `pg` pool size in `index.js`
2. **Enable SSL**: Set `ssl: true` in production
3. **Regular Backups**: Schedule automated backups
4. **Monitor Performance**: Use `pg_stat_statements` extension
5. **Index Optimization**: Monitor slow queries and add indexes as needed

---

## Support

For issues or questions:
- Check the main project README
- Review Drizzle ORM documentation: https://orm.drizzle.team/
- PostgreSQL documentation: https://www.postgresql.org/docs/
