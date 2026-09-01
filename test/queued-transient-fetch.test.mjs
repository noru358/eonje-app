import test from 'node:test';
import assert from 'node:assert/strict';
import { createQueuedTransientFetch } from '../src/queued-transient-fetch.mjs';

test('queued request receives its timeout signal only after admission', async () => {
  const admittedSignals = [];
  let releaseFirst;
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
  let call = 0;

  const fetchImpl = async (_input, init) => {
    call += 1;
    admittedSignals.push(init.signal);
    assert.equal(init.signal.aborted, false);
    if (call === 1) await firstGate;
    return { ok:true, status:200 };
  };

  const createdAt = [];
  const timeoutSignal = () => {
    createdAt.push(Date.now());
    return new AbortController().signal;
  };
  const queuedFetch = createQueuedTransientFetch(fetchImpl, {
    maxConcurrent:1,
    retries:0,
    timeoutMs:7,
    timeoutSignal
  });

  const first = queuedFetch('first');
  const second = queuedFetch('second');
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(createdAt.length, 1);
  assert.equal(admittedSignals.length, 1);
  releaseFirst();
  await first;
  await second;

  assert.equal(createdAt.length, 2);
  assert.equal(admittedSignals.length, 2);
  assert.notStrictEqual(admittedSignals[0], admittedSignals[1]);
});

test('each transient retry also gets a fresh post-admission signal', async () => {
  const signals = [];
  let calls = 0;
  const queuedFetch = createQueuedTransientFetch(async (_input, init) => {
    signals.push(init.signal);
    calls += 1;
    if (calls === 1) {
      const error = new Error('timeout');
      error.name = 'TimeoutError';
      throw error;
    }
    return { ok:true, status:200 };
  }, {
    maxConcurrent:1,
    retries:1,
    delayMs:0,
    timeoutSignal:() => new AbortController().signal
  });

  assert.equal((await queuedFetch('x')).status, 200);
  assert.equal(calls, 2);
  assert.notStrictEqual(signals[0], signals[1]);
});
