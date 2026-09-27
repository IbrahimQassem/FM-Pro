'use strict';
const $ = id => document.getElementById(id);
const SLIDE_NAMES = { ar: ['اكتشف هدهد', 'البرامج', 'البث المباشر', 'محطاتك', 'حسابك', 'ابدأ الاستماع'], en: ['Discover', 'Programs', 'Live radio', 'Your stations', 'Your account', 'Tune in'] };
const NAVY_THEME = { background: '#081525', surface: '#12304A', accent: '#64DDF0', text: '#FFFFFF', muted: '#B4C8D7' };
const DEVICES = {
  apple: { name: 'iPhone 17 Pro', src: 'assets/devices/iphone-17-pro.png', width: 389, height: 800, screen: [16, 14, 357, 772, 52] },
  google: { name: 'Galaxy S26 Ultra', src: 'assets/devices/galaxy-s26-ultra.png', width: 385, height: 800, screen: [11, 11, 361, 778, 25] }
};
const FORMATS = { apple: [1320, 2868], google: [1080, 1920] };
let config = structuredClone(window.TEMPLATE_DEFAULTS);
let selected = 0, format = 'apple', language = 'ar', appearance = 'dark', revision = 0, exporting = false;
const t = (key, locale = language) => window.STUDIO_STRINGS[locale][key];
const content = () => config.locales[language];
const currentSlide = () => content().slides[selected];
const currentTheme = () => config.themes[appearance];
// Preserve the original filenames for the default Arabic/dark series.
const exportName = (type, locale, mode, id) => `${type}${locale === 'ar' && mode === 'dark' ? '' : `-${locale}-${mode}`}-${id}.png`;
function localize() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dataset.appearance = appearance;
  $('brand-name').textContent = language === 'ar' ? 'هدهد' : 'HudHud';
  document.title = `${language === 'ar' ? 'هدهد' : 'HudHud'} — ${t('studio')}`;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $('export-all').disabled = exporting;
  if (exporting) $('export-all').textContent = t('exporting');
}

const imageCache = new Map();
const status = (message, error = false) => { $('status').textContent = message; $('status').dataset.error = String(error); };

function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (!imageCache.has(src)) imageCache.set(src, new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img);
    img.onerror = () => { imageCache.delete(src); reject(new Error(t('imageError'))); };
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
  throw new Error(t('longText'));
}
async function render(canvas, index, type, settings = config, locale = language, mode = appearance) {
  const copy = settings.locales[locale], slide = copy.slides[index], colors = settings.themes[mode];
  const rtl = locale === 'ar';
  const isWelcome = index === 0 || index === 5;
  const device = DEVICES[type];
  const [logo, shot, mascot, frame] = await Promise.all([
    loadImage(settings.logo), loadImage(slide.screenshots[type][mode]),
    isWelcome ? loadImage('assets/mascot-onboarding.webp') : null, loadImage(device.src)
  ]);
  const [width, height] = FORMATS[type];
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.scale(width / 1080, width / 1080);
  const W = 1080, H = height * 1080 / width, M = 88, right = W - M;
  const textEdge = rtl ? right : M, logoX = rtl ? right - 66 : M;
  ctx.fillStyle = colors.background; ctx.fillRect(0, 0, W, H);
  const gradient = ctx.createLinearGradient(W, 0, 0, H);
  gradient.addColorStop(0, colorAlpha(colors.surface, .95));
  gradient.addColorStop(1, colorAlpha(colors.surface, .08));
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);

  ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textAlign = rtl ? 'right' : 'left'; ctx.textBaseline = 'alphabetic';
  if (logo) {
    ctx.save(); round(ctx, logoX, 72, 66, 66, 16); ctx.clip();
    const scale = Math.min(66 / logo.width, 66 / logo.height);
    ctx.drawImage(logo, logoX + (66 - logo.width * scale) / 2,
      72 + (66 - logo.height * scale) / 2, logo.width * scale, logo.height * scale);
    ctx.restore();
  }
  ctx.font = '600 32px Plex'; ctx.fillStyle = colors.text;
  ctx.fillText(copy.appName, textEdge + (logo ? (rtl ? -84 : 84) : 0), 114, 650);
  ctx.textAlign = rtl ? 'left' : 'right'; ctx.direction = 'ltr';
  ctx.font = '400 20px Plex'; ctx.fillStyle = colors.muted;
  ctx.fillText(`${String(index + 1).padStart(2, '0')} / 06`, rtl ? M : right, 114);
  ctx.fillStyle = colorAlpha(colors.accent, .25); ctx.fillRect(M, 168, W - M * 2, 1);

  ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textAlign = rtl ? 'right' : 'left';
  ctx.fillStyle = colors.accent; ctx.font = '600 26px Plex';
  ctx.fillText(slide.label, textEdge, 235, W - M * 2);
  const title = fitText(ctx, slide.title, isWelcome ? 630 : W - M * 2, 2, 88, 52, 600);
  ctx.font = `600 ${title.size}px Plex`;
  title.lines.forEach((line, i) => {
    ctx.fillStyle = i === 1 ? colors.accent : colors.text;
    ctx.fillText(line, textEdge, 345 + i * title.size * 1.3);
  });
  const subtitle = fitText(ctx, slide.subtitle, W - M * 2, 2, 30, 22, 400);
  ctx.font = `400 ${subtitle.size}px Plex`; ctx.fillStyle = colors.muted;
  subtitle.lines.forEach((line, i) => ctx.fillText(line, textEdge, (isWelcome ? 595 : 505) + i * 44));

  // Measured transparent device artwork; contain the real capture without distortion.
  const top = isWelcome ? 720 : 625, bottom = H - 130;
  const dw = Math.min(750, (bottom - top) * device.width / device.height);
  const dh = dw * device.height / device.width;
  const dx = (W - dw) / 2, dy = top + (bottom - top - dh) / 2;
  const scale = dw / device.width;
  const [ox, oy, ow, oh, radius] = device.screen;
  const sx = dx + ox * scale, sy = dy + oy * scale, sw = ow * scale, sh = oh * scale;
  ctx.save();
  ctx.shadowColor = '#16091166'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 18;
  round(ctx, sx, sy, sw, sh, radius * scale); ctx.fillStyle = mode === 'dark' ? '#140F12' : '#FCF8F8'; ctx.fill();
  ctx.restore();
  ctx.save(); round(ctx, sx, sy, sw, sh, radius * scale); ctx.clip();
  if (shot) {
    const fit = Math.min(sw / shot.width, sh / shot.height);
    ctx.drawImage(shot, sx + (sw - shot.width * fit) / 2, sy + (sh - shot.height * fit) / 2, shot.width * fit, shot.height * fit);
  } else {
    ctx.fillStyle = colors.surface; ctx.fillRect(sx, sy, sw, sh);
    ctx.textAlign = 'center'; ctx.font = '600 28px Plex'; ctx.fillStyle = colors.text;
    ctx.fillText(t('emptyImage', locale), sx + sw / 2, sy + sh / 2, sw - 40);
    ctx.font = '400 20px Plex'; ctx.fillStyle = colors.muted;
    ctx.fillText(t('addImage', locale), sx + sw / 2, sy + sh / 2 + 44, sw - 40);
  }
  ctx.restore();
  ctx.drawImage(frame, dx, dy, dw, dh);

  // The approved welcome mascot sits beside the heading, clear of app content.
  if (mascot) {
    const mw = 320;
    const mh = mw * mascot.height / mascot.width;
    const my = 228;
    ctx.drawImage(mascot, rtl ? 30 : W - mw - 30, my, mw, mh);
  }
  ctx.fillStyle = colorAlpha(colors.accent, .25); ctx.fillRect(M, H - 80, W - M * 2, 1);
  ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textAlign = rtl ? 'right' : 'left'; ctx.font = '400 22px Plex';
  ctx.fillStyle = colors.muted; ctx.fillText(t('footer', locale), textEdge, H - 38);
  ctx.textAlign = rtl ? 'left' : 'right'; ctx.direction = 'ltr'; ctx.font = '600 18px Plex';
  ctx.fillStyle = colors.accent; ctx.fillText('HUDHUD FM', rtl ? M : right, H - 38);
  canvas.dataset.slide = slide.id; canvas.dataset.format = type;
  canvas.dataset.screenBounds = JSON.stringify({ x: sx, y: sy, width: sw, height: sh });
}
function populate() {
  localize();
  $('app-name').value = content().appName;
  for (const key of Object.keys(currentTheme())) $(`color-${key}`).value = currentTheme()[key];
  for (const key of ['label', 'title', 'subtitle']) $(key).value = currentSlide()[key];
  $('editing-label').textContent = `${t('editing')} ${String(selected + 1).padStart(2, '0')}`;
  $('role').textContent = `${String(selected + 1).padStart(2, '0')} / 06`;
  $('slide-name').textContent = currentSlide().label;
  for (const [id, theme] of [['burgundy', window.TEMPLATE_DEFAULTS.themes[appearance]], ['navy', NAVY_THEME]]) {
    $(id).setAttribute('aria-pressed', String(Object.keys(theme).every(key => currentTheme()[key].toLowerCase() === theme[key].toLowerCase())));
  }
  for (const type of Object.keys(FORMATS)) $(type).setAttribute('aria-pressed', String(type === format));
  for (const locale of ['ar', 'en']) $(locale).setAttribute('aria-pressed', String(locale === language));
  for (const mode of ['dark', 'light']) $(mode).setAttribute('aria-pressed', String(mode === appearance));
  $('device-name').textContent = DEVICES[format].name;
  $('dimensions').textContent = FORMATS[format].join(' × ') + ' px';
}
async function refresh() {
  const current = ++revision, snapshot = structuredClone(config);
  const locale = language, mode = appearance, type = format, slideIndex = selected;
  try {
    const large = document.createElement('canvas'); await render(large, slideIndex, type, snapshot, locale, mode);
    if (current !== revision) return;
    const preview = $('preview'); preview.width = large.width; preview.height = large.height;
    preview.getContext('2d').drawImage(large, 0, 0);
    preview.dataset.screenBounds = large.dataset.screenBounds;
    preview.setAttribute('aria-label', `${t('shot', locale)} ${slideIndex + 1}: ${snapshot.locales[locale].slides[slideIndex].title.replaceAll('\n', ' ')} — ${FORMATS[type].join(' × ')}`);
    const thumbs = [];
    const focusedSlide = document.activeElement.closest?.('.thumb')?.dataset.index;
    for (let i = 0; i < 6; i++) {
      const source = document.createElement('canvas'); await render(source, i, type, snapshot, locale, mode);
      const button = document.createElement('button'); button.className = 'thumb'; button.dataset.index = String(i);
      button.setAttribute('aria-label', `${t('shot', locale)} ${i + 1}: ${SLIDE_NAMES[locale][i]}`);
      button.setAttribute('aria-pressed', String(i === slideIndex));
      const thumb = document.createElement('canvas'); thumb.width = 160; thumb.height = Math.round(160 * source.height / source.width);
      thumb.getContext('2d').drawImage(source, 0, 0, thumb.width, thumb.height);
      const label = document.createElement('span'); label.textContent = SLIDE_NAMES[locale][i];
      const number = document.createElement('b'); number.textContent = String(i + 1).padStart(2, '0'); label.prepend(number);
      thumb.setAttribute('aria-hidden', 'true');
      button.append(thumb, label); button.onclick = () => { selected = i; populate(); refresh(); };
      thumbs.push(button);
    }
    if (current !== revision) return;
    $('thumbnails').replaceChildren(...thumbs);
    if (focusedSlide !== undefined && document.activeElement === document.body) thumbs[Number(focusedSlide)]?.focus({ preventScroll: true });
    const shot = await loadImage(snapshot.locales[locale].slides[slideIndex].screenshots[type][mode]);
    if (current !== revision || exporting) return;
    status(t(shot && shot.width < 800 ? 'lowResolution' : 'ready', locale));
  } catch (error) { if (current === revision && !exporting) status(error.message, true); }
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
    if (!response.ok) throw new Error(t('saveError'));
  } else download(blob, filename);
}
async function exportAll() {
  if (exporting) return;
  exporting = true; $('export-all').disabled = true; $('export-all').textContent = t('exporting');
  const snapshot = structuredClone(config);
  try {
    for (const locale of ['ar', 'en']) for (const mode of ['dark', 'light']) for (const type of Object.keys(FORMATS)) {
      const [w, h] = FORMATS[type];
      const sheet = document.createElement('canvas'); sheet.width = 1800; sheet.height = Math.round(280 * h / w) + 100;
      const ctx = sheet.getContext('2d', { alpha: false }); ctx.fillStyle = snapshot.themes[mode].background; ctx.fillRect(0, 0, sheet.width, sheet.height);
      for (let i = 0; i < 6; i++) {
        status(`${t('exporting')} ${type} / ${locale} / ${mode} · ${i + 1} / 6`);
        const canvas = document.createElement('canvas'); await render(canvas, i, type, snapshot, locale, mode);
        await saveCanvas(canvas, exportName(type, locale, mode, snapshot.locales[locale].slides[i].id));
        ctx.drawImage(canvas, 10 + (locale === 'ar' ? 5 - i : i) * 300, 20, 280, 280 * h / w);
        ctx.font = '600 18px Plex'; ctx.textAlign = 'center'; ctx.fillStyle = snapshot.themes[mode].muted;
        ctx.fillText(String(i + 1).padStart(2, '0'), 150 + (locale === 'ar' ? 5 - i : i) * 300, sheet.height - 22);
      }
      await saveCanvas(sheet, exportName(type, locale, mode, 'overview'));
    }
    status(t('exportSuccess'));
  } catch (error) { status(error.message, true); }
  finally {
    exporting = false;
    $('export-all').innerHTML = '<span data-i18n="exportAll"></span><small data-i18n="imageCount"></small>';
    localize();
  }
}
function validateConfig(value) {
  const fail = () => { throw new Error(t('configError')); };
  const safeAsset = src => typeof src === 'string' && (src === '' || /^assets\/[a-zA-Z0-9_./-]+$/.test(src) && !src.includes('..') || /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(src));
  // Existing single-language projects remain importable without losing their copy.
  if (value?.version === 1) {
    if (!Array.isArray(value.slides) || value.slides.length !== 6) fail();
    const migrated = structuredClone(window.TEMPLATE_DEFAULTS);
    migrated.logo = value.logo; migrated.themes.dark = value.theme;
    migrated.locales.ar.appName = value.appName;
    value.slides.forEach((slide, i) => {
      const target = migrated.locales.ar.slides[i];
      if (slide.id !== target.id) fail();
      for (const key of ['label', 'title', 'subtitle', 'role']) target[key] = slide[key];
      // Legacy screenshots are Arabic/light; preserve them in the matching slots.
      for (const type of Object.keys(FORMATS)) target.screenshots[type].light = slide.screenshot;
    });
    value = migrated;
  }
  if (value?.version !== 2 || !safeAsset(value.logo)) fail();
  for (const mode of ['dark', 'light']) for (const key of Object.keys(window.TEMPLATE_DEFAULTS.themes[mode])) {
    if (!/^#[0-9a-f]{6}$/i.test(value.themes?.[mode]?.[key])) fail();
  }
  for (const locale of ['ar', 'en']) {
    const copy = value.locales?.[locale];
    if (!copy || typeof copy.appName !== 'string' || !copy.appName.trim() || copy.appName.length > 28 || !Array.isArray(copy.slides) || copy.slides.length !== 6) fail();
    copy.slides.forEach((slide, i) => {
      if (slide.id !== window.TEMPLATE_DEFAULTS.locales[locale].slides[i].id) fail();
      for (const [key, limit] of [['label', 40], ['title', 80], ['subtitle', 120], ['role', 120]]) if (typeof slide[key] !== 'string' || slide[key].length > limit) fail();
      for (const type of Object.keys(FORMATS)) for (const mode of ['light', 'dark']) if (!safeAsset(slide.screenshots?.[type]?.[mode])) fail();
    });
  }
  return value;
}
async function readUpload(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error(t('uploadError'));
  const src = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  await loadImage(src); return src;
}
async function start() {
  await Promise.all([document.fonts.load('400 32px Plex'), document.fonts.load('600 94px Plex')]);
  for (const key of ['label', 'title', 'subtitle']) $(key).oninput = () => { currentSlide()[key] = $(key).value; $('slide-name').textContent = currentSlide().label; refresh(); };
  $('app-name').oninput = () => { content().appName = $('app-name').value; refresh(); };
  for (const key of Object.keys(currentTheme())) $(`color-${key}`).oninput = () => { currentTheme()[key] = $(`color-${key}`).value; populate(); refresh(); };
  for (const type of Object.keys(FORMATS)) $(type).onclick = () => { format = type; populate(); refresh(); };
  for (const locale of ['ar', 'en']) $(locale).onclick = () => { language = locale; populate(); refresh(); };
  for (const mode of ['dark', 'light']) $(mode).onclick = () => { appearance = mode; populate(); refresh(); };
  $('navy').onclick = () => { config.themes[appearance] = structuredClone(NAVY_THEME); populate(); refresh(); };
  $('burgundy').onclick = () => { config.themes[appearance] = structuredClone(window.TEMPLATE_DEFAULTS.themes[appearance]); populate(); refresh(); };
  $('logo-file').onchange = async e => { if (!e.target.files[0]) return; try { config.logo = await readUpload(e.target.files[0]); refresh(); } catch (error) { status(error.message, true); } };
  $('screenshot-file').onchange = async e => {
    if (!e.target.files[0]) return;
    const slide = currentSlide(), type = format, mode = appearance;
    try { slide.screenshots[type][mode] = await readUpload(e.target.files[0]); refresh(); } catch (error) { status(error.message, true); }
  };
  $('clear-image').onclick = () => { currentSlide().screenshots[format][appearance] = ''; $('screenshot-file').value = ''; refresh(); };
  $('save-project').onclick = () => download(new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }), 'hudhud-screenshot-settings.json');
  $('import-button').onclick = () => $('import-project').click();
  $('import-project').onchange = async e => { if (!e.target.files[0]) return; try { config = validateConfig(JSON.parse(await e.target.files[0].text())); populate(); refresh(); } catch (error) { status(error.message || t('configError'), true); } };
  $('export-all').onclick = exportAll;
  $('export-one').onclick = async () => {
    const snapshot = structuredClone(config), index = selected, type = format, locale = language, mode = appearance;
    try { const canvas = document.createElement('canvas'); await render(canvas, index, type, snapshot, locale, mode); download(await asBlob(canvas), exportName(type, locale, mode, snapshot.locales[locale].slides[index].id)); status(t('downloadReady')); } catch (error) { status(error.message, true); }
  };
  populate(); await refresh();
}
start().catch(error => status(error.message, true));
