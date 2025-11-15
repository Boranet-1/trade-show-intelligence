/**
 * Database Migration Runner for PostgreSQL
 *
 * Runs SQL migration files in order, tracks applied migrations,
 * and supports rollback functionality.
 *
 * Usage:
 *   npm run db:migrate          - Run all pending migrations
 *   npm run db:migrate:rollback - Rollback last migration
 *   npm run db:migrate:status   - Show migration status
 */

import { Pool } from 'pg'
import * as fs from 'fs/promises'
import * as path from 'path'

interface Migration {
  name: string
  appliedAt: Date | null
}

const MIGRATIONS_DIR = path.join(__dirname, 'migrations')
const MIGRATIONS_TABLE = 'schema_migrations'

/**
 * Create migrations tracking table if it doesn't exist
 */
async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

/**
 * Get list of all migration files
 */
async function getMigrationFiles(): Promise<string[]> {
  const files = await fs.readdir(MIGRATIONS_DIR)
  return files
    .filter(f => f.endsWith('.sql') && !f.endsWith('.down.sql'))
    .sort()
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query(
    `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY applied_at`
  )
  return new Set(result.rows.map(r => r.name))
}

/**
 * Run a single migration file
 */
async function runMigration(pool: Pool, filename: string): Promise<void> {
  const filePath = path.join(MIGRATIONS_DIR, filename)
  const sql = await fs.readFile(filePath, 'utf-8')

  console.log(`Running migration: ${filename}`)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(sql)
    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`,
      [filename]
    )
    await client.query('COMMIT')
    console.log(`✓ Applied: ${filename}`)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error(`✗ Failed: ${filename}`)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Rollback a single migration
 */
async function rollbackMigration(pool: Pool, filename: string): Promise<void> {
  const downFilename = filename.replace('.sql', '.down.sql')
  const filePath = path.join(MIGRATIONS_DIR, downFilename)

  try {
    const sql = await fs.readFile(filePath, 'utf-8')

    console.log(`Rolling back: ${filename}`)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query(
        `DELETE FROM ${MIGRATIONS_TABLE} WHERE name = $1`,
        [filename]
      )
      await client.query('COMMIT')
      console.log(`✓ Rolled back: ${filename}`)
    } catch (error) {
      await client.query('ROLLBACK')
      console.error(`✗ Rollback failed: ${filename}`)
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      throw new Error(`Rollback file not found: ${downFilename}`)
    }
    throw error
  }
}

/**
 * Run all pending migrations
 */
async function migrate(pool: Pool): Promise<void> {
  await ensureMigrationsTable(pool)

  const allMigrations = await getMigrationFiles()
  const appliedMigrations = await getAppliedMigrations(pool)

  const pendingMigrations = allMigrations.filter(m => !appliedMigrations.has(m))

  if (pendingMigrations.length === 0) {
    console.log('No pending migrations')
    return
  }

  console.log(`Found ${pendingMigrations.length} pending migration(s)\n`)

  for (const migration of pendingMigrations) {
    await runMigration(pool, migration)
  }

  console.log(`\n✓ All migrations applied successfully`)
}

/**
 * Rollback the last applied migration
 */
async function rollback(pool: Pool): Promise<void> {
  await ensureMigrationsTable(pool)

  const result = await pool.query(
    `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY applied_at DESC LIMIT 1`
  )

  if (result.rows.length === 0) {
    console.log('No migrations to roll back')
    return
  }

  const lastMigration = result.rows[0].name
  await rollbackMigration(pool, lastMigration)

  console.log('\n✓ Rollback completed successfully')
}

/**
 * Show migration status
 */
async function status(pool: Pool): Promise<void> {
  await ensureMigrationsTable(pool)

  const allMigrations = await getMigrationFiles()
  const appliedSet = await getAppliedMigrations(pool)

  console.log('\nMigration Status:')
  console.log('================\n')

  const migrations: Migration[] = allMigrations.map(name => ({
    name,
    appliedAt: appliedSet.has(name) ? new Date() : null,
  }))

  for (const migration of migrations) {
    const status = migration.appliedAt ? '✓ Applied' : '✗ Pending'
    console.log(`${status}  ${migration.name}`)
  }

  const appliedCount = migrations.filter(m => m.appliedAt).length
  const pendingCount = migrations.length - appliedCount

  console.log(`\nTotal: ${migrations.length} | Applied: ${appliedCount} | Pending: ${pendingCount}`)
}

/**
 * Main CLI runner
 */
async function main() {
  const command = process.argv[2] || 'up'

  // Load database configuration from environment
  const DATABASE_URL = process.env.DATABASE_URL

  if (!DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is required')
    console.error('Example: DATABASE_URL=postgresql://user:password@localhost:5432/database')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  })

  try {
    switch (command) {
      case 'up':
      case 'migrate':
        await migrate(pool)
        break

      case 'down':
      case 'rollback':
        await rollback(pool)
        break

      case 'status':
        await status(pool)
        break

      default:
        console.error(`Unknown command: ${command}`)
        console.error('Usage: npm run db:migrate [up|down|status]')
        process.exit(1)
    }
  } catch (error) {
    console.error('\nMigration error:')
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { migrate, rollback, status }
