import test from 'node:test';
import assert from 'node:assert/strict';
import { createDevApiProxy } from './devApiProxy.js';

test('proxy is configured only for an explicit HTTP API server', () => {
  assert.equal(createDevApiProxy(undefined), undefined);
  assert.equal(createDevApiProxy(''), undefined);
  assert.equal(createDevApiProxy('/backend'), undefined);
  const proxy = createDevApiProxy('http://example.test:8080')['/api'];
  assert.equal(proxy.target, 'http://example.test:8080');
  assert.equal(proxy.cookieDomainRewrite, '');
});

test('local HTTP cookie adaptation preserves HttpOnly, SameSite, path and expiry', () => {
  let handler;
  createDevApiProxy('http://example.test')['/api'].configure({
    on(event, callback) { assert.equal(event, 'proxyRes'); handler = callback; },
  });
  const response = { headers: { 'set-cookie': [
    'owlly_session=test-only; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=2592000',
    'other=test; secure; HttpOnly',
  ] } };
  handler(response);
  assert.deepEqual(response.headers['set-cookie'], [
    'owlly_session=test-only; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000',
    'other=test; HttpOnly',
  ]);
  assert.doesNotThrow(() => handler({ headers: {} }));
});
