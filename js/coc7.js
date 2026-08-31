/**
 * coc7.js — COC 7e 建卡 / 查卡逻辑
 */

// ── COC 7e 默认技能表 ─────────────────────────────────────────────────────────
const COC7_SKILLS = [
  { name: '会计',     base: 5  },
  { name: '人类学',   base: 1  },
  { name: '估价',     base: 5  },
  { name: '考古学',   base: 1  },
  { name: '魅惑',     base: 15 },
  { name: '攀爬',     base: 20 },
  { name: '计算机',   base: 5  },
  { name: '信用评级', base: 0  },
  { name: '克苏鲁神话',base: 0 },
  { name: '乔装',     base: 5  },
  { name: '闪避',     base: null }, // = DEX/2
  { name: '驾驶(汽车)',base: 20 },
  { name: '电气维修', base: 10 },
  { name: '电子学',   base: 1  },
  { name: '话术',     base: 5  },
  { name: '急救',     base: 30 },
  { name: '历史',     base: 5  },
  { name: '恐吓',     base: 15 },
  { name: '跳跃',     base: 20 },
  { name: '法律',     base: 5  },
  { name: '图书馆使用',base: 20 },
  { name: '聆听',     base: 20 },
  { name: '锁匠',     base: 1  },
  { name: '机械维修', base: 10 },
  { name: '医学',     base: 1  },
  { name: '博物学',   base: 10 },
  { name: '领航',     base: 10 },
  { name: '神秘学',   base: 5  },
  { name: '操作重型机械',base: 1},
  { name: '说服',     base: 10 },
  { name: '精神分析', base: 1  },
  { name: '心理学',   base: 10 },
  { name: '骑术',     base: 5  },
  { name: '科学(天文学)',base: 1},
  { name: '科学(生物学)',base: 1},
  { name: '科学(化学)',base: 1 },
  { name: '科学(地质学)',base: 1},
  { name: '科学(数学)',base: 10 },
  { name: '科学(物理学)',base: 1},
  { name: '侦查',     base: 25 },
  { name: '妙手',     base: 10 },
  { name: '潜行',     base: 20 },
  { name: '游泳',     base: 20 },
  { name: '投掷',     base: 20 },
  { name: '追踪',     base: 10 },
  { name: '驾驶(船)',  base: 1  },
  { name: '驾驶(飞机)',base: 1  },
  { name: '格斗(斗殴)',base: 25 },
  { name: '射击(手枪)',base: 20 },
  { name: '射击(步枪)',base: 25 },
  { name: '射击(霰弹枪)',base: 25},
];

// ── 属性计算辅助 ──────────────────────────────────────────────────────────────
function calcCOC7Derived(attrs) {
  const str = parseInt(attrs.STR) || 0;
  const con = parseInt(attrs.CON) || 0;
  const siz = parseInt(attrs.SIZ) || 0;
  const dex = parseInt(attrs.DEX) || 0;
  const pow = parseInt(attrs.POW) || 0;
  const int = parseInt(attrs.INT) || 0;
  const edu = parseInt(attrs.EDU) || 0;
  const app = parseInt(attrs.APP) || 0;

  const hp   = Math.floor((con + siz) / 10);
  const mp   = Math.floor(pow / 5);
  const san  = pow;
  const luck = parseInt(attrs.luck) || 0;
  const mov  = (str < siz && dex < siz) ? 7
             : (str > siz && dex > siz) ? 9 : 8;

  // 体格（COC 7e 规则，基于 STR+SIZ 实际值）
  const strSiz = str + siz;
  let db = '0', build = 0;
  if      (strSiz <= 64)  { db = '-2';   build = -2; }
  else if (strSiz <= 84)  { db = '-1';   build = -1; }
  else if (strSiz <= 124) { db = '0';    build =  0; }
  else if (strSiz <= 164) { db = '+1D4'; build =  1; }
  else if (strSiz <= 204) { db = '+1D6'; build =  2; }
  else                    { db = '+2D6'; build =  3; }

  return { hp, mp, san, mov, db, build };
}

// ── COC7Editor：建卡编辑器 ────────────────────────────────────────────────────
const COC7Editor = (() => {

  let _card = null; // 当前编辑的卡片数据

  // 打开编辑器（id=null 为新建）
  function open(id) {
    if (id) {
      _card = JSON.parse(JSON.stringify(Store.getCard(id)));
    } else {
      _card = {
        id:         Store.genId(),
        system:     'coc7',
        name:       '',
        playerName: '',
        occupation: '',
        age:        '',
        gender:     '',
        birthplace:  '',
        residence:  '',
        categoryId: null,
        pinned:     false,
        attrs: {
          STR: '', CON: '', SIZ: '', DEX: '',
          APP: '', INT: '', POW: '', EDU: '',
          luck: '',
          hp: '', mp: '', san: '',
        },
        skills:       {},   // { 技能名: 数值 }
        customFields: [],   // [{ name, value }]
        backstory:    '',
        notes:        '',
        createdAt:    Date.now(),
        updatedAt:    Date.now(),
      };
    }
    UI.showFullscreen(_buildHTML());
    _bindEvents();
  }

  // ── 构建 HTML ──────────────────────────────────────
  function _buildHTML() {
    const c = _card;
    const a = c.attrs || {};
    const derived = calcCOC7Derived(a);

    // 技能列表 HTML
    const skillsHTML = COC7_SKILLS.map(sk => {
      const baseVal = sk.base === null
        ? (Math.floor((parseInt(a.DEX) || 0) / 2) || '—')
        : sk.base;
      const val = c.skills[sk.name] !== undefined ? c.skills[sk.name] : '';
      const displayBase = sk.base === null ? `DEX/2` : sk.base;
      return `
        <div class="skill-row">
          <div class="skill-name-wrap">
            <span class="skill-name">${UI.esc(sk.name)}</span>
            <span class="skill-base-hint">基础 ${displayBase}</span>
          </div>
          <input class="skill-input" type="number" min="0" max="99"
            data-skill="${UI.esc(sk.name)}"
            value="${UI.esc(val)}"
            placeholder="${baseVal}">
        </div>`;
    }).join('');

    // 自定义字段 HTML
    const customHTML = (c.customFields || []).map((f, i) => `
      <div class="custom-field-row" data-idx="${i}">
        <input class="custom-field-name" type="text" placeholder="字段名"
          value="${UI.esc(f.name)}" data-custom-name="${i}">
        <input class="custom-field-val form-input form-input-sm" type="text"
          placeholder="值" value="${UI.esc(f.value)}" data-custom-val="${i}">
        <button class="btn-del-custom" data-del-custom="${i}">×</button>
      </div>`).join('');

    const cats = Store.getCategories();
    const catOptions = cats.map(cat =>
      `<option value="${UI.esc(cat.id)}" ${c.categoryId === cat.id ? 'selected' : ''}>${UI.esc(cat.name)}</option>`
    ).join('');

    return `
<div class="card-editor" id="coc7-editor">
  <nav class="editor-nav">
    <button class="text-btn" id="coc7-back">取消</button>
    <span class="editor-nav-title">COC 7e · ${c.id ? (c.name || '新角色') : '新建角色'}</span>
    <button class="text-btn-primary" id="coc7-save">保存</button>
  </nav>

  <div class="editor-body">

    <!-- 导入数值 -->
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-title">导入 / 导出数值</span>
        <span style="font-size:11px;color:var(--text-muted)">.st 格式</span>
      </div>
      <div class="form-section-body">
        <textarea class="form-textarea" id="f-import-st"
          placeholder="粘贴 .st 数值字符串，自动识别属性和技能…&#10;&#10;例：力量60str60敏捷60dex60…"
          style="min-height:80px;font-size:13px;font-family:monospace"></textarea>
        <div style="display:flex;gap:8px;padding:8px 0 4px">
          <button class="btn-primary" id="coc7-import-st" style="font-size:14px;padding:10px">识别并填入</button>
          <button class="btn-copy-st" id="coc7-copy-st" style="flex-shrink:0;padding:10px 16px;background:var(--bg-raised);border:1px solid var(--border);border-radius:24px;font-size:14px;color:var(--text-sub);transition:all .15s">复制导出</button>
        </div>
        <div id="coc7-import-msg" style="font-size:12px;color:var(--text-muted);padding:4px 0;min-height:18px"></div>
      </div>
    </div>

    <!-- 基本信息 -->
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-title">基本信息</span>
      </div>
      <div class="form-section-body">
        <div class="form-row">
          <label class="form-label">角色名</label>
          <input class="form-input" id="f-name" type="text" placeholder="角色名称" value="${UI.esc(c.name)}">
        </div>
        <div class="form-row">
          <label class="form-label">玩家名</label>
          <input class="form-input" id="f-player" type="text" placeholder="玩家昵称" value="${UI.esc(c.playerName)}">
        </div>
        <div class="form-row">
          <label class="form-label">职业</label>
          <input class="form-input" id="f-occupation" type="text" placeholder="如：私家侦探" value="${UI.esc(c.occupation)}">
        </div>
        <div class="form-row">
          <label class="form-label">年龄</label>
          <input class="form-input form-input-sm" id="f-age" type="number" min="1" max="99" placeholder="25" value="${UI.esc(c.age)}">
        </div>
        <div class="form-row">
          <label class="form-label">性别</label>
          <input class="form-input" id="f-gender" type="text" placeholder="男/女/其他" value="${UI.esc(c.gender)}">
        </div>
        <div class="form-row">
          <label class="form-label">出生地</label>
          <input class="form-input" id="f-birthplace" type="text" placeholder="出生地" value="${UI.esc(c.birthplace)}">
        </div>
        <div class="form-row">
          <label class="form-label">居住地</label>
          <input class="form-input" id="f-residence" type="text" placeholder="现居地" value="${UI.esc(c.residence)}">
        </div>
        <div class="form-row">
          <label class="form-label">分类</label>
          <select class="form-select" id="f-category">
            <option value="">无分类</option>
            ${catOptions}
          </select>
        </div>
      </div>
    </div>

    <!-- 属性值 -->
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-title">属性值</span>
        <button class="text-btn" id="coc7-roll-attrs">随机生成</button>
      </div>
      <div class="attr-grid">
        ${['STR','CON','SIZ','DEX','APP','INT','POW','EDU'].map(attr => `
          <div class="attr-cell">
            <span class="attr-name">${attr}</span>
            <input class="attr-input" id="attr-${attr}" type="number" min="1" max="99"
              value="${UI.esc(a[attr])}" placeholder="—">
            <span class="attr-derived" id="attr-${attr}-half">${a[attr] ? Math.floor(a[attr]/2) + '/' + Math.floor(a[attr]/5) : '—'}</span>
          </div>`).join('')}
      </div>
      <!-- 幸运单独一行 -->
      <div class="form-section-body" style="padding-top:0">
        <div class="form-row">
          <label class="form-label">幸运 (LUK)</label>
          <input class="form-input form-input-sm" id="attr-luck" type="number" min="1" max="99"
            value="${UI.esc(a.luck)}" placeholder="—">
          <button class="text-btn" id="coc7-roll-luck" style="margin-left:8px">骰</button>
        </div>
      </div>
      <!-- 衍生属性展示 -->
      <div class="form-section-body" style="padding-top:0;display:flex;gap:16px;flex-wrap:wrap">
        <span style="font-size:13px;color:var(--text-muted)">HP <b id="d-hp" style="color:var(--text)">${derived.hp || '—'}</b></span>
        <span style="font-size:13px;color:var(--text-muted)">MP <b id="d-mp" style="color:var(--text)">${derived.mp || '—'}</b></span>
        <span style="font-size:13px;color:var(--text-muted)">SAN <b id="d-san" style="color:var(--text)">${derived.san || '—'}</b></span>
        <span style="font-size:13px;color:var(--text-muted)">MOV <b id="d-mov" style="color:var(--text)">${derived.mov || '—'}</b></span>
        <span style="font-size:13px;color:var(--text-muted)">DB <b id="d-db" style="color:var(--text)">${derived.db || '—'}</b></span>
        <span style="font-size:13px;color:var(--text-muted)">体格 <b id="d-build" style="color:var(--text)">${derived.build ?? '—'}</b></span>
      </div>
    </div>

    <!-- 技能 -->
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-title">技能</span>
        <span style="font-size:11px;color:var(--text-muted)">填写实际技能值</span>
      </div>
      <div class="skill-list" id="coc7-skill-list">
        ${skillsHTML}
      </div>
    </div>

    <!-- 自定义字段 -->
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-title">自定义字段</span>
      </div>
      <div class="custom-fields" id="coc7-custom-fields">
        ${customHTML}
      </div>
      <div style="padding:0 16px 12px">
        <button class="btn-add-custom" id="coc7-add-custom">＋ 添加字段</button>
      </div>
    </div>

    <!-- 背景故事 -->
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-title">背景故事</span>
      </div>
      <div class="form-section-body">
        <textarea class="form-textarea" id="f-backstory" placeholder="角色的背景故事、经历…">${UI.esc(c.backstory)}</textarea>
      </div>
    </div>

    <!-- 备注 -->
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-title">备注</span>
      </div>
      <div class="form-section-body">
        <textarea class="form-textarea" id="f-notes" placeholder="其他备注信息…" style="min-height:80px">${UI.esc(c.notes)}</textarea>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="editor-actions">
      <button class="btn-primary" id="coc7-save-bottom">保存角色卡</button>
      ${_card.createdAt !== _card.updatedAt || Store.getCard(_card.id)
        ? `<button class="btn-danger" id="coc7-delete">删除角色卡</button>` : ''}
    </div>

  </div>
</div>`;
  }

  // ── 绑定事件 ──────────────────────────────────────
  function _bindEvents() {
    // 返回
    document.getElementById('coc7-back').addEventListener('click', () => {
      UI.hideFullscreen();
      Home.render();
    });

    // 保存（顶部 & 底部）
    ['coc7-save', 'coc7-save-bottom'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', _save);
    });

    // 删除
    const delBtn = document.getElementById('coc7-delete');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        if (confirm('确定要删除这张角色卡吗？')) {
          Store.deleteCard(_card.id);
          UI.hideFullscreen();
          Home.render();
          UI.toast('已删除');
        }
      });
    }

    // 属性输入 → 实时更新衍生属性
    ['STR','CON','SIZ','DEX','APP','INT','POW','EDU'].forEach(attr => {
      const el = document.getElementById('attr-' + attr);
      if (!el) return;
      el.addEventListener('input', () => {
        const v = parseInt(el.value) || 0;
        document.getElementById('attr-' + attr + '-half').textContent =
          v ? Math.floor(v/2) + '/' + Math.floor(v/5) : '—';
        _updateDerived();
      });
    });
    const luckEl = document.getElementById('attr-luck');
    if (luckEl) luckEl.addEventListener('input', _updateDerived);

    // 随机生成属性
    document.getElementById('coc7-roll-attrs').addEventListener('click', _rollAttrs);
    document.getElementById('coc7-roll-luck').addEventListener('click', _rollLuck);

    // 技能输入事件（预留扩展）
    // 编辑页不再实时显示半值，此处无需处理

    // 导入 .st 数值
    const importStBtn = document.getElementById('coc7-import-st');
    const copyStBtn = document.getElementById('coc7-copy-st');
    if (importStBtn) importStBtn.addEventListener('click', _importST);
    if (copyStBtn) copyStBtn.addEventListener('click', _copyST);

    // 自定义字段
    document.getElementById('coc7-add-custom').addEventListener('click', () => {
      _card.customFields.push({ name: '', value: '' });
      _refreshCustomFields();
    });

    document.getElementById('coc7-custom-fields').addEventListener('click', e => {
      const idx = e.target.dataset.delCustom;
      if (idx !== undefined) {
        _card.customFields.splice(parseInt(idx), 1);
        _refreshCustomFields();
      }
    });
  }

  // ── 刷新自定义字段区域 ────────────────────────────
  function _refreshCustomFields() {
    const container = document.getElementById('coc7-custom-fields');
    container.innerHTML = (_card.customFields || []).map((f, i) => `
      <div class="custom-field-row" data-idx="${i}">
        <input class="custom-field-name" type="text" placeholder="字段名"
          value="${UI.esc(f.name)}" data-custom-name="${i}">
        <input class="custom-field-val form-input form-input-sm" type="text"
          placeholder="值" value="${UI.esc(f.value)}" data-custom-val="${i}">
        <button class="btn-del-custom" data-del-custom="${i}">×</button>
      </div>`).join('');
  }

  // ── 更新衍生属性显示 ──────────────────────────────
  function _updateDerived() {
    const a = _readAttrs();
    const d = calcCOC7Derived(a);
    document.getElementById('d-hp').textContent  = d.hp  || '—';
    document.getElementById('d-mp').textContent  = d.mp  || '—';
    document.getElementById('d-san').textContent = d.san || '—';
    document.getElementById('d-mov').textContent = d.mov || '—';
    document.getElementById('d-db').textContent  = d.db  || '—';
    document.getElementById('d-build').textContent = d.build ?? '—';
  }

  // ── 读取当前表单属性 ──────────────────────────────
  function _readAttrs() {
    const attrs = {};
    ['STR','CON','SIZ','DEX','APP','INT','POW','EDU'].forEach(attr => {
      const el = document.getElementById('attr-' + attr);
      attrs[attr] = el ? (parseInt(el.value) || '') : '';
    });
    const luckEl = document.getElementById('attr-luck');
    attrs.luck = luckEl ? (parseInt(luckEl.value) || '') : '';
    return attrs;
  }

  // ── 随机骰属性 ────────────────────────────────────
  function _roll3d6x5() { return (Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1) * 5; }
  function _roll2d6x5plus6() { return (Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1 + 6) * 5; }

  function _rollAttrs() {
    const vals = {
      STR: _roll3d6x5(),
      CON: _roll3d6x5(),
      SIZ: _roll2d6x5plus6(),
      DEX: _roll3d6x5(),
      APP: _roll3d6x5(),
      INT: _roll2d6x5plus6(),
      POW: _roll3d6x5(),
      EDU: _roll2d6x5plus6(),
    };
    ['STR','CON','SIZ','DEX','APP','INT','POW','EDU'].forEach(attr => {
      const el = document.getElementById('attr-' + attr);
      if (el) {
        el.value = vals[attr];
        const halfEl = document.getElementById('attr-' + attr + '-half');
        if (halfEl) halfEl.textContent = Math.floor(vals[attr]/2) + '/' + Math.floor(vals[attr]/5);
      }
    });
    _updateDerived();
    UI.toast('属性已随机生成');
  }

  function _rollLuck() {
    const val = _roll3d6x5();
    const el = document.getElementById('attr-luck');
    if (el) el.value = val;
    _updateDerived();
  }

  // ── .st 格式解析与导入 ───────────────────────────

  // 属性别名映射 → 内部字段名
  const _ATTR_ALIAS = {
    // STR
    '力量':1,'str':1,'力量(力量)':1,'str(str)':1,
    // CON
    '体质':2,'con':2,'体质(体质)':2,'con(con)':2,
    // SIZ
    '体型':3,'siz':3,'体型(体型)':3,'siz(siz)':3,
    // DEX
    '敏捷':4,'dex':4,'敏捷(敏捷)':4,'dex(dex)':4,
    // APP
    '外貌':5,'app':5,'外貌(外貌)':5,'app(app)':5,
    // INT
    '智力':6,'灵感':6,'int':6,'智力(智力)':6,'int(int)':6,
    // POW
    '意志':7,'pow':7,'意志(意志)':7,'pow(pow)':7,
    // EDU
    '教育':8,'edu':8,'教育(教育)':8,'edu(edu)':8,
    // LUCK
    '幸运':9,'运气':9,'luck':9,'幸运(幸运)':9,'luck(luck)':9,
    // SAN
    'san':10,'san值':10,'理智':10,'理智值':10,'san(san)':10,'理智(理智)':10,
    // HP
    'hp':11,'体力':11,'hp(hp)':11,'体力(体力)':11,
    // MP
    'mp':12,'魔法':12,'mp(mp)':12,'魔法(魔法)':12,
  };
  const _ATTR_KEYS = ['STR','CON','SIZ','DEX','APP','INT','POW','EDU','luck','san','hp','mp'];

  // 技能别名映射 → COC7_SKILLS 中的 name
  const _SKILL_ALIAS = (() => {
    const map = {};
    // 先用技能名本身注册
    COC7_SKILLS.forEach(sk => { map[sk.name] = sk.name; });
    // 额外别名
    const extra = {
      '取悦':'魅惑','魅惑':'魅惑',
      '汽车':'驾驶(汽车)','驾驶':'驾驶(汽车)','汽车驾驶':'驾驶(汽车)',
      '手枪':'射击(手枪)','步枪':'射击(步枪)','霰弹枪':'射击(霰弹枪)',
      '斗殴':'格斗(斗殴)','格斗':'格斗(斗殴)',
      '开锁':'锁匠','撬锁':'锁匠',
      '图书馆':'图书馆使用','图书馆使用':'图书馆使用',
      '计算机使用':'计算机','电脑':'计算机',
      '信誉':'信用评级','信用':'信用评级',
      '克苏鲁':'克苏鲁神话','cm':'克苏鲁神话',
      '重型操作':'操作重型机械','重型机械':'操作重型机械','重型':'操作重型机械',
      '自然学':'博物学',
      '导航':'领航',
      '母语':'话术',
    };
    Object.entries(extra).forEach(([k,v]) => { map[k] = v; });
    return map;
  })();

  function _parseST(raw) {
    // 去掉 .st 前缀和空白
    const text = raw.replace(/^\.st\s*/i, '').trim();
    
    // 预处理：去除中文和英文括号及其内容
    const cleanedText = text
      .replace(/\([^)]*\)/g, '')    // 去除英文括号内容
      .replace(/（[^）]*）/g, '');   // 去除中文括号内容
    
    // 用正则提取所有 "中文或英文词+数字" 对
    const pairs = [];
    const re = /([\u4e00-\u9fa5a-zA-Z]+?)(\d+)/g;
    let m;
    while ((m = re.exec(cleanedText)) !== null) {
      pairs.push({ key: m[1].toLowerCase().trim(), val: parseInt(m[2]) });
    }
    return pairs;
  }

  function _importST() {
    const raw = document.getElementById('f-import-st').value.trim();
    if (!raw) { UI.toast('请先粘贴数值字符串'); return; }

    const pairs = _parseST(raw);
    if (!pairs.length) { UI.toast('未识别到有效数值'); return; }

    const attrMap  = {};
    const skillMap = {};
    const unknown  = []; // { key, val }

    pairs.forEach(({ key, val }) => {
      // 尝试直接匹配
      const attrIdx = _ATTR_ALIAS[key];
      if (attrIdx) { attrMap[_ATTR_KEYS[attrIdx - 1]] = val; return; }
      const skillName = _SKILL_ALIAS[key];
      if (skillName) { skillMap[skillName] = val; return; }
      
      // 如果直接匹配失败，尝试清理常见后缀后再匹配
      // 清理常见后缀：括号残留、空格、冒号等
      const cleanedKey = key
        .replace(/[()（）]/g, '')  // 清理残留的括号字符
        .replace(/[\s:：]/g, '')   // 清理空格和冒号
        .trim();
      
      if (cleanedKey !== key) {
        const cleanedAttrIdx = _ATTR_ALIAS[cleanedKey];
        if (cleanedAttrIdx) { 
          attrMap[_ATTR_KEYS[cleanedAttrIdx - 1]] = val; 
          return; 
        }
        const cleanedSkillName = _SKILL_ALIAS[cleanedKey];
        if (cleanedSkillName) { 
          skillMap[cleanedSkillName] = val; 
          return; 
        }
      }
      
      // 去重：同一个 key 只保留最后一个值
      const existing = unknown.find(u => u.key === key);
      if (existing) existing.val = val;
      else unknown.push({ key, val });
    });

    // 填入属性
    ['STR','CON','SIZ','DEX','APP','INT','POW','EDU'].forEach(attr => {
      if (attrMap[attr] !== undefined) {
        const el = document.getElementById('attr-' + attr);
        if (el) {
          el.value = attrMap[attr];
          const halfEl = document.getElementById('attr-' + attr + '-half');
          if (halfEl) halfEl.textContent = Math.floor(attrMap[attr]/2) + '/' + Math.floor(attrMap[attr]/5);
        }
      }
    });
    if (attrMap['luck'] !== undefined) {
      const el = document.getElementById('attr-luck');
      if (el) el.value = attrMap['luck'];
    }
    _updateDerived();

    // 填入技能
    document.querySelectorAll('#coc7-skill-list .skill-input').forEach(el => {
      const name = el.dataset.skill;
      if (skillMap[name] !== undefined) {
        el.value = skillMap[name];
        // 半值在查看页显示，编辑页不更新
      }
    });

    const matched = Object.keys(attrMap).length + Object.keys(skillMap).length;
    const msg = document.getElementById('coc7-import-msg');

    if (unknown.length === 0) {
      const totalPairs = pairs.length;
      const cleanedCount = totalPairs - matched;
      let cleanupInfo = '';
      if (cleanedCount > 0) {
        cleanupInfo = `（自动清理了${cleanedCount}项中的括号内容）`;
      }
      msg.innerHTML = `<span style="color:var(--text-sub)">已填入 ${matched} 项，全部识别成功${cleanupInfo}</span>`;
      UI.toast(`识别并填入 ${matched} 项`);
    } else {
      // 渲染未识别列表，每项可点击加入自定义字段
      const items = unknown.map(u =>
        `<span class="unknown-field-tag" data-key="${UI.esc(u.key)}" data-val="${u.val}"
          style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;margin:3px 3px 0 0;
          background:var(--bg-raised);border:1px solid var(--border);border-radius:4px;
          font-size:12px;cursor:pointer;color:var(--text-sub)">
          ${UI.esc(u.key)}<b style="color:var(--text)">${u.val}</b>
          <span style="color:var(--text-muted);font-size:10px">+加入自定义</span>
        </span>`
      ).join('');
      const totalPairs = pairs.length;
      const cleanedCount = totalPairs - matched - unknown.length;
      let cleanupInfo = '';
      if (cleanedCount > 0) {
        cleanupInfo = `（自动清理了${cleanedCount}项中的括号内容）`;
      }
      msg.innerHTML = `
        <div style="color:var(--text-muted);font-size:12px;margin-bottom:4px">
          已填入 ${matched} 项${cleanupInfo}，以下 ${unknown.length} 项未识别，点击可加入自定义字段：
        </div>
        <div id="unknown-tags">${items}</div>`;

      // 绑定点击加入自定义
      msg.querySelectorAll('.unknown-field-tag').forEach(tag => {
        tag.addEventListener('click', () => {
          const k = tag.dataset.key;
          const v = tag.dataset.val;
          _card.customFields.push({ name: k, value: v });
          _refreshCustomFields();
          tag.style.opacity = '0.4';
          tag.style.pointerEvents = 'none';
          tag.querySelector('span').textContent = '已加入';
        });
      });

      UI.toast(`填入 ${matched} 项，${unknown.length} 项待处理`);
    }
  }

  function _copyST() {
    // 生成 .st 格式字符串
    const a = _readAttrs();
    const parts = ['.st'];
    const attrLabels = [
      ['STR','力量'],['CON','体质'],['SIZ','体型'],['DEX','敏捷'],
      ['APP','外貌'],['INT','智力'],['POW','意志'],['EDU','教育'],
    ];
    attrLabels.forEach(([key, label]) => {
      if (a[key]) parts.push(`${label}${a[key]}${key.toLowerCase()}${a[key]}`);
    });
    if (a.luck) parts.push(`幸运${a.luck}luck${a.luck}`);

    // 收集所有技能
    const skills = {};
    document.querySelectorAll('#coc7-skill-list .skill-input').forEach(el => {
      const name = el.dataset.skill;
      const v = parseInt(el.value);
      if (name && !isNaN(v) && v > 0) {
        skills[name] = v;
      }
    });

    // 应用通用简化逻辑
    const simplifiedSkills = _simplifySkillNamesForST(skills);
    
    // 添加简化后的技能
    Object.entries(simplifiedSkills).forEach(([name, value]) => {
      if (value > 0) {
        parts.push(`${name}${value}`);
      }
    });

    const text = parts.join('');
    UI.copyText(text).then(() => {
      document.getElementById('f-import-st').value = text;
      UI.toast('已复制，可直接发给骰子机器人');
    });
  }

  // 通用技能简化逻辑（用于ST数据生成）
  function _simplifySkillNamesForST(skills) {
    // 特殊规则映射
    const SPECIAL_RULES = {
      '格斗(斗殴)': '斗殴',
      '图书馆使用': '图书馆',
      '信用评级': '信用',
      '操作重型机械': '重型机械',
      '电气维修': '电气',
      '机械维修': '机械',
      '精神分析': '精神分析',
      '博物学': '自然学',
      '计算机': '电脑',
    };

    // 第一步：收集所有带括号的技能，按基础名称分组
    const groupedSkills = {};
    
    Object.keys(skills).forEach(skillName => {
      if (skillName.includes('(')) {
        const match = skillName.match(/^([^(]+)\(([^)]+)\)$/);
        if (match) {
          const baseName = match[1];
          if (!groupedSkills[baseName]) {
            groupedSkills[baseName] = [];
          }
          groupedSkills[baseName].push(skillName);
        }
      }
    });

    // 第二步：应用简化规则
    const simplified = {};
    
    Object.entries(skills).forEach(([skillName, value]) => {
      // 检查特殊规则
      if (SPECIAL_RULES[skillName]) {
        simplified[SPECIAL_RULES[skillName]] = value;
        return;
      }
      
      if (skillName.includes('(')) {
        const match = skillName.match(/^([^(]+)\(([^)]+)\)$/);
        if (match) {
          const baseName = match[1];
          const variant = match[2];
          const variants = groupedSkills[baseName];
          
          if (variants.length === 1) {
            // 只有一个变体：使用基础名称
            simplified[baseName] = value;
          } else {
            // 有多个变体：使用括号内的内容
            simplified[variant] = value;
          }
        }
      } else {
        // 无括号的技能直接使用
        simplified[skillName] = value;
      }
    });
    
    return simplified;
  }

  // ── 收集表单数据并保存 ────────────────────────────
  function _save() {
    const attrs = _readAttrs();
    const derived = calcCOC7Derived(attrs);

    // 收集技能
    const skills = {};
    document.querySelectorAll('#coc7-skill-list .skill-input').forEach(el => {
      const name = el.dataset.skill;
      const v = parseInt(el.value);
      if (name && !isNaN(v)) skills[name] = v;
    });

    // 收集自定义字段
    const customFields = [];
    document.querySelectorAll('#coc7-custom-fields .custom-field-row').forEach(row => {
      const nameEl = row.querySelector('[data-custom-name]');
      const valEl  = row.querySelector('[data-custom-val]');
      if (nameEl && valEl) {
        customFields.push({ name: nameEl.value.trim(), value: valEl.value.trim() });
      }
    });

    // 写入衍生属性
    attrs.hp   = derived.hp;
    attrs.mp   = derived.mp;
    attrs.san  = derived.san;
    attrs.mov  = derived.mov;
    attrs.db   = derived.db;
    attrs.build = derived.build;

    const catEl = document.getElementById('f-category');

    _card = {
      ..._card,
      name:        document.getElementById('f-name')?.value.trim() || '',
      playerName:  document.getElementById('f-player')?.value.trim() || '',
      occupation:  document.getElementById('f-occupation')?.value.trim() || '',
      age:         document.getElementById('f-age')?.value.trim() || '',
      gender:      document.getElementById('f-gender')?.value.trim() || '',
      birthplace:  document.getElementById('f-birthplace')?.value.trim() || '',
      residence:   document.getElementById('f-residence')?.value.trim() || '',
      categoryId:  catEl ? (catEl.value || null) : null,
      attrs,
      skills,
      customFields,
      backstory:   document.getElementById('f-backstory')?.value.trim() || '',
      notes:       document.getElementById('f-notes')?.value.trim() || '',
      updatedAt:   Date.now(),
    };

    if (!_card.name) {
      _card.name = '未命名角色';
    }

    Store.saveCard(_card);
    UI.toast('已保存');
    UI.hideFullscreen();
    Home.render();
  }

  return { open };
})();

// ── COC7Detail：查看卡片详情 ──────────────────────────────────────────────────
const CardDetail = (() => {

  function show(id) {
    const card = Store.getCard(id);
    if (!card) { UI.toast('找不到角色卡'); return; }

    if (card.system === 'coc7') _showCOC7(card);
    else if (card.system === 'dnd5') DND5Detail.show(card);
  }

  function _showCOC7(c) {
    const a = c.attrs || {};
    const derived = calcCOC7Derived(a);

    // 属性网格
    const attrCells = ['STR','CON','SIZ','DEX','APP','INT','POW','EDU'].map(attr => {
      const v = parseInt(a[attr]) || 0;
      return `
        <div class="view-attr-cell">
          <div class="view-attr-name">${attr}</div>
          <div class="view-attr-val">${v || '—'}</div>
          <div class="view-attr-sub">${v ? Math.floor(v/2) + '/' + Math.floor(v/5) : ''}</div>
        </div>`;
    }).join('');

    // 技能列表（只显示有值的技能）
    const skillRows = Object.entries(c.skills || {})
      .filter(([, v]) => v > 0)
      .sort((a, b) => a[0].localeCompare(b[0], 'zh'))
      .map(([name, val]) => `
        <div class="view-skill-row">
          <span class="view-skill-name">${UI.esc(name)}</span>
          <span class="view-skill-val" title="普通成功">${val}</span>
          <span class="view-skill-half" title="困难成功（半值）">${Math.floor(val/2)}</span>
          <span class="view-skill-fifth" title="极难成功（五分之一）">${Math.floor(val/5)}</span>
        </div>`).join('');

    // 自定义字段
    const customRows = (c.customFields || []).filter(f => f.name).map(f => `
      <div class="view-custom-row">
        <span class="view-custom-name">${UI.esc(f.name)}</span>
        <span class="view-custom-val">${UI.esc(f.value)}</span>
      </div>`).join('');

    // 简卡文本
    const quickText = _buildQuickText(c, a, derived);

    const sub = [c.occupation, c.age ? c.age + '岁' : '', c.gender].filter(Boolean).join(' · ');

    const html = `
<div class="card-view" id="coc7-view">
  <nav class="view-nav">
    <button class="text-btn" id="view-back">‹ 返回</button>
    <span class="view-nav-title">${UI.esc(c.name || '未命名')}</span>
    <button class="icon-btn" id="view-edit">
      <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    </button>
  </nav>

  <!-- 头部 -->
  <div class="view-hero">
    <div class="view-hero-info">
      <div class="view-char-name">${UI.esc(c.name || '未命名角色')}</div>
      <div class="view-char-meta">
        ${UI.sysBadge('coc7')}
        <span class="view-char-sub">${UI.esc(sub)}</span>
      </div>
      ${c.playerName ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">玩家：${UI.esc(c.playerName)}</div>` : ''}
    </div>
  </div>

  <!-- 关键数值 -->
  <div class="view-vitals">
    <div class="vital-item hp">
      <div class="vital-label">HP</div>
      <div class="vital-value">${a.hp ?? derived.hp ?? '—'}</div>
    </div>
    <div class="vital-item san">
      <div class="vital-label">SAN</div>
      <div class="vital-value">${a.san ?? derived.san ?? '—'}</div>
    </div>
    <div class="vital-item mp">
      <div class="vital-label">MP</div>
      <div class="vital-value">${a.mp ?? derived.mp ?? '—'}</div>
    </div>
    <div class="vital-item luck">
      <div class="vital-label">幸运</div>
      <div class="vital-value">${a.luck || '—'}</div>
    </div>
  </div>

  <!-- 属性 -->
  <div class="view-section">
    <div class="view-section-header">属性值</div>
    <div class="view-attr-grid">${attrCells}</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;padding:10px 16px;border-top:1px solid var(--border)">
      <span style="font-size:12px;color:var(--text-muted)">MOV <b style="color:var(--text)">${derived.mov}</b></span>
      <span style="font-size:12px;color:var(--text-muted)">DB <b style="color:var(--text)">${derived.db}</b></span>
      <span style="font-size:12px;color:var(--text-muted)">体格 <b style="color:var(--text)">${derived.build}</b></span>
    </div>
    <div style="padding:12px 16px 16px;border-top:1px solid var(--border)">
      ${UI.radarChart(
        ['STR','CON','SIZ','DEX','APP','INT','POW','EDU'],
        ['STR','CON','SIZ','DEX','APP','INT','POW','EDU'].map(k => parseInt(a[k]) || 0),
        100
      )}
    </div>
  </div>

  <!-- 技能 -->
  ${skillRows ? `
  <div class="view-section">
    <div class="view-section-header" style="display:flex;align-items:center;gap:8px;padding:10px 16px">
      <span style="flex:1;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">技能</span>
      <span style="font-size:11px;font-weight:400;color:var(--text-muted);width:40px;text-align:center;flex-shrink:0">成功</span>
      <span style="font-size:11px;font-weight:400;color:var(--text-muted);width:36px;text-align:center;flex-shrink:0">困难</span>
      <span style="font-size:11px;font-weight:400;color:var(--text-muted);width:32px;text-align:center;flex-shrink:0">极难</span>
    </div>
    <div class="view-skill-list">${skillRows}</div>
  </div>` : ''}

  <!-- 自定义字段 -->
  ${customRows ? `
  <div class="view-section">
    <div class="view-section-header">自定义字段</div>
    <div class="view-custom-list">${customRows}</div>
  </div>` : ''}

  <!-- 背景故事 -->
  ${c.backstory ? `
  <div class="view-section">
    <div class="view-section-header">背景故事</div>
    <div class="view-text-block">${UI.esc(c.backstory)}</div>
  </div>` : ''}

  <!-- 备注 -->
  ${c.notes ? `
  <div class="view-section">
    <div class="view-section-header">备注</div>
    <div class="view-text-block">${UI.esc(c.notes)}</div>
  </div>` : ''}

  <!-- 简卡导出 -->
  <div class="view-section">
    <div class="view-section-header">数据导出</div>
    <div class="quick-export-area">
      <div class="quick-export-text" id="quick-text">${UI.esc(quickText)}</div>
      <div style="display:flex;gap:8px">
        <button class="btn-copy-card" id="btn-copy-quick" style="flex:1">复制简卡</button>
        <button class="btn-copy-card" id="btn-copy-st" style="flex:1">复制 .st 数据</button>
      </div>
    </div>
  </div>

  <!-- 底部操作 -->
  <div class="view-actions">
    <button class="btn-edit-card" id="view-edit-bottom">编辑角色卡</button>
    <button class="btn-pin-card ${c.pinned ? 'pinned' : ''}" id="view-pin">
      ${c.pinned ? '已置顶' : '置顶'}
    </button>
  </div>

</div>`;

    UI.showFullscreen(html);

    // 事件绑定
    document.getElementById('view-back').addEventListener('click', () => {
      UI.hideFullscreen();
      Home.render();
    });

    const editFn = () => { UI.hideFullscreen(); COC7Editor.open(c.id); };
    document.getElementById('view-edit').addEventListener('click', editFn);
    document.getElementById('view-edit-bottom').addEventListener('click', editFn);

    document.getElementById('view-pin').addEventListener('click', () => {
      c.pinned = UI.togglePin(c.id);
    });

    document.getElementById('btn-copy-quick').addEventListener('click', async () => {
      await UI.copyText(quickText);
      UI.toast('已复制到剪贴板');
    });

    const stText = _buildSTText(c, a);
    document.getElementById('btn-copy-st').addEventListener('click', async () => {
      await UI.copyText(stText);
      UI.toast('已复制 .st 数据');
    });
  }

  function _buildSTText(c, a) {
    const parts = ['.st'];
    const attrLabels = [
      ['STR','力量'],['CON','体质'],['SIZ','体型'],['DEX','敏捷'],
      ['APP','外貌'],['INT','智力'],['POW','意志'],['EDU','教育'],
    ];
    attrLabels.forEach(([key, label]) => {
      if (a[key]) parts.push(`${label}${a[key]}${key.toLowerCase()}${a[key]}`);
    });
    if (a.luck) parts.push(`幸运${a.luck}luck${a.luck}`);
    const skills = Object.entries(c.skills || {}).filter(([,v]) => v > 0);
    skills.forEach(([name, val]) => parts.push(`${name}${val}`));
    return parts.join('');
  }

  function _buildQuickText(c, a, derived) {
    const lines = [];
    lines.push(`【${c.name || '未命名'}】COC 7e`);
    if (c.occupation) lines.push(`职业：${c.occupation}`);
    if (c.age)        lines.push(`年龄：${c.age}`);
    lines.push('');
    lines.push(`STR:${a.STR||'—'} CON:${a.CON||'—'} SIZ:${a.SIZ||'—'} DEX:${a.DEX||'—'}`);
    lines.push(`APP:${a.APP||'—'} INT:${a.INT||'—'} POW:${a.POW||'—'} EDU:${a.EDU||'—'}`);
    lines.push(`HP:${a.hp??derived.hp??'—'} SAN:${a.san??derived.san??'—'} MP:${a.mp??derived.mp??'—'} 幸运:${a.luck||'—'}`);
    lines.push(`MOV:${derived.mov} DB:${derived.db} 体格:${derived.build}`);

    const skills = Object.entries(c.skills || {}).filter(([,v]) => v > 0);
    if (skills.length) {
      lines.push('');
      lines.push('技能：' + skills.map(([n,v]) => `${n}${v}`).join(' / '));
    }
    return lines.join('\n');
  }

  return { show };
})();
