'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] px-4 text-center">
          <div className="w-14 h-14 bg-incorrect-bg rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-7 h-7 text-incorrect-text" />
          </div>
          <h2 className="text-[24px] font-semibold text-ui-foreground mb-2">Something went wrong</h2>
          <p className="text-[15px] text-ui-muted-foreground mb-6 max-w-[400px]">
            An unexpected error occurred. Please refresh the page and try again.
          </p>
          <Button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}>
            Refresh page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
