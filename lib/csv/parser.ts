/**
 * CSV Parser Utility
 *
 * Parses CSV files using papaparse with error handling and 3-part error message format.
 * Validates data and provides structured error reporting per FR-014.
 */

import Papa from 'papaparse'
import type { BadgeScan, CSVValidationError } from '@/lib/types'
import { EnrichmentStatus } from '@/lib/types'
import { CSVValidationErrorFormatter } from '@/lib/errors'
import { isValidEmail, generateId } from '@/lib/utils'

export interface CSVParseResult {
  success: boolean
  data: BadgeScan[]
  errors: CSVValidationError[]
  totalRows: number
  validRows: number
  headers: string[]
}

export interface CSVParseOptions {
  eventId: string
  eventName: string
  skipEmptyLines?: boolean
  maxRows?: number
}

/**
 * Parse CSV file and convert to BadgeScan entities
 * @param file - CSV file content as string
 * @param options - Parse options
 * @returns Parse result with data and errors
 */
export function parseCSV(file: string, options: CSVParseOptions): CSVParseResult {
  const errors: CSVValidationError[] = []
  const scans: BadgeScan[] = []

  // Parse CSV with papaparse
  const parseResult = Papa.parse<Record<string, string>>(file, {
    header: true,
    skipEmptyLines: options.skipEmptyLines ?? true,
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => value.trim(),
  })

  // Check for parsing errors
  if (parseResult.errors.length > 0) {
    for (const error of parseResult.errors) {
      errors.push({
        row: error.row ?? 0,
        field: 'CSV',
        whatFailed: `CSV parsing error: ${error.message}`,
        howToFix: 'Ensure the CSV file is properly formatted with consistent columns',
        exampleFormat: 'Use standard CSV format with quoted fields containing commas',
      })
    }
  }

  const headers = parseResult.meta.fields || []
  const rows = parseResult.data

  // Validate and convert each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNumber = i + 2 // +2 because: 0-indexed + 1 for header row + 1 for 1-indexed display

    // Apply max rows limit if specified
    if (options.maxRows && scans.length >= options.maxRows) {
      break
    }

    // Validate row
    const rowErrors = validateRow(row, rowNumber, headers)
    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      continue // Skip invalid rows
    }

    // Convert to BadgeScan
    try {
      const scan = convertRowToBadgeScan(row, options)
      scans.push(scan)
    } catch (error) {
      errors.push({
        row: rowNumber,
        field: 'conversion',
        whatFailed: `Failed to convert row to badge scan: ${error}`,
        howToFix: 'Verify all required fields are present and in correct format',
        exampleFormat: 'See CSV template for correct format',
      })
    }
  }

  return {
    success: errors.length === 0 || scans.length > 0,
    data: scans,
    errors,
    totalRows: rows.length,
    validRows: scans.length,
    headers,
  }
}

/**
 * Validate a single CSV row
 * @param row - Row data
 * @param rowNumber - Row number (1-indexed)
 * @param headers - CSV headers
 * @returns Array of validation errors
 */
function validateRow(
  row: Record<string, string>,
  rowNumber: number,
  headers: string[]
): CSVValidationError[] {
  const errors: CSVValidationError[] = []

  // Check if row is completely empty
  const hasAnyData = Object.values(row).some((value) => value && value.trim().length > 0)
  if (!hasAnyData) {
    return [] // Skip empty rows silently
  }

  // Validate required fields (at least company name)
  if (!row.company && !row.Company && !row.COMPANY) {
    errors.push(CSVValidationErrorFormatter.missingRequiredField(rowNumber, 'company'))
  }

  // Validate email if present
  const emailField = row.email || row.Email || row.EMAIL || row['E-mail'] || row['Email Address']
  if (emailField && !isValidEmail(emailField)) {
    errors.push(CSVValidationErrorFormatter.invalidEmail(rowNumber, 'email', emailField))
  }

  // Validate at least name or email is present
  const hasFirstName = row.firstName || row['First Name'] || row.firstname || row.FirstName
  const hasLastName = row.lastName || row['Last Name'] || row.lastname || row.LastName
  const hasEmail = emailField

  if (!hasFirstName && !hasLastName && !hasEmail) {
    errors.push({
      row: rowNumber,
      field: 'contact',
      whatFailed: 'Missing contact information - need at least name (first/last) or email',
      howToFix: 'Provide firstName, lastName, or email for each contact',
      exampleFormat: 'firstName: "John", lastName: "Doe" OR email: "john.doe@company.com"',
    })
  }

  // Validate scanned date if present
  const scannedAtField = row.scannedAt || row['Scanned At'] || row.timestamp || row.Timestamp
  if (scannedAtField) {
    const date = new Date(scannedAtField)
    if (isNaN(date.getTime())) {
      errors.push(CSVValidationErrorFormatter.invalidDate(rowNumber, 'scannedAt', scannedAtField))
    }
  }

  return errors
}

/**
 * Convert CSV row to BadgeScan entity
 * @param row - Row data
 * @param options - Parse options
 * @returns BadgeScan entity
 */
function convertRowToBadgeScan(
  row: Record<string, string>,
  options: CSVParseOptions
): BadgeScan {
  const now = new Date()

  // Extract fields with multiple possible column names
  const firstName = row.firstName || row['First Name'] || row.firstname || row.FirstName || undefined
  const lastName = row.lastName || row['Last Name'] || row.lastname || row.LastName || undefined
  const email = row.email || row.Email || row.EMAIL || row['E-mail'] || row['Email Address'] || undefined
  const company = row.company || row.Company || row.COMPANY || row['Company Name']
  const jobTitle = row.jobTitle || row['Job Title'] || row.title || row.Title || undefined
  const phone = row.phone || row.Phone || row.PHONE || row['Phone Number'] || undefined
  const boothLocation = row.boothLocation || row['Booth Location'] || row.booth || row.Booth || undefined
  const notes = row.notes || row.Notes || row.comments || row.Comments || undefined

  // Parse scanned date
  const scannedAtField = row.scannedAt || row['Scanned At'] || row.timestamp || row.Timestamp
  let scannedAt: Date
  if (scannedAtField) {
    scannedAt = new Date(scannedAtField)
    if (isNaN(scannedAt.getTime())) {
      scannedAt = now // Fallback to current time if invalid
    }
  } else {
    scannedAt = now
  }

  // Collect custom fields (any fields not mapped to standard fields)
  const standardFields = new Set([
    'firstName', 'First Name', 'firstname', 'FirstName',
    'lastName', 'Last Name', 'lastname', 'LastName',
    'email', 'Email', 'EMAIL', 'E-mail', 'Email Address',
    'company', 'Company', 'COMPANY', 'Company Name',
    'jobTitle', 'Job Title', 'title', 'Title',
    'phone', 'Phone', 'PHONE', 'Phone Number',
    'boothLocation', 'Booth Location', 'booth', 'Booth',
    'notes', 'Notes', 'comments', 'Comments',
    'scannedAt', 'Scanned At', 'timestamp', 'Timestamp',
  ])

  const customFields: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    if (!standardFields.has(key) && value && value.trim().length > 0) {
      customFields[key] = value
    }
  }

  return {
    id: generateId(),
    eventId: options.eventId,
    scannedAt,
    firstName,
    lastName,
    email,
    company,
    jobTitle,
    phone,
    boothLocation,
    eventName: options.eventName,
    notes,
    customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    enrichmentStatus: EnrichmentStatus.PENDING,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Detect CSV delimiter
 * @param csvContent - CSV file content
 * @returns Detected delimiter
 */
export function detectDelimiter(csvContent: string): string {
  const firstLine = csvContent.split('\n')[0]
  const delimiters = [',', ';', '\t', '|']

  let maxCount = 0
  let detectedDelimiter = ','

  for (const delimiter of delimiters) {
    const count = (firstLine.match(new RegExp(delimiter, 'g')) || []).length
    if (count > maxCount) {
      maxCount = count
      detectedDelimiter = delimiter
    }
  }

  return detectedDelimiter
}

/**
 * Validate CSV file size
 * @param fileSize - File size in bytes
 * @param maxSizeMB - Maximum size in MB (default: 10)
 * @returns Validation error or null
 */
export function validateFileSize(
  fileSize: number,
  maxSizeMB: number = 10
): CSVValidationError | null {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (fileSize > maxSizeBytes) {
    return {
      row: 0,
      field: 'file',
      whatFailed: `File size ${(fileSize / 1024 / 1024).toFixed(2)}MB exceeds maximum of ${maxSizeMB}MB`,
      howToFix: `Reduce file size to under ${maxSizeMB}MB or split into multiple files`,
      exampleFormat: 'Maximum file size: 10MB',
    }
  }
  return null
}

/**
 * Validate CSV file type
 * @param fileName - File name
 * @returns Validation error or null
 */
export function validateFileType(fileName: string): CSVValidationError | null {
  const validExtensions = ['.csv', '.txt']
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'))

  if (!validExtensions.includes(extension)) {
    return {
      row: 0,
      field: 'file',
      whatFailed: `Invalid file type: ${extension}`,
      howToFix: 'Upload a CSV file with .csv or .txt extension',
      exampleFormat: 'Valid extensions: .csv, .txt',
    }
  }
  return null
}

/**
 * Parse CSV from File object (browser)
 * @param file - File object
 * @param options - Parse options
 * @returns Promise resolving to parse result
 */
export async function parseCSVFile(
  file: File,
  options: CSVParseOptions
): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    // Validate file
    const fileTypeError = validateFileType(file.name)
    if (fileTypeError) {
      return resolve({
        success: false,
        data: [],
        errors: [fileTypeError],
        totalRows: 0,
        validRows: 0,
        headers: [],
      })
    }

    const fileSizeError = validateFileSize(file.size)
    if (fileSizeError) {
      return resolve({
        success: false,
        data: [],
        errors: [fileSizeError],
        totalRows: 0,
        validRows: 0,
        headers: [],
      })
    }

    // Read file content
    const reader = new FileReader()

    reader.onload = (event) => {
      const content = event.target?.result as string
      if (!content) {
        return reject(new Error('Failed to read file content'))
      }

      const result = parseCSV(content, options)
      resolve(result)
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}
