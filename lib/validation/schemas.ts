/**
 * Zod Validation Schemas for Trade Show Intelligence Platform
 *
 * All entities have corresponding Zod schemas for runtime validation.
 * Includes CSV error validation schema with 3-part structure per FR-014.
 */

import { z } from 'zod'
import {
  EnrichmentStatus,
  LeadTier,
  StorageAdapterType,
  FundingStage,
  CSVValidationError,
} from '@/lib/types'

// ===== Enum Schemas =====

export const EnrichmentStatusSchema = z.nativeEnum(EnrichmentStatus)

export const LeadTierSchema = z.enum(['Hot', 'Warm', 'Cold', 'Unscored'])

export const StorageAdapterTypeSchema = z.nativeEnum(StorageAdapterType)

export const FundingStageSchema = z.nativeEnum(FundingStage)

export const EmployeeRangeSchema = z.enum([
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5001+',
])

export const RevenueRangeSchema = z.enum([
  '<1M',
  '1M-10M',
  '10M-50M',
  '50M-100M',
  '100M-500M',
  '500M-1B',
  '1B+',
])

export const ConsensusConfidenceSchema = z.enum(['High', 'Medium', 'Low'])

// ===== Core Entity Schemas =====

export const BadgeScanSchema = z
  .object({
    id: z.string().uuid(),
    eventId: z.string().min(1),
    scannedAt: z.coerce.date(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    email: z.string().email().optional(),
    company: z.string().max(200),
    jobTitle: z.string().max(150).optional(),
    phone: z.string().optional(),
    boothLocation: z.string().max(50).optional(),
    eventName: z.string().max(200),
    notes: z.string().max(1000).optional(),
    customFields: z.record(z.string(), z.string()).optional(),
    enrichmentStatus: EnrichmentStatusSchema,
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .refine((data) => (data.firstName || data.lastName) || data.email, {
    message: 'Must provide name (firstName or lastName) or email address',
  })

export const ProviderResponseSchema = z.object({
  provider: z.string(),
  value: z.unknown(),
  confidence: z.number().optional(),
  responseTime: z.number(),
})

export const ConsensusMetadataSchema = z.object({
  fieldName: z.string(),
  consensusValue: z.unknown(),
  providerResponses: z.array(ProviderResponseSchema),
  agreementLevel: z.number().min(0).max(100),
  confidence: ConsensusConfidenceSchema,
  needsManualReview: z.boolean(),
})

export const EnrichedCompanySchema = z.object({
  id: z.string().uuid(),
  badgeScanId: z.string().uuid(),
  companyName: z.string().max(200),
  domain: z.string().optional(),
  employeeCount: z.number().int().min(1).max(10000000).optional(),
  employeeRange: EmployeeRangeSchema.optional(),
  industry: z.string().max(100).optional(),
  industryCodes: z.array(z.string()).optional(),
  annualRevenue: z.number().min(0).max(1000000000000).optional(),
  revenueRange: RevenueRangeSchema.optional(),
  techStack: z.array(z.string()).max(50).optional(),
  fundingStage: FundingStageSchema.optional(),
  totalFunding: z.number().min(0).max(100000000000).optional(),
  headquarters: z.string().max(200).optional(),
  founded: z.number().int().min(1800).max(2100).optional(),
  description: z.string().max(500).optional(),
  linkedinUrl: z.string().url().optional(),
  twitterHandle: z.string().max(50).optional(),
  consensusMetadata: z.record(z.string(), ConsensusMetadataSchema),
  enrichedAt: z.coerce.date(),
  dataSource: z.array(z.string()).min(1),
})

export const PersonaCriteriaSchema = z.object({
  companySizeRange: z.object({
    min: z.number().int().min(1),
    max: z.number().int().min(1),
  }).refine(data => data.max >= data.min, {
    message: 'Company size max must be >= min',
  }).optional(),
  industries: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional(),
  revenueRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }).refine(data => data.max >= data.min, {
    message: 'Revenue range max must be >= min',
  }).optional(),
  geographies: z.array(z.string()).optional(),
  decisionMakerTitles: z.array(z.string()).optional(),
  fundingStages: z.array(FundingStageSchema).optional(),
})

export const PersonaWeightsSchema = z.object({
  companySize: z.number().min(0).max(1),
  industry: z.number().min(0).max(1),
  technology: z.number().min(0).max(1),
  revenue: z.number().min(0).max(1),
  geography: z.number().min(0).max(1),
  decisionMaker: z.number().min(0).max(1),
  fundingStage: z.number().min(0).max(1),
}).refine(
  (weights) => {
    const sum = Object.values(weights).reduce((acc, w) => acc + w, 0)
    return Math.abs(sum - 1.0) < 0.001
  },
  {
    message: 'All persona weights must sum to 1.0 (100%)',
  }
)

export const PersonaSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean(),
  criteria: PersonaCriteriaSchema,
  weights: PersonaWeightsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().optional(),
}).refine(
  (persona) => {
    const hasCriteria = Object.values(persona.criteria).some(
      (value) => value !== undefined
    )
    return hasCriteria
  },
  {
    message: 'At least one criterion must be defined in persona',
  }
)

export const CriteriaMatchSchema = z.object({
  criterionName: z.string(),
  matched: z.boolean(),
  actualValue: z.unknown(),
  targetValue: z.unknown(),
  weight: z.number().min(0).max(1),
  contributionToScore: z.number().min(0).max(100),
})

export const PersonaMatchSchema = z.object({
  id: z.string().uuid(),
  badgeScanId: z.string().uuid(),
  personaId: z.string().uuid(),
  fitScore: z.number().min(0).max(100),
  tier: LeadTierSchema,
  criteriaMatches: z.array(CriteriaMatchSchema),
  actionableInsights: z.array(z.string()).max(10).optional(),
  calculatedAt: z.coerce.date(),
}).refine(
  (match) => {
    if (match.tier === 'Hot') return match.fitScore >= 70
    if (match.tier === 'Warm') return match.fitScore >= 40 && match.fitScore < 70
    if (match.tier === 'Cold') return match.fitScore < 40
    return true
  },
  {
    message: 'Tier must align with fitScore thresholds',
  }
)

export const ReportFiltersSchema = z.object({
  tiers: z.array(LeadTierSchema).optional(),
  industries: z.array(z.string()).optional(),
  employeeRanges: z.array(EmployeeRangeSchema).optional(),
  revenueRanges: z.array(RevenueRangeSchema).optional(),
  technologies: z.array(z.string()).optional(),
  personas: z.array(z.string()).optional(),
  searchQuery: z.string().optional(),
})

export const ReportStatisticsSchema = z.object({
  totalScans: z.number().int().min(0),
  enrichedCount: z.number().int().min(0),
  hotCount: z.number().int().min(0),
  warmCount: z.number().int().min(0),
  coldCount: z.number().int().min(0),
  unscoredCount: z.number().int().min(0),
  topIndustries: z.array(
    z.object({
      industry: z.string(),
      count: z.number().int().min(0),
    })
  ),
  averageFitScore: z.number().min(0).max(100),
  enrichmentSuccessRate: z.number().min(0).max(100),
})

export const ReportSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string(),
  name: z.string().max(200),
  filters: ReportFiltersSchema.optional(),
  generatedAt: z.coerce.date(),
  badgeScanIds: z.array(z.string().uuid()),
  statistics: ReportStatisticsSchema,
  exportedFormats: z.array(z.enum(['CSV', 'PDF', 'CRO_SUMMARY', 'COMPANY_REPORTS'])).optional(),
})

export const EventSchema = z.object({
  id: z.string(),
  name: z.string().max(200),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  location: z.string().max(200).optional(),
  boothNumber: z.string().max(50).optional(),
  createdAt: z.coerce.date(),
}).refine(
  (event) => {
    if (event.startDate && event.endDate) {
      return event.endDate >= event.startDate
    }
    return true
  },
  {
    message: 'Event endDate must be >= startDate',
  }
)

export const LocalStorageConfigSchema = z.object({
  dataDirectory: z.string(),
})

export const MySQLConfigSchema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  connectionPoolSize: z.number().int().min(1).max(100).optional(),
})

export const HubSpotConfigSchema = z.object({
  apiKey: z.string(),
  portalId: z.string(),
  customPropertyPrefix: z.string().optional(),
})

export const StorageAdapterConfigurationSchema = z.object({
  id: z.string().uuid(),
  adapterType: StorageAdapterTypeSchema,
  localStorageConfig: LocalStorageConfigSchema.optional(),
  mysqlConfig: MySQLConfigSchema.optional(),
  hubspotConfig: HubSpotConfigSchema.optional(),
  isActive: z.boolean(),
  lastTestedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
}).refine(
  (config) => {
    if (config.adapterType === StorageAdapterType.LOCAL) {
      return config.localStorageConfig !== undefined
    }
    if (config.adapterType === StorageAdapterType.MYSQL) {
      return config.mysqlConfig !== undefined
    }
    if (config.adapterType === StorageAdapterType.HUBSPOT) {
      return config.hubspotConfig !== undefined
    }
    return false
  },
  {
    message: 'Configuration object must match adapterType',
  }
)

export const ExportedDataSchema = z.object({
  badgeScans: z.array(BadgeScanSchema),
  enrichedCompanies: z.array(EnrichedCompanySchema),
  personas: z.array(PersonaSchema),
  personaMatches: z.array(PersonaMatchSchema),
  reports: z.array(ReportSchema),
  events: z.array(EventSchema),
  exportedAt: z.coerce.date(),
  sourceAdapterType: StorageAdapterTypeSchema,
})

// ===== CSV Validation Error Schema (3-part format per FR-014) =====

export const CSVValidationErrorSchema = z.object({
  row: z.number().int().min(1),
  field: z.string(),
  whatFailed: z.string(),
  howToFix: z.string(),
  exampleFormat: z.string(),
})

export const ColumnMappingSchema = z.object({
  csvColumn: z.string(),
  targetField: z.string(),
  confidence: z.enum(['exact', 'fuzzy', 'position']),
})

export const CSVUploadResultSchema = z.object({
  success: z.boolean(),
  scansImported: z.number().int().min(0),
  errors: z.array(CSVValidationErrorSchema),
  columnMappings: z.array(ColumnMappingSchema),
})

// ===== API Response Schemas (3-part error format) =====

export const APISuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  message: z.string().optional(),
})

export const APIErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    whatFailed: z.string(),
    howToFix: z.string(),
    exampleFormat: z.string().optional(),
    details: z.unknown().optional(),
  }),
})

export const APIResponseSchema = z.union([
  APISuccessResponseSchema,
  APIErrorResponseSchema,
])

// ===== Enrichment Schemas =====

export const LLMProviderSchema = z.enum(['Claude', 'GPT-4', 'Gemini', 'Perplexity'])

export const EnrichmentJobSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string(),
  badgeScanIds: z.array(z.string().uuid()),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  totalScans: z.number().int().min(0),
  processedScans: z.number().int().min(0),
  createdAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
  error: z.string().optional(),
})

export const EnrichmentResultSchema = z.object({
  badgeScanId: z.string().uuid(),
  enrichedCompany: EnrichedCompanySchema.optional(),
  personaMatches: z.array(PersonaMatchSchema),
  errors: z.array(z.string()).optional(),
})

// ===== Export Format Schemas =====

export const ExportFormatSchema = z.enum(['CSV', 'PDF', 'CRO_summary', 'company_reports'])

export const CROSummarySchema = z.object({
  executiveSummary: z.string(),
  topHotLeads: z.array(
    z.object({
      company: z.string(),
      contact: z.string(),
      fitScore: z.number().min(0).max(100),
      keyInsights: z.array(z.string()),
    })
  ),
  followUpPriorities: z.object({
    hot: z.array(z.string()),
    warm: z.array(z.string()),
    cold: z.array(z.string()),
  }),
})

export const CompanyReportSchema = z.object({
  companyProfile: z.object({
    name: z.string(),
    domain: z.string().optional(),
    industry: z.string().optional(),
    employeeCount: z.number().int().optional(),
    revenue: z.number().optional(),
    headquarters: z.string().optional(),
  }),
  personaMatchAnalysis: z.object({
    fitScore: z.number().min(0).max(100),
    tier: LeadTierSchema,
    criteriaBreakdown: z.array(CriteriaMatchSchema),
  }),
  actionableInsights: z.object({
    painPoints: z.array(z.string()),
    conversationStarters: z.array(z.string()),
  }),
  tierJustification: z.string(),
})

// ===== Helper Functions =====

/**
 * Validate data against schema and return typed result
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: z.ZodIssue[]
} {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error.issues }
}

/**
 * Format Zod validation errors into 3-part CSV error format
 */
export function formatZodErrorsAsCSVErrors(
  errors: z.ZodIssue[],
  row: number
): CSVValidationError[] {
  return errors.map((error) => ({
    row,
    field: error.path.join('.'),
    whatFailed: error.message,
    howToFix: getFixSuggestion(error),
    exampleFormat: getExampleFormat(error),
  }))
}

function getFixSuggestion(error: z.ZodIssue): string {
  switch (error.code) {
    case 'invalid_type':
      return `Provide a valid ${(error as any).expected} value`
    case 'too_small':
      if ((error as any).type === 'string') {
        return `Provide at least ${(error as any).minimum} characters`
      }
      return `Provide a value >= ${(error as any).minimum}`
    case 'too_big':
      if ((error as any).type === 'string') {
        return `Reduce to maximum ${(error as any).maximum} characters`
      }
      return `Provide a value <= ${(error as any).maximum}`
    default:
      // Handle validation-specific errors
      if (error.message.includes('email')) {
        return 'Provide a valid email address (e.g., user@example.com)'
      }
      if (error.message.includes('url') || error.message.includes('URL')) {
        return 'Provide a valid URL (e.g., https://example.com)'
      }
      return 'Check the value and try again'
  }
}

function getExampleFormat(error: z.ZodIssue): string {
  const field = error.path[error.path.length - 1]

  switch (field) {
    case 'email':
      return 'john.doe@company.com'
    case 'phone':
      return '+1-555-123-4567'
    case 'scannedAt':
    case 'createdAt':
    case 'updatedAt':
      return '2025-11-09T10:30:00Z'
    case 'company':
      return 'Acme Corporation'
    case 'firstName':
      return 'John'
    case 'lastName':
      return 'Doe'
    case 'jobTitle':
      return 'VP of Engineering'
    default:
      return 'See documentation for correct format'
  }
}
