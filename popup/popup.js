const sourcesToggle = document.getElementById('sourcesToggle');
const sourcesContent = document.getElementById('sourcesContent');

sourcesToggle.addEventListener('click', () => {
  const open = sourcesContent.hidden;
  sourcesContent.hidden = !open;
  sourcesToggle.classList.toggle('open', open);
});

const enabledToggle = document.getElementById('enabled');
const hoverToggle = document.getElementById('showHoverControls');
const chaosModeToggle = document.getElementById('chaosMode');
const countDisplay = document.getElementById('count');
const exportBtn = document.getElementById('exportSettings');
const importBtn = document.getElementById('importSettings');
const importFile = document.getElementById('importFile');
const profileFeedback = document.getElementById('profileFeedback');
const hoverFeedback = document.getElementById('hoverFeedback');

const CATEGORY_KEYS = ['modernismo', 'academismo', 'paisagem', 'historica', 'fotografia'];
const CATEGORY_DEFAULTS = Object.fromEntries(CATEGORY_KEYS.map(k => [k, true]));
const SYNC_DEFAULTS = { enabled: true, showHoverControls: true, categories: CATEGORY_DEFAULTS };

function getCategoryCheckbox(key) {
  return document.getElementById(`cat-${key}`);
}

function updateChaosMode() {
  const all = CATEGORY_KEYS.every(k => getCategoryCheckbox(k).checked);
  const none = CATEGORY_KEYS.every(k => !getCategoryCheckbox(k).checked);
  chaosModeToggle.indeterminate = !all && !none;
  chaosModeToggle.checked = all;
}

function saveCategories() {
  const categories = Object.fromEntries(
    CATEGORY_KEYS.map(k => [k, getCategoryCheckbox(k).checked])
  );
  chrome.storage.sync.set({ categories });
}

// Show/hide the confirm UI for a reset row.
// The confirm button is on the RIGHT so the user must move their mouse away
// from the trigger button (left-aligned) to actually confirm.
function makeConfirmable(triggerId, warningText, confirmLabel, onConfirm) {
  const trigger = document.getElementById(triggerId);
  const row = trigger.closest('.reset-row');
  let confirmEl = null;

  function showConfirm(e) {
    e.stopPropagation();
    if (confirmEl) { dismiss(); return; }

    confirmEl = document.createElement('div');
    confirmEl.className = 'reset-confirm';
    confirmEl.innerHTML = `
      <p class="reset-warning">${warningText}</p>
      <div class="confirm-row">
        <button class="cancel-btn">Cancel</button>
        <button class="confirm-btn">${confirmLabel}</button>
      </div>
    `;

    confirmEl.querySelector('.cancel-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
    });

    confirmEl.querySelector('.confirm-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      onConfirm();
      dismiss();
    });

    row.appendChild(confirmEl);
  }

  function dismiss() {
    confirmEl?.remove();
    confirmEl = null;
  }

  trigger.addEventListener('click', showConfirm);

  document.addEventListener('click', (e) => {
    if (confirmEl && !row.contains(e.target)) dismiss();
  });
}

async function getPageKey() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) return new URL(tab.url).hostname + new URL(tab.url).pathname;
  } catch {}
  return null;
}

chrome.storage.sync.get(SYNC_DEFAULTS, (s) => {
  enabledToggle.checked = s.enabled;
  hoverToggle.checked = s.showHoverControls;
  const cats = s.categories || CATEGORY_DEFAULTS;
  CATEGORY_KEYS.forEach(k => { getCategoryCheckbox(k).checked = cats[k] ?? true; });
  updateChaosMode();
});

chrome.runtime.sendMessage({ type: 'GET_COUNT' }, (r) => {
  if (r?.totalReplaced) countDisplay.textContent = r.totalReplaced;
});

enabledToggle.addEventListener('change', () => chrome.storage.sync.set({ enabled: enabledToggle.checked }));

hoverToggle.addEventListener('change', () => {
  chrome.storage.sync.set({ showHoverControls: hoverToggle.checked });
  showFeedback(hoverFeedback, 'Recarregue a página.');
});

chaosModeToggle.addEventListener('change', () => {
  const on = chaosModeToggle.checked;
  CATEGORY_KEYS.forEach(k => { getCategoryCheckbox(k).checked = on; });
  chaosModeToggle.indeterminate = false;
  saveCategories();
});

CATEGORY_KEYS.forEach(k => {
  getCategoryCheckbox(k).addEventListener('change', () => {
    updateChaosMode();
    saveCategories();
  });
});

// Reset profile
makeConfirmable(
  'resetProfile',
  'Tem certeza? Isso excluirá permanentemente todas as suas configurações.',
  'Confirmar redefinição',
  () => Promise.all([
    chrome.storage.sync.set(SYNC_DEFAULTS),
    chrome.storage.local.set({ unblockedElements: [] }),
  ]).then(() => {
    enabledToggle.checked = SYNC_DEFAULTS.enabled;
    hoverToggle.checked = SYNC_DEFAULTS.showHoverControls;
    CATEGORY_KEYS.forEach(k => { getCategoryCheckbox(k).checked = true; });
    updateChaosMode();
    showFeedback(profileFeedback, 'Redefinido com sucesso. Recarregue a página para ver o efeito.');
  })
);

// Reset site settings — only shown when we know which site we're on
getPageKey().then(pageKey => {
  if (!pageKey) return;

  const row = document.getElementById('resetSiteRow');
  const hostname = new URL('https://' + pageKey).hostname;

  row.style.display = '';

  makeConfirmable(
    'resetSite',
    `Tem certeza? Isso excluirá suas configurações em ${hostname}`,
    'Confirmar Reset do Site',
    () => chrome.storage.local.get({ unblockedElements: [] }, ({ unblockedElements }) => {
      chrome.storage.local.set({
        unblockedElements: unblockedElements.filter(e => e.pageKey !== pageKey),
      }, () => showFeedback(profileFeedback, 'Pronto. Recarregue a página meu camarada.'));
    })
  );
});

// Export
exportBtn.addEventListener('click', () => {
  Promise.all([
    chrome.storage.sync.get(SYNC_DEFAULTS),
    chrome.storage.local.get({ unblockedElements: [] }),
  ]).then(([sync, local]) => {
    const blob = new Blob([JSON.stringify({ ...sync, ...local }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'artblock-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  });
});

// Import
importBtn.addEventListener('click', () => importFile.click());

function showFeedback(el, msg, isError = false) {
  el.textContent = msg;
  el.className = isError ? 'feedback feedback--error' : 'feedback feedback--success';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.textContent = ''; el.className = 'feedback'; }, 4000);
}

const VALID_CATEGORIES = ['all', 'modernismo', 'academismo', 'paisagem', 'historica', 'fotografia'];

importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  importFile.value = '';
  if (!file) return;

  if (!file.name.endsWith('.json')) {
    showFeedback(profileFeedback, 'O arquivo deve ser .json.', true);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    let data;
    try {
      data = JSON.parse(e.target.result);
    } catch {
      showFeedback(profileFeedback, 'Arquivo inválido, não foi possível parseá-lo.', true);
      return;
    }

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      showFeedback(profileFeedback, 'Formato de arquivo de configurações inválido.', true);
      return;
    }

    const hasKnownKey = ['enabled', 'category', 'showHoverControls', 'unblockedElements']
      .some(k => k in data);
    if (!hasKnownKey) {
      showFeedback(profileFeedback, "O arquivo não parece ser uma exportação do Artblock Brasil.", true);
      return;
    }

    if ('category' in data && !VALID_CATEGORIES.includes(data.category)) {
      showFeedback(profileFeedback, `Categoria desconhecida "${data.category}" no arquivo .`, true);
      return;
    }

    const syncData = {
      enabled: typeof data.enabled === 'boolean' ? data.enabled : SYNC_DEFAULTS.enabled,
      showHoverControls: typeof data.showHoverControls === 'boolean' ? data.showHoverControls : SYNC_DEFAULTS.showHoverControls,
      categories: (typeof data.categories === 'object' && data.categories !== null)
        ? data.categories : SYNC_DEFAULTS.categories,
    };
    const localData = {
      unblockedElements: Array.isArray(data.unblockedElements) ? data.unblockedElements : [],
    };

    Promise.all([
      chrome.storage.sync.set(syncData),
      chrome.storage.local.set(localData),
    ]).then(() => {
      enabledToggle.checked = syncData.enabled;
      hoverToggle.checked = syncData.showHoverControls;
      const cats = syncData.categories || CATEGORY_DEFAULTS;
      CATEGORY_KEYS.forEach(k => { getCategoryCheckbox(k).checked = cats[k] ?? true; });
      updateChaosMode();
      showFeedback(profileFeedback, 'Configurações importadas com sucesso. Recarregue a página.');
    });
  };
  reader.readAsText(file);
});
