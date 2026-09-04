/**
 * Itinera LLM client — provider-agnostic, OpenAI-compatible.
 *
 * Features:
 * - Works with any endpoint implementing POST {base}/chat/completions
 *   (OpenAI, DeepSeek, Zhipu GLM, Moonshot, Ollama, vLLM, ...)
 * - Request timeout (LLM_TIMEOUT_MS, default 60s)
 * - Exponential backoff retry on transient failures (LLM_MAX_RETRIES, default 2)
 * - Clear error taxonomy: config errors vs network errors vs API errors
 */

export class LLMConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMConfigError';
  }
}

export class LLMRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'LLMRequestError';
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CallOptions {
  temperature?: number;
  signal?: AbortSignal;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

export function getLLMConfig() {
  const baseUrl = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const apiKey = process.env.LLM_API_KEY || '';
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || 60_000;
  const maxRetries = Math.max(0, Number(process.env.LLM_MAX_RETRIES ?? 2));
  return { baseUrl, apiKey, model, timeoutMs, maxRetries };
}

/**
 * Call the configured LLM with a chat message list. Retries transient
 * failures (429 / 5xx / network) with exponential backoff + jitter.
 */
export async function callLLM(messages: ChatMessage[], opts: CallOptions = {}): Promise<string> {
  const { baseUrl, apiKey, model, timeoutMs, maxRetries } = getLLMConfig();

  if (!apiKey) {
    throw new LLMConfigError(
      'LLM_API_KEY is not configured. Copy .env.example to .env and set LLM_API_KEY / LLM_BASE_URL / LLM_MODEL.'
    );
  }

  let lastError: LLMRequestError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    // Link external signal (request cancellation) to our timeout controller
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, temperature: opts.temperature ?? 0.7 }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        const retryable = res.status === 429 || res.status >= 500;
        throw new LLMRequestError(
          `LLM API error ${res.status}: ${bodyText.slice(0, 300)}`,
          res.status,
          retryable,
        );
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new LLMRequestError('LLM API returned an unexpected response shape', 200, false);
      }
      return content;
    } catch (err) {
      // Re-throw non-retryable errors immediately; abort from caller is not retryable
      if (err instanceof LLMConfigError) throw err;
      if (err instanceof LLMRequestError && !err.retryable) throw err;
      if (err instanceof DOMException && err.name === 'AbortError' && opts.signal?.aborted) {
        throw new LLMRequestError('Request aborted by client', undefined, false);
      }

      lastError = err instanceof LLMRequestError
        ? err
        : new LLMRequestError(
            err instanceof Error ? err.message : 'Unknown LLM network error',
            undefined,
            true, // network errors are retryable
          );

      if (attempt < maxRetries) {
        const backoff = Math.min(30_000, 2 ** attempt * 500) + Math.random() * 250;
        await sleep(backoff, opts.signal);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new LLMRequestError('LLM request failed after retries', undefined, false);
}
