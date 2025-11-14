# Company Report: {{company_name}}

**Report Generated**: {{generated_at}}
**Event**: {{event_name}}
**Lead Tier**: {{tier}}

---

## Company Profile

### Basic Information
- **Company Name**: {{company_name}}
- **Domain**: {{domain}}
- **Industry**: {{industry}}
- **Headquarters**: {{headquarters}}

### Company Size & Scale
- **Employee Count**: {{employee_count}}
- **Employee Range**: {{employee_range}}
- **Annual Revenue**: {{annual_revenue}}
- **Revenue Range**: {{revenue_range}}

### Funding & Growth
- **Funding Stage**: {{funding_stage}}
- **Total Funding**: {{total_funding}}
- **Founded**: {{founded_year}}

### Technology Stack
{{#tech_stack}}
- {{technology}}
{{/tech_stack}}

{{^tech_stack}}
*Technology stack information not available*
{{/tech_stack}}

### Social Presence
{{#social_links}}
- **LinkedIn**: {{linkedin_url}}
- **Twitter**: {{twitter_handle}}
{{/social_links}}

---

## Contact Information

### Primary Contact
- **Name**: {{contact_first_name}} {{contact_last_name}}
- **Job Title**: {{contact_job_title}}
- **Email**: {{contact_email}}
- **Phone**: {{contact_phone}}

### Event Details
- **Scanned At**: {{scanned_at}}
- **Booth Location**: {{booth_location}}
- **Notes**: {{notes}}

---

## Persona Match Analysis

### Fit Score Breakdown
- **Overall Fit Score**: {{fit_score}}/100
- **Lead Tier**: {{tier}}

### Criteria Matches
{{#criteria_matches}}
#### {{criterion_name}}
- **Match Status**: {{#matched}}✓ Matched{{/matched}}{{^matched}}✗ Not Matched{{/matched}}
- **Actual Value**: {{actual_value}}
- **Target Value**: {{target_value}}
- **Weight**: {{weight}}
- **Contribution to Score**: {{contribution_to_score}}

{{/criteria_matches}}

### Tier Assignment Justification

**Why {{tier}} Tier:**

{{tier_justification}}

{{#tier_details}}
{{#is_hot}}
This lead is classified as **Hot** because:
- Fit score of {{fit_score}}% exceeds the 70% threshold
- Strong alignment with ideal customer profile across multiple criteria
- Immediate follow-up recommended within 24-48 hours
{{/is_hot}}

{{#is_warm}}
This lead is classified as **Warm** because:
- Fit score of {{fit_score}}% falls in the 40-69% range
- Moderate alignment with ideal customer profile
- Follow-up recommended within 1-2 weeks with targeted messaging
{{/is_warm}}

{{#is_cold}}
This lead is classified as **Cold** because:
- Fit score of {{fit_score}}% is below 40%
- Limited alignment with current ideal customer profile
- Add to nurture campaign for long-term relationship building
{{/is_cold}}

{{#is_unscored}}
This lead is classified as **Unscored** because:
- Insufficient enrichment data available (< 30% data coverage)
- Unable to calculate accurate fit score
- Manual review recommended to assess lead quality
{{/is_unscored}}
{{/tier_details}}

---

## Actionable Insights

### Identified Pain Points
{{#pain_points}}
- {{pain_point}}
{{/pain_points}}

{{^pain_points}}
*Pain points analysis not available. Conduct discovery call to identify specific challenges.*
{{/pain_points}}

### Conversation Starters
{{#conversation_starters}}
- {{starter}}
{{/conversation_starters}}

{{^conversation_starters}}
**Suggested conversation starters:**
- "I noticed you attended {{event_name}}. What challenges are you currently facing in {{industry}}?"
- "How is {{company_name}} currently handling [relevant pain point]?"
- "Based on your company's growth stage, have you considered [relevant solution]?"
{{/conversation_starters}}

### Value Proposition Alignment
{{#value_props}}
- **{{title}}**: {{description}}
{{/value_props}}

---

## Recommended Next Steps

### Immediate Actions
{{#immediate_actions}}
1. {{action}}
{{/immediate_actions}}

### Follow-Up Strategy
{{#follow_up_strategy}}
- **Timing**: {{timing}}
- **Channel**: {{channel}}
- **Message**: {{message}}
- **Objective**: {{objective}}
{{/follow_up_strategy}}

### Success Metrics
- **Target Response Rate**: {{target_response_rate}}%
- **Expected Conversion Timeline**: {{conversion_timeline}}
- **Estimated Deal Value**: {{estimated_deal_value}}

---

## Additional Notes

{{#additional_notes}}
{{notes_content}}
{{/additional_notes}}

{{^additional_notes}}
*No additional notes. Add observations from discovery calls or research here.*
{{/additional_notes}}

---

**Company ID**: {{company_id}}
**Badge Scan ID**: {{badge_scan_id}}
**Enrichment Source**: {{enrichment_source}}
**Data Coverage**: {{data_coverage}}%
**Last Updated**: {{last_updated}}
