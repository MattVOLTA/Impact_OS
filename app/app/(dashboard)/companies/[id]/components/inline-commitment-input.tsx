'use client'

import { useState, useEffect, useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'
import { analyzeCommitmentAction, createCommitmentAction } from '../actions'
import { Loader2, Sparkles, Calendar, Target, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface InlineCommitmentInputProps {
  companyId: string
  aiAnalysisEnabled: boolean
}

interface AnalysisResult {
  extracted_date: string | null
  is_measurable: boolean
  measurability_score: number
  suggestion: string | null
  is_duplicate: boolean
  smart_criteria: {
    specific: boolean
    measurable: boolean
    achievable: boolean
    relevant: boolean
    time_bound: boolean
  }
}

export function InlineCommitmentInput({ companyId, aiAnalysisEnabled }: InlineCommitmentInputProps) {
  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const debouncedText = useDebounce(text, 450)

  // Trigger analysis when debounced text changes and meets criteria
  useEffect(() => {
    const runAnalysis = async () => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Don't analyze if AI feature is disabled
      if (!aiAnalysisEnabled) {
        setAnalysis(null)
        setIsAnalyzing(false)
        return
      }

      if (debouncedText.length > 15) {
        // Create new abort controller for this request
        abortControllerRef.current = new AbortController()

        setIsAnalyzing(true)
        try {
          const result = await analyzeCommitmentAction(debouncedText)

          // Only update if this request wasn't aborted
          if (!abortControllerRef.current.signal.aborted) {
            if (result.success && result.data) {
              setAnalysis(result.data)
            } else if (result.success && result.data === null) {
              // Feature disabled - clear any existing analysis
              setAnalysis(null)
            }
          }
        } catch (error) {
          // Ignore abort errors (expected when user keeps typing)
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('Analysis failed', error)
          }
        } finally {
          // Only clear analyzing state if not aborted
          if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
            setIsAnalyzing(false)
          }
        }
      } else {
        setAnalysis(null)
        setIsAnalyzing(false)
      }
    }

    runAnalysis()

    // Cleanup: abort on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [debouncedText, aiAnalysisEnabled])

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault() // Prevent newline
      if (!text.trim()) return

      setIsSaving(true)
      try {
        const result = await createCommitmentAction({
          company_id: companyId,
          title: text,
          due_date: analysis?.extracted_date || undefined,
          description: analysis?.suggestion ? `AI Suggestion: ${analysis.suggestion}` : undefined
        })

        if (result.success) {
          setText('')
          setAnalysis(null)
          toast.success('Commitment added')
        } else {
          toast.error('Failed to add commitment')
        }
      } catch (error) {
        toast.error('An error occurred')
      } finally {
        setIsSaving(false)
      }
    }
  }

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a new commitment... (e.g., 'Send 3 intros by Friday')"
          className="min-h-[50px] pr-10 resize-none overflow-hidden py-3"
          disabled={isSaving}
        />
        <div className="absolute right-3 top-3 flex items-center gap-2 pointer-events-none">
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (aiAnalysisEnabled && debouncedText.length > 15 && !isSaving) ? (
            <Sparkles className={cn("h-4 w-4", analysis ? "text-primary" : "text-muted-foreground")} />
          ) : null}
        </div>
      </div>

      {/* Analysis Feedback / Hints */}
      {analysis && (
        <div className="flex flex-wrap items-center gap-2 text-xs animate-in fade-in slide-in-from-top-1">
          {analysis.extracted_date && (
            <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900">
              <Calendar className="h-3 w-3" />
              <span>Due {format(new Date(analysis.extracted_date), 'MMM d')}</span>
            </div>
          )}
          
          {analysis.is_measurable ? (
            <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900">
              <Target className="h-3 w-3" />
              <span>Measurable {analysis.measurability_score ? `(${analysis.measurability_score}/10)` : ''}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
              <Target className="h-3 w-3" />
              <span>Make it specific? {analysis.measurability_score ? `(${analysis.measurability_score}/10)` : ''}</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-1 text-muted-foreground">
            <CornerDownLeft className="h-3 w-3" />
            <span>Press Enter to save</span>
          </div>
        </div>
      )}

      {/* Suggestion Card or Skeleton */}
      {isAnalyzing && debouncedText.length > 15 ? (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md p-2.5 text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2 bg-blue-200 dark:bg-blue-800 rounded animate-pulse w-3/4"></div>
              <div className="h-2 bg-blue-200 dark:bg-blue-800 rounded animate-pulse w-1/2"></div>
            </div>
          </div>
        </div>
      ) : analysis?.suggestion && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md p-2.5 text-xs text-blue-900 dark:text-blue-100 animate-in fade-in slide-in-from-top-1">
          <p><strong className="font-semibold">💡 Suggestion:</strong> {analysis.suggestion}</p>
        </div>
      )}
    </div>
  )
}

