import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransientFetch } from '../src/transient-fetch.mjs';

test('retries one timeout and then returns success', async () => {
  let calls = 0;
  const wrapped = createTransientFetch(async () => {
    calls += 1;
    if (calls === 1) {
      const error = new Error('The operation was aborted due to timeout');
      error.name = 'TimeoutError';
      throw error;
    }
    return { ok:true, status:200 };
  }, { retries:1, delayMs:0, sleep:async () => {} });

  const response = await wrapped('https://example.test');
  assert.equal(calls, 2);
  assert.equal(response.status, 200);
});

test('retries a transient 503 but not a deterministic 401', async () => {
  let transientCalls = 0;
  const transient = createTransientFetch(async () => {
    transientCalls += 1;
    return { ok:transientCalls > 1, status:transientCalls === 1 ? 503 : 200 };
  }, { retries:1, delayMs:0, sleep:async () => {} });
  assert.equal((await transient('https://example.test')).status, 200);
  assert.equal(transientCalls, 2);

  let authCalls = 0;
  const auth = createTransientFetch(async () => {
    authCalls += 1;
    return { ok:false, status:401 };
  }, { retries:1, delayMs:0, sleep:async () => {} });
  assert.equal((await auth('https://example.test')).status, 401);
  assert.equal(authCalls, 1);
});

test('does not hide a repeated timeout', async () => {
  let calls = 0;
  const wrapped = createTransientFetch(async () => {
    calls += 1;
    const error = new Error('timeout');
    error.name = 'TimeoutError';
    throw error;
  }, { retries:1, delayMs:0, sleep:async () => {} });

  await assert.rejects(wrapped('https://example.test'), /timeout/);
  assert.equal(calls, 2);
});

test('signalFactory gives every retry a fresh non-aborted signal', async () => {
  const seen = [];
  let calls = 0;
  const wrapped = createTransientFetch(async (_url, init) => {
    seen.push(init.signal);
    calls += 1;
    assert.equal(init.signal.aborted, false);
    if (calls === 1) {
      const error = new Error('timeout');
      error.name = 'TimeoutError';
      throw error;
    }
    return { ok:true, status:200 };
  }, {
    retries:1,
    delayMs:0,
    sleep:async () => {},
    signalFactory:() => new AbortController().signal
  });

  const stale = AbortSignal.abort();
  const response = await wrapped('https://example.test', { signal:stale });
  assert.equal(response.status, 200);
  assert.equal(seen.length, 2);
  assert.notStrictEqual(seen[0], seen[1]);
  assert.notStrictEqual(seen[0], stale);
  assert.notStrictEqual(seen[1], stale);
});
