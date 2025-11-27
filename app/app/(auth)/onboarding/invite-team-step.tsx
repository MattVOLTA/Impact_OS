/**
 * Invite Team Step
 *
 * Second step in onboarding: Invite team members (optional)
 * Dynamic form with ability to add multiple team members
 * Part of Issue #54: Self-Service Onboarding
 */

'use client'

import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { UserPlus, Mail, Check, Trash2, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface InviteTeamStepProps {
  organizationId: string
  onComplete: () => void
  onSkip: () => void
}

const inviteFormSchema = z.object({
  invites: z.array(
    z.object({
      email: z.string().email('Invalid email address'),
      role: z.enum(['admin', 'editor', 'viewer'])
    })
  ).min(1, 'Add at least one team member')
})

type InviteFormInput = z.infer<typeof inviteFormSchema>

interface SentInvite {
  email: string
  role: string
  success: boolean
  error?: string
}

export function InviteTeamStep({ organizationId, onComplete, onSkip }: InviteTeamStepProps) {
  const [error, setError] = useState<string | null>(null)
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([])
  const [isSending, setIsSending] = useState(false)

  const form = useForm<InviteFormInput>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      invites: [{ email: '', role: 'editor' }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'invites'
  })

  async function onSubmit(values: InviteFormInput) {
    setError(null)
    setIsSending(true)

    try {
      // Import DAL function dynamically
      const { inviteUserToOrganization } = await import('@/lib/dal/invitations')

      // Send all invitations
      const results: SentInvite[] = []

      for (const invite of values.invites) {
        try {
          await inviteUserToOrganization({
            email: invite.email,
            organizationId,
            role: invite.role
          })

          results.push({
            email: invite.email,
            role: invite.role,
            success: true
          })
        } catch (err) {
          results.push({
            email: invite.email,
            role: invite.role,
            success: false,
            error: err instanceof Error ? err.message : 'Failed to send'
          })
        }
      }

      setSentInvites(results)

      // If all successful, reset form to one empty row
      const allSuccessful = results.every(r => r.success)
      if (allSuccessful) {
        form.reset({ invites: [{ email: '', role: 'editor' }] })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitations')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Invite your team</h2>
          <p className="text-sm text-muted-foreground">
            Add team members who will help track your portfolio
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}

      {/* Invite form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Dynamic invite rows */}
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-3">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name={`invites.${index}.email`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel>Email Address</FormLabel>}
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="colleague@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="w-40">
                  <FormField
                    control={form.control}
                    name={`invites.${index}.role`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel>Role</FormLabel>}
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Remove button (only show if more than 1 row) */}
                {fields.length > 1 && (
                  <div className={index === 0 ? 'pt-8' : ''}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add another button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ email: '', role: 'editor' })}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add another team member
          </Button>

          {/* Send invitations button */}
          <Button type="submit" className="w-full" disabled={isSending}>
            <Mail className="mr-2 h-4 w-4" />
            {isSending
              ? 'Sending invitations...'
              : `Send ${fields.length} Invitation${fields.length > 1 ? 's' : ''}`}
          </Button>
        </form>
      </Form>

      {/* Sent invites list */}
      {sentInvites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">
            Invitations Sent ({sentInvites.filter(i => i.success).length}/{sentInvites.length})
          </h3>
          <div className="space-y-2">
            {sentInvites.map((invite, index) => (
              <div
                key={index}
                className={`flex items-center justify-between rounded-md border p-3 ${
                  invite.success ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Check
                    className={`h-4 w-4 ${
                      invite.success ? 'text-green-600' : 'text-red-600'
                    }`}
                  />
                  <span className="text-sm font-medium">{invite.email}</span>
                  {invite.error && (
                    <span className="text-xs text-red-600">({invite.error})</span>
                  )}
                </div>
                <Badge variant="secondary" className="capitalize">
                  {invite.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={onSkip} className="flex-1">
          Skip for now
        </Button>
        <Button onClick={onComplete} className="flex-1">
          {sentInvites.length > 0
            ? `Continue to Dashboard (${sentInvites.filter(i => i.success).length} invited)`
            : 'Continue to Dashboard'}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        You can always invite more team members later from Settings
      </p>
    </div>
  )
}
