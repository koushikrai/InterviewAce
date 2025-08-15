export async function withApiFallback<T>(
  apiCall: () => Promise<T>,
  fallbackValue: T,
  options?: {
    onError?: (error: unknown) => void
    isUnreachable?: (error: unknown) => boolean
  }
): Promise<T> {
  try {
    return await apiCall();
  } catch (error: unknown) {
    const hasResponse = typeof error === 'object' && error !== null && 'response' in error;
    const isNetworkOrUnreachable = options?.isUnreachable
      ? options.isUnreachable(error)
      : !hasResponse; // axios-style: no response means network error / unreachable

    if (options?.onError) {
      options.onError(error);
    }

    // Only fall back on unreachable/network issues.
    if (isNetworkOrUnreachable) {
      return fallbackValue;
    }

    throw error;
  }
}

