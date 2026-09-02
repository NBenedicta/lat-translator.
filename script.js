// ===========================
// LAT — Language Translator
// ===========================

(function () {
  'use strict';

  // ---------- Config ----------

  const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ru', name: 'Russian' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
    { code: 'tr', name: 'Turkish' },
    { code: 'pl', name: 'Polish' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'th', name: 'Thai' },
    { code: 'id', name: 'Indonesian' },
    { code: 'yo', name: 'Yoruba' },
    { code: 'ig', name: 'Igbo' },
    { code: 'ha', name: 'Hausa' },
    { code: 'sw', name: 'Swahili' },
    { code: 'zu', name: 'Zulu' },
    { code: 'am', name: 'Amharic' },
  ];

  const MAX_CHARS = 2000;
  const API_URL = '/api/translate';

  // ---------- DOM ----------

  const sourceLangEl = document.getElementById('sourceLang');
  const targetLangEl = document.getElementById('targetLang');
  const sourceTextEl = document.getElementById('sourceText');
  const outputTextEl = document.getElementById('outputText');
  const charCountEl = document.getElementById('charCount');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');
  const copiedTip = document.getElementById('copiedTip');
  const swapBtn = document.getElementById('swapBtn');
  const translateBtn = document.getElementById('translateBtn');
  const spinner = document.getElementById('spinner');
  const errorBox = document.getElementById('errorBox');

  // ---------- Populate dropdowns ----------

  function buildOptions(selectEl, includeAuto) {
    if (includeAuto) {
      const opt = document.createElement('option');
      opt.value = 'auto';
      opt.textContent = 'Auto-Detect';
      selectEl.appendChild(opt);
    }
    LANGUAGES.forEach((lang) => {
      const opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = lang.name;
      selectEl.appendChild(opt);
    });
  }

  buildOptions(sourceLangEl, true);
  buildOptions(targetLangEl, false);

  sourceLangEl.value = 'auto';
  targetLangEl.value = 'es';

  // ---------- Helpers ----------

  let requestToken = 0;
  let lastDetectedSource = null; // set after an Auto-Detect translation, used by swap

  function updateCharCount() {
    const len = sourceTextEl.value.length;
    charCountEl.textContent = `${len} / ${MAX_CHARS}`;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function hideError() {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  function setLoading(isLoading) {
    spinner.hidden = !isLoading;
    translateBtn.disabled = isLoading;
    translateBtn.textContent = isLoading ? 'Translating…' : 'Translate';
  }

  function setOutput(text) {
    outputTextEl.value = text;
    outputTextEl.classList.remove('fade-in');
    // restart animation
    void outputTextEl.offsetWidth;
    outputTextEl.classList.add('fade-in');
  }

  // ---------- Translation ----------
  // Calls our own /api/translate serverless function, which uses DeepL as
  // the primary engine (with real auto-detect) and falls back to MyMemory
  // only for the two languages DeepL doesn't support (Yoruba, Amharic).

  async function translate() {
    const text = sourceTextEl.value.trim();

    if (!text) {
      setOutput('');
      hideError();
      return;
    }

    const sourceCode = sourceLangEl.value;
    const targetCode = targetLangEl.value;

    if (sourceCode !== 'auto' && sourceCode === targetCode) {
      hideError();
      setOutput(text);
      return;
    }

    hideError();
    setLoading(true);

    const token = ++requestToken;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: sourceCode, target: targetCode }),
      });

      if (token !== requestToken) return; // a newer request superseded this one

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Translation service error (HTTP ${res.status})`);
      }

      if (!data.translatedText) {
        throw new Error('No translation was returned. Please try again.');
      }

      if (sourceCode === 'auto') {
        lastDetectedSource = data.detectedSourceLang || null;
      }

      setOutput(data.translatedText);
    } catch (err) {
      if (token !== requestToken) return;
      console.error('Translation failed:', err);
      setOutput('');
      showError(err.message || 'Could not translate right now. Please wait a moment and try again.');
    } finally {
      if (token === requestToken) setLoading(false);
    }
  }

  // ---------- Events ----------

  sourceTextEl.addEventListener('input', () => {
    updateCharCount();
    // Translation only fires on an explicit action (Translate button,
    // language change, or swap) — not automatically while typing.
  });

  translateBtn.addEventListener('click', translate);

  sourceLangEl.addEventListener('change', translate);

  targetLangEl.addEventListener('change', translate);

  clearBtn.addEventListener('click', () => {
    sourceTextEl.value = '';
    updateCharCount();
    setOutput('');
    hideError();
    sourceTextEl.focus();
  });

  swapBtn.addEventListener('click', () => {
    if (sourceLangEl.value === 'auto') {
      // Can't swap "Auto-Detect" into the target slot meaningfully;
      // use the language we most recently detected, if we have one.
      sourceLangEl.value = targetLangEl.value;
      targetLangEl.value = lastDetectedSource || 'en';
    } else {
      const tmp = sourceLangEl.value;
      sourceLangEl.value = targetLangEl.value;
      targetLangEl.value = tmp;
    }

    const sourceVal = sourceTextEl.value;
    const outputVal = outputTextEl.value;
    sourceTextEl.value = outputVal;
    outputTextEl.value = sourceVal;

    updateCharCount();
    hideError();

    if (sourceTextEl.value.trim()) {
      translate();
    }
  });

  copyBtn.addEventListener('click', async () => {
    const text = outputTextEl.value;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback for older browsers / insecure contexts
      outputTextEl.removeAttribute('readonly');
      outputTextEl.select();
      document.execCommand('copy');
      outputTextEl.setAttribute('readonly', 'true');
    }

    copiedTip.hidden = false;
    clearTimeout(copyBtn._tipTimer);
    copyBtn._tipTimer = setTimeout(() => {
      copiedTip.hidden = true;
    }, 1500);
  });

  // ---------- Init ----------

  updateCharCount();
})();
