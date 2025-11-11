# Quickstart Guide: Trade Show Intelligence Platform

**Feature**: 001-trade-show-intelligence
**Date**: 2025-11-09
**Purpose**: Integration test scenarios and quick setup instructions for developers

---

## Prerequisites

### Required Software
- Node.js 18+ (LTS recommended)
- npm or yarn
- Git

### Required API Keys

Create `.env.local` file in project root:

```bash
# LLM Provider API Keys (for multi-LLM consensus)
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_AI_API_KEY=AIzaxxxxx
PERPLEXITY_API_KEY=pplx-xxxxx

# Storage Adapter Configurations (optional for initial setup)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=tradeshow_intelligence
MYSQL_USERNAME=root
MYSQL_PASSWORD=password

HUBSPOT_API_KEY=xxx
HUBSPOT_PORTAL_ID=xxx

# App Configuration
STORAGE_ADAPTER=LOCAL  # Options: LOCAL, MYSQL, HUBSPOT
DATA_DIRECTORY=./data  # For LOCAL adapter
```

---

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize Database (MySQL adapter only)

```bash
npm run db:setup
# Runs database/schema.sql to create tables and indexes
```

### 3. Seed Default Personas

```bash
npm run seed:personas
# Loads public/personas/*.json into storage adapter
```

### 4. Start Development Server

```bash
npm run dev
# Starts Next.js on http://localhost:3000
```

### 5. Verify Setup

Navigate to:
- Dashboard: http://localhost:3000/dashboard
- Settings: http://localhost:3000/settings
- API Health: http://localhost:3000/api/health

---

## Integration Test Scenarios

### Scenario 1: End-to-End CSV Upload to Report (Happy Path)

**User Story**: US1 - Badge Scan Upload and Processing (P1)

**Setup**:
- Storage adapter: LOCAL (default)
- Default personas loaded
- Sample CSV: `__tests__/fixtures/sample-badge-scans-50.csv`

**Test Steps**:

1. **Create Event**
   ```bash
   POST /api/events
   {
     "id": "aws-reinvent-2025",
     "name": "AWS re:Invent 2025",
     "startDate": "2025-11-29",
     "endDate": "2025-12-03",
     "location": "Las Vegas, NV",
     "boothNumber": "1234"
   }
   ```

2. **Upload CSV**
   ```bash
   POST /api/upload
   - file: sample-badge-scans-50.csv
   - eventId: aws-reinvent-2025
   ```

   **Expected Response**:
   ```json
   {
     "success": true,
     "badgeScanIds": ["uuid1", "uuid2", ...],
     "totalImported": 50,
     "eventId": "aws-reinvent-2025"
   }
   ```

3. **Start Batch Enrichment**
   ```bash
   POST /api/enrichment/batch
   {
     "badgeScanIds": ["uuid1", "uuid2", ...all 50],
     "personaIds": [] // Uses default personas
   }
   ```

   **Expected Response**:
   ```json
   {
     "jobId": "job-uuid",
     "status": "processing",
     "totalScans": 50,
     "estimatedCompletionTime": "2025-11-09T12:15:00Z"
   }
   ```

4. **Poll Enrichment Status**
   ```bash
   GET /api/enrichment/status/job-uuid
   ```

   **Expected Response (in progress)**:
   ```json
   {
     "jobId": "job-uuid",
     "status": "processing",
     "totalScans": 50,
     "processedScans": 23,
     "successfulEnrichments": 22,
     "failedEnrichments": 1,
     "startedAt": "2025-11-09T12:10:00Z"
   }
   ```

   **Expected Response (completed)**:
   ```json
   {
     "jobId": "job-uuid",
     "status": "completed",
     "totalScans": 50,
     "processedScans": 50,
     "successfulEnrichments": 48,
     "failedEnrichments": 2,
     "startedAt": "2025-11-09T12:10:00Z",
     "completedAt": "2025-11-09T12:14:32Z"
   }
   ```

5. **Generate Report**
   ```bash
   POST /api/reports
   {
     "eventId": "aws-reinvent-2025",
     "name": "re:Invent 2025 Leads",
     "filters": {
       "tiers": ["Hot", "Warm"]
     }
   }
   ```

   **Expected Response**:
   ```json
   {
     "id": "report-uuid",
     "eventId": "aws-reinvent-2025",
     "name": "re:Invent 2025 Leads",
     "statistics": {
       "totalScans": 50,
       "enrichedCount": 48,
       "hotCount": 12,
       "warmCount": 18,
       "coldCount": 18,
       "unscoredCount": 2,
       "averageFitScore": 56.3,
       "enrichmentSuccessRate": 96.0
     }
   }
   ```

6. **View Report Details**
   ```bash
   GET /api/reports/report-uuid
   ```

   **Expected Response**: Full report with `badgeScans[]` array containing enriched data

7. **Export Report to CSV**
   ```bash
   POST /api/reports/report-uuid/export
   {
     "format": "csv"
   }
   ```

   **Expected Response**: CSV file download with all enriched fields

**Success Criteria** (from spec.md):
- ✅ SC-001: Process 50 badge scans in under 5 minutes
- ✅ SC-002: Enrichment success rate >= 80% (48/50 = 96%)
- ✅ SC-008: Report filtering returns results in <2 seconds

---

### Scenario 2: Column Mapping Preview (CSV with Non-Standard Headers)

**User Story**: US1 - Badge Scan Upload and Processing (P1)
**Requirement**: FR-002a - Column mapping preview step

**Setup**:
- Sample CSV: `__tests__/fixtures/non-standard-headers.csv`
  ```csv
  Full Name,Work Email,Organization,Role,Mobile Number
  John Doe,john@acme.com,Acme Corp,CTO,555-1234
  ```

**Test Steps**:

1. **Upload CSV (first attempt)**
   ```bash
   POST /api/upload
   - file: non-standard-headers.csv
   - eventId: aws-reinvent-2025
   ```

   **Expected Response** (mapping preview required):
   ```json
   {
     "requiresMapping": true,
     "detectedMappings": {
       "Full Name": {
         "suggestedField": "firstName",
         "confidence": 80
       },
       "Work Email": {
         "suggestedField": "email",
         "confidence": 95
       },
       "Organization": {
         "suggestedField": "company",
         "confidence": 90
       },
       "Role": {
         "suggestedField": "jobTitle",
         "confidence": 85
       },
       "Mobile Number": {
         "suggestedField": "phone",
         "confidence": 75
       }
     },
     "sampleData": [
       {
         "Full Name": "John Doe",
         "Work Email": "john@acme.com",
         "Organization": "Acme Corp",
         "Role": "CTO",
         "Mobile Number": "555-1234"
       }
     ]
   }
   ```

2. **User Reviews and Confirms Mappings**
   UI displays preview table with suggested mappings. User approves or adjusts.

3. **Upload CSV (with confirmed mappings)**
   ```bash
   POST /api/upload
   - file: non-standard-headers.csv
   - eventId: aws-reinvent-2025
   - columnMappings: {
       "Full Name": "firstName",
       "Work Email": "email",
       "Organization": "company",
       "Role": "jobTitle",
       "Mobile Number": "phone"
     }
   ```

   **Expected Response**:
   ```json
   {
     "success": true,
     "badgeScanIds": ["uuid1"],
     "totalImported": 1,
     "eventId": "aws-reinvent-2025"
   }
   ```

**Success Criteria**:
- ✅ FR-002a: Intelligent column mapping with preview step
- ✅ User can review and adjust mappings before processing

---

### Scenario 3: Storage Adapter Migration (Local → MySQL)

**User Story**: US2 - Storage Backend Configuration (P2)

**Setup**:
- Initial adapter: LOCAL with 50 badge scans from Scenario 1
- Target adapter: MYSQL (database running, credentials in .env.local)

**Test Steps**:

1. **Verify Current Storage**
   ```bash
   GET /api/settings/storage
   ```

   **Expected Response**:
   ```json
   {
     "id": "config-uuid",
     "adapterType": "LOCAL",
     "localStorageConfig": {
       "dataDirectory": "./data"
     },
     "isActive": true,
     "lastTestedAt": "2025-11-09T12:00:00Z"
   }
   ```

2. **Test MySQL Connection**
   ```bash
   POST /api/settings/storage/test
   {
     "adapterType": "MYSQL",
     "mysqlConfig": {
       "host": "localhost",
       "port": 3306,
       "database": "tradeshow_intelligence",
       "username": "root",
       "password": "password",
       "connectionPoolSize": 10
     }
   }
   ```

   **Expected Response**:
   ```json
   {
     "success": true,
     "message": "Successfully connected to MySQL database"
   }
   ```

3. **Switch to MySQL Adapter (triggers migration)**
   ```bash
   POST /api/settings/storage
   {
     "adapterType": "MYSQL",
     "mysqlConfig": {
       "host": "localhost",
       "port": 3306,
       "database": "tradeshow_intelligence",
       "username": "root",
       "password": "password"
     }
   }
   ```

   **Expected Response**:
   ```json
   {
     "success": true,
     "migrationStatus": "completed",
     "migratedRecords": 50
   }
   ```

4. **Verify Data in MySQL**
   ```bash
   GET /api/reports
   ```

   **Expected Response**: Same reports as before migration

5. **Verify MySQL Database**
   ```sql
   SELECT COUNT(*) FROM badge_scans;
   -- Expected: 50

   SELECT COUNT(*) FROM enriched_companies;
   -- Expected: 48 (2 failed enrichments)

   SELECT tier, COUNT(*) FROM persona_matches GROUP BY tier;
   -- Expected: Hot: 12, Warm: 18, Cold: 18
   ```

**Success Criteria**:
- ✅ SC-006: Switch adapters and verify data migration in <2 minutes
- ✅ FR-007: Configure storage adapter via settings interface
- ✅ No data loss during migration

---

### Scenario 4: Duplicate Badge Scan Detection

**User Story**: US1 - Badge Scan Upload and Processing (P1)
**Requirement**: FR-015 - Duplicate detection with side-by-side comparison

**Setup**:
- Event with 10 badge scans already imported
- Duplicate CSV: Same person scanned twice at different booth locations

**Test Steps**:

1. **Upload CSV with Duplicate**
   ```csv
   firstName,lastName,email,company,jobTitle,scannedAt,boothLocation
   Jane,Smith,jane.smith@techcorp.com,TechCorp,VP Engineering,2025-11-29T10:00:00Z,Booth A
   Jane,Smith,jane.smith@techcorp.com,TechCorp,VP Engineering,2025-11-29T14:30:00Z,Booth B
   ```

2. **System Detects Duplicate**
   After upload, both scans flagged with `enrichmentStatus: MANUAL_REVIEW`

3. **View Duplicate Comparison**
   ```bash
   GET /api/badge-scans/duplicate-comparison?email=jane.smith@techcorp.com
   ```

   **Expected Response**:
   ```json
   {
     "duplicates": [
       {
         "id": "scan1-uuid",
         "scannedAt": "2025-11-29T10:00:00Z",
         "boothLocation": "Booth A",
         "notes": "",
         "enrichmentStatus": "MANUAL_REVIEW"
       },
       {
         "id": "scan2-uuid",
         "scannedAt": "2025-11-29T14:30:00Z",
         "boothLocation": "Booth B",
         "notes": "",
         "enrichmentStatus": "MANUAL_REVIEW"
       }
     ],
     "email": "jane.smith@techcorp.com",
     "company": "TechCorp"
   }
   ```

4. **User Resolves Duplicate (Keep Both)**
   ```bash
   POST /api/badge-scans/resolve-duplicate
   {
     "scanIds": ["scan1-uuid", "scan2-uuid"],
     "action": "keep-both",
     "primaryScanId": "scan2-uuid"  // Most recent scan
   }
   ```

   **Expected Result**:
   - Both scans marked `enrichmentStatus: PENDING`
   - Both proceed to enrichment (same company data reused via cache)

5. **Alternative: User Merges Scans**
   ```bash
   POST /api/badge-scans/resolve-duplicate
   {
     "scanIds": ["scan1-uuid", "scan2-uuid"],
     "action": "merge",
     "mergedNotes": "Visited booth twice: 10am (Booth A), 2:30pm (Booth B). High interest."
   }
   ```

   **Expected Result**:
   - Single scan created with merged data
   - Older scan archived

**Success Criteria**:
- ✅ FR-015: Duplicate detection based on email
- ✅ Side-by-side comparison interface
- ✅ User can keep both, merge, or mark one as primary

---

### Scenario 5: Multi-LLM Consensus Verification

**User Story**: US1 - Badge Scan Upload and Processing (P1)
**Constitution**: Principle I - Multi-LLM Verification

**Setup**:
- Badge scan with company name "Acme Corporation"
- All 4 LLM providers enabled (Claude, GPT-4, Gemini, Perplexity)

**Test Steps**:

1. **Trigger Enrichment for Single Company**
   ```bash
   POST /api/enrichment/batch
   {
     "badgeScanIds": ["scan-uuid"]
   }
   ```

2. **Multi-LLM Consensus Process** (internal)
   ```
   Orchestrator queries 4 LLM providers in parallel:

   Claude response:
   {
     "companyName": "Acme Corporation",
     "employeeCount": 750,
     "industry": "Software",
     "annualRevenue": 50000000,
     "techStack": ["AWS", "Salesforce", "React"]
   }

   GPT-4 response:
   {
     "companyName": "Acme Corporation",
     "employeeCount": 800,
     "industry": "Technology",
     "annualRevenue": 55000000,
     "techStack": ["AWS", "Salesforce", "React", "Docker"]
   }

   Gemini response:
   {
     "companyName": "Acme Corp",
     "employeeCount": 750,
     "industry": "Software",
     "annualRevenue": 50000000,
     "techStack": ["AWS", "Salesforce"]
   }

   Perplexity response:
   {
     "companyName": "Acme Corporation",
     "employeeCount": 750,
     "industry": "Software Development",
     "annualRevenue": 52000000,
     "techStack": ["AWS", "Salesforce", "React"]
   }
   ```

3. **Consensus Calculation**
   ```
   Field: employeeCount
   - 3/4 agree: 750 → Consensus: 750 (High confidence)

   Field: industry
   - 2/4 "Software", 1/4 "Technology", 1/4 "Software Development"
   - All similar → Consensus: "Software" (Medium confidence)

   Field: annualRevenue
   - Values: 50M, 55M, 50M, 52M
   - Average: 51.75M → Consensus: 51750000 (Medium confidence)

   Field: techStack
   - Intersection: ["AWS", "Salesforce"] (all 4)
   - Majority (3/4): ["React"]
   - Consensus: ["AWS", "Salesforce", "React"] (High confidence)
   ```

4. **Retrieve Enriched Company Data**
   ```bash
   GET /api/badge-scans/scan-uuid
   ```

   **Expected Response**:
   ```json
   {
     "id": "scan-uuid",
     "company": "Acme Corporation",
     "enrichedCompany": {
       "companyName": "Acme Corporation",
       "employeeCount": 750,
       "employeeRange": "501-1000",
       "industry": "Software",
       "annualRevenue": 51750000,
       "revenueRange": "50M-100M",
       "techStack": ["AWS", "Salesforce", "React"],
       "consensusMetadata": {
         "employeeCount": {
           "fieldName": "employeeCount",
           "consensusValue": 750,
           "agreementLevel": 75,
           "confidence": "High",
           "providerResponses": [
             { "provider": "Claude", "value": 750 },
             { "provider": "GPT-4", "value": 800 },
             { "provider": "Gemini", "value": 750 },
             { "provider": "Perplexity", "value": 750 }
           ]
         }
       }
     }
   }
   ```

**Success Criteria**:
- ✅ Constitution I: Multi-LLM verification for all enrichment fields
- ✅ Consensus metadata stored for audit trail
- ✅ High confidence (75%+ agreement) for factual data

---

### Scenario 6: Persona-Based Scoring and Tier Assignment

**User Story**: US3 - Persona Template Management (P3)

**Setup**:
- Custom persona: "Enterprise SaaS Buyer"
  ```json
  {
    "name": "Enterprise SaaS Buyer",
    "criteria": {
      "companySizeRange": { "min": 500, "max": 10000 },
      "industries": ["Software", "Technology", "SaaS"],
      "technologies": ["Salesforce", "AWS", "Azure"],
      "revenueRange": { "min": 50000000, "max": 500000000 },
      "decisionMakerTitles": ["CTO", "VP Engineering", "Director IT"]
    },
    "weights": {
      "companySize": 0.25,
      "industry": 0.20,
      "technology": 0.25,
      "revenue": 0.15,
      "geography": 0.05,
      "decisionMaker": 0.10,
      "fundingStage": 0.00
    }
  }
  ```

- Enriched badge scan:
  ```json
  {
    "jobTitle": "VP Engineering",
    "enrichedCompany": {
      "employeeCount": 750,
      "industry": "Software",
      "techStack": ["AWS", "Salesforce", "React"],
      "annualRevenue": 51750000
    }
  }
  ```

**Test Steps**:

1. **Create Custom Persona**
   ```bash
   POST /api/personas
   { ... persona definition ... }
   ```

2. **Calculate Persona Match**
   ```
   Criterion: companySize (min: 500, max: 10000)
   - Actual: 750 employees
   - Match: YES (750 within range)
   - Contribution: 0.25 × 1 = 0.25

   Criterion: industry (target: ["Software", "Technology", "SaaS"])
   - Actual: "Software"
   - Match: YES
   - Contribution: 0.20 × 1 = 0.20

   Criterion: technology (target: ["Salesforce", "AWS", "Azure"])
   - Actual: ["AWS", "Salesforce", "React"]
   - Match: YES (2/3 technologies present)
   - Contribution: 0.25 × 0.67 = 0.17

   Criterion: revenue (min: 50M, max: 500M)
   - Actual: 51.75M
   - Match: YES
   - Contribution: 0.15 × 1 = 0.15

   Criterion: decisionMaker (target: ["CTO", "VP Engineering", "Director IT"])
   - Actual: "VP Engineering"
   - Match: YES
   - Contribution: 0.10 × 1 = 0.10

   Total Fit Score: 0.25 + 0.20 + 0.17 + 0.15 + 0.10 = 0.87 → 87%
   Tier: Hot (>= 70%)
   ```

3. **Retrieve Persona Match**
   ```bash
   GET /api/badge-scans/scan-uuid
   ```

   **Expected Response**:
   ```json
   {
     "tier": "Hot",
     "fitScore": 87,
     "personaMatches": [
       {
         "personaId": "persona-uuid",
         "personaName": "Enterprise SaaS Buyer",
         "fitScore": 87,
         "tier": "Hot",
         "criteriaMatches": [
           {
             "criterionName": "companySize",
             "matched": true,
             "actualValue": 750,
             "targetValue": { "min": 500, "max": 10000 },
             "weight": 0.25,
             "contributionToScore": 25
           },
           ...
         ],
         "actionableInsights": [
           "Strong fit for enterprise SaaS solutions",
           "Decision-maker (VP Engineering) identified",
           "Already using Salesforce and AWS - potential upsell opportunity"
         ]
       }
     ]
   }
   ```

**Success Criteria**:
- ✅ SC-004: 85% alignment with manual review (tier assignment accurate)
- ✅ FR-004: Percentage-based tier thresholds (Hot: >=70%)
- ✅ FR-017: Assigned to persona with 87% fit score

---

### Scenario 7: Graceful Degradation (API Failure)

**User Story**: US1 - Badge Scan Upload and Processing (P1)
**Constitution**: Principle VII - Zero External API Assumptions

**Setup**:
- Simulate Perplexity API unavailable (timeout/500 error)
- 3 LLM providers still available (Claude, GPT-4, Gemini)

**Test Steps**:

1. **Trigger Enrichment with Perplexity API Down**
   ```bash
   POST /api/enrichment/batch
   {
     "badgeScanIds": ["scan-uuid"]
   }
   ```

2. **Enrichment Process** (internal)
   ```
   Orchestrator queries 4 LLM providers in parallel:
   - Claude: Success (200ms)
   - GPT-4: Success (350ms)
   - Gemini: Success (280ms)
   - Perplexity: Timeout (5000ms) → FAILED

   Consensus calculation proceeds with 3 providers:
   - Lower consensus threshold: 2/3 instead of 3/4
   - Continue processing without blocking on Perplexity
   ```

3. **Retrieve Enriched Data**
   ```bash
   GET /api/badge-scans/scan-uuid
   ```

   **Expected Response**:
   ```json
   {
     "enrichedCompany": {
       "companyName": "Acme Corporation",
       "employeeCount": 750,
       "dataSource": ["Claude", "GPT-4", "Gemini"],
       "consensusMetadata": {
         "employeeCount": {
           "agreementLevel": 66.67,
           "confidence": "Medium",
           "providerResponses": [
             { "provider": "Claude", "value": 750 },
             { "provider": "GPT-4", "value": 800 },
             { "provider": "Gemini", "value": 750 },
             { "provider": "Perplexity", "value": null, "error": "Timeout" }
           ]
         }
       }
     }
   }
   ```

4. **System Remains Functional**
   - Enrichment completes successfully
   - Tier assignment calculated with available data
   - Reports generate normally
   - User warned: "1 enrichment provider unavailable (Perplexity)"

**Success Criteria**:
- ✅ Constitution VII: System functional without all APIs
- ✅ FR-016: Alternative enrichment sources attempted before failure
- ✅ Graceful degradation with reduced consensus threshold

---

## Performance Benchmarks

### Batch Processing (Constitution III)

**Test**: Process 5000 badge scans in under 2 hours

**Setup**:
- Storage adapter: MYSQL (production configuration)
- Batch size: 10 companies in parallel
- LLM rate limits: Assumed 60 requests/minute per provider

**Expected Performance**:
```
5000 scans ÷ 10 parallel = 500 batches
500 batches × 5s average = 2500s = 41.7 minutes
Well within 2-hour requirement
```

**Command**:
```bash
npm run perf-test:batch-5000
```

**Success Criteria**:
- ✅ Complete in under 2 hours
- ✅ 90%+ enrichment success rate
- ✅ No memory leaks (stable heap size throughout processing)

### Report Filtering (SC-008)

**Test**: Filter/search returns results in <2 seconds for 500 enriched leads

**Command**:
```bash
npm run perf-test:report-filter
```

**Expected Performance**:
- Tier filter: <500ms
- Industry filter: <700ms
- Text search (company/name): <1500ms
- Combined filters: <2000ms

---

## Troubleshooting

### Common Issues

**1. CSV Upload Fails with "Invalid CSV format"**
- Check file encoding (UTF-8 required)
- Verify at least one required field present (company name)
- Run: `npm run validate-csv <file-path>` for detailed error

**2. Enrichment Jobs Stuck in "Processing"**
- Check LLM API keys valid: `npm run test-llm-keys`
- View job logs: `GET /api/enrichment/status/{jobId}`
- Cancel stuck job: `DELETE /api/enrichment/batch/{jobId}`

**3. Storage Adapter Migration Fails**
- Verify target database accessible
- Check disk space for Local adapter
- View migration logs: `tail -f logs/migration.log`

**4. Tier Assignment Shows All "Unscored"**
- Verify personas loaded: `GET /api/personas`
- Check enrichment success rate: Should be >30% of weighted criteria
- Review consensus metadata for data availability

---

## Next Steps

After completing these integration tests:

1. **Run Full Test Suite**
   ```bash
   npm run test          # Unit tests
   npm run test:e2e      # End-to-end tests
   npm run test:perf     # Performance tests
   ```

2. **Review Generated Reports**
   - Check tier distribution makes business sense
   - Validate enrichment accuracy against known companies
   - Test export formats (CSV/PDF) in CRM import

3. **Deploy to Staging**
   ```bash
   npm run deploy:staging
   ```

4. **Load Test with Production Data**
   - Start with small batch (100 scans)
   - Gradually increase to 1000, then 5000
   - Monitor API response times and error rates

---

## Sample Test Data

All sample CSV files available in `__tests__/fixtures/`:

- `sample-badge-scans-50.csv` - Standard format, 50 contacts
- `sample-badge-scans-1000.csv` - Large batch test
- `non-standard-headers.csv` - Tests column mapping
- `duplicate-scans.csv` - Tests duplicate detection
- `missing-data.csv` - Tests validation and error handling
- `international-contacts.csv` - Tests non-US characters and formats

---

## API Collection

Import Postman collection for manual testing:
- `__tests__/postman/trade-show-intelligence.json`

Includes pre-configured requests for all API endpoints with sample data.
