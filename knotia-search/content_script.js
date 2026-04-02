// content_script.js — Knotia AI Search
// v1.0  2026-03-29  Initial release
// v1.1  2026-03-29  Trigger → Ctrl+Shift+F; Enter-only search; loading spinner
// v1.2  2026-03-29  Platform detection: Mac → Cmd+Shift+F, Windows → Ctrl+Shift+F
// v1.3  2026-03-29  handleSearch() uses AI knowledge to identify standard first
// v1.6  2026-03-31  Search bar HTML: added separator div
// v1.7  2026-04-01  Fix MutationObserver self-trigger loop; fix DOM wrapper cleanup

// ─────────────────────────────────────────────
// Platform
// ─────────────────────────────────────────────
const IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
console.log('[Knotia] content script loaded — IS_MAC:', IS_MAC, '— platform:', navigator.platform);

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
const state = {
  query: '',
  phase: 'idle',   // idle | searching | navigating | highlighting
  tocObserver: null,
  contentObserver: null,
};

// ─────────────────────────────────────────────
// AI relay helpers (send to background.js)
// ─────────────────────────────────────────────
async function callAI_findRelevantTocNodes(query, titles, level) {
  return chrome.runtime.sendMessage({
    type: 'AI_FIND_TOC',
    query,
    titles: titles.map(t => typeof t === 'string' ? t : t.title),
    level,
  });
}

async function callAI_findRelevantParagraphs(query, text) {
  return chrome.runtime.sendMessage({
    type: 'AI_FIND_PARAGRAPHS',
    query,
    text,
  });
}

async function callAI_identifyStandard(query) {
  return chrome.runtime.sendMessage({
    type: 'AI_IDENTIFY_STANDARD',
    query,
  });
}

// ─────────────────────────────────────────────
// 1a. Browser-level shortcut relay from background.js
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'OPEN_SEARCH') openSearchBar();
});

// ─────────────────────────────────────────────
// 1b. Fallback: in-page keydown (works when main frame is focused)
// ─────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Shift makes e.key uppercase → 'F'
  const triggerKey = IS_MAC
    ? (e.metaKey && !e.ctrlKey && e.shiftKey && e.key === 'F')
    : (e.ctrlKey && !e.metaKey && e.shiftKey && e.key === 'F');

  if (triggerKey) {
    e.preventDefault();
    e.stopPropagation();
    openSearchBar();
  }
  // Esc closes the bar from anywhere on the page
  if (e.key === 'Escape' && document.getElementById('knotia-searchbar')) {
    closeSearchBar();
  }
});

// ─────────────────────────────────────────────
// 2. Search bar UI (replicates Chrome native Ctrl+F appearance)
// ─────────────────────────────────────────────
function openSearchBar() {
  if (document.getElementById('knotia-searchbar')) {
    document.getElementById('knotia-input')?.focus();
    return;
  }

  const bar = document.createElement('div');
  bar.id = 'knotia-searchbar';
  bar.innerHTML = `
    <input id="knotia-input" type="text"
      placeholder="Ask a question… then press Enter"
      autocomplete="off"
      spellcheck="false" />
    <div id="knotia-spinner" class="knotia-spinner hidden"></div>
    <span id="knotia-status"></span>
    <button id="knotia-prev" title="Previous (Shift+Enter)">▲</button>
    <button id="knotia-next" title="Next (Enter)">▼</button>
    <div id="knotia-separator"></div>
    <button id="knotia-close" title="Close (Esc)">✕</button>
  `;
  document.body.appendChild(bar);

  const input = document.getElementById('knotia-input');
  input.focus();

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // First Enter: run search; subsequent Enters: navigate to next
      if (state.phase === 'idle' || state.phase === 'searching') {
        handleSearch(input.value.trim());
      } else {
        navigateHighlight(1);
      }
    }
    if (e.key === 'Enter' && e.shiftKey) navigateHighlight(-1);
    if (e.key === 'Escape') closeSearchBar();
  });

  document.getElementById('knotia-close').addEventListener('click', closeSearchBar);
  document.getElementById('knotia-prev').addEventListener('click', () => navigateHighlight(-1));
  document.getElementById('knotia-next').addEventListener('click', () => navigateHighlight(1));
}

function closeSearchBar() {
  document.getElementById('knotia-searchbar')?.remove();
  clearAllHighlights();
  clearTocHighlights();
  state.phase = 'idle';
  state.query = '';
  state.tocObserver?.disconnect();
  state.contentObserver?.disconnect();
}

function setStatus(text) {
  const el = document.getElementById('knotia-status');
  if (el) el.textContent = text;
}

function setSpinner(visible) {
  const el = document.getElementById('knotia-spinner');
  if (!el) return;
  el.classList.toggle('hidden', !visible);
}

// ─────────────────────────────────────────────
// 3. Main flow: user submits a question
// ─────────────────────────────────────────────
async function handleSearch(query) {
  if (!query || state.phase === 'searching') return;
  state.query = query;
  state.phase = 'searching';
  clearAllHighlights();
  clearTocHighlights();

  // ── Step 1: AI identifies standard from its own knowledge ──
  setSpinner(true);
  setStatus('Identifying relevant standard…');

  let identification = { standards: [], topic: '', hint: '' };
  try {
    identification = await callAI_identifyStandard(query);
  } catch (e) {
    // silent — fall through to TOC-based fallback
  }

  if (identification.standards.length > 0) {
    setStatus(`📚 ${identification.hint}`);
    highlightTocNodes(identification.standards);
    await new Promise(r => setTimeout(r, 1500));
    setStatus(`📍 ${identification.standards.join(', ')} — click to expand`);

  } else {
    // ── Fallback: let AI look at the TOC title list ──
    const tocNodes = getTocNodeTitles();

    if (tocNodes.length === 0) {
      setSpinner(false);
      setStatus('⚠️ TOC not found — are you on a Knotia standards page?');
      state.phase = 'idle';
      return;
    }

    setStatus('Analyzing…');
    let relevantTitles;
    try {
      relevantTitles = await callAI_findRelevantTocNodes(query, tocNodes, 'top');
    } catch (e) {
      setSpinner(false);
      setStatus('❌ AI error — check Settings for a valid API key');
      state.phase = 'idle';
      return;
    }

    if (!relevantTitles || relevantTitles.length === 0) {
      setSpinner(false);
      setStatus('No relevant standards found');
      state.phase = 'idle';
      return;
    }

    highlightTocNodes(relevantTitles);
    setStatus(`📍 ${relevantTitles.length} standard(s) found — click to expand`);
  }

  setSpinner(false);
  state.phase = 'navigating';

  // Watch TOC for expansion (user clicks a node → AI guides next layer)
  watchTocForExpansion();

  // Watch content area (user opens a section → AI highlights paragraphs)
  watchContentArea();
}

// ─────────────────────────────────────────────
// 4. Get currently visible TOC node titles
// ─────────────────────────────────────────────
function getTocNodeTitles() {
  return Array.from(document.querySelectorAll('#divTOC a[date-node-id]'))
    .filter(a => a.getAttribute('date-node-id') !== '-1000')
    .map(a => ({
      nodeId: a.getAttribute('date-node-id'),
      title:  a.textContent.trim(),
      element: a,
    }));
}

// ─────────────────────────────────────────────
// 5. Watch TOC for expansion — re-guide after each user click
// ─────────────────────────────────────────────
function watchTocForExpansion() {
  state.tocObserver?.disconnect();

  const toc = document.querySelector('#divTOC');
  if (!toc) return;

  let debounceTimer;
  state.tocObserver = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (state.phase !== 'navigating') return;

      const currentNodes = getTocNodeTitles();
      const titlesText   = currentNodes.map(n => n.title);

      setStatus('🔍 Analyzing new sections...');
      setSpinner(true);

      let relevantTitles;
      try {
        relevantTitles = await callAI_findRelevantTocNodes(state.query, titlesText, 'sub');
      } catch (e) {
        setSpinner(false);
        setStatus('❌ AI error');
        return;
      }
      setSpinner(false);

      clearTocHighlights();
      highlightTocNodes(relevantTitles);

      if (relevantTitles && relevantTitles.length > 0) {
        setStatus(`📍 ${relevantTitles.length} relevant section(s) — click to expand or open`);
      } else {
        setStatus('No specific sections matched — try opening a section');
      }
    }, 600);
  });

  state.tocObserver.observe(toc, { childList: true, subtree: true });
}

// ─────────────────────────────────────────────
// 6. Watch content area — highlight paragraphs when section opens
// ─────────────────────────────────────────────
function watchContentArea() {
  state.contentObserver?.disconnect();

  const contentArea = document.querySelector('#divDocumentBody');
  if (!contentArea) return;

  let debounceTimer;
  state.contentObserver = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const text = contentArea.innerText?.trim();
      // Only proceed when substantial content is loaded (not just a placeholder)
      if (!text || text.length < 500) return;

      state.phase = 'highlighting';
      setStatus('🔍 Finding relevant paragraphs...');
      setSpinner(true);
      clearAllHighlights();

      let relevantPhrases;
      try {
        relevantPhrases = await callAI_findRelevantParagraphs(state.query, text);
      } catch (e) {
        setSpinner(false);
        setStatus('❌ AI error');
        state.phase = 'navigating';
        return;
      }
      setSpinner(false);

      if (!relevantPhrases || relevantPhrases.length === 0) {
        setStatus('No specific paragraphs matched');
        state.phase = 'navigating';
        return;
      }

      // Disconnect before mutating DOM to prevent the observer from
      // re-triggering on its own highlight insertions.
      state.contentObserver.disconnect();
      highlightTextInContent(contentArea, relevantPhrases);
      state.contentObserver.observe(contentArea, { childList: true, subtree: true });

      const count = document.querySelectorAll('mark.knotia-highlight').length;
      setStatus(`${count} relevant passage(s)  ▲▼ to navigate`);
      state.phase = 'navigating';
    }, 800);
  });

  state.contentObserver.observe(contentArea, { childList: true, subtree: true });
}

// ─────────────────────────────────────────────
// 7. TOC node highlighting
// ─────────────────────────────────────────────
function highlightTocNodes(relevantTitles) {
  if (!relevantTitles || relevantTitles.length === 0) return;
  const titlesSet = new Set(relevantTitles.map(t => t.toLowerCase()));

  document.querySelectorAll('#divTOC a[date-node-id]').forEach(a => {
    const title = a.textContent.trim().toLowerCase();
    const matched = titlesSet.has(title)
      || [...titlesSet].some(t => title.includes(t) || t.includes(title));
    if (matched) a.classList.add('knotia-toc-highlight');
  });
}

function clearTocHighlights() {
  document.querySelectorAll('.knotia-toc-highlight').forEach(el => {
    el.classList.remove('knotia-toc-highlight');
  });
}

// ─────────────────────────────────────────────
// 8. Body text highlighting (wraps matches in <mark>, preserves DOM)
// ─────────────────────────────────────────────
let highlightIndex = 0;

function highlightTextInContent(container, phrases) {
  highlightIndex = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes  = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);

  nodes.forEach(textNode => {
    const parent = textNode.parentNode;
    if (!parent) return;
    if (['SCRIPT', 'STYLE', 'MARK'].includes(parent.tagName)) return;

    let html    = textNode.textContent;
    let matched = false;

    phrases.forEach(phrase => {
      if (!phrase || phrase.length < 4) return;
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex   = new RegExp(`(${escaped})`, 'gi');
      if (regex.test(html)) {
        html    = html.replace(regex, '<mark class="knotia-highlight">$1</mark>');
        matched = true;
      }
    });

    if (matched) {
      const span = document.createElement('span');
      span.className = 'knotia-wrapper';
      span.innerHTML = html;
      parent.replaceChild(span, textNode);
    }
  });

  // Auto-scroll to first match
  const first = document.querySelector('mark.knotia-highlight');
  if (first) {
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    first.classList.add('current');
  }
}

function navigateHighlight(direction) {
  const marks = Array.from(document.querySelectorAll('mark.knotia-highlight'));
  if (marks.length === 0) return;

  marks[highlightIndex]?.classList.remove('current');
  highlightIndex = (highlightIndex + direction + marks.length) % marks.length;
  marks[highlightIndex].classList.add('current');
  marks[highlightIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });

  const el = document.getElementById('knotia-status');
  if (el) el.textContent = `${highlightIndex + 1} / ${marks.length}`;
}

function clearAllHighlights() {
  // Replace each <mark> with a plain text node (unwrap highlight)
  document.querySelectorAll('mark.knotia-highlight').forEach(mark => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  });
  // Unwrap knotia-wrapper spans, restoring the original text node structure
  document.querySelectorAll('span.knotia-wrapper').forEach(span => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
    parent.normalize();
  });
  highlightIndex = 0;
}
