import OpenAI from 'openai';
import { env } from '../env.js';
import { getLangfuse } from './langfuse.js';

// Create a singleton OpenAI client
let openaiClient = null;
function getOpenAI() {
  if (openaiClient) return openaiClient;
  const cfg = {};
  if (env.OPENAI_API_KEY) cfg.apiKey = env.OPENAI_API_KEY;
  if (env.OPENAI_BASE_URL) cfg.baseURL = env.OPENAI_BASE_URL;
  openaiClient = new OpenAI(cfg);
  return openaiClient;
}

/**
 * Calls OpenAI Chat Completions with Langfuse tracing.
 * Captures input, output, latency, and token usage. Handles errors gracefully.
 * @param {Object} params
 * @param {string} params.prompt - User prompt
 * @param {string} [params.model=env.OPENAI_MODEL] - Model name
 * @param {Object} [params.options] - Additional OpenAI options
 * @param {string} [params.sessionId] - Optional session/run identifier for correlation
 * @returns {Promise<{ ok: boolean, text?: string, error?: string, usage?: any, traceId?: string }>} 
 */
export async function callOpenAIWithTrace({ prompt, model = env.OPENAI_MODEL, options = {}, sessionId } = {}) {
  const langfuse = getLangfuse();
  const client = getOpenAI();

  const start = Date.now();
  let traceId = undefined;

  try {
    // If Langfuse is available, start a trace.
    if (langfuse) {
      traceId = `llm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      langfuse.trace({
        name: 'openai.chat.completions',
        id: traceId,
        sessionId,
        input: { prompt, model, options },
        metadata: { provider: 'openai', kind: 'llm-call' },
        timestamp: new Date(start).toISOString(),
      });
    }

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      ...options,
    });

    const latencyMs = Date.now() - start;
    const text = response?.choices?.[0]?.message?.content ?? '';
    const usage = response?.usage || {};

    if (langfuse) {
      langfuse.trace({
        name: 'openai.chat.completions.result',
        id: traceId,
        sessionId,
        input: { prompt, model },
        output: { text },
        metadata: { provider: 'openai', latencyMs, usage },
        timestamp: new Date().toISOString(),
      });
    }

    return { ok: true, text, usage, traceId };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err?.message || 'Unknown error';
    if (langfuse) {
      langfuse.trace({
        name: 'openai.chat.completions.error',
        id: traceId,
        sessionId,
        input: { prompt, model },
        output: { error: message },
        metadata: { provider: 'openai', latencyMs },
        timestamp: new Date().toISOString(),
      });
    }
    return { ok: false, error: message, traceId };
  }
}
