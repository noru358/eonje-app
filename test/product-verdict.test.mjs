import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProductVerdict } from '../src/product-verdict.mjs';

const place = { id:'x', name:'X', shortName:'X' };

test('03:20 query compares dawn against the coming evening', () => {
  const slots = [
    { time:'2026-08-29T04:00:00+09:00', temp:26, rainChance:60, precipitation:0, wind:null, pm25:6, pm10:13, crowd:'여유' },
    { time:'2026-08-29T05:00:00+09:00', temp:26, rainChance:60, precipitation:0, wind:null, pm25:6, pm10:13, crowd:'여유' },
    { time:'2026-08-29T19:00:00+09:00', temp:24, rainChance:10, precipitation:0, wind:null, pm25:6, pm10:13, crowd:'보통' }
  ];
  const v = makeProductVerdict({ place, slots, sunset:'2026-08-29T19:31:00+09:00', nowTime:'2026-08-29T03:20:00+09:00' });
  assert.equal(v.best.time, '2026-08-29T19:00:00+09:00');
  assert.equal(v.headline, '19:00쯤 가는 게 낫다.');
});

test('daytime query does not silently include tomorrow dawn', () => {
  const slots = [
    { time:'2026-08-29T19:00:00+09:00', temp:25, rainChance:10, precipitation:0, wind:2, pm25:10, pm10:20, crowd:'보통' },
    { time:'2026-08-30T01:00:00+09:00', temp:23, rainChance:0, precipitation:0, wind:1, pm25:10, pm10:20, crowd:'여유' }
  ];
  const v = makeProductVerdict({ place, slots, sunset:'2026-08-29T19:31:00+09:00', nowTime:'2026-08-29T12:00:00+09:00' });
  assert.equal(v.scored.some((s) => s.time.includes('2026-08-30')), false);
});

test('evening query may include next-day dawn as tonight', () => {
  const slots = [
    { time:'2026-08-29T23:00:00+09:00', temp:29, rainChance:30, precipitation:0, wind:3, pm25:10, pm10:20, crowd:'붐빔' },
    { time:'2026-08-30T01:00:00+09:00', temp:23, rainChance:0, precipitation:0, wind:1, pm25:10, pm10:20, crowd:'여유' }
  ];
  const v = makeProductVerdict({ place, slots, nowTime:'2026-08-29T22:30:00+09:00' });
  assert.equal(v.best.time, '2026-08-30T01:00:00+09:00');
});

test('missing hourly wind is disclosed and caps high confidence', () => {
  const slots = [{ time:'2026-08-29T19:00:00+09:00', temp:24, rainChance:0, precipitation:0, wind:null, pm25:10, pm10:20, crowd:'여유' }];
  const v = makeProductVerdict({ place, slots, nowTime:'2026-08-29T12:00:00+09:00' });
  assert.match(v.confidenceDetail || '', /풍속/);
  assert.notEqual(v.confidence, '높음');
});
