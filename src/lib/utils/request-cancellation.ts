export class RequestCancellation {
	private abortControllers = new Map<string, AbortController>();

	cancel(key: string): void {
		const controller = this.abortControllers.get(key);
		if (controller) {
			controller.abort();
			this.abortControllers.delete(key);
		}
	}

	cancelAll(): void {
		this.abortControllers.forEach((controller) => controller.abort());
		this.abortControllers.clear();
	}

	getSignal(key: string): AbortSignal {
		// Cancel any existing request with the same key
		this.cancel(key);

		// Create new controller
		const controller = new AbortController();
		this.abortControllers.set(key, controller);
		return controller.signal;
	}

	hasActiveRequest(key: string): boolean {
		return this.abortControllers.has(key);
	}
}

export const requestCancellation = new RequestCancellation();

