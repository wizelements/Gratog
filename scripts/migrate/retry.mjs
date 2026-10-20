const transientCodes = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT']);
export function isTransient(error) {
  const code = error?.code ?? error?.cause?.code;
  const status = error?.status ?? error?.statusCode;
  return transientCodes.has(code) || status === 408 || status === 429 || (status >= 500 && status <= 599);
}
export async function withRetry(operation, options = {}) {
  const maxAttempts = options.maxAttempts ?? 5, baseDelayMs = options.baseDelayMs ?? 500, maxDelayMs = options.maxDelayMs ?? 10_000;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return { value: await operation(attempt), attempts: attempt, retried: attempt - 1 }; }
    catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === maxAttempts) throw Object.assign(error, { retryAttempts: attempt });
      const ceiling = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
      await sleep(Math.floor(ceiling * (0.5 + random() * 0.5)));
    }
  }
  throw lastError;
}
