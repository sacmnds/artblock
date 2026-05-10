// Service worker — ArtBlock Brasil
// Arte brasileira de museus públicos no lugar de anúncios

const BRASILIANA_BASE = 'https://brasiliana.museus.gov.br/wp-json/tainacan/v2';
const IBRAM_BASE      = 'https://mhn.acervos.museus.gov.br/wp-json/tainacan/v2';

// --- Sistema de categorias ---
const CATEGORY_CONFIG = {
  all:        { apis: ['brasiliana', 'ibram'], search: '' },
  modernismo: { apis: ['brasiliana'],          search: 'modernismo' },
  academismo: { apis: ['brasiliana'],          search: 'academismo' },
  paisagem:   { apis: ['brasiliana', 'ibram'], search: 'paisagem' },
  historica:  { apis: ['brasiliana', 'ibram'], search: 'história' },
  fotografia: { apis: ['brasiliana'],          search: 'fotografia' },
};

// --- Normaliza item Tainacan ---
function normalizeTainacanItem(item, sourceName, sourceBase) {
  const thumb = item.thumbnail || {};
  const imageUrl =
    thumb['medium_large'] || thumb['large'] || thumb['full'] ||
    thumb['medium'] || null;
  const smallImageUrl = thumb['thumbnail'] || thumb['medium'] || imageUrl;

  if (!imageUrl) return null;

  return {
    id:           `${sourceName}:${item.id}`,
    title:        item.title        || 'Obra sem título',
    artist:       item.author_name  || 'Artista desconhecido',
    date:         item.creation_date || '',
    source:       sourceName === 'ibram' ? 'Museu Histórico Nacional (IBRAM)' : 'Brasiliana Museus',
    sourceUrl:    item.url          || sourceBase,
    imageUrl,
    smallImageUrl,
    width:  0,
    height: 0,
  };
}

// --- Fetch genérico Tainacan ---
async function fetchTainacan(base, search, count) {
  const page = Math.floor(Math.random() * 15) + 1;
  const params = new URLSearchParams({
    perpage:    String(count),
    paged:      String(page),
    status:     'publish',
    fetch_only: 'thumbnail,title,author_name,creation_date,url',
  });
  if (search) params.set('search', search);

  const res = await fetch(`${base}/items?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

// --- Fetch Brasiliana Museus ---
async function fetchBrasilianaArtworks(category = 'all', count = 30) {
  try {
    const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.all;
    const items = await fetchTainacan(BRASILIANA_BASE, cfg.search, count);
    return items
      .map(i => normalizeTainacanItem(i, 'brasiliana', BRASILIANA_BASE))
      .filter(Boolean);
  } catch (e) {
    console.warn('[ArtBlock Brasil SW] Erro Brasiliana:', e);
    return [];
  }
}

// --- Fetch IBRAM/MHN ---
async function fetchIbramArtworks(category = 'all', count = 20) {
  try {
    const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.all;
    const items = await fetchTainacan(IBRAM_BASE, cfg.search, count);
    return items
      .map(i => normalizeTainacanItem(i, 'ibram', IBRAM_BASE))
      .filter(Boolean);
  } catch (e) {
    console.warn('[ArtBlock Brasil SW] Erro IBRAM:', e);
    return [];
  }
}

// ─────────────────────────────────────────────
// TUDO ABAIXO É IDÊNTICO AO ORIGINAL
// ─────────────────────────────────────────────

const tabCounts = new Map();
const shownIds  = new Set();
let lastSource  = '';

function classifyAspect(width, height) {
  const ratio = width / height;
  if (ratio > 1.3) return 'landscape';
  if (ratio < 0.77) return 'portrait';
  return 'square';
}

async function storeInCache(artworks, category) {
  if (!artworks || artworks.length === 0) return;
  const buckets = { landscape: [], portrait: [], square: [] };

  for (const art of artworks) {
    if (shownIds.has(art.id)) continue;
    let aspect = 'square';
    if (art.width && art.height) aspect = classifyAspect(art.width, art.height);
    const entry = { ...art, cachedAt: Date.now() };
    buckets[aspect].push(entry);
    if (!art.width || !art.height) {
      buckets.landscape.push({ ...entry });
      buckets.portrait.push({ ...entry });
    }
  }

  for (const [aspect, entries] of Object.entries(buckets)) {
    if (entries.length === 0) continue;
    const key = `cache:${category}:${aspect}`;
    const existing = (await chrome.storage.local.get(key))[key] || [];
    const ids = new Set(existing.map(e => e.id));
    const merged = [...existing, ...entries.filter(e => !ids.has(e.id))];
    await chrome.storage.local.set({ [key]: merged.slice(-300) });
  }
}

async function fetchAndCache(category) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.all;
  const fetchers = config.apis.map(api => {
    switch (api) {
      case 'brasiliana': return fetchBrasilianaArtworks(category).catch(() => []);
      case 'ibram':      return fetchIbramArtworks(category).catch(() => []);
      default:           return Promise.resolve([]);
    }
  });
  const results = await Promise.all(fetchers);
  const allArtworks = interleave(results);
  if (allArtworks.length > 0) await storeInCache(allArtworks, category);
  return allArtworks;
}

function interleave(arrays) {
  const result = [];
  const maxLen = Math.max(...arrays.map(a => a.length));
  for (let i = 0; i < maxLen; i++)
    for (const arr of arrays)
      if (i < arr.length) result.push(arr[i]);
  return result;
}

async function popFromCache(aspectClass, category, targetRatio) {
  const bucketOrder = [aspectClass];
  if (aspectClass !== 'square') bucketOrder.push('square');
  if (aspectClass === 'landscape') bucketOrder.push('portrait');
  if (aspectClass === 'portrait')  bucketOrder.push('landscape');

  for (const bucket of bucketOrder) {
    const key = `cache:${category}:${bucket}`;
    const result = await chrome.storage.local.get(key);
    const items = result[key];
    if (!items || items.length === 0) continue;

    const now = Date.now();
    const valid = items.filter(item =>
      now - item.cachedAt < 7 * 24 * 60 * 60 * 1000 && !shownIds.has(item.id)
    );
    if (valid.length === 0) continue;

    const fromOtherSource = valid.filter(item => item.source !== lastSource);
    const candidates = fromOtherSource.length > 0 ? fromOtherSource : valid;
    const pick = pickBestMatch(candidates, targetRatio);
    if (!pick) continue;

    const remaining = items.filter(item => item.id !== pick.id);
    await chrome.storage.local.set({ [key]: remaining });
    shownIds.add(pick.id);
    lastSource = pick.source;
    if (remaining.length < 10) fetchAndCache(category).catch(() => {});
    return pick;
  }
  return null;
}

function pickBestMatch(artworks, targetRatio) {
  const withDims = artworks.filter(a => a.width && a.height);
  if (withDims.length > 0) {
    withDims.sort((a, b) =>
      Math.abs((a.width / a.height) - targetRatio) -
      Math.abs((b.width / b.height) - targetRatio)
    );
    const top = withDims.slice(0, Math.min(5, withDims.length));
    return top[Math.floor(Math.random() * top.length)];
  }
  return artworks[Math.floor(Math.random() * artworks.length)];
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_ART') {
    handleGetArt(message).then(sendResponse);
    return true;
  }
  if (message.type === 'INCREMENT_COUNT') {
    const tabId = sender.tab?.id;
    if (tabId) {
      const count = (tabCounts.get(tabId) || 0) + 1;
      tabCounts.set(tabId, count);
      chrome.action.setBadgeText({ text: String(count), tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#009c3b', tabId });
      chrome.storage.session.get({ totalReplaced: 0 }).then(result => {
        chrome.storage.session.set({ totalReplaced: result.totalReplaced + 1 });
      });
    }
    sendResponse({ ok: true });
    return false;
  }
  if (message.type === 'GET_COUNT') {
    chrome.storage.session.get({ totalReplaced: 0 }).then(sendResponse);
    return true;
  }
  if (message.type === 'REFILL_CACHE') {
    fetchAndCache(message.category).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === 'OPEN_SETTINGS') {
    chrome.action.openPopup();
    sendResponse({ ok: true });
    return false;
  }
});

async function handleGetArt({ width, height, categories }) {
  if (!categories?.length) return null;
  const aspectClass  = classifyAspect(width, height);
  const targetRatio  = width / height;
  const shuffled     = [...categories].sort(() => Math.random() - 0.5);

  for (const category of shuffled) {
    const artwork = await popFromCache(aspectClass, category, targetRatio);
    if (artwork) return { artwork };
  }

  await Promise.all(shuffled.map(cat => fetchAndCache(cat)));

  for (const category of shuffled) {
    const artwork = await popFromCache(aspectClass, category, targetRatio);
    if (artwork) return { artwork };
  }
  return null;
}

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[ArtBlock Brasil] Instalado — carregando acervo...');
  await Promise.all(
    ['modernismo', 'academismo', 'paisagem', 'historica', 'fotografia']
      .map(cat => fetchAndCache(cat))
  );
  console.log('[ArtBlock Brasil] Acervo carregado!');
});

chrome.tabs.onRemoved.addListener((tabId) => tabCounts.delete(tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabCounts.set(tabId, 0);
    chrome.action.setBadgeText({ text: '', tabId });
  }
});
