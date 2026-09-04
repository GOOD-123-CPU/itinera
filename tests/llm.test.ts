import { describe, it, expect, afterEach } from 'vitest';
import { callLLM, LLMConfigError, LLMRequestError } from '@/lib/llm';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi_restoreAllMocks();
});

import { vi } from 'vitest';
function vi_restoreAllMocks() { vi.restoreAllMocks(); }

function mockFetchOnce(impl: (...args: unknown[]) => Promise<unknown>) {
  global.fetch = vi.fn(impl) as unknown as typeof fetch;
}

describe('callLLM', () => {
  it('throws LLMConfigError when API key is missing', async () => {
    delete process.env.LLM_API_KEY;
    await expect(callLLM([{ role: 'user', content: 'hi' }])).rejects.toThrow(LLMConfigError);
  });

  it('returns content from a successful response', async () => {
    process.env.LLM_API_KEY = 'test-key';
    mockFetchOnce(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Hello!' } }] }),
    }));
    const content = await callLLM([{ role: 'user', content: 'hi' }]);
    expect(content).toBe('Hello!');
  });

  it('throws non-retryable LLMRequestError on 401 without retrying', async () => {
    process.env.LLM_API_KEY = 'bad-key';
    process.env.LLM_MAX_RETRIES = '3';
    const fetchSpy = vi.fn(async () => ({ ok: false, status: 401, text: async () => 'unauthorized' }));
    global.fetch = fetchSpy as unknown as typeof fetch;

    await expect(callLLM([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      name: 'LLMRequestError',
      status: 401,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1); // no retries on 4xx auth errors
  });

  it('retries on 500 then succeeds', async () => {
    process.env.LLM_API_KEY = 'test-key';
    process.env.LLM_MAX_RETRIES = '2';
    let calls = 0;
    global.fetch = vi.fn(async () => {
      calls++;
      if (calls === 1) return { ok: false, status: 500, text: async () => 'boom' };
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'recovered' } }] }) };
    }) as unknown as typeof fetch;

    const content = await callLLM([{ role: 'user', content: 'hi' }]);
    expect(content).toBe('recovered');
    expect(calls).toBe(2);
  }, 10_000);

  it('trims trailing slash from base URL', async () => {
    process.env.LLM_API_KEY = 'test-key';
    process.env.LLM_BASE_URL = 'https://api.example.com/v1/';
    let capturedUrl = '';
    mockFetchOnce(async (url: unknown) => {
      capturedUrl = String(url);
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
    });
    await callLLM([{ role: 'user', content: 'hi' }]);
    expect(capturedUrl).toBe('https://api.example.com/v1/chat/completions');
  });
});
