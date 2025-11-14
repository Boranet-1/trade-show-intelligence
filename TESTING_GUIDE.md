# Trade Show Intelligence Platform - Testing Guide

## Complete Feature Testing Guide (Options A, B, C)

This guide walks through testing all newly implemented features in the correct order to verify the complete workflow integration.

---

## Prerequisites

### 1. Environment Setup
```bash
# Ensure dev server is running
npm run dev

# Server should be running on http://localhost:3000
```

### 2. Required Data
- At least one event created
- Sample CSV file with badge scans (10+ contacts for best testing)
- At least one persona defined

### 3. API Keys
Verify these environment variables are set in `.env.local`:
```
ANTHROPIC_API_KEY=sk-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...  # Optional
```

---

## Phase 1: Test Option B (UI Components)

These are standalone components that don't depend on workflow integration.

### Test 1.1: Tag Manager (FR-029)

**Navigate to:**
```
http://localhost:3000/settings
```

**Step-by-Step:**

1. **Create a Tag with Preset Color**
   - Click "Create Tag" button
   - Enter tag name: "VIP Contact"
   - Select preset color: "Red" (#EF4444)
   - Click "Create"
   - ✓ Verify: Tag appears in the list with red badge
   - ✓ Verify: Tag shows 0 contacts

2. **Create a Tag with Custom Hex Color**
   - Click "Create Tag" button
   - Enter tag name: "Follow Up"
   - Click "Custom Color" tab
   - Enter hex: `#8B5CF6` (purple)
   - ✓ Verify: Preview badge shows purple color
   - Click "Create"
   - ✓ Verify: Tag appears with custom purple color

3. **Edit a Tag**
   - Click edit icon on "VIP Contact" tag
   - Change name to "VIP Priority"
   - Change color to "Orange"
   - Click "Update"
   - ✓ Verify: Tag name and color updated
   - ✓ Verify: Badge preview reflects changes

4. **Delete a Tag**
   - Click delete icon on "Follow Up" tag
   - Confirm deletion
   - ✓ Verify: Tag removed from list
   - ✓ Verify: Page shows updated tag count

**API Verification:**
```bash
# Check tags were created
curl http://localhost:3000/api/tags

# Expected response:
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "VIP Priority",
      "color": "#F97316",
      "badgeScanCount": 0
    }
  ]
}
```

---

### Test 1.2: List Manager (FR-030)

**Navigate to:**
```
http://localhost:3000/settings
```

**Step-by-Step:**

1. **Create a Static List**
   - Click "Create List" button
   - Enter name: "Hot Leads Q1"
   - Enter description: "High priority leads from Q1 event"
   - Ensure "Static List" tab is selected
   - Click "Create"
   - ✓ Verify: List appears under "Static Lists" tab
   - ✓ Verify: Shows "0 contacts"
   - ✓ Verify: Shows "static" badge

2. **Create a Dynamic List with Tier Filter**
   - Click "Create List" button
   - Enter name: "All Hot Tier Contacts"
   - Switch to "Dynamic List" tab
   - Click "Hot" and "Warm" tier buttons (both should highlight)
   - Click "Create"
   - ✓ Verify: List appears under "Dynamic Lists" tab
   - ✓ Verify: Shows filter criteria: "Tiers: Hot, Warm"

3. **Create a Dynamic List with Multiple Filters**
   - Click "Create List" button
   - Enter name: "Tech Enterprise Leads"
   - Switch to "Dynamic List" tab
   - Select tiers: "Hot", "Warm"
   - Enter industries: "Technology, Software, SaaS"
   - Enter technologies: "AWS, React, Python"
   - Click "Create"
   - ✓ Verify: Shows all three filter types
   - ✓ Verify: Industries display: "Technology, Software, SaaS"
   - ✓ Verify: Technologies not shown in preview (UI limitation)

4. **Edit a List**
   - Click edit icon on "Hot Leads Q1"
   - Change name to "Hot Leads Q1 2025"
   - Update description
   - Click "Update"
   - ✓ Verify: Changes reflected immediately
   - ✓ Verify: "Last updated" timestamp changed

5. **Delete a List**
   - Click delete icon on "All Hot Tier Contacts"
   - Confirm deletion
   - ✓ Verify: List removed from "Dynamic Lists" tab
   - ✓ Verify: Count in tab badge decremented

**API Verification:**
```bash
# Check lists were created
curl http://localhost:3000/api/lists

# Expected response:
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Hot Leads Q1 2025",
      "type": "static",
      "contactCount": 0,
      "badgeScanIds": []
    },
    {
      "id": "...",
      "name": "Tech Enterprise Leads",
      "type": "dynamic",
      "filterCriteria": {
        "tiers": ["Hot", "Warm"],
        "industries": ["Technology", "Software", "SaaS"],
        "technologies": ["AWS", "React", "Python"]
      }
    }
  ]
}
```

---

### Test 1.3: MEDDIC Score Cards (FR-026)

**Note:** This component requires enriched data with MEDDIC scores. We'll test the component after running enrichment in Phase 2.

**For now, verify component exists:**
```bash
# Check component file
ls components/reports/meddic-score-card.tsx
```

---

## Phase 2: Test Option A (Workflow Integration)

### Test 2.1: CSV Upload with Proximity Detection (FR-031)

**Navigate to:**
```
http://localhost:3000/dashboard
```

**Step-by-Step:**

1. **Prepare Test CSV**
   Create a CSV file with contacts scanned within 15 seconds:
   ```csv
   firstName,lastName,email,company,jobTitle,scannedAt
   John,Doe,john@acme.com,Acme Corp,CEO,2024-01-15T10:00:00Z
   Jane,Smith,jane@acme.com,Acme Corp,CTO,2024-01-15T10:00:05Z
   Bob,Johnson,bob@techstart.com,TechStart Inc,VP Sales,2024-01-15T10:00:10Z
   Alice,Williams,alice@techstart.com,TechStart Inc,CMO,2024-01-15T10:00:12Z
   Charlie,Brown,charlie@solo.com,Solo Ventures,Founder,2024-01-15T10:02:00Z
   ```

2. **Upload CSV**
   - Click "Event Setup" or navigate to upload page
   - Select or create an event
   - Upload the CSV file
   - Map columns (firstName → First Name, etc.)
   - Click "Confirm Upload"
   - ✓ Verify: Upload success message
   - ✓ Verify: Shows "5 badge scans imported"
   - **✓ Verify: Shows "2 proximity groups detected"** (NEW)

3. **Verify Proximity Groups**
   - Check API response:
   ```bash
   # Get all badge scans for the event
   curl http://localhost:3000/api/badge-scans?eventId=<event-id>
   ```

   - ✓ Expected: John, Jane, Bob, Alice have `proximityGroupId` set
   - ✓ Expected: Two groups:
     - Group 1: John & Jane (Acme Corp) - 5 seconds apart
     - Group 2: Bob & Alice (TechStart) - 2 seconds apart
   - ✓ Expected: Charlie has no `proximityGroupId` (>15 seconds gap)

**API Verification:**
```bash
# Get proximity groups
curl http://localhost:3000/api/proximity-groups?eventId=<event-id>

# Expected response:
{
  "success": true,
  "data": [
    {
      "id": "...",
      "eventId": "...",
      "badgeScanIds": ["scan-1", "scan-2"],
      "firstScanTime": "2024-01-15T10:00:00Z",
      "lastScanTime": "2024-01-15T10:00:05Z",
      "durationSeconds": 5
    },
    {
      "id": "...",
      "eventId": "...",
      "badgeScanIds": ["scan-3", "scan-4"],
      "firstScanTime": "2024-01-15T10:00:10Z",
      "lastScanTime": "2024-01-15T10:00:12Z",
      "durationSeconds": 2
    }
  ]
}
```

---

### Test 2.2: Dual-Tier Calculation (FR-032)

**Navigate to:**
```
http://localhost:3000/dashboard
```

**Step-by-Step:**

1. **Start Batch Enrichment**
   - Select all 5 imported badge scans
   - Click "Enrich Selected"
   - Select default personas
   - Click "Start Enrichment"
   - ✓ Verify: Job starts with job ID
   - ✓ Verify: Progress indicator shows

2. **Monitor Enrichment Progress**
   - Watch real-time SSE updates
   - ✓ Verify: Progress bar updates
   - ✓ Verify: Current item shows company names
   - ✓ Verify: Completes with "5/5 processed"

3. **Verify Dual-Tier Results**
   After enrichment completes:
   ```bash
   # Get enriched company for a badge scan
   curl http://localhost:3000/api/badge-scans/<scan-id>

   # Expected response includes:
   {
     "success": true,
     "data": {
       "id": "...",
       "company": "Acme Corp",
       "contactTier": "Hot",      # NEW: Contact-level tier
       "enrichedCompany": {
         "companyTier": "Warm",   # NEW: Company-level tier
         ...
       },
       "personaMatch": {
         "tier": "Hot",           # Combined tier (60% company + 40% contact)
         "companyTier": "Warm",   # NEW
         "contactTier": "Hot",    # NEW
         "combinedTierCalculation": {  # NEW
           "companyTierWeight": 0.6,
           "contactTierWeight": 0.4,
           "companyTierValue": 70,
           "contactTierValue": 85,
           "combinedScore": 76,
           "resultingTier": "Hot"
         }
       }
     }
   }
   ```

4. **Verify Tier Calculation Logic**
   - ✓ Company Tier based on:
     - Industry match
     - Company size
     - Technology stack
     - Revenue/funding
     - Geographic location

   - ✓ Contact Tier based on:
     - Job title (decision maker)
     - Seniority level

   - ✓ Combined Tier = 60% company + 40% contact
   - ✓ Thresholds:
     - Hot: ≥75%
     - Warm: 50-74%
     - Cold: 30-49%
     - Unscored: <30% or missing data

---

### Test 2.3: Report with Triple Tier Breakdowns

**Navigate to:**
```
http://localhost:3000/reports
```

**Step-by-Step:**

1. **Create a Report**
   - Click "Generate Report"
   - Select event with enriched badge scans
   - Select all tiers: Hot, Warm, Cold, Unscored
   - Click "Generate"
   - ✓ Verify: Report created successfully

2. **View Triple Tier Statistics**
   - Open the generated report
   - Scroll to "Statistics" section
   - ✓ Verify: Three tier breakdown sections:
     - **Company Tier Breakdown**
     - **Contact Tier Breakdown**
     - **Combined Tier Breakdown**

   - ✓ Expected format:
     ```
     Company Tier Breakdown:
     - Hot: 1 (20%)
     - Warm: 2 (40%)
     - Cold: 1 (20%)
     - Unscored: 1 (20%)

     Contact Tier Breakdown:
     - Hot: 3 (60%)
     - Warm: 1 (20%)
     - Cold: 0 (0%)
     - Unscored: 1 (20%)

     Combined Tier Breakdown (Final):
     - Hot: 2 (40%)
     - Warm: 2 (40%)
     - Cold: 0 (0%)
     - Unscored: 1 (20%)
     ```

**API Verification:**
```bash
# Get report statistics
curl http://localhost:3000/api/reports/<report-id>

# Expected response includes:
{
  "success": true,
  "data": {
    "statistics": {
      "totalScans": 5,
      "enrichedCount": 5,
      "companyTierBreakdown": {    # NEW
        "hot": 1,
        "warm": 2,
        "cold": 1,
        "unscored": 1
      },
      "contactTierBreakdown": {    # NEW
        "hot": 3,
        "warm": 1,
        "cold": 0,
        "unscored": 1
      },
      "combinedTierBreakdown": {   # NEW
        "hot": 2,
        "warm": 2,
        "cold": 0,
        "unscored": 1
      }
    }
  }
}
```

---

## Phase 3: Test Option C (API Endpoints)

### Test 3.1: MEDDIC Analysis API (FR-026)

**Step-by-Step:**

1. **Calculate MEDDIC Score**
   ```bash
   # Get a badge scan ID from enriched data
   curl http://localhost:3000/api/meddic/<badge-scan-id>
   ```

2. **Verify MEDDIC Response**
   ✓ Expected response structure:
   ```json
   {
     "success": true,
     "data": {
       "id": "...",
       "badgeScanId": "...",
       "companyId": "...",
       "metricsScore": 70,
       "economicBuyerScore": 80,
       "decisionCriteriaScore": 60,
       "decisionProcessScore": 50,
       "identifyPainScore": 75,
       "championScore": 70,
       "overallScore": 67.5,
       "qualificationStatus": "Developing",
       "economicBuyer": {
         "title": "CEO",
         "confidence": 70
       },
       "missingDecisionMakers": [
         {
           "role": "Technical Champion",
           "title": "CTO or Engineering Lead",
           "foundViaResearch": false
         }
       ],
       "engagementStrategy": "Build champion relationship and gather intel on decision process. Focus on pain point validation.",
       "calculatedAt": "2024-01-15T12:00:00Z"
     }
   }
   ```

3. **Verify Qualification Logic**
   - ✓ Overall score = average of 6 dimensions
   - ✓ Qualification status:
     - "Qualified": ≥70%
     - "Developing": 50-69%
     - "Unqualified": <50%
   - ✓ Engagement strategy varies by status

4. **Test MEDDIC Score Card Component**
   - Navigate to badge scan detail page
   - ✓ Verify: MEDDIC card displays with:
     - Overall score and status badge
     - 6 dimension scores with progress bars
     - Color coding (green ≥75%, yellow 50-74%, red <50%)
     - Economic buyer info (if found)
     - Missing decision makers alert
     - Engagement strategy recommendation

---

### Test 3.2: List Management APIs

Already tested via UI in Test 1.2. Here's additional API testing:

**Direct API Testing:**

1. **Create List via API**
   ```bash
   curl -X POST http://localhost:3000/api/lists \
     -H "Content-Type: application/json" \
     -d '{
       "name": "API Test List",
       "description": "Created via API",
       "type": "dynamic",
       "filterCriteria": {
         "tiers": ["Hot"],
         "industries": ["Technology"]
       }
     }'
   ```

   - ✓ Verify: Returns 201 status
   - ✓ Verify: Response includes list ID

2. **Update List via API**
   ```bash
   curl -X PUT http://localhost:3000/api/lists/<list-id> \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Updated API Test List",
       "filterCriteria": {
         "tiers": ["Hot", "Warm"]
       }
     }'
   ```

   - ✓ Verify: Returns 200 status
   - ✓ Verify: Changes applied

3. **Delete List via API**
   ```bash
   curl -X DELETE http://localhost:3000/api/lists/<list-id>
   ```

   - ✓ Verify: Returns 200 status
   - ✓ Verify: List no longer in GET response

4. **Test Duplicate Name Prevention**
   ```bash
   # Try creating a list with existing name
   curl -X POST http://localhost:3000/api/lists \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Hot Leads Q1 2025",
       "type": "static"
     }'
   ```

   - ✓ Verify: Returns 409 status (conflict)
   - ✓ Verify: Error message explains duplicate name

---

### Test 3.3: Async Report Export Queue (FR-027)

**Step-by-Step:**

1. **Test Synchronous Export (Small Report)**
   ```bash
   # GET request for CSV (works for <50 badge scans)
   curl "http://localhost:3000/api/reports/<report-id>/export?format=csv" \
     --output report.csv
   ```

   - ✓ Verify: CSV file downloaded immediately
   - ✓ Verify: Contains all badge scan data

2. **Test Async Export (Large Report)**
   ```bash
   # POST request to start async export job
   curl -X POST http://localhost:3000/api/reports/<report-id>/export \
     -H "Content-Type: application/json" \
     -d '{"format": "pdf"}'
   ```

   - ✓ Verify: Returns job ID
   - ✓ Expected response:
     ```json
     {
       "jobId": "report_job_1234567_abc123",
       "reportId": "...",
       "format": "pdf",
       "totalItems": 75,
       "status": "QUEUED",
       "message": "Report export job started successfully",
       "statusEndpoint": "/api/reports/export-status/report_job_1234567_abc123",
       "progressEndpoint": "/api/reports/export-progress?jobId=report_job_1234567_abc123"
     }
     ```

3. **Monitor Export Progress via Polling**
   ```bash
   # Check job status
   curl http://localhost:3000/api/reports/export-status/report_job_1234567_abc123
   ```

   - ✓ Verify: Returns current progress
   - ✓ Expected response:
     ```json
     {
       "success": true,
       "data": {
         "jobId": "report_job_1234567_abc123",
         "reportId": "...",
         "format": "pdf",
         "totalItems": 75,
         "processedItems": 35,
         "status": "PROCESSING",
         "currentItem": "Generating company reports (35/75)...",
         "percentComplete": 47,
         "fileUrl": null,
         "fileSize": null,
         "error": null
       }
     }
     ```

4. **Test SSE Progress Streaming**
   - Open browser console on report page
   - Start async export
   - ✓ Verify: EventSource connection established
   - ✓ Verify: Progress updates every 500ms
   - ✓ Expected console output:
     ```
     SSE connected to: /api/reports/export-progress?jobId=...
     Progress update: 0%
     Progress update: 20% - Loading enrichment data...
     Progress update: 50% - Generating pdf export...
     Progress update: 75% - Generating company reports (56/75)...
     Progress update: 100% - COMPLETED
     SSE connection closed
     ```

5. **Test Export Progress Component**
   - In UI, click "Export" button on a large report
   - Select format (PDF or Company Reports)
   - ✓ Verify: Progress card appears
   - ✓ Verify: Shows real-time progress bar
   - ✓ Verify: Shows current item being processed
   - ✓ Verify: On completion:
     - Shows green "Export Complete" banner
     - Shows file size
     - "Download" button appears
   - Click "Download"
   - ✓ Verify: File downloads (data URL or actual file)

6. **Test All Export Formats**

   **CSV Export:**
   ```bash
   curl -X POST http://localhost:3000/api/reports/<report-id>/export \
     -H "Content-Type: application/json" \
     -d '{"format": "csv"}'
   ```
   - ✓ Verify: Generates CSV with all lead data

   **PDF Export:**
   ```bash
   curl -X POST http://localhost:3000/api/reports/<report-id>/export \
     -H "Content-Type: application/json" \
     -d '{"format": "pdf"}'
   ```
   - ✓ Verify: Generates PDF report (requires Puppeteer)

   **CRO Summary:**
   ```bash
   curl -X POST http://localhost:3000/api/reports/<report-id>/export \
     -H "Content-Type: application/json" \
     -d '{"format": "cro_summary"}'
   ```
   - ✓ Verify: Generates markdown summary

   **Company Reports:**
   ```bash
   curl -X POST http://localhost:3000/api/reports/<report-id>/export \
     -H "Content-Type: application/json" \
     -d '{"format": "company_reports"}'
   ```
   - ✓ Verify: Generates individual reports for each company
   - ✓ Verify: Returns JSON array with all reports

7. **Test Job Deletion**
   ```bash
   # Try deleting active job (should fail)
   curl -X DELETE http://localhost:3000/api/reports/export-status/<job-id>
   ```
   - ✓ Verify: Returns 400 error (can't delete active job)

   ```bash
   # Delete completed job
   curl -X DELETE http://localhost:3000/api/reports/export-status/<completed-job-id>
   ```
   - ✓ Verify: Returns 200 status
   - ✓ Verify: Job removed from queue

8. **Test Error Handling**

   **Invalid Format:**
   ```bash
   curl -X POST http://localhost:3000/api/reports/<report-id>/export \
     -H "Content-Type: application/json" \
     -d '{"format": "invalid"}'
   ```
   - ✓ Verify: Returns 400 error
   - ✓ Verify: Error includes supported formats

   **Non-existent Report:**
   ```bash
   curl -X POST http://localhost:3000/api/reports/fake-id/export \
     -H "Content-Type: application/json" \
     -d '{"format": "csv"}'
   ```
   - ✓ Verify: Returns 404 error

---

## Phase 4: End-to-End Workflow Testing

### Complete Workflow Test (All Features Together)

**Scenario: Trade Show Lead Management End-to-End**

1. **Setup (5 minutes)**
   - Create event: "Tech Summit 2025"
   - Create tag: "VIP" (red color)
   - Create static list: "Follow Up Priority"
   - Create dynamic list: "Hot Enterprise Leads" (filters: Hot tier, Technology industry)

2. **Import Leads (2 minutes)**
   - Upload CSV with 20+ badge scans (include timestamps within 15-second windows)
   - ✓ Verify: Proximity groups detected
   - ✓ Verify: All scans imported

3. **Enrichment (5-10 minutes)**
   - Select all badge scans
   - Start batch enrichment
   - ✓ Verify: Real-time progress updates
   - ✓ Verify: All scans enriched successfully
   - ✓ Verify: Dual-tier calculations visible in results

4. **Tag Application (2 minutes)**
   - Filter for "Hot" combined tier
   - Select top 5 contacts
   - Apply "VIP" tag
   - ✓ Verify: Tag count updates to 5

5. **MEDDIC Analysis (3 minutes)**
   - Open detail page for a VIP contact
   - Click "Calculate MEDDIC Score"
   - ✓ Verify: 6 dimensions displayed
   - ✓ Verify: Qualification status shown
   - ✓ Verify: Engagement strategy provided
   - ✓ Verify: Missing decision makers identified

6. **Report Generation (2 minutes)**
   - Generate report for all Hot/Warm tiers
   - ✓ Verify: Three tier breakdowns shown
   - ✓ Verify: Statistics accurate
   - ✓ Verify: Proximity groups visible

7. **Export Testing (5 minutes)**
   - Export as CSV (sync) - ✓ Download immediate
   - Export as PDF (async) - ✓ Progress shown
   - Export CRO Summary - ✓ Markdown generated
   - Export Company Reports - ✓ Individual reports created

8. **List Management (3 minutes)**
   - Check "Hot Enterprise Leads" dynamic list
   - ✓ Verify: Auto-populated with matching contacts
   - Add 3 specific contacts to "Follow Up Priority" static list
   - ✓ Verify: Contact count updates

**Total Time: ~30 minutes**

---

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. TypeScript Errors
**Issue:** `Property does not exist on type 'StorageAdapter'`
```bash
# Solution: Some storage methods may not be implemented yet
# Check lib/storage/adapter.ts for method signatures
```

#### 2. Proximity Detection Not Working
**Issue:** No proximity groups detected
```bash
# Check CSV timestamps format
# Must be ISO 8601: 2024-01-15T10:00:00Z
# Scans must be within 15 seconds
```

#### 3. MEDDIC Scores Not Calculating
**Issue:** Returns 404 or null scores
```bash
# Ensure badge scan is enriched first
# Check: GET /api/badge-scans/<scan-id>
# Should have enrichedCompany data
```

#### 4. SSE Progress Not Updating
**Issue:** Progress bar stuck at 0%
```bash
# Check browser console for EventSource errors
# Verify job ID is correct
# Check: GET /api/reports/export-status/<job-id>
```

#### 5. Export Job Fails Immediately
**Issue:** Status shows FAILED with error
```bash
# Common causes:
# - Missing Puppeteer for PDF export (run: npm install puppeteer)
# - Invalid report ID
# - No enriched data in report
```

#### 6. Dynamic Lists Show 0 Contacts
**Issue:** Filter matches but count is 0
```bash
# This is expected behavior - lists only show count
# Actual contact matching happens at query time
# To verify: Check badge scans that match criteria manually
```

#### 7. Tags Not Applying
**Issue:** Tag created but can't apply to badge scans
```bash
# Check if badge scans exist
# Verify: GET /api/badge-scans?eventId=<event-id>
# Check tag ID is correct
```

---

## Performance Testing

### Load Testing Scenarios

#### 1. Large CSV Upload (100+ contacts)
```bash
# Create CSV with 100 rows
# Upload and time the process
# Expected: <10 seconds for upload + mapping
# Expected: Proximity detection completes <1 second
```

#### 2. Batch Enrichment Performance
```bash
# Test with 50, 100, 200 badge scans
# Expected throughput: 10 concurrent requests
# Expected time: ~30 seconds per 10 scans (depends on LLM API)
```

#### 3. Report Export Performance
```bash
# Test thresholds:
# <50 scans: Sync export (<5 seconds)
# 50-200 scans: Async export (progress tracked)
# 200+ scans: Async required (may take 1-2 minutes)
```

#### 4. SSE Connection Stability
```bash
# Test long-running exports (5+ minutes)
# Verify: SSE connection stays alive
# Verify: No message loss
# Verify: Cleanup on completion
```

---

## API Testing Checklist

Use this checklist to verify all endpoints:

### Lists API
- [ ] GET /api/lists - Returns all lists
- [ ] POST /api/lists - Creates new list
- [ ] GET /api/lists/[listId] - Returns specific list
- [ ] PUT /api/lists/[listId] - Updates list
- [ ] DELETE /api/lists/[listId] - Deletes list
- [ ] Duplicate name validation works
- [ ] Static vs Dynamic type validation works

### MEDDIC API
- [ ] GET /api/meddic/[badgeScanId] - Calculates score
- [ ] Returns 404 for non-existent scan
- [ ] Returns 400 for unenriched scan
- [ ] Saves score to storage
- [ ] All 6 dimensions calculated
- [ ] Qualification status correct
- [ ] Engagement strategy generated

### Export API
- [ ] GET /api/reports/[reportId]/export?format=csv - Sync CSV
- [ ] GET /api/reports/[reportId]/export?format=pdf - Sync PDF
- [ ] POST /api/reports/[reportId]/export - Async export
- [ ] GET /api/reports/export-status/[jobId] - Status check
- [ ] GET /api/reports/export-progress?jobId=... - SSE stream
- [ ] DELETE /api/reports/export-status/[jobId] - Delete job
- [ ] All 4 formats work (csv, pdf, cro_summary, company_reports)
- [ ] Error handling for invalid formats

---

## Success Criteria

### Option A: Workflow Integration
- ✓ Proximity detection identifies groups accurately
- ✓ Dual-tier calculation produces correct company/contact/combined tiers
- ✓ Report statistics show three separate tier breakdowns
- ✓ No existing functionality broken

### Option B: UI Components
- ✓ Tag manager creates/edits/deletes tags with colors
- ✓ List manager handles static and dynamic lists
- ✓ MEDDIC score cards display all 6 dimensions correctly
- ✓ All components responsive and accessible

### Option C: API Endpoints
- ✓ List APIs support full CRUD operations
- ✓ MEDDIC API calculates scores based on enriched data
- ✓ Async export queue handles large reports efficiently
- ✓ SSE progress streaming works reliably
- ✓ All error cases handled with 3-part error format

---

## Next Steps After Testing

1. **Found Issues?**
   - Document error messages and steps to reproduce
   - Check browser console and server logs
   - Verify data model assumptions

2. **Performance Concerns?**
   - Profile slow operations
   - Check database query efficiency
   - Consider caching for dynamic lists

3. **Ready for Production?**
   - All tests passing
   - Error handling comprehensive
   - User experience smooth
   - Documentation complete

---

## Quick Reference

### Key URLs
- Dashboard: `http://localhost:3000/dashboard`
- Settings: `http://localhost:3000/settings`
- Reports: `http://localhost:3000/reports`

### Key API Endpoints
- Lists: `/api/lists`, `/api/lists/[listId]`
- MEDDIC: `/api/meddic/[badgeScanId]`
- Export: `/api/reports/[reportId]/export`
- Export Status: `/api/reports/export-status/[jobId]`
- Export Progress: `/api/reports/export-progress?jobId=...`

### Sample Test Data
- Event: "Tech Summit 2025"
- Tags: "VIP" (red), "Follow Up" (purple)
- Lists: "Hot Leads Q1 2025" (static), "Tech Enterprise Leads" (dynamic)
- Proximity window: 15 seconds
- Tier thresholds: Hot ≥75%, Warm 50-74%, Cold 30-49%
