/**
 * Summary Section
 *
 * Displays interaction summary with inline editing.
 * Supports markdown rendering.
 */

'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MinimalTiptap } from '@/components/ui/shadcn-io/minimal-tiptap'
import { type InteractionWithRelations } from '@/lib/dal/interactions'
import { updateInteractionAction } from '../../actions'
import { Pencil, X, Check } from 'lucide-react'

interface SummarySectionProps {
  interaction: InteractionWithRelations
}

export function SummarySection({ interaction }: SummarySectionProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [summaryValue, setSummaryValue] = useState(interaction.summary || '')
  const [isPending, startTransition] = useTransition()

  // Detect if content is markdown (check for markdown syntax)
  const isMarkdown = interaction.summary && (
    interaction.summary.includes('**') ||  // Bold
    interaction.summary.includes('##') ||  // Headers
    interaction.summary.includes('- ') ||  // Bullets
    interaction.summary.includes('* ')     // Alternative bullets
  )

  // Reset summary value when toggling edit mode
  useEffect(() => {
    setSummaryValue(interaction.summary || '')
  }, [editing, interaction.summary])

  // Handle save
  const handleSave = () => {
    startTransition(async () => {
      const result = await updateInteractionAction(interaction.id, {
        summary: summaryValue
      })

      if (result.success) {
        setEditing(false)
        router.refresh()
      }
    })
  }

  // Handle cancel
  const handleCancel = () => {
    setSummaryValue(interaction.summary || '')
    setEditing(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Summary</CardTitle>
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Text or Edit Mode */}
        {editing ? (
          <div className="space-y-3">
            <MinimalTiptap
              content={summaryValue}
              onChange={setSummaryValue}
              placeholder="Enter interaction summary..."
              className="min-h-[200px]"
              contentType={isMarkdown ? 'markdown' : 'html'}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending}
                size="sm"
              >
                <Check className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Text - Render Markdown */}
            {interaction.summary ? (
              <div className="text-foreground space-y-4">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-2xl font-bold text-foreground mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-bold text-foreground mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-semibold text-foreground mb-2">{children}</h3>,
                    p: ({ children }) => <p className="text-foreground mb-4 leading-relaxed">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                    li: ({ children }) => <li className="text-foreground leading-relaxed">{children}</li>,
                  }}
                >
                  {interaction.summary}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No summary provided</p>
            )}
          </>
        )}

        {/* Metadata */}
        {!editing && (
          <div className="pt-4 border-t space-y-1 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Created:</span>{' '}
              {format(new Date(interaction.created_at), 'PPP')}
            </div>
            {interaction.updated_at !== interaction.created_at && (
              <div>
                <span className="font-medium">Updated:</span>{' '}
                {format(new Date(interaction.updated_at), 'PPP')}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
