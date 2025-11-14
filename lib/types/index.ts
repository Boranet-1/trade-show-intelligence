/**
 * Core TypeScript Type Definitions
 * Based on data-model.md entity definitions
 */

// ===== Enumerations =====

export enum EnrichmentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  ENRICHED = 'ENRICHED',
  FAILED = 'FAILED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

export enum LeadTier {
  Hot = 'Hot',
  Warm = 'Warm',
  Cold = 'Cold',
  Unscored = 'Unscored',
}

export enum StorageAdapterType {
  LOCAL = 'LOCAL',
  MYSQL = 'MYSQL',
  HUBSPOT = 'HUBSPOT',
}

export enum FundingStage {
  Bootstrap = 'Bootstrap',
  Seed = 'Seed',
  SeriesA = 'Series A',
  SeriesB = 'Series B',
  SeriesCPlus = 'Series C+',
  Public = 'Public',
  PrivateEquity = 'Private Equity',
  Unknown = 'Unknown',
}

export type EmployeeRange = '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1001-5000' | '5001+'
export type RevenueRange = '<1M' | '1M-10M' | '10M-50M' | '50M-100M' | '100M-500M' | '500M-1B' | '1B+'

// ===== Core Entities =====

export interface BadgeScan {
  id: string
  eventId: string
  scannedAt: Date
  firstName?: string
  lastName?: string
  email?: string
  company: string
  jobTitle?: string
  phone?: string
  boothLocation?: string
  eventName: string
  notes?: string
  customFields?: Record<string, string>
  enrichmentStatus: EnrichmentStatus
  createdAt: Date
  updatedAt: Date
}

export interface EnrichedCompany {
  id: string
  badgeScanId: string
  companyName: string
  domain?: string
  employeeCount?: number
  employeeRange?: EmployeeRange
  industry?: string
  industryCodes?: string[]
  annualRevenue?: number
  revenueRange?: RevenueRange
  techStack?: string[]
  fundingStage?: FundingStage
  totalFunding?: number
  headquarters?: string
  founded?: number
  description?: string
  linkedinUrl?: string
  twitterHandle?: string
  consensusMetadata: Record<string, ConsensusMetadata>
  enrichedAt: Date
  dataSource: string[]
}

export interface ConsensusMetadata {
  fieldName: string
  consensusValue: unknown
  providerResponses: ProviderResponse[]
  agreementLevel: number
  confidence: 'High' | 'Medium' | 'Low'
  needsManualReview: boolean
}

export interface ProviderResponse {
  provider: string
  value: unknown
  confidence?: number
  responseTime: number
}

export interface Persona {
  id: string
  name: string
  description?: string
  isDefault: boolean
  criteria: PersonaCriteria
  weights: PersonaWeights
  createdAt: Date
  updatedAt: Date
  createdBy?: string
}

export interface PersonaCriteria {
  companySizeRange?: { min: number; max: number }
  industries?: string[]
  technologies?: string[]
  revenueRange?: { min: number; max: number }
  geographies?: string[]
  decisionMakerTitles?: string[]
  fundingStages?: FundingStage[]
}

export interface PersonaWeights {
  companySize: number
  industry: number
  technology: number
  revenue: number
  geography: number
  decisionMaker: number
  fundingStage: number
}

export interface PersonaMatch {
  id: string
  badgeScanId: string
  personaId: string
  fitScore: number
  tier: LeadTier
  criteriaMatches: CriteriaMatch[]
  actionableInsights?: string[]
  calculatedAt: Date
}

export interface CriteriaMatch {
  criterionName: string
  matched: boolean
  actualValue: unknown
  targetValue: unknown
  weight: number
  contributionToScore: number
}

export interface Report {
  id: string
  eventId: string
  name: string
  filters?: ReportFilters
  generatedAt: Date
  badgeScanIds: string[]
  statistics: ReportStatistics
  exportedFormats?: ('CSV' | 'PDF' | 'CRO_SUMMARY' | 'COMPANY_REPORTS')[]
}

export interface ReportFilters {
  tiers?: LeadTier[]
  industries?: string[]
  employeeRanges?: EmployeeRange[]
  revenueRanges?: RevenueRange[]
  technologies?: string[]
  personas?: string[]
  searchQuery?: string
}

export interface ReportStatistics {
  totalScans: number
  enrichedCount: number
  hotCount: number
  warmCount: number
  coldCount: number
  unscoredCount: number
  topIndustries: { industry: string; count: number }[]
  averageFitScore: number
  enrichmentSuccessRate: number
}

export interface Event {
  id: string
  name: string
  startDate?: Date
  endDate?: Date
  location?: string
  boothNumber?: string
  createdAt: Date
}

export interface StorageAdapterConfiguration {
  id: string
  adapterType: StorageAdapterType
  localStorageConfig?: LocalStorageConfig
  mysqlConfig?: MySQLConfig
  hubspotConfig?: HubSpotConfig
  isActive: boolean
  lastTestedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface LocalStorageConfig {
  dataDirectory: string
}

export interface MySQLConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  connectionPoolSize?: number
}

export interface HubSpotConfig {
  apiKey: string
  portalId: string
  customPropertyPrefix?: string
}

// ===== Utility Types =====

export interface ExportedData {
  badgeScans: BadgeScan[]
  enrichedCompanies: EnrichedCompany[]
  personas: Persona[]
  personaMatches: PersonaMatch[]
  reports: Report[]
  events: Event[]
  exportedAt: Date
  sourceAdapterType: StorageAdapterType
}

export interface EnrichmentJob {
  id: string
  eventId: string
  badgeScanIds: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  totalScans: number
  processedScans: number
  createdAt: Date
  completedAt?: Date
  error?: string
}

export interface CSVValidationError {
  row: number
  field: string
  whatFailed: string
  howToFix: string
  exampleFormat: string
}

// ===== API Response Types =====

// ===== API Response Types (3-part error format) =====

export interface APISuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
}

export interface APIErrorResponse {
  success: false
  error: {
    whatFailed: string
    howToFix: string
    exampleFormat?: string
    details?: unknown
  }
}

export type APIResponse<T = unknown> = APISuccessResponse<T> | APIErrorResponse

// Legacy type for compatibility
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: unknown
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ===== CSV Processing Types =====

export interface ColumnMapping {
  csvColumn: string
  targetField: keyof BadgeScan | 'customField'
  confidence: 'exact' | 'fuzzy' | 'position'
}

// Upload result for mapping preview (before confirmation)
export interface CSVUploadPreview {
  success: boolean
  headers: string[]
  sampleRows: Record<string, string>[]
  detectedMappings: ColumnMapping[]
  unmappedColumns: string[]
  confidence: 'high' | 'medium' | 'low'
  totalRows: number
  errors: CSVValidationError[]
}

// Final upload result after mapping confirmation
export interface CSVUploadResult {
  success: boolean
  scansImported: number
  scanIds: string[]
  eventId: string
  errors: CSVValidationError[]
  columnMappings: ColumnMapping[]
  duplicates?: Array<{
    newScanEmail: string
    duplicateCount: number
    existingScanIds: string[]
  }>
}

// ===== LLM and Enrichment Types =====

export type LLMProvider = 'Claude' | 'GPT-4' | 'Gemini' | 'Perplexity'

export interface EnrichmentResult {
  badgeScanId: string
  enrichedCompany?: EnrichedCompany
  personaMatches: PersonaMatch[]
  errors?: string[]
}

// ===== Export Format Types =====

export type ExportFormat = 'CSV' | 'PDF' | 'CRO_summary' | 'company_reports'

export interface CROSummary {
  executiveSummary: string
  topHotLeads: Array<{
    company: string
    contact: string
    fitScore: number
    keyInsights: string[]
  }>
  followUpPriorities: {
    hot: string[]
    warm: string[]
    cold: string[]
  }
}

export interface CompanyReport {
  companyProfile: {
    name: string
    domain?: string
    industry?: string
    employeeCount?: number
    revenue?: number
    headquarters?: string
  }
  personaMatchAnalysis: {
    fitScore: number
    tier: LeadTier
    criteriaBreakdown: CriteriaMatch[]
  }
  actionableInsights: {
    painPoints: string[]
    conversationStarters: string[]
  }
  tierJustification: string
}
