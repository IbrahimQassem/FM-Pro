import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';
import { createGunzip, createInflate, createBrotliDecompress } from 'node:zlib';

class PublicFetchError extends Error {}

const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
]) blocked.addSubnet(address, prefix, 'ipv4');
blocked.addSubnet('2001::', 23, 'ipv6');
blocked.addSubnet('2001:db8::', 32, 'ipv6');
blocked.addSubnet('2002::', 16, 'ipv6');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');

function publicAddress(address) {
  const family = isIP(address);
  return family === 4 ? !blocked.check(address, 'ipv4') :
    family === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
}

export function isSafePublicUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return false;
    const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
    if (isIP(host)) return publicAddress(host);
    return host.includes('.') && !['localhost', 'local', 'internal', 'test', 'invalid'].some(
      suffix => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch { return false; }
}

// Resolve once, validate every answer, then connect only to the selected answer.
// Keeping the original hostname preserves Host and TLS certificate validation.
async function requestPinned(url, { address, headers, signal }) {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
      method: 'GET', agent: false, signal, autoSelectFamily: false,
      headers: { ...headers, 'Accept-Encoding': 'identity' },
      lookup: (_host, options, callback) => options.all
        ? callback(null, [address]) : callback(null, address.address, address.family),
    }, response => {
      const encoding = String(response.headers['content-encoding'] || 'identity').toLowerCase();
      const decoder = encoding === 'gzip' ? createGunzip() : encoding === 'deflate' ? createInflate() :
        encoding === 'br' ? createBrotliDecompress() : null;
      if (encoding !== 'identity' && !decoder) {
        response.destroy(); reject(new PublicFetchError('Unsupported response encoding.')); return;
      }
      const body = decoder ? response.pipe(decoder) : response;
      if (decoder) {
        response.on('error', error => decoder.destroy(error));
        decoder.on('close', () => response.destroy());
      }
      const responseHeaders = new Headers();
      for (const [key, value] of Object.entries(response.headers)) {
        if (value !== undefined && !(decoder && key === 'content-length')) responseHeaders.set(key, String(value));
      }
      resolve({ status: response.statusCode, ok: response.statusCode >= 200 && response.statusCode < 300,
        headers: responseHeaders, body: Readable.toWeb(body) });
    });
    request.on('error', reject);
    request.end();
  });
}

let active = 0;
const waiting = [];
function acquire(signal) {
  return new Promise((resolve, reject) => {
    const enter = () => {
      signal.removeEventListener('abort', abort);
      active++;
      let released = false;
      resolve(() => {
        if (released) return;
        released = true; active--;
        waiting.shift()?.();
      });
    };
    const abort = () => {
      const index = waiting.indexOf(enter);
      if (index >= 0) waiting.splice(index, 1);
      reject(signal.reason);
    };
    if (signal.aborted) return abort();
    if (active < 4) enter();
    else { waiting.push(enter); signal.addEventListener('abort', abort, { once: true }); }
  });
}

export async function withPublicResponse(value, {
  lookupFn = lookup, fetchFn, timeoutMs = 8000, maxRedirects = 3, headers = {},
} = {}, consume) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isInteger(maxRedirects) || maxRedirects < 0 || maxRedirects > 5) {
    throw new PublicFetchError('Invalid fetch limits.');
  }
  const controller = new AbortController();
  const deadline = new Promise((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true });
  });
  const timer = setTimeout(() => controller.abort(new DOMException('Public fetch timed out.', 'AbortError')), timeoutMs);
  let release;
  const work = async () => {
    release = await acquire(controller.signal);
    let url;
    try { url = new URL(value); } catch { throw new PublicFetchError('Invalid public URL.'); }
    for (let hop = 0; ; hop++) {
      controller.signal.throwIfAborted();
      if (!isSafePublicUrl(url.href)) throw new PublicFetchError('Unsafe public URL.');
      const host = url.hostname.replace(/^\[|\]$/g, '');
      const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookupFn(host, { all: true, verbatim: true });
      controller.signal.throwIfAborted();
      if (!Array.isArray(addresses) || !addresses.length || addresses.some(item => !publicAddress(item.address))) {
        throw new PublicFetchError('Unsafe DNS destination.');
      }
      const address = { address: addresses[0].address, family: isIP(addresses[0].address) };
      const options = { method: 'GET', redirect: 'manual', headers, signal: controller.signal, address };
      const response = fetchFn ? await fetchFn(url.href, options) : await requestPinned(url, options);
      try {
        controller.signal.throwIfAborted();
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          if (hop >= maxRedirects) throw new PublicFetchError('Public fetch redirect limit exceeded.');
          const location = response.headers.get('location');
          if (!location) throw new PublicFetchError('Invalid redirect.');
          url = new URL(location, url);
          continue;
        }
        return await consume(response, controller.signal, url);
      } finally {
        await response.body?.cancel?.().catch(() => {});
      }
    }
  };
  try { return await Promise.race([work(), deadline]); }
  catch (error) {
    if (error instanceof PublicFetchError || error?.name === 'AbortError') throw error;
    // Resolver, TLS and socket errors can contain source URLs/hostnames.
    throw new PublicFetchError('Public resource fetch failed.');
  }
  finally { clearTimeout(timer); controller.abort(); release?.(); }
}

export async function readResponseBytes(response, { maxBytes, firstChunkOnly = false, signal } = {}) {
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || !response.body) throw new PublicFetchError('Invalid response body.');
  const reader = response.body.getReader();
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  const chunks = [];
  let size = 0;
  try {
    signal?.throwIfAborted();
    if (!firstChunkOnly && Number(response.headers.get('content-length')) > maxBytes) throw new PublicFetchError('Response body too large.');
    while (true) {
      const { value, done } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      if (firstChunkOnly) return value.slice(0, maxBytes);
      size += value.length;
      if (size > maxBytes) throw new PublicFetchError('Response body too large.');
      chunks.push(value);
    }
    return Buffer.concat(chunks, size);
  } finally {
    signal?.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock?.();
  }
}
