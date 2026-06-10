/**
 * dnd5.js — DND 5e 建卡 / 查卡逻辑
 */

// ── DND 5e 六维属性 ───────────────────────────────────────────────────────────
const DND5_STATS = ['STR','DEX','CON','INT','WIS','CHA'];
const DND5_STAT_CN = { STR:'力量', DEX:'敏捷', CON:'体质', INT:'智力', WIS:'感知', CHA:'魅力' };

// ── DND 5e 技能表 ─────────────────────────────────────────────────────────────
const DND5_SKILLS = [
  { name:'运动',   stat:'STR' },
  { name:'体操',   stat:'DEX' },
  { name:'巧手',   stat:'DEX' },
  { name:'隐匿',   stat:'DEX' },
  { name:'奥秘',   stat:'INT' },
  { name:'历史',   stat:'INT' },
  { name:'调查',   stat:'INT' },
  { name:'自然',   stat:'INT' },
  { name:'宗教',   stat:'INT' },
  { name:'驯兽',   stat:'WIS' },
  { name:'洞察',   stat:'WIS' },
  { name:'医疗',   stat:'WIS' },
  { name:'察觉',   stat:'WIS' },
  { name:'求生',   stat:'WIS' },
  { name:'欺瞒',   stat:'CHA' },
  { name:'威吓',   stat:'CHA' },
  { name:'表演',   stat:'CHA' },
  { name:'说服',   stat:'CHA' },
];

// ── 辅助计算 ──────────────────────────────────────────────────────────────────
function statMod(val) {
  return Math.floor(((parseInt(val) || 10) - 10) / 2);
}
function modStr(mod) {
  return mod >= 0 ? '+' + mod : String(mod);
}
function profBonus(level) {
  return Math.ceil((parseInt(level) || 1) / 4) + 1;
}

// ── DND5Editor：建卡编辑器 ────────────────────────────────────────────────────
const DND5Editor = (() => {
  let _card = null;

  function open(id) {
    if (id) {
      _card = JSON.parse(JSON.stringify(Store.getCard(id)));
    } else {
      _card = {
        id:           Store.genId(),
        system:       'dnd5',
        name:         '',
        playerName:   '',
        race:         '',
        class:        '',
        background:   '',
        alignment:    '',
        categoryId:   null,
        pinned:       false,
        attrs: {
          STR:'', DEX:'', CON:'', INT:'', WIS:'', CHA:'',
          level: 1,
          hpMax: '', hpCurrent: '',
          ac: '', speed: '', initiative: '',
          proficiencies: '',
        },
        savingThrows: {},   // { STR: true/false, ... }
        skillProfs:   {},   // { 技能名: 0/1/2 } 0=无 1=熟练 2=专精
        customFields: [],
        weapons:      [],   // [{ name, dice, type:'melee'|'finesse'|'ranged', proficient:bool, note }]
        equipment:    '',
        spells:       '',
        features:     '',
        backstory:    '',
        notes:        '',
        createdAt:    Date.now(),
        updatedAt:    Date.now(),
      };
    }
    UI.showFullscreen(_buildHTML());
    _bindEvents();
  }

  function _buildHTML() {
    const c = _card;
    const a = c.attrs || {};
    const lv = parseInt(a.level) || 1;
    const pb = profBonus(lv);

    // 六维属性格子
    const statCells = DND5_STATS.map(s => {
      const v = parseInt(a[s]) || 10;
      const mod = statMod(v);
      return `
        <div class="attr-cell">
          <span class="attr-name">${DND5_STAT_CN[s]}<br><small style="font-size:9px;opacity:.6">${s}</small></span>
          <input class="attr-input" id="attr-${s}" type="number" min="1" max="30"
            value="${v}" placeholder="10">
          <span class="attr-derived" id="attr-${s}-mod">${modStr(mod)}</span>
        </div>`;
    }).join('');

    // 豁免检定行
    const saveRows = DND5_STATS.map(s => {
      const checked = c.savingThrows[s] ? 'checked' : '';
      const mod = statMod(a[s]);
      const total = mod + (c.savingThrows[s] ? pb : 0);
      return `
        <div class="skill-row">
          <input type="checkbox" data-save="${s}" ${checked} style="accent-color:var(--accent);flex-shrink:0">
          <span class="skill-name">${DND5_STAT_CN[s]} 豁免</span>
          <span class="skill-base">${s}</span>
          <span class="skill-input" style="width:52px;text-align:center;font-size:14px;font-weight:600;color:var(--text)"
            id="save-total-${s}">${modStr(total)}</span>
        </div>`;
    }).join('');

    // 技能行
    const skillRows = DND5_SKILLS.map(sk => {
      const prof = c.skillProfs[sk.name] || 0;
      const mod  = statMod(a[sk.stat]);
      const bonus = mod + (prof === 1 ? pb : prof === 2 ? pb * 2 : 0);
      const icons = ['○','●','◎'];
      return `
        <div class="skill-row">
          <button class="skill-prof-btn" data-skill="${sk.name}" data-prof="${prof}"
            style="font-size:16px;width:24px;flex-shrink:0;color:var(--accent)">${icons[prof]}</button>
          <span class="skill-name">${sk.name}</span>
          <span class="skill-base" style="color:var(--text-muted)">${sk.stat}</span>
          <span class="skill-input" style="width:52px;text-align:center;font-size:14px;font-weight:600;color:var(--text)"
            id="skill-total-${sk.name}">${modStr(bonus)}</span>
        </div>`;
    }).join('');

    // 自定义字段
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
      `<option value="${UI.esc(cat.id)}" ${c.categoryId === cat.id ? 'selected':''}>${UI.esc(cat.name)}</option>`
    ).join('');

    return `
<div class="card-editor" id="dnd5-editor">
  <nav class="editor-nav">
    <button class="text-btn" id="dnd5-back">取消</button>
    <span class="editor-nav-title">DND 5e · ${c.name || '新建角色'}</span>
    <button class="text-btn-primary" id="dnd5-save">保存</button>
  </nav>
  <div class="editor-body">

    <!-- 导入 / 导出 -->
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-title">导入 / 导出数值</span>
        <span style="font-size:11px;color:var(--text-muted)">.set 格式</span>
      </div>
      <div class="form-section-body">
        <textarea class="form-textarea" id="f-import-set"
          placeholder="粘贴 .set 或 .st 数值字符串，自动识别填入…&#10;&#10;例：.set str15 dex14 con13 int12 wis10 cha8 hp45 ac16"
          style="min-height:72px;font-size:13px;font-family:monospace"></textarea>
        <div style="display:flex;gap:8px;padding:8px 0 4px">
          <button class="btn-primary" id="dnd5-import-set" style="font-size:14px;padding:10px">识别并填入</button>
          <button id="dnd5-copy-set" style="flex-shrink:0;padding:10px 16px;background:var(--bg-raised);border:1px solid var(--border);border-radius:24px;font-size:14px;color:var(--text-sub);transition:all .15s">复制导出</button>
        </div>
        <div id="dnd5-import-msg" style="font-size:12px;color:var(--text-muted);padding:4px 0;min-height:18px"></div>
      </div>
    </div>

    <!-- 基本信息 -->
    <div class="form-section">
      <div class="form-section-header"><span class="form-section-title">基本信息</span></div>
      <div class="form-section-body">
        <div class="form-row"><label class="form-label">角色名</label>
          <input class="form-input" id="f-name" type="text" placeholder="角色名称" value="${UI.esc(c.name)}"></div>
        <div class="form-row"><label class="form-label">玩家名</label>
          <input class="form-input" id="f-player" type="text" placeholder="玩家昵称" value="${UI.esc(c.playerName)}"></div>
        <div class="form-row"><label class="form-label">种族</label>
          <input class="form-input" id="f-race" type="text" placeholder="如：精灵、人类" value="${UI.esc(c.race)}"></div>
        <div class="form-row"><label class="form-label">职业</label>
          <input class="form-input" id="f-class" type="text" placeholder="如：游荡者、法师" value="${UI.esc(c.class)}"></div>
        <div class="form-row"><label class="form-label">背景</label>
          <input class="form-input" id="f-background" type="text" placeholder="如：罪犯、英雄" value="${UI.esc(c.background)}"></div>
        <div class="form-row"><label class="form-label">阵营</label>
          <input class="form-input" id="f-alignment" type="text" placeholder="如：守序善良" value="${UI.esc(c.alignment)}"></div>
        <div class="form-row"><label class="form-label">等级</label>
          <input class="form-input form-input-sm" id="attr-level" type="number" min="1" max="20"
            value="${lv}" placeholder="1">
          <span style="font-size:12px;color:var(--text-muted);margin-left:8px">熟练加值 <b id="d-pb" style="color:var(--accent)">+${pb}</b></span>
        </div>
        <div class="form-row"><label class="form-label">分类</label>
          <select class="form-select" id="f-category">
            <option value="">无分类</option>${catOptions}
          </select></div>
      </div>
    </div>

    <!-- 六维属性 -->
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-title">六维属性</span>
        <button class="text-btn" id="dnd5-roll-attrs">随机生成</button>
      </div>
      <div class="attr-grid">${statCells}</div>
    </div>

    <!-- 战斗数值 -->
    <div class="form-section">
      <div class="form-section-header"><span class="form-section-title">战斗数值</span></div>
      <div class="form-section-body">
        <div class="form-row"><label class="form-label">最大HP</label>
          <input class="form-input form-input-sm" id="attr-hpMax" type="number" min="1" value="${UI.esc(a.hpMax)}" placeholder="—"></div>
        <div class="form-row"><label class="form-label">当前HP</label>
          <input class="form-input form-input-sm" id="attr-hpCurrent" type="number" min="0" value="${UI.esc(a.hpCurrent)}" placeholder="—"></div>
        <div class="form-row"><label class="form-label">护甲值(AC)</label>
          <input class="form-input form-input-sm" id="attr-ac" type="number" min="1" value="${UI.esc(a.ac)}" placeholder="10"></div>
        <div class="form-row"><label class="form-label">速度</label>
          <input class="form-input form-input-sm" id="attr-speed" type="number" min="0" value="${UI.esc(a.speed)}" placeholder="30"></div>
        <div class="form-row"><label class="form-label">先攻</label>
          <input class="form-input form-input-sm" id="attr-initiative" type="text" value="${UI.esc(a.initiative)}" placeholder="DEX调整值"></div>
      </div>
    </div>

    <!-- 豁免检定 -->
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-title">豁免检定</span>
        <span style="font-size:11px;color:var(--text-muted)">勾选已熟练</span>
      </div>
      <div class="skill-list" id="dnd5-save-list">${saveRows}</div>
    </div>

    <!-- 技能 -->
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-title">技能</span>
        <span style="font-size:11px;color:var(--text-muted)">○无 ●熟练 ◎专精</span>
      </div>
      <div class="skill-list" id="dnd5-skill-list">${skillRows}</div>
    </div>

    <!-- 自定义字段 -->
    <div class="form-section">
      <div class="form-section-header"><span class="form-section-title">自定义字段</span></div>
      <div class="custom-fields" id="dnd5-custom-fields">${customHTML}</div>
      <div style="padding:0 16px 12px">
        <button class="btn-add-custom" id="dnd5-add-custom">＋ 添加字段</button>
      </div>
    </div>

    <!-- 熟练项 -->
    <div class="form-section">
      <div class="form-section-header"><span class="form-section-title">熟练项 / 语言</span></div>
      <div class="form-section-body">
        <textarea class="form-textarea" id="f-proficiencies" placeholder="武器、护甲、工具、语言熟练项…" style="min-height:80px">${UI.esc(a.proficiencies)}</textarea>
      </div>
    </div>

    <!-- 武器 -->
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-title">武器</span>
        <span style="font-size:11px;color:var(--text-muted)">自动计算命中和伤害</span>
      </div>
      <div id="dnd5-weapons-list" style="padding:0 16px 4px">
        ${_buildWeaponsEditHTML(c.weapons || [])}
      </div>
      <div style="padding:0 16px 12px">
        <button class="btn-add-custom" id="dnd5-add-weapon">＋ 添加武器</button>
      </div>
    </div>

    <!-- 装备 -->
    <div class="form-section">
      <div class="form-section-header"><span class="form-section-title">装备</span></div>
      <div class="form-section-body">
        <textarea class="form-textarea" id="f-equipment" placeholder="携带的装备、武器、物品…">${UI.esc(c.equipment)}</textarea>
      </div>
    </div>

    <!-- 法术 -->
    <div class="form-section">
      <div class="form-section-header"><span class="form-section-title">法术</span></div>
      <div class="form-section-body">
        <textarea class="form-textarea" id="f-spells" placeholder="已知法术列表…">${UI.esc(c.spells)}</textarea>
      </div>
    </div>

    <!-- 特性与专长 -->
    <div class="form-section">
      <div class="form-section-header"><span class="form-section-title">特性与专长</span></div>
      <div class="form-section-body">
        <textarea class="form-textarea" id="f-features" placeholder="职业特性、种族特性、专长…">${UI.esc(c.features)}</textarea>
      </div>
    </div>

    <!-- 背景故事 -->
    <div class="form-section">
      <div class="form-section-header"><span class="form-section-title">背景故事</span></div>
      <div class="form-section-body">
        <textarea class="form-textarea" id="f-backstory" placeholder="角色的背景故事…">${UI.esc(c.backstory)}</textarea>
      </div>
    </div>

    <!-- 备注 -->
    <div class="form-section">
      <div class="form-section-header"><span class="form-section-title">备注</span></div>
      <div class="form-section-body">
        <textarea class="form-textarea" id="f-notes" placeholder="其他备注…" style="min-height:80px">${UI.esc(c.notes)}</textarea>
      </div>
    </div>

    <div class="editor-actions">
      <button class="btn-primary" id="dnd5-save-bottom">保存角色卡</button>
      ${Store.getCard(_card.id) ? `<button class="btn-danger" id="dnd5-delete">删除角色卡</button>` : ''}
    </div>
  </div>
</div>`;
  }

  function _bindEvents() {
    document.getElementById('dnd5-back').addEventListener('click', () => {
      UI.hideFullscreen(); Home.render();
    });

    ['dnd5-save','dnd5-save-bottom'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', _save);
    });

    const delBtn = document.getElementById('dnd5-delete');
    if (delBtn) delBtn.addEventListener('click', () => {
      if (confirm('确定要删除这张角色卡吗？')) {
        Store.deleteCard(_card.id);
        UI.hideFullscreen(); Home.render(); UI.toast('已删除');
      }
    });

    // 等级变化 → 更新熟练加值和所有技能/豁免总值
    document.getElementById('attr-level').addEventListener('input', _updateAllBonuses);

    // 六维属性变化 → 更新调整值和技能总值
    DND5_STATS.forEach(s => {
      const el = document.getElementById('attr-' + s);
      if (!el) return;
      el.addEventListener('input', () => {
        const mod = statMod(el.value);
        document.getElementById('attr-' + s + '-mod').textContent = modStr(mod);
        _updateAllBonuses();
      });
    });

    // 随机属性
    document.getElementById('dnd5-roll-attrs').addEventListener('click', _rollAttrs);

    // 豁免勾选
    document.getElementById('dnd5-save-list').addEventListener('change', e => {
      if (e.target.dataset.save) {
        _card.savingThrows[e.target.dataset.save] = e.target.checked;
        _updateAllBonuses();
      }
    });

    // 技能熟练度循环切换
    document.getElementById('dnd5-skill-list').addEventListener('click', e => {
      const btn = e.target.closest('.skill-prof-btn');
      if (!btn) return;
      const skill = btn.dataset.skill;
      const cur = parseInt(btn.dataset.prof) || 0;
      const next = (cur + 1) % 3;
      _card.skillProfs[skill] = next;
      btn.dataset.prof = next;
      btn.textContent = ['○','●','◎'][next];
      _updateAllBonuses();
    });

    // 导入 .set 数值
    const importSetBtn = document.getElementById('dnd5-import-set');
    const copySetBtn = document.getElementById('dnd5-copy-set');
    if (importSetBtn) importSetBtn.addEventListener('click', _importSet);
    if (copySetBtn) copySetBtn.addEventListener('click', _copySet);

    // 自定义字段
    document.getElementById('dnd5-add-custom').addEventListener('click', () => {
      _card.customFields.push({ name:'', value:'' });
      _refreshCustomFields();
    });
    document.getElementById('dnd5-custom-fields').addEventListener('click', e => {
      const idx = e.target.dataset.delCustom;
      if (idx !== undefined) {
        _card.customFields.splice(parseInt(idx), 1);
        _refreshCustomFields();
      }
    });

    // 武器
    document.getElementById('dnd5-add-weapon').addEventListener('click', () => {
      if (!_card.weapons) _card.weapons = [];
      // 先收集当前已填的武器数据，防止丢失
      _card.weapons = _collectWeapons();
      _card.weapons.push({ name:'', dice:'1d8', type:'melee', proficient:true, note:'' });
      _refreshWeapons();
    });
    document.getElementById('dnd5-weapons-list').addEventListener('click', e => {
      const idx = e.target.dataset.delWeapon;
      if (idx !== undefined) {
        // 先收集当前数据再删除
        _card.weapons = _collectWeapons();
        _card.weapons.splice(parseInt(idx), 1);
        _refreshWeapons();
      }
    });
  }

  function _refreshCustomFields() {
    const container = document.getElementById('dnd5-custom-fields');
    container.innerHTML = (_card.customFields || []).map((f, i) => `
      <div class="custom-field-row" data-idx="${i}">
        <input class="custom-field-name" type="text" placeholder="字段名"
          value="${UI.esc(f.name)}" data-custom-name="${i}">
        <input class="custom-field-val form-input form-input-sm" type="text"
          placeholder="值" value="${UI.esc(f.value)}" data-custom-val="${i}">
        <button class="btn-del-custom" data-del-custom="${i}">×</button>
      </div>`).join('');
  }

  // ── 武器编辑 ──────────────────────────────────────
  function _buildWeaponsEditHTML(weapons) {
    if (!weapons.length) return '';
    return weapons.map((w, i) => `
      <div class="weapon-edit-row" data-widx="${i}" style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <input type="text" placeholder="武器名" value="${UI.esc(w.name)}" data-wfield="name"
            style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-xs);padding:6px 8px;font-size:14px;color:var(--text)">
          <button data-del-weapon="${i}" style="color:var(--text-muted);font-size:18px;width:28px;text-align:center">×</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input type="text" placeholder="伤害骰 如1d8" value="${UI.esc(w.dice)}" data-wfield="dice"
            style="width:70px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-xs);padding:5px 8px;font-size:13px;color:var(--text);text-align:center">
          <select data-wfield="type" style="background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-xs);padding:5px 8px;font-size:13px;color:var(--text)">
            <option value="melee" ${w.type==='melee'?'selected':''}>近战(力量)</option>
            <option value="finesse" ${w.type==='finesse'?'selected':''}>灵巧(取高)</option>
            <option value="ranged" ${w.type==='ranged'?'selected':''}>远程(敏捷)</option>
          </select>
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text-sub)">
            <input type="checkbox" data-wfield="proficient" ${w.proficient?'checked':''} style="accent-color:var(--text)"> 熟练
          </label>
        </div>
        <input type="text" placeholder="备注（特殊效果、额外伤害等）" value="${UI.esc(w.note || '')}" data-wfield="note"
          style="width:100%;margin-top:6px;background:transparent;border:none;font-size:12px;color:var(--text-muted);padding:0">
      </div>`).join('');
  }

  function _refreshWeapons() {
    const container = document.getElementById('dnd5-weapons-list');
    if (container) container.innerHTML = _buildWeaponsEditHTML(_card.weapons || []);
  }

  function _collectWeapons() {
    const weapons = [];
    document.querySelectorAll('#dnd5-weapons-list .weapon-edit-row').forEach(row => {
      const get = (field) => {
        const el = row.querySelector(`[data-wfield="${field}"]`);
        if (!el) return '';
        if (el.type === 'checkbox') return el.checked;
        return el.value.trim();
      };
      weapons.push({
        name: get('name'),
        dice: get('dice'),
        type: get('type'),
        proficient: get('proficient'),
        note: get('note'),
      });
    });
    return weapons;
  }

  function _updateAllBonuses() {
    const lvEl = document.getElementById('attr-level');
    if (!lvEl) return; // 编辑器未渲染时直接返回
    const lv = parseInt(lvEl.value) || 1;
    const pb = profBonus(lv);
    const pbEl = document.getElementById('d-pb');
    if (pbEl) pbEl.textContent = '+' + pb;

    DND5_STATS.forEach(s => {
      const el = document.getElementById('attr-' + s);
      const mod = statMod(el ? el.value : 10);
      const saveEl = document.getElementById('save-total-' + s);
      const editorEl = document.getElementById('dnd5-editor');
      const hasSave = editorEl ? editorEl.querySelector(`[data-save="${s}"]`) : null;
      if (saveEl) saveEl.textContent = modStr(mod + (hasSave && hasSave.checked ? pb : 0));
    });

    DND5_SKILLS.forEach(sk => {
      const statEl = document.getElementById('attr-' + sk.stat);
      const mod = statMod(statEl ? statEl.value : 10);
      const editorEl = document.getElementById('dnd5-editor');
      const profBtn = editorEl ? editorEl.querySelector(`.skill-prof-btn[data-skill="${sk.name}"]`) : null;
      const prof = profBtn ? parseInt(profBtn.dataset.prof) || 0 : 0;
      const bonus = mod + (prof === 1 ? pb : prof === 2 ? pb * 2 : 0);
      const totalEl = document.getElementById('skill-total-' + sk.name);
      if (totalEl) totalEl.textContent = modStr(bonus);
    });
  }

  function _roll4d6dropLowest() {
    const rolls = [1,2,3,4].map(() => Math.floor(Math.random()*6)+1);
    rolls.sort((a,b) => a-b);
    return rolls[1] + rolls[2] + rolls[3];
  }

  function _rollAttrs() {
    DND5_STATS.forEach(s => {
      const val = _roll4d6dropLowest();
      const el = document.getElementById('attr-' + s);
      if (el) {
        el.value = val;
        const modEl = document.getElementById('attr-' + s + '-mod');
        if (modEl) modEl.textContent = modStr(statMod(val));
      }
    });
    _updateAllBonuses();
    UI.toast('属性已随机生成');
  }

  function _save() {
    const lv = parseInt(document.getElementById('attr-level')?.value) || 1;
    const attrs = { level: lv };
    DND5_STATS.forEach(s => {
      const el = document.getElementById('attr-' + s);
      attrs[s] = el ? (parseInt(el.value) || '') : '';
    });
    ['hpMax','hpCurrent','ac','speed','initiative'].forEach(k => {
      const el = document.getElementById('attr-' + k);
      attrs[k] = el ? el.value.trim() : '';
    });
    const profEl = document.getElementById('f-proficiencies');
    attrs.proficiencies = profEl ? profEl.value.trim() : '';

    // 豁免 — 限定在当前全屏页内查找，避免跨页面污染
    const editorEl = document.getElementById('dnd5-editor');
    const savingThrows = {};
    DND5_STATS.forEach(s => {
      const el = editorEl ? editorEl.querySelector(`[data-save="${s}"]`) : null;
      savingThrows[s] = el ? el.checked : false;
    });

    // 技能熟练 — 同样限定在编辑器内
    const skillProfs = {};
    const profBtns = editorEl ? editorEl.querySelectorAll('.skill-prof-btn') : [];
    profBtns.forEach(btn => {
      skillProfs[btn.dataset.skill] = parseInt(btn.dataset.prof) || 0;
    });

    // 自定义字段
    const customFields = [];
    document.querySelectorAll('#dnd5-custom-fields .custom-field-row').forEach(row => {
      const nameEl = row.querySelector('[data-custom-name]');
      const valEl  = row.querySelector('[data-custom-val]');
      if (nameEl && valEl) customFields.push({ name: nameEl.value.trim(), value: valEl.value.trim() });
    });

    // 收集武器
    const weapons = _collectWeapons();

    const catEl = document.getElementById('f-category');

    _card = {
      ..._card,
      name:         document.getElementById('f-name')?.value.trim() || '',
      playerName:   document.getElementById('f-player')?.value.trim() || '',
      race:         document.getElementById('f-race')?.value.trim() || '',
      class:        document.getElementById('f-class')?.value.trim() || '',
      background:   document.getElementById('f-background')?.value.trim() || '',
      alignment:    document.getElementById('f-alignment')?.value.trim() || '',
      categoryId:   catEl ? (catEl.value || null) : null,
      attrs, savingThrows, skillProfs, customFields, weapons,
      equipment:    document.getElementById('f-equipment')?.value.trim() || '',
      spells:       document.getElementById('f-spells')?.value.trim() || '',
      features:     document.getElementById('f-features')?.value.trim() || '',
      backstory:    document.getElementById('f-backstory')?.value.trim() || '',
      notes:        document.getElementById('f-notes')?.value.trim() || '',
      updatedAt:    Date.now(),
    };

    if (!_card.name) {
      _card.name = '未命名角色';
    }

    Store.saveCard(_card);
    UI.toast('已保存');
    UI.hideFullscreen();
    Home.render();
  }

  // ── .set 格式解析与导入 ──────────────────────────
  const _SET_ALIAS = {
    // 六维
    'str':'STR','力量':'STR','strength':'STR',
    'dex':'DEX','敏捷':'DEX','dexterity':'DEX',
    'con':'CON','体质':'CON','constitution':'CON',
    'int':'INT','智力':'INT','intelligence':'INT',
    'wis':'WIS','感知':'WIS','wisdom':'WIS',
    'cha':'CHA','魅力':'CHA','charisma':'CHA',
    // 战斗
    'hp':'hpMax','生命':'hpMax','体力':'hpMax','hpmax':'hpMax',
    'ac':'ac','护甲':'ac','armor':'ac',
    'speed':'speed','速度':'speed','移动':'speed',
    'level':'level','等级':'level','lv':'level',
    'initiative':'initiative','先攻':'initiative',
  };

  function _importSet() {
    const raw = document.getElementById('f-import-set').value.trim();
    if (!raw) { UI.toast('请先粘贴数值字符串'); return; }

    const text = raw.replace(/^\.s[et]+\s*/i, '').trim();
    const re = /([\u4e00-\u9fa5a-zA-Z]+)\s*(\d+)/g;
    let m;
    const found = {}, unknown = [];

    while ((m = re.exec(text)) !== null) {
      const key = m[1].toLowerCase().trim();
      const val = parseInt(m[2]);
      const mapped = _SET_ALIAS[key];
      if (mapped) {
        found[mapped] = val;
      } else {
        const existing = unknown.find(u => u.key === key);
        if (existing) existing.val = val;
        else unknown.push({ key: m[1], val });
      }
    }

    // 填入六维属性
    DND5_STATS.forEach(s => {
      if (found[s] !== undefined) {
        const el = document.getElementById('attr-' + s);
        if (el) {
          el.value = found[s];
          const modEl = document.getElementById('attr-' + s + '-mod');
          if (modEl) modEl.textContent = modStr(statMod(found[s]));
        }
      }
    });

    // 填入战斗数值
    ['hpMax','ac','speed','level','initiative'].forEach(k => {
      if (found[k] !== undefined) {
        const el = document.getElementById('attr-' + k);
        if (el) el.value = found[k];
      }
    });
    _updateAllBonuses();

    const matched = Object.keys(found).length;
    const msg = document.getElementById('dnd5-import-msg');

    if (unknown.length === 0) {
      msg.innerHTML = `<span style="color:var(--text-sub)">已填入 ${matched} 项，全部识别成功</span>`;
      UI.toast(`识别并填入 ${matched} 项`);
    } else {
      const items = unknown.map(u =>
        `<span class="unknown-field-tag" data-key="${UI.esc(u.key)}" data-val="${u.val}"
          style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;margin:3px 3px 0 0;
          background:var(--bg-raised);border:1px solid var(--border);border-radius:4px;
          font-size:12px;cursor:pointer;color:var(--text-sub)">
          ${UI.esc(u.key)}<b style="color:var(--text)">${u.val}</b>
          <span style="color:var(--text-muted);font-size:10px">+自定义</span>
        </span>`
      ).join('');
      msg.innerHTML = `
        <div style="color:var(--text-muted);font-size:12px;margin-bottom:4px">
          已填入 ${matched} 项，以下 ${unknown.length} 项未识别，点击加入自定义字段：
        </div>
        <div>${items}</div>`;

      msg.querySelectorAll('.unknown-field-tag').forEach(tag => {
        tag.addEventListener('click', () => {
          _card.customFields.push({ name: tag.dataset.key, value: tag.dataset.val });
          _refreshCustomFields();
          tag.style.opacity = '0.4';
          tag.style.pointerEvents = 'none';
          tag.querySelector('span').textContent = '已加入';
        });
      });
      UI.toast(`填入 ${matched} 项，${unknown.length} 项待处理`);
    }
  }

  function _copySet() {
    const lv = parseInt(document.getElementById('attr-level').value) || 1;
    const parts = ['.set'];
    DND5_STATS.forEach(s => {
      const el = document.getElementById('attr-' + s);
      if (el && el.value) parts.push(`${s.toLowerCase()}${el.value}`);
    });
    ['hpMax','ac','speed'].forEach(k => {
      const el = document.getElementById('attr-' + k);
      if (el && el.value) parts.push(`${k.toLowerCase()}${el.value}`);
    });
    parts.push(`level${lv}`);
    const text = parts.join(' ');
    UI.copyText(text).then(() => {
      document.getElementById('f-import-set').value = text;
      UI.toast('已复制 .set 数据');
    });
  }

  return { open };
})();

// ── DND5Detail：查看 DND 5e 卡片 ─────────────────────────────────────────────
const DND5Detail = {
  show(c) {
    const a = c.attrs || {};
    const lv = parseInt(a.level) || 1;
    const pb = profBonus(lv);

    // 六维属性格子
    const statCells = DND5_STATS.map(s => {
      const v = parseInt(a[s]) || 10;
      const mod = statMod(v);
      return `
        <div class="view-attr-cell">
          <div class="view-attr-name">${DND5_STAT_CN[s]}<br><small style="font-size:9px;opacity:.5">${s}</small></div>
          <div class="view-attr-val">${v}</div>
          <div class="view-attr-sub">${modStr(mod)}</div>
        </div>`;
    }).join('');

    // 豁免行
    const saveRows = DND5_STATS.map(s => {
      const has = c.savingThrows && c.savingThrows[s];
      const mod = statMod(a[s]);
      const total = mod + (has ? pb : 0);
      return `
        <div class="view-skill-row">
          <span style="font-size:13px;margin-right:4px">${has ? '●' : '○'}</span>
          <span class="view-skill-name">${DND5_STAT_CN[s]} 豁免</span>
          <span class="view-skill-val">${modStr(total)}</span>
        </div>`;
    }).join('');

    // 技能行：熟练的排前面，非熟练的排后面（全部显示）
    const profSkills = DND5_SKILLS.filter(sk => (c.skillProfs || {})[sk.name]);
    const nonProfSkills = DND5_SKILLS.filter(sk => !(c.skillProfs || {})[sk.name]);

    const skillRows = [...profSkills, ...nonProfSkills].map(sk => {
      const prof = (c.skillProfs || {})[sk.name] || 0;
      const mod  = statMod(a[sk.stat]);
      const bonus = mod + (prof === 1 ? pb : prof === 2 ? pb * 2 : 0);
      const icon = prof === 2 ? '◎' : prof === 1 ? '●' : '○';
      const style = prof === 0 ? 'opacity:.6' : '';
      return `
          <div class="view-skill-row" style="${style}">
            <span style="font-size:13px;margin-right:4px">${icon}</span>
            <span class="view-skill-name">${sk.name}</span>
            <span class="view-skill-half" style="color:var(--text-muted)">${sk.stat}</span>
            <span class="view-skill-val">${modStr(bonus)}</span>
          </div>`;
    }).join('');

    // 自定义字段
    const customRows = (c.customFields || []).filter(f => f.name).map(f => `
      <div class="view-custom-row">
        <span class="view-custom-name">${UI.esc(f.name)}</span>
        <span class="view-custom-val">${UI.esc(f.value)}</span>
      </div>`).join('');

    const quickText = DND5Detail._buildQuickText(c, a, lv, pb);
    const sub = [c.class, c.race, 'Lv' + lv].filter(Boolean).join(' · ');

    const html = `
<div class="card-view" id="dnd5-view">
  <nav class="view-nav">
    <button class="text-btn" id="view-back">‹ 返回</button>
    <span class="view-nav-title">${UI.esc(c.name || '未命名')}</span>
    <button class="icon-btn" id="view-edit">
      <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    </button>
  </nav>

  <div class="view-hero">
    
    <div class="view-hero-info">
      <div class="view-char-name">${UI.esc(c.name || '未命名角色')}</div>
      <div class="view-char-meta">
        ${UI.sysBadge('dnd5')}
        <span class="view-char-sub">${UI.esc(sub)}</span>
      </div>
      ${c.playerName ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">玩家：${UI.esc(c.playerName)}</div>` : ''}
    </div>
  </div>

  <div class="view-vitals">
    <div class="vital-item hp">
      <div class="vital-label">HP</div>
      <div class="vital-value">${a.hpMax || '—'}</div>
    </div>
    <div class="vital-item" style="">
      <div class="vital-label">AC</div>
      <div class="vital-value" style="color:var(--accent)">${a.ac || '—'}</div>
    </div>
    <div class="vital-item">
      <div class="vital-label">速度</div>
      <div class="vital-value">${a.speed || '—'}</div>
    </div>
    <div class="vital-item luck">
      <div class="vital-label">熟练加值</div>
      <div class="vital-value">+${pb}</div>
    </div>
  </div>

  <div class="view-section">
    <div class="view-section-header">六维属性</div>
    <div class="view-attr-grid" style="grid-template-columns:repeat(3,1fr)">${statCells}</div>
    <div style="padding:12px 16px 16px;border-top:1px solid var(--border)">
      ${UI.radarChart(
        DND5_STATS.map(s => DND5_STAT_CN[s]),
        DND5_STATS.map(s => parseInt(a[s]) || 0),
        20
      )}
    </div>
  </div>

  <div class="view-section">
    <div class="view-section-header">豁免检定</div>
    <div class="view-skill-list">${saveRows}</div>
  </div>

  ${skillRows ? `
  <div class="view-section">
    <div class="view-section-header">技能</div>
    <div class="view-skill-list">${skillRows}</div>
  </div>` : ''}

  ${customRows ? `
  <div class="view-section">
    <div class="view-section-header">自定义字段</div>
    <div class="view-custom-list">${customRows}</div>
  </div>` : ''}

  ${(c.weapons && c.weapons.length) ? `
  <div class="view-section">
    <div class="view-section-header">武器</div>
    <div style="padding:4px 0">
      ${c.weapons.filter(w => w.name).map(w => {
        const strMod = statMod(a.STR);
        const dexMod = statMod(a.DEX);
        let atkMod = w.type === 'ranged' ? dexMod
                   : w.type === 'finesse' ? Math.max(strMod, dexMod)
                   : strMod;
        let dmgMod = atkMod;
        const hitBonus = atkMod + (w.proficient ? pb : 0);
        const dmgStr = w.dice ? w.dice + (dmgMod >= 0 ? '+' + dmgMod : dmgMod) : ('—');
        const hitStr = hitBonus >= 0 ? '+' + hitBonus : hitBonus;
        const typeLabel = { melee:'近战', finesse:'灵巧', ranged:'远程' }[w.type] || '';
        return `
          <div style="padding:10px 16px;border-bottom:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:14px;font-weight:600;flex:1">${UI.esc(w.name)}</span>
              <span style="font-size:11px;color:var(--text-muted)">${typeLabel}</span>
            </div>
            <div style="display:flex;gap:16px;margin-top:4px">
              <span style="font-size:13px;color:var(--text-sub)">命中 <b style="color:var(--text)">${hitStr}</b></span>
              <span style="font-size:13px;color:var(--text-sub)">伤害 <b style="color:var(--text)">${dmgStr}</b></span>
              ${w.proficient ? '<span style="font-size:11px;color:var(--text-muted)">熟练</span>' : ''}
            </div>
            ${w.note ? `<div style="font-size:12px;color:var(--text-muted);margin-top:3px">${UI.esc(w.note)}</div>` : ''}
          </div>`;
      }).join('')}
    </div>
  </div>` : ''}

  ${c.equipment ? `
  <div class="view-section">
    <div class="view-section-header">装备</div>
    <div class="view-text-block">${UI.esc(c.equipment)}</div>
  </div>` : ''}

  ${c.spells ? `
  <div class="view-section">
    <div class="view-section-header">法术</div>
    <div class="view-text-block">${UI.esc(c.spells)}</div>
  </div>` : ''}

  ${c.features ? `
  <div class="view-section">
    <div class="view-section-header">特性与专长</div>
    <div class="view-text-block">${UI.esc(c.features)}</div>
  </div>` : ''}

  ${c.backstory ? `
  <div class="view-section">
    <div class="view-section-header">背景故事</div>
    <div class="view-text-block">${UI.esc(c.backstory)}</div>
  </div>` : ''}

  ${c.notes ? `
  <div class="view-section">
    <div class="view-section-header">备注</div>
    <div class="view-text-block">${UI.esc(c.notes)}</div>
  </div>` : ''}

  <div class="view-section">
    <div class="view-section-header">简卡文本</div>
    <div class="quick-export-area">
      <div class="quick-export-text" id="quick-text">${UI.esc(quickText)}</div>
      <div style="display:flex;gap:8px">
        <button class="btn-copy-card" id="btn-copy-quick" style="flex:1">复制简卡</button>
        <button class="btn-copy-card" id="btn-copy-set" style="flex:1">复制 .set 数据</button>
      </div>
    </div>
  </div>

  <div class="view-actions">
    <button class="btn-edit-card" id="view-edit-bottom">编辑角色卡</button>
    <button class="btn-pin-card ${c.pinned ? 'pinned' : ''}" id="view-pin">
      ${c.pinned ? '已置顶' : '置顶'}
    </button>
  </div>
</div>`;

    UI.showFullscreen(html);

    document.getElementById('view-back').addEventListener('click', () => {
      UI.hideFullscreen(); Home.render();
    });
    const editFn = () => { UI.hideFullscreen(); DND5Editor.open(c.id); };
    document.getElementById('view-edit').addEventListener('click', editFn);
    document.getElementById('view-edit-bottom').addEventListener('click', editFn);

    document.getElementById('view-pin').addEventListener('click', () => {
      c.pinned = UI.togglePin(c.id);
    });

    document.getElementById('btn-copy-quick').addEventListener('click', async () => {
      await UI.copyText(quickText);
      UI.toast('已复制到剪贴板');
    });

    // 复制 .set 格式
    const setTextParts = ['.set'];
    DND5_STATS.forEach(s => { if (a[s]) setTextParts.push(`${s.toLowerCase()}${a[s]}`); });
    if (a.hpMax) setTextParts.push(`hpmax${a.hpMax}`);
    if (a.ac) setTextParts.push(`ac${a.ac}`);
    if (a.speed) setTextParts.push(`speed${a.speed}`);
    setTextParts.push(`level${lv}`);
    const setTextStr = setTextParts.join(' ');
    document.getElementById('btn-copy-set').addEventListener('click', async () => {
      await UI.copyText(setTextStr);
      UI.toast('已复制 .set 数据');
    });
  },

  _buildQuickText(c, a, lv, pb) {
    const lines = [];
    lines.push(`【${c.name || '未命名'}】DND 5e`);
    const sub = [c.class, c.race, 'Lv' + lv, c.background].filter(Boolean).join(' · ');
    if (sub) lines.push(sub);
    if (c.alignment) lines.push(`阵营：${c.alignment}`);
    lines.push('');
    lines.push(DND5_STATS.map(s => `${s}:${a[s]||'—'}(${modStr(statMod(a[s]))})`).join(' '));
    lines.push(`HP:${a.hpMax||'—'} AC:${a.ac||'—'} 速度:${a.speed||'—'} 熟练:+${pb}`);

    const profs = DND5_SKILLS.filter(sk => (c.skillProfs||{})[sk.name]);
    if (profs.length) {
      lines.push('');
      lines.push('技能熟练：' + profs.map(sk => sk.name).join(' / '));
    }
    return lines.join('\n');
  }
};
