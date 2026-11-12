import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFF] px-6 text-center">
          <h1 className="text-xl font-semibold text-[#002B5B]">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-[#002B5B]/70">
            Please reload the app to continue.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-full bg-[#6495ED] px-6 py-2.5 text-sm font-medium text-[#002B5B]"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
