<!--
Sync Impact Report:
Version Change: Initial → 1.0.0
Modified Principles: N/A (initial creation)
Added Sections: All core principles, Storage Architecture, Quality Gates, Governance
Removed Sections: N/A
Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section aligns with principles
  ✅ spec-template.md - Requirements structure supports constitution compliance
  ✅ tasks-template.md - Task organization supports principle-driven development
Follow-up TODOs: None
-->

# Trade Show Intelligence Platform Constitution

## Core Principles

### I. Multi-LLM Verification (NON-NEGOTIABLE)

All AI-generated content MUST be verified through consensus across multiple LLM providers (Claude, GPT-4, Gemini, Perplexity). Single-source LLM outputs are prohibited for production data enrichment to ensure zero hallucination in company intelligence reports.

**Rationale**: Trade show follow-up requires factual accuracy. False information about prospects damages sales relationships and wastes time. Multi-provider consensus acts as a fact-checking mechanism where providers cross-validate each other's outputs.

### II. Pluggable Storage Architecture

The system MUST implement an adapter pattern for all data persistence operations. Storage implementations (Local Storage, MySQL, HubSpot) MUST be swappable without modifying business logic or enrichment workflows.

**Rationale**: Different deployment contexts require different storage solutions. MVP/testing needs Local Storage for simplicity. Production needs MySQL for scale. Enterprise needs HubSpot integration. The adapter pattern enables seamless switching via configuration changes only.

### III. Batch Processing First

All enrichment operations MUST be designed for batch processing of up to 5000 records. Real-time per-record processing is acceptable only for preview/testing features clearly marked as non-production workflows.

**Rationale**: Trade show exhibitors collect thousands of badge scans during events. Processing must complete within 2 hours to enable same-day or next-day follow-up. Individual record processing at scale would create unacceptable latency.

### IV. Actionable Intelligence Focus

Every enrichment output MUST directly support sales follow-up decisions. Data points without clear business value (tier classification, persona matching, pain point identification) are prohibited. All intelligence reports MUST answer "Why should sales contact this lead and what should they say?"

**Rationale**: Sales teams are time-constrained. Generic company profiles waste their effort. Intelligence must prioritize leads, suggest conversation starters, and identify decision-maker personas to maximize conversion rates.

### V. Visual Tier Classification

Lead prioritization MUST use a 4-tier classification system with visual indicators (color coding, badges, sorting) throughout the UI. Tier definitions MUST be data-driven (company size, industry fit, engagement signals) and consistently applied across all views.

**Rationale**: Sales reps scan hundreds of leads post-event. Visual hierarchy enables rapid prioritization. Consistent tier definitions across dashboard views prevent confusion and ensure high-value leads receive immediate attention.

### VI. Single Orchestrator Architecture

The agent system MUST use one Orchestrator agent that delegates to specialized sub-agents (Company Research, Persona Matching, Pain Point Analysis). Direct sub-agent-to-sub-agent communication is prohibited.

**Rationale**: Hub-and-spoke architecture simplifies debugging, prevents circular dependencies, and enables centralized logging of all agent interactions. The Orchestrator maintains context and coordinates multi-step enrichment workflows.

### VII. Zero External API Assumptions

Enrichment logic MUST NOT assume availability of external APIs (LinkedIn, Clearbit, ZoomInfo). All features relying on third-party data sources MUST gracefully degrade when APIs are unavailable and MUST document manual fallback procedures.

**Rationale**: Third-party API access is unreliable (rate limits, outages, subscription lapses). System must remain functional for core use cases (contact management, manual note-taking, tier assignment) even when enrichment services fail.

## Storage Architecture Requirements

### Adapter Interface Contract

All storage adapters MUST implement these operations:

- `saveBadgeScan(data)` - Persist individual contact record
- `getBadgeScan(id)` - Retrieve contact by unique identifier
- `getAllBadgeScans()` - Retrieve all contacts for event
- `updateEnrichment(id, enrichedData)` - Append intelligence to existing record
- `bulkImport(records[])` - Batch upload from CSV/Excel
- `exportToFormat(format)` - Generate CRO_summary.md and company reports

### Local Storage Adapter (Default)

- JSON files stored in `/data` directory
- One file per badge scan: `/data/scans/{scanId}.json`
- Event summary: `/data/events/{eventId}/summary.json`
- No external dependencies required

### MySQL Adapter (Production)

- Schema defined in `/database/schema.sql`
- Connection pooling required for concurrent batch operations
- Transaction support for multi-step enrichment updates
- Index on tier classification and company name for dashboard performance

### HubSpot Adapter (Enterprise)

- Contacts API for badge scan storage
- Custom properties for tier, persona match, enrichment status
- Bulk import via HubSpot batch API (max 100 records per call)
- Webhook listeners for CRM updates flowing back to dashboard

## Quality Gates

### Before Feature Completion

- [ ] Multi-LLM verification implemented for all AI-generated content
- [ ] Storage adapter interface used (no direct database calls in business logic)
- [ ] Batch processing tested with 1000+ record sample
- [ ] Tier classification rules documented and validated
- [ ] Visual indicators render correctly across dashboard views
- [ ] Graceful degradation tested with mocked API failures

### Before Production Deployment

- [ ] Process 5000 badge scans in under 2 hours (load test validated)
- [ ] 90%+ enrichment accuracy verified on sample dataset
- [ ] Database switching tested (Local → MySQL → HubSpot without code changes)
- [ ] CRO_summary.md and company reports generate correctly
- [ ] Error handling covers all external API failure modes

## Technology Constraints

**Frontend Framework**: Next.js 13.5.6 with TypeScript (App Router)
**UI Component Library**: shadcn/ui (New York style, Slate theme)
**Default Storage**: JSON files in `/data` directory
**LLM Providers**: Claude (Anthropic), GPT-4 (OpenAI), Gemini (Google), Perplexity
**Performance Target**: 5000 scans processed in < 2 hours
**Enrichment Accuracy**: 90%+ validation rate on company intelligence

## Governance

### Constitution Authority

This constitution supersedes all other development practices. When conflicts arise between this document and individual specifications or plans, constitution principles take precedence.

### Amendment Procedure

1. Propose amendment with specific principle changes and rationale
2. Validate impact across existing features and specifications
3. Update all dependent templates (plan, spec, tasks) for consistency
4. Increment version using semantic versioning
5. Document migration path for non-compliant code

### Compliance Review

- All `/speckit.plan` executions MUST run Constitution Check gate
- All `/speckit.analyze` executions MUST flag constitution violations as CRITICAL severity
- Pull requests introducing complexity (new storage adapter, additional LLM provider, tier definition changes) MUST justify necessity in plan.md Complexity Tracking section

### Versioning Policy

- **MAJOR**: Backward-incompatible changes (removing storage adapters, changing tier classification schema)
- **MINOR**: New principles added (observability requirements, security standards)
- **PATCH**: Clarifications, wording improvements, non-semantic updates

**Version**: 1.0.0 | **Ratified**: 2025-11-09 | **Last Amended**: 2025-11-09
