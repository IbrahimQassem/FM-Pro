'use strict';
const $ = id => document.getElementById(id);
const FORMATS = { apple: [1320, 2868], google: [1080, 1920] };
let config = structuredClone(window.TEMPLATE_DEFAULTS);
let selected = 0, format = 'apple', revision = 0, exporting = false;
const imageCache = new Map();
const status = (message, error = false) => { $('status').textContent = message; $('status').dataset.error = String(error); };

function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (!imageCache.has(src)) imageCache.set(src, new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img);
    img.onerror = () => { imageCache.delete(src); reject(new Error('تعذّر تحميل إحدى الصور. أعد اختيارها.')); };
    img.src = src;
  }));
  return imageCache.get(src);
}
function round(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function colorAlpha(hex, alpha) { return hex + Math.round(alpha * 255).toString(16).padStart(2, '0'); }
function words(ctx, text, width) {
  const result = []; let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) { result.push(line); line = word; }
    else line = next;
  }
  if (line) result.push(line);
  return result;
}
function fitText(ctx, text, width, maxLines, start, min, weight) {
  for (let size = start; size >= min; size -= 2) {
    ctx.font = `${weight} ${size}px Plex`;
    const lines = text.split('\n').flatMap(line => words(ctx, line, width));
    if (lines.length <= maxLines && lines.every(line => ctx.measureText(line).width <= width)) return { size, lines };
  }
  throw new Error('العنوان أو الوصف طويل لهذه المساحة. اختصر النص للحفاظ على وضوح التصميم.');
}
async function render(canvas, index, type, settings = config) {
  const slide = settings.slides[index], colors = settings.theme;
  const [logo, shot] = await Promise.all([loadImage(settings.logo), loadImage(slide.screenshot)]);
  const [width, height] = FORMATS[type];
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.scale(width / 1080, width / 1080);
  const W = 1080, H = height * 1080 / width, M = 88, right = W - M;
  ctx.fillStyle = colors.background; ctx.fillRect(0, 0, W, H);
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, colorAlpha(colors.surface, .18)); base.addColorStop(1, colorAlpha(colors.surface, .9));
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  const glowX = [160, 880, 170, 870, 160, 840][index];
  const glow = ctx.createRadialGradient(glowX, H * .62, 0, glowX, H * .62, 760);
  glow.addColorStop(0, colorAlpha(colors.accent, .13)); glow.addColorStop(1, colorAlpha(colors.accent, 0));
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  // A quiet orbit motif; it sits behind the screenshot and never covers UI.
  ctx.strokeStyle = colorAlpha(colors.accent, .13); ctx.lineWidth = 1.2;
  for (const radius of [360, 490, 620]) {
    ctx.beginPath(); ctx.arc(glowX, H * .65, radius, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  const logoSize = 60;
  if (logo) {
    ctx.save(); round(ctx, right - logoSize, 78, logoSize, logoSize, 17); ctx.clip();
    // Contain logos: rectangular marks remain intact too.
    const scale = Math.min(logoSize / logo.width, logoSize / logo.height);
    ctx.drawImage(logo, right - logoSize + (logoSize - logo.width * scale) / 2,
      78 + (logoSize - logo.height * scale) / 2, logo.width * scale, logo.height * scale); ctx.restore();
  }
  ctx.fillStyle = colors.text; ctx.font = '600 36px Plex';
  ctx.fillText(settings.appName, right - (logo ? 79 : 0), 119, 620);
  ctx.textAlign = 'left'; ctx.direction = 'ltr'; ctx.fillStyle = colors.muted; ctx.font = '400 19px Plex';
  ctx.fillText(`${String(index + 1).padStart(2, '0')} / 06`, M, 116);
  ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillStyle = colors.accent; ctx.font = '400 26px Plex';
  ctx.fillText(slide.label, right, 207, W - M * 2);
  const title = fitText(ctx, slide.title, W - M * 2, 2, 94, 54, 600);
  const lineHeight = title.size * 1.28;
  ctx.font = `600 ${title.size}px Plex`;
  title.lines.forEach((line, i) => { ctx.fillStyle = i === title.lines.length - 1 ? colors.accent : colors.text; ctx.fillText(line, right, 319 + i * lineHeight); });
  const subtitle = fitText(ctx, slide.subtitle, W - M * 2, 2, 31, 24, 400);
  ctx.font = `400 ${subtitle.size}px Plex`; ctx.fillStyle = colors.muted;
  subtitle.lines.forEach((line, i) => ctx.fillText(line, right, 505 + i * 45));
  const top = 615, bottom = H - 108, maxW = W - M * 2, maxH = bottom - top;
  const ratio = shot ? shot.width / shot.height : 430 / 932;
  let sw = Math.min(maxW, maxH * ratio), sh = sw / ratio;
  const x = (W - sw) / 2, y = top + (maxH - sh) / 2;
  // White screen surface, no device silhouette, camera, bezel or perspective.
  ctx.save(); ctx.shadowColor = '#00000055'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 22;
  round(ctx, x, y, sw, sh, 34); ctx.fillStyle = '#FCF8F8'; ctx.fill(); ctx.restore();
  ctx.save(); round(ctx, x, y, sw, sh, 34); ctx.clip();
  if (shot) ctx.drawImage(shot, x, y, sw, sh);
  else {
    ctx.fillStyle = colors.surface; ctx.fillRect(x, y, sw, sh);
    ctx.strokeStyle = colorAlpha(colors.accent, .5); ctx.setLineDash([9, 12]);
    round(ctx, x + 26, y + 26, sw - 52, sh - 52, 22); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'center'; ctx.font = '600 34px Plex'; ctx.fillStyle = colors.text;
    ctx.fillText('لقطة تطبيقك هنا', W / 2, y + sh / 2);
    ctx.font = '400 22px Plex'; ctx.fillStyle = colors.muted; ctx.fillText('صورة كاملة · بدون قص', W / 2, y + sh / 2 + 50);
  }
  ctx.restore();
  ctx.strokeStyle = '#FFFFFF38'; ctx.lineWidth = 1; round(ctx, x, y, sw, sh, 34); ctx.stroke();
  // Series marker is inside the bottom safe area, separate from the UI.
  for (let i = 0; i < 6; i++) {
    const active = i === index;
    ctx.fillStyle = colorAlpha(colors.accent, active ? 1 : .22);
    round(ctx, W / 2 + 76 - i * 29, H - 58, active ? 22 : 8, 6, 3); ctx.fill();
  }
  canvas.dataset.slide = slide.id; canvas.dataset.format = type;
  canvas.dataset.screenBounds = JSON.stringify({ x, y, width: sw, height: sh });
}
function populate() {
  $('app-name').value = config.appName;
  for (const key of Object.keys(config.theme)) $(`color-${key}`).value = config.theme[key];
  for (const key of ['label', 'title', 'subtitle']) $(key).value = config.slides[selected][key];
  $('editing-label').textContent = `تحرير اللقطة ${String(selected + 1).padStart(2, '0')}`;
  $('role').textContent = `${String(selected + 1).padStart(2, '0')} / ${config.slides[selected].role.toUpperCase()}`;
  for (const type of Object.keys(FORMATS)) $(type).setAttribute('aria-pressed', String(type === format));
  $('dimensions').textContent = FORMATS[format].join(' × ') + ' px';
}
async function refresh() {
  const current = ++revision, snapshot = structuredClone(config);
  try {
    const large = document.createElement('canvas'); await render(large, selected, format, snapshot);
    if (current !== revision) return;
    const preview = $('preview'); preview.width = large.width; preview.height = large.height;
    preview.getContext('2d').drawImage(large, 0, 0);
    preview.dataset.screenBounds = large.dataset.screenBounds;
    preview.setAttribute('aria-label', `اللقطة ${selected + 1}: ${snapshot.slides[selected].title.replaceAll('\n', ' ')} — ${FORMATS[format].join(' × ')}`);
    const thumbs = [];
    for (let i = 0; i < 6; i++) {
      const source = document.createElement('canvas'); await render(source, i, format, snapshot);
      const button = document.createElement('button'); button.className = 'thumb'; button.setAttribute('aria-label', `اللقطة ${i + 1}`); button.setAttribute('aria-pressed', String(i === selected));
      const thumb = document.createElement('canvas'); thumb.width = 220; thumb.height = Math.round(220 * source.height / source.width);
      thumb.getContext('2d').drawImage(source, 0, 0, thumb.width, thumb.height);
      const label = document.createElement('span'); label.textContent = String(i + 1).padStart(2, '0');
      button.append(thumb, label); button.onclick = () => { selected = i; populate(); refresh(); };
      thumbs.push(button);
    }
    if (current !== revision) return;
    $('thumbnails').replaceChildren(...thumbs);
    const warnings = [];
    for (const slide of snapshot.slides) if (slide.screenshot) {
      const img = await loadImage(slide.screenshot); if (img.width < 800) warnings.push(slide.id);
    }
    status(warnings.length ? 'المعاينة جاهزة. الصور التجريبية منخفضة الدقة؛ استبدلها بلقطات أصلية عالية الدقة قبل النشر.' : 'المعاينة جاهزة. يُصدّر كل مقاس بدقته الأصلية.');
  } catch (error) { status(error.message, true); }
}
function download(blob, filename) {
  const link = document.createElement('a'), url = URL.createObjectURL(blob);
  link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function asBlob(canvas) { return new Promise(resolve => canvas.toBlob(resolve, 'image/png')); }
async function saveCanvas(canvas, filename) {
  const blob = await asBlob(canvas);
  if (location.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(location.hostname)) {
    const response = await fetch('/export/' + filename, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: blob });
    if (!response.ok) throw new Error('تعذّر حفظ التصدير. شغّل server.mjs محليًا.');
  } else download(blob, filename);
}
async function exportAll() {
  if (exporting) return; exporting = true; $('export-all').disabled = true;
  const snapshot = structuredClone(config);
  try {
    for (const type of Object.keys(FORMATS)) {
      const [w, h] = FORMATS[type];
      const sheet = document.createElement('canvas'); sheet.width = 1800; sheet.height = Math.round(280 * h / w) + 100;
      const ctx = sheet.getContext('2d', { alpha: false }); ctx.fillStyle = snapshot.theme.background; ctx.fillRect(0, 0, sheet.width, sheet.height);
      for (let i = 0; i < 6; i++) {
        status(`جارٍ تصدير ${type === 'apple' ? 'Apple' : 'Google'} — ${i + 1} / 6`);
        const canvas = document.createElement('canvas'); await render(canvas, i, type, snapshot);
        await saveCanvas(canvas, `${type}-${snapshot.slides[i].id}.png`);
        ctx.drawImage(canvas, 10 + (5 - i) * 300, 20, 280, 280 * h / w);
        ctx.font = '600 18px Plex'; ctx.textAlign = 'center'; ctx.fillStyle = snapshot.theme.muted;
        ctx.fillText(String(i + 1).padStart(2, '0'), 150 + (5 - i) * 300, sheet.height - 22);
      }
      await saveCanvas(sheet, `${type}-overview.png`);
    }
    status(location.protocol === 'http:' ? 'تم التصدير بنجاح: 12 صورة بالمقاسين + لوحتا عرض، داخل مجلد exports.' : 'تم تجهيز 12 صورة ولوحتي عرض للتنزيل. قد يطلب المتصفح السماح بتنزيل ملفات متعددة.');
  } catch (error) { status(error.message, true); }
  finally { exporting = false; $('export-all').disabled = false; }
}
function validateConfig(value) {
  if (value?.version !== 1 || typeof value.appName !== 'string' || !value.appName.trim() || value.appName.length > 28 || !Array.isArray(value.slides) || value.slides.length !== 6) throw new Error('ملف إعدادات غير صالح.');
  const safeAsset = src => typeof src === 'string' && (src === '' || /^assets\/[a-zA-Z0-9_./-]+$/.test(src) && !src.includes('..') || /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(src));
  if (!safeAsset(value.logo)) throw new Error('الشعار غير صالح.');
  for (const key of Object.keys(window.TEMPLATE_DEFAULTS.theme)) if (!/^#[0-9a-f]{6}$/i.test(value.theme?.[key])) throw new Error('الألوان يجب أن تكون بصيغة HEX.');
  value.slides.forEach((s, i) => {
    if (s.id !== window.TEMPLATE_DEFAULTS.slides[i].id || !safeAsset(s.screenshot)) throw new Error('صورة أو رقم لقطة غير صالح.');
    for (const key of ['title', 'subtitle', 'label', 'role']) if (typeof s[key] !== 'string' || s[key].length > 120) throw new Error('نص غير صالح.');
  }); return value;
}
async function readUpload(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error('اختر صورة PNG أو JPEG أو WebP أقل من 20 MB.');
  const src = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  await loadImage(src); return src;
}
async function start() {
  await Promise.all([document.fonts.load('400 32px Plex'), document.fonts.load('600 94px Plex')]);
  for (const key of ['label', 'title', 'subtitle']) $(key).oninput = () => { config.slides[selected][key] = $(key).value; refresh(); };
  $('app-name').oninput = () => { config.appName = $('app-name').value; refresh(); };
  for (const key of Object.keys(config.theme)) $(`color-${key}`).oninput = () => { config.theme[key] = $(`color-${key}`).value; refresh(); };
  for (const type of Object.keys(FORMATS)) $(type).onclick = () => { format = type; populate(); refresh(); };
  $('navy').onclick = () => { config.theme = structuredClone(window.TEMPLATE_DEFAULTS.theme); populate(); refresh(); };
  $('burgundy').onclick = () => { config.theme = { background:'#24121D', surface:'#56243E', accent:'#F0B1CF', text:'#FFFFFF', muted:'#DCC3D1' }; populate(); refresh(); };
  $('logo-file').onchange = async e => { try { config.logo = await readUpload(e.target.files[0]); refresh(); } catch (error) { status(error.message, true); } };
  $('screenshot-file').onchange = async e => { const index = selected; try { config.slides[index].screenshot = await readUpload(e.target.files[0]); refresh(); } catch (error) { status(error.message, true); } };
  $('clear-image').onclick = () => { config.slides[selected].screenshot = ''; $('screenshot-file').value = ''; refresh(); };
  $('save-project').onclick = () => download(new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }), 'hudhud-screenshot-settings.json');
  $('import-project').onchange = async e => { try { config = validateConfig(JSON.parse(await e.target.files[0].text())); populate(); refresh(); } catch (error) { status(error.message || 'تعذّر فتح الإعدادات.', true); } };
  $('export-all').onclick = exportAll;
  $('export-one').onclick = async () => { try { const canvas = document.createElement('canvas'); await render(canvas, selected, format); download(await asBlob(canvas), `${format}-${config.slides[selected].id}.png`); status('تم تجهيز الصورة للتنزيل.'); } catch (error) { status(error.message, true); } };
  populate(); await refresh();
}
start().catch(error => status(error.message, true));
