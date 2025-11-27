/**
 * Contact Photo Upload Component
 *
 * Client Component with hover overlay for uploading/deleting contact photos.
 * Same pattern as CompanyLogoUpload.
 */

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
import { type Contact } from '@/lib/dal/contacts'
import { uploadContactPhotoAction, deleteContactPhotoAction } from '../actions'

interface ContactPhotoUploadProps {
  contact: Contact
}

export function ContactPhotoUpload({ contact }: ContactPhotoUploadProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate letter avatar
  const getContactAvatar = () => {
    const initials = `${contact.first_name.charAt(0)}${contact.last_name.charAt(0)}`.toUpperCase()
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-red-500',
    ]
    const colorIndex = (contact.first_name.charCodeAt(0) + contact.last_name.charCodeAt(0)) % colors.length
    return (
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-lg ${colors[colorIndex]} text-white text-xl font-bold`}
      >
        {initials}
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

      const result = await uploadContactPhotoAction(contact.id, formData)

      if (!result.success) {
        setError('error' in result ? result.error || 'Upload failed' : 'Upload failed')
        return
      }

      // Success - reload page
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const result = await deleteContactPhotoAction(contact.id)

      if (!result.success) {
        setError('error' in result ? result.error || 'Delete failed' : 'Delete failed')
        return
      }

      setDeleteDialogOpen(false)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="relative group h-20 w-20">
        {/* Photo or Letter Avatar */}
        {contact.photo_url ? (
          <div className="h-20 w-20 rounded-lg bg-muted/30 flex items-center justify-center p-2 border border-border">
            <img
              src={contact.photo_url}
              alt={`${contact.first_name} ${contact.last_name}`}
              className="max-h-full max-w-full object-contain rounded"
            />
          </div>
        ) : (
          getContactAvatar()
        )}

        {/* Hover Overlay */}
        {!isUploading && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
            {!contact.photo_url ? (
              <Button size="icon" variant="secondary" onClick={handleUploadClick}>
                <Upload className="h-5 w-5" />
              </Button>
            ) : (
              <>
                <Button size="icon" variant="secondary" onClick={handleUploadClick}>
                  <Upload className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
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
            <DialogTitle>Delete Photo?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the photo for{' '}
              <strong>
                {contact.first_name} {contact.last_name}
              </strong>
              ? This will restore the default avatar.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Deleting...' : 'Delete Photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
