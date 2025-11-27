'use client'

/**
 * AI-Powered Reports Page
 *
 * Provides a natural language chat interface for generating
 * compliance reports and analyzing portfolio performance.
 */

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Send, Plus, FileText, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export default function ReportsPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    const messageToSend = input
    setInput('')
    setIsLoading(true)

    // Add empty assistant message that will be populated by streaming
    const assistantMessageIndex = messages.length + 1
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const response = await fetch('/api/reports/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          message: messageToSend
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'session') {
                setSessionId(data.sessionId)
              } else if (data.type === 'text') {
                // Append text to the assistant message
                setMessages(prev => {
                  const updated = [...prev]
                  updated[assistantMessageIndex] = {
                    ...updated[assistantMessageIndex],
                    content: updated[assistantMessageIndex].content + data.text
                  }
                  return updated
                })
              } else if (data.type === 'status') {
                // Optionally show status (e.g., "Executing tools...")
                console.log('Status:', data.status)
              } else if (data.type === 'done') {
                // Stream complete
                console.log('Stream complete')
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (e) {
              console.error('Error parsing SSE:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => {
        const updated = [...prev]
        updated[assistantMessageIndex] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString()
        }
        return updated
      })
    } finally {
      setIsLoading(false)
      // Refocus textarea after response completes
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const startNewConversation = () => {
    setMessages([])
    setSessionId(null)
    setInput('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AI Reports</h1>
          <p className="text-sm text-gray-600 mt-1">
            Explore your portfolio data through conversation—discover insights, identify gaps, and generate reports collaboratively
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={startNewConversation}
            disabled={messages.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
          <Link href="/reports/library">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="max-w-md space-y-4">
              <h2 className="text-xl font-semibold">Start a conversation</h2>
              <p className="text-gray-600">
                Ask me to generate reports, analyze your portfolio, or explore your data.
              </p>
              <div className="grid gap-2 mt-6">
                <Card
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setInput('What insights can you find in our Q4 portfolio data?')}
                >
                  <p className="text-sm font-medium">Explore Q4 Portfolio Data</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Discover patterns, trends, and opportunities in recent data
                  </p>
                </Card>
                <Card
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setInput('Help me understand our demographic reach patterns')}
                >
                  <p className="text-sm font-medium">Demographic Discovery</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Explore engagement across BAI categories and identify gaps
                  </p>
                </Card>
                <Card
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setInput('I need to report on engagement—where should I start?')}
                >
                  <p className="text-sm font-medium">Engagement Reporting</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Get guidance on scoping and structuring engagement reports
                  </p>
                </Card>
                <Card
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setInput('Are there any concerning trends in our portfolio companies?')}
                >
                  <p className="text-sm font-medium">Identify Issues & Opportunities</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Surface data gaps, engagement drops, or emerging patterns
                  </p>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border shadow-sm'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="text-gray-900 text-sm [&>*]:text-gray-900 [&_p]:mb-3 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:mb-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_strong]:font-semibold [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border shadow-sm rounded-lg p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to generate a report or analyze your data..."
            className="resize-none"
            rows={3}
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
