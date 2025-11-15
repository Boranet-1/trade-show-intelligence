/**
 * Merged Report Generator
 * Combines company and contact summaries into comprehensive report
 */

import fs from 'fs/promises'
import path from 'path'
import { generateCompanySummaryMarkdown } from './company-summary-generator'
import { generateContactSummaryMarkdown } from './contact-summary-generator'

export async function generateMergedReportMarkdown(
  companySummary: string,
  contactSummaries: string[],
  companyName: string,
  eventName: string,
  totalContacts: number,
  tierCounts: { hot: number; warm: number; cold: number }
): Promise<string> {
  const templatePath = path.join(process.cwd(), 'lib', 'templates', 'merged-report.md')
  const template = await fs.readFile(templatePath, 'utf-8')

  const data = {
    company_name: companyName,
    event_name: eventName,
    event_date: new Date().toLocaleDateString(),
    generated_at: new Date().toISOString(),
    company_summary_content: companySummary,
    total_contacts: totalContacts,
    hot_contacts_count: tierCounts.hot,
    warm_contacts_count: tierCounts.warm,
    cold_contacts_count: tierCounts.cold,
    report_id: `merged_${Date.now()}`
  }

  let result = template

  // Replace company summary
  result = result.replace(/{{company_summary_content}}/g, companySummary)

  // Replace contact sections
  result = result.replace(/{{#each contacts}}(.*?){{\/each}}/gs, (match, content) => {
    return contactSummaries.map((summary, index) => {
      let section = content
      section = section.replace(/{{index}}/g, String(index + 1))
      section = section.replace(/{{contact_summary_content}}/g, summary)
      return section
    }).join('\n---\n')
  })

  // Replace other variables
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' || typeof value === 'number') {
      const regex = new RegExp(`{{${key}}}`, 'g')
      result = result.replace(regex, String(value))
    }
  }

  result = result.replace(/{{.*?}}/g, 'Not available')
  return result
}
