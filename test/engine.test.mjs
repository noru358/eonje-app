import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreSlot, makeVerdict, hardGate } from '../src/engine.mjs';
import { mockCityData } from '../src/mock-data.mjs';
import { getPlace } from '../src/places.mjs';

test('heavy rain is hard-gated', () => {
  assert.equal(hardGate({ rainChance: 90, precipitation: 2, temp: 23, pm25: 10, pm10: 20, wind: 2 }), '비 가능성 높음');
});

test('comfortable, clear, uncrowded slot scores high', () => {
  const r = scoreSlot({ time:'2026-08-28T19:00:00+09:00', temp:24, rainChance:10, precipitation:0, wind:2, pm25:12, pm10:25, uv:0, crowd:'여유' }, { sunset:'2026-08-28T19:07:00+09:00' });
  assert.ok(r.score > 90);
});

test('mock Yeouido verdict chooses evening window', () => {
  const data = mockCityData('yeouido');
  const v = makeVerdict({ place:getPlace('yeouido'), slots:data.slots, sunset:data.sunset, nowTime:data.nowTime });
  assert.equal(v.status, 'go');
  assert.ok(v.windowLabel.includes('19:'));
  assert.ok(v.reasons.length >= 2);
});

test('current hour can produce an honest now verdict', () => {
  const slots = [
    { time:'2026-08-28T21:00:00+09:00', temp:24, rainChance:10, precipitation:0, wind:2, pm25:20, pm10:30, crowd:'여유' },
    { time:'2026-08-28T22:00:00+09:00', temp:24, rainChance:50, precipitation:0, wind:2, pm25:20, pm10:30, crowd:'약간 붐빔' }
  ];
  const verdict = makeVerdict({
    place:{ id:'x', name:'X', shortName:'X' }, slots,
    sunset:'2026-08-28T19:07:00+09:00', nowTime:'2026-08-28T21:14:00+09:00',
    current:{ time:'2026-08-28T21:14:00+09:00', temp:24, rainChance:0, precipitation:0, wind:2, pm25:20, pm10:30, crowd:'여유' }
  });
  assert.equal(verdict.headline, '지금 가는 게 낫다.');
  assert.match(verdict.windowLabel, /^지금–/);
});

test('today verdict never chooses after midnight', () => {
  const slots = [
    { time:'2026-08-28T23:00:00+09:00', temp:28, rainChance:30, precipitation:0, wind:2, pm25:20, pm10:30, crowd:'약간 붐빔' },
    { time:'2026-08-29T00:00:00+09:00', temp:24, rainChance:0, precipitation:0, wind:1, pm25:10, pm10:20, crowd:'여유' }
  ];
  const verdict = makeVerdict({
    place:{ id:'x', name:'X', shortName:'X' }, slots,
    sunset:'2026-08-28T19:07:00+09:00', nowTime:'2026-08-28T22:30:00+09:00'
  });
  assert.equal(verdict.best.time, '2026-08-28T23:00:00+09:00');
});


test('all gated slots produce an avoid verdict instead of a weak recommendation', () => {
  const slots = [
    { time:'2026-08-28T19:00:00+09:00', temp:24, rainChance:90, precipitation:2, wind:2, pm25:20, pm10:30, crowd:'여유' },
    { time:'2026-08-28T20:00:00+09:00', temp:34, rainChance:0, precipitation:0, wind:2, pm25:20, pm10:30, crowd:'여유' }
  ];
  const verdict = makeVerdict({ place:{ id:'x', name:'X', shortName:'X' }, slots, nowTime:'2026-08-28T18:30:00+09:00' });
  assert.equal(verdict.status, 'avoid');
  assert.match(verdict.headline, /안 가는 게 낫다/);
});

test('no remaining slot today produces a done verdict', () => {
  const slots = [
    { time:'2026-08-28T21:00:00+09:00', temp:24, rainChance:0, precipitation:0, wind:2, pm25:20, pm10:30, crowd:'여유' }
  ];
  const verdict = makeVerdict({ place:{ id:'x', name:'X', shortName:'X' }, slots, nowTime:'2026-08-28T22:30:00+09:00' });
  assert.equal(verdict.status, 'done');
});
