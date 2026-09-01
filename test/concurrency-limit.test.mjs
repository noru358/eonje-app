import test from 'node:test';
import assert from 'node:assert/strict';
import { createConcurrencyLimiter } from '../src/concurrency-limit.mjs';

test('never runs more than the configured number of tasks at once', async () => {
  const limit = createConcurrencyLimiter(2);
  let active = 0;
  let peak = 0;
  const releases = [];

  const tasks = Array.from({ length:5 }, (_, index) => limit(async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => releases.push(resolve));
    active -= 1;
    return index;
  }));

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(active, 2);
  assert.equal(peak, 2);

  while (releases.length) {
    const release = releases.shift();
    release();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  assert.deepEqual(await Promise.all(tasks), [0,1,2,3,4]);
  assert.equal(peak, 2);
});

test('a rejected task releases capacity for the queue', async () => {
  const limit = createConcurrencyLimiter(1);
  const first = limit(async () => { throw new Error('fail'); });
  const second = limit(async () => 'ok');
  await assert.rejects(first, /fail/);
  assert.equal(await second, 'ok');
});

test('rejects invalid limits', () => {
  assert.throws(() => createConcurrencyLimiter(0), /positive integer/);
});
