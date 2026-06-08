const path = require('path');

// Ensure backend dependencies are available when running this migration from the repo root.
const backendNodeModules = path.resolve(__dirname, '../backend/node_modules');
if (!module.paths.includes(backendNodeModules)) {
  module.paths.push(backendNodeModules);
}

const mysql = require('mysql2/promise');
const envPath = path.resolve(__dirname, '../backend/.env');
require('dotenv').config({ path: envPath });

async function migrate() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    // Create database if not exists
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`
    );
    console.log(`✓ Database ${process.env.DB_NAME} created/exists`);

    await connection.changeUser({ database: process.env.DB_NAME });

    // Create trades table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(100) UNIQUE,
        symbol VARCHAR(50) NOT NULL,
        signal_type VARCHAR(10) NOT NULL,
        quantity INT NOT NULL,
        entry_price DECIMAL(10, 2) NOT NULL,
        target_price DECIMAL(10, 2) NOT NULL,
        stop_loss DECIMAL(10, 2) NOT NULL,
        ltp DECIMAL(10, 2),
        pnl DECIMAL(10, 2),
        pnl_percentage DECIMAL(5, 2),
        order_status VARCHAR(20) DEFAULT 'PENDING',
        squareoff_status VARCHAR(20) DEFAULT 'PENDING',
        squareoff_price DECIMAL(10, 2),
        entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        exit_time TIMESTAMP NULL,
        signal_id VARCHAR(100) UNIQUE,
        webhook_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (symbol),
        INDEX (order_status),
        INDEX (squareoff_status),
        INDEX (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Trades table created');

    // Create duplicate order prevention table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_cache (
        id INT AUTO_INCREMENT PRIMARY KEY,
        signal_hash VARCHAR(255) UNIQUE NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        signal_type VARCHAR(10) NOT NULL,
        quantity INT NOT NULL,
        entry_price DECIMAL(10, 2) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (timestamp),
        INDEX (symbol)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Order cache table created');

    // Create LTP tracking table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS price_tracking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trade_id INT NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        ltp DECIMAL(10, 2) NOT NULL,
        pnl DECIMAL(10, 2),
        pnl_percentage DECIMAL(5, 2),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
        INDEX (trade_id),
        INDEX (symbol),
        INDEX (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Price tracking table created');

    // Create squareoff log table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS squareoff_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trade_id INT NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        squareoff_price DECIMAL(10, 2) NOT NULL,
        final_pnl DECIMAL(10, 2),
        final_pnl_percentage DECIMAL(5, 2),
        reason VARCHAR(100),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
        INDEX (trade_id),
        INDEX (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Squareoff logs table created');

    // Create webhook logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        webhook_data JSON NOT NULL,
        processed BOOLEAN DEFAULT FALSE,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (created_at),
        INDEX (processed)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Webhook logs table created');

    console.log('\n✓ Database migration completed successfully!');
    await connection.end();
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
