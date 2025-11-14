/**
 * Report Export Job Queue (FR-027)
 * In-memory job tracking for async report generation
 *
 * Responsibilities:
 * 1. Track job status and progress for report export operations
 * 2. Store generated files as they complete
 * 3. Provide job status queries for progress polling
 * 4. Handle job completion and cleanup
 */

export enum ReportJobStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export type ReportExportFormat = 'csv' | 'pdf' | 'cro_summary' | 'company_reports'

export interface ReportJob {
  jobId: string
  reportId: string
  eventId: string
  format: ReportExportFormat
  totalItems: number
  processedItems: number
  status: ReportJobStatus
  currentItem: string | null
  fileUrl: string | null
  fileSize: number | null
  error: string | null
  createdAt: Date
  startedAt: Date | null
  completedAt: Date | null
}

export interface ReportJobProgress {
  jobId: string
  reportId: string
  format: ReportExportFormat
  totalItems: number
  processedItems: number
  status: ReportJobStatus
  currentItem: string | null
  percentComplete: number
  fileUrl: string | null
  fileSize: number | null
  error: string | null
}

/**
 * In-memory report export job queue
 * For production, this should be replaced with a persistent queue (Redis, database)
 */
class ReportJobQueue {
  private jobs: Map<string, ReportJob> = new Map()
  private maxJobHistorySize: number = 100

  /**
   * Create a new report export job
   */
  createJob(
    reportId: string,
    eventId: string,
    format: ReportExportFormat,
    totalItems: number
  ): ReportJob {
    const jobId = this.generateJobId()

    const job: ReportJob = {
      jobId,
      reportId,
      eventId,
      format,
      totalItems,
      processedItems: 0,
      status: ReportJobStatus.QUEUED,
      currentItem: null,
      fileUrl: null,
      fileSize: null,
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

    job.status = ReportJobStatus.PROCESSING
    job.startedAt = new Date()
    this.jobs.set(jobId, job)
  }

  /**
   * Update job progress
   */
  updateProgress(jobId: string, processedItems: number, currentItem: string): void {
    const job = this.jobs.get(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    job.processedItems = processedItems
    job.currentItem = currentItem

    this.jobs.set(jobId, job)
  }

  /**
   * Mark job as completed
   */
  completeJob(jobId: string, fileUrl?: string, fileSize?: number, error?: string): void {
    const job = this.jobs.get(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    job.status = error ? ReportJobStatus.FAILED : ReportJobStatus.COMPLETED
    job.completedAt = new Date()
    job.currentItem = null
    job.fileUrl = fileUrl ?? null
    job.fileSize = fileSize ?? null
    job.error = error ?? null

    this.jobs.set(jobId, job)
  }

  /**
   * Get job status
   */
  getJob(jobId: string): ReportJob | null {
    return this.jobs.get(jobId) ?? null
  }

  /**
   * Get job progress summary
   */
  getProgress(jobId: string): ReportJobProgress | null {
    const job = this.jobs.get(jobId)
    if (!job) {
      return null
    }

    return {
      jobId: job.jobId,
      reportId: job.reportId,
      format: job.format,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      status: job.status,
      currentItem: job.currentItem,
      percentComplete:
        job.totalItems > 0 ? Math.round((job.processedItems / job.totalItems) * 100) : 0,
      fileUrl: job.fileUrl,
      fileSize: job.fileSize,
      error: job.error,
    }
  }

  /**
   * Get all jobs for a report
   */
  getJobsByReport(reportId: string): ReportJob[] {
    return Array.from(this.jobs.values()).filter((job) => job.reportId === reportId)
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
  getActiveJobs(): ReportJob[] {
    return Array.from(this.jobs.values()).filter(
      (job) => job.status === ReportJobStatus.QUEUED || job.status === ReportJobStatus.PROCESSING
    )
  }

  /**
   * Clean up old completed jobs to prevent memory leaks
   */
  private cleanupOldJobs(): void {
    const completedJobs = Array.from(this.jobs.values())
      .filter(
        (job) => job.status === ReportJobStatus.COMPLETED || job.status === ReportJobStatus.FAILED
      )
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))

    if (completedJobs.length > this.maxJobHistorySize) {
      const jobsToRemove = completedJobs.slice(this.maxJobHistorySize)
      jobsToRemove.forEach((job) => this.jobs.delete(job.jobId))
    }
  }

  /**
   * Generate a unique job ID
   */
  private generateJobId(): string {
    return `report_job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
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
      queuedJobs: allJobs.filter((j) => j.status === ReportJobStatus.QUEUED).length,
      processingJobs: allJobs.filter((j) => j.status === ReportJobStatus.PROCESSING).length,
      completedJobs: allJobs.filter((j) => j.status === ReportJobStatus.COMPLETED).length,
      failedJobs: allJobs.filter((j) => j.status === ReportJobStatus.FAILED).length,
    }
  }
}

// Singleton instance for in-memory queue
const reportJobQueue = new ReportJobQueue()

export { reportJobQueue }
