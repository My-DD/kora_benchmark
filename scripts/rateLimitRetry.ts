import {APIError, RateLimitError} from "openai";

/**
 * Wraps an async function with retry logic for OpenAI rate limit errors.
 * Uses exponential backoff, respecting the retry-after header when provided.
 */
export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimitError =
        error instanceof RateLimitError ||
        (error instanceof APIError && error.status === 429);

      if (!isRateLimitError || attempt === maxRetries - 1) {
        throw error;
      }

      const retryAfter =
        error instanceof APIError ? error.headers?.["retry-after"] : undefined;
      const delay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : Math.min(1000 * 2 ** attempt, 60000);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error("Unreachable");
}
