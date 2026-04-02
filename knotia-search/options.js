// options.js — Knotia AI Search Settings page
// v1.0  2026-03-29  Initial release
// v1.2  2026-03-29  testConnection → sendMessage to background (fix CORS error)
// v1.7  2026-03-31  Sidebar layout: sidebar nav + split sections
//       2026-04-01  Request optional host permission for custom endpoints

// ─────────────────────────────────────────────
// Model lists per provider
// ─────────────────────────────────────────────
const MODELS = {
  anthropic: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku (fast, recommended)' },
    { value: 'claude-sonnet-4-6',         label: 'Claude Sonnet (more accurate)' },
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (fast, cheap)' },
    { value: 'gpt-4o',      label: 'GPT-4o (most accurate)' },
  ],
  custom: [],
};

const KEY_HINTS = {
  anthropic: 'Get your key at <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a>',
  openai:    'Get your key at <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a>',
  custom:    'Enter the API key required by your custom provider.',
};

// ─────────────────────────────────────────────
// Init: restore saved settings
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const saved = await chrome.storage.local.get([
    'provider', 'model', 'apiKey', 'customModel', 'customEndpoint',
  ]);

  const providerEl  = document.getElementById('provider');
  const modelEl     = document.getElementById('model');
  const apiKeyEl    = document.getElementById('api-key');
  const customModel = document.getElementById('custom-model');
  const customEndpt = document.getElementById('custom-endpoint');

  // Restore saved values
  if (saved.provider) providerEl.value = saved.provider;
  updateModelList(providerEl.value);
  if (saved.model)          modelEl.value     = saved.model;
  if (saved.apiKey)         apiKeyEl.value    = saved.apiKey;
  if (saved.customModel)    customModel.value = saved.customModel;
  if (saved.customEndpoint) customEndpt.value = saved.customEndpoint;

  // Provider change
  providerEl.addEventListener('change', () => {
    updateModelList(providerEl.value);
    updateKeyHint(providerEl.value);
    toggleCustomFields(providerEl.value);
  });

  // Show / hide API key
  document.getElementById('toggle-key').addEventListener('click', () => {
    const hidden = apiKeyEl.type === 'password';
    apiKeyEl.type = hidden ? 'text' : 'password';
    document.getElementById('toggle-key').textContent = hidden ? 'Hide' : 'Show';
  });

  document.getElementById('btn-save').addEventListener('click', saveSettings);
  document.getElementById('btn-test').addEventListener('click', testConnection);

  // Open shortcuts page
  document.getElementById('open-shortcuts')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`sec-${btn.dataset.section}`).classList.add('active');
      document.getElementById('status').className = '';
    });
  });
});

// ─────────────────────────────────────────────
// Update model dropdown based on selected provider
// ─────────────────────────────────────────────
function updateModelList(provider) {
  const modelEl = document.getElementById('model');
  const models  = MODELS[provider] || [];

  modelEl.innerHTML = '';
  models.forEach(m => {
    const opt       = document.createElement('option');
    opt.value       = m.value;
    opt.textContent = m.label;
    modelEl.appendChild(opt);
  });

  toggleCustomFields(provider);
  updateKeyHint(provider);
}

function toggleCustomFields(provider) {
  document.getElementById('custom-fields').classList.toggle('visible', provider === 'custom');
}

function updateKeyHint(provider) {
  document.getElementById('key-hint').innerHTML = KEY_HINTS[provider] || '';
}

// ─────────────────────────────────────────────
// Save settings
// ─────────────────────────────────────────────
async function saveSettings() {
  const provider       = document.getElementById('provider').value;
  const model          = document.getElementById('model').value;
  const apiKey         = document.getElementById('api-key').value.trim();
  const customModel    = document.getElementById('custom-model').value.trim();
  const customEndpoint = document.getElementById('custom-endpoint').value.trim();

  if (!apiKey) {
    showStatus('API key cannot be empty.', 'error');
    return;
  }

  // MV3 requires explicit host permission for each custom endpoint origin.
  // Request it here (user gesture satisfies the browser requirement).
  if (provider === 'custom' && customEndpoint) {
    let origin;
    try {
      const url = new URL(customEndpoint);
      origin = `${url.protocol}//${url.host}/*`;
    } catch (_) {
      showStatus('⚠️ Invalid custom endpoint URL.', 'error');
      return;
    }
    const granted = await chrome.permissions.request({ origins: [origin] });
    if (!granted) {
      showStatus('⚠️ Host permission denied — custom endpoint requests will be blocked by the browser.', 'error');
      // Save anyway so the user does not lose other settings.
    }
  }

  await chrome.storage.local.set({ provider, model, apiKey, customModel, customEndpoint });
  showStatus('✅ Settings saved!', 'success');
}

// ─────────────────────────────────────────────
// Test connection: sends a minimal request to verify the key works
// ─────────────────────────────────────────────
function testConnection() {
  const provider       = document.getElementById('provider').value;
  const model          = document.getElementById('model').value;
  const apiKey         = document.getElementById('api-key').value.trim();
  const customModel    = document.getElementById('custom-model').value.trim();
  const customEndpoint = document.getElementById('custom-endpoint').value.trim();

  if (!apiKey) {
    showStatus('Enter an API key first.', 'error');
    return;
  }

  showStatus('Testing…', 'success');

  chrome.runtime.sendMessage(
    {
      type: 'TEST_CONNECTION',
      provider,
      model: provider === 'custom' ? customModel : model,
      apiKey,
      customEndpoint,
    },
    (result) => {
      if (result?.ok) {
        showStatus(`✅ Connected! Model replied: "${result.preview}"`, 'success');
      } else {
        showStatus(`❌ Error: ${result?.error || 'Unknown error'}`, 'error');
      }
    }
  );
}

// ─────────────────────────────────────────────
// Status banner helper
// ─────────────────────────────────────────────
function showStatus(msg, type) {
  const el     = document.getElementById('status');
  el.textContent = msg;
  el.className   = type; // 'success' or 'error'
}
