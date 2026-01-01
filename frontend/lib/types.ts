export interface Option {
  id: string
  text: string
  label?: string
  nextQuestionId?: string | null
  isTerminal?: boolean
  scores?: Record<string, number>
}

export interface Question {
  id: string
  text: string
  description?: string
  options: Option[]
}

export interface Answer {
  questionId: string
  optionId: string
}

// Summary returned by /api/trees
export interface TreeSummary {
  id: string
  title: string
  description: string
  questionCount: number
  estimatedTime: string
}

// Full tree returned by /api/trees/:id
export interface DecisionTree {
  id: string
  title: string
  description: string
  version: string
  questions: Question[]
  results: Record<string, any>
}

export interface RecommendationResult {
  id: string
  treeId: string
  answers: Answer[]
  recommendations: Recommendation[]
  createdAt: string
  slug?: string
}

export interface Recommendation {
  id: string
  name: string
  description: string
  reasoning: string
  category: string
  pros: string[]
  cons: string[]
  resources?: string[]
}

export interface AnalyticsEvent {
  eventType: "tree_started" | "question_answered" | "result_generated" | "result_shared"
  treeId: string
  timestamp: string
  metadata?: Record<string, unknown>
}
