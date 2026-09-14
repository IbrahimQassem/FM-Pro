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
  const glowX = [240, 840, 260, 820, 240, 800][index];
  const glow = ctx.createRadialGradient(glowX, H * .58, 50, glowX, H * .58, 850);
  glow.addColorStop(0, colorAlpha(colors.accent, .22));
  glow.addColorStop(0.5, colorAlpha(colors.surface, .4));
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // Modern subtle geometric grid lines in background
  ctx.strokeStyle = colorAlpha('#FFFFFF', .03);
  ctx.lineWidth = 1;
  for (let gy = 150; gy < H; gy += 160) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  }

  // Soft futuristic light beam
  const beam = ctx.createLinearGradient(0, 0, W, H * 0.7);
  beam.addColorStop(0, colorAlpha(colors.accent, 0.1));
  beam.addColorStop(1, 'transparent');
  ctx.fillStyle = beam; ctx.fillRect(0, 0, W, H);

  // Modern Audio Wave Visualizer Motif (Subtle curved radio frequencies behind phone)
  ctx.save();
  const waveCenterY = H * 0.72;
  const waveHeights = [45, 95, 140, 75, 120, 160, 90, 130, 80, 110, 60, 140, 95, 150, 70, 100];
  ctx.lineWidth = 2.5;
  for (let b = 0; b < 2; b++) {
    const waveAlpha = b === 0 ? 0.08 : 0.04;
    ctx.strokeStyle = colorAlpha(colors.accent, waveAlpha);
    ctx.beginPath();
    for (let i = 0; i <= W; i += 40) {
      const step = (i / 40) % waveHeights.length;
      const h = waveHeights[step] * (b === 0 ? 1 : 1.35);
      const yOffset = Math.sin((i + index * 120) * 0.012) * h;
      if (i === 0) ctx.moveTo(i, waveCenterY + yOffset);
      else ctx.lineTo(i, waveCenterY + yOffset);
    }
    ctx.stroke();
  }
  ctx.restore();

  ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  const logoSize = 64;
  if (logo) {
    ctx.save();
    round(ctx, right - logoSize, 72, logoSize, logoSize, 18);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    ctx.fillStyle = colors.surface; ctx.fill();
    ctx.clip();
    const scale = Math.min(logoSize / logo.width, logoSize / logo.height);
    ctx.drawImage(logo, right - logoSize + (logoSize - logo.width * scale) / 2,
      72 + (logoSize - logo.height * scale) / 2, logo.width * scale, logo.height * scale);
    ctx.restore();
    // Glass ring around logo
    ctx.strokeStyle = colorAlpha('#FFFFFF', 0.2); ctx.lineWidth = 1.5;
    round(ctx, right - logoSize, 72, logoSize, logoSize, 18); ctx.stroke();
  }

  ctx.fillStyle = colors.text; ctx.font = '600 36px Plex';
  ctx.fillText(settings.appName, right - (logo ? 84 : 0), 116, 600);

  // Step indicator badge (top left)
  ctx.textAlign = 'left'; ctx.direction = 'ltr';
  const badgeText = `${String(index + 1).padStart(2, '0')} / 06`;
  ctx.font = '600 18px Plex';
  const badgeW = ctx.measureText(badgeText).width + 32;
  round(ctx, M, 82, badgeW, 40, 20);
  ctx.fillStyle = colorAlpha(colors.surface, 0.7); ctx.fill();
  ctx.strokeStyle = colorAlpha(colors.accent, 0.3); ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = colors.accent;
  ctx.fillText(badgeText, M + 16, 108);

  // Label with glowing dot
  ctx.direction = 'rtl'; ctx.textAlign = 'right';
  ctx.font = '600 24px Plex';
  ctx.fillStyle = colors.accent;
  ctx.fillText(slide.label, right, 196, W - M * 2);

  // Title
  const title = fitText(ctx, slide.title, W - M * 2, 2, 88, 52, 600);
  const lineHeight = title.size * 1.25;
  ctx.font = `600 ${title.size}px Plex`;
  title.lines.forEach((line, i) => {
    ctx.fillStyle = i === title.lines.length - 1 ? colors.accent : colors.text;
    ctx.fillText(line, right, 305 + i * lineHeight);
  });

  // Subtitle
  const subtitle = fitText(ctx, slide.subtitle, W - M * 2, 2, 30, 22, 400);
  ctx.font = `400 ${subtitle.size}px Plex`;
  ctx.fillStyle = colors.muted;
  subtitle.lines.forEach((line, i) => ctx.fillText(line, right, 475 + i * 44));

  // Real Device Mockup Presentation (Apple iPhone vs Android / Google Play)
  const top = 560, bottom = H - 95, maxW = W - M * 2, maxH = bottom - top;
  const ratio = shot ? shot.width / shot.height : (type === 'apple' ? 430 / 932 : 1080 / 2400);

  // Bezel & Frame Dimensions
  const bezel = type === 'apple' ? 14 : 12;
  const frameCorner = type === 'apple' ? 52 : 46;
  const screenCorner = type === 'apple' ? 42 : 38;

  let dw = Math.min(maxW, (maxH - bezel * 2) * ratio + bezel * 2);
  let dh = (dw - bezel * 2) / ratio + bezel * 2;
  const dx = (W - dw) / 2, dy = top + (maxH - dh) / 2;
  const sx = dx + bezel, sy = dy + bezel, sw = dw - bezel * 2, sh = dh - bezel * 2;

  // 1. Deep Ambient Device Shadow (3D elevation)
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 35;
  round(ctx, dx, dy, dw, dh, frameCorner);
  ctx.fillStyle = '#08080a';
  ctx.fill();
  ctx.restore();

  // 2. Premium Metallic / Titanium Outer Chassis
  ctx.save();
  const chassisGrad = ctx.createLinearGradient(dx, dy, dx + dw, dy + dh);
  if (type === 'apple') {
    // Natural Titanium look with subtle rose-gold rim
    chassisGrad.addColorStop(0, '#2e2c30');
    chassisGrad.addColorStop(0.3, '#1c1b1e');
    chassisGrad.addColorStop(0.7, '#2a262c');
    chassisGrad.addColorStop(1, '#151417');
  } else {
    // Obsidian / Matte Dark Metal for Android
    chassisGrad.addColorStop(0, '#222326');
    chassisGrad.addColorStop(0.5, '#121316');
    chassisGrad.addColorStop(1, '#1e1f24');
  }
  round(ctx, dx, dy, dw, dh, frameCorner);
  ctx.fillStyle = chassisGrad;
  ctx.fill();

  // Metallic Chamfer Edge Highlight
  ctx.strokeStyle = colorAlpha('#FFFFFF', 0.22);
  ctx.lineWidth = 1.5;
  round(ctx, dx + 0.75, dy + 0.75, dw - 1.5, dh - 1.5, frameCorner);
  ctx.stroke();

  // Subtle brand ambient glow reflected on frame edges
  ctx.strokeStyle = colorAlpha(colors.accent, 0.2);
  ctx.lineWidth = 1;
  round(ctx, dx + 2, dy + 2, dw - 4, dh - 4, frameCorner - 2);
  ctx.stroke();
  ctx.restore();

  // 3. Screen Glass & Display Content
  ctx.save();
  round(ctx, sx, sy, sw, sh, screenCorner);
  ctx.clip();
  if (shot) {
    ctx.drawImage(shot, sx, sy, sw, sh);
  } else {
    ctx.fillStyle = colors.surface; ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = colorAlpha(colors.accent, .5); ctx.setLineDash([8, 12]);
    round(ctx, sx + 24, sy + 24, sw - 48, sh - 48, 24); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'center'; ctx.font = '600 32px Plex'; ctx.fillStyle = colors.text;
    ctx.fillText('لقطة شاشة التطبيق', W / 2, sy + sh / 2);
    ctx.font = '400 22px Plex'; ctx.fillStyle = colors.muted;
    ctx.fillText('ارفع لقطة شاشة بدقة عالية', W / 2, sy + sh / 2 + 46);
  }

  // 4. Hardware Sensors (Dynamic Island for iPhone, Punch-hole for Android)
  if (type === 'apple') {
    // Real Apple Dynamic Island
    const diW = 126, diH = 34;
    const diX = W / 2 - diW / 2, diY = sy + 11;
    ctx.save();
    round(ctx, diX, diY, diW, diH, diH / 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    // Lens reflection & sensor dots
    ctx.beginPath();
    ctx.arc(diX + diW - 20, diY + diH / 2, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0c121e';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(diX + diW - 20, diY + diH / 2, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.restore();

    // Home Indicator Bar at bottom of screen
    const barW = 138, barH = 5;
    const barX = W / 2 - barW / 2, barY = sy + sh - 10;
    round(ctx, barX, barY, barW, barH, 3);
    ctx.fillStyle = colorAlpha('#FFFFFF', 0.55);
    ctx.fill();
  } else {
    // Real Android Front Camera Punch-hole (Centered)
    const camRadius = 8;
    const camX = W / 2, camY = sy + 18;
    ctx.save();
    ctx.beginPath();
    ctx.arc(camX, camY, camRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    // Subtle lens glare
    ctx.beginPath();
    ctx.arc(camX, camY, camRadius - 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0e1726';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(camX + 1.5, camY - 1.5, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = colorAlpha('#FFFFFF', 0.4);
    ctx.fill();
    ctx.restore();

    // Android Navigation Gesture Bar at bottom
    const barW = 96, barH = 4;
    const barX = W / 2 - barW / 2, barY = sy + sh - 8;
    round(ctx, barX, barY, barW, barH, 2);
    ctx.fillStyle = colorAlpha('#FFFFFF', 0.4);
    ctx.fill();
  }
  ctx.restore();

  // Glass Surface Specular Rim
  ctx.strokeStyle = colorAlpha('#FFFFFF', 0.18);
  ctx.lineWidth = 1;
  round(ctx, sx, sy, sw, sh, screenCorner);
  ctx.stroke();

  // 5. Floating Glass Feature Badges (Interactive Product Badges)
  const floatingBadges = [
    { text: 'بث مباشر 24/7', dot: '#EF4444', align: 'left', yFactor: 0.32 },
    { text: 'أكثر من 30 إذاعة', dot: '#10B981', align: 'right', yFactor: 0.55 },
    { text: 'تشغيل بالخلفية بدون تقطيع', dot: '#3B82F6', align: 'left', yFactor: 0.72 }
  ];

  ctx.save();
  floatingBadges.forEach((b, bi) => {
    // Show selective badges on certain slides for clean aesthetics
    if ((index === 0 && bi === 0) || (index === 2 && bi === 2) || (index === 3 && bi === 1)) {
      ctx.font = '600 20px Plex';
      const textMetrics = ctx.measureText(b.text);
      const pillW = textMetrics.width + 56;
      const pillH = 46;
      const pillX = b.align === 'left' ? dx - 24 : dx + dw - pillW + 24;
      const pillY = dy + dh * b.yFactor;

      // Glow shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 10;
      round(ctx, pillX, pillY, pillW, pillH, 23);
      ctx.fillStyle = colorAlpha('#1A060E', 0.88);
      ctx.fill();
      ctx.restore();

      // Glass surface
      round(ctx, pillX, pillY, pillW, pillH, 23);
      ctx.fillStyle = colorAlpha('#2D0B18', 0.75);
      ctx.fill();
      ctx.strokeStyle = colorAlpha(colors.accent, 0.4);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Glowing status indicator dot
      ctx.beginPath();
      ctx.arc(pillX + pillW - 20, pillY + pillH / 2, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = b.dot;
      ctx.fill();

      // Text
      ctx.textAlign = 'right';
      ctx.direction = 'rtl';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(b.text, pillX + pillW - 34, pillY + 30);
    }
  });
  ctx.restore();

  // Modern Pill Indicators at bottom
  for (let i = 0; i < 6; i++) {
    const active = i === index;
    ctx.fillStyle = colorAlpha(colors.accent, active ? 1 : .25);
    round(ctx, W / 2 + 80 - i * 30, H - 46, active ? 26 : 8, 7, 4);
    ctx.fill();
  }
  canvas.dataset.slide = slide.id; canvas.dataset.format = type;
  canvas.dataset.screenBounds = JSON.stringify({ x: sx, y: sy, width: sw, height: sh });
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
  $('navy').onclick = () => { config.theme = { background: '#081525', surface: '#12304A', accent: '#64DDF0', text: '#FFFFFF', muted: '#B4C8D7' }; populate(); refresh(); };
  $('burgundy').onclick = () => { config.theme = structuredClone(window.TEMPLATE_DEFAULTS.theme); populate(); refresh(); };
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
