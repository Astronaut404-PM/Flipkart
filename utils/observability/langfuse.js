// Langfuse initialization helper
// Loads keys from environment and exports a singleton client
import { Langfuse } from 'langfuse';
import { env } from '../env.js';

let langfuse = null;

function genTraceId(prefix = 'trace') {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

export function getLangfuse() {
  if (langfuse) return langfuse;

  // Fail softly if keys are missing; enable in CI by providing keys
  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) {
    if (env.LANGFUSE_DEBUG) {
      console.warn('[Langfuse] Missing keys; tracing disabled');
    }
    return null;
  }

  langfuse = new Langfuse({
    publicKey: env.LANGFUSE_PUBLIC_KEY,
    secretKey: env.LANGFUSE_SECRET_KEY,
    baseUrl: env.LANGFUSE_BASE_URL,
    debug: env.LANGFUSE_DEBUG,
  });

  return langfuse;
}

export function traceEvent({ name, input, output, metadata }) {
  const client = getLangfuse();
  if (!client) return;
  try {
    client.trace({
      name,
      input,
      output,
      metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (env.LANGFUSE_DEBUG) {
      console.warn('[Langfuse] traceEvent error:', err?.message);
    }
  }
}

/**
 * Create a trace for an LLM-based test interaction.
 * @param {Object} params
 * @param {string} params.sessionId - Unique session identifier (e.g., Playwright worker or test run ID)
 * @param {string} params.prompt - Input prompt sent to the LLM
 * @param {string|Object} params.expectedOutput - Expected output for assertion/reference
 * @param {string} [params.testName] - Optional test name to appear in traces
 * @param {string} [params.testId] - Optional unique test case identifier
 * @param {Object} [params.metadata] - Additional context (e.g., spec file, env, model)
 * @returns {boolean} True if the call was attempted; false if tracing disabled
 */
export function createLlmTestTrace({
  sessionId,
  prompt,
  expectedOutput,
  testName = 'llm.test',
  testId,
  metadata = {},
  traceId,
}) {
  const client = getLangfuse();
  if (!client) {
    if (env.LANGFUSE_DEBUG) console.warn('[Langfuse] Tracing disabled; missing keys');
    return null;
  }

  try {
    const id = traceId || genTraceId('llm');
    const combinedMeta = { ...metadata };
    if (testId) combinedMeta.testId = testId;
    if (sessionId) combinedMeta.sessionId = sessionId;
    combinedMeta.kind = 'llm-test';
    combinedMeta.traceId = id;

    client.trace({
      name: testName,
      id, // if unsupported, it will be ignored by SDK; still present in metadata
      sessionId,
      input: { prompt },
      output: { expected: expectedOutput },
      metadata: combinedMeta,
      timestamp: new Date().toISOString(),
    });
    return id;
  } catch (err) {
    if (env.LANGFUSE_DEBUG) {
      console.warn('[Langfuse] createLlmTestTrace error:', err?.message);
    }
    return null;
  }
}

/**
 * Attach a reference to a Langfuse trace to Playwright test artifacts.
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {Object} options
 * @param {string} options.traceId - The Langfuse (or generated) trace identifier
 * @param {string} [options.name='langfuse-trace'] - Attachment name
 */
export async function attachLangfuseTraceRef(testInfo, { traceId, name = 'langfuse-trace' } = {}) {
  if (!traceId || !testInfo?.attach) return false;
  const payload = {
    traceId,
    langfuseBaseUrl: env.LANGFUSE_BASE_URL,
    projectKey: env.LANGFUSE_PUBLIC_KEY ? '[configured]' : '[unset]',
    note: 'Use this traceId to correlate in Langfuse. UI linking depends on your project configuration.'
  };
  try {
    await testInfo.attach(name, {
      body: Buffer.from(JSON.stringify(payload, null, 2)),
      contentType: 'application/json',
    });
    return true;
  } catch (err) {
    if (env.LANGFUSE_DEBUG) console.warn('[Langfuse] attachLangfuseTraceRef error:', err?.message);
    return false;
  }
}
