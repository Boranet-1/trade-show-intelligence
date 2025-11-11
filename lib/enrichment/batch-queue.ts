/**
 * Batch Enrichment Job Queue
 * In-memory job tracking for batch enrichment operations
 *
 * Responsibilities:
 * 1. Track job status and progress for batch enrichment operations
 * 2. Store results as they complete
 * 3. Provide job status queries for progress polling
 * 4. Handle job completion and cleanup
 */

import type { BadgeScan, Persona } from '@/lib/types'
import type { EnrichmentResult } from './orchestrator'

export enum BatchJobStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface BatchJob {
  jobId: string
  eventId: string
  totalItems: number
  processedItems: number
  successfulItems: number
  failedItems: number
  status: BatchJobStatus
  badgeScanIds: string[]
  results: EnrichmentResult[]
  currentItem: string | null
  error: string | null
  createdAt: Date
  startedAt: Date | null
  completedAt: Date | null
}

export interface BatchJobProgress {
  jobId: string
  totalItems: number
  processedItems: number
  successfulItems: number
  failedItems: number
  status: BatchJobStatus
  currentItem: string | null
  percentComplete: number
  error: string | null
}

/**
 * In-memory batch job queue
 * For production, this should be replaced with a persistent queue (Redis, database)
 */
class BatchJobQueue {
  private jobs: Map<string, BatchJob> = new Map()
  private maxJobHistorySize: number = 100

  /**
   * Create a new batch job
   */
  createJob(eventId: string, badgeScanIds: string[]): BatchJob {
    const jobId = this.generateJobId()

    const job: BatchJob = {
      jobId,
      eventId,
      totalItems: badgeScanIds.length,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      status: BatchJobStatus.QUEUED,
      badgeScanIds,
      results: [],
      currentItem: null,
      error: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
    }

    this.jobs.set(jobId, job)
    this.cleanupOldJobs()

    return job
  }

  /**
   * Start processing a job
   */
  startJob(jobId: string): void {
    const job = this.jobs.get(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    job.status = BatchJobStatus.PROCESSING
    job.startedAt = new Date()
    this.jobs.set(jobId, job)
  }

  /**
   * Update job progress
   */
  updateProgress(
    jobId: string,
    currentItem: string,
    result?: EnrichmentResult
  ): void {
    const job = this.jobs.get(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    job.currentItem = currentItem

    if (result) {
      job.results.push(result)
      job.processedItems++

      if (result.status === 'ENRICHED') {
        job.successfulItems++
      } else {
        job.failedItems++
      }
    }

    this.jobs.set(jobId, job)
  }

  /**
   * Mark job as completed
   */
  completeJob(jobId: string, error?: string): void {
    const job = this.jobs.get(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    job.status = error ? BatchJobStatus.FAILED : BatchJobStatus.COMPLETED
    job.completedAt = new Date()
    job.currentItem = null
    job.error = error ?? null

    this.jobs.set(jobId, job)
  }

  /**
   * Get job status
   */
  getJob(jobId: string): BatchJob | null {
    return this.jobs.get(jobId) ?? null
  }

  /**
   * Get job progress summary
   */
  getProgress(jobId: string): BatchJobProgress | null {
    const job = this.jobs.get(jobId)
    if (!job) {
      return null
    }

    return {
      jobId: job.jobId,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      successfulItems: job.successfulItems,
      failedItems: job.failedItems,
      status: job.status,
      currentItem: job.currentItem,
      percentComplete: job.totalItems > 0 ? Math.round((job.processedItems / job.totalItems) * 100) : 0,
      error: job.error,
    }
  }

  /**
   * Get all jobs for an event
   */
  getJobsByEvent(eventId: string): BatchJob[] {
    return Array.from(this.jobs.values()).filter(job => job.eventId === eventId)
  }

  /**
   * Delete a job
   */
  deleteJob(jobId: string): boolean {
    return this.jobs.delete(jobId)
  }

  /**
   * Get all active jobs (queued or processing)
   */
  getActiveJobs(): BatchJob[] {
    return Array.from(this.jobs.values()).filter(
      job => job.status === BatchJobStatus.QUEUED || job.status === BatchJobStatus.PROCESSING
    )
  }

  /**
   * Clean up old completed jobs to prevent memory leaks
   */
  private cleanupOldJobs(): void {
    const completedJobs = Array.from(this.jobs.values())
      .filter(job => job.status === BatchJobStatus.COMPLETED || job.status === BatchJobStatus.FAILED)
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))

    if (completedJobs.length > this.maxJobHistorySize) {
      const jobsToRemove = completedJobs.slice(this.maxJobHistorySize)
      jobsToRemove.forEach(job => this.jobs.delete(job.jobId))
    }
  }

  /**
   * Generate a unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    totalJobs: number
    queuedJobs: number
    processingJobs: number
    completedJobs: number
    failedJobs: number
  } {
    const allJobs = Array.from(this.jobs.values())

    return {
      totalJobs: allJobs.length,
      queuedJobs: allJobs.filter(j => j.status === BatchJobStatus.QUEUED).length,
      processingJobs: allJobs.filter(j => j.status === BatchJobStatus.PROCESSING).length,
      completedJobs: allJobs.filter(j => j.status === BatchJobStatus.COMPLETED).length,
      failedJobs: allJobs.filter(j => j.status === BatchJobStatus.FAILED).length,
    }
  }
}

// Singleton instance for in-memory queue
const batchJobQueue = new BatchJobQueue()

export { batchJobQueue }
export type { BatchJob, BatchJobProgress }
