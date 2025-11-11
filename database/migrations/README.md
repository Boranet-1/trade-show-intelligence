# Database Migrations

This directory contains database migration scripts for the Trade Show Intelligence Platform.

## Structure

Migrations are numbered sequentially and follow the naming convention:
```
001_initial_schema.sql
002_add_tier_indexes.sql
003_add_fulltext_search.sql
```

## Running Migrations

### Manual Execution
```bash
mysql -u username -p database_name < database/schema.sql
```

### Automated Migration (Future)
A migration runner script will be added in Phase 2 (User Story 2) to handle versioning and rollbacks.

## Migration Best Practices

1. **Always create migrations for schema changes** - Never modify `schema.sql` directly after initial deployment
2. **Test migrations in development first** - Ensure they run successfully before production
3. **Include rollback scripts** - Create corresponding `down` migrations for reverting changes
4. **Document breaking changes** - Add comments explaining why the migration is needed

## Version Control

The initial schema (`database/schema.sql`) represents the base state. All subsequent changes should be added as numbered migration files in this directory.
