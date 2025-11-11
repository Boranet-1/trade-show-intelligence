/**
 * Database Migration Runner
 *
 * Manages database schema migrations for MySQL storage adapter.
 * Supports version tracking and rollback capabilities.
 */

import mysql from 'mysql2/promise'
import { promises as fs } from 'fs'
import path from 'path'

interface MigrationConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

interface Migration {
  version: number
  name: string
  sql: string
  appliedAt?: Date
}

async function loadMigrationConfig(): Promise<MigrationConfig> {
  // Load from environment variables
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    database: process.env.MYSQL_DATABASE || 'trade_show_intelligence',
    user: process.env.MYSQL_USERNAME || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  }
}

async function createConnection(config: MigrationConfig) {
  return mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true,
  })
}

async function ensureMigrationTable(connection: mysql.Connection, dbName: string) {
  await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`)
  await connection.query(`USE ${dbName}`)

  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_applied_at (applied_at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

async function getAppliedMigrations(connection: mysql.Connection): Promise<number[]> {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    'SELECT version FROM schema_migrations ORDER BY version'
  )
  return rows.map(row => row.version)
}

async function applyMigration(
  connection: mysql.Connection,
  migration: Migration
): Promise<void> {
  console.log(`Applying migration ${migration.version}: ${migration.name}`)

  try {
    await connection.query('START TRANSACTION')

    // Execute migration SQL
    await connection.query(migration.sql)

    // Record migration
    await connection.query(
      'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
      [migration.version, migration.name]
    )

    await connection.query('COMMIT')
    console.log(`✓ Migration ${migration.version} applied successfully`)
  } catch (error) {
    await connection.query('ROLLBACK')
    throw new Error(`Failed to apply migration ${migration.version}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function runInitialSchema(connection: mysql.Connection, config: MigrationConfig) {
  console.log('Running initial schema setup...')

  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql')

  try {
    const schemaSql = await fs.readFile(schemaPath, 'utf-8')

    // Execute schema
    await connection.query(schemaSql)

    // Record as migration version 0
    await connection.query(
      'INSERT INTO schema_migrations (version, name) VALUES (0, "initial_schema") ON DUPLICATE KEY UPDATE version=version'
    )

    console.log('✓ Initial schema applied successfully')
  } catch (error) {
    throw new Error(`Failed to apply initial schema: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function runMigrations() {
  const config = await loadMigrationConfig()
  const connection = await createConnection(config)

  try {
    console.log(`Connecting to MySQL at ${config.host}:${config.port}`)

    // Ensure migration tracking table exists
    await ensureMigrationTable(connection, config.database)

    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations(connection)

    if (appliedMigrations.length === 0) {
      // No migrations applied yet, run initial schema
      await runInitialSchema(connection, config)
    } else {
      console.log(`${appliedMigrations.length} migration(s) already applied`)

      // Future: Load and apply pending migrations from database/migrations/ directory
      const migrationsDir = path.join(process.cwd(), 'database', 'migrations')

      try {
        const files = await fs.readdir(migrationsDir)
        const pendingMigrations: Migration[] = []

        for (const file of files) {
          if (!file.endsWith('.sql')) continue

          // Parse version from filename (format: V001_description.sql)
          const match = file.match(/^V(\d+)_(.+)\.sql$/)
          if (!match) {
            console.warn(`Skipping invalid migration file: ${file}`)
            continue
          }

          const version = parseInt(match[1])
          const name = match[2].replace(/_/g, ' ')

          if (!appliedMigrations.includes(version)) {
            const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8')
            pendingMigrations.push({ version, name, sql })
          }
        }

        // Sort by version
        pendingMigrations.sort((a, b) => a.version - b.version)

        if (pendingMigrations.length === 0) {
          console.log('✓ Database is up to date')
        } else {
          console.log(`Found ${pendingMigrations.length} pending migration(s)`)

          for (const migration of pendingMigrations) {
            await applyMigration(connection, migration)
          }

          console.log('✓ All migrations applied successfully')
        }
      } catch (error) {
        // Migrations directory doesn't exist or is empty
        if ((error as any).code === 'ENOENT') {
          console.log('No migrations directory found, database is up to date')
        } else {
          throw error
        }
      }
    }
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('\n✓ Migration completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n✗ Migration failed:', error)
      process.exit(1)
    })
}

export { runMigrations, loadMigrationConfig }
