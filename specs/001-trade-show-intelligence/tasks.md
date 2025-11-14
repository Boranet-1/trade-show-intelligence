# Tasks: Trade Show Intelligence Platform

**Feature Branch**: `001-trade-show-intelligence`
**Input**: Design documents from `/specs/001-trade-show-intelligence/`
**Prerequisites**: plan.md, spec.md (updated with clarifications), research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the specification, so test tasks are EXCLUDED per Speckit workflow guidelines.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Implementation Notes (2025-11-14)**:
- Specification updated with MEDDIC framework (User Story 5) for deep-dive qualification analysis of Hot/Warm tier opportunities
- Specification updated with dual-tier system (Company Tier + Contact Tier + Combined Tier) and three persona types (Exhibitor, Target Company, Target People)
- Specification expanded with User Story 4 (Persona Type Management - P2), User Story 5 (MEDDIC Qualification - P3), User Story 6 (Tagging and List Management - P3)
- New functional requirements: FR-025 (three persona types), FR-026 (MEDDIC analysis), FR-027-028 (async report generation), FR-029-030 (tags and lists), FR-031 (proximity detection), FR-032 (dual tiering)
- HubSpot integration (T088-T098) intentionally skipped, using Local Storage as primary storage adapter
- All User Story 1 tasks (T001-T075) completed: Full MVP workflow operational with CSV upload, multi-LLM enrichment, persona-based scoring, tiered reports, and export functionality
- MySQL adapter implementation (T076-T087) completed for production database support
- Database setup automation (T108-T109) completed with npm scripts for schema management
- **NEW TASKS ADDED** (Session 2025-11-14 Evening): Phases 7-10 added for User Stories 4, 5, 6 with 51 new tasks (T153-T203)
- **PARTIAL IMPLEMENTATION**: FR-025 through FR-032 type definitions complete, dual-tier calculator implemented, proximity detection logic implemented, tag management APIs created
- **COMPLETED** (Session 2): T153-T154, T161, T168-T170, T173, T178, T181-T182, T186 (type definitions and core algorithms)
- **PENDING**: Storage adapter updates, UI components, MEDDIC agent, async report queue, list management APIs, persona generator agent

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- All file paths are absolute paths from project root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize Next.js 13.5.6 project with TypeScript 5.x and App Router configuration in package.json
- [X] T002 [P] Install core dependencies: shadcn/ui, Anthropic SDK, OpenAI SDK, Google Generative AI SDK, Perplexity API client in package.json
- [X] T003 [P] Install storage dependencies: mysql2, HubSpot API client, papaparse, zod in package.json
- [X] T004 [P] Install dev dependencies: Vitest, Playwright, @testing-library/react in package.json
- [X] T005 Initialize shadcn/ui with New York style and Slate theme using npx shadcn-ui@latest init
- [X] T006 [P] Install required shadcn/ui components: button, card, table, badge, dropdown-menu, dialog, tabs, input, label, select, form, alert, toast, progress
- [X] T007 Create project directory structure per plan.md (app/, components/, lib/, data/, database/, public/personas/, lib/templates/)
- [X] T008 [P] Configure Vitest with vitest.config.ts extending Next.js config
- [X] T009 [P] Configure Playwright for E2E testing in playwright.config.ts
- [X] T010 [P] Setup ESLint and Prettier configuration files
- [X] T011 Create .env.local.example with all required environment variables (LLM API keys, storage configs, encryption keys)
- [X] T012 [P] Create .gitignore entries for data/, .env.local, node_modules/
- [X] T013 Create database/schema.sql with MySQL table definitions for all entities from data-model.md
- [X] T014 [P] Create database migration scripts directory structure in database/migrations/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T015 Create TypeScript type definitions for all entities in lib/types/index.ts (BadgeScan, EnrichedCompany, Persona, PersonaMatch, Report, Event, StorageAdapterConfiguration, EnrichmentStatus, LeadTier)
- [X] T016 [P] Create Zod validation schemas for all entities in lib/validation/schemas.ts including CSV error validation schema with 3-part structure (what failed, how to fix, example format) per FR-014
- [X] T017 Create StorageAdapter interface contract in lib/storage/adapter.ts (copy from contracts/storage-adapter.ts) including exportToFormat method for CRO_summary.md and company reports per constitution
- [X] T018 Create storage adapter factory pattern in lib/storage/factory.ts with createStorageAdapter function
- [X] T019 Implement LocalStorageAdapter in lib/storage/local-storage.ts with JSON file operations for all entities plus exportToFormat implementation
- [X] T020 [P] Create default persona templates in public/personas/enterprise-tech.json and public/personas/smb-saas.json
- [X] T021 Create utility functions in lib/utils.ts (UUID generation, email validation, domain normalization)
- [X] T022 [P] Create Next.js root layout in app/layout.tsx with shadcn/ui theme provider
- [X] T023 [P] Create landing page in app/page.tsx with navigation to dashboard
- [X] T024 Create error handling utilities in lib/errors.ts with custom error classes and CSV validation error formatter (3-part format)
- [X] T025 [P] Create logging utilities in lib/logger.ts for structured logging
- [X] T026 Setup environment configuration validation in lib/config.ts using Zod
- [X] T027 Create API route helpers in lib/api/helpers.ts for response formatting and error handling with 3-part error messages
- [X] T028 Implement AES-256 API key encryption utility in lib/encryption/api-key-encryption.ts with secure key management per FR-008

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Badge Scan Upload and Processing (Priority: P1) 🎯 MVP

**Goal**: Enable sales teams to upload trade show badge scan CSV files, enrich contacts with company intelligence using multi-LLM verification, apply persona-based scoring to categorize leads into quality tiers (Hot/Warm/Cold), and generate downloadable reports including CRO_summary.md and individual company reports for immediate follow-up.

**Independent Test**: Upload sample CSV file with mock badge scan data, verify system processes each entry, enriches it with company data, applies persona-based scoring, and generates complete report with tiered categorization plus CRO_summary.md and company reports. Success measured by receiving all report formats within 5 minutes for 100 scans with 80%+ enrichment success rate.

### CSV Upload and Column Mapping (FR-001, FR-002, FR-002a, FR-014)

- [X] T029 [P] [US1] Create CSV parser utility in lib/csv/parser.ts using papaparse with error handling and 3-part error message format
- [X] T030 [P] [US1] Implement intelligent column detection heuristics in lib/csv/column-detector.ts (exact matches, fuzzy matches, position heuristics)
- [X] T031 [US1] Create CSV upload API route in app/api/upload/route.ts with file validation, column mapping preview, and structured error messages (what failed, how to fix, example format) per FR-014
- [X] T032 [US1] Create CSV uploader client component in components/upload/csv-uploader.tsx with drag-and-drop support
- [X] T033 [US1] Create column mapper preview component in components/upload/column-mapper.tsx for user review and adjustment

### Multi-LLM Enrichment Orchestration (FR-003, FR-016, Constitution I, VI, VII)

- [X] T034 [P] [US1] Create Claude API client wrapper in lib/enrichment/llm-providers/claude-client.ts with rate limiting and error handling
- [X] T035 [P] [US1] Create OpenAI GPT-4 client wrapper in lib/enrichment/llm-providers/openai-client.ts with rate limiting and error handling
- [X] T036 [P] [US1] Create Google Gemini client wrapper in lib/enrichment/llm-providers/gemini-client.ts with rate limiting and error handling
- [X] T037 [P] [US1] Create Perplexity API client wrapper in lib/enrichment/llm-providers/perplexity-client.ts with rate limiting and error handling
- [X] T038 [US1] Implement multi-LLM consensus algorithm in lib/enrichment/consensus.ts with 3/4 threshold, tiebreaker logic, and confidence scoring
- [X] T039 [P] [US1] Create Company Research sub-agent in lib/enrichment/agents/company-research.ts for company size, industry, revenue, tech stack enrichment
- [X] T040 [P] [US1] Create Persona Matcher sub-agent in lib/enrichment/agents/persona-matcher.ts for fit score calculation and tier assignment
- [X] T041 [P] [US1] Create Pain Point Analyzer sub-agent in lib/enrichment/agents/pain-point-analyzer.ts for actionable insights, pain points, and conversation starters per FR-019
- [X] T042 [US1] Implement Orchestrator with hub-and-spoke pattern in lib/enrichment/orchestrator.ts coordinating all sub-agents (Constitution VI compliance)

### Batch Processing and Progress Tracking (FR-011, Constitution III)

- [X] T043 [US1] Create batch enrichment job queue in lib/enrichment/batch-queue.ts with in-memory job tracking
- [X] T044 [US1] Create batch enrichment API route in app/api/enrichment/batch/route.ts with parallel processing (10 companies at a time)
- [X] T045 [US1] Create enrichment status polling API route in app/api/enrichment/status/[jobId]/route.ts
- [X] T046 [US1] Implement real-time progress tracking using Server-Sent Events (SSE) in batch enrichment API route
- [X] T047 [US1] Create enrichment progress indicator component in components/dashboard/enrichment-progress.tsx with real-time updates

### Persona-Based Scoring and Tier Assignment (FR-004, FR-017, Constitution IV, V)

- [X] T048 [P] [US1] Implement tier calculation logic in lib/scoring/tier-calculator.ts using fit score thresholds (Hot>=70%, Warm=40-69%, Cold<40%, Unscored<30% data coverage)
- [X] T049 [P] [US1] Implement persona fit score calculation in lib/scoring/persona-matcher.ts with weighted criteria matching
- [X] T050 [US1] Create persona match persistence logic in storage adapter operations (savePersonaMatch, getPersonaMatchesForScan, getBestPersonaMatch)

### Dashboard and Upload Interface

- [X] T051 [US1] Create main dashboard page in app/dashboard/page.tsx with upload section, storage selector, and processing status
- [X] T052 [US1] Integrate CSV uploader and column mapper components into dashboard page
- [X] T053 [US1] Add upload progress indicators and error messaging with 3-part format to dashboard

### Report Generation and Viewing (FR-005, FR-012, FR-013)

- [X] T054 [P] [US1] Implement report generation logic in storage adapter generateReport method with tier grouping and statistics calculation
- [X] T055 [P] [US1] Create report API routes in app/api/reports/route.ts for listing and generating reports
- [X] T056 [P] [US1] Create report detail API route in app/api/reports/[reportId]/route.ts for fetching individual reports
- [X] T057 [US1] Create reports listing page in app/reports/page.tsx with filtering controls
- [X] T058 [US1] Create report detail page in app/reports/[reportId]/page.tsx with enriched leads table
- [X] T059 [P] [US1] Create tier filter component in components/reports/tier-filter.tsx with visual badges (Hot=Red, Warm=Orange, Cold=Blue, Unscored=Gray)
- [X] T060 [P] [US1] Create enriched leads data table component in components/reports/lead-table.tsx with sorting and search

### Report Export Functionality (FR-013, FR-018, FR-019)

- [X] T061 [P] [US1] Implement CSV export utility in lib/export/csv-exporter.ts using papaparse with CRM-compatible column headers
- [X] T062 [P] [US1] Implement PDF export utility in lib/export/pdf-exporter.ts using Puppeteer with tier-grouped formatting
- [X] T063 [P] [US1] Create CRO_summary.md template in lib/templates/cro-summary.md with sections for executive summary, top 10 Hot leads, and follow-up priorities
- [X] T064 [P] [US1] Implement CRO_summary.md generator in lib/export/cro-summary-generator.ts that generates executive summary, top 10 Hot leads with key insights, and recommended follow-up priorities by tier per FR-018
- [X] T065 [P] [US1] Create company report template in lib/templates/company-report.md with sections for company profile, persona match analysis, actionable insights, and tier justification
- [X] T066 [P] [US1] Implement company report generator in lib/export/company-report-generator.ts that generates individual reports with company profile, persona match analysis with fit score breakdown, actionable insights (pain points and conversation starters), and tier assignment justification per FR-019
- [X] T067 [US1] Create report export API route in app/api/reports/[reportId]/export/route.ts handling CSV, PDF, CRO_summary.md, and company reports formats
- [X] T068 [US1] Create export button component in components/reports/export-button.tsx with format selector (CSV, PDF, CRO_summary.md, company reports)
- [X] T069 [US1] Update storage adapter exportToFormat method implementation in LocalStorageAdapter to save CRO_summary.md to data/events/{eventId}/CRO_summary.md and company reports to data/events/{eventId}/companies/{companyId}.md

### Duplicate Detection and Resolution (FR-015, Edge Case Handling)

- [X] T070 [US1] Implement duplicate detection logic in CSV upload process checking for matching email addresses within same event
- [X] T071 [US1] Create duplicate comparison API route in app/api/badge-scans/duplicate-comparison/route.ts returning side-by-side scan data
- [X] T072 [US1] Create duplicate resolution API route in app/api/badge-scans/resolve-duplicate/route.ts with keep-both, merge, and mark-primary actions
- [X] T073 [US1] Create duplicate comparison UI component in components/upload/duplicate-comparison.tsx showing scan timestamps, booth locations, and enrichment data

### Event Management

- [X] T074 [P] [US1] Create event API routes in app/api/events/route.ts for creating and listing events
- [X] T075 [US1] Add event creation form to dashboard for associating uploads with trade show events

### Manual Enrichment Fallback (Constitution VII)

- [X] T148 [US1] Create manual enrichment form component in components/enrichment/manual-enrichment-form.tsx for user to input company data when automated enrichment fails per Constitution VII
- [X] T149 [US1] Create manual enrichment API route in app/api/enrichment/manual/route.ts to save manually-entered company data and trigger persona matching

**Checkpoint**: User Story 1 complete - full end-to-end workflow from CSV upload to enriched tiered reports with CRO_summary.md and company reports functional and independently testable. This represents the MVP with immediate business value.

---

## Phase 4: User Story 2 - Storage Backend Configuration (Priority: P2)

**Goal**: Enable administrators to configure flexible storage backends (Local Storage for quick setup, MySQL for production, HubSpot for CRM integration) and migrate data between adapters without code changes or data loss.

**Independent Test**: Configure each storage adapter type (Local Storage, MySQL, HubSpot), upload badge scans, verify data correctly persisted and retrievable from chosen backend. Switch between adapters and confirm data migration completes successfully with no data loss. Success measured by switching adapters in under 2 minutes with full data integrity validation.

### MySQL Storage Adapter (FR-006, FR-007, Constitution II)

- [X] T076 [P] [US2] Implement MySQLAdapter in lib/storage/mysql-adapter.ts with connection pooling using mysql2/promise
- [X] T077 [P] [US2] Implement all BadgeScan operations for MySQL adapter (saveBadgeScan, getBadgeScan, getAllBadgeScans, updateBadgeScanStatus, bulkImportBadgeScans, flagDuplicate)
- [X] T078 [P] [US2] Implement all EnrichedCompany operations for MySQL adapter (saveEnrichedCompany, getEnrichedCompany, updateEnrichment)
- [X] T079 [P] [US2] Implement all Persona operations for MySQL adapter (savePersona, getPersona, getAllPersonas, getDefaultPersonas, updatePersona, deletePersona)
- [X] T080 [P] [US2] Implement all PersonaMatch operations for MySQL adapter (savePersonaMatch, getPersonaMatchesForScan, getBestPersonaMatch)
- [X] T081 [P] [US2] Implement all Report operations for MySQL adapter (saveReport, getReport, getAllReports, deleteReport, generateReport)
- [X] T082 [P] [US2] Implement all Event operations for MySQL adapter (saveEvent, getEvent, getAllEvents)
- [X] T083 [P] [US2] Implement configuration operations for MySQL adapter (saveStorageConfig, getActiveStorageConfig, setActiveStorageConfig)
- [X] T084 [P] [US2] Implement migration operations for MySQL adapter (exportAll, importAll with transaction support)
- [X] T085 [P] [US2] Implement exportToFormat for MySQL adapter to generate CRO_summary.md and company reports per constitution
- [X] T086 [US2] Implement connection management for MySQL adapter (testConnection, close with connection pool cleanup)
- [X] T087 [US2] Add MySQL adapter to storage factory registry in lib/storage/factory.ts

### HubSpot Storage Adapter (FR-006, FR-007, Constitution II)

- [ ] T088 [P] [US2] Implement HubSpotAdapter in lib/storage/hubspot-adapter.ts with batch API support (100 contacts per request)
- [ ] T089 [P] [US2] Implement BadgeScan operations for HubSpot adapter mapping to Contacts API with custom properties
- [ ] T090 [P] [US2] Implement EnrichedCompany operations for HubSpot adapter storing enrichment data in custom properties (trade_show_tier, persona_match_score, enrichment_status)
- [ ] T091 [P] [US2] Implement Persona operations for HubSpot adapter storing personas as custom objects or in local storage hybrid approach
- [ ] T092 [P] [US2] Implement PersonaMatch operations for HubSpot adapter storing scores in contact custom properties
- [ ] T093 [P] [US2] Implement Report operations for HubSpot adapter using Lists API for tier-based segmentation
- [ ] T094 [P] [US2] Implement Event operations for HubSpot adapter using Deals or custom objects
- [ ] T095 [P] [US2] Implement migration operations for HubSpot adapter (exportAll, importAll with retry logic and exponential backoff)
- [ ] T096 [P] [US2] Implement exportToFormat for HubSpot adapter to generate CRO_summary.md and company reports per constitution
- [ ] T097 [US2] Implement connection management for HubSpot adapter (testConnection, close)
- [ ] T098 [US2] Add HubSpot adapter to storage factory registry in lib/storage/factory.ts

### Storage Configuration Interface (FR-007, FR-008)

- [ ] T099 [US2] Create settings page in app/settings/page.tsx with storage adapter configuration sections
- [ ] T100 [P] [US2] Create storage selector component in components/settings/storage-selector.tsx with adapter type dropdown and configuration forms
- [ ] T101 [P] [US2] Create API key management component in components/settings/api-key-manager.tsx with masked key display, test connection buttons, and AES-256 encryption integration per FR-008
- [ ] T102 [US2] Create storage settings API routes in app/api/settings/storage/route.ts for saving and retrieving configurations with encrypted API keys
- [ ] T103 [US2] Create storage test connection API route in app/api/settings/storage/test/route.ts validating adapter credentials

### Data Migration Between Adapters (FR-007, Constitution II)

- [ ] T104 [US2] Implement adapter switching logic in storage settings API with automatic data migration trigger
- [ ] T105 [US2] Create migration progress tracking component in components/settings/migration-progress.tsx with row counts and validation status
- [ ] T106 [US2] Add data integrity validation after migration (compare record counts, sample queries) in migration API route
- [ ] T107 [US2] Create migration rollback functionality if validation fails
- [ ] T147 [US2] Implement storage operation retry queue with exponential backoff in lib/storage/retry-queue.ts for handling storage backend unavailability per FR-007a (queue failed operations, continue with in-memory storage, display warning banner)

### Database Setup Automation

- [X] T108 [P] [US2] Create database setup npm script in package.json running database/schema.sql
- [X] T109 [P] [US2] Create database migration runner script in scripts/migrate.ts for version management (npm scripts configured in package.json)

**Checkpoint**: User Story 2 complete - all three storage adapters (Local Storage, MySQL, HubSpot) implemented and functional. Administrators can configure and switch between adapters with automatic data migration. Production deployments can now integrate with existing databases and CRM systems.

---

## Phase 5: User Story 3 - Persona Template Management (Priority: P3)

**Goal**: Enable marketing operations managers to customize lead scoring by defining business personas with specific criteria (company size range, industry categories, technology stack preferences, budget indicators) that automatically tier incoming leads during enrichment process.

**Independent Test**: Create custom persona with specific criteria (e.g., "SaaS companies with 50-200 employees using Salesforce"), process badge scans, verify leads matching criteria receive higher scores and appropriate tier categorization. Compare tier distributions between default and custom personas to validate customization impact. Success measured by seeing different tier distributions reflecting custom persona criteria.

### Persona Template Editor (FR-009, FR-010)

- [X] T110 [US3] Create personas page in app/personas/page.tsx with persona listing and editor sections
- [X] T111 [P] [US3] Create persona editor component in components/settings/persona-editor.tsx with form for all criteria fields (companySizeRange, industries, technologies, revenueRange, geographies, decisionMakerTitles, fundingStages)
- [X] T112 [P] [US3] Create persona weight editor component in components/settings/persona-weight-editor.tsx with slider controls ensuring weights sum to 1.0
- [X] T113 [US3] Add persona criteria validation in persona editor (at least one criterion defined, weights sum to 1.0, company size min < max)
- [X] T114 [US3] Create persona preview component in components/settings/persona-preview.tsx showing sample scoring examples

### Persona API Routes

- [X] T115 [P] [US3] Create persona management API routes in app/api/personas/route.ts for creating, listing, updating personas
- [X] T116 [P] [US3] Create persona detail API route in app/api/personas/[personaId]/route.ts for fetching and deleting individual personas
- [X] T117 [US3] Add validation in persona API routes preventing deletion of personas in use by existing reports

### Persona Template Seeding

- [X] T118 [US3] Create persona seeding npm script in package.json loading public/personas/*.json files into active storage adapter
- [X] T119 [US3] Add persona seeding to application startup if no personas exist

### Re-processing with Updated Personas

- [X] T120 [US3] Create re-processing API route in app/api/enrichment/reprocess/route.ts that recalculates persona matches for existing enriched badge scans
- [X] T121 [US3] Add re-process button to personas page triggering persona match recalculation for all enriched scans

### Persona-Based Filtering in Reports

- [X] T122 [US3] Add persona filter to report generation (extend ReportFilters interface with personas array)
- [X] T123 [US3] Update report filtering UI to include persona selector in tier filter component
- [X] T124 [US3] Update report generation logic to support persona-based filtering

**Checkpoint**: User Story 3 complete - full persona customization workflow functional. Marketing operations can define custom personas, apply them to enrichment process, and see differentiated lead scoring based on business-specific criteria. Platform now fully customizable to target market definitions.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

- [X] T125 [P] Create comprehensive README.md in project root with setup instructions, architecture overview, and API documentation
- [ ] T126 [P] Add JSDoc comments to all public functions and components
- [ ] T127 [P] Create API reference documentation in docs/api-reference.md
- [ ] T128 [P] Implement rate limiting middleware for API routes to prevent abuse
- [ ] T129 [P] Add request/response logging to all API routes using structured logger
- [ ] T130 [P] Implement API authentication and authorization middleware (if multi-user support required)
- [ ] T131 [P] Add performance monitoring for batch enrichment operations (track LLM API response times, consensus calculation duration)
- [ ] T132 [P] Optimize report generation queries with indexes (verify MySQL indexes from data-model.md are applied)
- [ ] T133 [P] Add input sanitization to prevent XSS attacks in user-generated content (persona names, event names, notes)
- [ ] T134 [P] Implement CSRF protection for state-changing API operations
- [ ] T135 [P] Add SQL injection prevention validation in MySQL adapter (use parameterized queries)
- [ ] T136 Create tier alignment validation testing task implementing blind comparison study with N=100 sample, 2+ sales reps, and Cohen's kappa >0.85 calculation per SC-004
- [ ] T137 Validate all 7 quickstart.md integration test scenarios work end-to-end: (1) CSV Upload to Report Happy Path, (2) Column Mapping Preview, (3) Storage Migration Local→MySQL, (4) Duplicate Detection, (5) Multi-LLM Consensus, (6) Persona Scoring, (7) API Failure Graceful Degradation
- [X] T138 [P] Create sample CSV files for testing in __tests__/fixtures/ (sample-badge-scans-50.csv, non-standard-headers.csv, duplicate-scans.csv)
- [ ] T139 [P] Setup CI/CD pipeline configuration for automated testing and deployment
- [ ] T140 [P] Add error boundary components for graceful error handling in UI
- [ ] T141 [P] Implement loading states and skeleton screens for all async operations
- [ ] T142 [P] Add accessibility improvements (ARIA labels, keyboard navigation, screen reader support)
- [ ] T143 [P] Optimize bundle size (code splitting, lazy loading for report pages)
- [X] T144 Code cleanup: Remove unused imports, console.logs, and dead code across all files
- [X] T145 Final constitution compliance audit (verify all 7 principles implemented correctly)
- [ ] T146 Performance benchmark validation with specific test cases: (a) SC-001: 100 badge scans processed in under 5 minutes, (b) SC-005: 1000 badge scans processed without degradation, (c) SC-008: Report filtering returns results in under 2 seconds for 500 leads dataset
- [ ] T150 [P] Implement enrichment success rate monitoring dashboard widget in components/dashboard/enrichment-metrics.tsx tracking success/failure rates per SC-002 (80%+ target)
- [ ] T151 [P] Implement user analytics tracking in lib/analytics/tracker.ts for persona adoption metrics per SC-007 (90% adoption target within first week)
- [ ] T152 [P] Create CRM import validation tests in __tests__/integration/crm-import.test.ts validating CSV/PDF exports against Salesforce, HubSpot, Zoho import schemas per SC-009

---

## Phase 7: User Story 4 - Persona Type Management (Priority: P2) 🎯 NEW

**Goal**: Enable marketing managers to define three distinct persona types (Exhibitor, Target Company, Target People) with AI-assisted generation for Exhibitor personas based on website analysis.

**Independent Test**: Trigger AI persona generation for exhibitor company, verify three persona types are created with appropriate criteria fields, edit and save changes, then process badge scans to verify dual-tier scoring (Company Tier + Contact Tier).

### Type Definitions and Core Logic (FR-025, FR-032)

- [X] T153 [P] [US4] Add PersonaType enum and update Persona interface in lib/types/index.ts with type field, autoGenerated flag, and websiteSource
- [X] T154 [P] [US4] Implement dual-tier calculator in lib/scoring/dual-tier-calculator.ts for Company Tier (60%) + Contact Tier (40%) = Combined Tier
- [ ] T155 [US4] Update persona matcher agent to support three persona types with separate matching logic for Exhibitor, TargetCompany, TargetPeople
- [ ] T156 [P] [US4] Create AI persona generator agent in lib/enrichment/agents/persona-generator.ts for website scraping and criteria extraction
- [ ] T157 [US4] Implement persona type selector component in components/personas/persona-type-selector.tsx

### API Routes and UI

- [ ] T158 [US4] Update persona API routes to support persona type in creation and filtering
- [ ] T159 [US4] Create persona generation API route in app/api/personas/generate/route.ts triggering AI analysis of exhibitor website
- [ ] T160 [US4] Add persona type tabs to personas page UI for viewing/editing by type

**Checkpoint**: User Story 4 complete - three persona types functional with AI-generated Exhibitor personas

---

## Phase 8: User Story 5 - MEDDIC Qualification (Priority: P3)

**Goal**: Enable sales managers to trigger deep-dive MEDDIC qualification analysis for Hot/Warm tier opportunities, calculating scores across six dimensions and identifying missing decision makers.

**Independent Test**: Select a Hot tier company, trigger MEDDIC analysis, verify six dimension scores are calculated, economic buyer and champion are identified, missing decision makers are discovered, and engagement strategy is recommended.

### MEDDIC Analysis Agent (FR-026)

- [X] T161 [P] [US5] Add MEDDICScore interface in lib/types/index.ts with six dimensions and decision maker identification
- [ ] T162 [P] [US5] Create MEDDIC Analyzer agent in lib/enrichment/agents/meddic-analyzer.ts for qualification scoring
- [ ] T163 [P] [US5] Implement decision maker discovery logic using LinkedIn and company research
- [ ] T164 [P] [US5] Create engagement strategy generator based on MEDDIC scores

### API Routes and UI

- [ ] T165 [US5] Create MEDDIC analysis API route in app/api/enrichment/meddic/route.ts for on-demand analysis
- [ ] T166 [US5] Create MEDDIC score display component in components/reports/meddic-card.tsx showing six dimensions and decision makers
- [ ] T167 [US5] Add "Run MEDDIC Deep Dive" button to company reports for Hot/Warm tier leads

**Checkpoint**: User Story 5 complete - MEDDIC qualification available for qualified opportunities

---

## Phase 9: User Story 6 - Tagging and List Management (Priority: P3)

**Goal**: Enable marketing managers to organize leads using custom tags and lists (static or dynamic) for targeted campaigns and sales assignment.

**Independent Test**: Create custom tags, apply to contacts in bulk, create static and dynamic lists, verify filtering and exporting work with tag/list criteria.

### Tag Management (FR-029)

- [X] T168 [P] [US6] Add Tag interface in lib/types/index.ts with name, color, description
- [X] T169 [P] [US6] Create tag API routes in app/api/tags/route.ts and app/api/tags/[tagId]/route.ts
- [X] T170 [US6] Create bulk tag application API in app/api/badge-scans/apply-tags/route.ts
- [ ] T171 [P] [US6] Create tag management UI component in components/tags/tag-manager.tsx with color picker
- [ ] T172 [US6] Add tag selector to badge scan list for filtering

### List Management (FR-030)

- [X] T173 [P] [US6] Add List interface in lib/types/index.ts with static/dynamic types
- [ ] T174 [US6] Create list API routes in app/api/lists/route.ts and app/api/lists/[listId]/route.ts
- [ ] T175 [P] [US6] Implement dynamic list evaluation logic refreshing membership based on filter criteria
- [ ] T176 [US6] Create list management UI in app/lists/page.tsx with static/dynamic list creation
- [ ] T177 [US6] Add list membership display to badge scan detail view

### Integration with Reports

- [X] T178 [US6] Update ReportFilters interface to include tags and lists arrays
- [ ] T179 [US6] Add tag and list filters to report generation UI
- [ ] T180 [US6] Update report export to include tag and list information

**Checkpoint**: User Story 6 complete - full organizational workflow with tags and lists

---

## Phase 10: Additional Enhancements

**Purpose**: Supporting features for new user stories

### Proximity Detection (FR-031)

- [X] T181 [P] Add ProximityGroup interface and proximity fields to BadgeScan in lib/types/index.ts
- [X] T182 [P] Implement proximity detection algorithm in lib/detection/proximity-detector.ts
- [ ] T183 Integrate proximity detection into CSV upload workflow
- [ ] T184 [P] Create proximity group display component in components/reports/proximity-indicator.tsx
- [ ] T185 Add proximity group filtering to reports

### Async Report Generation (FR-027, FR-028)

- [X] T186 [P] Add ReportType enum and ReportJob interface in lib/types/index.ts
- [ ] T187 [P] Implement report job queue in lib/reports/report-queue.ts with priority and status tracking
- [ ] T188 Extend Report interface with reportType field for four report types (CRO Summary, Company Summary, Contact Summary, Merged Report)
- [ ] T189 [P] Create async report generation worker handling job queue
- [ ] T190 Create report job status API in app/api/reports/jobs/[jobId]/route.ts
- [ ] T191 [P] Add report job notification system (in-app and email)
- [ ] T192 Create report generation progress component in components/reports/report-job-progress.tsx

### Storage Adapter Updates

- [ ] T193 Add Tag CRUD operations to StorageAdapter interface (saveTag, getTag, getAllTags, updateTag, deleteTag, applyTagsToBadgeScans)
- [ ] T194 Add List CRUD operations to StorageAdapter interface (saveList, getList, getAllLists, updateList, deleteList, evaluateDynamicList)
- [ ] T195 Add ProximityGroup operations to StorageAdapter interface (saveProximityGroup, getProximityGroup, getAllProximityGroups)
- [ ] T196 Add MEDDICScore operations to StorageAdapter interface (saveMEDDICScore, getMEDDICScore, getAllMEDDICScores)
- [ ] T197 Add ReportJob operations to StorageAdapter interface (saveReportJob, getReportJob, getAllReportJobs, updateReportJobStatus)
- [ ] T198 Add CombinedTierCalculation storage operations
- [ ] T199 [P] Implement Tag operations in LocalStorageAdapter
- [ ] T200 [P] Implement List operations in LocalStorageAdapter
- [ ] T201 [P] Implement ProximityGroup operations in LocalStorageAdapter
- [ ] T202 [P] Implement MEDDICScore operations in LocalStorageAdapter
- [ ] T203 [P] Implement ReportJob operations in LocalStorageAdapter

**Checkpoint**: All FR-025 through FR-032 foundational features implemented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion - Can proceed independently
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion - Can proceed in parallel with US1
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion and US1 completion (requires enrichment orchestrator and scoring logic)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Can run in parallel with US1 (different storage adapters implementation)
- **User Story 3 (P3)**: Requires US1 complete (persona matching depends on enrichment orchestrator and scoring logic being implemented)

### Critical Path

```
Setup (Phase 1)
  → Foundational (Phase 2) [BLOCKING - required for all stories]
    → User Story 1 (Phase 3) [P1 - MVP - highest priority]
      → User Story 3 (Phase 5) [P3 - depends on US1 scoring logic]
    → User Story 2 (Phase 4) [P2 - can run parallel with US1/US3]
  → Polish (Phase 6) [after all stories complete]
```

### Within Each User Story

**User Story 1 (Badge Scan Upload and Processing)**:
- CSV parsing utilities before upload API route (T029, T030 → T031)
- LLM client wrappers before consensus algorithm (T034-T037 → T038)
- Sub-agents before orchestrator (T039-T041 → T042)
- Orchestrator before batch processing (T042 → T043-T046)
- Storage operations before report generation (T050 → T054)
- Report generation before export functionality (T054-T058 → T061-T069)
- Templates before generators (T063, T065 → T064, T066)

**User Story 2 (Storage Backend Configuration)**:
- All MySQL operations can run in parallel (T077-T085 all marked [P])
- All HubSpot operations can run in parallel (T089-T096 all marked [P])
- Adapter implementations before factory registration (T076-T087, T088-T098 → factory updates)
- Settings UI components can run in parallel (T100-T101 marked [P])
- Adapter switching logic requires migration operations complete (T084, T095 → T104)

**User Story 3 (Persona Template Management)**:
- Persona editor components can run in parallel (T111-T112 marked [P])
- API routes can run in parallel (T115-T116 marked [P])
- Re-processing requires persona API routes complete (T115-T116 → T120)

### Parallel Opportunities

**Within Setup Phase**:
- T002, T003, T004 (all dependency installations)
- T006, T008, T009, T010 (configuration files)
- T012, T013, T014 (setup artifacts)

**Within Foundational Phase**:
- T016, T020, T022, T023 (independent utilities)
- T024, T025, T026, T027 (independent infrastructure)

**Within User Story 1**:
- T029, T030 (CSV utilities - different files)
- T034, T035, T036, T037 (LLM clients - different providers)
- T039, T040, T041 (sub-agents - different domains)
- T048, T049 (scoring utilities - different files)
- T054, T055, T056 (report API routes - different endpoints)
- T059, T060 (report components - different concerns)
- T061, T062, T063, T064, T065, T066 (export utilities - different formats)
- T074 (event API - independent of other US1 tasks in parallel window)

**Within User Story 2**:
- T077-T085 (all MySQL operations - independent methods)
- T089-T096 (all HubSpot operations - independent methods)
- T100, T101 (UI components - different concerns)
- T108, T109 (database scripts - independent utilities)

**Within User Story 3**:
- T111, T112 (editor components - different concerns)
- T115, T116 (API routes - different endpoints)

**Within Polish Phase**:
- T125-T146 (all polish tasks are independent)

---

## Parallel Execution Examples

### User Story 1 - LLM Clients
```bash
# Launch all LLM client implementations together:
Task T034: "Create Claude API client wrapper in lib/enrichment/llm-providers/claude-client.ts"
Task T035: "Create OpenAI GPT-4 client wrapper in lib/enrichment/llm-providers/openai-client.ts"
Task T036: "Create Google Gemini client wrapper in lib/enrichment/llm-providers/gemini-client.ts"
Task T037: "Create Perplexity API client wrapper in lib/enrichment/llm-providers/perplexity-client.ts"
```

### User Story 1 - Sub-Agents
```bash
# Launch all sub-agent implementations together:
Task T039: "Create Company Research sub-agent in lib/enrichment/agents/company-research.ts"
Task T040: "Create Persona Matcher sub-agent in lib/enrichment/agents/persona-matcher.ts"
Task T041: "Create Pain Point Analyzer sub-agent in lib/enrichment/agents/pain-point-analyzer.ts"
```

### User Story 1 - Export Utilities
```bash
# Launch all export utility implementations together:
Task T061: "Implement CSV export utility in lib/export/csv-exporter.ts"
Task T062: "Implement PDF export utility in lib/export/pdf-exporter.ts"
Task T063: "Create CRO_summary.md template in lib/templates/cro-summary.md"
Task T064: "Implement CRO_summary.md generator in lib/export/cro-summary-generator.ts"
Task T065: "Create company report template in lib/templates/company-report.md"
Task T066: "Implement company report generator in lib/export/company-report-generator.ts"
```

### User Story 2 - MySQL Operations
```bash
# Launch all MySQL adapter operations together:
Task T077: "Implement all BadgeScan operations for MySQL adapter"
Task T078: "Implement all EnrichedCompany operations for MySQL adapter"
Task T079: "Implement all Persona operations for MySQL adapter"
Task T080: "Implement all PersonaMatch operations for MySQL adapter"
Task T081: "Implement all Report operations for MySQL adapter"
Task T082: "Implement all Event operations for MySQL adapter"
Task T083: "Implement configuration operations for MySQL adapter"
Task T084: "Implement migration operations for MySQL adapter"
Task T085: "Implement exportToFormat for MySQL adapter"
```

### Cross-Story Parallelization
```bash
# After Foundational phase completes, launch multiple user stories:
User Story 1 Tasks: T029-T075 (entire badge scan upload workflow)
User Story 2 Tasks: T076-T109 (storage adapter implementations)
# Note: US3 must wait for US1 to complete due to dependency on scoring logic
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Goal**: Deliver working end-to-end badge scan processing in shortest time

1. Complete Phase 1: Setup (T001-T014)
2. Complete Phase 2: Foundational (T015-T028) - **CRITICAL BLOCKING PHASE**
3. Complete Phase 3: User Story 1 (T029-T075)
4. **STOP and VALIDATE**: Test complete CSV upload → enrichment → report workflow including CRO_summary.md and company reports
5. Deploy/demo MVP with Local Storage adapter

**Estimated Timeline**: Setup (1 day) + Foundational (2-3 days) + US1 (8-12 days) = **11-16 days to MVP**

**MVP Capabilities**:
- ✅ Upload badge scan CSV files with intelligent column mapping
- ✅ Multi-LLM enrichment with consensus verification
- ✅ Persona-based tier assignment (using default personas)
- ✅ Generate tiered reports with filtering
- ✅ Export reports to CSV/PDF
- ✅ **NEW**: Generate CRO_summary.md with executive summary + top 10 Hot leads + follow-up priorities
- ✅ **NEW**: Generate individual company reports with profile + persona match + actionable insights
- ✅ Duplicate detection and resolution
- ✅ Local Storage (no database required)
- ✅ API keys encrypted with AES-256
- ✅ CSV validation errors with 3-part format

**What's NOT in MVP**:
- ❌ MySQL/HubSpot storage adapters (use Local Storage)
- ❌ Custom persona creation (use default personas)

### Incremental Delivery

**Goal**: Deliver working increments that add value progressively

1. **Foundation** (Setup + Foundational): Project initialized, storage abstraction ready
2. **MVP** (User Story 1): Full badge scan processing with Local Storage + new report formats
   - **Deploy/Demo** - Immediate business value for single-user deployments
3. **Production Scale** (User Story 2): Add MySQL and HubSpot adapters
   - **Deploy/Demo** - Enterprise ready with database and CRM integration
4. **Customization** (User Story 3): Add persona template management
   - **Deploy/Demo** - Fully customizable to business-specific target markets
5. **Polish**: Production hardening and optimization

**Timeline**: Foundation (3 days) → MVP (11 days) → Production (6 days) → Customization (3 days) → Polish (2 days) = **25 days total**

### Parallel Team Strategy

**With 3 Developers**:

1. **Foundation Phase** (all together): 2-3 days
   - Everyone works on T015-T028 to establish shared infrastructure
2. **User Story Phase** (parallel work):
   - **Developer A**: User Story 1 (T029-T075) - 8-12 days
   - **Developer B**: User Story 2 (T076-T109) - 6-8 days
   - **Developer C**: Assists US1, then starts US3 after US1 scoring logic complete
3. **Integration**: 1-2 days merging and testing all stories together
4. **Polish**: All together on T125-T146

**Timeline with 3 devs**: Foundation (3 days) + Parallel stories (12 days) + Integration (2 days) + Polish (2 days) = **19 days total**

---

## Success Criteria Validation

After implementation, validate against spec.md success criteria:

- **SC-001**: Process 100 badge scans in under 5 minutes (test with benchmark)
- **SC-002**: Enrichment success rate >= 80% (monitor in enrichment status API)
- **SC-003**: Full workflow completion in under 10 minutes first use (UX testing)
- **SC-004**: Tier categorization 85% alignment with manual review via blind comparison study with N=100, 2+ sales reps, Cohen's kappa >0.85 (implement in T136)
- **SC-005**: Process 1000 badge scans without degradation (load testing)
- **SC-006**: Storage adapter switch in under 2 minutes (migration testing)
- **SC-007**: 90% custom persona adoption within first week (user analytics)
- **SC-008**: Report filtering under 2 seconds for 500 leads (performance testing)
- **SC-009**: Exported reports CRM-compatible (import testing)
- **SC-010**: Actionable error messages with 3-part format (what failed, how to fix, example) enable self-correction (UX testing)

---

## Notes

- **[P] marker**: Tasks touching different files with no dependencies can run in parallel
- **[Story] label**: Maps each task to its user story for traceability and independent validation
- **File paths**: All paths are absolute from project root (e.g., lib/storage/adapter.ts, not ./storage/adapter.ts)
- **Checkpoints**: Stop at any user story checkpoint to validate that story independently before proceeding
- **Constitution compliance**: Orchestrator (T042) implements hub-and-spoke pattern, multi-LLM consensus (T038) enforces zero hallucination, storage adapter pattern (T017-T028, T076-T098) enables pluggable backends, exportToFormat (T069, T085, T096) generates CRO_summary.md and company reports per constitution
- **New requirements**: FR-018 (CRO_summary.md) covered by T063-T064, T069, T085, T096; FR-019 (company reports) covered by T065-T066, T069, T085, T096; FR-008 (AES-256 encryption) covered by T028, T101-T102; FR-014 (3-part errors) covered by T016, T024, T027, T029, T031; SC-004 (Cohen's kappa) covered by T136
- **No tests included**: Tests were not explicitly requested in spec.md, following Speckit guideline to exclude test tasks unless requested
- **Commit strategy**: Commit after completing each task or logical group of parallel tasks
- **Error handling**: All API routes should implement try-catch with structured error responses using 3-part format
- **Security**: Input validation using Zod schemas, parameterized queries for SQL, API key encryption at rest with AES-256
