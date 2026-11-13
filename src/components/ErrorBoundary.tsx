import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private confirmDiscardUnsaved = (): boolean => typeof window === 'undefined' || window.confirm(
    'Resetting or reloading may discard unsaved project edits. Continue? / بازنشانی یا بارگذاری مجدد ممکن است تغییرات ذخیره‌نشده را از بین ببرد. ادامه می‌دهید؟'
  );

  private handleReload = (): void => {
    if (typeof window !== 'undefined' && this.confirmDiscardUnsaved()) window.location.reload();
  };

  private handleReset = (): void => {
    if (this.confirmDiscardUnsaved()) this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-industrial-bg text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="studio-card max-w-lg w-full space-y-4 border-industrial-error/60">
          <div className="flex items-center gap-2 text-industrial-error">
            <AlertTriangle className="w-5 h-5" />
            <h1 className="text-base font-bold">
              Application Error / خطای برنامه
            </h1>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            An unhandled error occurred. Unsaved edits may be lost when the UI
            is reset or the page is reloaded. Copy the diagnostics first and
            recover from your most recent saved project if necessary.
          </p>
          <p className="text-xs text-slate-300 leading-relaxed" dir="rtl">
            خطایی رخ داد. بازنشانی یا بارگذاری مجدد ممکن است تغییرات ذخیره‌نشده را از بین ببرد.
            ابتدا اطلاعات خطا را کپی و در صورت نیاز آخرین پروژهٔ ذخیره‌شده را بازیابی کنید.
          </p>

          <pre className="p-2.5 rounded bg-industrial-bg border border-industrial-border text-[10px] font-mono text-industrial-warning overflow-x-auto whitespace-pre-wrap max-h-40">
            {this.state.error?.name}: {this.state.error?.message}
            {this.state.errorInfo?.componentStack
              ? `\n\n${this.state.errorInfo.componentStack.trim()}`
              : ''}
          </pre>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-industrial-border">
            <button
              onClick={this.handleReset}
              className="studio-btn text-xs"
              type="button"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset UI / بازنشانی
            </button>
            <button
              onClick={this.handleReload}
              className="studio-btn-primary text-xs"
              type="button"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reload / بارگذاری مجدد
            </button>
          </div>
        </div>
      </div>
    );
  }
}
