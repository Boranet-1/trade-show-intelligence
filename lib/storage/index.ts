/**
 * Storage Module Entry Point
 *
 * Provides simplified access to storage adapters
 */

import type { StorageAdapter, StorageAdapterConfiguration } from './adapter'
import { StorageAdapterType } from '@/lib/types'
import {
  createStorageAdapter,
  initializeStorageAdapters,
  getActiveStorageAdapter as getActiveAdapter,
} from './factory'
import { LocalStorageAdapter } from './local-storage'

/**
 * Get storage adapter by type
 * @param type - 'local' or 'sheets'
 * @returns Promise resolving to storage adapter instance
 */
export async function getStorageAdapter(
  type: 'local' | 'sheets' = 'local'
): Promise<StorageAdapter> {
  // Initialize adapters if not already done
  await initializeStorageAdapters()

  if (type === 'local') {
    const config: StorageAdapterConfiguration = {
      id: crypto.randomUUID(),
      adapterType: StorageAdapterType.LOCAL,
      localStorageConfig: {
        dataDirectory: process.env.DATA_DIRECTORY || './data',
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return createStorageAdapter(config)
  }

  // Google Sheets adapter not yet implemented
  if (type === 'sheets') {
    throw new Error('Google Sheets adapter not yet implemented')
  }

  throw new Error(`Unknown storage type: ${type}`)
}

/**
 * Get the active storage adapter from environment configuration
 * @returns Promise resolving to active storage adapter
 */
export async function getActiveStorageAdapter(): Promise<StorageAdapter> {
  await initializeStorageAdapters()
  return getActiveAdapter()
}

/**
 * Get storage (convenience function, alias for getActiveStorageAdapter)
 * @returns Promise resolving to active storage adapter
 */
export async function getStorage(): Promise<StorageAdapter> {
  return getActiveStorageAdapter()
}

// Re-export commonly used types and classes
export { LocalStorageAdapter }
export type { StorageAdapter }
