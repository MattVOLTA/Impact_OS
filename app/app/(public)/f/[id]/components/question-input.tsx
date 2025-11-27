/**
 * Question Input Component
 *
 * Renders the appropriate input based on question type
 * Handles all 13 question types with validation
 */

'use client'

import { Question } from '@/lib/schemas/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface QuestionInputProps {
  question: Question
  value: any
  onChange: (value: any) => void
  error?: string
}

export function QuestionInput({ question, value, onChange, error }: QuestionInputProps) {
  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Your answer"
            minLength={question.validation?.minLength}
            maxLength={question.validation?.maxLength}
            required={question.required}
          />
        )

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Your answer"
            rows={4}
            minLength={question.validation?.minLength}
            maxLength={question.validation?.maxLength}
            required={question.required}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.valueAsNumber)}
            placeholder="0"
            min={question.validation?.min}
            max={question.validation?.max}
            step={question.validation?.step || 1}
            required={question.required}
          />
        )

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              value={value ?? ''}
              onChange={(e) => onChange(e.target.valueAsNumber)}
              placeholder="0.00"
              min={question.validation?.min || 0}
              max={question.validation?.max}
              step={0.01}
              required={question.required}
              className="pl-7"
            />
          </div>
        )

      case 'email':
        return (
          <Input
            type="email"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="email@example.com"
            required={question.required}
          />
        )

      case 'phone':
        return (
          <Input
            type="tel"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="(555) 555-5555"
            required={question.required}
          />
        )

      case 'url':
        return (
          <Input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com"
            required={question.required}
          />
        )

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={question.required}
          />
        )

      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange} required={question.required}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option, idx) => (
                <SelectItem key={idx} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        return (
          <div className="space-y-3 border rounded-md p-4 bg-muted/30">
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${idx}`}
                  checked={(value || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValues = value || []
                    if (checked) {
                      onChange([...currentValues, option])
                    } else {
                      onChange(currentValues.filter((v: string) => v !== option))
                    }
                  }}
                />
                <Label
                  htmlFor={`${question.id}-${idx}`}
                  className="font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        )

      case 'yesno':
        return (
          <Select value={value || ''} onValueChange={onChange} required={question.required}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="prefer_not_to_answer">Prefer not to answer</SelectItem>
            </SelectContent>
          </Select>
        )

      case 'dynamic_company':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search for a company..."
            required={question.required}
          />
        )

      case 'dynamic_contact':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search for a contact..."
            required={question.required}
          />
        )

      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Your answer"
            required={question.required}
          />
        )
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={question.id}>
        {question.text}
        {question.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {question.helpText && (
        <p className="text-sm text-muted-foreground">{question.helpText}</p>
      )}

      <div id={question.id}>{renderInput()}</div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
