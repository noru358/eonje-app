import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProductVerdict } from '../src/product-verdict.mjs';

test('primary window compresses broad good period around the peak', () => {
  const place = { id:'x', name:'X', shortName:'X' };
  const slots = [
    { time:'2026-08-29T18:00:00+09:00', temp:28, rainChance:20, precipitation:0, wind:0.4, pm25:6, pm10:13, crowd:null },
    { time:'2026-08-29T19:00:00+09:00', temp:27, rainChance:0, precipitation:0, wind:0.2, pm25:6, pm10:13, crowd:null },
    { time:'2026-08-29T20:00:00+09:00', temp:26, rainChance:0, precipitation:0, wind:0.1, pm25:6, pm10:13, crowd:null },
    { time:'2026-08-29T21:00:00+09:00', temp:26, rainChance:0, precipitation:0, wind:0.2, pm25:6, pm10:13, crowd:null },
    { time:'2026-08-29T22:00:00+09:00', temp:26, rainChance:0, precipitation:0, wind:0.2, pm25:6, pm10:13, crowd:null }
  ];
  const verdict = makeProductVerdict({
    place, slots, sunset:'2026-08-29T19:31:00+09:00', nowTime:'2026-08-29T03:30:00+09:00',
    current:{ time:'2026-08-29T03:30:00+09:00', temp:26, crowd:'여유' }
  });
  assert.equal(verdict.windowLabel, '19:00–21:00');
  assert.equal(verdict.start, '2026-08-29T19:00:00+09:00');
});
