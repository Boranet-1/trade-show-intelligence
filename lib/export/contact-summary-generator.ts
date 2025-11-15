/**
 * Contact Summary Generator
 * Generates detailed markdown reports for individual contacts
 */

import fs from 'fs/promises'
import path from 'path'
import type { BadgeScan } from '../types'
import type { ContactTierCalculationResult } from '../scoring/contact-tier-calculator'

export async function generateContactSummaryMarkdown(
  badgeScan: BadgeScan,
  contactTier: ContactTierCalculationResult,
  companyTier: string,
  eventName: string,
  eventDate: string
): Promise<string> {
  const templatePath = path.join(process.cwd(), 'lib', 'templates', 'contact-summary.md')
  const template = await fs.readFile(templatePath, 'utf-8')

  const data = {
    contact_name: `${badgeScan.firstName} ${badgeScan.lastName}`.trim(),
    company_name: badgeScan.company,
    job_title: badgeScan.jobTitle || 'Unknown',
    event_name: eventName,
    event_date: eventDate,
    generated_at: new Date().toISOString(),
    full_name: `${badgeScan.firstName} ${badgeScan.lastName}`.trim(),
    email: badgeScan.email || 'Not provided',
    phone: badgeScan.phone || 'Not provided',
    linkedin_url: '',
    location: 'Unknown',
    seniority_level: contactTier.seniority_level,
    meddic_role: contactTier.meddic_role,
    contact_tier: contactTier.tier,
    tier_score: contactTier.score,
    meddic_role_score: contactTier.breakdown.meddic_role_score,
    seniority_score: contactTier.breakdown.seniority_score,
    engagement_score: contactTier.breakdown.engagement_score,
    meddic_role_weight: 40,
    seniority_weight: 30,
    engagement_weight: 30,
    company_tier: companyTier,
    combined_tier_assessment: `${contactTier.tier} contact at ${companyTier} company`,
    scan_timestamp: new Date(badgeScan.scannedAt).toLocaleString(),
    scanner_id: badgeScan.id.substring(0, 8),
    booth_location: badgeScan.boothLocation || 'Not recorded',
    sales_notes: badgeScan.notes || 'None',
    in_proximity_group: false,
    in_crm: false,
    contact_id: badgeScan.id,
    report_id: `contact_${badgeScan.id}_${Date.now()}`
  }

  return replaceTemplateVariables(template, data)
}

function replaceTemplateVariables(template: string, data: any): string {
  let result = template

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const regex = new RegExp(`{{${key}}}`, 'g')
      result = result.replace(regex, String(value))
    }
  }

  // Handle conditionals
  result = result.replace(/{{#if\s+(\w+)}}(.*?)(?:{{else}}(.*?))?{{\/if}}/gs, (match, condition, ifContent, elseContent = '') => {
    return data[condition] ? ifContent : elseContent
  })

  result = result.replace(/{{.*?}}/g, 'Not available')
  return result
}
