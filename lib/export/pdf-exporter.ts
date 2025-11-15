/**
 * PDF Export Utility
 *
 * Uses Puppeteer for server-side PDF generation with tier-grouped formatting.
 * Renders HTML templates to PDF with proper styling and visual tier indicators.
 */

import type { BadgeScan, EnrichedCompany, PersonaMatch, LeadTier, Report } from '@/lib/types'

/**
 * Generate HTML content for PDF report with tier-grouped formatting
 */
export function generateReportHTML(
  report: Report,
  badgeScans: BadgeScan[],
  enrichedCompanies: Map<string, EnrichedCompany>,
  personaMatches: Map<string, PersonaMatch>
): string {
  const tierColors: Record<LeadTier, { bg: string; text: string; border: string }> = {
    Hot: { bg: '#ef4444', text: '#ffffff', border: '#dc2626' },
    Warm: { bg: '#f97316', text: '#ffffff', border: '#ea580c' },
    Cold: { bg: '#3b82f6', text: '#ffffff', border: '#2563eb' },
    Unscored: { bg: '#9ca3af', text: '#ffffff', border: '#6b7280' },
  }

  const tierOrder: LeadTier[] = ['Hot', 'Warm', 'Cold', 'Unscored']
  const leadsByTier: Record<LeadTier, Array<{ scan: BadgeScan; enriched?: EnrichedCompany; match?: PersonaMatch }>> = {
    Hot: [],
    Warm: [],
    Cold: [],
    Unscored: [],
  }

  // Group leads by tier
  badgeScans.forEach((scan) => {
    const enriched = enrichedCompanies.get(scan.id)
    const match = personaMatches.get(scan.id)
    const tier = match?.tier || 'Unscored'
    leadsByTier[tier].push({ scan, enriched, match })
  })

  const styles = `
    <style>
      @page {
        margin: 2cm;
        size: A4;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #1f2937;
      }
      h1 {
        font-size: 24pt;
        font-weight: bold;
        margin-bottom: 0.5cm;
        color: #111827;
      }
      h2 {
        font-size: 16pt;
        font-weight: bold;
        margin-top: 1cm;
        margin-bottom: 0.5cm;
        padding: 0.3cm;
        border-radius: 0.2cm;
      }
      h3 {
        font-size: 12pt;
        font-weight: 600;
        margin-top: 0.5cm;
        margin-bottom: 0.3cm;
      }
      .header {
        margin-bottom: 1cm;
        padding-bottom: 0.5cm;
        border-bottom: 2px solid #e5e7eb;
      }
      .statistics {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.5cm;
        margin-bottom: 1cm;
      }
      .stat-card {
        padding: 0.4cm;
        border: 1px solid #e5e7eb;
        border-radius: 0.2cm;
        background: #f9fafb;
      }
      .stat-label {
        font-size: 9pt;
        color: #6b7280;
        margin-bottom: 0.2cm;
      }
      .stat-value {
        font-size: 18pt;
        font-weight: bold;
        color: #111827;
      }
      .tier-section {
        page-break-inside: avoid;
        margin-bottom: 0.8cm;
      }
      .tier-badge {
        display: inline-block;
        padding: 0.2cm 0.4cm;
        border-radius: 0.2cm;
        font-weight: 600;
        font-size: 10pt;
      }
      .lead-card {
        padding: 0.4cm;
        margin-bottom: 0.4cm;
        border: 1px solid #e5e7eb;
        border-radius: 0.2cm;
        background: #ffffff;
        page-break-inside: avoid;
      }
      .lead-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 0.3cm;
      }
      .company-name {
        font-size: 12pt;
        font-weight: 600;
        margin-bottom: 0.1cm;
      }
      .contact-name {
        font-size: 10pt;
        color: #6b7280;
      }
      .fit-score {
        font-size: 14pt;
        font-weight: bold;
      }
      .details-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.3cm;
        font-size: 9pt;
      }
      .detail-item {
        margin-bottom: 0.2cm;
      }
      .detail-label {
        color: #6b7280;
        font-weight: 500;
      }
      .insights {
        margin-top: 0.3cm;
        padding: 0.3cm;
        background: #f9fafb;
        border-radius: 0.2cm;
        font-size: 9pt;
      }
      .insights-list {
        margin: 0;
        padding-left: 0.5cm;
      }
      .footer {
        margin-top: 1cm;
        padding-top: 0.5cm;
        border-top: 1px solid #e5e7eb;
        text-align: center;
        font-size: 9pt;
        color: #6b7280;
      }
    </style>
  `

  const header = `
    <div class="header">
      <h1>${report.name}</h1>
      <div style="color: #6b7280; font-size: 10pt;">
        Generated: ${new Date(report.generatedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </div>
  `

  const statistics = `
    <div class="statistics">
      <div class="stat-card">
        <div class="stat-label">Total Scans</div>
        <div class="stat-value">${report.statistics.totalScans}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Enriched</div>
        <div class="stat-value">${report.statistics.enrichedCount}</div>
        <div style="font-size: 8pt; color: #6b7280;">${report.statistics.enrichmentSuccessRate.toFixed(1)}% success</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Fit Score</div>
        <div class="stat-value">${report.statistics.averageFitScore.toFixed(1)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Top Industry</div>
        <div class="stat-value" style="font-size: 12pt;">${report.statistics.topIndustries[0]?.industry || 'N/A'}</div>
        <div style="font-size: 8pt; color: #6b7280;">${report.statistics.topIndustries[0]?.count || 0} companies</div>
      </div>
    </div>
  `

  const tierSections = tierOrder.map((tier) => {
    const leads = leadsByTier[tier]
    if (leads.length === 0) return ''

    const tierStyle = tierColors[tier]

    const leadsHTML = leads.map(({ scan, enriched, match }) => {
      const fullName = [scan.firstName, scan.lastName].filter(Boolean).join(' ') || 'N/A'
      const fitScore = match?.fitScore?.toFixed(1) || 'N/A'

      return `
        <div class="lead-card">
          <div class="lead-header">
            <div>
              <div class="company-name">${scan.company}</div>
              <div class="contact-name">${fullName}</div>
            </div>
            <div class="fit-score" style="color: ${tierStyle.bg};">${fitScore}</div>
          </div>

          <div class="details-grid">
            ${scan.email ? `<div class="detail-item"><span class="detail-label">Email:</span> ${scan.email}</div>` : ''}
            ${scan.jobTitle ? `<div class="detail-item"><span class="detail-label">Title:</span> ${scan.jobTitle}</div>` : ''}
            ${scan.phone ? `<div class="detail-item"><span class="detail-label">Phone:</span> ${scan.phone}</div>` : ''}
            ${enriched?.industry ? `<div class="detail-item"><span class="detail-label">Industry:</span> ${enriched.industry}</div>` : ''}
            ${enriched?.employeeCount ? `<div class="detail-item"><span class="detail-label">Employees:</span> ${enriched.employeeCount.toLocaleString()}</div>` : ''}
            ${enriched?.revenueRange ? `<div class="detail-item"><span class="detail-label">Revenue:</span> ${enriched.revenueRange}</div>` : ''}
            ${enriched?.headquarters ? `<div class="detail-item"><span class="detail-label">Location:</span> ${enriched.headquarters}</div>` : ''}
            ${enriched?.techStack && enriched.techStack.length > 0 ? `<div class="detail-item" style="grid-column: span 2;"><span class="detail-label">Tech Stack:</span> ${enriched.techStack.join(', ')}</div>` : ''}
          </div>

          ${match?.actionableInsights && match.actionableInsights.length > 0 ? `
            <div class="insights">
              <strong>Actionable Insights:</strong>
              <ul class="insights-list">
                ${match.actionableInsights.map(insight => `<li>${insight}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `
    }).join('')

    return `
      <div class="tier-section">
        <h2 style="background: ${tierStyle.bg}; color: ${tierStyle.text};">
          <span class="tier-badge" style="background: ${tierStyle.bg}; color: ${tierStyle.text}; border: 2px solid ${tierStyle.border};">
            ${tier}
          </span>
          (${leads.length} leads)
        </h2>
        ${leadsHTML}
      </div>
    `
  }).join('')

  const footer = `
    <div class="footer">
      <p>Generated by Trade Show Intelligence Platform</p>
      <p>Report ID: ${report.id}</p>
    </div>
  `

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${report.name}</title>
      ${styles}
    </head>
    <body>
      ${header}
      ${statistics}
      ${tierSections}
      ${footer}
    </body>
    </html>
  `
}

/**
 * Convert HTML to PDF using Puppeteer (server-side only)
 * Note: Requires puppeteer to be installed: npm install puppeteer
 */
export async function generatePDFFromHTML(html: string): Promise<Buffer> {
  // Dynamic import to avoid bundling Puppeteer in client-side code
  const puppeteer = await import('puppeteer')

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '2cm',
        right: '2cm',
        bottom: '2cm',
        left: '2cm',
      },
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

/**
 * Generate PDF report (server-side only)
 */
export async function exportReportToPDF(
  report: Report,
  badgeScans: BadgeScan[],
  enrichedCompanies: Map<string, EnrichedCompany>,
  personaMatches: Map<string, PersonaMatch>
): Promise<Buffer> {
  const html = generateReportHTML(report, badgeScans, enrichedCompanies, personaMatches)
  return generatePDFFromHTML(html)
}

/**
 * Generate PDF filename with timestamp
 */
export function generatePDFFilename(reportName: string): string {
  const sanitized = reportName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `${sanitized}_${timestamp}.pdf`
}

/**
 * Convert markdown to styled HTML
 */
export function markdownToHTML(markdown: string, title: string = 'Report'): string {
  // Use marked library for markdown parsing
  // Dynamic import since marked might be installed
  let htmlContent = markdown

  try {
    // Try to use marked if available
    const { marked } = require('marked')
    htmlContent = marked(markdown)
  } catch (error) {
    // Fallback to basic conversion if marked is not installed
    htmlContent = markdown
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^- (.*?)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
  }

  const styles = `
    <style>
      @page {
        margin: 2cm;
        size: A4;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #1f2937;
        max-width: 100%;
      }
      h1 {
        font-size: 24pt;
        font-weight: bold;
        margin: 1cm 0 0.5cm 0;
        color: #111827;
        page-break-after: avoid;
      }
      h2 {
        font-size: 18pt;
        font-weight: bold;
        margin: 0.8cm 0 0.4cm 0;
        color: #1f2937;
        page-break-after: avoid;
      }
      h3 {
        font-size: 14pt;
        font-weight: 600;
        margin: 0.6cm 0 0.3cm 0;
        color: #374151;
        page-break-after: avoid;
      }
      h4 {
        font-size: 12pt;
        font-weight: 600;
        margin: 0.4cm 0 0.2cm 0;
        color: #4b5563;
      }
      p {
        margin: 0.3cm 0;
      }
      ul, ol {
        margin: 0.3cm 0;
        padding-left: 1cm;
      }
      li {
        margin: 0.2cm 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 0.5cm 0;
      }
      th, td {
        border: 1px solid #e5e7eb;
        padding: 0.3cm;
        text-align: left;
      }
      th {
        background: #f9fafb;
        font-weight: 600;
      }
      code {
        background: #f3f4f6;
        padding: 0.1cm 0.2cm;
        border-radius: 0.1cm;
        font-family: 'Courier New', monospace;
        font-size: 10pt;
      }
      pre {
        background: #f9fafb;
        padding: 0.4cm;
        border-radius: 0.2cm;
        overflow-x: auto;
        border: 1px solid #e5e7eb;
      }
      pre code {
        background: none;
        padding: 0;
      }
      blockquote {
        border-left: 0.1cm solid #e5e7eb;
        padding-left: 0.5cm;
        margin: 0.5cm 0;
        color: #6b7280;
        font-style: italic;
      }
      hr {
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 0.8cm 0;
      }
      .footer {
        margin-top: 2cm;
        padding-top: 0.5cm;
        border-top: 1px solid #e5e7eb;
        font-size: 9pt;
        color: #6b7280;
        text-align: center;
      }
    </style>
  `

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      ${styles}
    </head>
    <body>
      ${htmlContent}
      <div class="footer">
        <p>Generated by Trade Show Intelligence Platform</p>
        <p>${new Date().toLocaleDateString()}</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Convert markdown report to PDF
 */
export async function exportMarkdownToPDF(
  markdownContent: string,
  title: string = 'Report'
): Promise<Buffer> {
  const html = markdownToHTML(markdownContent, title)
  return generatePDFFromHTML(html)
}
