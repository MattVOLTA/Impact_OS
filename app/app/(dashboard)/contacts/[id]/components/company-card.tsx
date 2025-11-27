/**
 * Company Card
 *
 * Displays company associated with contact.
 * Mirrors ContactCard pattern from company detail page.
 */

'use client'

import { useState } from 'react'
import { X, Building2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { unlinkContactAction } from '@/app/(dashboard)/contacts/actions'

interface CompanyCardProps {
  company: {
    id: string
    business_name: string
  }
  contactId: string
}

export function CompanyCard({ company, contactId }: CompanyCardProps) {
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)

  const handleUnlink = async () => {
    setIsUnlinking(true)

    try {
      const result = await unlinkContactAction(contactId, company.id)

      if (!result.success) {
        alert('error' in result ? result.error : 'Failed to remove association')
        return
      }

      window.location.reload()
    } catch (err) {
      alert('Failed to remove association')
    } finally {
      setIsUnlinking(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
        <Link
          href={`/companies/${company.id}`}
          className="flex-1 min-w-0 flex items-center gap-3 hover:underline"
        >
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate">{company.business_name}</span>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-8 w-8"
          onClick={() => setUnlinkDialogOpen(true)}
          title="Remove association"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Unlink Confirmation Dialog */}
      <Dialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Association?</DialogTitle>
            <DialogDescription>
              Remove association with <strong>{company.business_name}</strong>? The contact will not be
              deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkDialogOpen(false)} disabled={isUnlinking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnlink} disabled={isUnlinking}>
              {isUnlinking ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
