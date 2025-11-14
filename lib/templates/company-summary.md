# Company Report: {{company_name}}

**Generated**: {{generated_at}}
**Event**: {{event_name}} ({{event_date}})

---

## Executive Summary

### Win Strategy
{{win_strategy}}

### Opportunity Score: {{opportunity_score}}/100
**Breakdown:**
- Persona Fit: {{persona_fit_score}}/100 ({{persona_fit_weight}}%)
- MEDDIC Score: {{meddic_score}}/100 ({{meddic_weight}}%)
- Engagement: {{engagement_score}}/100 ({{engagement_weight}}%)

**Tier Classification:**
- **Company Tier**: {{company_tier}}
- **Primary Contact Tier**: {{primary_contact_tier}}
- **Combined Tier**: {{combined_tier}}

### Suggested Next Steps
{{#next_steps}}
{{index}}. {{step}} (Timeline: {{timeline}})
{{/next_steps}}

### People to Reach Out To
**Immediate Priority:**
{{#priority_contacts}}
- **{{name}}** ({{title}}) - {{meddic_role}}
  - LinkedIn: {{linkedin_url}}
  - Email: {{email}}
  - Phone: {{phone}}
  - Why contact: {{contact_reason}}
{{/priority_contacts}}

### Attendees & Missing Decision Makers

**Attended Trade Show:**
{{#attendees}}
- **{{name}}** ({{title}}) - {{meddic_role}} - {{contact_tier}} Tier
  - Scanned at: {{scan_time}}
  - Booth location: {{booth_location}}
  - Notes: {{sales_notes}}
{{/attendees}}

**Missing Decision Makers** (Not at Event):
{{#missing_decision_makers}}
- **{{role}}** ({{suggested_title}})
  - Found via research: {{found_name}}
  - LinkedIn: {{linkedin_url}}
  - Recommendation: {{recommendation}}
{{/missing_decision_makers}}

---

## Findings

### Company Overview

**Basic Information:**
- **Industry**: {{industry}}
- **Employees**: {{employee_count}} ({{employee_range}})
- **Annual Revenue**: {{annual_revenue}}
- **Headquarters**: {{headquarters}}
- **Founded**: {{founded}}
- **Funding Stage**: {{funding_stage}}
- **Website**: {{website}}
- **LinkedIn**: {{linkedin_url}}

**Technology Stack:**
{{#tech_stack}}
- {{technology}}
{{/tech_stack}}

**Company Description:**
{{description}}

---

### MEDDIC Analysis

#### Metrics (Score: {{metrics_score}}/100)
**The measurable gain or economic benefit the customer will achieve:**

{{metrics_analysis}}

**Key Metrics:**
{{#key_metrics}}
- {{metric}}: {{value}}
{{/key_metrics}}

---

#### Economic Buyer (Score: {{economic_buyer_score}}/100)
**The person with final authority to approve the purchase:**

{{#if economic_buyer_identified}}
**Identified:**
- **Name**: {{economic_buyer_name}}
- **Title**: {{economic_buyer_title}}
- **LinkedIn**: {{economic_buyer_linkedin}}
- **Confidence**: {{economic_buyer_confidence}}%
- **At Trade Show**: {{economic_buyer_attended}}

**Analysis**: {{economic_buyer_analysis}}
{{else}}
**Not Identified**

**Recommendation**: Research and connect with C-level decision maker (CEO, CFO, or President).
{{/if}}

---

#### Decision Criteria (Score: {{decision_criteria_score}}/100)
**The specific, objective criteria they will use to evaluate solutions:**

{{decision_criteria_analysis}}

**Known Criteria:**
{{#decision_criteria}}
- {{criterion}}
{{/decision_criteria}}

**Competitive Landscape:**
{{#competitors}}
- {{competitor}} ({{context}})
{{/competitors}}

---

#### Decision Process (Score: {{decision_process_score}}/100)
**The steps their organisation will take to make a final purchase decision:**

{{decision_process_analysis}}

**Estimated Timeline**: {{decision_timeline}}

**Process Stages Identified:**
{{#process_stages}}
{{index}}. {{stage}} ({{status}})
{{/process_stages}}

---

#### Identify Pain (Score: {{identify_pain_score}}/100)
**Specific business problems they are experiencing that we can address:**

{{pain_analysis}}

**Pain Points Discovered:**
{{#pain_points}}
- **{{pain_point}}**
  - Source: {{source}}
  - Severity: {{severity}}
  - Evidence: {{evidence}}
{{/pain_points}}

---

#### Champion (Score: {{champion_score}}/100)
**Internal advocate who can champion our solution:**

{{#if champion_identified}}
**Identified:**
- **Name**: {{champion_name}}
- **Title**: {{champion_title}}
- **LinkedIn**: {{champion_linkedin}}
- **Confidence**: {{champion_confidence}}%
- **At Trade Show**: {{champion_attended}}

**Analysis**: {{champion_analysis}}

**Enablement Strategy**: {{champion_enablement}}
{{else}}
**Not Identified**

**Recommendation**: Identify technical or product stakeholder who can advocate internally.
{{/if}}

---

### Products of Interest

**Based on pain points, tech stack, and competitive analysis:**

{{#products_of_interest}}
- **{{product}}**
  - Fit Reason: {{fit_reason}}
  - Priority: {{priority}}
  - Estimated Value: ${{estimated_value}}
{{/products_of_interest}}

---

### Deal Value Estimate

**Estimated Deal Size**: ${{deal_value}}

**Calculation Methodology**:
{{deal_value_methodology}}

**Factors Considered:**
- Company size: {{employee_count}} employees
- Industry average: ${{industry_average}}
- Product mix: {{product_mix}}
- Contract type: {{contract_type}}

---

### Incumbent Relationships

**Current Vendors:**
{{#incumbent_vendors}}
- **{{vendor}}** ({{product_category}})
  - Contract status: {{contract_status}}
  - Satisfaction: {{satisfaction}}
  - Switching potential: {{switching_potential}}
{{/incumbent_vendors}}

**Systems Integrators / Partners:**
{{#partners}}
- **{{partner}}** ({{relationship_type}})
  - Matchmaking opportunity: {{matchmaking_notes}}
{{/partners}}

---

### Recent News & Projects

**Company News:**
{{#recent_news}}
- **[{{date}}] {{title}}**
  - Summary: {{summary}}
  - Relevance: {{relevance}}
  - Source: {{source_url}}
{{/recent_news}}

**Active Projects:**
{{#projects}}
- **{{project_name}}**
  - Description: {{description}}
  - Timeline: {{timeline}}
  - Budget indicator: {{budget_indicator}}
{{/projects}}

**Recent Press Releases:**
{{#press_releases}}
- **[{{date}}] {{title}}**
  - {{summary}}
{{/press_releases}}

---

### Website Intelligence

**Content Analysis:**
{{website_content_summary}}

**Case Studies / Customer Success:**
{{#case_studies}}
- {{case_study_title}}: {{summary}}
{{/case_studies}}

**Blog Topics / Thought Leadership:**
{{#blog_topics}}
- {{topic}} ({{frequency}} posts)
{{/blog_topics}}

---

### Estimated Timeline

**Based on news, hiring, and budget cycles:**

{{timeline_analysis}}

**Timeline Estimate**: {{timeline_estimate}}

**Key Milestones:**
{{#timeline_milestones}}
- {{milestone}}: {{date_estimate}}
{{/timeline_milestones}}

---

### Engagement Strategy

**Recommended Approach:**

{{engagement_strategy}}

**Communication Channels:**
{{#communication_channels}}
- {{channel}}: {{recommendation}}
{{/communication_channels}}

**Talking Points:**
{{#talking_points}}
- {{talking_point}}
{{/talking_points}}

**Resources to Share:**
{{#resources}}
- {{resource_type}}: {{resource_name}} ({{why_relevant}})
{{/resources}}

---

## Data Sources & Confidence

**Enrichment Sources:**
{{#data_sources}}
- {{field}}: {{source}} ({{confidence}}% confidence)
{{/data_sources}}

**Data Quality Score**: {{data_quality_score}}/100

**Last Enriched**: {{last_enriched_at}}

**Refresh Available**: {{refresh_available}}

---

## Action Items

**For Sales Team:**
{{#sales_actions}}
- [ ] {{action}} (Owner: {{owner}}, Due: {{due_date}})
{{/sales_actions}}

**For Marketing:**
{{#marketing_actions}}
- [ ] {{action}}
{{/marketing_actions}}

**For Product:**
{{#product_actions}}
- [ ] {{action}}
{{/product_actions}}

---

*Generated by Trade Show Intelligence Platform*
*Report ID: {{report_id}}*
*Powered by: Tavily, Apify, Firecrawl, and Claude Sonnet 4.5*
