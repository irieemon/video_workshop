import { cn } from '@/lib/utils'
import { Sparkles, Zap, Globe, Layout } from 'lucide-react'

export type SubBrand = 'ai' | 'flow' | 'verse' | 'studio'

interface SubBrandBadgeProps {
  brand: SubBrand
  className?: string
  showIcon?: boolean
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const brandConfig = {
  ai: {
    label: 'Scenra AI',
    color: 'scenra-ai',
    Icon: Sparkles,
    description: 'Generative Engine',
  },
  flow: {
    label: 'Scenra Flow',
    color: 'scenra-flow',
    Icon: Zap,
    description: 'Creative Pipeline',
  },
  verse: {
    label: 'Scenra Verse',
    color: 'scenra-verse',
    Icon: Globe,
    description: 'World Building',
  },
  studio: {
    label: 'Scenra Studio',
    color: 'scenra-studio',
    Icon: Layout,
    description: 'Creative Workspace',
  },
}

export function SubBrandBadge({
  brand,
  className,
  showIcon = true,
  showText = true,
  size = 'sm',
}: SubBrandBadgeProps) {
  const config = brandConfig[brand]
  const Icon = config.Icon

  const sizeClasses = {
    sm: {
      container: 'text-xs gap-1 px-2 py-1',
      icon: 'h-3 w-3',
    },
    md: {
      container: 'text-sm gap-1.5 px-2.5 py-1.5',
      icon: 'h-4 w-4',
    },
    lg: {
      container: 'text-base gap-2 px-3 py-2',
      icon: 'h-5 w-5',
    },
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        `bg-${config.color}/10 text-${config.color} border border-${config.color}/20`,
        sizeClasses[size].container,
        className
      )}
      style={{
        backgroundColor: `color-mix(in srgb, var(--color-${config.color}) 10%, transparent)`,
        color: `var(--color-${config.color})`,
        borderColor: `color-mix(in srgb, var(--color-${config.color}) 20%, transparent)`,
      }}
    >
      {showIcon && <Icon className={sizeClasses[size].icon} />}
      {showText && <span>{config.label}</span>}
    </div>
  )
}

export function SubBrandSection({
  brand,
  title,
  description,
  children,
  className,
}: {
  brand: SubBrand
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  const config = brandConfig[brand]
  const Icon = config.Icon

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              className="p-2 rounded-lg"
              style={{
                backgroundColor: `color-mix(in srgb, var(--color-${config.color}) 10%, transparent)`,
              }}
            >
              <Icon
                className="h-5 w-5"
                style={{ color: `var(--color-${config.color})` }}
              />
            </div>
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground ml-11">{description}</p>
          )}
        </div>
        <SubBrandBadge brand={brand} />
      </div>
      {children}
    </div>
  )
}
