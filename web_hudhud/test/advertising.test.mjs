import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import ts from 'typescript';

async function setup(fail = false) {
  const calls = [];
  const dependencies = {
    'firebase/functions': { getFunctions: () => ({}), httpsCallable: (_functions, name) => async data => {
      calls.push([name, data]); if (fail) throw new Error('Synthetic unavailable'); return { data: { version: 1, ad: null } };
    } },
    './firebase-client': { getPublicApp: () => ({}) },
    './firestore-environment': { firestoreRoot: 'HudHudDev' },
  };
  const source = ts.transpileModule(await readFile(new URL('../lib/advertising.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const module = new SourceTextModule(source);
  await module.link(name => { const values = dependencies[name]; return new SyntheticModule(Object.keys(values), function () { Object.entries(values).forEach(([key, value]) => this.setExport(key, value)); }); });
  await module.evaluate(); return { api: module.namespace, calls };
}
test('public creative schema rejects unsupported versions, formats and unsafe actions', async () => {
  const { api } = await setup();
  const ad = { deliveryId: 'receipt', title: 'Sponsor', body: '', sponsor: 'Company', kind: 'sponsorship', imageUrl: '', targetUrl: 'https://company.com', validForMs: 60000 };
  assert.equal(api.parseAd({ version: 1, ad }, 100).expiresAt, 60100);
  for (const bad of [{ targetUrl: 'javascript:alert(1)' }, { targetUrl: 'https://user:pass@company.com' }, { targetUrl: 'https://127.0.0.1' }, { kind: 'video' }, { kind: 'image', imageUrl: '' }, { validForMs: 0 }, { validForMs: 60001 }]) assert.equal(api.parseAd({ version: 1, ad: { ...ad, ...bad } }), null);
  assert.equal(api.parseAd({ version: 2, ad }), null);
});
test('delivery and events fail independently of core browsing and include explicit root', async () => {
  const { api, calls } = await setup(true);
  assert.equal(await api.loadAd(), null);
  await api.recordAd({ deliveryId: 'receipt' }, 'click');
  assert.equal(calls[0][1].platform, 'web'); assert.equal(calls[0][1].version, 1);
  assert.equal(calls[1][1].root, 'HudHudDev'); assert.equal(calls[1][1].event, 'click');
});
