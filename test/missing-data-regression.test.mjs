import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSeoulCityData } from '../src/seoul-adapter.mjs';
import { normalizeKmaForecast, mergeKmaIntoSlots } from '../src/kma-adapter.mjs';
import { makeProductVerdict } from '../src/product-verdict.mjs';
import { assessDataQuality } from '../src/data-quality.mjs';

const place = { id:'x', name:'X', shortName:'X' };

function seoulPayload(overrides = {}) {
  return {
    'SeoulRtd.citydata': { CITYDATA: {
      LIVE_PPLTN_STTS: { LIVE_PPLTN_STTS: {
        PPLTN_TIME:'2026-08-29 10:00',
        FCST_PPLTN:{ FCST_PPLTN:[{ FCST_TIME:'2026-08-29 19:00' }] },
        ...overrides.live
      }},
      WEATHER_STTS: { WEATHER_STTS: {
        WEATHER_TIME:'2026-08-29 10:00', SUNSET:'19:31',
        FCST24HOURS:{ FCST24HOURS:[{ FCST_DT:'202608291900' }] },
        ...overrides.weather
      }}
    }}
  };
}

test('missing Seoul fields remain unknown instead of becoming ideal defaults', () => {
  const decisionTime = new Date('2026-08-29T01:17:00Z');
  const data = normalizeSeoulCityData(seoulPayload(), { referenceDate:decisionTime });
  assert.equal(data.slots[0].temp, null);
  assert.equal(data.slots[0].rainChance, null);
  assert.equal(data.slots[0].precipitation, null);
  assert.equal(data.slots[0].pm25, null);
  assert.equal(data.slots[0].crowd, null);
  assert.equal(data.current.wind, null);
  assert.equal(data.current.crowd, null);
  assert.equal(data.updatedAt, '2026-08-29T10:00:00+09:00');
  assert.equal(data.nowTime, decisionTime.toISOString());
});

test('non-numeric Seoul status text does not become numeric zero', () => {
  const data = normalizeSeoulCityData(seoulPayload({
    weather:{ PM25:'정보없음', PRECIPITATION:'정보없음', FCST24HOURS:{ FCST24HOURS:[{
      FCST_DT:'202608291900', TEMP:'정보없음', RAIN_CHANCE:'정보없음', PRECIPITATION:'정보없음'
    }] } }
  }), { referenceDate:new Date('2026-08-29T01:17:00Z') });
  assert.equal(data.current.pm25, null);
  assert.equal(data.current.precipitation, null);
  assert.equal(data.slots[0].temp, null);
  assert.equal(data.slots[0].rainChance, null);
  assert.equal(data.slots[0].precipitation, null);
});

test('partial KMA rows do not overwrite missing rain fields with zero', () => {
  const payload = { response:{ body:{ items:{ item:[
    { fcstDate:'20260829', fcstTime:'1900', category:'TMP', fcstValue:'25' }
  ]}}}};
  const rows = normalizeKmaForecast(payload);
  assert.equal(rows[0].rainChance, null);
  assert.equal(rows[0].precipitation, null);
  const [merged] = mergeKmaIntoSlots([{
    time:'2026-08-29T19:00:00+09:00', temp:28, rainChance:60, precipitation:0.4, wind:null,
    provenance:{ weather:'seoul_hourly_forecast', wind:'missing_until_kma' }
  }], rows);
  assert.equal(merged.temp, 25);
  assert.equal(merged.rainChance, 60);
  assert.equal(merged.precipitation, 0.4);
  assert.equal(merged.provenance.weather, 'mixed_hourly_forecast');
});

test('missing rain cannot produce a dry-weather reason or high confidence', () => {
  const verdict = makeProductVerdict({
    place,
    nowTime:'2026-08-29T12:00:00+09:00',
    slots:[{
      time:'2026-08-29T19:00:00+09:00', temp:24, rainChance:null, precipitation:null,
      wind:1, pm25:null, pm10:null, crowd:'여유', provenance:{ air:'missing' }
    }]
  });
  assert.equal(verdict.reasons.some((reason) => reason.icon === 'rain'), false);
  assert.notEqual(verdict.confidence, '높음');
  assert.match(verdict.confidenceDetail, /강수 예보/);
});

test('stale quality is disclosed in confidence', () => {
  const verdict = makeProductVerdict({
    place,
    quality:{ state:'stale', ageMinutes:31 },
    nowTime:'2026-08-29T12:00:00+09:00',
    slots:[{
      time:'2026-08-29T19:00:00+09:00', temp:24, rainChance:0, precipitation:0,
      wind:1, pm25:10, pm10:20, crowd:'여유', provenance:{ air:'current_observation' }
    }]
  });
  assert.notEqual(verdict.confidence, '높음');
  assert.match(verdict.confidenceDetail, /31분 지연/);
});

test('future-dated source timestamps are not marked fresh', () => {
  const quality = assessDataQuality(
    { mode:'live', updatedAt:'2026-08-29T13:00:00+09:00' },
    { now:new Date('2026-08-29T03:00:00Z') }
  );
  assert.equal(quality.state, 'unknown');
});

test('empty remaining horizon returns done instead of throwing', () => {
  const verdict = makeProductVerdict({
    place,
    nowTime:'2026-08-29T22:30:00+09:00',
    slots:[{ time:'2026-08-29T20:00:00+09:00', temp:24, rainChance:0, precipitation:0, wind:1, crowd:'여유' }]
  });
  assert.equal(verdict.status, 'done');
});

test('compressed next-day window retains tonight semantics', () => {
  const verdict = makeProductVerdict({
    place,
    nowTime:'2026-08-29T22:30:00+09:00',
    slots:[
      { time:'2026-08-29T23:00:00+09:00', temp:29, rainChance:30, precipitation:0, wind:3, crowd:'붐빔' },
      { time:'2026-08-30T01:00:00+09:00', temp:23, rainChance:0, precipitation:0, wind:1, crowd:'여유' }
    ]
  });
  assert.match(verdict.subhead, /오늘 밤의 답/);
});
