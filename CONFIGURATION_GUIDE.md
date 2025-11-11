# Trade Show Intelligence Platform - Configuration Guide

## Overview

This guide explains how to configure and use the Trade Show Intelligence Platform with local storage and CSV export for Google Sheets integration.

## Table of Contents

1. [Environment Configuration](#environment-configuration)
2. [API Keys Setup](#api-keys-setup)
3. [Feature Flags](#feature-flags)
4. [Using the Platform](#using-the-platform)
5. [Exporting to Google Sheets](#exporting-to-google-sheets)
6. [Troubleshooting](#troubleshooting)

---

## Environment Configuration

### Current Setup

Your `.env.local` file is already configured with:

- ✅ All 4 required LLM API keys (Anthropic, OpenAI, Google, OpenRouter)
- ✅ Local storage adapter enabled
- ✅ Encryption key configured
- ✅ Development mode active

### Configuration File Location

```
C:\Users\User\Projects\Trade-Show\.env.local
```

### Key Settings

```env
# Storage
STORAGE_ADAPTER=local           # Using local file storage
DATA_DIRECTORY=./data          # Data stored in ./data/ folder

# Enrichment Mode
ENABLE_ENRICHMENT=true         # Enrichment is enabled
ENABLE_MOCK_ENRICHMENT=false   # Using REAL LLM calls (not mock)
```

---

## API Keys Setup

### Required API Keys (All Configured ✅)

| Provider | Status | Purpose |
|----------|--------|---------|
| **Anthropic Claude** | ✅ Configured | Primary reasoning & research |
| **OpenAI GPT-4** | ✅ Configured | Secondary validation |
| **Google Gemini** | ✅ Configured | Consensus verification |
| **OpenRouter** | ✅ Configured | Fourth provider for consensus |

### How Multi-LLM Consensus Works

1. Each company is queried across all 4 LLM providers
2. Results are parsed and validated
3. Consensus is calculated from all successful responses
4. Most common values are used for final enrichment
5. Confidence score is based on provider agreement

### Switching Between Mock and Real Enrichment

**To use REAL LLM enrichment (current setting):**
```env
ENABLE_MOCK_ENRICHMENT=false
```

**To use MOCK data for testing:**
```env
ENABLE_MOCK_ENRICHMENT=true
```

Mock mode is useful for:
- Testing the workflow without API costs
- Fast development iterations
- Demo purposes

---

## Feature Flags

### Available Flags

```env
# Enable/disable enrichment entirely
ENABLE_ENRICHMENT=true

# Toggle between mock and real LLM enrichment
ENABLE_MOCK_ENRICHMENT=false

# MySQL storage (not configured)
ENABLE_MYSQL=false

# HubSpot CRM integration (not implemented)
ENABLE_HUBSPOT=false
```

---

## Using the Platform

### Step 1: Start the Development Server

The server is already running:
```
http://localhost:3000
```

### Step 2: Upload Badge Scans

1. Navigate to http://localhost:3000/dashboard
2. Select a CSV file with badge scan data
3. CSV should have columns like:
   - Name
   - Email
   - Company
   - Title (optional)
   - Phone (optional)
4. Click "Upload CSV"
5. Wait for confirmation message

### Step 3: Process & Enrich

1. After successful upload, click "Process and Enrich Data"
2. The system will:
   - Query all 4 LLM providers for each company
   - Calculate multi-LLM consensus
   - Assign lead tiers (Hot/Warm/Cold/Unscored)
   - Generate reports
3. Processing time: ~5-10 seconds per company (depending on LLM response times)

### Step 4: View Results

1. Navigate to http://localhost:3000/reports
2. View generated reports with tier breakdowns
3. See statistics for Hot, Warm, Cold, and Unscored leads

---

## Exporting to Google Sheets

### Export Options

#### From Dashboard (After Processing)

After successfully processing badge scans, you'll see an "Export to Google Sheets" section with 4 export options:

1. **Badge Scans** - Raw contact information
2. **Enriched Companies** - Full company intelligence data
3. **Persona Matches** - Lead scoring and tier assignments
4. **Hot Leads Only** - Pre-filtered high-priority leads

#### From Reports Page

Each report has:
- **Export CSV** button - Download full report
- **Export by Tier** section - Download leads filtered by tier:
  - Export Hot Leads
  - Export Warm Leads
  - Export Cold Leads
  - Export Unscored

### Import to Google Sheets

1. Click any export button
2. CSV file will download to your computer
3. Open Google Sheets (https://sheets.google.com)
4. Create a new spreadsheet or open existing one
5. Go to **File → Import**
6. Select the downloaded CSV file
7. Choose import options:
   - Import location: Create new sheet
   - Separator type: Comma
   - Convert text to numbers: Yes
8. Click "Import data"

### CSV File Structure

#### Badge Scans CSV
```
ID, Event ID, Name, Email, Company, Title, Phone, Notes, Status, Scanned At, Created At
```

#### Enriched Companies CSV
```
ID, Badge Scan ID, Event ID, Company Name, Domain, Industry, Company Size,
Employee Count, Revenue, Headquarters, Description, Technologies,
Business Model, Key Products, Target Market, Funding Stage,
Enrichment Date, Enrichment Source, Confidence %
```

#### Persona Matches CSV
```
ID, Enriched Company ID, Persona ID, Event ID, Company Name, Tier, Fit Score,
Industry Match, Size Match, Technology Match, Insights, Matched At
```

#### Leads by Tier CSV
```
Company Name, Fit Score, Industry Match, Size Match, Technology Match, Key Insights
```

---

## Data Flow Architecture

```
CSV Upload
   ↓
Badge Scans Stored (./data/scans/)
   ↓
Enrichment Process
   ↓
   ├─ Query Anthropic Claude
   ├─ Query OpenAI GPT-4
   ├─ Query Google Gemini
   └─ Query OpenRouter
   ↓
Calculate Consensus
   ↓
Enriched Companies Stored (./data/enriched/)
   ↓
Persona Matching & Scoring
   ↓
Reports Generated (./data/reports/)
   ↓
CSV Export Available
   ↓
Manual Import to Google Sheets
```

---

## Troubleshooting

### Development Server Issues

**Server won't start:**
```bash
# Kill existing process
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Restart
npm run dev
```

**Clear Next.js cache:**
```bash
if exist ".next" rmdir /s /q ".next"
npm run dev
```

### API Key Errors

**Error: "Missing required LLM API keys"**
- Check `.env.local` file exists
- Verify all 4 API keys are present
- Restart development server after changes

**Error: "401 Unauthorized" from LLM provider**
- API key is invalid or expired
- Get new key from provider console
- Update `.env.local`

### Enrichment Issues

**Enrichment is too slow:**
- Expected: 5-10 seconds per company (queries 4 LLMs)
- Reduce concurrency in `lib/llm/enrichment.ts` if hitting rate limits
- Switch to mock mode for testing: `ENABLE_MOCK_ENRICHMENT=true`

**All LLM providers failing:**
- Check internet connection
- Verify API keys are valid
- Check API provider status pages
- Review console logs for specific errors

**Only some providers working:**
- This is normal! Consensus works with partial results
- Minimum 1 provider needed for enrichment
- More providers = higher confidence scores

### Export Issues

**Export button does nothing:**
- Check browser console for errors
- Verify API endpoint is accessible
- Try refreshing the page

**CSV file is empty:**
- Ensure data exists for the selected event/report
- Check that enrichment completed successfully
- Review server logs for export errors

**Can't import to Google Sheets:**
- File might be corrupted - try re-exporting
- Check CSV format (should be comma-separated)
- Try "File → Import" instead of copy-paste

---

## Storage Locations

### Local Storage Paths

All data is stored in the `./data/` directory:

```
C:\Users\User\Projects\Trade-Show\data\
├── scans\              # Badge scan JSON files
├── enriched\           # Enriched company JSON files
├── personas\           # Persona definitions
├── matches\            # Persona match results
└── reports\            # Generated reports
```

### File Formats

All data is stored as JSON files with auto-generated IDs:
- `scans/{id}.json` - Individual badge scan
- `enriched/{id}.json` - Enriched company data
- `reports/{id}.json` - Report metadata

---

## API Endpoints

### Upload
```
POST /api/upload
Body: FormData with file and storageType
```

### Process & Enrich
```
POST /api/process
Body: { storageType: 'local' }
```

### Export CSV
```
GET /api/export?type={type}&eventId={id}&reportId={id}&tier={tier}

Types:
- badge-scans
- enriched-companies
- persona-matches
- report
- leads-by-tier
```

---

## Development vs Production

### Current Setup (Development)

- Mock enrichment available for testing
- Data stored locally in ./data/
- Hot reload enabled
- Detailed logging
- No encryption key validation (uses fallback)

### For Production Deployment

1. Set `NODE_ENV=production`
2. Generate secure encryption key: `openssl rand -hex 32`
3. Consider MySQL storage instead of local files
4. Enable rate limiting
5. Set up monitoring and logging
6. Review API key permissions (read-only where possible)

---

## Next Steps

### Immediate Actions

1. ✅ Environment configured
2. ✅ All API keys set up
3. ✅ Real LLM enrichment enabled
4. ✅ CSV export functionality added
5. 🔄 Ready to test workflow

### Testing Workflow

1. Upload a sample CSV file
2. Process with real LLM enrichment
3. Review enriched data
4. Export to CSV
5. Import to Google Sheets

### Future Enhancements

- [ ] Direct Google Sheets API integration
- [ ] HubSpot CRM sync
- [ ] PDF export for reports
- [ ] Automated persona matching
- [ ] Webhook notifications
- [ ] Advanced filtering and search

---

## Support & Resources

### Documentation
- README.md - Project overview
- SETUP.md - Setup instructions
- CLAUDE.md - Development guidelines

### API Provider Documentation
- Anthropic: https://docs.anthropic.com/
- OpenAI: https://platform.openai.com/docs
- Google AI: https://ai.google.dev/docs
- OpenRouter: https://openrouter.ai/docs

### Getting Help

1. Check this configuration guide first
2. Review server console logs
3. Check browser console for client errors
4. Review API provider status pages
5. Test with mock mode first

---

**Last Updated:** 2025-11-11
**Status:** Ready for testing
**Configuration:** Development mode with real LLM enrichment
