import { cn } from '@/lib/utils'

interface ScenraLogoProps {
  className?: string
  variant?: 'full' | 'icon' | 'wordmark'
  size?: 'sm' | 'md' | 'lg'
}

export function ScenraLogo({
  className,
  variant = 'full',
  size = 'md'
}: ScenraLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  }

  const textSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl'
  }

  // Placeholder icon - replace with actual SVG logo when available
  const Icon = () => (
    <div className={cn(
      sizeClasses[size],
      'rounded-lg bg-gradient-to-br from-scenra-amber to-scenra-highlight flex items-center justify-center',
      'shadow-md'
    )}>
      <span className="text-white font-bold text-sm">S</span>
    </div>
  )

  if (variant === 'icon') {
    return <Icon />
  }

  if (variant === 'wordmark') {
    return (
      <span className={cn(
        'font-bold bg-gradient-to-r from-scenra-amber to-scenra-highlight bg-clip-text text-transparent',
        textSizeClasses[size],
        className
      )}>
        SCENRA
      </span>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Icon />
      <span className={cn(
        'font-bold bg-gradient-to-r from-scenra-amber to-scenra-highlight bg-clip-text text-transparent',
        textSizeClasses[size]
      )}>
        SCENRA
      </span>
    </div>
  )
}
