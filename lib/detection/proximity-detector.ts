/**
 * FR-031: Proximity detection for badge scans
 * Detects badge scans occurring within 15-second window to identify
 * consultants, joint meeting attendees, or transitioning employees
 */

import { BadgeScan, ProximityGroup } from '../types'
import { v4 as uuidv4 } from 'uuid'

const PROXIMITY_WINDOW_SECONDS = 15

/**
 * Detect proximity groups from a set of badge scans
 * Groups scans that occur within 15 seconds of each other at the same booth
 */
export function detectProximityGroups(badgeScans: BadgeScan[]): ProximityGroup[] {
  // Sort scans by timestamp
  const sorted = [...badgeScans].sort(
    (a, b) => a.scannedAt.getTime() - b.scannedAt.getTime()
  )

  const groups: ProximityGroup[] = []
  const processedScanIds = new Set<string>()

  for (let i = 0; i < sorted.length; i++) {
    const currentScan = sorted[i]

    // Skip if already processed
    if (processedScanIds.has(currentScan.id)) {
      continue
    }

    // Find all scans within proximity window
    const groupScans: BadgeScan[] = [currentScan]
    processedScanIds.add(currentScan.id)

    for (let j = i + 1; j < sorted.length; j++) {
      const candidateScan = sorted[j]

      // Check if within time window
      const timeDiff = Math.abs(
        candidateScan.scannedAt.getTime() - currentScan.scannedAt.getTime()
      )
      const secondsDiff = timeDiff / 1000

      if (secondsDiff > PROXIMITY_WINDOW_SECONDS) {
        break // No more scans in window
      }

      // Check if same booth location and scanner
      const sameLocation =
        currentScan.boothLocation === candidateScan.boothLocation
      const sameScanner =
        currentScan.scannerId && currentScan.scannerId === candidateScan.scannerId

      if (sameLocation && sameScanner && !processedScanIds.has(candidateScan.id)) {
        groupScans.push(candidateScan)
        processedScanIds.add(candidateScan.id)
      }
    }

    // Only create group if 2+ scans found
    if (groupScans.length >= 2) {
      const group = createProximityGroup(groupScans)
      groups.push(group)
    }
  }

  return groups
}

/**
 * Create a proximity group from a set of badge scans
 */
function createProximityGroup(scans: BadgeScan[]): ProximityGroup {
  const groupId = uuidv4()

  // Assign same proximity group ID to all scans
  const badgeScanIds = scans.map((scan) => scan.id)

  // Infer association type based on patterns
  const associationType = inferAssociationType(scans)
  const confidence = calculateConfidence(scans)

  return {
    id: groupId,
    eventId: scans[0].eventId,
    badgeScanIds,
    detectedAt: new Date(),
    timeWindowSeconds: PROXIMITY_WINDOW_SECONDS,
    scannerId: scans[0].scannerId,
    boothLocation: scans[0].boothLocation,
    confidence,
    associationType,
    needsReview: true, // Always require manual review per FR-031
  }
}

/**
 * Infer association type from scan patterns
 */
function inferAssociationType(
  scans: BadgeScan[]
): 'consultant' | 'joint_meeting' | 'transition' | 'unknown' {
  // Check if any scans have same company
  const companies = scans.map((s) => s.company?.toLowerCase()).filter(Boolean)
  const uniqueCompanies = new Set(companies)

  // Same company, multiple people = potential consultant or transition
  if (uniqueCompanies.size === 1 && scans.length >= 2) {
    // Check job titles for senior/junior pattern
    const titles = scans.map((s) => s.jobTitle?.toLowerCase()).filter(Boolean)
    const hasSeniorAndJunior =
      titles.some((t) => t.includes('senior') || t.includes('director')) &&
      titles.some((t) => t.includes('junior') || t.includes('associate'))

    return hasSeniorAndJunior ? 'transition' : 'consultant'
  }

  // Different companies = joint meeting
  if (uniqueCompanies.size > 1) {
    return 'joint_meeting'
  }

  return 'unknown'
}

/**
 * Calculate confidence level for proximity detection
 * Based on time gap, same scanner, same booth
 */
function calculateConfidence(scans: BadgeScan[]): 'LOW' | 'MEDIUM' | 'HIGH' {
  // Calculate max time gap between scans
  const timestamps = scans.map((s) => s.scannedAt.getTime())
  const maxGap = Math.max(...timestamps) - Math.min(...timestamps)
  const secondsGap = maxGap / 1000

  // All scans have same scanner?
  const scannerIds = scans.map((s) => s.scannerId).filter(Boolean)
  const uniqueScanners = new Set(scannerIds)
  const sameScanner = uniqueScanners.size === 1 && scannerIds.length === scans.length

  // Confidence logic
  if (secondsGap <= 5 && sameScanner) {
    return 'MEDIUM' // Close together, same scanner
  } else if (secondsGap <= 10) {
    return 'LOW' // Moderate gap
  } else {
    return 'LOW' // Wider gap, less confident
  }

  // Note: Per FR-031, we always display LOW confidence to encourage manual review
  // The above logic is for future refinement
}

/**
 * Assign proximity group IDs to badge scans
 */
export function assignProximityGroupIds(
  badgeScans: BadgeScan[],
  groups: ProximityGroup[]
): BadgeScan[] {
  const scanToGroupMap = new Map<string, string>()

  // Build scan ID to group ID mapping
  for (const group of groups) {
    for (const scanId of group.badgeScanIds) {
      scanToGroupMap.set(scanId, group.id)
    }
  }

  // Assign group IDs to scans
  return badgeScans.map((scan) => ({
    ...scan,
    proximityGroupId: scanToGroupMap.get(scan.id),
  }))
}
