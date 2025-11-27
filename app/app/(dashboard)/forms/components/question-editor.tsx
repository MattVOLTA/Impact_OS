/**
 * Question Editor Component
 *
 * Edits a single question with:
 * - Question type selector (13 types)
 * - Question text editing
 * - Help text
 * - Required toggle
 * - Validation rules editor
 * - Conditional logic editor (future)
 * - Layout options (full, half, third)
 */

'use client'

import { useState } from 'react'
import { Trash2, GripVertical, Settings2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Question, QuestionType } from '@/lib/schemas/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

interface QuestionEditorProps {
  question: Question
  questionIndex: number
  totalQuestions: number
  allQuestions: Question[]
  onUpdate: (updates: Partial<Question>) => void
  onDelete: () => void
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'select', label: 'Single Choice' },
  { value: 'multiselect', label: 'Multiple Choice' },
  { value: 'yesno', label: 'Yes/No' },
  { value: 'date', label: 'Date' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'dynamic_company', label: 'Company Selector' },
  { value: 'dynamic_contact', label: 'Contact Selector' }
]

const LAYOUT_OPTIONS = [
  { value: 'full' as const, label: 'Full Width' },
  { value: 'half' as const, label: 'Half Width' },
  { value: 'third' as const, label: 'Third Width' }
]

export function QuestionEditor({
  question,
  questionIndex,
  totalQuestions,
  allQuestions,
  onUpdate,
  onDelete,
}: QuestionEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const needsOptions = question.type === 'select' || question.type === 'multiselect'

  // Sortable hook for drag and drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-4 space-y-4 bg-card">
      {/* Question Header */}
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-2">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 space-y-3">
          {/* Question Text */}
          <div>
            <Label className="text-xs text-muted-foreground">Question</Label>
            <Input
              value={question.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Enter your question here"
              className="font-medium"
            />
          </div>

          {/* Question Type & Required */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select
                value={question.type}
                onValueChange={(value) => onUpdate({ type: value as QuestionType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Layout</Label>
              <Select
                value={question.layout || 'full'}
                onValueChange={(value) => onUpdate({ layout: value as 'full' | 'half' | 'third' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYOUT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Required Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`required-${question.id}`}
              checked={question.required}
              onCheckedChange={(checked) => onUpdate({ required: checked as boolean })}
            />
            <Label
              htmlFor={`required-${question.id}`}
              className="text-sm font-normal cursor-pointer"
            >
              Required field
            </Label>
          </div>

          {/* Options Editor (for select/multiselect) */}
          {needsOptions && (
            <div>
              <Label className="text-xs text-muted-foreground">Options (one per line)</Label>
              <Textarea
                value={question.options?.join('\n') || ''}
                onChange={(e) =>
                  onUpdate({
                    options: e.target.value.split('\n').filter((opt) => opt.trim())
                  })
                }
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                rows={4}
              />
            </div>
          )}

          {/* Help Text */}
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Button>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-3 pl-4 border-l-2">
              <div>
                <Label className="text-xs text-muted-foreground">Help Text</Label>
                <Textarea
                  value={question.helpText || ''}
                  onChange={(e) => onUpdate({ helpText: e.target.value })}
                  placeholder="Additional guidance for answering this question"
                  rows={2}
                />
              </div>

              {/* Validation Rules */}
              {(question.type === 'text' || question.type === 'textarea') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Min Length</Label>
                    <Input
                      type="number"
                      value={question.validation?.minLength || ''}
                      onChange={(e) =>
                        onUpdate({
                          validation: {
                            ...question.validation,
                            minLength: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Max Length</Label>
                    <Input
                      type="number"
                      value={question.validation?.maxLength || ''}
                      onChange={(e) =>
                        onUpdate({
                          validation: {
                            ...question.validation,
                            maxLength: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        })
                      }
                      placeholder="500"
                    />
                  </div>
                </div>
              )}

              {(question.type === 'number' || question.type === 'currency') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Min Value</Label>
                    <Input
                      type="number"
                      value={question.validation?.min ?? ''}
                      onChange={(e) =>
                        onUpdate({
                          validation: {
                            ...question.validation,
                            min: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Max Value</Label>
                    <Input
                      type="number"
                      value={question.validation?.max ?? ''}
                      onChange={(e) =>
                        onUpdate({
                          validation: {
                            ...question.validation,
                            max: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        })
                      }
                      placeholder="1000000"
                    />
                  </div>
                </div>
              )}

              {question.type === 'multiselect' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Min Selections</Label>
                    <Input
                      type="number"
                      value={question.validation?.minSelections || ''}
                      onChange={(e) =>
                        onUpdate({
                          validation: {
                            ...question.validation,
                            minSelections: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        })
                      }
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Max Selections</Label>
                    <Input
                      type="number"
                      value={question.validation?.maxSelections || ''}
                      onChange={(e) =>
                        onUpdate({
                          validation: {
                            ...question.validation,
                            maxSelections: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        })
                      }
                      placeholder="5"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  )
}
