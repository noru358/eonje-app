const DEFAULT_RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function isAbortLike(error) {
  const name = String(error?.name || '');
  const message = String(error?.message || '');
  return name === 'AbortError' || name === 'TimeoutError' || /aborted due to timeout|timed out|timeout/i.test(message);
}

export function createTransientFetch(fetchImpl = fetch, {
  retries = 1,
  delayMs = 250,
  retryableStatus = DEFAULT_RETRYABLE_STATUS,
  signalFactory = null,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
} = {}) {
  return async function transientFetch(input, init = {}) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const attemptInit = signalFactory
        ? { ...init, signal:signalFactory({ attempt, input, init }) }
        : init;
      try {
        const response = await fetchImpl(input, attemptInit);
        if (!retryableStatus.has(response.status) || attempt === retries) return response;
        lastError = new Error(`Transient HTTP ${response.status}`);
      } catch (error) {
        if (!isAbortLike(error) || attempt === retries) throw error;
        lastError = error;
      }
      await sleep(delayMs * (attempt + 1));
    }
    throw lastError || new Error('Transient fetch failed');
  };
}
