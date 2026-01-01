"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  Activity, 
  CheckCircle2,
  Eye,
  BarChart3,
  Settings
} from "lucide-react"
import { Loading } from "@/components/loading"
import { ErrorMessage } from "@/components/error-message"

interface DashboardData {
  summary: {
    totalResults: number
    totalEvents: number
    uniqueSessions: number
    completionRate: string
    treeStarts: number
    resultsGenerated: number
  }
  eventsByType: Array<{ event: string; count: number }>
  popularTrees: Array<{ treeId: string; starts: number }>
  topSharedResults: Array<{
    treeId: string
    slug: string
    views: number
    recommendation: string
    createdAt: string
  }>
  popularPaths: Array<{
    treeId: string
    recommendation: string
    count: number
  }>
  dailyActivity: Array<{ date: string; count: number }>
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true)
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
          credentials: "include", // Send httpOnly cookies
        })

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/admin")
            return
          }
          throw new Error("Failed to fetch dashboard data")
        }

        const result = await response.json()
        setData(result.data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [router])

  const handleLogout = async () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    await fetch(`${API_BASE_URL}/api/admin/logout`, {
      method: "POST",
      credentials: "include",
    })
    router.push("/admin")
  }

  if (loading) return <Loading />
  if (error) return <ErrorMessage title="Error" message={error} onRetry={() => window.location.reload()} />
  if (!data) return null

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container-max py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link
                href="/admin/settings"
                className="text-muted-foreground hover:text-foreground"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-max py-8">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Unique Sessions"
            value={data.summary.uniqueSessions?.toLocaleString() || '0'}
            color="text-blue-500"
          />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Events (30d)"
            value={data.summary.totalEvents.toLocaleString()}
            color="text-purple-500"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Completion Rate"
            value={data.summary.completionRate}
            color="text-emerald-500"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Trees Started"
            value={data.summary.treeStarts.toLocaleString()}
            color="text-orange-500"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Events by Type */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Events by Type
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Tracks: tree_started, question_answered, result_generated, result_shared
            </p>
            <div className="space-y-3">
              {data.eventsByType.map((event) => (
                <div key={event.event} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{event.event.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${(event.count / Math.max(...data.eventsByType.map(e => e.count))) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{event.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Trees */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <h2 className="text-lg font-semibold mb-4">Popular Trees</h2>
            <div className="space-y-3">
              {data.popularTrees.map((tree) => (
                <div key={tree.treeId} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <span className="text-sm capitalize">{tree.treeId.replace(/-/g, " ")}</span>
                  <span className="text-sm font-bold text-primary">{tree.starts} starts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Shared Results */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Top Shared Results
            </h2>
            <div className="space-y-2">
              {data.topSharedResults.slice(0, 5).map((result) => (
                <div key={result.slug} className="p-3 rounded-lg bg-secondary text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium capitalize">
                      {result.recommendation?.replace(/_/g, " ")}
                    </span>
                    <span className="text-muted-foreground">{result.views} views</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {result.treeId.replace(/-/g, " ")} • {new Date(result.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Paths */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <h2 className="text-lg font-semibold mb-4">Popular Decision Paths</h2>
            <div className="space-y-2">
              {data.popularPaths.map((path, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-secondary text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium capitalize">
                        {path.recommendation?.replace(/_/g, " ")}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {path.treeId?.replace(/-/g, " ")}
                      </div>
                    </div>
                    <span className="font-bold text-primary">{path.count}x</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Activity Chart */}
        <div className="mt-6 p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">Activity (Last 7 Days)</h2>
          <div className="flex items-end justify-between gap-2 h-48">
            {data.dailyActivity.map((day) => {
              const maxCount = Math.max(...data.dailyActivity.map(d => d.count))
              const height = (day.count / maxCount) * 100
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-xs font-medium text-primary">{day.count}</div>
                  <div
                    className="w-full bg-primary rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <div className="text-xs text-muted-foreground">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}

function StatCard({ icon, label, value, color }: { 
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card">
      <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  )
}
