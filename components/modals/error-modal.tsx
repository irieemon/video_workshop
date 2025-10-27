'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  retryAction?: () => void
  retryLabel?: string
}

export function ErrorModal({
  isOpen,
  onClose,
  title,
  message,
  retryAction,
  retryLabel = 'Retry',
}: ErrorModalProps) {
  const handleRetry = () => {
    if (retryAction) {
      retryAction()
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {retryAction && (
            <Button onClick={handleRetry}>{retryLabel}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
