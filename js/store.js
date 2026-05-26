/**
 * store.js — 本地数据存储层
 * 所有数据存在 localStorage，key 前缀 trpg_
 */

const Store = (() => {
  const KEYS = {
    cards:      'trpg_cards',
    categories: 'trpg_categories',
    memo:       'trpg_memo',
    settings:   'trpg_settings',
  };

  // ── 通用读写 ──────────────────────────────────────
  function _get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  function _set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {
      console.error('Storage write failed:', e);
      // 尝试通知用户（UI 可能还没加载，用 try 保护）
      try { UI.toast('存储空间不足，数据可能未保存'); } catch(_) {}
    }
  }

  // ── 角色卡 ────────────────────────────────────────
  function getCards() {
    return _get(KEYS.cards, []);
  }

  function saveCard(card) {
    const cards = getCards();
    const idx = cards.findIndex(c => c.id === card.id);
    if (idx >= 0) {
      cards[idx] = card;
    } else {
      cards.unshift(card); // 新卡插到最前
    }
    _set(KEYS.cards, cards);
    return card;
  }

  function deleteCard(id) {
    const cards = getCards().filter(c => c.id !== id);
    _set(KEYS.cards, cards);
  }

  function getCard(id) {
    return getCards().find(c => c.id === id) || null;
  }

  // ── 分类 ──────────────────────────────────────────
  function getCategories() {
    return _get(KEYS.categories, []);
  }

  function saveCategories(cats) {
    _set(KEYS.categories, cats);
  }

  function addCategory(name) {
    const cats = getCategories();
    const id = 'cat_' + Date.now();
    cats.push({ id, name });
    _set(KEYS.categories, cats);
    return { id, name };
  }

  function deleteCategory(id) {
    // 删分类时，把该分类下的卡移到"未分类"
    const cats = getCategories().filter(c => c.id !== id);
    _set(KEYS.categories, cats);
    const cards = getCards().map(c => {
      if (c.categoryId === id) return { ...c, categoryId: null };
      return c;
    });
    _set(KEYS.cards, cards);
  }

  // ── 备忘录 ────────────────────────────────────────
  function getMemo() { return _get(KEYS.memo, ''); }
  function saveMemo(text) { _set(KEYS.memo, text); }

  // ── 设置 ──────────────────────────────────────────
  function getSettings() {
    return _get(KEYS.settings, {
      sessionToolUrl: '',
      xianyuUrl: '',
      rewardQrUrl: '',
    });
  }
  function saveSettings(s) { _set(KEYS.settings, s); }

  // ── 全量导出/导入 ─────────────────────────────────
  function exportAll() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      cards: getCards(),
      categories: getCategories(),
      memo: getMemo(),
    };
  }

  function importAll(data) {
    if (!data || data.version !== 1) throw new Error('数据格式不兼容');
    if (Array.isArray(data.cards))      _set(KEYS.cards, data.cards);
    if (Array.isArray(data.categories)) _set(KEYS.categories, data.categories);
    if (typeof data.memo === 'string')  _set(KEYS.memo, data.memo);
  }

  // ── 工具函数 ──────────────────────────────────────
  function genId() {
    return 'card_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  return {
    getCards, saveCard, deleteCard, getCard,
    getCategories, saveCategories, addCategory, deleteCategory,
    getMemo, saveMemo,
    getSettings, saveSettings,
    exportAll, importAll,
    genId,
  };
})();
