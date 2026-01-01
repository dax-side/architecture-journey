"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ChevronRight, Check } from "lucide-react"
import { Loading } from "@/components/loading"
import { ErrorMessage } from "@/components/error-message"
import { apiClient } from "@/lib/api-client"
import { sessionStorage } from "@/lib/session-storage"
import type { DecisionTree as DecisionTreeType, Answer } from "@/lib/types"

export default function TreePage() {
  const router = useRouter()
  const params = useParams()
  const treeId = params.id as string

  const [tree, setTree] = useState<DecisionTreeType | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchTree = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getTree(treeId)
        setTree(data)

        // Initialize session
        sessionStorage.setSession({
          treeId,
          answers: [],
          startedAt: new Date().toISOString(),
        })

        // Track event
        await apiClient.trackEvent({
          eventType: "tree_started",
          treeId,
          timestamp: new Date().toISOString(),
        })

        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load decision tree")
      } finally {
        setLoading(false)
      }
    }

    fetchTree()
  }, [treeId])

  const handleSelectOption = async (optionId: string) => {
    if (!tree) return

    const currentQuestion = tree.questions[currentQuestionIndex]
    const selectedOption = currentQuestion.options.find((opt) => opt.id === optionId)

    if (!selectedOption) return

    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      optionId: optionId,
    }

    const updatedAnswers = [...answers, newAnswer]
    setAnswers(updatedAnswers)
    sessionStorage.updateAnswers(updatedAnswers)

    // Track event
    await apiClient.trackEvent({
      eventType: "question_answered",
      treeId,
      timestamp: new Date().toISOString(),
      metadata: { questionId: currentQuestion.id },
    })

    // Check if this is the last question (nextQuestionId is null)
    if (selectedOption.nextQuestionId === null) {
      // Get recommendations
      try {
        setIsSubmitting(true)
        const result = await apiClient.getRecommendations(treeId, updatedAnswers)

        // Save result
        const savedResult = await apiClient.saveResult({
          treeId,
          answers: updatedAnswers,
          result: result,
        })

        // Track event
        await apiClient.trackEvent({
          eventType: "result_generated",
          treeId,
          timestamp: new Date().toISOString(),
        })

        sessionStorage.clearSession()
        router.push(`/results/${savedResult.slug || savedResult.shareableSlug}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate recommendations")
        setIsSubmitting(false)
      }
    } else if (selectedOption.nextQuestionId) {
      // Find next question
      const nextIndex = tree.questions.findIndex((q) => q.id === selectedOption.nextQuestionId)
      if (nextIndex !== -1) {
        setCurrentQuestionIndex(nextIndex)
      }
    }
  }

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setAnswers(answers.slice(0, -1))
      sessionStorage.updateAnswers(answers.slice(0, -1))
    } else {
      router.push("/")
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorMessage title="Error" message={error} onRetry={() => window.location.reload()} />
  if (!tree) return <ErrorMessage title="Not Found" message="Decision tree not found" />

  const currentQuestion = tree.questions[currentQuestionIndex]
  const completedQuestionIds = answers.map(a => a.questionId)
  const progress = Math.round((currentQuestionIndex / tree.questions.length) * 100)

  return (
    <main className="min-h-screen">
      {/* Top navigation bar */}
      <div className="sticky top-14 z-40 bg-background border-b border-border">
        <div className="container-max py-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                Home
              </Link>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{tree.title}</span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Question {currentQuestionIndex + 1} of {tree.questions.length}</span>
              <span>{progress}% complete</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container-max py-8 lg:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Question Card */}
          <div className="p-6 lg:p-8 rounded-xl border border-border bg-card">
            <div className="mb-6">
              <span className="inline-block px-2.5 py-0.5 rounded bg-secondary text-xs font-medium mb-4">
                Question {currentQuestionIndex + 1}
              </span>
              <h2 className="heading-3 mb-2">{currentQuestion.text}</h2>
              {currentQuestion.description && (
                <p className="text-muted-foreground">{currentQuestion.description}</p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  disabled={isSubmitting}
                  className="w-full p-4 text-left rounded-lg border border-border hover:border-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {option.label || option.text}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>

            {/* Back button */}
            <div className="mt-6 pt-6 border-t border-border">
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                {currentQuestionIndex > 0 ? "Previous question" : "Back to home"}
              </button>
            </div>
          </div>

          {/* Journey so far */}
          {answers.length > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-secondary">
              <h3 className="text-sm font-medium mb-3">Answered so far</h3>
              <div className="space-y-2">
                {answers.map((answer, idx) => {
                  const question = tree.questions.find(q => q.id === answer.questionId)
                  const option = question?.options.find(o => o.id === answer.optionId)
                  return (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="text-muted-foreground">{option?.label || option?.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
