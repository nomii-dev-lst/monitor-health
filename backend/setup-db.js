import 'dotenv/config';
import postgres from 'postgres';

/**
 * Database setup script
 * Creates all tables, indexes, and initial data
 */

async function setupDatabase() {
  try {
    console.log('🔧 Setting up database...\n');

    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Create connection
    const sql = postgres(connectionString, { max: 1 });

    console.log('✓ Connected to database');

    // Create tables using raw SQL
    console.log('\n📋 Creating tables...\n');

    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        refresh_token TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ Created users table');

    await sql`CREATE INDEX IF NOT EXISTS username_idx ON users(username)`;
    await sql`CREATE INDEX IF NOT EXISTS email_idx ON users(email)`;

    // Monitors table
    await sql`
      CREATE TABLE IF NOT EXISTS monitors (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
      )
    `;
    console.log('✓ Created monitors table');

    await sql`CREATE INDEX IF NOT EXISTS user_id_idx ON monitors(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS enabled_next_check_idx ON monitors(enabled, next_check_time)`;
    await sql`CREATE INDEX IF NOT EXISTS status_idx ON monitors(status)`;

    // Check results table
    await sql`
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
      )
    `;
    console.log('✓ Created check_results table');

    await sql`CREATE INDEX IF NOT EXISTS monitor_id_idx ON check_results(monitor_id)`;
    await sql`CREATE INDEX IF NOT EXISTS monitor_id_checked_at_idx ON check_results(monitor_id, checked_at)`;
    await sql`CREATE INDEX IF NOT EXISTS status_checked_at_idx ON check_results(status, checked_at)`;
    await sql`CREATE INDEX IF NOT EXISTS checked_at_idx ON check_results(checked_at)`;

    // Alerts table
    await sql`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
        alert_type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        recipients JSONB NOT NULL,
        email_sent BOOLEAN NOT NULL DEFAULT false,
        email_error TEXT,
        sent_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ Created alerts table');

    await sql`CREATE INDEX IF NOT EXISTS alert_monitor_id_idx ON alerts(monitor_id)`;
    await sql`CREATE INDEX IF NOT EXISTS monitor_id_sent_at_idx ON alerts(monitor_id, sent_at)`;
    await sql`CREATE INDEX IF NOT EXISTS alert_type_idx ON alerts(alert_type)`;

    // Settings table
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) NOT NULL UNIQUE,
        value JSONB NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✓ Created settings table');

    await sql`CREATE INDEX IF NOT EXISTS settings_key_idx ON settings(key)`;

    // Insert default settings
    console.log('\n⚙️  Creating default settings...\n');

    await sql`
      INSERT INTO settings (key, value, description)
      VALUES (
        'smtp',
        ${JSON.stringify({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
          },
          from: process.env.SMTP_FROM || 'noreply@monitorhealth.com',
        })},
        'SMTP email configuration'
      )
      ON CONFLICT (key) DO NOTHING
    `;
    console.log('✓ Created SMTP settings');

    await sql`
      INSERT INTO settings (key, value, description)
      VALUES (
        'alerts',
        ${JSON.stringify({
          suppressionTime: 300,
          retryCount: 3,
          enabled: true,
        })},
        'Alert configuration'
      )
      ON CONFLICT (key) DO NOTHING
    `;
    console.log('✓ Created alert settings');

    // Verify setup
    console.log('\n🔍 Verifying setup...\n');

    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log('Tables created:');
    tables.forEach((t) => console.log(`  - ${t.table_name}`));

    await sql.end();

    console.log('\n✅ Database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Visit http://localhost:3000/signup');
    console.log('   3. Create your admin account\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

setupDatabase();
