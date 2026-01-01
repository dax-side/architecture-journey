import { GitFork } from "lucide-react"

export function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <GitFork className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" />
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
