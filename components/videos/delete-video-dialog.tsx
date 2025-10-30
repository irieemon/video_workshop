'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface DeleteVideoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoTitle: string
  onConfirm: () => Promise<void>
  isDeleting?: boolean
}

export function DeleteVideoDialog({
  open,
  onOpenChange,
  videoTitle,
  onConfirm,
  isDeleting = false,
}: DeleteVideoDialogProps) {
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = async () => {
    if (!confirmed) return
    await onConfirm()
    setConfirmed(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Video</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">
                  &quot;{videoTitle}&quot;
                </span>
                ?
              </p>
              <p className="text-destructive">
                This action cannot be undone. This will permanently delete the
                video and all associated data including AI-generated content,
                prompts, and hashtags.
              </p>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="confirm-delete"
                  checked={confirmed}
                  onCheckedChange={(checked) =>
                    setConfirmed(checked === true)
                  }
                  disabled={isDeleting}
                />
                <Label
                  htmlFor="confirm-delete"
                  className="text-sm font-normal cursor-pointer"
                >
                  I understand this action is permanent
                </Label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!confirmed || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Video'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
