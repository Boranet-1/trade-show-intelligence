-- ============================================================================
-- Migration 001 Rollback: Drop Initial Schema
-- Drops all tables and extensions created in 001_initial_schema.sql
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_badge_scans_updated_at ON badge_scans;
DROP TRIGGER IF EXISTS update_personas_updated_at ON personas;
DROP TRIGGER IF EXISTS update_lists_updated_at ON lists;
DROP TRIGGER IF EXISTS update_storage_configurations_updated_at ON storage_configurations;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS badge_scan_tags;
DROP TABLE IF EXISTS markdown_reports;
DROP TABLE IF EXISTS storage_configurations;
DROP TABLE IF EXISTS persona_matches;
DROP TABLE IF EXISTS personas;
DROP TABLE IF EXISTS enriched_companies;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS lists;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS badge_scans;
DROP TABLE IF EXISTS events;

-- Drop extensions (only if not used by other databases)
-- DROP EXTENSION IF EXISTS "uuid-ossp";
