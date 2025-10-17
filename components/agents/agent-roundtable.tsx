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
}

export function AgentRoundtable({ discussion }: AgentRoundtableProps) {
  return (
    <div className="space-y-6">
      {/* Round 1: Initial Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Round 1: Initial Analysis</CardTitle>
          <CardDescription>
            Each expert analyzes your brief from their unique perspective
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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

      {/* Round 2: Debate & Refinement */}
      <Card>
        <CardHeader>
          <CardTitle>Round 2: Collaborative Refinement</CardTitle>
          <CardDescription>
            Experts challenge, respond, and build on each other&apos;s ideas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {discussion.round2.map((item, index) => (
            <div key={`r2-${index}`} className="relative">
              {/* Threading line for visual connection */}
              {(item.respondingTo || item.buildingOn) && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sage-300 to-transparent opacity-30" />
              )}
              <div className={item.respondingTo || item.buildingOn ? 'pl-6' : ''}>
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
    </div>
  )
}
