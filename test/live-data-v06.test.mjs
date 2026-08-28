import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSeoulCityData } from '../src/seoul-adapter.mjs';
import { scoreSlot } from '../src/engine.mjs';

test('Seoul live adapter keeps the full 24h horizon and does not fake future wind/crowd', () => {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    FCST_DT: `20260829${String(i).padStart(2,'0')}00`, TEMP:'25', PRECIPITATION:'0', RAIN_CHANCE:'20'
  }));
  const payload = {
    'SeoulRtd.citydata': { CITYDATA: {
      LIVE_PPLTN_STTS: { LIVE_PPLTN_STTS: {
        AREA_CONGEST_LVL:'여유', PPLTN_TIME:'2026-08-29 00:10',
        FCST_PPLTN:{ FCST_PPLTN:[{ FCST_TIME:'2026-08-29 01:00', FCST_CONGEST_LVL:'보통' }] }
      }},
      WEATHER_STTS: { WEATHER_STTS: {
        TEMP:'24', WIND_SPD:'1.2', PM25:'6', PM10:'13', UV_INDEX:'1', WEATHER_TIME:'2026-08-29 00:10', SUNSET:'19:31',
        FCST24HOURS:{ FCST24HOURS:hours }
      }}
    }}
  };
  const r = normalizeSeoulCityData(payload, { referenceDate:new Date('2026-08-28T15:10:00Z') });
  assert.equal(r.slots.length, 24);
  assert.equal(r.slots[1].wind, null);
  assert.equal(r.slots[1].crowd, '보통');
  assert.equal(r.slots[5].crowd, null);
  assert.equal(r.slots[5].provenance.wind, 'missing_until_kma');
});

test('missing future wind is neutral, not silently treated as ideal calm wind', () => {
  const base = { time:'2026-08-29T19:00:00+09:00', temp:24, rainChance:0, precipitation:0, pm25:10, pm10:20, crowd:'보통' };
  const unknown = scoreSlot({ ...base, wind:null });
  const calm = scoreSlot({ ...base, wind:1 });
  assert.ok(unknown.score < calm.score);
  assert.equal(unknown.gated, false);
});
