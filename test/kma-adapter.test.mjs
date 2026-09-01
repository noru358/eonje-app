import test from 'node:test';
import assert from 'node:assert/strict';
import {
  latLonToKmaGrid, latestKmaBase, previousKmaBase, normalizeKmaForecast,
  fetchKmaForecast, mergeKmaIntoSlots, mergeKmaIntoSlotsWithMeta
} from '../src/kma-adapter.mjs';

test('Seoul coordinates map to expected KMA grid neighborhood', () => {
  const g = latLonToKmaGrid(37.5665, 126.9780);
  assert.deepEqual(g, { nx:60, ny:127 });
});

test('latest base respects publication schedule and safety lag', () => {
  const r = latestKmaBase(new Date('2026-08-28T09:30:00Z')); // 18:30 KST -> safe 18:15 -> 17:00 run
  assert.deepEqual(r, { base_date:'20260828', base_time:'1700' });
});

test('previous base crosses midnight correctly', () => {
  assert.deepEqual(previousKmaBase({ base_date:'20260829', base_time:'0200' }), { base_date:'20260828', base_time:'2300' });
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

test('merge metadata distinguishes an attempted KMA fetch from an actual merge', () => {
  const result = mergeKmaIntoSlotsWithMeta(
    [{ time:'2026-08-28T19:00:00+09:00', temp:28, wind:null }],
    [{ time:'2026-08-29T19:00:00+09:00', temp:26, wind:2 }]
  );
  assert.equal(result.mergedSlotCount, 0);
  assert.deepEqual(result.mergedFields, { temp:0, rainChance:0, precipitation:0, wind:0 });
  assert.equal(result.slots[0].weatherSource, undefined);
});

test('late latest release retries exactly one previous KMA base and exposes metadata', async () => {
  const urls = [];
  const noData = { response:{ header:{ resultCode:'03', resultMsg:'NO_DATA' }, body:{} } };
  const valid = { response:{ header:{ resultCode:'00', resultMsg:'NORMAL_SERVICE' }, body:{
    totalCount:1, items:{ item:[{ fcstDate:'20260828', fcstTime:'1900', category:'TMP', fcstValue:'26' }] }
  } } };
  const payloads = [noData, valid];
  const result = await fetchKmaForecast({
    serviceKey:'test', lat:37.5665, lon:126.9780, now:new Date('2026-08-28T09:30:00Z'),
    fetchImpl:async (url) => {
      urls.push(String(url));
      return { ok:true, json:async () => payloads.shift() };
    }
  });
  assert.equal(urls.length, 2);
  assert.match(urls[0], /numOfRows=2000/);
  assert.match(urls[0], /base_time=1700/);
  assert.match(urls[1], /base_time=1400/);
  assert.equal(result.metadata.retriedPreviousBase, true);
  assert.deepEqual(result.metadata.selectedBase, { base_date:'20260828', base_time:'1400' });
  assert.equal(result.rows[0].temp, 26);
});
