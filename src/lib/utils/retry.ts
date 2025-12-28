export interface RetryOptions {
	maxRetries?: number;
	initialDelay?: number;
	maxDelay?: number;
	backoffMultiplier?: number;
	shouldRetry?: (error: unknown) => boolean;
}

export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {}
): Promise<T> {
	const {
		maxRetries = 3,
		initialDelay = 1000,
		maxDelay = 10000,
		backoffMultiplier = 2,
		shouldRetry = () => true
	} = options;

	let lastError: unknown;
	let delay = initialDelay;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Don't retry if we've exhausted attempts or if shouldRetry returns false
			if (attempt === maxRetries || !shouldRetry(error)) {
				throw error;
			}

			// Wait before retrying with exponential backoff
			await new Promise((resolve) => setTimeout(resolve, delay));
			delay = Math.min(delay * backoffMultiplier, maxDelay);
		}
	}

	throw lastError;
}

export function isNetworkError(error: unknown): boolean {
	if (error instanceof Error) {
		return (
			error.message.includes('fetch') ||
			error.message.includes('network') ||
			error.message.includes('Failed to fetch') ||
			error.name === 'NetworkError' ||
			error.name === 'TypeError'
		);
	}
	return false;
}

export function isTimeoutError(error: unknown): boolean {
	if (error instanceof Error) {
		return error.message.includes('timeout') || error.name === 'TimeoutError';
	}
	return false;
}


