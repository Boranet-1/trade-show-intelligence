# Database Migrations and Deployment

This directory contains PostgreSQL schema migrations and deployment configurations for the Trade Show Intelligence Platform.

## Quick Start

### Prerequisites

- PostgreSQL 14+ or Neon Serverless PostgreSQL account
- Node.js 18+
- `pg` package installed (`npm install pg`)

### Environment Setup

Create a `.env.local` file with your database connection string:

```bash
# For local PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/tradeshow

# For Neon (recommended for production)
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/tradeshow?sslmode=require
```

### Running Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Rollback last migration
npm run db:migrate:rollback
```

## Neon Serverless PostgreSQL Deployment

Neon is the recommended production database for this platform. It provides:

- Serverless PostgreSQL with automatic scaling
- Built-in connection pooling
- Branching for development/staging environments
- Generous free tier (500MB storage, 0.5GB RAM)

### Setting Up Neon

1. **Create Neon Account**
   - Go to [https://neon.tech](https://neon.tech)
   - Sign up with GitHub/email
   - Create new project

2. **Get Connection String**
   ```
   Navigate to: Project → Settings → Connection Details
   Copy the connection string (it will look like):
   postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/tradeshow?sslmode=require
   ```

3. **Configure Environment**
   ```bash
   # Add to .env.local
   DATABASE_URL=<your-neon-connection-string>

   # Optional: Configure storage adapter in platform
   STORAGE_ADAPTER_TYPE=postgresql
   ```

4. **Run Migrations**
   ```bash
   npm run db:migrate
   ```

5. **Verify Connection**
   ```bash
   npm run db:test-connection
   ```

### Neon Branch Workflow

Neon supports database branching similar to Git:

```bash
# Create development branch
neonctl branches create development --parent main

# Create staging branch
neonctl branches create staging --parent main

# Use different connection strings per environment
DATABASE_URL_DEV=postgresql://...@ep-dev-xxx.neon.tech/tradeshow
DATABASE_URL_STAGING=postgresql://...@ep-staging-xxx.neon.tech/tradeshow
DATABASE_URL_PROD=postgresql://...@ep-main-xxx.neon.tech/tradeshow
```

## Migration Files

### File Structure

```
db/
├── migrations/
│   ├── 001_initial_schema.sql         # Up migration
│   ├── 001_initial_schema.down.sql    # Rollback migration
│   └── ...
├── migrate.ts                          # Migration runner
└── README.md                           # This file
```

### Creating New Migrations

1. **Create Migration Files**
   ```bash
   # Naming convention: NNN_description.sql
   touch db/migrations/002_add_meddic_scores.sql
   touch db/migrations/002_add_meddic_scores.down.sql
   ```

2. **Write Up Migration** (`002_add_meddic_scores.sql`):
   ```sql
   -- Add MEDDIC score columns
   ALTER TABLE enriched_companies ADD COLUMN meddic_score JSONB;
   CREATE INDEX idx_enriched_companies_meddic ON enriched_companies((meddic_score->>'overallScore'));
   ```

3. **Write Down Migration** (`002_add_meddic_scores.down.sql`):
   ```sql
   -- Remove MEDDIC score columns
   DROP INDEX IF EXISTS idx_enriched_companies_meddic;
   ALTER TABLE enriched_companies DROP COLUMN IF EXISTS meddic_score;
   ```

4. **Test Locally**
   ```bash
   npm run db:migrate        # Apply
   npm run db:migrate:status # Verify
   npm run db:migrate:rollback # Test rollback
   npm run db:migrate        # Re-apply
   ```

## Database Schema

### Core Tables

- **events**: Trade show events (root entity)
- **badge_scans**: Raw lead capture data
- **enriched_companies**: AI-enriched company intelligence
- **personas**: Ideal customer profile templates
- **persona_matches**: Lead scoring results
- **reports**: Analytical reports
- **markdown_reports**: Generated summaries (CRO, Company, Contact, Merged)
- **lists**: Custom lead lists (FR-030)
- **tags**: Lead categorization tags (FR-029)
- **storage_configurations**: Multi-adapter config

### Entity Relationships

```
events (1) ──< (N) badge_scans
badge_scans (1) ──< (1) enriched_companies
badge_scans (1) ──< (N) persona_matches
personas (1) ──< (N) persona_matches
events (1) ──< (N) reports
events (1) ──< (N) markdown_reports
badge_scans (N) ──< (N) tags (via badge_scan_tags)
```

## Production Deployment Checklist

- [ ] Neon project created
- [ ] Connection string added to `.env.local`
- [ ] Migrations run successfully (`npm run db:migrate`)
- [ ] Connection test passes (`npm run db:test-connection`)
- [ ] Storage adapter configured (`STORAGE_ADAPTER_TYPE=postgresql`)
- [ ] Backup strategy configured (Neon auto-backups daily)
- [ ] Monitoring enabled (Neon dashboard metrics)
- [ ] Connection pooling configured (handled by Neon)

## Performance Tuning

### Indexes

All critical indexes are created in migrations:

- `badge_scans`: event_id, email, company, enrichment_status, proximity_group_id
- `enriched_companies`: badge_scan_id, company_name, industry, company_tier
- `persona_matches`: badge_scan_id, persona_id, fit_score
- `markdown_reports`: event_id, badge_scan_id, report_type

### Connection Pooling

PostgreSQL adapter uses `pg` Pool with:

- **Max connections**: 20 (configurable)
- **Idle timeout**: 30 seconds
- **Connection timeout**: 10 seconds

For Neon, connection pooling is handled automatically via their proxy.

### Query Optimization

- Use `EXPLAIN ANALYZE` for slow queries
- Leverage JSONB indexes for metadata columns
- Use prepared statements (handled by `pg` library)
- Batch inserts for bulk operations

## Monitoring

### Neon Dashboard

Monitor these metrics in Neon dashboard:

- Active connections
- Query duration (p50, p95, p99)
- Storage usage
- Compute units consumed

### Application Logs

```typescript
// Enable query logging in development
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  log: (msg) => console.log('[PostgreSQL]', msg)
})
```

## Troubleshooting

### Connection Issues

```bash
# Test connection manually
psql $DATABASE_URL

# Check SSL requirement
# Neon requires: ?sslmode=require
```

### Migration Failures

```bash
# Check applied migrations
npm run db:migrate:status

# Manually rollback
npm run db:migrate:rollback

# Re-apply
npm run db:migrate
```

### Performance Issues

```sql
-- Check slow queries
SELECT pid, age(clock_timestamp(), query_start), usename, query
FROM pg_stat_activity
WHERE query != '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY query_start ASC;

-- Check table sizes
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Backup and Restore

### Neon Automatic Backups

- Neon provides automatic daily backups
- Point-in-time recovery available on Pro plan
- Access backups via Neon dashboard

### Manual Backup

```bash
# Export entire database
pg_dump $DATABASE_URL > backup.sql

# Export specific tables
pg_dump $DATABASE_URL -t badge_scans -t enriched_companies > backup_partial.sql
```

### Manual Restore

```bash
# Restore from backup
psql $DATABASE_URL < backup.sql
```

## Support

- **Neon Documentation**: [https://neon.tech/docs](https://neon.tech/docs)
- **PostgreSQL Docs**: [https://www.postgresql.org/docs/](https://www.postgresql.org/docs/)
- **Migration Issues**: Check `db/migrations/` files and rollback logs
