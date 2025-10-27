# Browser Dialog Analysis & Modal Replacement Plan

**Date**: 2025-10-26
**Status**: Analysis Complete - Implementation Plan Ready

## Executive Summary

Found **18 alert() calls** and **11 confirm() calls** across the application that need replacement with custom modal components. No `prompt()` calls found. All browser native dialogs should be replaced with consistent, accessible modal components for better UX.

---

## Analysis Results

### Alert() Calls - 18 Total

#### Error Alerts (13 instances)
User-facing error messages that should become error modals or toast notifications:

1. **components/videos/episode-scene-selector.tsx:99**
   - Context: Failed scene-to-video conversion
   - Message: "Failed to convert scene to video. Please try again."
   - Replacement: Error modal with retry action

2. **components/videos/episode-selector.tsx:174**
   - Context: Failed episode data load
   - Message: "Failed to load episode data"
   - Replacement: Error toast notification

3. **app/admin/users/page.tsx:104**
   - Context: Failed user update
   - Message: "Failed to update user"
   - Replacement: Admin error modal

4. **components/screenplay/screenplay-chat.tsx:161**
   - Context: Failed screenplay session start
   - Message: "Failed to start screenplay session"
   - Replacement: Error modal with retry option

5. **components/screenplay/screenplay-chat.tsx:297**
   - Context: Failed save progress
   - Message: "Failed to save progress"
   - Replacement: Error modal with manual save option

6. **components/screenplay/scene-list.tsx:104**
   - Context: Failed scene delete
   - Message: "Failed to delete scene"
   - Replacement: Error toast notification

7. **components/screenplay/episode-manager.tsx:82**
   - Context: Failed episode delete
   - Message: "Failed to delete episode"
   - Replacement: Error toast notification

8. **components/series/concept-agent-dialog.tsx:135**
   - Context: Failed message send
   - Message: "Failed to send message"
   - Replacement: Error toast notification

9. **components/series/concept-agent-dialog.tsx:165**
   - Context: Failed series generation
   - Message: "Failed to generate series concept"
   - Replacement: Error modal with retry option

10. **components/series/character-manager.tsx:164**
    - Context: Error in character operations
    - Message: error.message
    - Replacement: Error toast notification

11. **components/series/associate-series-dialog.tsx:85**
    - Context: Failed series association
    - Message: "Failed to associate series with project"
    - Replacement: Error modal

12. **components/series/visual-asset-gallery.tsx:77**
    - Context: Failed asset delete
    - Message: "Failed to delete visual asset"
    - Replacement: Error toast notification

13. **components/series/setting-manager.tsx:144**
    - Context: Error in setting operations
    - Message: error.message
    - Replacement: Error toast notification

#### Success Alerts (3 instances)
Success notifications that should become toast notifications:

14. **components/screenplay/scene-list.tsx:110**
    - Context: Scene prompt copied to clipboard
    - Message: "Scene prompt copied to clipboard!"
    - Replacement: Success toast notification

15. **components/screenplay/scene-list.tsx:124**
    - Context: Scene link copied to clipboard
    - Message: "Scene link copied to clipboard!"
    - Replacement: Success toast notification

#### Warning Alerts (1 instance)

16. **components/screenplay/scene-list.tsx:115**
    - Context: No prompt available to copy
    - Message: "No prompt available for this scene"
    - Replacement: Warning toast notification

#### Documentation (1 instance)

17. **components/series/concept-preview.tsx:46**
    - Context: Failed to create series
    - Message: "Failed to create series from concept"
    - Replacement: Error modal with retry option

---

### Confirm() Calls - 11 Total

#### Delete Confirmations (5 instances)

1. **components/screenplay/scene-list.tsx:90**
   ```typescript
   if (window.confirm('Are you sure you want to delete this scene?'))
   ```
   - Context: Scene deletion
   - Replacement: Confirmation modal with "Delete" and "Cancel" actions

2. **components/screenplay/episode-manager.tsx:67**
   ```typescript
   if (window.confirm(`Are you sure you want to delete episode "${episode.title}"?`))
   ```
   - Context: Episode deletion
   - Replacement: Confirmation modal with episode name display

3. **components/series/character-manager.tsx:150**
   ```typescript
   if (window.confirm(`Are you sure you want to delete ${character.name}?`))
   ```
   - Context: Character deletion
   - Replacement: Confirmation modal with character name display

4. **components/series/setting-manager.tsx:130**
   ```typescript
   if (window.confirm(`Are you sure you want to delete ${setting.name}?`))
   ```
   - Context: Setting deletion
   - Replacement: Confirmation modal with setting name display

#### State Change Confirmations (2 instances)

5. **components/videos/sora-generation-modal.tsx:171**
   ```typescript
   if (window.confirm('Video generation is in progress. Are you sure you want to close?'))
   ```
   - Context: Close during active generation
   - Replacement: Warning modal with progress preservation info

6. **components/videos/sora-generation-modal.tsx:202**
   ```typescript
   if (window.confirm('Are you sure you want to reset? This will clear all your work.'))
   ```
   - Context: Reset video generation form
   - Replacement: Destructive action confirmation modal

#### Admin Action Confirmations (2 instances)

7. **app/admin/users/page.tsx:114**
   ```typescript
   if (!window.confirm(`Are you sure you want to ${action} ${email}?`))
   ```
   - Context: Admin user actions (suspend, activate, etc.)
   - Replacement: Admin confirmation modal with action name

8. **app/admin/users/page.tsx:120**
   ```typescript
   if (!window.confirm(`Change tier for ${email} to ${tier}?`))
   ```
   - Context: User tier changes
   - Replacement: Tier change confirmation modal

---

## Modal Component Architecture

### 1. Core Modal Components to Create

#### ErrorModal Component
**File**: `components/modals/error-modal.tsx`

```typescript
interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  retryAction?: () => void
  retryLabel?: string
}

// Features:
// - Error icon with red color scheme
// - Clear error message display
// - Optional retry button
// - Close button
// - Escape key support
```

#### ConfirmModal Component
**File**: `components/modals/confirm-modal.tsx`

```typescript
interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive' | 'warning'
}

// Features:
// - Flexible variant styling (destructive for delete, warning for state changes)
// - Two-button layout (Cancel/Confirm)
// - Keyboard support (Enter for confirm, Escape for cancel)
// - Optional custom button labels
```

#### Toast Notification System
**File**: `components/ui/toast.tsx` (Already exists via shadcn/ui)

```typescript
// Use existing shadcn/ui toast system
// Import: import { useToast } from '@/components/ui/use-toast'

// Usage patterns:
toast({
  title: "Success",
  description: "Operation completed successfully",
  variant: "default"
})

toast({
  title: "Error",
  description: "Operation failed",
  variant: "destructive"
})

toast({
  title: "Warning",
  description: "Please review this action",
  variant: "warning"
})
```

### 2. Modal Context Provider

**File**: `components/providers/modal-provider.tsx`

```typescript
interface ModalContextValue {
  showError: (title: string, message: string, retryAction?: () => void) => void
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    variant?: 'default' | 'destructive' | 'warning'
  ) => Promise<boolean>
  closeModal: () => void
}

// Centralized modal state management
// Single source of truth for all modals
// Prevents multiple modals from opening
```

---

## Implementation Plan

### Phase 1: Foundation (Priority: HIGH)
**Create reusable modal components**

1. ✅ Verify shadcn/ui toast is installed
2. Create `ErrorModal` component
3. Create `ConfirmModal` component
4. Create `ModalProvider` context
5. Add `ModalProvider` to root layout

**Estimated Time**: 2 hours

### Phase 2: Toast Replacements (Priority: HIGH)
**Replace simple alert() calls with toast notifications**

**Success Notifications (3 instances)**:
- `scene-list.tsx:110` - Clipboard copy success
- `scene-list.tsx:124` - Scene link copy success

**Error Notifications (6 instances)**:
- `episode-selector.tsx:174` - Failed episode load
- `scene-list.tsx:104` - Failed scene delete
- `episode-manager.tsx:82` - Failed episode delete
- `concept-agent-dialog.tsx:135` - Failed message send
- `character-manager.tsx:164` - Character operation errors
- `setting-manager.tsx:144` - Setting operation errors
- `visual-asset-gallery.tsx:77` - Failed asset delete

**Warning Notification (1 instance)**:
- `scene-list.tsx:115` - No prompt available

**Pattern**:
```typescript
// Before:
alert('Success message')

// After:
import { useToast } from '@/components/ui/use-toast'
const { toast } = useToast()

toast({
  title: "Success",
  description: "Success message",
})
```

**Estimated Time**: 1 hour

### Phase 3: Error Modal Replacements (Priority: MEDIUM)
**Replace critical error alerts with modal dialogs**

**Error Modals with Retry (4 instances)**:
- `episode-scene-selector.tsx:99` - Scene conversion failure
- `screenplay-chat.tsx:161` - Session start failure
- `screenplay-chat.tsx:297` - Save progress failure
- `concept-agent-dialog.tsx:165` - Series generation failure
- `concept-preview.tsx:46` - Series creation failure

**Error Modals without Retry (3 instances)**:
- `admin/users/page.tsx:104` - Admin user update failure
- `associate-series-dialog.tsx:85` - Series association failure

**Pattern**:
```typescript
// Before:
catch (error) {
  alert('Failed to convert scene to video. Please try again.')
}

// After:
import { useModal } from '@/components/providers/modal-provider'
const { showError } = useModal()

catch (error) {
  showError(
    'Conversion Failed',
    'Failed to convert scene to video. Please try again.',
    () => handleConvertScene(sceneId) // Retry action
  )
}
```

**Estimated Time**: 2 hours

### Phase 4: Confirmation Modal Replacements (Priority: HIGH)
**Replace confirm() calls with confirmation modals**

**Delete Confirmations (4 instances)**:
- `scene-list.tsx:90` - Scene deletion
- `episode-manager.tsx:67` - Episode deletion
- `character-manager.tsx:150` - Character deletion
- `setting-manager.tsx:130` - Setting deletion

**State Change Confirmations (2 instances)**:
- `sora-generation-modal.tsx:171` - Close during generation
- `sora-generation-modal.tsx:202` - Reset form

**Admin Confirmations (2 instances)**:
- `admin/users/page.tsx:114` - Admin user actions
- `admin/users/page.tsx:120` - Tier changes

**Pattern**:
```typescript
// Before:
if (window.confirm('Are you sure you want to delete this scene?')) {
  await handleDelete()
}

// After:
import { useModal } from '@/components/providers/modal-provider'
const { showConfirm } = useModal()

const confirmed = await showConfirm(
  'Delete Scene',
  'Are you sure you want to delete this scene? This action cannot be undone.',
  'destructive'
)

if (confirmed) {
  await handleDelete()
}
```

**Estimated Time**: 2 hours

### Phase 5: Testing & Validation (Priority: HIGH)
**Ensure all replacements work correctly**

1. Test all error scenarios trigger correct modals
2. Test all confirmation flows work as expected
3. Verify keyboard accessibility (Enter, Escape)
4. Verify focus management
5. Test modal stacking behavior
6. Verify toast notification timing and positioning
7. Update E2E tests to account for modals instead of browser dialogs

**Estimated Time**: 2 hours

---

## Implementation Priority Order

### Immediate (Do First)
1. **Delete Confirmations** - Critical user actions that need clear confirmation
   - Files: `scene-list.tsx`, `episode-manager.tsx`, `character-manager.tsx`, `setting-manager.tsx`

2. **State Change Confirmations** - Prevent accidental data loss
   - Files: `sora-generation-modal.tsx`

### High Priority (Do Second)
3. **Error Modals with Retry** - Improve error recovery UX
   - Files: `episode-scene-selector.tsx`, `screenplay-chat.tsx`, `concept-agent-dialog.tsx`

4. **Success Toast Notifications** - Better success feedback
   - Files: `scene-list.tsx`

### Medium Priority (Do Third)
5. **Error Toast Notifications** - Non-critical error feedback
   - Files: Various component files

6. **Admin Confirmations** - Admin-only features
   - Files: `admin/users/page.tsx`

---

## Code Examples

### ErrorModal Component

```typescript
'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  retryLabel = 'Retry'
}: ErrorModalProps) {
  const handleRetry = () => {
    if (retryAction) {
      retryAction()
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {retryAction && (
            <Button onClick={handleRetry}>
              {retryLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### ConfirmModal Component

```typescript
'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive' | 'warning'
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default'
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const confirmButtonVariant = variant === 'destructive' ? 'destructive' : 'default'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={confirmButtonVariant} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### ModalProvider Context

```typescript
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { ErrorModal } from '@/components/modals/error-modal'
import { ConfirmModal } from '@/components/modals/confirm-modal'

interface ModalContextValue {
  showError: (title: string, message: string, retryAction?: () => void) => void
  showConfirm: (
    title: string,
    message: string,
    variant?: 'default' | 'destructive' | 'warning'
  ) => Promise<boolean>
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    retryAction?: () => void
  }>({ isOpen: false, title: '', message: '' })

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    variant?: 'default' | 'destructive' | 'warning'
    resolve?: (value: boolean) => void
  }>({ isOpen: false, title: '', message: '' })

  const showError = (title: string, message: string, retryAction?: () => void) => {
    setErrorModal({ isOpen: true, title, message, retryAction })
  }

  const showConfirm = (
    title: string,
    message: string,
    variant: 'default' | 'destructive' | 'warning' = 'default'
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({ isOpen: true, title, message, variant, resolve })
    })
  }

  const handleConfirmClose = (confirmed: boolean) => {
    if (confirmModal.resolve) {
      confirmModal.resolve(confirmed)
    }
    setConfirmModal({ isOpen: false, title: '', message: '' })
  }

  return (
    <ModalContext.Provider value={{ showError, showConfirm }}>
      {children}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        message={errorModal.message}
        retryAction={errorModal.retryAction}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => handleConfirmClose(false)}
        onConfirm={() => handleConfirmClose(true)}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within ModalProvider')
  }
  return context
}
```

---

## Migration Checklist

### For Each File:

- [ ] Import modal provider hook or toast hook
- [ ] Replace `alert()` with appropriate modal/toast
- [ ] Replace `window.confirm()` with confirmation modal
- [ ] Test user interaction flows
- [ ] Update any related tests
- [ ] Verify keyboard accessibility
- [ ] Check mobile responsiveness

---

## Benefits of Modal Replacement

1. **Better UX** - Consistent, branded modal experience
2. **Accessibility** - Keyboard navigation, screen reader support
3. **Customization** - Flexible styling and content
4. **Mobile-Friendly** - Better mobile dialog experience
5. **Error Recovery** - Retry buttons for failed operations
6. **State Management** - Better control over modal lifecycle
7. **Testing** - Easier to test than browser native dialogs
8. **Analytics** - Can track modal interactions

---

## Testing Considerations

### Unit Tests
- Test modal rendering with different props
- Test confirmation flow (confirm/cancel)
- Test keyboard interactions (Enter, Escape)
- Test error modal with retry action

### Integration Tests
- Test toast notifications appear and dismiss
- Test modal context provider works across components
- Test modal stacking behavior

### E2E Tests (Playwright)
- Update tests that relied on browser `confirm()` dialogs
- Test delete confirmation flows
- Test error recovery flows with retry buttons
- Test modal accessibility

---

## Estimated Total Implementation Time

- **Phase 1 (Foundation)**: 2 hours
- **Phase 2 (Toast Replacements)**: 1 hour
- **Phase 3 (Error Modals)**: 2 hours
- **Phase 4 (Confirm Modals)**: 2 hours
- **Phase 5 (Testing)**: 2 hours

**Total**: ~9 hours of focused development

---

## Completion Criteria

- ✅ Zero `alert()` calls remaining in application code
- ✅ Zero `window.confirm()` calls remaining in application code
- ✅ All error scenarios use ErrorModal or toast
- ✅ All confirmations use ConfirmModal
- ✅ All success messages use toast notifications
- ✅ Modal provider integrated into root layout
- ✅ Keyboard accessibility verified
- ✅ Mobile responsiveness verified
- ✅ All tests updated and passing
- ✅ User acceptance testing completed
