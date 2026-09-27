import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function studio() {
  // Hold browser initialization at font loading; test the model without a DOM.
  const context = vm.createContext({ structuredClone, window: {}, document: {
    fonts: { load: () => new Promise(() => {}) }
  }});
  for (const file of ['locales.js', 'config.js', 'studio.js']) {
    vm.runInContext(readFileSync(new URL(file, import.meta.url), 'utf8'), context);
  }
  return expression => vm.runInContext(expression, context);
}

test('all eight variants have valid independent content and asset slots', () => {
  const run = studio();
  assert.equal(run('validateConfig(config).version'), 2);
  assert.equal(run(`language = 'en'; appearance = 'light'; format = 'google';
    currentSlide().title = 'Edited English title';
    currentSlide().screenshots.google.light = '';
    currentTheme().accent = '#112233';
    config.locales.ar.slides[0].title === window.TEMPLATE_DEFAULTS.locales.ar.slides[0].title &&
    config.locales.en.slides[0].screenshots.apple.light !== '' &&
    config.locales.en.slides[0].screenshots.google.dark !== '' &&
    config.themes.dark.accent === window.TEMPLATE_DEFAULTS.themes.dark.accent`), true);
});

test('version 2 JSON round trip preserves each variant', () => {
  const run = studio();
  assert.equal(run('JSON.stringify(validateConfig(JSON.parse(JSON.stringify(config)))) === JSON.stringify(config)'), true);
});

test('legacy imports preserve Arabic copy and correctly scope old screenshots', () => {
  const run = studio();
  assert.equal(run(`const old = {version: 1, logo: config.logo, appName: 'Legacy', theme: config.themes.dark,
    slides: config.locales.ar.slides.map(s => ({...s, screenshot: 'assets/screenshots/home.png'}))};
    const imported = validateConfig(old);
    imported.locales.ar.appName === 'Legacy' && imported.locales.en.appName === 'HudHud FM' &&
    imported.locales.ar.slides[0].screenshots.apple.light === 'assets/screenshots/home.png' &&
    imported.locales.ar.slides[0].screenshots.apple.dark.includes('apple-ar-dark')`), true);
});

test('imports reject unsafe paths, remote assets and broken variants', () => {
  for (const change of [
    `bad.logo = 'https://example.com/tracking.png'`,
    `bad.locales.ar.slides[0].screenshots.apple.dark = 'assets/../../private.png'`,
    `delete bad.locales.en.slides[0].screenshots.google.light`,
    `bad.themes.light.accent = 'red'`,
    `bad.locales.en.slides[0].title = 'x'.repeat(81)`
  ]) {
    const run = studio();
    assert.throws(() => run(`const bad = structuredClone(config); ${change}; validateConfig(bad)`));
  }
});

test('all export filenames are unique and preserve default links', () => {
  const run = studio();
  assert.equal(run(`const names = []; for (const locale of ['ar','en']) for (const mode of ['light','dark'])
    for (const type of ['apple','google']) for (const slide of [...config.locales[locale].slides.map(s=>s.id),'overview'])
      names.push(exportName(type,locale,mode,slide)); new Set(names).size`), 56);
  assert.equal(run(`exportName('apple','ar','dark','01-hero')`), 'apple-01-hero.png');
});
