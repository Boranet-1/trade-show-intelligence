/**
 * MySQL Adapter Test Script
 *
 * Simple test to verify MySQL adapter functionality.
 * Requires MySQL database to be running with credentials in .env
 */

import { MySQLAdapter } from '../lib/storage/mysql-adapter'
import { StorageAdapterType, EnrichmentStatus } from '../lib/types'
import type { StorageAdapterConfiguration, BadgeScan, Event } from '../lib/types'

async function testMySQLAdapter() {
  console.log('=== MySQL Adapter Test ===\n')

  // Create adapter configuration
  const config: StorageAdapterConfiguration = {
    id: crypto.randomUUID(),
    adapterType: StorageAdapterType.MYSQL,
    mysqlConfig: {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      database: process.env.MYSQL_DATABASE || 'trade_show_intelligence',
      username: process.env.MYSQL_USERNAME || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      connectionPoolSize: 5,
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  console.log(`Connecting to MySQL at ${config.mysqlConfig?.host}:${config.mysqlConfig?.port}`)
  console.log(`Database: ${config.mysqlConfig?.database}\n`)

  const adapter = new MySQLAdapter(config)

  try {
    // Test 1: Test connection
    console.log('Test 1: Testing database connection...')
    const connected = await adapter.testConnection()
    console.log(`✓ Connection ${connected ? 'successful' : 'failed'}\n`)

    // Test 2: Create an event
    console.log('Test 2: Creating test event...')
    const event: Event = {
      id: `event-${Date.now()}`,
      name: 'Test Trade Show 2025',
      startDate: new Date('2025-03-15'),
      endDate: new Date('2025-03-17'),
      location: 'Las Vegas, NV',
      boothNumber: 'A-123',
      createdAt: new Date(),
    }
    const eventId = await adapter.saveEvent(event)
    console.log(`✓ Event created with ID: ${eventId}\n`)

    // Test 3: Retrieve the event
    console.log('Test 3: Retrieving event...')
    const retrievedEvent = await adapter.getEvent(eventId)
    console.log(`✓ Event retrieved: ${retrievedEvent?.name}\n`)

    // Test 4: Create a badge scan
    console.log('Test 4: Creating test badge scan...')
    const badgeScan: BadgeScan = {
      id: `scan-${Date.now()}`,
      eventId: eventId,
      scannedAt: new Date(),
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      company: 'Acme Corp',
      jobTitle: 'VP of Sales',
      phone: '+1-555-123-4567',
      boothLocation: 'A-456',
      eventName: 'Test Trade Show 2025',
      notes: 'Interested in enterprise solutions',
      enrichmentStatus: EnrichmentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const scanId = await adapter.saveBadgeScan(badgeScan)
    console.log(`✓ Badge scan created with ID: ${scanId}\n`)

    // Test 5: Retrieve the badge scan
    console.log('Test 5: Retrieving badge scan...')
    const retrievedScan = await adapter.getBadgeScan(scanId)
    console.log(`✓ Badge scan retrieved: ${retrievedScan?.firstName} ${retrievedScan?.lastName} from ${retrievedScan?.company}\n`)

    // Test 6: Get all badge scans for the event
    console.log('Test 6: Getting all badge scans for event...')
    const allScans = await adapter.getAllBadgeScans(eventId)
    console.log(`✓ Found ${allScans.length} badge scan(s) for this event\n`)

    // Test 7: Update badge scan status
    console.log('Test 7: Updating badge scan status...')
    await adapter.updateBadgeScanStatus(scanId, EnrichmentStatus.PROCESSING)
    const updatedScan = await adapter.getBadgeScan(scanId)
    console.log(`✓ Badge scan status updated to: ${updatedScan?.enrichmentStatus}\n`)

    // Test 8: Get all events
    console.log('Test 8: Getting all events...')
    const allEvents = await adapter.getAllEvents()
    console.log(`✓ Found ${allEvents.length} event(s) in database\n`)

    // Test 9: Export all data
    console.log('Test 9: Exporting all data...')
    const exportedData = await adapter.exportAll()
    console.log(`✓ Exported data:`)
    console.log(`  - Badge Scans: ${exportedData.badgeScans.length}`)
    console.log(`  - Enriched Companies: ${exportedData.enrichedCompanies.length}`)
    console.log(`  - Personas: ${exportedData.personas.length}`)
    console.log(`  - Persona Matches: ${exportedData.personaMatches.length}`)
    console.log(`  - Reports: ${exportedData.reports.length}`)
    console.log(`  - Events: ${exportedData.events.length}`)
    console.log(`  - Source Adapter: ${exportedData.sourceAdapterType}\n`)

    console.log('=== All Tests Passed! ===')

  } catch (error) {
    console.error('\n✗ Test failed:', error)
    throw error
  } finally {
    // Close the adapter connection
    await adapter.close()
    console.log('\nConnection closed')
  }
}

// Run tests
if (require.main === module) {
  testMySQLAdapter()
    .then(() => {
      console.log('\n✓ MySQL Adapter test completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n✗ MySQL Adapter test failed:', error)
      process.exit(1)
    })
}

export { testMySQLAdapter }
