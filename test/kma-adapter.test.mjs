import test from 'node:test';
import assert from 'node:assert/strict';
import { latLonToKmaGrid, latestKmaBase, normalizeKmaForecast, mergeKmaIntoSlots } from '../src/kma-adapter.mjs';

test('Seoul coordinates map to expected KMA grid neighborhood', () => {
  const g = latLonToKmaGrid(37.5665, 126.9780);
  assert.deepEqual(g, { nx:60, ny:127 });
});

test('latest base respects publication schedule and safety lag', () => {
  const r = latestKmaBase(new Date('2026-08-28T09:30:00Z')); // 18:30 KST -> safe 18:15 -> 17:00 run
  assert.deepEqual(r, { base_date:'20260828', base_time:'1700' });
});

test('KMA categories pivot into hourly rows', () => {
  const payload = { response:{ body:{ items:{ item:[
    {fcstDate:'20260828',fcstTime:'1900',category:'TMP',fcstValue:'26'},
    {fcstDate:'20260828',fcstTime:'1900',category:'POP',fcstValue:'20'},
    {fcstDate:'20260828',fcstTime:'1900',category:'PCP',fcstValue:'강수없음'},
    {fcstDate:'20260828',fcstTime:'1900',category:'WSD',fcstValue:'2.3'}
  ]}}}};
  const rows = normalizeKmaForecast(payload);
  assert.equal(rows[0].temp, 26);
  assert.equal(rows[0].precipitation, 0);
  const merged = mergeKmaIntoSlots([{time:'2026-08-28T19:00:00+09:00',temp:28,rainChance:0,precipitation:0,wind:1}], rows);
  assert.equal(merged[0].wind, 2.3);
  assert.equal(merged[0].weatherSource, 'KMA');
});
