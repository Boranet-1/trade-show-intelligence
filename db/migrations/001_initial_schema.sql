-- ============================================================================
-- Migration 001: Initial Schema
-- Trade Show Intelligence Platform - PostgreSQL Database Schema
--
-- Creates all core tables for badge scans, enrichment, personas, reports,
-- events, lists, tags, and markdown reports with proper indexes and constraints.
-- ============================================================================

-- Enable UUID extension for id generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- EVENTS TABLE
-- Trade show events that organize badge scans
-- ============================================================================

CREATE TABLE events (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  location VARCHAR(500),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_created_at ON events(created_at);

-- ============================================================================
-- BADGE SCANS TABLE
-- Raw badge scan data from trade show lead capture
-- ============================================================================

CREATE TABLE badge_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(255) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  scanned_at TIMESTAMP NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(500),
  company VARCHAR(500) NOT NULL,
  job_title VARCHAR(500),
  phone VARCHAR(100),
  booth_location VARCHAR(255),
  event_name VARCHAR(500) NOT NULL,
  notes TEXT,
  custom_fields JSONB,
  enrichment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of_id UUID REFERENCES badge_scans(id),
  proximity_group_id UUID,
  contact_tier VARCHAR(50), -- FR-032: Contact-level tier
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_badge_scans_event_id ON badge_scans(event_id);
CREATE INDEX idx_badge_scans_email ON badge_scans(email);
CREATE INDEX idx_badge_scans_company ON badge_scans(company);
CREATE INDEX idx_badge_scans_scanned_at ON badge_scans(scanned_at);
CREATE INDEX idx_badge_scans_enrichment_status ON badge_scans(enrichment_status);
CREATE INDEX idx_badge_scans_proximity_group ON badge_scans(proximity_group_id);
CREATE INDEX idx_badge_scans_contact_tier ON badge_scans(contact_tier);

-- ============================================================================
-- ENRICHED COMPANIES TABLE
-- AI-enriched company data from multiple sources
-- ============================================================================

CREATE TABLE enriched_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  badge_scan_id UUID NOT NULL REFERENCES badge_scans(id) ON DELETE CASCADE,
  company_name VARCHAR(500) NOT NULL,
  website VARCHAR(500),
  industry VARCHAR(255),
  employee_count VARCHAR(100),
  annual_revenue VARCHAR(100),
  headquarters_location VARCHAR(500),
  description TEXT,
  technologies JSONB,
  funding_info JSONB,
  consensus_metadata JSONB,
  data_source VARCHAR(255)[],
  company_tier VARCHAR(50), -- FR-032: Company-level tier
  enriched_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_enriched_companies_badge_scan_id ON enriched_companies(badge_scan_id);
CREATE INDEX idx_enriched_companies_company_name ON enriched_companies(company_name);
CREATE INDEX idx_enriched_companies_industry ON enriched_companies(industry);
CREATE INDEX idx_enriched_companies_company_tier ON enriched_companies(company_tier);

-- ============================================================================
-- PERSONAS TABLE
-- Ideal customer profile (ICP) templates for lead scoring
-- ============================================================================

CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  criteria JSONB NOT NULL, -- Scoring criteria with weights
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_personas_is_default ON personas(is_default);
CREATE INDEX idx_personas_name ON personas(name);

-- ============================================================================
-- PERSONA MATCHES TABLE
-- Lead scoring results mapping badge scans to personas
-- ============================================================================

CREATE TABLE persona_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  badge_scan_id UUID NOT NULL REFERENCES badge_scans(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  fit_score DECIMAL(5,2) NOT NULL CHECK (fit_score >= 0 AND fit_score <= 100),
  assigned_tier VARCHAR(50) NOT NULL,
  score_breakdown JSONB,
  matched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_persona_matches_badge_scan_id ON persona_matches(badge_scan_id);
CREATE INDEX idx_persona_matches_persona_id ON persona_matches(persona_id);
CREATE INDEX idx_persona_matches_fit_score ON persona_matches(fit_score DESC);
CREATE INDEX idx_persona_matches_tier ON persona_matches(assigned_tier);

-- ============================================================================
-- REPORTS TABLE
-- Generated analytical reports for events
-- ============================================================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(255) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  generated_at TIMESTAMP NOT NULL,
  badge_scan_ids UUID[],
  total_scans INTEGER NOT NULL,
  hot_count INTEGER NOT NULL DEFAULT 0,
  warm_count INTEGER NOT NULL DEFAULT 0,
  cold_count INTEGER NOT NULL DEFAULT 0,
  unscored_count INTEGER NOT NULL DEFAULT 0,
  -- FR-032: Triple tier breakdowns
  company_tier_breakdown JSONB,
  contact_tier_breakdown JSONB,
  combined_tier_breakdown JSONB,
  filters JSONB,
  statistics JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_event_id ON reports(event_id);
CREATE INDEX idx_reports_generated_at ON reports(generated_at);

-- ============================================================================
-- LISTS TABLE (FR-030)
-- Custom lists for organizing leads
-- ============================================================================

CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  badge_scan_ids UUID[],
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lists_name ON lists(name);
CREATE INDEX idx_lists_created_at ON lists(created_at);

-- ============================================================================
-- TAGS TABLE (FR-029)
-- Tags for categorizing badge scans
-- ============================================================================

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  color VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tags_name ON tags(name);

-- ============================================================================
-- BADGE SCAN TAGS (Many-to-Many)
-- Links badge scans to tags
-- ============================================================================

CREATE TABLE badge_scan_tags (
  badge_scan_id UUID NOT NULL REFERENCES badge_scans(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (badge_scan_id, tag_id)
);

CREATE INDEX idx_badge_scan_tags_badge_scan_id ON badge_scan_tags(badge_scan_id);
CREATE INDEX idx_badge_scan_tags_tag_id ON badge_scan_tags(tag_id);

-- ============================================================================
-- MARKDOWN REPORTS TABLE
-- Generated markdown summaries (CRO, Company, Contact, Merged)
-- ============================================================================

CREATE TABLE markdown_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('CROSummary', 'CompanySummary', 'ContactSummary', 'MergedReport')),
  event_id VARCHAR(255) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  badge_scan_id UUID REFERENCES badge_scans(id) ON DELETE CASCADE,
  markdown_content TEXT NOT NULL,
  generated_at TIMESTAMP NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  feedback_applied TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_markdown_reports_event_id ON markdown_reports(event_id);
CREATE INDEX idx_markdown_reports_badge_scan_id ON markdown_reports(badge_scan_id);
CREATE INDEX idx_markdown_reports_report_type ON markdown_reports(report_type);
CREATE INDEX idx_markdown_reports_generated_at ON markdown_reports(generated_at DESC);

-- ============================================================================
-- STORAGE CONFIGURATIONS TABLE
-- Multi-adapter configuration persistence
-- ============================================================================

CREATE TABLE storage_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adapter_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  config JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_storage_configurations_adapter_type ON storage_configurations(adapter_type);
CREATE INDEX idx_storage_configurations_is_active ON storage_configurations(is_active);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- Auto-update updated_at timestamp on row modification
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badge_scans_updated_at BEFORE UPDATE ON badge_scans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storage_configurations_updated_at BEFORE UPDATE ON storage_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- Table and column documentation
-- ============================================================================

COMMENT ON TABLE events IS 'Trade show events that organize badge scans';
COMMENT ON TABLE badge_scans IS 'Raw badge scan data from lead capture devices';
COMMENT ON TABLE enriched_companies IS 'AI-enriched company intelligence data';
COMMENT ON TABLE personas IS 'Ideal customer profile templates for scoring';
COMMENT ON TABLE persona_matches IS 'Lead scoring results';
COMMENT ON TABLE reports IS 'Generated analytical reports';
COMMENT ON TABLE lists IS 'Custom lists for organizing leads (FR-030)';
COMMENT ON TABLE tags IS 'Tags for categorizing badge scans (FR-029)';
COMMENT ON TABLE markdown_reports IS 'Generated markdown summaries in 4 formats';
COMMENT ON TABLE storage_configurations IS 'Multi-adapter storage configuration';

COMMENT ON COLUMN badge_scans.proximity_group_id IS 'FR-031: Groups contacts scanned within 15 seconds';
COMMENT ON COLUMN badge_scans.contact_tier IS 'FR-032: Contact-level tier (Hot/Warm/Cold)';
COMMENT ON COLUMN enriched_companies.company_tier IS 'FR-032: Company-level tier based on persona fit + MEDDIC';
COMMENT ON COLUMN markdown_reports.version IS 'Incremental version for regeneration tracking';
COMMENT ON COLUMN markdown_reports.feedback_applied IS 'User feedback that triggered regeneration';
