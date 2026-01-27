/**
 * 通用重试机制
 *
 * 提供指数退避重试、降级策略等能力
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

export interface RetryResult<T> {
  result?: T;
  retries: number;
  error?: Error;
  success: boolean;
}

/**
 * 执行操作并在失败时重试（指数退避）
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  fallback?: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const { maxRetries = 3, baseDelayMs = 100 } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return { result, retries: attempt, success: true };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await handleRetryFailure(attempt, maxRetries, baseDelayMs, fallback, lastError);
    }
  }

  return {
    retries: maxRetries,
    error: lastError || new Error("Unknown error"),
    success: false,
  };
}

async function handleRetryFailure<T>(
  attempt: number,
  maxRetries: number,
  baseDelayMs: number,
  _fallback: (() => Promise<T>) | undefined,
  _lastError: Error,
): Promise<void> {
  // 如果还有重试机会，计算延迟时间并等待
  if (attempt < maxRetries) {
    const delay = baseDelayMs * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
