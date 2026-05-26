/**
 * tools.js — 工具页逻辑（导入导出、备忘录、骰点）
 */

// ── 骰点动画配置 ─────────────────────────────────────
const DICE_ANIM_FRAMES   = 10;   // 动画帧数
const DICE_ANIM_INTERVAL = 50;   // 每帧间隔 ms
const MEMO_SAVE_DELAY    = 800;  // 备忘录自动保存延迟 ms

const Tools = (() => {

  function init() {
    // 导出 JSON
    document.getElementById('btn-export-json').addEventListener('click', () => {
      const data = Store.exportAll();
      const date = new Date().toISOString().slice(0, 10);
      UI.downloadJSON(data, `trpg-cards-${date}.json`);
      UI.toast('已导出');
    });

    // 导入 JSON
    document.getElementById('btn-import-json').addEventListener('click', () => {
      document.getElementById('import-file-input').click();
    });

    document.getElementById('import-file-input').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!confirm(`即将导入 ${(data.cards || []).length} 张角色卡，这将覆盖现有数据，确定吗？`)) return;
          Store.importAll(data);
          Home.render();
          Home.renderCategoryTabs();
          UI.toast('导入成功');
        } catch (err) {
          UI.toast('导入失败：' + err.message);
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });

    // 备忘录自动保存
    const memoEl = document.getElementById('memo-text');
    if (memoEl) {
      memoEl.value = Store.getMemo();
      let memoTimer = null;
      memoEl.addEventListener('input', () => {
        clearTimeout(memoTimer);
        memoTimer = setTimeout(() => {
          Store.saveMemo(memoEl.value);
        }, MEMO_SAVE_DELAY);
      });
    }

    // 骰点面板
    _initDice();

    // 设置外部链接
    _applySettings();
  }

  function _initDice() {
    document.querySelectorAll('.dice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _roll(1, parseInt(btn.dataset.dice), btn);
      });
    });

    document.getElementById('btn-custom-roll').addEventListener('click', () => {
      const count = Math.max(1, Math.min(20, parseInt(document.getElementById('dice-count').value) || 1));
      const faces = Math.max(2, Math.min(1000, parseInt(document.getElementById('dice-faces').value) || 6));
      _roll(count, faces, document.getElementById('btn-custom-roll'));
    });
  }

  let _rollTimer = null;
  function _roll(count, faces, triggerBtn) {
    const area    = document.getElementById('dice-result-area');
    const detail  = document.getElementById('dice-result-detail');
    const totalEl = document.getElementById('dice-result-total');

    if (triggerBtn) triggerBtn.disabled = true;

    area.style.display = 'block';
    detail.textContent = '';
    totalEl.textContent = '…';
    totalEl.style.opacity = '0.3';

    let frame = 0;
    clearInterval(_rollTimer);
    _rollTimer = setInterval(() => {
      frame++;
      const fakeTotal = Math.floor(Math.random() * (count * faces)) + count;
      totalEl.textContent = fakeTotal;
      totalEl.style.opacity = String(0.3 + (frame / DICE_ANIM_FRAMES) * 0.4);

      if (frame >= DICE_ANIM_FRAMES) {
        clearInterval(_rollTimer);
        const results = [];
        for (let i = 0; i < count; i++) {
          results.push(Math.floor(Math.random() * faces) + 1);
        }
        const total = results.reduce((a, b) => a + b, 0);
        detail.textContent = count > 1
          ? `${count}D${faces}：${results.join(' + ')}`
          : `1D${faces}`;
        totalEl.textContent = total;
        totalEl.style.opacity = '1';
        if (triggerBtn) triggerBtn.disabled = false;
      }
    }, DICE_ANIM_INTERVAL);
  }

  function _applySettings() {
    const s = Store.getSettings();
    const xianyuLink = document.getElementById('link-xianyu');
    if (xianyuLink && s.xianyuUrl) xianyuLink.href = s.xianyuUrl;

    const qrEl = document.getElementById('qr-reward');
    if (qrEl && s.rewardQrUrl) {
      qrEl.innerHTML = `<img src="${s.rewardQrUrl}" alt="打赏码">`;
    }
  }

  return { init };
})();
