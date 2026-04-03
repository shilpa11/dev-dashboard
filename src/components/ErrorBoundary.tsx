'use client'

import { Component, type ReactNode } from 'react'
import { telemetry } from '@/lib/telemetry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  name?: string
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error) {
    telemetry.errorBoundaryTriggered(this.props.name ?? 'unknown', error.message)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--danger-subtle)] p-5 text-sm">
            <p className="font-medium text-[var(--text-primary)] mb-1">Something went wrong</p>
            <p className="text-[var(--text-secondary)] text-xs">{this.state.message}</p>
            <button
              className="mt-3 text-xs text-[var(--accent)] hover:underline"
              onClick={() => this.setState({ hasError: false, message: '' })}
            >
              Try again
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
