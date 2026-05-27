/**
 * app.js — 主入口，初始化所有模块
 */

// ── 闲鱼跳转：优先唤起 App，失败则跳网页 ────────────
function openGoofish(itemId) {
  const appUrl = 'fleamarket://item?id=' + itemId;
  const webUrl = 'https://www.goofish.com/item?id=' + itemId;

  // 尝试唤起 App
  const start = Date.now();
  window.location.href = appUrl;

  // 如果 2.5 秒后页面还在（说明 App 没唤起），跳转网页版
  setTimeout(() => {
    if (Date.now() - start < 3000) {
      window.location.href = webUrl;
    }
  }, 2500);
}

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


// ── 注册 Service Worker（离线缓存 + 自动更新）────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
