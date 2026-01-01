// Analytics utilities
import type { AnalyticsEvent } from "@/lib/types"

// Generate or retrieve session ID
function getSessionId(): string {
  if (typeof window === "undefined") return ""
  
  let sessionId = window.sessionStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    window.sessionStorage.setItem('analytics_session_id', sessionId)
  }
  return sessionId
}

// Track event with backend
export async function trackEvent(event: AnalyticsEvent) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    await fetch(`${API_BASE_URL}/api/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: event.eventType,
        treeId: event.treeId,
        sessionId: getSessionId(),
        timestamp: event.timestamp,
        metadata: event.metadata,
      }),
    }).catch(() => {
      // Analytics failures should not break the app
    })
  } catch {
    // Silently fail
  }
}
