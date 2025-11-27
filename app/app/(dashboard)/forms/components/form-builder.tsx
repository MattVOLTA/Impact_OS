/**
 * Form Builder Component
 *
 * Main form builder interface with:
 * - Form metadata (title, description, program)
 * - Section management (add, remove, reorder)
 * - Question management (add, remove, edit, reorder)
 * - Preview mode
 * - Save draft / Publish actions
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Eye, Save, Rocket, Settings } from 'lucide-react'
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

import { createFormAction } from '../actions'
import { createFormSchema, CreateFormInput, Section } from '@/lib/schemas/form'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SectionEditor } from './section-editor'
import { FormPreview } from './form-preview'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function FormBuilder() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [publishOnSave, setPublishOnSave] = useState(false)
  const [sections, setSections] = useState<Section[]>([])
  const [isDirty, setIsDirty] = useState(false)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const form = useForm({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      title: '',
      description: '',
      form_data: {
        sections: []
      }
    },
    mode: 'onChange'
  })

  // Watch for form field changes to mark as dirty
  const watchedFields = form.watch()
  const { formState } = form

  // Mark dirty when form fields change or sections change
  if (formState.isDirty && !isDirty) {
    setIsDirty(true)
  }

  // Add a new section
  const addSection = () => {
    const newSection: Section = {
      id: uuidv4(),
      title: 'New Section',
      isExpanded: true, // Always true initially
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
      const formData = {
        ...data,
        form_data: {
          sections
        }
      }

      const result = await createFormAction(formData)

      if (!result.success || !result.data) {
        console.error('Failed to create form:', result.error)
        return
      }

      // Publish if checkbox was checked
      if (publishOnSave) {
        const { publishFormAction } = await import('../actions')
        await publishFormAction(result.data.id)
      }

      // Mark as clean after successful save
      setIsDirty(false)

      // Navigate to edit page
      router.push(`/forms/${result.data.id}`)
    } catch (error) {
      console.error('Form creation error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                control={form.control}
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
                    Publish on save
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {publishOnSave
                      ? 'Form will be published and available to companies'
                      : 'Form will be saved as draft'}
                  </p>
                </div>
                <Switch
                  id="publish-toggle"
                  checked={publishOnSave}
                  onCheckedChange={(checked) => setPublishOnSave(checked as boolean)}
                />
              </div>

              <FormField
                control={form.control}
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
                    <FormDescription>
                      Optional description shown to companies when filling out the form
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="update_frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Update Frequency (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="60"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormDescription>How often companies should submit</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reminder_frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reminder Frequency (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="7"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormDescription>Days before due to send reminder</FormDescription>
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
              title={form.watch('title') || 'Untitled Form'}
              description={form.watch('description')}
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

          <Button type="submit" disabled={isSubmitting || sections.length === 0 || !isDirty}>
            {isSubmitting ? (
              <>
                <Save className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : publishOnSave ? (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                Save & Publish
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
