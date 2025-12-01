/**
 * Utility functions for handling network errors gracefully
 */

export interface NetworkError {
  isNetworkError: boolean;
  message: string;
  shouldRetry: boolean;
}

/**
 * Check if an error is a network-related error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  // Check for common network error patterns
  const errorMessage = error?.message || error?.toString() || '';
  const errorString = errorMessage.toLowerCase();

  // Network request failed errors
  if (
    errorString.includes('network request failed') ||
    errorString.includes('networkerror') ||
    errorString.includes('fetch failed') ||
    errorString.includes('failed to fetch') ||
    errorString.includes('networkerror when attempting to fetch resource')
  ) {
    return true;
  }

  // TypeError with network-related messages
  if (error instanceof TypeError) {
    if (
      errorMessage.includes('Network request failed') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('network')
    ) {
      return true;
    }
  }

  // Check for connection-related error codes
  if (error?.code) {
    const networkErrorCodes = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'ENETUNREACH',
      'EHOSTUNREACH',
    ];
    if (networkErrorCodes.includes(error.code)) {
      return true;
    }
  }

  // Check for RPC errors with network failures
  if (error?.message && typeof error.message === 'string') {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.message?.includes('Network request failed')) {
        return true;
      }
    } catch {
      // Not JSON, continue checking
    }
  }

  return false;
}

/**
 * Get a user-friendly error message for network errors
 */
export function getNetworkErrorMessage(error: any): string {
  if (isNetworkError(error)) {
    return 'No internet connection. Please check your network and try again.';
  }
  return error?.message || 'An error occurred. Please try again.';
}

/**
 * Handle network errors gracefully - logs but doesn't throw
 * Returns true if it was a network error (handled), false otherwise
 */
export function handleNetworkError(
  error: any,
  context: string = 'Operation',
  silent: boolean = true
): boolean {
  if (isNetworkError(error)) {
    if (!silent) {
      console.warn(`⚠️ [${context}] Network error (offline):`, {
        message: error?.message || 'Network request failed',
        type: error?.constructor?.name || 'Unknown',
      });
    } else {
      // Silent logging - only log in debug mode
      // @ts-ignore - __DEV__ is a React Native global
      if (__DEV__) {
        console.log(`📡 [${context}] Network unavailable (silent)`);
      }
    }
    return true; // Error was handled
  }

  // Not a network error, log normally
  console.error(`❌ [${context}] Error:`, error);
  return false; // Error was not handled (not a network error)
}

/**
 * Check if we should retry an operation based on the error
 */
export function shouldRetryOnError(error: any, retryCount: number = 0, maxRetries: number = 3): boolean {
  if (!isNetworkError(error)) {
    return false; // Don't retry non-network errors
  }

  if (retryCount >= maxRetries) {
    return false; // Max retries reached
  }

  return true; // Retry network errors
}

