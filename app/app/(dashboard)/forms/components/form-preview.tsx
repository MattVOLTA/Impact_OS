/**
 * Form Preview Component
 *
 * Shows how the form will appear to portfolio companies
 * Renders questions based on their type (read-only preview)
 */

'use client'

import { Section } from '@/lib/schemas/form'
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

interface FormPreviewProps {
  title: string
  description?: string
  sections: Section[]
}

export function FormPreview({ title, description, sections }: FormPreviewProps) {
  if (sections.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">
          Add sections and questions to see a preview of your form
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Form Header */}
      <div className="border rounded-lg p-6 mb-6 bg-card">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.id} className="border rounded-lg p-6 bg-card">
            {/* Section Title */}
            <h3 className="text-lg font-semibold mb-4">{section.title}</h3>

            {/* Questions - Smart grid layout for side-by-side display */}
            <div className="grid grid-cols-12 gap-4">
              {section.questions.map((question) => {
                // Grid layout based on question width
                const layoutClass =
                  question.layout === 'half'
                    ? 'col-span-12 md:col-span-6'
                    : question.layout === 'third'
                    ? 'col-span-12 md:col-span-4'
                    : 'col-span-12'

                return (
                  <div key={question.id} className={layoutClass}>
                    <div className="space-y-2">
                      <Label>
                        {question.text}
                        {question.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {question.helpText && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {question.helpText}
                        </p>
                      )}

                      <div className="mt-2">
                        {/* Render appropriate input based on type */}
                        {question.type === 'text' && (
                          <Input placeholder="Your answer" disabled />
                        )}

                        {question.type === 'textarea' && (
                          <Textarea
                            placeholder="Your answer"
                            rows={4}
                            disabled
                          />
                        )}

                        {question.type === 'number' && (
                          <Input type="number" placeholder="0" disabled />
                        )}

                        {question.type === 'currency' && (
                          <Input type="number" placeholder="$0.00" disabled />
                        )}

                        {question.type === 'email' && (
                          <Input type="email" placeholder="email@example.com" disabled />
                        )}

                        {question.type === 'phone' && (
                          <Input type="tel" placeholder="(555) 555-5555" disabled />
                        )}

                        {question.type === 'url' && (
                          <Input type="url" placeholder="https://example.com" disabled />
                        )}

                        {question.type === 'date' && (
                          <Input type="date" disabled />
                        )}

                        {question.type === 'select' && (
                          <Select disabled>
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
                        )}

                        {question.type === 'multiselect' && (
                          <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                            {question.options?.map((option, idx) => (
                              <div key={idx} className="flex items-center space-x-2">
                                <Checkbox id={`preview-${question.id}-${idx}`} disabled />
                                <Label
                                  htmlFor={`preview-${question.id}-${idx}`}
                                  className="font-normal cursor-pointer"
                                >
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}

                        {question.type === 'yesno' && (
                          <Select disabled>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                              <SelectItem value="prefer_not_to_answer">
                                Prefer not to answer
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        {question.type === 'dynamic_company' && (
                          <Input placeholder="Search for a company..." disabled />
                        )}

                        {question.type === 'dynamic_contact' && (
                          <Input placeholder="Search for a contact..." disabled />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {section.questions.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No questions in this section
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
