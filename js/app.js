/**
 * app.js — 主入口，初始化所有模块
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── 底部导航切换 ──────────────────────────────────
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      UI.showPage(btn.dataset.page);
    });
  });

  // ── 初始化各模块 ──────────────────────────────────
  Home.init();
  Tools.init();

  // ── 点击弹层背景关闭 ──────────────────────────────
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
      }
    });
  });

  // ── iOS 安全区适配 ────────────────────────────────
  // 已通过 CSS env(safe-area-inset-bottom) 处理

  // ── 防止双击缩放（移动端） ────────────────────────
  let lastTap = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTap < 300) e.preventDefault();
    lastTap = now;
  }, { passive: false });

});
