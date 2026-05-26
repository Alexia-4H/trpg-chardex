/**
 * ui.js — 通用 UI 工具函数
 */

const UI = (() => {

  // ── Toast 提示 ────────────────────────────────────
  let toastTimer = null;
  function toast(msg, duration = 2000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  // ── 弹层控制 ──────────────────────────────────────
  function showModal(id) {
    const el = document.getElementById(id);
    el.style.display = 'flex';
    requestAnimationFrame(() => el.style.opacity = '1');
  }

  function hideModal(id) {
    const el = document.getElementById(id);
    el.style.display = 'none';
  }

  // ── 页面切换 ──────────────────────────────────────
  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === pageId);
    });
  }

  // ── 全屏覆盖页 ────────────────────────────────────
  function showFullscreen(html) {
    const el = document.getElementById('page-card-detail');
    el.innerHTML = html;
    el.style.display = 'block';
    el.scrollTop = 0;
  }

  function hideFullscreen() {
    const el = document.getElementById('page-card-detail');
    el.style.display = 'none';
    el.innerHTML = '';
  }

  // ── 系统标签 HTML ─────────────────────────────────
  function sysBadge(system) {
    const labels = { coc7: 'COC 7e', dnd5: 'DND 5e' };
    return `<span class="sys-badge ${system}">${labels[system] || system}</span>`;
  }

  // ── 系统图标 SVG ──────────────────────────────────
  function sysIcon(system) {
    const s = 'style="stroke:var(--text-muted);fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round"';
    if (system === 'coc7') {
      return `<svg viewBox="0 0 24 24" width="20" height="20" ${s}><circle cx="12" cy="8" r="3"/><path d="M6 20c0-3.31 2.69-5 6-5s6 1.69 6 5"/><path d="M3 16c0-1.5 1-2.5 2.5-3"/><path d="M21 16c0-1.5-1-2.5-2.5-3"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" width="20" height="20" ${s}><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6 2 2-6 6-2-2z"/><path d="M3 21l4-4"/></svg>`;
  }

  // ── 安全转义 HTML ─────────────────────────────────
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── 复制到剪贴板 ──────────────────────────────────
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 降级方案
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    }
  }

  // ── 下载文件 ──────────────────────────────────────
  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }


  // ── 雷达图 SVG 生成 ───────────────────────────────
  function radarChart(labels, values, maxVal) {
    const N = labels.length;
    const W = 300, H = 290;
    const cx = W / 2, cy = H / 2;
    const r = 88;  // 图形半径
    const labelR = r + 36; // 标签距中心距离
    const angleStep = (Math.PI * 2) / N;
    const startAngle = -Math.PI / 2;

    function pt(i, ratio) {
      const angle = startAngle + i * angleStep;
      return {
        x: cx + r * ratio * Math.cos(angle),
        y: cy + r * ratio * Math.sin(angle),
      };
    }

    function labelPt(i) {
      const angle = startAngle + i * angleStep;
      return {
        x: cx + labelR * Math.cos(angle),
        y: cy + labelR * Math.sin(angle),
      };
    }

    // 背景网格
    let gridLines = '';
    [0.33, 0.66, 1].forEach(ratio => {
      const pts = labels.map((_, i) => pt(i, ratio));
      const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ') + 'Z';
      gridLines += `<path d="${d}" fill="none" stroke="#ccdccc" stroke-width="0.8"/>`;
    });

    // 轴线
    let axes = '';
    labels.forEach((_, i) => {
      const p = pt(i, 1);
      axes += `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#ccdccc" stroke-width="0.8"/>`;
    });

    // 数据多边形
    const dataRatios = values.map(v => Math.min(1, Math.max(0, (v || 0) / maxVal)));
    const dataPts = dataRatios.map((ratio, i) => pt(i, ratio));
    const dataD = dataPts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ') + 'Z';

    // 标签：用 foreignObject 嵌入真正的 HTML，继承页面 CSS 字体
    const labelW = 52, labelH = 36;
    let labelEls = '';
    labels.forEach((label, i) => {
      const p = labelPt(i);
      const val = values[i] || 0;
      labelEls += `
        <foreignObject x="${(p.x - labelW/2).toFixed(1)}" y="${(p.y - labelH/2).toFixed(1)}"
          width="${labelW}" height="${labelH}">
          <div xmlns="http://www.w3.org/1999/xhtml"
            style="text-align:center;line-height:1.3;color:#5a8a5a;">
            <div style="font-size:12px;">${label}</div>
            <div style="font-size:13px;">${val}</div>
          </div>
        </foreignObject>`;
    });

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:300px;display:block;margin:0 auto;overflow:visible">
      ${gridLines}${axes}
      <path d="${dataD}" fill="rgba(90,138,90,0.08)" stroke="#7aaa7a" stroke-width="1.2"/>
      ${dataPts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="#7aaa7a"/>`).join('')}
      ${labelEls}
    </svg>`;
  }

  // ── 置顶切换（共享逻辑）────────────────────────────
  function togglePin(cardId) {
    const card = Store.getCard(cardId);
    if (!card) return;
    const updated = { ...card, pinned: !card.pinned };
    Store.saveCard(updated);
    const btn = document.getElementById('view-pin');
    if (btn) {
      btn.classList.toggle('pinned', updated.pinned);
      btn.textContent = updated.pinned ? '已置顶' : '置顶';
    }
    Home.render();
    toast(updated.pinned ? '已置顶' : '已取消置顶');
    return updated.pinned;
  }

  return { toast, showModal, hideModal, showPage, showFullscreen, hideFullscreen, sysBadge, sysIcon, esc, copyText, downloadJSON, radarChart, togglePin };
})();
