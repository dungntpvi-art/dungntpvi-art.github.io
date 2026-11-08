#!/bin/sh
# Tạo index.html (trang chạy trên GitHub Pages, cài được như app trên iPhone/Android)
# từ mã nguồn src/sa-ban-chien-thuat.html.
# Mã nguồn không có <!doctype>/<head> để dùng được cả làm Artifact trên claude.ai;
# script này bọc thêm phần đầu trang, manifest, icon và service worker.
set -e
cd "$(dirname "$0")"
{
  cat <<'HEAD'
<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#246638">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Sa Bàn">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<style>
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
.install-tip{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:30;display:flex;gap:10px;align-items:center;
  background:var(--ink);color:var(--bg);border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.4;box-shadow:0 6px 24px rgba(0,0,0,.25);max-width:560px;margin:0 auto}
.install-tip img{width:40px;height:40px;border-radius:9px;flex:none}
.install-tip span{flex:1;min-width:0}
.install-tip button{border:0;background:none;color:inherit;font-size:20px;line-height:1;padding:4px 6px;cursor:pointer}
</style>
HEAD
  cat src/sa-ban-chien-thuat.html
  cat <<'TAIL'
<script>
// Chạy offline
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
// Gợi ý cài lên màn hình chính cho iPhone/iPad (Safari không có nút cài tự động)
(() => {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  let seen = false; try { seen = localStorage.getItem('sbct.installTip') === '1'; } catch (e) {}
  if (!ios || standalone || seen) return;
  const d = document.createElement('div'); d.className = 'install-tip'; d.setAttribute('role', 'note');
  d.innerHTML = '<img src="icons/icon-180.png" alt=""><span><b>Cài Sa Bàn như app:</b> bấm nút Chia sẻ <b>⎙</b> của Safari, chọn <b>Thêm vào MH chính</b>.</span><button aria-label="Đóng">×</button>';
  d.querySelector('button').onclick = () => { d.remove(); try { localStorage.setItem('sbct.installTip', '1'); } catch (e) {} };
  addEventListener('load', () => document.body.appendChild(d));
})();
</script>
</html>
TAIL
} > index.html
echo "Đã tạo index.html"
