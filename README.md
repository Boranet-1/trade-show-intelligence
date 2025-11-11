# Trade Show Intelligence Platform

A Next.js-based platform that processes trade show badge scan CSV files, enriches contact data with company intelligence using multi-LLM verification, and generates actionable tiered reports for sales follow-up.

## Features

### Core Capabilities

- **CSV Badge Scan Upload**: Intelligent column detection and mapping for various CSV formats
- **Multi-LLM Enrichment**: Company intelligence gathering with consensus verification (Claude, GPT-4, Gemini, Perplexity)
- **Persona-Based Scoring**: Automatic lead categorization into quality tiers (Hot/Warm/Cold/Unscored)
- **Tiered Reports**: Generate comprehensive reports organized by lead quality
- **Multiple Export Formats**:
  - CSV (CRM-compatible)
  - PDF reports
  - CRO Summary (executive overview + top 10 Hot leads + follow-up priorities)
  - Individual Company Reports (profile + persona match + actionable insights)
- **Duplicate Detection**: Automatic identification and resolution of duplicate badge scans
- **Pluggable Storage**: Support for Local Storage, MySQL, and HubSpot CRM integration
- **Custom Personas**: Define business-specific ideal customer profiles for scoring

### Performance

- Process 5000 badge scans in under 2 hours
- 80%+ enrichment success rate
- Report filtering under 2 seconds for 500 leads
- Same-day sales follow-up enabled

## Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm or pnpm
- MySQL 8.0+ (optional, for production storage)
- HubSpot account with API access (optional, for CRM integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Trade-Show
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your API keys:
   ```env
   # LLM API Keys
   ANTHROPIC_API_KEY=your-claude-api-key
   OPENAI_API_KEY=your-openai-api-key
   GOOGLE_API_KEY=your-gemini-api-key
   PERPLEXITY_API_KEY=your-perplexity-api-key

   # Storage Configuration (choose one or configure multiple)
   STORAGE_TYPE=local # Options: local, mysql, hubspot

   # MySQL (if using MySQL storage)
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_DATABASE=trade_show_db
   MYSQL_USER=your-db-user
   MYSQL_PASSWORD=your-db-password

   # HubSpot (if using HubSpot integration)
   HUBSPOT_API_KEY=your-hubspot-api-key

   # Encryption
   ENCRYPTION_KEY=your-32-character-encryption-key
   ```

4. **Initialize database (if using MySQL)**
   ```bash
   npm run db:setup
   ```

5. **Seed default personas**
   ```bash
   npm run seed:personas
   ```

6. **Run development server**
   ```bash
   npm run dev
   ```

7. **Open browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
Trade-Show/
├── app/                      # Next.js App Router pages and API routes
│   ├── api/                  # API endpoints
│   │   ├── badge-scans/      # Badge scan operations
│   │   ├── enrichment/       # Enrichment and batch processing
│   │   ├── events/           # Event management
│   │   ├── personas/         # Persona CRUD
│   │   ├── reports/          # Report generation and export
│   │   ├── settings/         # Storage configuration
│   │   └── upload/           # CSV file upload
│   ├── dashboard/            # Main dashboard page
│   ├── personas/             # Persona management UI
│   ├── reports/              # Report viewing UI
│   ├── settings/             # Settings UI
│   └── test/                 # Test pages
├── components/               # React components
│   ├── dashboard/            # Dashboard components
│   ├── reports/              # Report viewing components
│   ├── settings/             # Settings components
│   ├── upload/               # Upload and mapping components
│   └── ui/                   # shadcn/ui components
├── lib/                      # Core business logic
│   ├── api/                  # API utilities
│   ├── csv/                  # CSV parsing and column detection
│   ├── encryption/           # API key encryption
│   ├── enrichment/           # LLM orchestration and consensus
│   │   ├── agents/           # Sub-agents (company research, persona matching, pain points)
│   │   └── llm-providers/    # LLM client wrappers
│   ├── errors/               # Error handling utilities
│   ├── export/               # Export formatters (CSV, PDF, CRO summary, company reports)
│   ├── logger/               # Structured logging
│   ├── scoring/              # Persona matching and tier calculation
│   ├── storage/              # Storage adapter implementations
│   │   ├── adapter.ts        # Storage interface contract
│   │   ├── factory.ts        # Adapter factory
│   │   ├── local-storage.ts  # Local JSON file storage
│   │   ├── mysql-adapter.ts  # MySQL storage
│   │   └── hubspot-adapter.ts # HubSpot CRM integration
│   ├── templates/            # Report templates
│   ├── types/                # TypeScript type definitions
│   ├── validation/           # Zod schemas
│   └── utils.ts              # Utility functions
├── database/                 # Database schemas and migrations
│   ├── schema.sql            # MySQL table definitions
│   └── migrations/           # Database migrations
├── data/                     # Local storage data files (gitignored)
├── public/                   # Static assets
│   └── personas/             # Default persona templates
├── specs/                    # Feature specifications
│   └── 001-trade-show-intelligence/
│       ├── spec.md           # Feature specification
│       ├── plan.md           # Implementation plan
│       ├── data-model.md     # Entity definitions
│       ├── tasks.md          # Task breakdown
│       └── contracts/        # API contracts
└── __tests__/                # Test files
    └── fixtures/             # Test data
```

## Architecture

### Storage Adapter Pattern

The platform uses a pluggable storage architecture that allows switching between different backends without code changes:

- **Local Storage**: JSON files in `data/` directory (default for development/testing)
- **MySQL**: Production database with connection pooling
- **HubSpot**: Direct CRM integration via Contacts API

All storage operations go through the `StorageAdapter` interface, ensuring consistent behavior across backends.

### Multi-LLM Enrichment

Company enrichment uses a consensus-based approach with 4 LLM providers:

1. **Orchestrator**: Hub-and-spoke pattern coordinating all sub-agents
2. **Sub-Agents**:
   - Company Research: Gathers company size, industry, revenue, tech stack
   - Persona Matcher: Calculates fit scores and tier assignment
   - Pain Point Analyzer: Generates actionable insights and conversation starters
3. **Consensus Algorithm**: Requires 3/4 agreement with confidence scoring

This approach ensures high accuracy and reduces hallucinations.

### Tier Classification

Leads are automatically categorized into 4 tiers based on persona fit scores:

- **Hot** (≥70%): Highest priority, strong persona match
- **Warm** (40-69%): Medium priority, moderate fit
- **Cold** (<40%): Low priority, weak fit
- **Unscored** (<30% data coverage): Insufficient data for scoring

## Usage Guide

### 1. Upload Badge Scans

1. Navigate to Dashboard
2. Select or create an event
3. Upload CSV file with badge scan data
4. Review and adjust column mappings
5. Submit for processing

### 2. Monitor Enrichment Progress

The dashboard shows real-time progress:
- Total scans uploaded
- Enrichment status (pending/in_progress/enriched/failed)
- Progress percentage
- Estimated completion time

### 3. View Reports

1. Navigate to Reports page
2. Select an event
3. Filter by tier (Hot/Warm/Cold/Unscored)
4. Sort and search enriched leads
5. Export in desired format:
   - CSV for CRM import
   - PDF for presentation
   - CRO Summary for executive review
   - Company Reports for sales team follow-up

### 4. Customize Personas

1. Navigate to Personas page
2. Create new persona or edit existing
3. Define criteria:
   - Company size range
   - Industries
   - Technologies
   - Revenue range
   - Geographies
   - Decision maker titles
   - Funding stages
4. Set weight importance for each criterion
5. Save and apply to new enrichment jobs
6. Re-process existing scans with updated personas

### 5. Configure Storage

1. Navigate to Settings page
2. Select storage adapter type
3. Enter configuration details
4. Test connection
5. Save configuration
6. Migrate data if switching adapters

## API Reference

### Badge Scans

```typescript
POST /api/upload
// Upload CSV file and get column mapping preview

POST /api/badge-scans
// Create badge scans from mapped CSV data

GET /api/badge-scans?eventId={id}
// List all badge scans for an event

GET /api/badge-scans/{id}
// Get specific badge scan details
```

### Enrichment

```typescript
POST /api/enrichment/batch
// Start batch enrichment job

GET /api/enrichment/status/{jobId}
// Get enrichment progress status

POST /api/enrichment/reprocess
// Re-process existing scans with updated personas
```

### Reports

```typescript
GET /api/reports?eventId={id}
// List all reports for an event

POST /api/reports
// Generate new report

GET /api/reports/{id}
// Get report details

GET /api/reports/{id}/export?format={csv|pdf|cro_summary|company_reports}
// Export report in specified format
```

### Personas

```typescript
GET /api/personas
// List all personas

POST /api/personas
// Create new persona

GET /api/personas/{id}
// Get persona details

PUT /api/personas/{id}
// Update persona

DELETE /api/personas/{id}
// Delete persona (if not in use)
```

### Events

```typescript
GET /api/events
// List all events

POST /api/events
// Create new event

GET /api/events/{id}
// Get event details
```

### Settings

```typescript
GET /api/settings/storage
// Get current storage configuration

PUT /api/settings/storage
// Update storage configuration

POST /api/settings/storage/test
// Test storage connection
```

## Development

### Run Tests

```bash
# Unit and integration tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

### Build for Production

```bash
npm run build
```

### Run Production Build

```bash
npm start
```

### Database Migrations

```bash
# Run migrations
npm run db:migrate

# Rollback migration
npm run db:rollback

# Reset database
npm run db:reset
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format with Prettier
npm run format
```

## Configuration

### Environment Variables

See `.env.local.example` for full list of configuration options.

### Storage Adapters

#### Local Storage
- No additional configuration required
- Data stored in `data/` directory
- Best for development and testing

#### MySQL
- Requires MySQL 8.0+
- Configure connection details in `.env.local`
- Run `npm run db:setup` to initialize schema
- Best for production deployments

#### HubSpot
- Requires HubSpot account with API access
- Configure API key in `.env.local`
- Maps badge scans to HubSpot Contacts
- Best for CRM integration

### Persona Templates

Default personas are located in `public/personas/`:
- `enterprise-tech.json`: Enterprise technology buyers
- `smb-saas.json`: Small-to-medium business SaaS buyers

Custom personas can be created through the UI or by adding JSON files and running `npm run seed:personas`.

## Security

### API Key Encryption
- All API keys encrypted at rest using AES-256
- Encryption key stored in `ENCRYPTION_KEY` environment variable
- Keys never exposed in API responses

### Input Validation
- All user inputs validated using Zod schemas
- CSV parsing with error handling
- SQL injection prevention via parameterized queries
- XSS prevention through input sanitization

### Rate Limiting
- API routes protected with rate limiting
- Prevents abuse and excessive API costs
- Configurable limits per endpoint

## Troubleshooting

### CSV Upload Issues

**Problem**: Column mapping incorrect
- **Solution**: Manually adjust mappings in preview step before submission

**Problem**: CSV validation errors
- **Solution**: Check error messages for specific format requirements (what failed, how to fix, example format)

### Enrichment Issues

**Problem**: Low enrichment success rate
- **Solution**: Verify all LLM API keys are valid and have sufficient credits

**Problem**: Enrichment stuck or slow
- **Solution**: Check LLM provider rate limits, system processes in batches of 10 with built-in delays

### Storage Issues

**Problem**: MySQL connection failed
- **Solution**: Verify database credentials, ensure MySQL server is running, check firewall settings

**Problem**: Data migration failed
- **Solution**: Check migration logs, verify sufficient disk space, ensure both adapters are properly configured

## Performance Optimization

### Batch Processing
- System processes enrichment in batches of 10 companies at a time
- Parallel processing where possible
- Rate limiting to respect LLM provider limits

### Report Generation
- Database indexes on frequently queried fields
- Pagination for large result sets
- Caching for frequently accessed reports

### Bundle Optimization
- Code splitting for route-based loading
- Lazy loading for heavy components
- Tree shaking for unused dependencies

## Contributing

1. Create a feature branch from `main`
2. Follow the Speckit workflow:
   - `/speckit.specify` to create specification
   - `/speckit.clarify` to resolve ambiguities
   - `/speckit.plan` to generate implementation plan
   - `/speckit.tasks` to break down tasks
   - `/speckit.implement` to execute implementation
3. Follow code style guidelines (ESLint + Prettier)
4. Add tests for new functionality
5. Update documentation
6. Create pull request with clear description

## License

[Your License Here]

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Check existing documentation in `specs/` directory
- Review API reference above

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Anthropic Claude](https://www.anthropic.com/) - LLM provider
- [OpenAI](https://openai.com/) - LLM provider
- [Google Gemini](https://ai.google.dev/) - LLM provider
- [Perplexity](https://www.perplexity.ai/) - LLM provider
