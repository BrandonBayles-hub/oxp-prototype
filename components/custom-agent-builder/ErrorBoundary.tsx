"use client";

import { Component, type ErrorInfo, type ReactNode } from 'react';
// loggerService's typed surface is `noticeError` / `reportReactError`.
// We use a local console fallback so this boundary has no hard dependency on
// NewRelic being configured, and so a misconfigured logger cannot surface a
// secondary error that escapes this boundary.

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Isolated error boundary for the CID- and staff-gated CustomAgentBuilder tree.
 *
 * Any render/runtime error from the new agent-builder code is swallowed here
 * and we fall back to a minimal placeholder. This guarantees that even if a
 * defect slips past the CID check, it cannot crash the surrounding OXP shell
 * or bleed into production client experiences.
 */
export default class CustomAgentBuilderErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    try {
      // eslint-disable-next-line no-console
      console.error('[CustomAgentBuilder] render error', error, info);
    } catch {
      // Never let the logger surface a secondary error.
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-lg rounded-lg border border-border bg-white p-6 text-center">
          <p className="text-sm font-medium text-foreground">Agent Builder is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The Custom Agent Builder experience could not be rendered. Please refresh the page.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
