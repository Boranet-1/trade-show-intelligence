# Technical Research: Trade Show Intelligence Platform

**Feature**: 001-trade-show-intelligence
**Date**: 2025-11-09
**Purpose**: Resolve all NEEDS CLARIFICATION items from Technical Context and document technology decisions

---

## Research Tasks

### 1. Testing Framework Selection

**Unknown**: Testing framework choice (Jest vs Vitest vs alternatives)

**Decision**: Vitest for unit/integration tests, Playwright for E2E tests

**Rationale**:
- **Vitest** chosen over Jest because:
  - Native ESM support (better compatibility with Next.js 13 App Router)
  - Vite-based (faster test execution, HMR for tests)
  - Jest-compatible API (minimal migration friction)
  - Better TypeScript support out-of-the-box
  - Faster startup times for large codebases
- **Playwright** for E2E because:
  - Multi-browser testing (Chromium, Firefox, WebKit)
  - Auto-wait mechanisms reduce flaky tests
  - Built-in test isolation and parallelization
  - Network interception for mocking API calls during enrichment testing
  - Screenshot/video capture on test failures (debugging batch processing issues)

**Alternatives Considered**:
- **Jest**: Mature ecosystem but slower with ESM modules, requires additional configuration for Next.js App Router
- **Cypress**: Good E2E framework but Playwright has better TypeScript support and parallel execution
- **Testing Library alone**: Excellent for component testing but requires additional framework (Vitest/Jest) anyway

**Implementation Notes**:
- Configure Vitest with `vitest.config.ts` extending Next.js config
- Use `@testing-library/react` for component tests
- Mock LLM API calls in unit tests using Vitest's `vi.mock()`
- Use Playwright fixtures for E2E test data (sample CSV files, mocked enrichment responses)

---

## Technology Best Practices

### 2. Next.js 13 App Router Patterns

**Technology**: Next.js 13.5.6 with App Router

**Best Practices**:

#### Server vs Client Components
- **Server Components (default)**: Use for dashboard, reports listing, settings pages (no interactivity, can fetch data directly)
- **Client Components**: Mark with `'use client'` directive for:
  - CSV uploader (file input handling)
  - Column mapper (interactive drag-and-drop)
  - Tier filter (state management for filtering)
  - Persona editor (form state)
- **Benefit**: Reduced JavaScript bundle size (constitution performance goal: filter/search <2s)

#### Data Fetching
- **Server Actions**: Use for form submissions (persona templates, storage settings)
- **Route Handlers** (`app/api/*/route.ts`): Use for file uploads, batch processing endpoints
- **Streaming**: Use `loading.tsx` for Suspense boundaries during report generation

#### Caching Strategy
- **Revalidate enrichment data**: `revalidatePath('/reports/[reportId]')` after batch processing completes
- **Static Generation**: Landing page, docs pages
- **Dynamic Rendering**: Dashboard (shows latest processing status), reports (user-specific data)

### 3. Multi-LLM Consensus Implementation

**Technology**: Claude, GPT-4, Gemini, Perplexity APIs

**Best Practices**:

#### Consensus Algorithm
```
For each company enrichment field (size, industry, revenue):
  1. Query all 4 LLM providers in parallel (Promise.all)
  2. Parse structured responses (Zod schema validation)
  3. Calculate consensus:
     - Exact match across 3+ providers: Accept value
     - 2-way tie: Request 5th tiebreaker query (fallback LLM)
     - No consensus: Mark field as "NEEDS MANUAL REVIEW"
  4. Log disagreements for audit trail
```

#### Rate Limiting Handling
- Implement exponential backoff with jitter
- If provider fails/rate-limited: Continue with remaining 3 providers, lower consensus threshold to 2/3 instead of 3/4
- Cache LLM responses in storage adapter to avoid re-querying same company across multiple badge scans

#### Structured Output
- Use function calling (Claude tools, OpenAI functions, Gemini function declarations)
- Define shared JSON schema for company profile responses
- Validate all LLM outputs with Zod before consensus calculation

**Alternatives Considered**:
- **Single LLM with validation prompting**: Rejected per Constitution I (zero hallucination tolerance)
- **Human-in-the-loop for all enrichments**: Rejected per Constitution III (batch processing requirement, 5000 scans in 2 hours impossible with manual validation)

### 4. Storage Adapter Pattern Design

**Technology**: TypeScript interfaces with runtime implementations

**Best Practices**:

#### Adapter Interface (`lib/storage/adapter.ts`)
```typescript
interface StorageAdapter {
  // Badge scan operations
  saveBadgeScan(scan: BadgeScan): Promise<string>  // Returns scanId
  getBadgeScan(scanId: string): Promise<BadgeScan | null>
  getAllBadgeScans(eventId?: string): Promise<BadgeScan[]>

  // Enrichment operations
  updateEnrichment(scanId: string, enrichedData: EnrichedCompany): Promise<void>

  // Batch operations
  bulkImport(scans: BadgeScan[]): Promise<string[]>  // Returns scanIds

  // Report operations
  getReport(reportId: string): Promise<Report | null>
  generateReport(eventId: string, filters?: ReportFilters): Promise<Report>

  // Migration (for adapter switching)
  exportAll(): Promise<{ scans: BadgeScan[], reports: Report[] }>
  importAll(data: { scans: BadgeScan[], reports: Report[] }): Promise<void>
}
```

#### Configuration Management
- Store active adapter type in environment variable: `STORAGE_ADAPTER=local|mysql|hubspot`
- Adapter factory pattern: `createStorageAdapter(config)` reads env and returns appropriate implementation
- Connection strings/API keys in `.env.local` (never committed)

#### Local Storage Implementation
- Use `fs/promises` for async file operations
- Directory structure: `/data/scans/{scanId}.json`, `/data/reports/{reportId}.json`
- Atomic writes: Write to temp file, then rename (prevents corruption during batch operations)

#### MySQL Implementation
- Use connection pooling (`mysql2/promise` pool)
- Schema versioning with migration scripts in `/database/migrations/`
- Indexes on: `badge_scans.event_id`, `badge_scans.tier`, `enriched_companies.company_name`
- Transaction support for multi-step enrichment updates

#### HubSpot Implementation
- Batch API calls (max 100 contacts per request per HubSpot docs)
- Custom properties: `trade_show_tier`, `persona_match_score`, `enrichment_status`
- Webhook listener for bidirectional sync (CRM updates flow back to platform)
- Retry logic for API errors (exponential backoff)

**Alternatives Considered**:
- **Repository pattern with abstract base class**: Rejected in favor of interface (lighter weight, no inheritance complexity)
- **ORM (Prisma, TypeORM)**: Rejected because adapter pattern already abstracts storage, adding ORM layer creates double abstraction

### 5. CSV Parsing and Intelligent Column Mapping

**Technology**: papaparse library

**Best Practices**:

#### Column Detection Heuristics
```
For each CSV header:
  1. Normalize: lowercase, remove spaces/underscores
  2. Check exact matches: "email" → email field
  3. Check fuzzy matches:
     - "emailaddress", "e-mail", "workEmail" → email
     - "companyname", "company_name", "organization" → company
     - "firstname", "first_name", "fname" → firstName
  4. Use position heuristics for unnamed columns:
     - Column 0 often name, Column 1 often email
  5. Confidence scoring: Exact=100%, Fuzzy=80%, Heuristic=50%
```

#### Preview Step (FR-002a compliance)
- Parse first 5 rows of CSV
- Display detected mapping with confidence scores
- Allow user to manually override mappings before full processing
- Validate required fields present (name OR email, company)

#### Error Handling
- Malformed CSV: Detect via papaparse errors, show line numbers with issues
- Missing required fields: Display validation errors before processing
- Invalid email format: Flag rows, allow user to skip or manually correct

### 6. Persona-Based Scoring Algorithm

**Technology**: TypeScript business logic in `lib/scoring/`

**Best Practices**:

#### Persona Definition Schema
```typescript
interface Persona {
  id: string
  name: string
  criteria: {
    companySize?: { min: number, max: number }  // Employee count
    industries?: string[]  // NAICS codes or industry names
    technologies?: string[]  // Tech stack (e.g., ["Salesforce", "HubSpot"])
    revenueRange?: { min: number, max: number }  // Annual revenue USD
    geography?: string[]  // Countries/regions
    decisionMakerTitles?: string[]  // Job titles (e.g., ["CTO", "VP Engineering"])
  }
  weights: {
    companySize: number  // 0-1 (importance weight)
    industries: number
    technologies: number
    revenueRange: number
    geography: number
    decisionMakerTitles: number
  }
}
```

#### Scoring Calculation
```
For each badge scan + enriched company data:
  For each persona:
    totalScore = 0
    totalWeight = 0

    For each criterion with data available:
      if criterion matches:
        totalScore += weight
      totalWeight += weight

    percentageMatch = (totalScore / totalWeight) * 100

  Assign tier based on best persona match:
    - Hot: percentageMatch >= 70%
    - Warm: 40% <= percentageMatch < 70%
    - Cold: percentageMatch < 40%
    - Unscored: Insufficient enrichment data (totalWeight < 30% of possible)
```

#### Default Personas
- `public/personas/enterprise-tech.json`: 500+ employees, tech industry, $50M+ revenue
- `public/personas/smb-saas.json`: 50-500 employees, SaaS/Cloud, uses modern CRM/marketing tools

### 7. Batch Processing Architecture

**Technology**: Next.js API Routes with background jobs

**Best Practices**:

#### Processing Queue
- Use in-memory queue for MVP (Array with job status tracking)
- Future: Redis/BullMQ for production scale and horizontal scaling
- Job status: `pending`, `processing`, `completed`, `failed`

#### Parallel Processing
- Process enrichments in batches of 10 companies at a time (Promise.allSettled)
- Reason: LLM APIs have rate limits, 10 concurrent = balance speed/limits
- Each batch enriches via multi-LLM consensus (4 LLMs × 10 companies = 40 parallel API calls)

#### Progress Tracking
- WebSocket or Server-Sent Events (SSE) for real-time progress updates
- Emit events: `batch-started`, `company-enriched`, `batch-completed`, `batch-failed`
- Client polls `/api/enrichment/status/{jobId}` if SSE unavailable (fallback)

#### Error Recovery
- Failed company enrichment: Mark as "pending enrichment", continue with batch
- Batch failure: Save partial results, allow resume from last successful position
- Storage adapter failure: Retry 3 times with exponential backoff, then fail batch

**Performance Target Validation**:
- 5000 badge scans ÷ 10 parallel ÷ 4 LLMs = 500 batches
- Assume 5s per LLM call (including consensus) = 5s × 500 batches = 2500s = 42 minutes
- Well within 2-hour constitution requirement

### 8. shadcn/ui Setup and Theme Configuration

**Technology**: shadcn/ui (New York style, Slate theme)

**Best Practices**:

#### Installation
```bash
npx shadcn-ui@latest init
# Select: New York style, Slate theme
# Generates: components/ui/, lib/utils.ts, tailwind.config.js
```

#### Required Components (for feature scope)
- `button`, `card`, `table`, `badge` (tier indicators)
- `dropdown-menu`, `dialog`, `tabs`
- `input`, `label`, `select`, `form` (settings, persona editor)
- `alert`, `toast` (error/success messages)
- `progress` (batch processing progress bar)

#### Tier Visual Indicators
```typescript
const tierBadgeVariants = {
  Hot: "bg-red-500 text-white",
  Warm: "bg-orange-500 text-white",
  Cold: "bg-blue-500 text-white",
  Unscored: "bg-gray-400 text-white"
}
```

#### Responsive Design
- Mobile-first approach (trade show reps often use tablets/phones)
- Table component with horizontal scroll for small screens
- Drawer component for settings on mobile (instead of sidebar)

---

## Integration Patterns

### 9. API Key Management

**Security Best Practices**:

#### Environment Variables
```
# .env.local (never committed)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AIza...
PERPLEXITY_API_KEY=pplx-...
HUBSPOT_API_KEY=...
MYSQL_CONNECTION_STRING=mysql://...
```

#### Runtime Validation
- Use Zod to validate all API keys present on app startup
- Fail fast with clear error messages if keys missing
- Grace degradation: If 1 LLM provider key missing, continue with 3 remaining (adjust consensus threshold)

#### Settings UI
- Display masked API keys in settings (e.g., `sk-ant-***xyz`)
- "Test Connection" buttons for each integration (validates key + API access)
- Store keys in storage adapter (encrypted at rest if MySQL/HubSpot adapter used)

### 10. Export Formats

**Technology**: CSV (papaparse), PDF (jsPDF or Puppeteer)

**Best Practices**:

#### CSV Export
- Use papaparse to generate CSV from report data
- Include all enriched fields (company size, industry, revenue, tech stack, tier, persona match score)
- CRM import compatibility: Standard column headers (First Name, Last Name, Email, Company, Job Title)
- Optional: Include custom columns for tier and persona data

#### PDF Export
- **Option A (jsPDF)**: Client-side generation, lightweight, limited formatting
- **Option B (Puppeteer)**: Server-side, full HTML/CSS rendering, better formatting but requires headless Chrome
- **Decision**: Use Puppeteer for richer formatting (matches dashboard visual tier indicators)
- Template: Grouped by tier with visual badges, company logos (if available), key enrichment highlights

---

## Constitution Compliance Validation

### Orchestrator Architecture Design (Constitution VI)

**Hub-and-Spoke Pattern**:

```
Orchestrator (lib/enrichment/orchestrator.ts)
├─> Company Research Agent (lib/enrichment/agents/company-research.ts)
│   └─> Queries: Company size, industry, revenue, tech stack
├─> Persona Matcher Agent (lib/enrichment/agents/persona-matcher.ts)
│   └─> Queries: Fit score calculation, tier assignment
└─> Pain Point Analyzer Agent (lib/enrichment/agents/pain-point-analyzer.ts)
    └─> Queries: Business challenges, conversation starters
```

**Communication Flow**:
1. Orchestrator receives badge scan
2. Orchestrator calls Company Research Agent → receives enriched company data
3. Orchestrator calls Persona Matcher Agent with enriched data → receives tier/score
4. Orchestrator calls Pain Point Analyzer with enriched data + persona → receives actionable insights
5. Orchestrator consolidates results and persists via storage adapter

**Prohibited**: Direct communication between sub-agents (e.g., Persona Matcher cannot call Company Research directly)

**Benefits**:
- Centralized logging (all agent interactions logged by Orchestrator)
- State management (Orchestrator maintains enrichment workflow state)
- Error handling (Orchestrator retries failed sub-agent calls)
- Debugging (single trace through Orchestrator instead of distributed agent calls)

---

## Open Questions for Phase 1

None. All NEEDS CLARIFICATION items from Technical Context have been resolved.

---

## References

- [Next.js 13 App Router Docs](https://nextjs.org/docs/app)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [OpenAI API](https://platform.openai.com/docs/)
- [Google Gemini API](https://ai.google.dev/docs)
- [HubSpot API](https://developers.hubspot.com/)
- [papaparse Documentation](https://www.papaparse.com/)
