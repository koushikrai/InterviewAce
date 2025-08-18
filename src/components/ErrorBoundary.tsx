import React from "react";

type ErrorBoundaryState = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
	constructor(props: React.PropsWithChildren) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// eslint-disable-next-line no-console
		console.error("ErrorBoundary caught: ", error, errorInfo);
	}

	private handleReset = () => {
		this.setState({ hasError: false, error: undefined });
		// Best-effort soft reset
		if (typeof window !== 'undefined') {
			window.location.href = '/';
		}
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
					<div className="max-w-md w-full rounded-lg border bg-white p-6 shadow-sm text-center">
						<h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
						<p className="text-sm text-gray-600 mb-4">
							An unexpected error occurred. You can try returning to the dashboard.
						</p>
						<button onClick={this.handleReset} className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
							Go to Dashboard
						</button>
					</div>
				</div>
			);
		}
		return this.props.children as React.ReactNode;
	}
}
