import { writable } from 'svelte/store';

export type ErrorSeverity = 'error' | 'warning' | 'info';
export type ErrorCategory = 'player' | 'lyrics' | 'album-art' | 'network' | 'general';

export interface AppError {
	message: string;
	severity: ErrorSeverity;
	category: ErrorCategory;
	timestamp: number;
	recoverable: boolean;
	retryable?: boolean;
	retryCount?: number;
}

function createErrorStore() {
	const { subscribe, set, update } = writable<AppError | null>(null);

	return {
		subscribe,
		set: (error: AppError | null) => set(error),
		setError: (
			message: string,
			options?: {
				severity?: ErrorSeverity;
				category?: ErrorCategory;
				recoverable?: boolean;
				retryable?: boolean;
			}
		) => {
			set({
				message,
				severity: options?.severity || 'error',
				category: options?.category || 'general',
				timestamp: Date.now(),
				recoverable: options?.recoverable ?? true,
				retryable: options?.retryable ?? false,
				retryCount: 0
			});
		},
		clear: () => set(null),
		incrementRetry: () => {
			update((error) => {
				if (error) {
					return { ...error, retryCount: (error.retryCount || 0) + 1 };
				}
				return error;
			});
		}
	};
}

export const appError = createErrorStore();
