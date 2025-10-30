'use client'

import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type ViewMode = 'card' | 'list'

interface VideosViewToggleProps {
  view: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function VideosViewToggle({ view, onViewChange }: VideosViewToggleProps) {
  return (
    <TooltipProvider>
      <div className="flex gap-1 border rounded-md p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={view === 'card' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('card')}
              className="h-8 w-8 p-0"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Card View</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('list')}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>List View</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
