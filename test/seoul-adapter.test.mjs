import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSeoulCityData } from '../src/seoul-adapter.mjs';

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
