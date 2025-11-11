/**
 * Storage Adapter Factory
 *
 * Creates storage adapter instances based on configuration.
 * Implements factory pattern for pluggable storage architecture.
 */

import type { StorageAdapter, StorageAdapterRegistry, StorageAdapterFactory } from './adapter'
import type { StorageAdapterConfiguration } from '@/lib/types'
import { StorageAdapterType } from '@/lib/types'

/**
 * Storage adapter implementation registry
 * Populated by importing concrete adapter implementations
 */
const registry: Partial<StorageAdapterRegistry> = {}

/**
 * Register a storage adapter factory
 * @param type - Storage adapter type
 * @param factory - Factory function to create adapter instances
 */
export function registerStorageAdapter(
  type: StorageAdapterType,
  factory: StorageAdapterFactory
): void {
  registry[type] = factory
}

/**
 * Create storage adapter instance from configuration
 * @param config - Storage adapter configuration
 * @returns Promise resolving to configured storage adapter
 * @throws Error if adapter type is not registered
 */
export async function createStorageAdapter(
  config: StorageAdapterConfiguration
): Promise<StorageAdapter> {
  const factory = registry[config.adapterType]

  if (!factory) {
    throw new Error(
      `Storage adapter type "${config.adapterType}" is not registered. ` +
      `Available types: ${Object.keys(registry).join(', ')}`
    )
  }

  return factory(config)
}

/**
 * Check if a storage adapter type is registered
 * @param type - Storage adapter type to check
 * @returns True if adapter is registered
 */
export function isAdapterRegistered(type: StorageAdapterType): boolean {
  return type in registry
}

/**
 * Get list of registered adapter types
 * @returns Array of registered storage adapter types
 */
export function getRegisteredAdapterTypes(): StorageAdapterType[] {
  return Object.keys(registry) as StorageAdapterType[]
}

/**
 * Initialize storage adapters by importing implementations
 * This should be called once at application startup
 */
export async function initializeStorageAdapters(): Promise<void> {
  // Dynamically import adapter implementations to register them
  // This avoids circular dependencies and allows lazy loading

  try {
    // Import Local Storage adapter
    const localModule = await import('./local-storage')
    if (localModule.LocalStorageAdapter) {
      registerStorageAdapter(
        StorageAdapterType.LOCAL,
        async (config) => new localModule.LocalStorageAdapter(config)
      )
    }
  } catch (error) {
    console.warn('Local Storage adapter not available:', error)
  }

  // MySQL adapter
  try {
    const mysqlModule = await import('./mysql-adapter')
    if (mysqlModule.MySQLAdapter) {
      registerStorageAdapter(
        StorageAdapterType.MYSQL,
        async (config) => new mysqlModule.MySQLAdapter(config)
      )
    }
  } catch (error) {
    console.warn('MySQL adapter not available:', error)
  }

  // HubSpot adapter will be registered when implemented (Phase 4 / User Story 2)
  // try {
  //   const hubspotModule = await import('./hubspot-adapter')
  //   if (hubspotModule.HubSpotAdapter) {
  //     registerStorageAdapter(
  //       StorageAdapterType.HUBSPOT,
  //       async (config) => new hubspotModule.HubSpotAdapter(config)
  //     )
  //   }
  // } catch (error) {
  //   console.warn('HubSpot adapter not available:', error)
  // }
}

/**
 * Get active storage adapter from environment configuration
 * @returns Promise resolving to active storage adapter instance
 * @throws Error if no active configuration exists or adapter creation fails
 */
export async function getActiveStorageAdapter(): Promise<StorageAdapter> {
  // For now, create a default LOCAL adapter
  // In production, this should:
  // 1. Load active configuration from storage
  // 2. Create adapter based on that configuration

  const defaultConfig: StorageAdapterConfiguration = {
    id: crypto.randomUUID(),
    adapterType: StorageAdapterType.LOCAL,
    localStorageConfig: {
      dataDirectory: process.env.DATA_DIRECTORY || './data',
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return createStorageAdapter(defaultConfig)
}
