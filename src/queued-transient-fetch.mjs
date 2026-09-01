import { createConcurrencyLimiter } from './concurrency-limit.mjs';
import { createTransientFetch } from './transient-fetch.mjs';

export function createQueuedTransientFetch(fetchImpl = fetch, {
  maxConcurrent = 2,
  timeoutMs = 7000,
  retries = 1,
  delayMs = 250,
  timeoutSignal = (ms) => AbortSignal.timeout(ms)
} = {}) {
  const limit = createConcurrencyLimiter(maxConcurrent);

  const fetchAttempt = (input, init = {}) => limit(() => fetchImpl(input, {
    ...init,
    // Deliberately create the signal inside the admitted task so queue wait does
    // not consume the request's network timeout budget.
    signal:timeoutSignal(timeoutMs)
  }));

  return createTransientFetch(fetchAttempt, { retries, delayMs });
}
