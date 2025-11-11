# Data Model: Trade Show Intelligence Platform

**Feature**: 001-trade-show-intelligence
**Date**: 2025-11-09
**Purpose**: Define all entities, relationships, validation rules, and state transitions

---

## Core Entities

### 1. BadgeScan

Represents raw contact data captured from trade show badge scan exports.

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | `string` (UUID) | Yes | UUID v4 format | Unique identifier for badge scan |
| `eventId` | `string` | Yes | Non-empty string | Event identifier (groups scans from same trade show) |
| `scannedAt` | `DateTime` | Yes | ISO 8601 timestamp | When badge was scanned at booth |
| `firstName` | `string` | No* | Max 100 chars | Contact first name (*name OR email required) |
| `lastName` | `string` | No* | Max 100 chars | Contact last name (*name OR email required) |
| `email` | `string` | No* | Valid email format | Contact email address (*name OR email required) |
| `company` | `string` | Yes | Max 200 chars | Company name |
| `jobTitle` | `string` | No | Max 150 chars | Contact job title/role |
| `phone` | `string` | No | E.164 format or null | Contact phone number |
| `boothLocation` | `string` | No | Max 50 chars | Booth number where scan occurred |
| `eventName` | `string` | Yes | Max 200 chars | Trade show event name |
| `notes` | `string` | No | Max 1000 chars | Optional notes from booth staff |
| `customFields` | `Record<string, string>` | No | Max 10 key-value pairs | Additional CSV columns not mapped to standard fields |
| `enrichmentStatus` | `EnrichmentStatus` | Yes | Enum | Current enrichment processing status |
| `createdAt` | `DateTime` | Yes | ISO 8601 timestamp | When record created in system |
| `updatedAt` | `DateTime` | Yes | ISO 8601 timestamp | Last modification timestamp |

**Validation Rules**:
- At least one of `firstName`/`lastName` OR `email` must be present
- If `email` present, must pass regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `phone` if present must match E.164 format or local format patterns
- `customFields` keys must be alphanumeric + underscores only

**Relationships**:
- One-to-zero-or-one with `EnrichedCompany` (via `badgeScanId` foreign key)
- One-to-one with `LeadTier` (via `badgeScanId` foreign key)
- Many-to-one with `Event` (via `eventId`)

**State Transitions** (via `enrichmentStatus`):
```
PENDING → PROCESSING → ENRICHED
         ↓
         FAILED → PENDING (manual retry)
         ↓
         MANUAL_REVIEW (duplicate detected or enrichment conflict)
```

---

### 2. EnrichedCompany

Extended company profile created by multi-LLM verification process.

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | `string` (UUID) | Yes | UUID v4 format | Unique identifier for enriched company record |
| `badgeScanId` | `string` (UUID) | Yes | Valid BadgeScan ID | Reference to source badge scan |
| `companyName` | `string` | Yes | Max 200 chars | Canonical company name (verified by LLMs) |
| `domain` | `string` | No | Valid domain format | Company website domain (e.g., "acme.com") |
| `employeeCount` | `number` | No | 1-10,000,000 | Estimated employee count |
| `employeeRange` | `string` | No | Enum: "1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+" | Employee count range category |
| `industry` | `string` | No | Max 100 chars | Primary industry classification |
| `industryCodes` | `string[]` | No | Valid NAICS codes | NAICS industry classification codes |
| `annualRevenue` | `number` | No | 0-1,000,000,000,000 | Estimated annual revenue (USD) |
| `revenueRange` | `string` | No | Enum: "<1M", "1M-10M", "10M-50M", "50M-100M", "100M-500M", "500M-1B", "1B+" | Revenue range category |
| `techStack` | `string[]` | No | Max 50 items | Technologies used (e.g., ["Salesforce", "AWS", "React"]) |
| `fundingStage` | `string` | No | Enum: "Bootstrap", "Seed", "Series A", "Series B", "Series C+", "Public", "Private Equity", "Unknown" | Funding/company stage |
| `totalFunding` | `number` | No | 0-100,000,000,000 | Total funding raised (USD) |
| `headquarters` | `string` | No | Max 200 chars | HQ location (city, country) |
| `founded` | `number` | No | 1800-2100 | Year company founded |
| `description` | `string` | No | Max 500 chars | Brief company description |
| `linkedinUrl` | `string` | No | Valid URL | LinkedIn company page URL |
| `twitterHandle` | `string` | No | Max 50 chars | Twitter/X handle |
| `consensusMetadata` | `ConsensusMetadata` | Yes | Object | Multi-LLM verification details |
| `enrichedAt` | `DateTime` | Yes | ISO 8601 timestamp | When enrichment completed |
| `dataSource` | `string[]` | Yes | Non-empty array | LLM providers used (e.g., ["Claude", "GPT-4", "Gemini"]) |

**Validation Rules**:
- `employeeCount` and `employeeRange` should be consistent (validation warning if mismatch)
- `annualRevenue` and `revenueRange` should be consistent
- `domain` must be lowercase, no protocol, no path (e.g., "example.com" not "https://example.com/")
- `techStack` items must be deduplicated and normalized (case-insensitive)
- `consensusMetadata` must contain entries for all enriched fields with non-null values

**Relationships**:
- One-to-one with `BadgeScan` (via `badgeScanId`)
- Used by `PersonaMatch` for scoring calculations

**Nested Entity**: `ConsensusMetadata`

| Field | Type | Description |
|-------|------|-------------|
| `fieldName` | `string` | Name of enriched field (e.g., "employeeCount") |
| `consensusValue` | `any` | Final value after multi-LLM verification |
| `providerResponses` | `ProviderResponse[]` | Individual LLM responses |
| `agreementLevel` | `number` | Percentage of LLMs agreeing (0-100) |
| `confidence` | `string` | Enum: "High" (75-100%), "Medium" (50-74%), "Low" (<50%) |
| `needsManualReview` | `boolean` | True if no consensus reached |

**Nested Entity**: `ProviderResponse`

| Field | Type | Description |
|-------|------|-------------|
| `provider` | `string` | LLM provider name (e.g., "Claude", "GPT-4") |
| `value` | `any` | Provider's response for this field |
| `confidence` | `number` | Provider's confidence score (0-1) if available |
| `responseTime` | `number` | API response time in milliseconds |

---

### 3. Persona

Business persona definition used for lead scoring and tier assignment.

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | `string` (UUID) | Yes | UUID v4 format | Unique identifier for persona |
| `name` | `string` | Yes | Max 100 chars, unique | Persona display name (e.g., "Enterprise Tech Buyer") |
| `description` | `string` | No | Max 500 chars | Description of ideal customer profile |
| `isDefault` | `boolean` | Yes | Boolean | Whether this persona is used by default for new events |
| `criteria` | `PersonaCriteria` | Yes | Object | Scoring criteria definitions |
| `weights` | `PersonaWeights` | Yes | Object | Importance weights for each criterion |
| `createdAt` | `DateTime` | Yes | ISO 8601 timestamp | When persona created |
| `updatedAt` | `DateTime` | Yes | ISO 8601 timestamp | Last modification timestamp |
| `createdBy` | `string` | No | User ID or "SYSTEM" | Who created persona (for audit) |

**Validation Rules**:
- `name` must be unique across all personas
- All weights in `PersonaWeights` must sum to 1.0 (100%)
- At least one criterion in `PersonaCriteria` must be defined
- Weight must be > 0 for any defined criterion

**Relationships**:
- One-to-many with `PersonaMatch` (multiple badge scans scored against same persona)

**Nested Entity**: `PersonaCriteria`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `companySizeRange` | `{ min: number, max: number }` | No | Employee count range (e.g., {min: 500, max: 10000}) |
| `industries` | `string[]` | No | Target industries (e.g., ["Technology", "SaaS", "Cloud"]) |
| `technologies` | `string[]` | No | Required/preferred tech stack (e.g., ["Salesforce", "AWS"]) |
| `revenueRange` | `{ min: number, max: number }` | No | Annual revenue range in USD |
| `geographies` | `string[]` | No | Target countries/regions (e.g., ["United States", "Canada"]) |
| `decisionMakerTitles` | `string[]` | No | Target job titles (e.g., ["CTO", "VP Engineering", "Director IT"]) |
| `fundingStages` | `string[]` | No | Target funding stages (e.g., ["Series B", "Series C+", "Public"]) |

**Nested Entity**: `PersonaWeights`

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `companySize` | `number` | Yes | 0-1 | Weight for company size criterion |
| `industry` | `number` | Yes | 0-1 | Weight for industry match |
| `technology` | `number` | Yes | 0-1 | Weight for tech stack match |
| `revenue` | `number` | Yes | 0-1 | Weight for revenue range |
| `geography` | `number` | Yes | 0-1 | Weight for geographic match |
| `decisionMaker` | `number` | Yes | 0-1 | Weight for job title match |
| `fundingStage` | `number` | Yes | 0-1 | Weight for funding stage match |

**Constraint**: Sum of all weights must equal 1.0 (validated on save)

---

### 4. PersonaMatch

Lead scoring result linking a badge scan to a persona with calculated fit score.

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | `string` (UUID) | Yes | UUID v4 format | Unique identifier for persona match |
| `badgeScanId` | `string` (UUID) | Yes | Valid BadgeScan ID | Reference to badge scan |
| `personaId` | `string` (UUID) | Yes | Valid Persona ID | Reference to persona used for scoring |
| `fitScore` | `number` | Yes | 0-100 | Percentage match to persona criteria |
| `tier` | `LeadTier` | Yes | Enum | Assigned tier based on fitScore thresholds |
| `criteriaMatches` | `CriteriaMatch[]` | Yes | Array | Detailed breakdown of criterion matching |
| `actionableInsights` | `string[]` | No | Max 10 items | AI-generated conversation starters/pain points |
| `calculatedAt` | `DateTime` | Yes | ISO 8601 timestamp | When scoring calculation performed |

**Validation Rules**:
- `fitScore` must be 0-100
- `tier` must align with `fitScore`:
  - Hot: fitScore >= 70
  - Warm: 40 <= fitScore < 70
  - Cold: fitScore < 40
  - Unscored: Missing enrichment data (fewer than 30% of weighted criteria have data)

**Relationships**:
- Many-to-one with `BadgeScan` (via `badgeScanId`)
- Many-to-one with `Persona` (via `personaId`)

**Nested Entity**: `CriteriaMatch`

| Field | Type | Description |
|-------|------|-------------|
| `criterionName` | `string` | Name of criterion (e.g., "companySize", "industry") |
| `matched` | `boolean` | Whether criterion was satisfied |
| `actualValue` | `any` | Actual value from enriched data (e.g., 750 employees) |
| `targetValue` | `any` | Target value from persona (e.g., {min: 500, max: 10000}) |
| `weight` | `number` | Weight of this criterion (0-1) |
| `contributionToScore` | `number` | Points contributed to total fitScore |

---

### 5. LeadTier

Enumeration defining lead quality tiers.

**Values**:

| Value | Fit Score Range | Visual Indicator | Description |
|-------|----------------|------------------|-------------|
| `Hot` | >= 70% | Red badge | High-priority leads matching 70%+ of persona criteria |
| `Warm` | 40-69% | Orange badge | Medium-priority leads with moderate fit |
| `Cold` | < 40% | Blue badge | Low-priority leads with minimal persona alignment |
| `Unscored` | N/A | Gray badge | Insufficient enrichment data to calculate fit score (< 30% criteria coverage) |

**Business Rules**:
- Tier assignment based on highest `fitScore` across all persona matches
- If badge scan matches multiple personas with equal scores, assigned to all (displayed with multi-persona indicator in UI)
- If enrichment fails or data insufficient, defaults to `Unscored`

---

### 6. Report

Generated document organizing enriched badge scans by tier with filtering and export capabilities.

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | `string` (UUID) | Yes | UUID v4 format | Unique identifier for report |
| `eventId` | `string` | Yes | Valid Event ID | Event this report covers |
| `name` | `string` | Yes | Max 200 chars | Report display name |
| `filters` | `ReportFilters` | No | Object | Active filters applied to report |
| `generatedAt` | `DateTime` | Yes | ISO 8601 timestamp | When report generated |
| `badgeScanIds` | `string[]` | Yes | Array of valid IDs | Badge scans included in report |
| `statistics` | `ReportStatistics` | Yes | Object | Summary metrics for report |
| `exportedFormats` | `string[]` | No | Array of "CSV" or "PDF" | Formats this report has been exported to |

**Relationships**:
- One-to-many with `BadgeScan` (via `badgeScanIds` array)
- Many-to-one with `Event` (via `eventId`)

**Nested Entity**: `ReportFilters`

| Field | Type | Description |
|-------|------|-------------|
| `tiers` | `LeadTier[]` | Filter by tier (e.g., ["Hot", "Warm"]) |
| `industries` | `string[]` | Filter by industry |
| `employeeRanges` | `string[]` | Filter by employee count range |
| `revenueRanges` | `string[]` | Filter by revenue range |
| `technologies` | `string[]` | Filter by tech stack |
| `personas` | `string[]` | Filter by persona match (persona IDs) |
| `searchQuery` | `string` | Text search across name, company, title fields |

**Nested Entity**: `ReportStatistics`

| Field | Type | Description |
|-------|------|-------------|
| `totalScans` | `number` | Total badge scans in report |
| `enrichedCount` | `number` | Successfully enriched scans |
| `hotCount` | `number` | Hot tier count |
| `warmCount` | `number` | Warm tier count |
| `coldCount` | `number` | Cold tier count |
| `unscoredCount` | `number` | Unscored tier count |
| `topIndustries` | `{ industry: string, count: number }[]` | Top 5 industries by frequency |
| `averageFitScore` | `number` | Mean fit score across all scored leads |
| `enrichmentSuccessRate` | `number` | Percentage of scans successfully enriched (0-100) |

---

### 7. Event

Trade show event grouping for badge scans.

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | `string` | Yes | Non-empty string | Unique identifier for event |
| `name` | `string` | Yes | Max 200 chars | Event name (e.g., "AWS re:Invent 2025") |
| `startDate` | `DateTime` | No | ISO 8601 date | Event start date |
| `endDate` | `DateTime` | No | ISO 8601 date | Event end date (must be >= startDate) |
| `location` | `string` | No | Max 200 chars | Event location (city, venue) |
| `boothNumber` | `string` | No | Max 50 chars | Company's booth number at event |
| `createdAt` | `DateTime` | Yes | ISO 8601 timestamp | When event record created |

**Validation Rules**:
- `endDate` must be >= `startDate` if both provided
- `id` typically generated as slug from `name` (e.g., "aws-reinvent-2025")

**Relationships**:
- One-to-many with `BadgeScan` (via `eventId`)
- One-to-many with `Report` (via `eventId`)

---

### 8. StorageAdapterConfiguration

Configuration for active storage backend.

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | `string` (UUID) | Yes | UUID v4 format | Configuration identifier |
| `adapterType` | `StorageAdapterType` | Yes | Enum | Active storage adapter |
| `localStorageConfig` | `LocalStorageConfig` | Conditional | Object if adapterType=LOCAL | Local storage settings |
| `mysqlConfig` | `MySQLConfig` | Conditional | Object if adapterType=MYSQL | MySQL connection settings |
| `hubspotConfig` | `HubSpotConfig` | Conditional | Object if adapterType=HUBSPOT | HubSpot API settings |
| `isActive` | `boolean` | Yes | Boolean | Whether this config is currently active |
| `lastTestedAt` | `DateTime` | No | ISO 8601 timestamp | Last successful connection test |
| `createdAt` | `DateTime` | Yes | ISO 8601 timestamp | When configuration created |
| `updatedAt` | `DateTime` | Yes | ISO 8601 timestamp | Last modification timestamp |

**Validation Rules**:
- Only one configuration can have `isActive=true` at a time
- Configuration object (`localStorageConfig`/`mysqlConfig`/`hubspotConfig`) must match `adapterType`

**Nested Entity**: `StorageAdapterType` (Enum)

| Value | Description |
|-------|-------------|
| `LOCAL` | Local JSON file storage |
| `MYSQL` | MySQL database |
| `HUBSPOT` | HubSpot CRM integration |

**Nested Entity**: `LocalStorageConfig`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dataDirectory` | `string` | Yes | Absolute path to data directory (default: "/data") |

**Nested Entity**: `MySQLConfig`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `host` | `string` | Yes | Database host |
| `port` | `number` | Yes | Database port (default: 3306) |
| `database` | `string` | Yes | Database name |
| `username` | `string` | Yes | Database username |
| `password` | `string` | Yes | Database password (encrypted at rest) |
| `connectionPoolSize` | `number` | No | Max connections in pool (default: 10) |

**Nested Entity**: `HubSpotConfig`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | `string` | Yes | HubSpot API key (encrypted at rest) |
| `portalId` | `string` | Yes | HubSpot portal ID |
| `customPropertyPrefix` | `string` | No | Prefix for custom properties (default: "tradeshow_") |

---

### 9. EnrichmentStatus

Enumeration for badge scan enrichment processing state.

**Values**:

| Value | Description | Next States |
|-------|-------------|-------------|
| `PENDING` | Awaiting enrichment processing | PROCESSING, MANUAL_REVIEW |
| `PROCESSING` | Enrichment in progress | ENRICHED, FAILED |
| `ENRICHED` | Successfully enriched with company data | (terminal state, can be re-processed if persona changes) |
| `FAILED` | Enrichment failed (API error, rate limit, etc.) | PENDING (manual retry) |
| `MANUAL_REVIEW` | Flagged for manual review (duplicate, enrichment conflict) | PENDING (after review) |

---

## Entity Relationships Diagram

```
Event (1) ─────── (M) BadgeScan (1) ─────── (0-1) EnrichedCompany
                       │                            │
                       │                            │
                       │                            │
                  (M) PersonaMatch (M) ────── (1) Persona
                       │
                       │
                  (M) Report
```

**Explanation**:
- One Event has many BadgeScans
- One BadgeScan has zero or one EnrichedCompany (null if enrichment pending/failed)
- One BadgeScan can have multiple PersonaMatches (scored against multiple personas)
- One Persona can match many BadgeScans
- Reports reference multiple BadgeScans via `badgeScanIds` array

---

## Storage Adapter Interface Contract

All storage adapters must implement these operations for each entity:

### BadgeScan Operations
```typescript
saveBadgeScan(scan: BadgeScan): Promise<string>  // Returns scanId
getBadgeScan(scanId: string): Promise<BadgeScan | null>
getAllBadgeScans(eventId?: string): Promise<BadgeScan[]>
updateBadgeScanStatus(scanId: string, status: EnrichmentStatus): Promise<void>
bulkImportBadgeScans(scans: BadgeScan[]): Promise<string[]>  // Returns scanIds
flagDuplicate(scanId: string, duplicateOfId: string): Promise<void>
```

### EnrichedCompany Operations
```typescript
saveEnrichedCompany(enriched: EnrichedCompany): Promise<string>  // Returns id
getEnrichedCompany(badgeScanId: string): Promise<EnrichedCompany | null>
updateEnrichment(badgeScanId: string, enrichedData: Partial<EnrichedCompany>): Promise<void>
```

### Persona Operations
```typescript
savePersona(persona: Persona): Promise<string>  // Returns personaId
getPersona(personaId: string): Promise<Persona | null>
getAllPersonas(): Promise<Persona[]>
getDefaultPersonas(): Promise<Persona[]>
updatePersona(personaId: string, updates: Partial<Persona>): Promise<void>
deletePersona(personaId: string): Promise<void>
```

### PersonaMatch Operations
```typescript
savePersonaMatch(match: PersonaMatch): Promise<string>  // Returns matchId
getPersonaMatchesForScan(badgeScanId: string): Promise<PersonaMatch[]>
getBestPersonaMatch(badgeScanId: string): Promise<PersonaMatch | null>  // Highest fitScore
```

### Report Operations
```typescript
saveReport(report: Report): Promise<string>  // Returns reportId
getReport(reportId: string): Promise<Report | null>
getAllReports(eventId?: string): Promise<Report[]>
deleteReport(reportId: string): Promise<void>
```

### Event Operations
```typescript
saveEvent(event: Event): Promise<string>  // Returns eventId
getEvent(eventId: string): Promise<Event | null>
getAllEvents(): Promise<Event[]>
```

### Configuration Operations
```typescript
saveStorageConfig(config: StorageAdapterConfiguration): Promise<string>
getActiveStorageConfig(): Promise<StorageAdapterConfiguration>
setActiveStorageConfig(configId: string): Promise<void>
```

### Migration Operations (for adapter switching)
```typescript
exportAll(): Promise<{
  badgeScans: BadgeScan[]
  enrichedCompanies: EnrichedCompany[]
  personas: Persona[]
  personaMatches: PersonaMatch[]
  reports: Report[]
  events: Event[]
}>
importAll(data: ExportedData): Promise<void>
```

---

## Validation Schemas (Zod)

All entities will have corresponding Zod schemas in `lib/validation/schemas.ts`:

```typescript
// Example for BadgeScan
const BadgeScanSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().min(1),
  scannedAt: z.coerce.date(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  company: z.string().max(200),
  jobTitle: z.string().max(150).optional(),
  phone: z.string().optional(),
  // ... remaining fields
}).refine(
  (data) => (data.firstName || data.lastName) || data.email,
  { message: "Must provide name or email" }
)
```

---

## Data Migration Notes

When switching storage adapters (e.g., Local → MySQL):

1. Export all data from current adapter via `exportAll()`
2. Initialize new adapter with connection config
3. Import all data via `importAll(data)`
4. Validate data integrity (row counts, sample queries)
5. Update active configuration
6. Archive old storage (don't delete immediately)

**Performance Consideration**: For 5000+ badge scans, migration may take several minutes. Display progress indicator in UI.

---

## Indexes and Performance

### MySQL Indexes (for production scale)

```sql
-- Badge scans
CREATE INDEX idx_badge_scans_event_id ON badge_scans(event_id);
CREATE INDEX idx_badge_scans_tier ON badge_scans(tier);
CREATE INDEX idx_badge_scans_status ON badge_scans(enrichment_status);
CREATE INDEX idx_badge_scans_email ON badge_scans(email);
CREATE INDEX idx_badge_scans_company ON badge_scans(company);

-- Enriched companies
CREATE INDEX idx_enriched_companies_badge_scan_id ON enriched_companies(badge_scan_id);
CREATE INDEX idx_enriched_companies_name ON enriched_companies(company_name);

-- Persona matches
CREATE INDEX idx_persona_matches_scan_id ON persona_matches(badge_scan_id);
CREATE INDEX idx_persona_matches_persona_id ON persona_matches(persona_id);
CREATE INDEX idx_persona_matches_tier ON persona_matches(tier);

-- Reports
CREATE INDEX idx_reports_event_id ON reports(event_id);
CREATE INDEX idx_reports_generated_at ON reports(generated_at DESC);
```

### Query Performance Targets

- Retrieve all badge scans for event (1000 scans): < 500ms
- Filter report by tier: < 2s (per Success Criteria SC-008)
- Generate new report (500 scans): < 5s
- Search by company name: < 1s

---

## Edge Case Handling

### Duplicate Detection

**Trigger**: Same `email` appears in multiple badge scans for same event

**Behavior**:
1. Set both scans' `enrichmentStatus` to `MANUAL_REVIEW`
2. Create UI showing side-by-side comparison:
   - Scan timestamps
   - Booth locations
   - Job titles (may differ if person changed roles)
   - Custom fields/notes
3. Allow user to:
   - Keep both (different contexts)
   - Merge scans (combine notes, use latest data)
   - Mark one as primary (archive duplicate)

### Enrichment Conflicts

**Trigger**: Multi-LLM consensus fails (providers disagree on company data)

**Behavior**:
1. Store all provider responses in `ConsensusMetadata.providerResponses`
2. Mark field with `needsManualReview=true`
3. Use most common value as `consensusValue` (if 2/4 agree)
4. Flag in UI for manual verification

### Missing Enrichment Data

**Trigger**: Company name not found, APIs fail, or rate limits exceeded

**Behavior**:
1. Set `enrichmentStatus=FAILED`
2. Allow manual retry after cooldown period
3. If 3 retries fail, set `tier=Unscored`
4. Provide manual enrichment form (user can input company data)

---

## Summary

This data model defines 9 core entities supporting the Trade Show Intelligence Platform's workflow from CSV upload through enrichment to tiered reporting. The model enforces constitution principles (pluggable storage via adapter interface, multi-LLM consensus via metadata tracking, batch processing via status state machine) while enabling scalability to 5000+ badge scans per event.
