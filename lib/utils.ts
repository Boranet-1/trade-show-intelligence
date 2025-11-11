import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate UUID v4
 * Uses browser crypto API or Node.js crypto module
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Validate email address format
 * @param email - Email address to validate
 * @returns True if email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Normalize domain name
 * - Convert to lowercase
 * - Remove protocol (http://, https://)
 * - Remove path and query parameters
 * - Remove www. prefix
 *
 * @param domain - Domain to normalize
 * @returns Normalized domain (e.g., "example.com")
 */
export function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, '') // Remove protocol
    .replace(/^www\./, '') // Remove www prefix
    .replace(/\/.*$/, '') // Remove path
    .replace(/\?.*$/, '') // Remove query parameters
    .trim()
}

/**
 * Extract domain from email address
 * @param email - Email address
 * @returns Domain portion of email or null if invalid
 */
export function extractDomainFromEmail(email: string): string | null {
  if (!isValidEmail(email)) return null
  const parts = email.split('@')
  return parts.length === 2 ? normalizeDomain(parts[1]) : null
}

/**
 * Format phone number to E.164 format (basic)
 * This is a simple implementation - production should use libphonenumber
 * @param phone - Phone number string
 * @returns Formatted phone or original if cannot format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '')

  // If starts with 1 and is 11 digits (US/Canada), format as +1-XXX-XXX-XXXX
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+${cleaned[0]}-${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }

  // If 10 digits (US/Canada without country code), add +1
  if (cleaned.length === 10) {
    return `+1-${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }

  // Return original if we can't format
  return phone
}

/**
 * Slugify string for use in URLs or IDs
 * @param text - Text to slugify
 * @returns Slugified string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars (except spaces and hyphens)
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Calculate percentage with precision
 * @param value - Numerator
 * @param total - Denominator
 * @param decimals - Number of decimal places (default: 1)
 * @returns Percentage value
 */
export function calculatePercentage(
  value: number,
  total: number,
  decimals: number = 1
): number {
  if (total === 0) return 0
  return Number(((value / total) * 100).toFixed(decimals))
}

/**
 * Format number with thousands separator
 * @param num - Number to format
 * @returns Formatted string (e.g., "1,234,567")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

/**
 * Format currency in USD
 * @param amount - Amount in dollars
 * @param showCents - Whether to show cents (default: false)
 * @returns Formatted currency string (e.g., "$1,234")
 */
export function formatCurrency(amount: number, showCents: boolean = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount)
}

/**
 * Truncate string to specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Deep clone an object (simple implementation)
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Sleep/delay for specified milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Debounce function calls
 * @param func - Function to debounce
 * @param wait - Milliseconds to wait
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}
