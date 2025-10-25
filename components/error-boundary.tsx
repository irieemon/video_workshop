'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch and handle React errors gracefully
 * Prevents entire app crashes and provides user-friendly error UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: Log to error tracking service (Sentry, LogRocket, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="mb-4 flex justify-center">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <h2 className="mb-2 text-2xl font-bold">Something went wrong</h2>
            <p className="mb-6 text-muted-foreground">
              We&apos;re sorry, but something unexpected happened. Please try refreshing the page or contact support if
              the problem persists.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-left">
                <summary className="cursor-pointer font-semibold text-red-800">Error Details (Development Only)</summary>
                <pre className="mt-2 overflow-x-auto text-xs text-red-700">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex justify-center gap-2">
              <Button onClick={this.handleReset} variant="outline">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={() => window.location.href = '/dashboard'}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 * Note: This doesn't actually catch errors, but provides a pattern for error handling
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    // TODO: Log to error tracking service
    console.error('Error handled:', error);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  if (error) {
    throw error; // This will be caught by nearest Error Boundary
  }

  return { handleError, resetError };
}

/**
 * Specialized Error Boundary for API errors
 */
export function APIErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-[200px] flex-col items-center justify-center p-6">
          <AlertCircle className="mb-3 h-10 w-10 text-orange-500" />
          <h3 className="mb-2 text-lg font-semibold">Connection Error</h3>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            We&apos;re having trouble connecting to our servers. Please check your internet connection and try again.
          </p>
          <Button onClick={() => window.location.reload()} size="sm">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Specialized Error Boundary for form errors
 */
export function FormErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <div className="flex-1">
              <h4 className="mb-1 font-semibold text-red-800">Form Error</h4>
              <p className="text-sm text-red-700">
                There was an error processing your form. Please check your inputs and try again.
              </p>
              <Button
                onClick={() => window.location.reload()}
                size="sm"
                variant="outline"
                className="mt-3"
              >
                Reset Form
              </Button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
