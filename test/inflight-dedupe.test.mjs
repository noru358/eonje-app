import test from 'node:test';
import assert from 'node:assert/strict';
import { createInflightDeduper } from '../src/inflight-dedupe.mjs';

test('concurrent calls for the same key share one task', async () => {
  const runInflight = createInflightDeduper();
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });

  const task = async () => {
    calls += 1;
    await gate;
    return { ok: true };
  };

  const first = runInflight('yeouido', task);
  const second = runInflight('yeouido', task);

  assert.equal(calls, 0);
  release();
  const [a, b] = await Promise.all([first, second]);

  assert.equal(calls, 1);
  assert.deepEqual(a, { ok: true });
  assert.strictEqual(a, b);
});

test('different keys run independently', async () => {
  const runInflight = createInflightDeduper();
  let calls = 0;

  const [a, b] = await Promise.all([
    runInflight('yeouido', async () => { calls += 1; return 'a'; }),
    runInflight('banpo', async () => { calls += 1; return 'b'; })
  ]);

  assert.equal(calls, 2);
  assert.equal(a, 'a');
  assert.equal(b, 'b');
});

test('failed task is removed so a later call can retry', async () => {
  const runInflight = createInflightDeduper();
  let calls = 0;

  await assert.rejects(
    runInflight('yeouido', async () => {
      calls += 1;
      throw new Error('upstream failed');
    }),
    /upstream failed/
  );

  const result = await runInflight('yeouido', async () => {
    calls += 1;
    return 'recovered';
  });

  assert.equal(calls, 2);
  assert.equal(result, 'recovered');
});
