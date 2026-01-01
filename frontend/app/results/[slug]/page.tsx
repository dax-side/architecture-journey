"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { 
  ArrowRight, 
  Copy, 
  Check, 
  ExternalLink, 
  ThumbsUp, 
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  XCircle
} from "lucide-react"
import { Loading } from "@/components/loading"
import { ErrorMessage } from "@/components/error-message"
import { apiClient } from "@/lib/api-client"
import { copyToClipboard } from "@/lib/utils"
import type { RecommendationResult, Recommendation } from "@/lib/types"

export default function ShareableResultsPage() {
  const params = useParams()
  const slug = params.slug as string

  const [result, setResult] = useState<RecommendationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getResult(slug)
        setResult(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load results")
      } finally {
        setLoading(false)
      }
    }

    fetchResult()
  }, [slug])

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/results/${slug}`
    await copyToClipboard(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)

    // Track event
    await apiClient.trackEvent({
      eventType: "result_shared",
      treeId: result?.treeId || "",
      timestamp: new Date().toISOString(),
    })
  }

  if (loading) return <Loading />
  if (error) return <ErrorMessage title="Error" message={error} onRetry={() => window.location.reload()} />
  if (!result) return <ErrorMessage title="Not Found" message="Results not found" />

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-b from-accent/5 to-transparent">
        <div className="container-max py-12 lg:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-accent/10 text-accent text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Analysis Complete
            </div>
            
            <h1 className="heading-1 mb-4">
              Your Architecture Recommendation
            </h1>
            
            <p className="text-lg text-muted-foreground mb-6">
              You answered {result.answers.length} questions. Here&apos;s what fits your requirements.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-hover transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Link Copied!" : "Share Results"}
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg font-medium hover:bg-surface transition-colors"
              >
                Start New Journey
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-12 lg:py-16">
        <div className="container-max">
          <div className="max-w-3xl mx-auto">
            <div className="p-8 rounded-xl border border-border bg-card">
              {/* Top Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-accent/10 text-accent text-sm font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Recommended for You
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold mb-2">{result.result.result.name}</h2>
              
              {/* Confidence */}
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-secondary text-sm font-medium mb-6">
                Confidence: <span className="capitalize">{result.result.confidence}</span>
              </div>

              {/* Reasoning */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Why this choice?</h3>
                <p className="text-foreground">{result.result.result.reasoning}</p>
              </div>

              {/* Best For */}
              <div className="mb-6 p-4 rounded-lg bg-accent/5 border border-accent/20">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-accent mb-2">Best For</h3>
                <p className="text-foreground">{result.result.result.bestFor}</p>
              </div>

              {/* Trade-offs */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Trade-offs</h3>
                <div className="space-y-2">
                  {result.result.result.tradeoffs.map((tradeoff, idx) => {
                    const isPositive = tradeoff.startsWith('✅')
                    const isNegative = tradeoff.startsWith('❌')
                    const cleanText = tradeoff.replace(/^[✅❌]\s*/, '')
                    
                    return (
                      <div key={idx} className="flex items-start gap-2">
                        {isPositive ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        ) : isNegative ? (
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <span className="text-muted-foreground mt-1">•</span>
                        )}
                        <span className="text-foreground">{cleanText}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* When to Reconsider */}
              <div className="p-4 rounded-lg bg-secondary">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">When to Reconsider</h3>
                <p className="text-foreground">{result.result.result.whenToReconsider}</p>
              </div>

              {/* Scores */}
              {result.result.scores && Object.keys(result.result.scores).length > 1 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">All Options Scored</h3>
                  <div className="space-y-2">
                    {Object.entries(result.result.scores)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([tech, score]) => (
                        <div key={tech} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{tech.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${((score as number) / Math.max(...Object.values(result.result.scores))) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8 text-right">{score}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Tie Breaker */}
              {result.result.tieBreaker && (
                <div className="mt-6 p-3 rounded-lg bg-muted text-sm">
                  <span className="font-medium">Note:</span> {result.result.tieBreaker}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Your Journey Section */}
      {result.answers && result.answers.length > 0 && (
        <section className="py-12 lg:py-16 border-t border-border">
          <div className="container-max">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">What You Told Us</h2>
              
              <div className="space-y-3">
                {result.answers.map((answer, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-secondary border border-border">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <div className="text-sm text-muted-foreground">
                        Question {answer.questionId} → Option {answer.optionId}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

function RecommendationCard({ recommendation, rank, isTop }: { recommendation: Recommendation; rank: number; isTop: boolean }) {
  const [expanded, setExpanded] = useState(isTop)
  
  return (
    <div className={`rounded-2xl border transition-all ${isTop ? "border-accent shadow-lg shadow-accent/10" : "border-border"}`}>
      {/* Header */}
      <div 
        className={`p-6 cursor-pointer ${isTop ? "bg-accent/5" : "bg-card"} rounded-t-2xl`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Rank badge */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
              isTop 
                ? "bg-accent text-accent-foreground" 
                : "bg-secondary text-secondary-foreground"
            }`}>
              {rank}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold">{recommendation.name}</h3>
                {isTop && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                    <Sparkles className="w-3 h-3" />
                    Best Match
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{recommendation.category}</p>
            </div>
          </div>
          
          <button className="p-2 hover:bg-surface rounded-lg transition-colors">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      {/* Expanded content */}
      {expanded && (
        <div className="p-6 pt-0 space-y-6">
          {/* Description */}
          <div>
            <p className="text-muted-foreground">{recommendation.description}</p>
          </div>
          
          {/* Reasoning */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <h4 className="font-semibold text-sm mb-2 text-primary">Why this recommendation?</h4>
            <p className="text-sm text-muted-foreground">{recommendation.reasoning}</p>
          </div>
          
          {/* Trade-offs Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Pros */}
            {recommendation.pros.length > 0 && (
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                <h4 className="flex items-center gap-2 font-semibold text-sm mb-3 text-accent">
                  <ThumbsUp className="w-4 h-4" />
                  Advantages
                </h4>
                <ul className="space-y-2">
                  {recommendation.pros.map((pro, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Cons */}
            {recommendation.cons.length > 0 && (
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                <h4 className="flex items-center gap-2 font-semibold text-sm mb-3 text-destructive">
                  <ThumbsDown className="w-4 h-4" />
                  Trade-offs
                </h4>
                <ul className="space-y-2">
                  {recommendation.cons.map((con, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0 text-center">−</span>
                      <span className="text-muted-foreground">{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Resources */}
          {recommendation.resources && recommendation.resources.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-3">Learn More</h4>
              <div className="flex flex-wrap gap-2">
                {recommendation.resources.map((resource, idx) => (
                  <a
                    key={idx}
                    href={resource}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border hover:border-primary hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Resource {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
