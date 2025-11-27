/**
 * Section Editor Component
 *
 * Edits a single section with:
 * - Section title editing
 * - Add/remove/reorder questions
 * - Collapse/expand
 * - Move section up/down
 * - Delete section
 */

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2, GripVertical } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

import { Section, Question } from '@/lib/schemas/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QuestionEditor } from './question-editor'

interface SectionEditorProps {
  section: Section
  sectionIndex: number
  totalSections: number
  onUpdate: (updates: Partial<Section>) => void
  onDelete: () => void
}

export function SectionEditor({
  section,
  sectionIndex,
  totalSections,
  onUpdate,
  onDelete,
}: SectionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(section.isExpanded ?? true)

  // Sortable hook for drag and drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Add question to this section
  const addQuestion = () => {
    const newQuestion: Question = {
      id: uuidv4(),
      type: 'text',
      text: 'New Question',
      required: false,
      layout: 'full'
    }
    onUpdate({
      questions: [...section.questions, newQuestion]
    })
  }

  // Update a question
  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    onUpdate({
      questions: section.questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q
      )
    })
  }

  // Delete a question
  const deleteQuestion = (questionId: string) => {
    onUpdate({
      questions: section.questions.filter((q) => q.id !== questionId)
    })
  }

  // Drag and drop sensors for questions
  const questionSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end for questions
  const handleQuestionDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = section.questions.findIndex((q) => q.id === active.id)
      const newIndex = section.questions.findIndex((q) => q.id === over.id)

      onUpdate({ questions: arrayMove(section.questions, oldIndex, newIndex) })
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg">
      {/* Section Header */}
      <div className="flex items-center gap-2 p-4 bg-muted/50">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        <Input
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="font-semibold border-none bg-transparent shadow-none focus-visible:ring-0"
          placeholder="Section Title"
        />

        <div className="flex items-center gap-1 ml-auto">
          {/* Collapse/Expand */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              const newExpanded = !isExpanded
              setIsExpanded(newExpanded)
              onUpdate({ isExpanded: newExpanded })
            }}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {/* Delete section */}
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

      {/* Section Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Questions */}
          {section.questions.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                No questions in this section yet
              </p>
              <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={questionSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleQuestionDragEnd}
            >
              <SortableContext
                items={section.questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-12 gap-3">
                  {section.questions.map((question, index) => {
                    // Grid layout based on question width - matches preview
                    const layoutClass =
                      question.layout === 'half'
                        ? 'col-span-12 lg:col-span-6'
                        : question.layout === 'third'
                        ? 'col-span-12 lg:col-span-4'
                        : 'col-span-12'

                    return (
                      <div key={question.id} className={layoutClass}>
                        <QuestionEditor
                          question={question}
                          questionIndex={index}
                          totalQuestions={section.questions.length}
                          allQuestions={section.questions}
                          onUpdate={(updates) => updateQuestion(question.id, updates)}
                          onDelete={() => deleteQuestion(question.id)}
                        />
                      </div>
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Add Question Button */}
          {section.questions.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
