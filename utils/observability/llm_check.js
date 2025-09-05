import { callOpenAIWithTrace } from './openai_traced.js';
import { attachLangfuseTraceRef } from './langfuse.js';
import { env } from '../env.js';

/**
 * Run an LLM check that expects a JSON response and attach artifacts.
 * If OPENAI_API_KEY is missing, attaches a skipped note and returns null.
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {Object} params
 * @param {string} params.prompt - The full prompt string
 * @param {string} [params.sessionId]
 * @param {string} [params.attachName='llm-response']
 * @returns {Promise<{ ok: boolean, parsed: any, raw: any } | null>}
 */
export async function llmJsonCheck(testInfo, { prompt, sessionId, attachName = 'llm-response' }) {
  if (!env.OPENAI_API_KEY) {
    await testInfo.attach(attachName, {
      body: Buffer.from(JSON.stringify({ skipped: true, reason: 'OPENAI_API_KEY not set' }, null, 2)),
      contentType: 'application/json',
    });
    return null;
  }

  const result = await callOpenAIWithTrace({ prompt, sessionId, options: { temperature: 0 } });
  await attachLangfuseTraceRef(testInfo, { traceId: result.traceId, name: 'langfuse-llm-call' });
  await testInfo.attach(attachName, { body: Buffer.from(JSON.stringify(result, null, 2)), contentType: 'application/json' });

  const parsed = safeParseJson(result.text);
  const ok = !!result.ok;

  // If not strict, fail-soft: convert LLM failures or malformed JSON into a skipped check
  if (!env.LLM_STRICT_ASSERT && (!ok || !parsed)) {
    await testInfo.attach(`${attachName}-note`, {
      body: Buffer.from('LLM check failed or returned non-JSON; continuing without failing the test (LLM_STRICT_ASSERT=false).'),
      contentType: 'text/plain',
    });
    return null;
  }

  return { ok, parsed, raw: result };
}

function safeParseJson(s) {
  if (!s || typeof s !== 'string') return null;
  try {
    const m = s.match(/\{[\s\S]*\}/);
    const j = m ? m[0] : s;
    return JSON.parse(j);
  } catch {
    return null;
  }
}
