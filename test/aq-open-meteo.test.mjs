import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOpenMeteoAirQuality, fetchOpenMeteoAirQuality } from '../src/aq-open-meteo.mjs';

test('normalizes Open-Meteo hourly PM rows into KST timestamps', () => {
  const result = normalizeOpenMeteoAirQuality({
    latitude:37.5,
    longitude:126.9,
    timezone:'Asia/Seoul',
    utc_offset_seconds:32400,
    hourly:{
      time:['2026-09-01T21:00','2026-09-01T22:00'],
      pm2_5:[12.4, null],
      pm10:[20.1, 25.2]
    }
  }, { retrievedAt:'2026-09-01T12:00:00.000Z' });

  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows[0], {
    time:'2026-09-01T21:00:00+09:00',
    pm25:12.4,
    pm10:20.1
  });
  assert.equal(result.rows[1].pm25, null);
  assert.equal(result.metadata.provider, 'open_meteo_cams');
  assert.equal(result.metadata.rowCount, 2);
});

test('fetcher requests shadow-only PM forecast without requiring an API key', async () => {
  let requestedUrl;
  const fetchImpl = async (url) => {
    requestedUrl = new URL(url);
    return {
      ok:true,
      async json() {
        return {
          latitude:37.5,
          longitude:126.9,
          timezone:'Asia/Seoul',
          utc_offset_seconds:32400,
          hourly:{ time:['2026-09-01T21:00'], pm2_5:[11], pm10:[18] }
        };
      }
    };
  };

  const result = await fetchOpenMeteoAirQuality({
    lat:37.5,
    lon:126.9,
    forecastHours:24,
    fetchImpl,
    now:new Date('2026-09-01T12:00:00Z')
  });

  assert.equal(requestedUrl.hostname, 'air-quality-api.open-meteo.com');
  assert.equal(requestedUrl.searchParams.get('hourly'), 'pm2_5,pm10');
  assert.equal(requestedUrl.searchParams.get('forecast_hours'), '24');
  assert.equal(requestedUrl.searchParams.get('timezone'), 'Asia/Seoul');
  assert.equal(result.metadata.forecastHours, 24);
  assert.equal(result.rows[0].pm25, 11);
});
