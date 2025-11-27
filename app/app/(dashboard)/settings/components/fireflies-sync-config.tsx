/**
 * Fireflies Sync Configuration Component (Simplified)
 *
 * Displays sync status and manual trigger.
 * No filtering - ALL meetings go to queue for user review.
 */

'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, RefreshCw, List, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { updateFirefliesSyncDates, triggerManualSync, getPendingMeetings } from '../actions'
import type { FirefliesSyncConfig } from '@/lib/dal/settings'

interface FirefliesSyncConfigProps {
  config: FirefliesSyncConfig
  isAdmin: boolean
}

export function FirefliesSyncConfig({ config, isAdmin }: FirefliesSyncConfigProps) {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)
  const [queueCount, setQueueCount] = useState<number>(0)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Parse date string in local timezone (avoid UTC conversion)
  const parseDateString = (dateString: string | null): Date | undefined => {
    if (!dateString) return undefined
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day) // month is 0-indexed
  }

  // Form state
  const [syncStartDate, setSyncStartDate] = useState<Date | undefined>(
    parseDateString(config.syncStartDate)
  )

  // Fetch queue count on mount
  useEffect(() => {
    async function fetchQueueCount() {
      try {
        const meetings = await getPendingMeetings()
        setQueueCount(meetings.length)
      } catch (error) {
        console.error('Failed to fetch queue count:', error)
      }
    }
    fetchQueueCount()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Format date in local timezone (avoid UTC conversion issues)
      let formattedDate: string | null = null
      if (syncStartDate) {
        const year = syncStartDate.getFullYear()
        const month = String(syncStartDate.getMonth() + 1).padStart(2, '0')
        const day = String(syncStartDate.getDate()).padStart(2, '0')
        formattedDate = `${year}-${month}-${day}`
      }

      const result = await updateFirefliesSyncDates({
        syncStartDate: formattedDate
      })

      if (result.success) {
        toast.success(result.message)
        setIsEditing(false)
        // Force full page reload to show updated date
        window.location.reload()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetLastSync = async () => {
    if (!confirm('This will clear the last sync timestamp and re-sync all meetings from the cutoff date. Continue?')) {
      return
    }

    setIsSaving(true)

    try {
      const result = await updateFirefliesSyncDates({
        syncStartDate: config.syncStartDate,
        resetLastSync: true
      })

      if (result.success) {
        toast.success(result.message)
        // Force full page reload to show updated sync status
        window.location.reload()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to reset last sync')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setSyncStartDate(parseDateString(config.syncStartDate))
    setIsEditing(false)
  }

  const handleManualSync = async () => {
    setIsSyncing(true)

    try {
      const result = await triggerManualSync()

      if (result.success) {
        toast.success(result.message)
        // Refresh queue count
        const meetings = await getPendingMeetings()
        setQueueCount(meetings.length)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to sync meetings')
    } finally {
      setIsSyncing(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Fireflies Sync</h3>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        <div className="space-y-3 text-sm border rounded-lg p-4 bg-muted/30">
          <div>
            <span className="font-medium">Status:</span>{' '}
            {config.connectionStatus === 'connected' ? (
              <span className="text-green-600">Connected</span>
            ) : (
              <span className="text-gray-500">Not Connected</span>
            )}
          </div>

          <div suppressHydrationWarning>
            <span className="font-medium">Sync Start Date:</span>{' '}
            {config.syncStartDate
              ? format(parseDateString(config.syncStartDate)!, 'PPP')
              : 'Not set (defaults to last 90 days)'}
          </div>

          <div suppressHydrationWarning>
            <span className="font-medium">Last Sync:</span>{' '}
            {config.lastSyncAt
              ? format(new Date(config.lastSyncAt), 'PPp')
              : 'Never'}
          </div>

          <div>
            <span className="font-medium">Pending Queue:</span>{' '}
            {queueCount} meeting{queueCount !== 1 ? 's' : ''} awaiting review
          </div>
        </div>

        {/* Actions */}
        {isAdmin && config.connectionStatus === 'connected' && (
          <div className="flex gap-2 pt-2 flex-wrap">
            <Button
              onClick={handleManualSync}
              disabled={isSyncing}
              size="sm"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/settings/fireflies/queue')}
            >
              <List className="mr-2 h-4 w-4" />
              View Queue ({queueCount})
            </Button>
            {config.lastSyncAt && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetLastSync}
                disabled={isSaving}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Last Sync
              </Button>
            )}
          </div>
        )}

        {(!config.connectionStatus || config.connectionStatus !== 'connected') && (
          <p className="text-sm text-muted-foreground mt-4">
            Connect your Fireflies account above to start syncing meetings.
          </p>
        )}

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">
            How Sync Works
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Set sync start date to specify how far back to sync</li>
            <li>• Click "Sync Now" to fetch meetings from Fireflies</li>
            <li>• ALL meetings appear in queue for review</li>
            <li>• Click "View Queue" to review and import/exclude meetings</li>
            <li>• Use "Reset Last Sync" to re-sync from start date</li>
          </ul>
        </div>
      </div>
    )
  }

  // Edit mode
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Edit Sync Settings</h3>
      </div>

      {/* Sync Start Date */}
      <div className="space-y-2">
        <Label>Sync Start Date (Optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {syncStartDate ? format(syncStartDate, 'PPP') : 'Not set (defaults to last 90 days)'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={syncStartDate}
              onSelect={setSyncStartDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <p className="text-sm text-muted-foreground">
          Sync meetings from this date onwards. Leave empty to default to last 90 days.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
