'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { ErrorModal } from '@/components/modals/error-modal'
import { ConfirmModal } from '@/components/modals/confirm-modal'

interface ModalContextValue {
  showError: (title: string, message: string, retryAction?: () => void, retryLabel?: string) => void
  showConfirm: (
    title: string,
    message: string,
    options?: {
      confirmLabel?: string
      cancelLabel?: string
      variant?: 'default' | 'destructive' | 'warning'
    }
  ) => Promise<boolean>
  closeModal: () => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

interface ErrorModalState {
  isOpen: boolean
  title: string
  message: string
  retryAction?: () => void
  retryLabel?: string
}

interface ConfirmModalState {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive' | 'warning'
  resolve?: (value: boolean) => void
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [errorModal, setErrorModal] = useState<ErrorModalState>({
    isOpen: false,
    title: '',
    message: '',
  })

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
  })

  const showError = useCallback(
    (title: string, message: string, retryAction?: () => void, retryLabel?: string) => {
      setErrorModal({
        isOpen: true,
        title,
        message,
        retryAction,
        retryLabel,
      })
    },
    []
  )

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      options?: {
        confirmLabel?: string
        cancelLabel?: string
        variant?: 'default' | 'destructive' | 'warning'
      }
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmModal({
          isOpen: true,
          title,
          message,
          confirmLabel: options?.confirmLabel,
          cancelLabel: options?.cancelLabel,
          variant: options?.variant || 'default',
          resolve,
        })
      })
    },
    []
  )

  const closeModal = useCallback(() => {
    setErrorModal({ isOpen: false, title: '', message: '' })
    setConfirmModal({ isOpen: false, title: '', message: '' })
  }, [])

  const handleErrorClose = useCallback(() => {
    setErrorModal({ isOpen: false, title: '', message: '' })
  }, [])

  const handleConfirmClose = useCallback(() => {
    if (confirmModal.resolve) {
      confirmModal.resolve(false)
    }
    setConfirmModal({ isOpen: false, title: '', message: '' })
  }, [confirmModal])

  const handleConfirm = useCallback(() => {
    if (confirmModal.resolve) {
      confirmModal.resolve(true)
    }
  }, [confirmModal])

  return (
    <ModalContext.Provider value={{ showError, showConfirm, closeModal }}>
      {children}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={handleErrorClose}
        title={errorModal.title}
        message={errorModal.message}
        retryAction={errorModal.retryAction}
        retryLabel={errorModal.retryLabel}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleConfirmClose}
        onConfirm={handleConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
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
