const SESSION_KEY = "architecture_journey_session"

export interface SessionData {
  treeId: string
  answers: any[]
  startedAt: string
}

export const sessionStorage = {
  getSession(): SessionData | null {
    if (typeof window === "undefined") return null
    const data = window.sessionStorage.getItem(SESSION_KEY)
    return data ? JSON.parse(data) : null
  },

  setSession(data: SessionData): void {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
  },

  updateAnswers(answers: any[]): void {
    if (typeof window === "undefined") return
    const session = this.getSession()
    if (session) {
      session.answers = answers
      this.setSession(session)
    }
  },

  clearSession(): void {
    if (typeof window === "undefined") return
    window.sessionStorage.removeItem(SESSION_KEY)
  },
}
