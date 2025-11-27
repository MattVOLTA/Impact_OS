/**
 * Conditional Logic Evaluation Hook
 *
 * Evaluates conditional logic rules in real-time to determine which questions are visible
 * Supports all 7 operators and detects circular dependencies
 */

import { useMemo } from 'react'
import { Section, Question, ConditionOperator } from '@/lib/schemas/form'

interface EvaluationResult {
  visibleQuestions: Set<string>
  hasCircularDependency: boolean
}

export function useConditionEvaluation(
  sections: Section[],
  answers: Record<string, any>
): EvaluationResult {
  return useMemo(() => {
    // Build dependency graph
    const graph: Record<string, string[]> = {}
    const allQuestions: Question[] = []

    for (const section of sections) {
      for (const question of section.questions) {
        allQuestions.push(question)
        if (question.conditionalLogic) {
          if (!graph[question.id]) {
            graph[question.id] = []
          }
          graph[question.id].push(question.conditionalLogic.questionId)
        }
      }
    }

    // Detect circular dependencies
    const hasCircularDependency = detectCircularDependencies(graph)

    // Evaluate which questions are visible
    const visibleQuestions = new Set<string>()

    for (const question of allQuestions) {
      if (!question.conditionalLogic) {
        // No conditional logic - always visible
        visibleQuestions.add(question.id)
      } else {
        // Evaluate condition
        if (evaluateCondition(question.conditionalLogic, answers, allQuestions)) {
          visibleQuestions.add(question.id)
        }
      }
    }

    return {
      visibleQuestions,
      hasCircularDependency
    }
  }, [sections, answers])
}

/**
 * Detect circular dependencies using DFS
 */
function detectCircularDependencies(graph: Record<string, string[]>): boolean {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function hasCycle(node: string): boolean {
    visited.add(node)
    recursionStack.add(node)

    const neighbors = graph[node] || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) {
          return true
        }
      } else if (recursionStack.has(neighbor)) {
        return true // Cycle detected
      }
    }

    recursionStack.delete(node)
    return false
  }

  for (const node in graph) {
    if (!visited.has(node)) {
      if (hasCycle(node)) {
        return true
      }
    }
  }

  return false
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  logic: NonNullable<Question['conditionalLogic']>,
  answers: Record<string, any>,
  allQuestions: Question[]
): boolean {
  const { questionId, operator, value } = logic
  const answer = answers[questionId]

  switch (operator) {
    case 'equals':
      return answer === value

    case 'not_equals':
      return answer !== value

    case 'contains':
      if (typeof answer === 'string' && typeof value === 'string') {
        return answer.toLowerCase().includes(value.toLowerCase())
      }
      if (Array.isArray(answer)) {
        return answer.includes(value)
      }
      return false

    case 'is_empty':
      return answer === undefined || answer === null || answer === ''

    case 'is_not_empty':
      return answer !== undefined && answer !== null && answer !== ''

    case 'greater_than':
      if (typeof answer === 'number' && typeof value === 'number') {
        return answer > value
      }
      return false

    case 'less_than':
      if (typeof answer === 'number' && typeof value === 'number') {
        return answer < value
      }
      return false

    default:
      return false
  }
}
