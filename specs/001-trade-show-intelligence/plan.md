# Implementation Plan: Trade Show Intelligence Platform

**Branch**: `001-trade-show-intelligence` | **Date**: 2025-11-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-trade-show-intelligence/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The Trade Show Intelligence Platform enables sales teams to process badge scan CSV files from trade show events, enrich each contact with company intelligence through multi-LLM verification, apply persona-based scoring to categorize leads into quality tiers (Hot, Warm, Cold, Unscored), and generate actionable reports with recommended follow-up priorities. The system uses a pluggable storage adapter architecture supporting Local Storage, MySQL, and HubSpot CRM backends, with batch processing optimized for up to 5000 records processed within 2 hours.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 13.5.6 (App Router)
**Primary Dependencies**: React 18, shadcn/ui (New York style, Slate theme), Anthropic SDK, OpenAI SDK, Google Generative AI SDK, Perplexity SDK
**Storage**: Pluggable adapter pattern (Local JSON files in `/data`, MySQL via connection pool, HubSpot via Contacts API)
**Testing**: Jest + React Testing Library (unit/integration), Playwright (E2E)
**Target Platform**: Web application (Next.js deployed to Vercel/Node.js server)
**Project Type**: Web (Next.js full-stack with API routes and React components)
**Performance Goals**: Process 5000 badge scans in < 2 hours (0.7 scans/second throughput), search/filter results in < 2 seconds for 500 records
**Constraints**: CSV upload size < 10MB, enrichment concurrency limited by LLM API rate limits (10 concurrent requests per provider), UI updates every 10 records or 5 seconds
**Scale/Scope**: 50-1000 badge scans per event, 4 LLM providers, 3 storage adapters, 6 user stories, 32 functional requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Evaluation

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Multi-LLM Verification** | ✅ PASS | Feature spec requires consensus across Claude, GPT-4, Gemini, Perplexity (FR-016 fallback chain, FR-003 enrichment requirement) |
| **II. Pluggable Storage Architecture** | ✅ PASS | Feature spec mandates adapter pattern (FR-006, FR-007), three storage backends defined (Local, MySQL, HubSpot) |
| **III. Batch Processing First** | ✅ PASS | Feature spec designed for batch workflows (FR-011a chunk processing, SC-005 1000 scans without degradation, performance target 5000 scans in 2 hours) |
| **IV. Actionable Intelligence Focus** | ✅ PASS | All enrichment outputs support sales decisions (FR-004 tier categorization, FR-019 company reports with conversation starters, FR-018 CRO summary with follow-up priorities) |
| **V. Visual Tier Classification** | ✅ PASS | 4-tier system required (Hot/Warm/Cold/Unscored), visual indicators implicit in dashboard requirements (FR-004, FR-012 filter by tier) |
| **VI. Single Orchestrator Architecture** | ✅ PASS | Constitution mandates hub-and-spoke agent architecture, feature spec compatible with Orchestrator delegating to Company Research, Persona Matching, Pain Point Analysis sub-agents |
| **VII. Zero External API Assumptions** | ✅ PASS | Feature spec includes graceful degradation (FR-016 fallback chain, FR-007a storage unavailability handling, "pending enrichment" state for failures) |

**GATE RESULT**: ✅ **PASS** - All constitution principles satisfied by feature specification

No violations requiring justification. The feature specification was designed with constitution compliance in mind.

## Project Structure

### Documentation (this feature)

```text
specs/001-trade-show-intelligence/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── badge-scan-api.yaml       # OpenAPI spec for badge scan upload/processing
│   ├── enrichment-api.yaml       # OpenAPI spec for enrichment orchestration
│   ├── report-api.yaml           # OpenAPI spec for report generation/export
│   ├── persona-api.yaml          # OpenAPI spec for persona management
│   ├── storage-adapter.ts        # TypeScript interface for storage adapters
│   └── llm-provider.ts           # TypeScript interface for LLM providers
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Next.js 13 App Router structure
app/
├── api/                          # API route handlers
│   ├── badge-scans/
│   │   ├── route.ts              # POST /api/badge-scans (upload CSV)
│   │   └── [scanId]/route.ts     # GET /api/badge-scans/{scanId}
│   ├── enrichment/
│   │   ├── batch/route.ts        # POST /api/enrichment/batch (start batch job)
│   │   ├── status/[jobId]/route.ts  # GET /api/enrichment/status/{jobId}
│   │   └── reprocess/route.ts    # POST /api/enrichment/reprocess
│   ├── reports/
│   │   ├── route.ts              # GET /api/reports (list), POST /api/reports (generate)
│   │   └── [reportId]/
│   │       ├── route.ts          # GET /api/reports/{reportId}
│   │       └── export/route.ts   # GET /api/reports/{reportId}/export?format=csv|pdf
│   ├── personas/
│   │   ├── route.ts              # GET /api/personas, POST /api/personas
│   │   └── [personaId]/route.ts  # GET/PUT/DELETE /api/personas/{personaId}
│   ├── events/route.ts           # GET /api/events, POST /api/events
│   └── upload/route.ts           # POST /api/upload (CSV validation + parsing)
├── dashboard/
│   └── page.tsx                  # Main dashboard (event setup, upload, mapping, enrichment, complete)
├── reports/
│   ├── page.tsx                  # Reports list view (filter by tier, search)
│   └── [reportId]/page.tsx       # Individual report detail view
├── settings/
│   └── page.tsx                  # Storage adapter config, API key management
└── layout.tsx                    # Root layout with navigation

components/
├── upload/
│   ├── csv-uploader.tsx          # CSV file upload with drag-drop
│   ├── column-mapper.tsx         # Intelligent column mapping UI
│   └── validation-errors.tsx     # Actionable error message display
├── enrichment/
│   ├── progress-indicator.tsx    # Real-time progress with SSE
│   ├── batch-status.tsx          # Job queue status display
│   └── fallback-chain.tsx        # LLM provider fallback visualization
├── reports/
│   ├── tier-badge.tsx            # Visual tier indicator (Hot/Warm/Cold/Unscored)
│   ├── company-card.tsx          # Enriched company profile card
│   ├── persona-match.tsx         # Persona fit score visualization
│   └── export-button.tsx         # CSV/PDF export controls
├── personas/
│   ├── persona-editor.tsx        # Persona template customization
│   ├── criteria-builder.tsx      # Drag-drop criteria definition
│   └── persona-type-selector.tsx # Switch between Exhibitor/Company/People types
├── settings/
│   ├── storage-adapter-config.tsx  # Storage backend selector
│   └── api-key-manager.tsx       # Encrypted API key input with rotation
└── ui/                           # shadcn/ui components (button, card, table, etc.)

lib/
├── storage/
│   ├── adapter.ts                # Storage adapter interface
│   ├── local-storage.ts          # Local JSON file implementation
│   ├── mysql-storage.ts          # MySQL database implementation
│   └── hubspot-storage.ts        # HubSpot CRM implementation
├── enrichment/
│   ├── orchestrator.ts           # Main orchestrator agent (hub-and-spoke)
│   ├── agents/
│   │   ├── company-research.ts   # Company intelligence gathering
│   │   ├── persona-matching.ts   # Persona fit scoring
│   │   └── pain-point-analysis.ts # Pain point identification
│   ├── llm-providers/
│   │   ├── provider.ts           # LLM provider interface
│   │   ├── claude-client.ts      # Anthropic Claude integration
│   │   ├── openai-client.ts      # OpenAI GPT-4 integration
│   │   ├── gemini-client.ts      # Google Gemini integration
│   │   └── perplexity-client.ts  # Perplexity integration
│   ├── consensus.ts              # Multi-LLM verification logic
│   └── batch-queue.ts            # Job queue management
├── scoring/
│   ├── tier-calculator.ts        # Hot/Warm/Cold/Unscored tier logic
│   └── persona-matcher.ts        # Persona fit score calculation
├── export/
│   ├── pdf-exporter.ts           # PDF report generation
│   ├── csv-exporter.ts           # CSV export formatting
│   ├── cro-summary-generator.ts  # CRO_summary.md generation
│   └── company-report-generator.ts  # Individual company report generation
├── validation/
│   ├── csv-validator.ts          # CSV structure validation
│   └── error-formatter.ts        # Actionable error message formatting
└── types/
    └── index.ts                  # Shared TypeScript types

data/                             # Local storage backend (default)
├── scans/
│   └── {scanId}.json
├── events/
│   └── {eventId}/
│       ├── summary.json
│       └── reports/
├── personas/
│   └── {personaId}.json
└── config/
    └── storage-adapter.json

tests/
├── unit/
│   ├── storage/
│   ├── enrichment/
│   ├── scoring/
│   └── validation/
├── integration/
│   ├── api/
│   ├── enrichment-workflow/
│   └── storage-adapters/
└── e2e/
    ├── dashboard-workflow.spec.ts
    ├── csv-upload.spec.ts
    └── report-generation.spec.ts
```

**Structure Decision**: Next.js 13 App Router provides server-side API routes (`app/api/`), server components for dashboard pages (`app/dashboard/`, `app/reports/`), and client-side interactivity via React components (`components/`). The `/lib` directory contains all business logic (storage adapters, enrichment orchestration, scoring algorithms) separated from presentation concerns. This structure aligns with Next.js best practices and supports the pluggable architecture required by the constitution (storage adapters, LLM providers).

## Post-Design Constitution Check

*Re-evaluated after Phase 1 (research, data model, contracts, quickstart completed)*

### Post-Design Evaluation

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Multi-LLM Verification** | ✅ PASS | Data model includes `ConsensusMetadata` entity tracking multi-LLM responses with agreement levels and confidence scores. Enrichment workflow designed to query all 4 providers in parallel and calculate consensus. |
| **II. Pluggable Storage Architecture** | ✅ PASS | Storage adapter interface defined in data model with 6 operation categories (BadgeScan, EnrichedCompany, Persona, PersonaMatch, Report, Event). Three adapters (Local, MySQL, HubSpot) specified with migration operations for switching. |
| **III. Batch Processing First** | ✅ PASS | Research documents in-memory job queue with worker pool for concurrent processing. Batch processing architecture supports 10 concurrent enrichment operations with chunking strategy for large CSV files. |
| **IV. Actionable Intelligence Focus** | ✅ PASS | Data model includes `actionableInsights` field in PersonaMatch entity for conversation starters. Report entity tracks `ReportStatistics` with tier distributions. Quickstart scenario validates conversation starters and tier justifications in enriched data. |
| **V. Visual Tier Classification** | ✅ PASS | LeadTier entity defines 4-tier system (Hot/Warm/Cold/Unscored) with visual indicators (red/orange/blue/gray badges). Quickstart includes tier badge component testing. |
| **VI. Single Orchestrator Architecture** | ✅ PASS | Research documents hub-and-spoke pattern with Orchestrator agent delegating to Company Research, Persona Matching, and Pain Point Analysis sub-agents. Prohibited direct sub-agent communication enforced. |
| **VII. Zero External API Assumptions** | ✅ PASS | Data model includes `enrichmentStatus` state machine with FAILED state. LLM fallback chain documented in research (Claude → GPT-4 → Gemini → Perplexity). Quickstart Scenario 3 validates graceful degradation. |

**GATE RESULT**: ✅ **PASS** - All constitution principles validated at design level

No violations detected. All architectural decisions align with constitution requirements. Implementation can proceed to Phase 2 (task generation via `/speckit.tasks`).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. Constitution Check passed all gates.
