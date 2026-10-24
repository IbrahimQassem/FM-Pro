import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import { syncBuiltinESMExports } from 'node:module';
import { withPublicResponse, readResponseBytes, isSafePublicUrl } from '../lib/public-fetch.js';

const lookupFn = async () => [{ address: '93.184.216.34', family: 4 }];
const consume = (response, signal) => readResponseBytes(response, { maxBytes: 8, signal });

test('rejects unsafe URL representations before DNS or transport', async () => {
  for (const url of ['http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://2130706433/',
    'http://0177.0.0.1/', 'http://0x7f000001/', 'http://172.16.0.1/', 'http://169.254.169.254/',
    'http://[fd00::1]/', 'http://[fe80::1]/', 'http://localhost./', 'https://user:secret@radio.example/']) {
    assert.equal(isSafePublicUrl(url), false, url);
    await assert.rejects(withPublicResponse(url, {
      lookupFn: async () => assert.fail('unsafe URL reached DNS'),
      fetchFn: async () => assert.fail('unsafe URL reached transport'),
    }, consume));
  }
});

test('rejects DNS results with private or mixed addresses before transport', async () => {
  for (const addresses of [[{ address: '127.0.0.1', family: 4 }],
    [{ address: '93.184.216.34', family: 4 }, { address: '::1', family: 6 }], []]) {
    await assert.rejects(withPublicResponse('https://radio.example/', {
      lookupFn: async () => addresses, fetchFn: async () => assert.fail('private DNS reached transport'),
    }, consume));
  }
});

test('transport receives pinned validated address and manual redirects', async () => {
  let calls = 0;
  const bytes = await withPublicResponse('https://radio.example/', { lookupFn,
    fetchFn: async (_url, options) => {
      calls++;
      assert.equal(options.redirect, 'manual');
      assert.deepEqual(options.address, { address: '93.184.216.34', family: 4 });
      return new Response('audio');
    },
  }, consume);
  assert.equal(Buffer.from(bytes).toString(), 'audio'); assert.equal(calls, 1);
});

test('revalidates every redirect and does not fetch private redirect targets', async () => {
  let calls = 0;
  await assert.rejects(withPublicResponse('https://radio.example/', { lookupFn,
    fetchFn: async () => { calls++; return new Response(null, { status: 302, headers: { location: 'http://[::1]/' } }); },
  }, consume));
  assert.equal(calls, 1);
  await assert.rejects(withPublicResponse('https://radio.example/', { lookupFn, maxRedirects: 1,
    fetchFn: async () => new Response(null, { status: 302, headers: { location: '/again' } }),
  }, consume), /redirect/i);
});

test('rejects oversized bodies with and without a content length and cancels reader', async () => {
  for (const headers of [{ 'content-length': '100' }, {}]) {
    let cancelled = false;
    const response = new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(16)); },
      cancel() { cancelled = true; },
    }), { headers });
    await assert.rejects(readResponseBytes(response, { maxBytes: 8 }), /large/i);
    assert.equal(cancelled, true);
  }
});

test('one deadline bounds DNS, transport and body consumption', async () => {
  const never = () => new Promise(() => {});
  for (const options of [{ lookupFn: never }, { lookupFn, fetchFn: never },
    { lookupFn, fetchFn: async () => new Response(new ReadableStream({ start() {} })) }]) {
    await assert.rejects(withPublicResponse('https://radio.example/', { ...options, timeoutMs: 20 }, consume),
      error => error.name === 'AbortError');
  }
});

test('public IPv4/IPv6 and nonstandard radio ports remain valid', async () => {
  for (const url of ['http://93.184.216.34:8000/live', 'https://[2606:4700:4700::1111]/']) {
    assert.equal(isSafePublicUrl(url), true);
    const bytes = await withPublicResponse(url, { lookupFn, fetchFn: async () => new Response('audio') }, consume);
    assert.equal(bytes.length, 5);
  }
});

test('native HTTP transport pins the validated IP while preserving the original host', async context => {
  const original = http.request;
  context.after(() => { http.request = original; syncBuiltinESMExports(); });
  http.request = (url, options, onResponse) => {
    assert.equal(url.hostname, 'radio.example');
    assert.equal(options.agent, false);
    options.lookup('radio.example', { all: true }, (error, addresses) => {
      assert.equal(error, null);
      assert.deepEqual(addresses, [{ address: '93.184.216.34', family: 4 }]);
    });
    const request = new EventEmitter();
    request.end = () => {
      const response = Readable.from([gzipSync('audio')]);
      response.statusCode = 200;
      response.headers = { 'content-encoding': 'gzip', 'content-length': '100' };
      onResponse(response);
    };
    return request;
  };
  syncBuiltinESMExports();
  const bytes = await withPublicResponse('http://radio.example:8000/live', { lookupFn }, consume);
  assert.equal(Buffer.from(bytes).toString(), 'audio');
});

test('changed DNS after a public redirect is rejected without a second transport call', async () => {
  let lookups = 0, requests = 0;
  await assert.rejects(withPublicResponse('https://radio.example/', {
    lookupFn: async () => ++lookups === 1 ? lookupFn() : [{ address: '10.1.2.3', family: 4 }],
    fetchFn: async () => {
      requests++;
      return new Response(null, { status: 302, headers: { location: '/changed-dns' } });
    },
  }, consume), /DNS/);
  assert.equal(requests, 1);
});

test('concurrent public fetches never exceed four transports per instance', async () => {
  let active = 0, maximum = 0;
  const fetchFn = async () => {
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 10));
    active--;
    return new Response('audio');
  };
  await Promise.all(Array.from({ length: 9 }, () => withPublicResponse('https://radio.example/', { lookupFn, fetchFn }, consume)));
  assert.equal(maximum, 4);
});

test('raw DNS/socket errors never expose source URLs or hostnames', async () => {
  await assert.rejects(withPublicResponse('https://radio.example/', {
    lookupFn, fetchFn: async () => { throw new Error('request failed https://secret-source.example/token'); },
  }, consume), error => error.message === 'Public resource fetch failed.');
});
