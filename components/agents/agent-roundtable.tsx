import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AgentCard } from './agent-card'

interface AgentRoundtableProps {
  discussion: {
    round1: Array<{
      agent: string
      response: string
    }>
    round2: Array<{
      agent: string
      response: string
      isChallenge?: boolean
      respondingTo?: string
      buildingOn?: string[]
    }>
  }
  onReviewClick?: () => void
}

export function AgentRoundtable({ discussion, onReviewClick }: AgentRoundtableProps) {
  // Defensive check: ensure discussion has required arrays
  if (!discussion || !Array.isArray(discussion.round1) || !Array.isArray(discussion.round2)) {
    console.error('Invalid discussion structure:', discussion)
    return null
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Round 1: Initial Analysis */}
      {discussion.round1.length > 0 && (
        <Card
          className={onReviewClick ? "cursor-pointer hover:border-sage-400 transition-colors" : ""}
          onClick={onReviewClick}
        >
          <CardHeader className="pb-3 md:pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg md:text-xl">Round 1: Initial Analysis</CardTitle>
                <CardDescription className="text-sm">
                  Each expert analyzes your brief from their unique perspective
                </CardDescription>
              </div>
              {onReviewClick && (
                <span className="text-xs text-sage-600 font-medium">Click to review →</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
              {discussion.round1.map((item, index) => (
                <AgentCard
                  key={`r1-${index}`}
                  agent={item.agent}
                  response={item.response}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Round 2: Debate & Refinement */}
      {discussion.round2.length > 0 && (
        <Card
          className={onReviewClick ? "cursor-pointer hover:border-sage-400 transition-colors" : ""}
          onClick={onReviewClick}
        >
          <CardHeader className="pb-3 md:pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg md:text-xl">Round 2: Collaborative Refinement</CardTitle>
                <CardDescription className="text-sm">
                  Experts challenge, respond, and build on each other&apos;s ideas
                </CardDescription>
              </div>
              {onReviewClick && (
                <span className="text-xs text-sage-600 font-medium">Click to review →</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            {discussion.round2.map((item, index) => (
              <div key={`r2-${index}`} className="relative">
                {/* Threading line for visual connection */}
                {(item.respondingTo || item.buildingOn) && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 md:w-1 bg-gradient-to-b from-sage-300 to-transparent opacity-30" />
                )}
                <div className={item.respondingTo || item.buildingOn ? 'pl-3 md:pl-6' : ''}>
                  <AgentCard
                    agent={item.agent}
                    response={item.response}
                    isChallenge={item.isChallenge}
                    respondingTo={item.respondingTo}
                    buildingOn={item.buildingOn}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
