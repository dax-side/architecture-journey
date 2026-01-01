"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, GitFork, Zap, Target, Share2 } from "lucide-react"
import { Loading } from "@/components/loading"
import { ErrorMessage } from "@/components/error-message"
import { apiClient } from "@/lib/api-client"
import type { TreeSummary } from "@/lib/types"

export default function HomePage() {
  const [trees, setTrees] = useState<TreeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrees = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getTrees()
        setTrees(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load decision trees")
      } finally {
        setLoading(false)
      }
    }

    fetchTrees()
  }, [])

  if (loading) return <Loading />
  if (error) return <ErrorMessage title="Error" message={error} onRetry={() => window.location.reload()} />

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="border-b border-border">
        <div className="container-max py-16 lg:py-24">
          <div className="max-w-3xl">
            {/* Headline */}
            <h1 className="heading-1 mb-6 text-balance">
              Pick the Right{" "}
              <span className="text-accent">Architecture</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
              Answer questions about your project. Get specific recommendations for architecture styles, databases, and tech stacks.
            </p>
            
            {/* CTA */}
            <Link 
              href="#decision-trees"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-hover"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 border-b border-border">
        <div className="container-max">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Target className="w-5 h-5" />}
              title="Guided Decisions"
              description="Answer questions about your project. Get recommendations that match your needs."
            />
            <FeatureCard
              icon={<Zap className="w-5 h-5" />}
              title="Trade-off Analysis"
              description="See the pros and cons. No option is perfect—here's what you're getting into."
            />
            <FeatureCard
              icon={<Share2 className="w-5 h-5" />}
              title="Shareable Results"
              description="Save your results. Share them with your team through a unique URL."
            />
          </div>
        </div>
      </section>

      {/* Decision Trees Section */}
      <section id="decision-trees" className="py-16">
        <div className="container-max">
          <div className="mb-10">
            <h2 className="heading-2 mb-3">Decision Trees</h2>
            <p className="text-muted-foreground max-w-2xl">
              Pick a topic, answer some questions, get recommendations.
            </p>
          </div>

          {trees.length === 0 ? (
            <div className="text-center py-16 border border-border rounded-xl">
              <p className="text-muted-foreground">No decision trees available.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {trees.map((tree) => (
                <TreeCard key={tree.id} tree={tree} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container-max">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Architecture Journey</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-foreground">About</a>
              <a href="#" className="hover:text-foreground">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border border-border">
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function TreeCard({ tree }: { tree: TreeSummary }) {
  const getCategory = (id: string) => {
    if (id.includes('database')) return 'Database'
    if (id.includes('architecture')) return 'Architecture'
    return 'General'
  }

  return (
    <Link 
      href={`/tree/${tree.id}`}
      className="group block p-6 rounded-lg border border-border hover:border-foreground"
    >
      <div className="inline-block px-2.5 py-0.5 rounded bg-secondary text-xs font-medium mb-3">
        {getCategory(tree.id)}
      </div>
      
      <h3 className="text-xl font-semibold mb-2">
        {tree.title}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-4">
        {tree.description}
      </p>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {tree.questionCount} questions
        </span>
        <span className="text-foreground flex items-center gap-1">
          Start
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  )
}
