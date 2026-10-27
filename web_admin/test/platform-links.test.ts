import assert from 'node:assert/strict';
import type { ReactElement } from 'react';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { transpileModule, ModuleKind, JsxEmit } = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const expected = [
  ['HudHud FM', 'https://www.hudhudfm.com/'],
  ['Facebook', 'https://www.facebook.com/HudhudFm'],
  ['Instagram', 'https://www.instagram.com/hudhudfm'],
];

void test('actual platform component renders three visible accessible official shortcuts without station data', async () => {
  const componentUrl = new URL('../components/admin/platform-links.tsx', import.meta.url);
  const source = await readFile(componentUrl, 'utf8');
  const compiled = transpileModule(source, {
    compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: 'platform-links.tsx',
  }).outputText;
  const module = { exports: {} as { PlatformLinks: () => ReactElement } };
  runInNewContext(compiled, {
    module, exports: module.exports, require: createRequire(componentUrl),
  });
  const html = renderToStaticMarkup(React.createElement(module.exports.PlatformLinks));
  assert.match(html, /<nav[^>]*aria-label="HudHud FM platform links"/);
  assert.equal([...html.matchAll(/<a\b/g)].length, 3);
  for (const [label, href] of expected) {
    const anchor = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].find(match => match[1].includes(`href="${href}"`));
    assert.ok(anchor, `Missing official shortcut: ${label}`);
    assert.match(anchor[1], /target="_blank"/);
    assert.match(anchor[1], /rel="noopener noreferrer"/);
    assert.ok(anchor[2].includes(`<span>${label}</span>`), 'Shortcut must have visible text');
    assert.match(anchor[2], /aria-hidden="true"/);
    assert.ok(/min-h-11/.test(anchor[1]) && /min-w-11/.test(anchor[1]), 'Shortcut must have a 44px minimum target');
    assert.equal(new URL(href).search, '');
  }
  assert.doesNotMatch(html, /stationId|programId|episodeId|\?station=/);
});
