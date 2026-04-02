// background.js — Knotia AI Search (Service Worker)
// Handles all AI API calls to bypass CORS restrictions in content scripts.
// Supports Anthropic, OpenAI, and any OpenAI-compatible custom endpoint.
// v1.2  2026-03-29  Add anthropic-dangerous-direct-browser-access header (fix CORS)
// v1.3  2026-03-29  Add identifyStandard() — AI locates standard from its own knowledge
// v1.4  2026-03-29  safeParseJSON() — robust JSON extraction, ignore extra text from AI
// v1.7  2026-04-01  safeParseJSON bracket-depth fix; version unification

// ─────────────────────────────────────────────
// Safe JSON parser — handles extra text AI sometimes appends after JSON
// ─────────────────────────────────────────────
function safeParseJSON(text, fallback) {
  try {
    const cleaned = text.replace(/```json\b|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (_) {
    // Locate the first outermost JSON structure using bracket-depth tracking,
    // so nested arrays/objects are not truncated by a non-greedy regex.
    const firstBracket = text.indexOf('[');
    const firstBrace   = text.indexOf('{');
    const start =
      firstBracket === -1 ? firstBrace :
      firstBrace   === -1 ? firstBracket :
      Math.min(firstBracket, firstBrace);
    if (start === -1) return fallback;

    const open  = text[start];
    const close = open === '[' ? ']' : '}';
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape)             { escape = false; continue; }
      if (ch === '\\')        { escape = true;  continue; }
      if (ch === '"')         { inString = !inString; continue; }
      if (inString)           continue;
      if (ch === open)        depth++;
      else if (ch === close)  depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch (_) {}
        break;
      }
    }
    return fallback;
  }
}

// ─────────────────────────────────────────────
// Browser-level shortcut (fires regardless of iframe focus)
// ─────────────────────────────────────────────
// Browser-level shortcut
chrome.commands.onCommand.addListener((command) => {
  console.log('[Knotia BG] command fired:', command);
  if (command === 'open-search') sendOpenSearch();
});

// Toolbar icon click (fallback / test)
chrome.action.onClicked.addListener(() => {
  console.log('[Knotia BG] action clicked');
  sendOpenSearch();
});

function sendOpenSearch() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    console.log('[Knotia BG] sending OPEN_SEARCH to tab', tabId);
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'OPEN_SEARCH' }, (resp) => {
        if (chrome.runtime.lastError) {
          console.warn('[Knotia BG] sendMessage error:', chrome.runtime.lastError.message);
        }
      });
    }
  });
}

// ─────────────────────────────────────────────
// Message router
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'AI_FIND_TOC') {
    findRelevantTocNodes(msg.query, msg.titles, msg.level).then(sendResponse);
    return true; // keep channel open for async response
  }
  if (msg.type === 'AI_FIND_PARAGRAPHS') {
    findRelevantParagraphs(msg.query, msg.text).then(sendResponse);
    return true;
  }
  if (msg.type === 'AI_IDENTIFY_STANDARD') {
    identifyStandard(msg.query).then(sendResponse);
    return true;
  }
  if (msg.type === 'TEST_CONNECTION') {
    testConnection(msg).then(sendResponse);
    return true;
  }
});

// ─────────────────────────────────────────────
// Read saved settings from storage
// ─────────────────────────────────────────────
async function getSettings() {
  return chrome.storage.local.get(['provider', 'model', 'apiKey', 'customModel', 'customEndpoint']);
}

// ─────────────────────────────────────────────
// Unified AI call entry point
// Automatically dispatches to Anthropic / OpenAI / Custom based on settings
// ─────────────────────────────────────────────
async function callAI(prompt, maxTokens = 500) {
  const s = await getSettings();
  const { provider = 'anthropic', model, apiKey, customModel, customEndpoint } = s;

  if (!apiKey) {
    throw new Error('No API key set. Open the extension Settings to configure.');
  }

  if (provider === 'anthropic') {
    return callAnthropic(prompt, model || 'claude-haiku-4-5-20251001', apiKey, maxTokens);
  } else if (provider === 'openai') {
    return callOpenAI(prompt, model || 'gpt-4o-mini', apiKey, maxTokens);
  } else {
    // custom: OpenAI-compatible format, user-supplied endpoint and model
    return callOpenAI(prompt, customModel, apiKey, maxTokens, customEndpoint);
  }
}

// ─────────────────────────────────────────────
// Anthropic API
// ─────────────────────────────────────────────
async function callAnthropic(prompt, model, apiKey, maxTokens) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text || '';
}

// ─────────────────────────────────────────────
// OpenAI API (also used for custom OpenAI-compatible endpoints)
// ─────────────────────────────────────────────
async function callOpenAI(
  prompt,
  model,
  apiKey,
  maxTokens,
  endpoint = 'https://api.openai.com/v1/chat/completions'
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || '';
}

// ─────────────────────────────────────────────
// AI Task A: identify relevant TOC nodes from a title list
// ─────────────────────────────────────────────
async function findRelevantTocNodes(query, titles, level) {
  const prompt = level === 'top'
    ? `You are helping navigate IFRS/IAS/ASPE accounting standards.

User question: "${query}"

Here are the available top-level standard titles:
${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Which of these standards are most relevant to the user's question?
Reply with ONLY a JSON array of the exact title strings that are relevant.
Example: ["IFRS 16 Leases", "IAS 17 Leases"]
If none are relevant, reply with []. Do NOT include any explanation or text outside the JSON.`

    : `You are helping navigate IFRS/IAS/ASPE accounting standards.

User question: "${query}"

The user has expanded a standard and these section titles are now visible:
${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Which of these section titles are most likely to contain the answer?
Reply with ONLY a JSON array of the exact title strings.
Example: ["Scope", "Lease term (paragraphs B34–B41)"]
If none seem relevant, reply with []. Do NOT include any explanation or text outside the JSON.`;

  try {
    const text = await callAI(prompt, 300);
    return safeParseJSON(text, []);
  } catch (e) {
    console.error('[Knotia] TOC AI error:', e);
    throw e;
  }
}

// ─────────────────────────────────────────────
// AI Task B: extract relevant phrases from body text
// ─────────────────────────────────────────────
async function findRelevantParagraphs(query, fullText) {
  // Truncate to stay within token limits (~8000 chars ≈ ~2000 tokens)
  const truncated = fullText.substring(0, 8000);

  const prompt = `You are analyzing IFRS/IAS/ASPE accounting standard text.

User question: "${query}"

Standard text:
"""
${truncated}
"""

Extract the exact phrases or sentences from the text above that directly answer or are most relevant to the user's question.
Reply with ONLY a JSON array of short exact phrases (under 15 words each) copied verbatim from the text.
Return 3–8 phrases maximum.
Example: ["the lease term is the non-cancellable period", "optional periods if reasonably certain"]
If nothing is relevant, reply with []. Do NOT include any explanation or text outside the JSON.`;

  try {
    const text = await callAI(prompt, 500);
    return safeParseJSON(text, []);
  } catch (e) {
    console.error('[Knotia] Paragraph AI error:', e);
    throw e;
  }
}

// ─────────────────────────────────────────────
// AI Task C: locate standard from AI's own knowledge (no page content needed)
// ─────────────────────────────────────────────
async function identifyStandard(query) {
  const prompt = `You are an expert in IFRS and IAS accounting standards.

A user has the following question:
"${query}"

Based on your knowledge, identify:
1. Which specific standard(s) this question relates to (e.g. IFRS 9, IAS 36)
2. Which section or topic within that standard (e.g. "Impairment", "Lease term")
3. One sentence summarizing where the answer can be found

Reply with ONLY a JSON object in this exact format, no other text:
{
  "standards": ["IFRS 9", "IAS 32"],
  "topic": "Classification of financial instruments",
  "hint": "The answer is in IFRS 9 Section 4.1 on classification of financial assets."
}

If the question is not related to any specific IFRS/IAS standard, reply with:
{ "standards": [], "topic": "", "hint": "" }
Do NOT include any explanation or text outside the JSON object.`;

  try {
    const text = await callAI(prompt, 300);
    return safeParseJSON(text, { standards: [], topic: '', hint: '' });
  } catch (e) {
    console.error('[Knotia] identifyStandard error:', e);
    return { standards: [], topic: '', hint: '' };
  }
}

// ─────────────────────────────────────────────
// Test Connection (called from Settings page)
// ─────────────────────────────────────────────
async function testConnection(msg) {
  try {
    let text;
    const minPrompt = 'Reply with the single word: OK';

    if (msg.provider === 'anthropic') {
      text = await callAnthropic(minPrompt, msg.model, msg.apiKey, 10);
    } else {
      const endpoint = msg.provider === 'custom' ? msg.customEndpoint : undefined;
      text = await callOpenAI(minPrompt, msg.model, msg.apiKey, 10, endpoint);
    }
    return { ok: true, preview: text.trim().substring(0, 50) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
