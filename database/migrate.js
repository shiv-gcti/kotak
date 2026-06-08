const path = require('path');

// Ensure backend dependencies are available when running this migration from the repo root.
const backendNodeModules = path.resolve(__dirname, '../backend/node_modules');
if (!module.paths.includes(backendNodeModules)) {
  module.paths.push(backendNodeModules);
}

const { Client, Pool } = require('pg');

const envPath = path.resolve(__dirname, '../backend/.env');
require('dotenv').config({ path: envPath });

const DEFAULT_DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;

async function ensureDatabaseExists() {
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: DEFAULT_DB_PORT,
    database: 'postgres',
  });

  await client.connect();
  const dbName = process.env.DB_NAME;
  const result = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName]
  );

  if (result.rowCount === 0) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`✓ Database ${dbName} created`);
  } else {
    console.log(`✓ Database ${dbName} already exists`);
  }

  await client.end();
}

async function migrate() {
  try {
    // If DATABASE_URL is provided (e.g. Supabase), skip database creation
    // and connect directly to the provided database.
    let pool;
    if (!process.env.DATABASE_URL) {
      await ensureDatabaseExists();
      pool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: DEFAULT_DB_PORT,
        max: 10,
      });
    } else {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 10,
      });
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(100) UNIQUE,
        symbol VARCHAR(50) NOT NULL,
        signal_type VARCHAR(10) NOT NULL,
        quantity INTEGER NOT NULL,
        entry_price NUMERIC(10, 2) NOT NULL,
        target_price NUMERIC(10, 2) NOT NULL,
        stop_loss NUMERIC(10, 2) NOT NULL,
        ltp NUMERIC(10, 2),
        pnl NUMERIC(10, 2),
        pnl_percentage NUMERIC(5, 2),
        order_status VARCHAR(20) DEFAULT 'PENDING',
        squareoff_status VARCHAR(20) DEFAULT 'PENDING',
        squareoff_price NUMERIC(10, 2),
        entry_time TIMESTAMPTZ DEFAULT NOW(),
        exit_time TIMESTAMPTZ NULL,
        signal_id VARCHAR(100) UNIQUE,
        webhook_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ Trades table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_cache (
        id SERIAL PRIMARY KEY,
        signal_hash VARCHAR(255) UNIQUE NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        signal_type VARCHAR(10) NOT NULL,
        quantity INTEGER NOT NULL,
        entry_price NUMERIC(10, 2) NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ Order cache table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS price_tracking (
        id SERIAL PRIMARY KEY,
        trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
        symbol VARCHAR(50) NOT NULL,
        ltp NUMERIC(10, 2) NOT NULL,
        pnl NUMERIC(10, 2),
        pnl_percentage NUMERIC(5, 2),
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ Price tracking table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS squareoff_logs (
        id SERIAL PRIMARY KEY,
        trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
        symbol VARCHAR(50) NOT NULL,
        squareoff_price NUMERIC(10, 2) NOT NULL,
        final_pnl NUMERIC(10, 2),
        final_pnl_percentage NUMERIC(5, 2),
        reason VARCHAR(100),
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ Squareoff logs table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id SERIAL PRIMARY KEY,
        webhook_data JSONB NOT NULL,
        processed BOOLEAN DEFAULT FALSE,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ Webhook logs table created');

    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_trades_updated_at ON trades;
      CREATE TRIGGER update_trades_updated_at
      BEFORE UPDATE ON trades
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('\n✓ Database migration completed successfully!');
    await pool.end();
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
