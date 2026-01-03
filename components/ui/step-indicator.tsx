'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface Step {
  label: string
  description?: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep

        return (
          <div key={index} className="flex items-center gap-2">
            {/* Step Circle */}
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                isCompleted && 'bg-green-500 text-white',
                isCurrent && 'bg-primary text-primary-foreground',
                !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                stepNumber
              )}
            </div>

            {/* Step Label (visible on larger screens) */}
            <span
              className={cn(
                'hidden text-sm font-medium sm:inline',
                isCurrent && 'text-foreground',
                !isCurrent && 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-8 sm:w-12',
                  stepNumber < currentStep ? 'bg-green-500' : 'bg-muted'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
