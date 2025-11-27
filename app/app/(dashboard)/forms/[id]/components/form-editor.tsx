/**
 * Form Editor Component
 *
 * Edit an existing form (similar to FormBuilder but with update logic)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Eye, Save, Rocket, ArrowLeft, Link2, Check, Copy } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { updateFormAction, publishFormAction } from '../../actions'
import { updateFormSchema, UpdateFormInput, Section, Form as FormType } from '@/lib/schemas/form'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SectionEditor } from '../../components/section-editor'
import { FormPreview } from '../../components/form-preview'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface FormEditorProps {
  form: FormType
}

export function FormEditor({ form: initialForm }: FormEditorProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sections, setSections] = useState<Section[]>(initialForm.form_data.sections || [])
  const [isDirty, setIsDirty] = useState(false)
  const [isPublished, setIsPublished] = useState(initialForm.is_published)
  const [linkCopied, setLinkCopied] = useState(false)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const formHook = useForm({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      title: initialForm.title,
      description: initialForm.description || '',
      update_frequency: initialForm.update_frequency || undefined,
      reminder_frequency: initialForm.reminder_frequency || undefined
    },
    mode: 'onChange'
  })

  // Watch for form field changes to mark as dirty
  const { formState } = formHook

  // Mark dirty when form fields change or sections change
  if (formState.isDirty && !isDirty) {
    setIsDirty(true)
  }

  // Detect if changes are structural (adding/removing/reordering sections/questions)
  const [hasStructuralChanges, setHasStructuralChanges] = useState(false)

  useEffect(() => {
    // Compare current sections with initial sections
    const originalSections = JSON.stringify(initialForm.form_data.sections)
    const currentSections = JSON.stringify(sections)
    setHasStructuralChanges(originalSections !== currentSections)
  }, [sections, initialForm.form_data.sections])

  // Add a new section
  const addSection = () => {
    const newSection: Section = {
      id: uuidv4(),
      title: 'New Section',
      isExpanded: true,
      questions: []
    }
    setSections([...sections, newSection])
    setIsDirty(true)
  }

  // Update a section
  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    setSections(
      sections.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    )
    setIsDirty(true)
  }

  // Delete a section
  const deleteSection = (sectionId: string) => {
    setSections(sections.filter((section) => section.id !== sectionId))
    setIsDirty(true)
  }

  // Handle drag end for sections
  const handleSectionDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        return arrayMove(items, oldIndex, newIndex)
      })
      setIsDirty(true)
    }
  }

  // Save form
  const onSubmit = async (data: any) => {
    setIsSubmitting(true)

    try {
      const updates = {
        ...data,
        form_data: {
          sections
        }
      }

      const result = await updateFormAction(initialForm.id, updates, hasStructuralChanges)

      if (!result.success || !result.data) {
        console.error('Failed to update form:', result.error)
        return
      }

      // Mark as clean after successful save
      setIsDirty(false)
      formHook.reset(updates)

      // Refresh the page to show updated data
      router.refresh()
    } catch (error) {
      console.error('Form update error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle publish toggle
  const handlePublishToggle = async (checked: boolean) => {
    const previousState = isPublished
    setIsPublished(checked)
    setIsDirty(true)

    // If toggling to published, call publish action immediately
    if (checked && !previousState) {
      try {
        const result = await publishFormAction(initialForm.id)
        if (!result.success) {
          console.error('Failed to publish form:', result.error)
          setIsPublished(false) // Revert on error
        }
      } catch (error) {
        console.error('Publish error:', error)
        setIsPublished(false) // Revert on error
      }
    }
  }

  // Copy form link to clipboard
  const copyFormLink = async () => {
    const formUrl = `${window.location.origin}/f/${initialForm.id}`
    try {
      await navigator.clipboard.writeText(formUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <Form {...formHook}>
      <form onSubmit={formHook.handleSubmit(onSubmit)} className="space-y-6">
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/forms">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forms
            </Link>
          </Button>
          {isPublished ? (
            <Badge variant="default">Published (v{initialForm.version})</Badge>
          ) : (
            <Badge variant="secondary">Draft (v{initialForm.version})</Badge>
          )}
          {hasStructuralChanges && isPublished && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Structural changes - will create v{initialForm.version + 1}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="builder" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Builder - Sections and Questions */}
          <TabsContent value="builder" className="space-y-6">
            {/* Form Title (primary field) */}
            <div className="border rounded-lg p-6 space-y-4 bg-background">
              <FormField
                control={formHook.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Q1 2026 Company Update" {...field} />
                    </FormControl>
                    <FormDescription>
                      Give your form a clear, descriptive name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Form Sections</h2>
                <Button type="button" variant="outline" onClick={addSection}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>

              {sections.length === 0 ? (
                <div className="border rounded-lg p-12 text-center bg-background">
                  <p className="text-muted-foreground mb-4">
                    No sections yet. Click "Add Section" to start building your form.
                  </p>
                  <Button type="button" variant="outline" onClick={addSection}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Section
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleSectionDragEnd}
                >
                  <SortableContext
                    items={sections.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {sections.map((section, index) => (
                        <SectionEditor
                          key={section.id}
                          section={section}
                          sectionIndex={index}
                          totalSections={sections.length}
                          onUpdate={(updates) => updateSection(section.id, updates)}
                          onDelete={() => deleteSection(section.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </TabsContent>

          {/* Tab 2: Settings - Form Metadata */}
          <TabsContent value="settings" className="space-y-6">
            <div className="border rounded-lg p-6 space-y-4 bg-background">
              <h2 className="text-lg font-semibold">Form Settings</h2>

              {/* Publish Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="publish-toggle" className="text-base font-medium">
                    Published
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {isPublished
                      ? 'Form is live - companies can submit responses'
                      : 'Form is draft - only visible to your team'}
                  </p>
                </div>
                <Switch
                  id="publish-toggle"
                  checked={isPublished}
                  onCheckedChange={handlePublishToggle}
                  disabled={sections.length === 0}
                />
              </div>

              {/* Public Form Link (only when published) */}
              {isPublished && (
                <div className="border rounded-lg p-4 space-y-3 bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <Label className="text-base font-medium text-green-900 dark:text-green-100">
                      Public Form Link
                    </Label>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Share this link with companies to collect submissions
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/f/${initialForm.id}`}
                      className="font-mono text-sm bg-white dark:bg-gray-900"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyFormLink}
                      className="shrink-0"
                    >
                      {linkCopied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <FormField
                control={formHook.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Quarterly update to track traction, hiring, and fundraising progress"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={formHook.control}
                  name="update_frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Update Frequency (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="60"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={formHook.control}
                  name="reminder_frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reminder Frequency (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="7"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Preview */}
          <TabsContent value="preview">
            <FormPreview
              title={formHook.watch('title') || 'Untitled Form'}
              description={formHook.watch('description')}
              sections={sections}
            />
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/forms')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? (
              <>
                <Save className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
