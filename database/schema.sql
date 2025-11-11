-- Trade Show Intelligence Platform Database Schema
-- MySQL Database Schema for Production Storage Adapter

-- Set character set and collation
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS trade_show_intelligence CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trade_show_intelligence;

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  start_date DATE,
  end_date DATE,
  location VARCHAR(200),
  booth_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_events_name (name),
  INDEX idx_events_created_at (created_at DESC),
  CONSTRAINT chk_event_dates CHECK (end_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Badge scans table
CREATE TABLE IF NOT EXISTS badge_scans (
  id CHAR(36) PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL,
  scanned_at TIMESTAMP NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  company VARCHAR(200) NOT NULL,
  job_title VARCHAR(150),
  phone VARCHAR(50),
  booth_location VARCHAR(50),
  event_name VARCHAR(200) NOT NULL,
  notes TEXT,
  custom_fields JSON,
  enrichment_status ENUM('PENDING', 'PROCESSING', 'ENRICHED', 'FAILED', 'MANUAL_REVIEW') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  INDEX idx_badge_scans_event_id (event_id),
  INDEX idx_badge_scans_status (enrichment_status),
  INDEX idx_badge_scans_email (email),
  INDEX idx_badge_scans_company (company),
  INDEX idx_badge_scans_created_at (created_at DESC),
  CONSTRAINT chk_badge_contact CHECK (
    (first_name IS NOT NULL OR last_name IS NOT NULL) OR email IS NOT NULL
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enriched companies table
CREATE TABLE IF NOT EXISTS enriched_companies (
  id CHAR(36) PRIMARY KEY,
  badge_scan_id CHAR(36) NOT NULL UNIQUE,
  company_name VARCHAR(200) NOT NULL,
  domain VARCHAR(255),
  employee_count INT,
  employee_range ENUM('1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001+'),
  industry VARCHAR(100),
  industry_codes JSON,
  annual_revenue BIGINT,
  revenue_range ENUM('<1M', '1M-10M', '10M-50M', '50M-100M', '100M-500M', '500M-1B', '1B+'),
  tech_stack JSON,
  funding_stage ENUM('Bootstrap', 'Seed', 'Series A', 'Series B', 'Series C+', 'Public', 'Private Equity', 'Unknown'),
  total_funding BIGINT,
  headquarters VARCHAR(200),
  founded INT,
  description TEXT,
  linkedin_url VARCHAR(500),
  twitter_handle VARCHAR(50),
  consensus_metadata JSON NOT NULL,
  enriched_at TIMESTAMP NOT NULL,
  data_source JSON NOT NULL,
  FOREIGN KEY (badge_scan_id) REFERENCES badge_scans(id) ON DELETE CASCADE,
  INDEX idx_enriched_companies_badge_scan_id (badge_scan_id),
  INDEX idx_enriched_companies_name (company_name),
  INDEX idx_enriched_companies_domain (domain),
  INDEX idx_enriched_companies_industry (industry),
  INDEX idx_enriched_companies_employee_range (employee_range),
  INDEX idx_enriched_companies_revenue_range (revenue_range),
  FULLTEXT INDEX ft_enriched_companies_description (description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Personas table
CREATE TABLE IF NOT EXISTS personas (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  criteria JSON NOT NULL,
  weights JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  INDEX idx_personas_name (name),
  INDEX idx_personas_is_default (is_default),
  INDEX idx_personas_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Persona matches table
CREATE TABLE IF NOT EXISTS persona_matches (
  id CHAR(36) PRIMARY KEY,
  badge_scan_id CHAR(36) NOT NULL,
  persona_id CHAR(36) NOT NULL,
  fit_score DECIMAL(5,2) NOT NULL,
  tier ENUM('Hot', 'Warm', 'Cold', 'Unscored') NOT NULL,
  criteria_matches JSON NOT NULL,
  actionable_insights JSON,
  calculated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (badge_scan_id) REFERENCES badge_scans(id) ON DELETE CASCADE,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
  INDEX idx_persona_matches_scan_id (badge_scan_id),
  INDEX idx_persona_matches_persona_id (persona_id),
  INDEX idx_persona_matches_tier (tier),
  INDEX idx_persona_matches_fit_score (fit_score DESC),
  CONSTRAINT chk_fit_score CHECK (fit_score >= 0 AND fit_score <= 100),
  CONSTRAINT chk_tier_alignment CHECK (
    (tier = 'Hot' AND fit_score >= 70) OR
    (tier = 'Warm' AND fit_score >= 40 AND fit_score < 70) OR
    (tier = 'Cold' AND fit_score < 40) OR
    (tier = 'Unscored')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id CHAR(36) PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL,
  name VARCHAR(200) NOT NULL,
  filters JSON,
  generated_at TIMESTAMP NOT NULL,
  badge_scan_ids JSON NOT NULL,
  statistics JSON NOT NULL,
  exported_formats JSON,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  INDEX idx_reports_event_id (event_id),
  INDEX idx_reports_generated_at (generated_at DESC),
  INDEX idx_reports_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Storage adapter configurations table
CREATE TABLE IF NOT EXISTS storage_adapter_configurations (
  id CHAR(36) PRIMARY KEY,
  adapter_type ENUM('LOCAL', 'MYSQL', 'HUBSPOT') NOT NULL,
  local_storage_config JSON,
  mysql_config JSON,
  hubspot_config JSON,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  last_tested_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_storage_configs_active (is_active),
  INDEX idx_storage_configs_type (adapter_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add unique constraint to ensure only one active configuration
-- This is enforced at application level due to MySQL limitations

-- Create views for reporting

-- View: Badge scans with enrichment and tier information
CREATE OR REPLACE VIEW v_enriched_badge_scans AS
SELECT
  bs.id,
  bs.event_id,
  bs.scanned_at,
  bs.first_name,
  bs.last_name,
  bs.email,
  bs.company,
  bs.job_title,
  bs.phone,
  bs.booth_location,
  bs.event_name,
  bs.enrichment_status,
  ec.company_name AS enriched_company_name,
  ec.domain,
  ec.employee_count,
  ec.employee_range,
  ec.industry,
  ec.revenue_range,
  ec.tech_stack,
  ec.funding_stage,
  pm.tier,
  pm.fit_score,
  pm.persona_id,
  p.name AS persona_name,
  bs.created_at,
  bs.updated_at
FROM badge_scans bs
LEFT JOIN enriched_companies ec ON bs.id = ec.badge_scan_id
LEFT JOIN persona_matches pm ON bs.id = pm.badge_scan_id
LEFT JOIN personas p ON pm.persona_id = p.id;

-- View: Event summary statistics
CREATE OR REPLACE VIEW v_event_statistics AS
SELECT
  e.id AS event_id,
  e.name AS event_name,
  COUNT(DISTINCT bs.id) AS total_scans,
  COUNT(DISTINCT CASE WHEN bs.enrichment_status = 'ENRICHED' THEN bs.id END) AS enriched_count,
  COUNT(DISTINCT CASE WHEN pm.tier = 'Hot' THEN bs.id END) AS hot_count,
  COUNT(DISTINCT CASE WHEN pm.tier = 'Warm' THEN bs.id END) AS warm_count,
  COUNT(DISTINCT CASE WHEN pm.tier = 'Cold' THEN bs.id END) AS cold_count,
  COUNT(DISTINCT CASE WHEN pm.tier = 'Unscored' THEN bs.id END) AS unscored_count,
  AVG(pm.fit_score) AS average_fit_score,
  (COUNT(DISTINCT CASE WHEN bs.enrichment_status = 'ENRICHED' THEN bs.id END) * 100.0 /
   NULLIF(COUNT(DISTINCT bs.id), 0)) AS enrichment_success_rate
FROM events e
LEFT JOIN badge_scans bs ON e.id = bs.event_id
LEFT JOIN persona_matches pm ON bs.id = pm.badge_scan_id
GROUP BY e.id, e.name;

-- Initial data: Insert default personas
INSERT IGNORE INTO personas (id, name, description, is_default, criteria, weights, created_by)
VALUES
  (
    UUID(),
    'Enterprise Tech Buyer',
    'Large technology companies seeking enterprise solutions',
    TRUE,
    JSON_OBJECT(
      'companySizeRange', JSON_OBJECT('min', 500, 'max', 50000),
      'industries', JSON_ARRAY('Technology', 'Software', 'SaaS'),
      'revenueRange', JSON_OBJECT('min', 50000000, 'max', 10000000000),
      'technologies', JSON_ARRAY('Salesforce', 'AWS', 'Azure', 'GCP'),
      'decisionMakerTitles', JSON_ARRAY('CTO', 'CIO', 'VP Engineering', 'Director IT', 'Chief Architect')
    ),
    JSON_OBJECT(
      'companySize', 0.25,
      'industry', 0.20,
      'technology', 0.25,
      'revenue', 0.15,
      'geography', 0.05,
      'decisionMaker', 0.10,
      'fundingStage', 0.00
    ),
    'SYSTEM'
  ),
  (
    UUID(),
    'SMB SaaS Buyer',
    'Small to medium-sized businesses in the SaaS space',
    TRUE,
    JSON_OBJECT(
      'companySizeRange', JSON_OBJECT('min', 50, 'max', 500),
      'industries', JSON_ARRAY('SaaS', 'Cloud', 'Technology', 'Software'),
      'revenueRange', JSON_OBJECT('min', 1000000, 'max', 50000000),
      'technologies', JSON_ARRAY('HubSpot', 'Stripe', 'Salesforce', 'Slack'),
      'fundingStages', JSON_ARRAY('Seed', 'Series A', 'Series B'),
      'decisionMakerTitles', JSON_ARRAY('CEO', 'Founder', 'VP Sales', 'VP Marketing', 'Head of Growth')
    ),
    JSON_OBJECT(
      'companySize', 0.20,
      'industry', 0.25,
      'technology', 0.15,
      'revenue', 0.15,
      'geography', 0.05,
      'decisionMaker', 0.10,
      'fundingStage', 0.10
    ),
    'SYSTEM'
  );

-- Performance optimization: Analyze tables
ANALYZE TABLE events, badge_scans, enriched_companies, personas, persona_matches, reports;
