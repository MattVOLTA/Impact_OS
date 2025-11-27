/**
 * Company Logo Upload Component
 *
 * Client Component with hover overlay for uploading/deleting company logos.
 * Shows letter avatar by default, logo when uploaded.
 * Hover reveals upload (no logo) or upload+delete (has logo) actions.
 */

'use client'

import { useState, useRef } from 'react'
import { Upload, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type CompanyWithIndustries } from '@/lib/dal/companies'
import { uploadCompanyLogoAction, deleteCompanyLogoAction } from '../actions'

interface CompanyLogoUploadProps {
  company: CompanyWithIndustries
}

export function CompanyLogoUpload({ company }: CompanyLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate letter avatar
  const getCompanyAvatar = (name: string) => {
    const letter = name.charAt(0).toUpperCase()
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-red-500',
    ]
    const colorIndex = letter.charCodeAt(0) % colors.length
    return (
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-lg ${colors[colorIndex]} text-white text-2xl font-bold`}
      >
        {letter}
      </div>
    )
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadCompanyLogoAction(company.id, formData)

      if (!result.success) {
        setError('error' in result ? result.error || 'Upload failed' : 'Upload failed')
        return
      }

      // Success - page will reload to show new logo
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const result = await deleteCompanyLogoAction(company.id)

      if (!result.success) {
        setError('error' in result ? result.error || 'Delete failed' : 'Delete failed')
        return
      }

      // Success
      setDeleteDialogOpen(false)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete logo')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="relative group h-20 w-20">
        {/* Logo or Letter Avatar */}
        {company.logo_url ? (
          <div className="h-20 w-20 rounded-lg bg-muted/30 flex items-center justify-center p-2 border border-border">
            <img
              src={company.logo_url}
              alt={`${company.business_name} logo`}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          getCompanyAvatar(company.business_name)
        )}

        {/* Hover Overlay */}
        {!isUploading && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
            {!company.logo_url ? (
              // No logo - show upload icon only
              <Button
                size="icon"
                variant="secondary"
                onClick={handleUploadClick}
              >
                <Upload className="h-5 w-5" />
              </Button>
            ) : (
              // Has logo - show upload and delete icons
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleUploadClick}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-24 left-0 text-xs text-red-500 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Logo?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the logo for <strong>{company.business_name}</strong>?
              This will restore the default letter avatar.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Deleting...' : 'Delete Logo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
