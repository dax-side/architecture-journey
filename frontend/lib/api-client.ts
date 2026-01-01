const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
import { trackEvent } from "@/lib/analytics"

export const apiClient = {
  async getTrees() {
    const response = await fetch(`${API_BASE_URL}/api/trees`)
    if (!response.ok) throw new Error("Failed to fetch trees")
    const result = await response.json()
    // Backend returns { success: true, data: { trees: [...] } }
    return result.data?.trees || result.trees || []
  },

  async getTree(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/trees/${id}`)
    if (!response.ok) throw new Error("Failed to fetch tree")
    const result = await response.json()
    const tree = result.data || result
    
    // Transform backend format (label) to frontend format (text)
    if (tree.questions) {
      tree.questions = tree.questions.map((q: any) => ({
        ...q,
        options: q.options.map((opt: any) => ({
          ...opt,
          text: opt.text || opt.label, // Map label to text
          isTerminal: opt.nextQuestionId === null,
        })),
      }))
    }
    return tree
  },

  async getRecommendations(treeId: string, answers: any[]) {
    const response = await fetch(`${API_BASE_URL}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ treeId, answers }),
    })
    if (!response.ok) throw new Error("Failed to get recommendations")
    const result = await response.json()
    return result.data || result
  },

  async saveResult(result: any) {
    const response = await fetch(`${API_BASE_URL}/api/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    })
    if (!response.ok) throw new Error("Failed to save result")
    const data = await response.json()
    return data.data || data
  },

  async getResult(slug: string) {
    const response = await fetch(`${API_BASE_URL}/api/results/${slug}`)
    if (!response.ok) throw new Error("Failed to fetch result")
    const result = await response.json()
    return result.data || result
  },

  async trackEvent(event: any) {
    await trackEvent(event)
  },
}
