import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Film,
  Camera,
  TrendingUp,
  Users,
  Music,
} from 'lucide-react'

interface AgentCardProps {
  agent: string
  response: string
  isChallenge?: boolean
  respondingTo?: string
  buildingOn?: string[]
}

const agentConfig = {
  director: {
    name: 'Director',
    color: 'border-l-[#3B4A5C]',
    bgColor: 'bg-[#3B4A5C]/10',
    textColor: 'text-[#3B4A5C]',
    icon: Film,
  },
  cinematographer: {
    name: 'Cinematographer',
    color: 'border-l-[#7C9473]',
    bgColor: 'bg-[#7C9473]/10',
    textColor: 'text-[#7C9473]',
    icon: Camera,
  },
  editor: {
    name: 'Editor',
    color: 'border-l-[#C97064]',
    bgColor: 'bg-[#C97064]/10',
    textColor: 'text-[#C97064]',
    icon: Film,
  },
  colorist: {
    name: 'Colorist',
    color: 'border-l-[#8B7C6B]',
    bgColor: 'bg-[#8B7C6B]/10',
    textColor: 'text-[#8B7C6B]',
    icon: Film,
  },
  platform_expert: {
    name: 'Platform Expert',
    color: 'border-l-[#5A6D52]',
    bgColor: 'bg-[#5A6D52]/10',
    textColor: 'text-[#5A6D52]',
    icon: TrendingUp,
  },
}

export function AgentCard({
  agent,
  response,
  isChallenge,
  respondingTo,
  buildingOn,
}: AgentCardProps) {
  const config = agentConfig[agent as keyof typeof agentConfig] || agentConfig.director
  const Icon = config.icon

  return (
    <div className={cn('relative rounded-lg border-l-4 bg-white dark:bg-card border-gray-200 dark:border-border p-4', config.color)}>
      <div className="flex items-start gap-3">
        <div className={cn('rounded-full p-2', config.bgColor)}>
          <Icon className={cn('h-5 w-5', config.textColor)} />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('font-semibold text-sm uppercase', config.textColor)}>
              {config.name}
            </span>
            {isChallenge && respondingTo && (
              <Badge variant="outline" className="text-xs border-gray-300 dark:border-border text-gray-700 dark:text-muted-foreground">
                Challenges {agentConfig[respondingTo as keyof typeof agentConfig]?.name || respondingTo}
              </Badge>
            )}
            {respondingTo && !isChallenge && (
              <Badge variant="outline" className="text-xs border-gray-300 dark:border-border text-gray-700 dark:text-muted-foreground">
                Responds to {agentConfig[respondingTo as keyof typeof agentConfig]?.name || respondingTo}
              </Badge>
            )}
            {buildingOn && buildingOn.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-secondary text-gray-700 dark:text-secondary-foreground">
                Builds on consensus
              </Badge>
            )}
          </div>

          <p className="text-sm leading-relaxed text-gray-700 dark:text-scenra-light">
            {response}
          </p>
        </div>
      </div>
    </div>
  )
}
