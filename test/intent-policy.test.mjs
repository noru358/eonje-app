import test from 'node:test';
import assert from 'node:assert/strict';
import { applyIntentToSlots, intentAdjustment, normalizeIntent } from '../src/intent-policy.mjs';

test('unknown intent falls back to general', () => {
  assert.equal(normalizeIntent('whatever'), 'general');
});

test('sunset intent materially prefers a slot near sunset', () => {
  const sunset = '2026-09-01T19:00:00+09:00';
  const near = { time:'2026-09-01T18:30:00+09:00', crowd:'보통', temp:24, rainChance:10, wind:2 };
  const far = { time:'2026-09-01T14:00:00+09:00', crowd:'보통', temp:24, rainChance:10, wind:2 };
  assert.ok(intentAdjustment(near, 'sunset', sunset) >= intentAdjustment(far, 'sunset', sunset) + 10);
});

test('picnic intent dislikes late-night slots and preserves existing event impact', () => {
  const daytime = { time:'2026-09-01T18:00:00+09:00', crowd:'여유', temp:24, rainChance:10, wind:2, eventImpact:2 };
  const late = { ...daytime, time:'2026-09-01T23:00:00+09:00' };
  const [adjusted] = applyIntentToSlots([daytime], 'picnic');
  assert.ok(adjusted.eventImpact > 2);
  assert.ok(intentAdjustment(daytime, 'picnic') > intentAdjustment(late, 'picnic'));
});

test('run intent prefers moderate temperature over hot weather', () => {
  const cool = { time:'2026-09-01T20:00:00+09:00', crowd:'보통', temp:19, rainChance:10, wind:2 };
  const hot = { ...cool, temp:31 };
  assert.ok(intentAdjustment(cool, 'run') > intentAdjustment(hot, 'run'));
});
