/**
 * home.js — 主页卡册逻辑（列表、分类、搜索、置顶）
 */

// ── 列表分页配置 ─────────────────────────────────────
const PAGE_SIZE = 20; // 每次渲染的卡片数量

const Home = (() => {
  let currentCat = 'all';
  let searchMode = false;
  let _filtered = [];    // 当前筛选后的完整列表
  let _rendered = 0;     // 已渲染的数量

  // ── 渲染卡片列表 ──────────────────────────────────
  function render() {
    const cards = Store.getCards();
    const query = searchMode
      ? document.getElementById('search-input').value.trim().toLowerCase()
      : '';

    let filtered = cards;

    // 搜索过滤
    if (query) {
      filtered = cards.filter(c =>
        (c.name || '').toLowerCase().includes(query) ||
        (c.playerName || '').toLowerCase().includes(query)
      );
    } else if (currentCat === 'pinned') {
      filtered = cards.filter(c => c.pinned);
    } else if (currentCat !== 'all') {
      filtered = cards.filter(c => c.categoryId === currentCat);
    }

    // 置顶排序（置顶的排前面）
    _filtered = [
      ...filtered.filter(c => c.pinned),
      ...filtered.filter(c => !c.pinned),
    ];
    _rendered = 0;

    const list = document.getElementById('card-list');

    if (_filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="display:flex">
          <svg class="empty-icon" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>
          <p>${currentCat === 'all' ? '还没有角色卡' : currentCat === 'pinned' ? '没有置顶的卡' : '该分类下没有卡'}</p>
          <p class="empty-sub">${currentCat === 'all' ? '点击右上角 + 开始创建' : '切换到「全部」查看所有卡'}</p>
        </div>`;
      return;
    }

    // 首次渲染第一页
    list.innerHTML = '';
    _renderMore();
  }

  // ── 追加渲染更多卡片 ──────────────────────────────
  function _renderMore() {
    const list = document.getElementById('card-list');
    const end = Math.min(_rendered + PAGE_SIZE, _filtered.length);
    const fragment = document.createDocumentFragment();

    for (let i = _rendered; i < end; i++) {
      const div = document.createElement('div');
      div.innerHTML = cardHTML(_filtered[i]);
      fragment.appendChild(div.firstElementChild);
    }
    list.appendChild(fragment);
    _rendered = end;

    // 如果还有更多，显示加载更多按钮
    const existingBtn = list.querySelector('.load-more-btn');
    if (existingBtn) existingBtn.remove();

    if (_rendered < _filtered.length) {
      const btn = document.createElement('button');
      btn.className = 'load-more-btn';
      btn.textContent = `加载更多（还有 ${_filtered.length - _rendered} 张）`;
      btn.addEventListener('click', _renderMore);
      list.appendChild(btn);
    }
  }

  function cardHTML(card) {
    const sys = card.system;
    const pin = card.pinned ? '<span class="char-card-pin"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" stroke="none"/></svg></span>' : '';

    let stats = '';
    if (sys === 'coc7') {
      const hp  = card.attrs?.hp  ?? '—';
      const san = card.attrs?.san ?? '—';
      const luck = card.attrs?.luck ?? '—';
      stats = `
        <div class="char-card-stats">
          <span class="stat-chip">HP <span>${hp}</span></span>
          <span class="stat-chip">SAN <span>${san}</span></span>
          <span class="stat-chip">幸运 <span>${luck}</span></span>
        </div>`;
    } else if (sys === 'dnd5') {
      const hp  = card.attrs?.hpMax ?? '—';
      const ac  = card.attrs?.ac    ?? '—';
      const lv  = card.attrs?.level ?? '—';
      stats = `
        <div class="char-card-stats">
          <span class="stat-chip">HP <span>${hp}</span></span>
          <span class="stat-chip">AC <span>${ac}</span></span>
          <span class="stat-chip">Lv <span>${lv}</span></span>
        </div>`;
    }

    const sub = sys === 'coc7'
      ? [card.occupation, card.age ? card.age + '岁' : ''].filter(Boolean).join(' · ')
      : [card.class, card.race, 'Lv' + (card.attrs?.level || 1)].filter(Boolean).join(' · ');

    return `
      <div class="char-card ${sys}" data-id="${UI.esc(card.id)}">
        <div class="char-card-avatar">${UI.sysIcon(sys)}</div>
        <div class="char-card-info">
          <div class="char-card-name">${UI.esc(card.name || '未命名角色')}</div>
          <div class="char-card-meta">
            ${UI.sysBadge(sys)}
            <span class="char-card-sub">${UI.esc(sub)}</span>
          </div>
          ${stats}
        </div>
        ${pin}
      </div>`;
  }

  // ── 分类标签渲染 ──────────────────────────────────
  function renderCategoryTabs() {
    const cats = Store.getCategories();
    const tabs = document.getElementById('category-tabs');

    tabs.innerHTML = `
      <button class="cat-tab ${currentCat === 'all' ? 'active' : ''}" data-cat="all">全部</button>
      <button class="cat-tab ${currentCat === 'pinned' ? 'active' : ''}" data-cat="pinned">置顶</button>
    `;

    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-tab' + (currentCat === cat.id ? ' active' : '');
      btn.dataset.cat = cat.id;
      btn.textContent = cat.name;
      tabs.appendChild(btn);
    });
  }

  function switchCat(catId) {
    currentCat = catId;
    document.querySelectorAll('.cat-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.cat === catId);
    });
    render();
  }

  // ── 分类管理弹层 ──────────────────────────────────
  function renderCatManage() {
    const cats = Store.getCategories();
    const list = document.getElementById('cat-list-manage');
    if (cats.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:8px 0">暂无自定义分类</p>';
      return;
    }
    list.innerHTML = cats.map(cat => `
      <div class="cat-manage-item">
        <span>${UI.esc(cat.name)}</span>
        <button class="cat-delete-btn" data-id="${cat.id}">删除</button>
      </div>
    `).join('');

    list.querySelectorAll('.cat-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.deleteCategory(btn.dataset.id);
        if (currentCat === btn.dataset.id) currentCat = 'all';
        renderCategoryTabs();
        renderCatManage();
        render();
      });
    });
  }

  // ── 初始化 ────────────────────────────────────────
  function init() {
    renderCategoryTabs();
    render();

    // 分类 tab 点击 — 事件委托绑在外层容器
    document.getElementById('category-bar').addEventListener('click', e => {
      const tab = e.target.closest('.cat-tab');
      if (tab && tab.dataset.cat) switchCat(tab.dataset.cat);
    });

    // 卡片列表点击 — 事件委托，不给每张卡单独绑事件
    document.getElementById('card-list').addEventListener('click', e => {
      const card = e.target.closest('.char-card');
      if (card && card.dataset.id) CardDetail.show(card.dataset.id);
    });

    // 搜索
    document.getElementById('btn-search-toggle').addEventListener('click', () => {
      searchMode = true;
      const bar = document.getElementById('search-bar');
      bar.style.display = 'flex';
      document.getElementById('search-input').focus();
    });

    document.getElementById('btn-search-cancel').addEventListener('click', () => {
      searchMode = false;
      document.getElementById('search-bar').style.display = 'none';
      document.getElementById('search-input').value = '';
      render();
    });

    document.getElementById('search-input').addEventListener('input', render);

    // 新建卡
    document.getElementById('btn-new-card').addEventListener('click', () => {
      UI.showModal('modal-new-card');
    });

    document.getElementById('btn-cancel-new').addEventListener('click', () => {
      UI.hideModal('modal-new-card');
    });

    document.querySelectorAll('.system-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        UI.hideModal('modal-new-card');
        const system = btn.dataset.system;
        if (system === 'coc7') COC7Editor.open(null);
        else if (system === 'dnd5') DND5Editor.open(null);
      });
    });

    // 分类管理
    document.getElementById('btn-manage-cats').addEventListener('click', () => {
      renderCatManage();
      UI.showModal('modal-cats');
    });

    document.getElementById('btn-close-cats').addEventListener('click', () => {
      UI.hideModal('modal-cats');
      renderCategoryTabs();
      render();
    });

    document.getElementById('btn-add-cat').addEventListener('click', () => {
      const input = document.getElementById('cat-new-name');
      const name = input.value.trim();
      if (!name) return;
      Store.addCategory(name);
      input.value = '';
      renderCatManage();
      renderCategoryTabs();
    });

    document.getElementById('cat-new-name').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-add-cat').click();
    });
  }

  return { init, render, renderCategoryTabs };
})();
