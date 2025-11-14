'use client'

/**
 * CSV Uploader Component
 *
 * Provides drag-and-drop file upload interface for CSV files.
 * Features:
 * - Drag and drop support
 * - File validation (type, size)
 * - Upload progress tracking
 * - Error display with 3-part format
 * - Integration with /api/upload endpoint
 */

import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { CSVValidationError, CSVUploadPreview } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// Re-export for backward compatibility with dashboard
export type CSVUploadResult = CSVUploadPreview

export interface CSVUploaderProps {
  eventId: string
  eventName: string
  onUploadSuccess: (preview: CSVUploadPreview, file: File) => void
  onUploadError?: (error: CSVValidationError) => void
  maxSizeMB?: number
}

export function CSVUploader({
  eventId,
  eventName,
  onUploadSuccess,
  onUploadError,
  maxSizeMB = 10,
}: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<CSVValidationError | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileSelect = useCallback(
    (file: File) => {
      // Validate file type
      const validExtensions = ['.csv', '.txt']
      const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))

      if (!validExtensions.includes(extension)) {
        setError({
          row: 0,
          field: 'file',
          whatFailed: `Invalid file type: ${extension}`,
          howToFix: 'Upload a CSV file with .csv or .txt extension',
          exampleFormat: 'Valid extensions: .csv, .txt',
        })
        return
      }

      // Validate file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024
      if (file.size > maxSizeBytes) {
        setError({
          row: 0,
          field: 'file',
          whatFailed: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of ${maxSizeMB}MB`,
          howToFix: `Reduce file size to under ${maxSizeMB}MB or split into multiple files`,
          exampleFormat: `Maximum file size: ${maxSizeMB}MB`,
        })
        return
      }

      setSelectedFile(file)
      setError(null)
      setSuccess(false)
    },
    [maxSizeMB]
  )

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [handleFileSelect]
  )

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [handleFileSelect]
  )

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)
    setSuccess(false)

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('eventId', eventId)
      formData.append('eventName', eventName)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 100)

      // Upload file
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorData = result.error || {
          whatFailed: 'Upload failed',
          howToFix: 'Please try again or contact support',
          exampleFormat: '',
        }

        setError({
          row: 0,
          field: 'upload',
          ...errorData,
        })

        if (onUploadError) {
          onUploadError({
            row: 0,
            field: 'upload',
            ...errorData,
          })
        }
        return
      }

      // Success
      setSuccess(true)
      onUploadSuccess(result.data, selectedFile)
    } catch (err) {
      const error: CSVValidationError = {
        row: 0,
        field: 'network',
        whatFailed: 'Network error during upload',
        howToFix: 'Check your internet connection and try again',
        exampleFormat: '',
      }

      setError(error)
      if (onUploadError) {
        onUploadError(error)
      }
    } finally {
      setIsUploading(false)
      setTimeout(() => {
        setUploadProgress(0)
      }, 1000)
    }
  }, [selectedFile, eventId, eventName, onUploadSuccess, onUploadError])

  // Open file picker
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Badge Scan CSV</CardTitle>
        <CardDescription>
          Upload your trade show badge scan data in CSV format. Maximum file size: {maxSizeMB}MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drag and Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            isUploading && 'pointer-events-none opacity-50'
          )}
          onClick={openFilePicker}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isUploading}
          />

          <div className="flex flex-col items-center gap-4">
            {selectedFile ? (
              <>
                <FileText className="h-12 w-12 text-primary" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">Drop your CSV file here, or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports .csv and .txt files up to {maxSizeMB}MB
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Success Message */}
        {success && !isUploading && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              File uploaded successfully! Review the column mappings below.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">{error.whatFailed}</p>
              <p className="text-sm">
                <strong>How to fix:</strong> {error.howToFix}
              </p>
              {error.exampleFormat && (
                <p className="text-sm">
                  <strong>Example:</strong> {error.exampleFormat}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Button */}
        {selectedFile && !success && (
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
            size="lg"
          >
            {isUploading ? 'Uploading...' : 'Upload and Preview Column Mappings'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
