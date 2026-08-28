import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSeoulCityData, toIsoSeoul } from '../src/seoul-adapter.mjs';

const fixture = {
  'SeoulRtd.citydata': {
    CITYDATA: {
      AREA_NM: '여의도한강공원',
      LIVE_PPLTN_STTS: {
        LIVE_PPLTN_STTS: {
          AREA_CONGEST_LVL: '약간 붐빔',
          PPLTN_TIME: '2026-08-28 18:00',
          FCST_PPLTN: {
            FCST_PPLTN: [
              { FCST_TIME:'2026-08-28 19:00', FCST_CONGEST_LVL:'보통' },
              { FCST_TIME:'2026-08-28 20:00', FCST_CONGEST_LVL:'여유' }
            ]
          }
        }
      },
      WEATHER_STTS: {
        WEATHER_STTS: {
          TEMP:'28', WIND_SPD:'2.5', PM25:'21', PM10:'39', UV_INDEX:'1', SUNSET:'19:07', WEATHER_TIME:'2026-08-28 18:00',
          FCST24HOURS: {
            FCST24HOURS: [
              { FCST_DT:'202608281900', TEMP:'26', PRECIPITATION:'0', RAIN_CHANCE:'20' },
              { FCST_DT:'202608282000', TEMP:'25', PRECIPITATION:'0', RAIN_CHANCE:'30' }
            ]
          }
        }
      }
    }
  }
};

test('normalizes dotted Seoul root and nested repeated tags', () => {
  const r = normalizeSeoulCityData(fixture, { referenceDate:new Date('2026-08-28T09:00:00Z') });
  assert.equal(r.slots.length, 2);
  assert.equal(r.slots[0].crowd, '보통');
  assert.equal(r.slots[1].crowd, '여유');
  assert.equal(r.slots[0].rainChance, 20);
  assert.match(r.sunset, /19:07/);
});

test('normalizes Seoul JSON arrays around city/weather/population sections', () => {
  const arrayFixture = {
    'SeoulRtd.citydata': {
      CITYDATA: [{
        AREA_NM: '여의도한강공원',
        LIVE_PPLTN_STTS: [{
          AREA_CONGEST_LVL: '약간 붐빔',
          PPLTN_TIME: '2026-08-28 18:00',
          FCST_PPLTN: [{ FCST_TIME:'2026-08-28 19:00', FCST_CONGEST_LVL:'보통' }]
        }],
        WEATHER_STTS: [{
          TEMP:'28', WIND_SPD:'2.5', PM25:'21', PM10:'39', UV_INDEX:'1', SUNSET:'19:07', WEATHER_TIME:'2026-08-28 18:00',
          FCST24HOURS: [
            { FCST_DT:'202608281900', TEMP:'26', PRECIPITATION:'0', RAIN_CHANCE:'20' },
            { FCST_DT:'202608282000', TEMP:'25', PRECIPITATION:'0', RAIN_CHANCE:'30' }
          ]
        }]
      }]
    }
  };
  const r = normalizeSeoulCityData(arrayFixture, { referenceDate:new Date('2026-08-28T09:00:00Z') });
  assert.equal(r.slots.length, 2);
  assert.equal(r.slots[0].crowd, '보통');
  assert.equal(r.slots[0].temp, 26);
  assert.equal(r.slots[0].rainChance, 20);
});

test('normalizes repeated wrappers even when wrapped by arrays', () => {
  const mixedFixture = structuredClone(fixture);
  const row = mixedFixture['SeoulRtd.citydata'].CITYDATA;
  row.LIVE_PPLTN_STTS = [row.LIVE_PPLTN_STTS];
  row.WEATHER_STTS = [row.WEATHER_STTS];
  row.WEATHER_STTS[0].WEATHER_STTS.FCST24HOURS = [row.WEATHER_STTS[0].WEATHER_STTS.FCST24HOURS];
  const r = normalizeSeoulCityData(mixedFixture, { referenceDate:new Date('2026-08-28T09:00:00Z') });
  assert.equal(r.slots.length, 2);
});

test('sorts forecast rows before truncating the 24-hour horizon', () => {
  const unordered = structuredClone(fixture);
  const forecast = unordered['SeoulRtd.citydata'].CITYDATA.WEATHER_STTS.WEATHER_STTS.FCST24HOURS.FCST24HOURS;
  forecast.unshift({ FCST_DT:'202608282100', TEMP:'24', PRECIPITATION:'0', RAIN_CHANCE:'10' });
  forecast.reverse();
  const r = normalizeSeoulCityData(unordered, { referenceDate:new Date('2026-08-28T09:00:00Z') });
  assert.deepEqual(r.slots.map((slot) => slot.time), [
    '2026-08-28T19:00:00+09:00', '2026-08-28T20:00:00+09:00', '2026-08-28T21:00:00+09:00'
  ]);
});

test('rejects impossible source timestamps', () => {
  assert.equal(toIsoSeoul('2026-99-99 25:61'), null);
  assert.equal(toIsoSeoul('202699992561'), null);
  assert.equal(toIsoSeoul('99:99', new Date('2026-08-28T09:00:00Z')), null);
});
