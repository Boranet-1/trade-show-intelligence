# Quick Testing Checklist

## 5-Minute Smoke Test

Run this quick test to verify all new features work:

### 1. Start Server
```bash
npm run dev
# Wait for http://localhost:3000
```

### 2. Test UI Components (2 min)

**Tags:**
- [ ] Go to `/settings`
- [ ] Create tag "Test VIP" with red color
- [ ] Edit to orange
- [ ] Delete tag

**Lists:**
- [ ] Create static list "Test Static"
- [ ] Create dynamic list with Hot tier filter
- [ ] Delete both lists

### 3. Test Workflow (3 min)

**Upload CSV with proximity:**
```csv
firstName,lastName,email,company,scannedAt
John,Doe,john@acme.com,Acme,2024-01-15T10:00:00Z
Jane,Smith,jane@acme.com,Acme,2024-01-15T10:00:05Z
```
- [ ] Upload shows "1 proximity group detected"

**Check enrichment:**
- [ ] Enrich the 2 scans
- [ ] Check badge scan has `companyTier`, `contactTier`, `combinedTier`

**Generate report:**
- [ ] Create report
- [ ] Verify 3 tier breakdowns in statistics

### 4. Test APIs (via browser DevTools or curl)

```bash
# MEDDIC
curl http://localhost:3000/api/meddic/<badge-scan-id>
# Should return 6 MEDDIC scores

# Export async
curl -X POST http://localhost:3000/api/reports/<report-id>/export \
  -H "Content-Type: application/json" \
  -d '{"format":"csv"}'
# Should return job ID

# Check progress
curl http://localhost:3000/api/reports/export-status/<job-id>
# Should show progress
```

---

## Detailed Feature Testing

### Option A: Workflow Integration

#### Proximity Detection
```bash
# 1. Upload CSV with timestamps 5-10 seconds apart
# 2. Check upload response
curl http://localhost:3000/api/badge-scans?eventId=<event-id>
# 3. Verify proximityGroupId populated
curl http://localhost:3000/api/proximity-groups?eventId=<event-id>
# 4. Should see group with 2+ scans
```
**Pass Criteria:** Groups formed within 15-second window ✓

#### Dual-Tier Calculation
```bash
# 1. Enrich badge scans
# 2. Check persona match
curl http://localhost:3000/api/badge-scans/<scan-id>
# Look for:
{
  "personaMatch": {
    "companyTier": "Warm",    # Based on company criteria
    "contactTier": "Hot",     # Based on job title
    "tier": "Hot",            # Combined (60% company + 40% contact)
    "combinedTierCalculation": {
      "companyTierWeight": 0.6,
      "contactTierWeight": 0.4,
      "resultingTier": "Hot"
    }
  }
}
```
**Pass Criteria:** Three separate tiers calculated correctly ✓

#### Triple Tier Breakdowns
```bash
# 1. Generate report
# 2. Check statistics
curl http://localhost:3000/api/reports/<report-id>
# Look for:
{
  "statistics": {
    "companyTierBreakdown": { "hot": 1, "warm": 2, ... },
    "contactTierBreakdown": { "hot": 3, "warm": 1, ... },
    "combinedTierBreakdown": { "hot": 2, "warm": 2, ... }
  }
}
```
**Pass Criteria:** All three breakdowns present and accurate ✓

---

### Option B: UI Components

#### Tag Manager
1. Navigate to `/settings`
2. Test flow:
   - Create tag with preset color (Red #EF4444)
   - Create tag with custom hex (#8B5CF6)
   - Edit tag (change name and color)
   - Delete tag
3. Verify:
   - Color picker works (preset and custom)
   - Preview badge shows correct color
   - Tag list updates immediately
   - Count shows 0 contacts initially

**Pass Criteria:** All CRUD operations work, colors display correctly ✓

#### List Manager
1. Navigate to `/settings`
2. Test static list:
   - Create "Test Static"
   - Shows in "Static Lists" tab
   - Contact count = 0
   - Edit description
   - Delete
3. Test dynamic list:
   - Create "Test Dynamic"
   - Set tiers: Hot, Warm
   - Set industries: Technology, SaaS
   - Shows filter criteria in preview
   - Delete
4. Test tabs:
   - Switch between Static/Dynamic tabs
   - Count badges update

**Pass Criteria:** Static and dynamic lists work, filters save correctly ✓

#### MEDDIC Score Cards
1. Enrich a badge scan
2. Calculate MEDDIC score:
   ```bash
   curl http://localhost:3000/api/meddic/<badge-scan-id>
   ```
3. View in UI (badge scan detail page)
4. Verify display:
   - Overall score with progress bar
   - 6 dimensions with icons:
     - Metrics (TrendingUp)
     - Economic Buyer (DollarSign)
     - Decision Criteria (CheckCircle)
     - Decision Process (GitBranch)
     - Identify Pain (AlertCircle)
     - Champion (Users)
   - Color coding: Green (≥75%), Yellow (50-74%), Red (<50%)
   - Economic Buyer info (if found)
   - Missing decision makers section
   - Engagement strategy
5. Test compact view in tables

**Pass Criteria:** All 6 dimensions display, colors correct, recommendations shown ✓

---

### Option C: API Endpoints

#### List Management APIs

**Create List:**
```bash
curl -X POST http://localhost:3000/api/lists \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test List",
    "type": "dynamic",
    "filterCriteria": {
      "tiers": ["Hot", "Warm"],
      "industries": ["Technology"]
    }
  }'
# Expect: 201 status, list ID returned
```

**Get List:**
```bash
curl http://localhost:3000/api/lists/<list-id>
# Expect: 200 status, full list details
```

**Update List:**
```bash
curl -X PUT http://localhost:3000/api/lists/<list-id> \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "filterCriteria": {
      "tiers": ["Hot"]
    }
  }'
# Expect: 200 status, updated list
```

**Delete List:**
```bash
curl -X DELETE http://localhost:3000/api/lists/<list-id>
# Expect: 200 status, success message
```

**Test Validation:**
```bash
# Duplicate name
curl -X POST http://localhost:3000/api/lists \
  -H "Content-Type: application/json" \
  -d '{"name": "API Test List", "type": "static"}'
# Expect: 409 status, conflict error

# Invalid type
curl -X POST http://localhost:3000/api/lists \
  -H "Content-Type: application/json" \
  -d '{"name": "Invalid", "type": "bad"}'
# Expect: 400 status, validation error
```

**Pass Criteria:** All CRUD ops work, validation prevents bad data ✓

---

#### MEDDIC Analysis API

**Calculate Score:**
```bash
# 1. Ensure badge scan is enriched
curl http://localhost:3000/api/badge-scans/<scan-id>
# Should have enrichedCompany data

# 2. Calculate MEDDIC
curl http://localhost:3000/api/meddic/<scan-id>
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "badgeScanId": "...",
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
    "missingDecisionMakers": [...],
    "engagementStrategy": "...",
    "calculatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Test Error Cases:**
```bash
# Non-existent scan
curl http://localhost:3000/api/meddic/fake-id
# Expect: 404 status

# Unenriched scan
curl http://localhost:3000/api/meddic/<unenriched-scan-id>
# Expect: 400 status, "Company not enriched" error
```

**Verify Logic:**
- Overall score = average of 6 dimensions
- Qualification status:
  - Qualified: ≥70%
  - Developing: 50-69%
  - Unqualified: <50%
- Engagement strategy varies by qualification

**Pass Criteria:** Scores calculate correctly, error handling works ✓

---

#### Async Report Export Queue

**Sync Export (Small Reports):**
```bash
# Direct download for <50 badge scans
curl "http://localhost:3000/api/reports/<report-id>/export?format=csv" \
  --output report.csv
# Expect: Immediate CSV download
```

**Async Export (Large Reports):**
```bash
# 1. Start export job
curl -X POST http://localhost:3000/api/reports/<report-id>/export \
  -H "Content-Type: application/json" \
  -d '{"format": "pdf"}'

# Response:
{
  "jobId": "report_job_1234567_abc123",
  "reportId": "...",
  "format": "pdf",
  "totalItems": 75,
  "status": "QUEUED",
  "statusEndpoint": "/api/reports/export-status/report_job_1234567_abc123",
  "progressEndpoint": "/api/reports/export-progress?jobId=report_job_1234567_abc123"
}
```

**Check Progress (Polling):**
```bash
curl http://localhost:3000/api/reports/export-status/report_job_1234567_abc123

# Response:
{
  "success": true,
  "data": {
    "jobId": "report_job_1234567_abc123",
    "status": "PROCESSING",
    "processedItems": 35,
    "totalItems": 75,
    "percentComplete": 47,
    "currentItem": "Generating company reports (35/75)...",
    "fileUrl": null
  }
}
```

**SSE Progress Streaming:**
```bash
# Open SSE connection (use browser or SSE client)
# EventSource: /api/reports/export-progress?jobId=report_job_1234567_abc123

# Events received:
data: {"status":"PROCESSING","percentComplete":0,"currentItem":"Loading badge scans..."}
data: {"status":"PROCESSING","percentComplete":20,"currentItem":"Loading enrichment data..."}
data: {"status":"PROCESSING","percentComplete":50,"currentItem":"Generating pdf export..."}
data: {"status":"COMPLETED","percentComplete":100,"fileUrl":"data:application/pdf;base64,..."}
```

**Test All Formats:**
```bash
# CSV
curl -X POST http://localhost:3000/api/reports/<report-id>/export \
  -d '{"format":"csv"}'

# PDF (requires Puppeteer)
curl -X POST http://localhost:3000/api/reports/<report-id>/export \
  -d '{"format":"pdf"}'

# CRO Summary (Markdown)
curl -X POST http://localhost:3000/api/reports/<report-id>/export \
  -d '{"format":"cro_summary"}'

# Company Reports (JSON array)
curl -X POST http://localhost:3000/api/reports/<report-id>/export \
  -d '{"format":"company_reports"}'
```

**Delete Job:**
```bash
# Can only delete completed/failed jobs
curl -X DELETE http://localhost:3000/api/reports/export-status/<job-id>
# Expect: 200 if completed, 400 if still processing
```

**Test Error Cases:**
```bash
# Invalid format
curl -X POST http://localhost:3000/api/reports/<report-id>/export \
  -d '{"format":"invalid"}'
# Expect: 400 status, error lists valid formats

# Non-existent report
curl -X POST http://localhost:3000/api/reports/fake-id/export \
  -d '{"format":"csv"}'
# Expect: 404 status
```

**Pass Criteria:**
- Sync export works for small reports
- Async export creates job and tracks progress
- SSE streaming provides real-time updates
- All 4 formats generate correctly
- Error handling comprehensive ✓

---

## UI Testing with Export Progress Component

### Test in Browser

1. **Navigate to Reports Page:**
   ```
   http://localhost:3000/reports
   ```

2. **Generate Large Report:**
   - Create report with 50+ badge scans
   - Click "Export" button
   - Select format (PDF recommended for testing)

3. **Verify Progress Component:**
   - [ ] Progress card appears immediately
   - [ ] Shows job ID
   - [ ] Shows format (PDF)
   - [ ] Progress bar updates in real-time
   - [ ] Current item text updates ("Loading enrichment data...", etc.)
   - [ ] Percent complete accurate (0% → 100%)
   - [ ] Connection indicator shows "Connected"

4. **On Completion:**
   - [ ] Progress bar reaches 100%
   - [ ] Green "Export Complete" banner shows
   - [ ] File size displayed
   - [ ] "Download" button appears
   - [ ] Click download - file downloads
   - [ ] SSE connection closes

5. **Test Error State:**
   - Trigger an error (e.g., invalid report ID)
   - [ ] Red error banner shows
   - [ ] Error message displayed
   - [ ] Retry option available (if implemented)

6. **Test Reconnection:**
   - Start export
   - Refresh page mid-export
   - [ ] Progress resumes from last known state
   - [ ] SSE reconnects automatically

---

## Integration Test Scenarios

### Scenario 1: Complete Lead Qualification Flow

1. Upload 10 badge scans (include proximity timestamps)
2. Verify proximity groups detected
3. Enrich all scans
4. Verify dual-tier calculation on each
5. Create tag "VIP"
6. Apply tag to Hot tier contacts
7. Calculate MEDDIC for tagged contacts
8. Create dynamic list filtered by Hot tier
9. Generate report
10. Verify triple tier breakdown
11. Export report async (PDF)
12. Download and verify content

**Time: ~15 minutes**
**Pass: All steps complete without errors**

---

### Scenario 2: List Management Workflow

1. Create 3 tags: VIP (red), Follow Up (yellow), Cold Lead (blue)
2. Create static list "Priority Outreach"
3. Create dynamic list "Hot Tech Leads" (Hot tier + Technology industry)
4. Upload and enrich 20 badge scans
5. Apply tags to various contacts
6. Add 5 contacts to "Priority Outreach"
7. Verify dynamic list auto-populates
8. Export both lists
9. Update list filters
10. Verify changes reflected

**Time: ~10 minutes**
**Pass: Lists update correctly, filters work**

---

### Scenario 3: Bulk Export Testing

1. Create report with 100+ badge scans
2. Export in all 4 formats simultaneously:
   - CSV (sync)
   - PDF (async)
   - CRO Summary (async)
   - Company Reports (async)
3. Monitor all 3 async jobs
4. Verify all complete successfully
5. Download and verify file contents
6. Delete all completed jobs
7. Verify job queue cleaned up

**Time: ~20 minutes**
**Pass: All exports complete, files valid**

---

## Performance Benchmarks

### Expected Performance

| Operation | Items | Expected Time | Threshold |
|-----------|-------|--------------|-----------|
| CSV Upload | 100 scans | <5 sec | 10 sec |
| Proximity Detection | 100 scans | <1 sec | 2 sec |
| Batch Enrichment | 10 scans | 20-30 sec | 60 sec |
| MEDDIC Calculation | 1 scan | <500ms | 1 sec |
| Report Generation | 100 scans | 2-5 sec | 10 sec |
| Sync Export (CSV) | <50 scans | <3 sec | 5 sec |
| Async Export (PDF) | 100 scans | 30-60 sec | 120 sec |
| SSE Message Rate | - | 500ms/update | 1 sec |

### Load Testing

```bash
# Test with increasing loads
# 10, 50, 100, 200, 500 badge scans
# Verify performance degrades gracefully
# Check memory usage doesn't spike
# Monitor SSE connection stability
```

---

## Final Verification Checklist

### Before Marking Complete

**Option A: Workflow Integration**
- [ ] Proximity detection works (15-second window)
- [ ] Company tier calculated from company criteria
- [ ] Contact tier calculated from job title
- [ ] Combined tier = 60% company + 40% contact
- [ ] Report shows three separate tier breakdowns
- [ ] No existing features broken

**Option B: UI Components**
- [ ] Tag manager: 9 presets + custom hex
- [ ] Tag manager: Full CRUD works
- [ ] List manager: Static lists save badgeScanIds
- [ ] List manager: Dynamic lists save filter criteria
- [ ] List manager: Tabs work, counts accurate
- [ ] MEDDIC card: All 6 dimensions show
- [ ] MEDDIC card: Color coding correct
- [ ] MEDDIC card: Compact variant works

**Option C: API Endpoints**
- [ ] Lists API: Full CRUD works
- [ ] Lists API: Validation prevents duplicates
- [ ] Lists API: Type validation works
- [ ] MEDDIC API: Calculates 6 dimensions
- [ ] MEDDIC API: Qualification status correct
- [ ] MEDDIC API: Engagement strategy generated
- [ ] Export API: Sync works (<50 scans)
- [ ] Export API: Async works (>50 scans)
- [ ] Export API: SSE streaming works
- [ ] Export API: All 4 formats work
- [ ] Export API: Error handling comprehensive

**Cross-Feature Integration**
- [ ] Tags + Lists work together
- [ ] MEDDIC scores use dual-tier data
- [ ] Reports include proximity groups
- [ ] Exports include all enrichment data
- [ ] UI components use correct APIs
- [ ] Error messages consistent (3-part format)

**Code Quality**
- [ ] TypeScript compiles with no errors
- [ ] All FR references added
- [ ] Console shows no errors
- [ ] Network tab shows no failed requests
- [ ] Components render without warnings

---

## Quick Smoke Test Script

Run this in browser console on dashboard:

```javascript
// Test all features quickly
async function quickSmokeTest() {
  const results = {
    tags: false,
    lists: false,
    meddic: false,
    export: false
  };

  try {
    // Test tags API
    const tagsRes = await fetch('/api/tags');
    results.tags = tagsRes.ok;

    // Test lists API
    const listsRes = await fetch('/api/lists');
    results.lists = listsRes.ok;

    // Test MEDDIC API (with first badge scan)
    const scansRes = await fetch('/api/badge-scans');
    const scans = await scansRes.json();
    if (scans.data?.length > 0) {
      const meddicRes = await fetch(`/api/meddic/${scans.data[0].id}`);
      results.meddic = meddicRes.ok || meddicRes.status === 400; // 400 ok if not enriched
    }

    // Test export API (with first report)
    const reportsRes = await fetch('/api/reports');
    const reports = await reportsRes.json();
    if (reports.data?.length > 0) {
      const exportRes = await fetch(`/api/reports/${reports.data[0].id}/export?format=csv`);
      results.export = exportRes.ok;
    }

    console.table(results);
    const allPassed = Object.values(results).every(v => v);
    console.log(allPassed ? '✅ All tests passed!' : '❌ Some tests failed');
    return results;
  } catch (error) {
    console.error('Smoke test error:', error);
    return results;
  }
}

// Run test
quickSmokeTest();
```

Expected output:
```
┌─────────┬────────┐
│ (index) │ Values │
├─────────┼────────┤
│  tags   │  true  │
│  lists  │  true  │
│ meddic  │  true  │
│ export  │  true  │
└─────────┴────────┘
✅ All tests passed!
```

---

## Support

If you encounter issues:

1. Check `TESTING_GUIDE.md` for detailed troubleshooting
2. Review browser console for errors
3. Check server logs for API errors
4. Verify environment variables set
5. Ensure all dependencies installed (`npm install`)

Happy Testing! 🚀
