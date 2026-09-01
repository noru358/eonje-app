const KST_SUFFIX = '+09:00';

function finiteOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeOpenMeteoAirQuality(payload, { retrievedAt = new Date().toISOString() } = {}) {
  const times = payload?.hourly?.time;
  const pm25 = payload?.hourly?.pm2_5;
  const pm10 = payload?.hourly?.pm10;
  if (!Array.isArray(times) || !Array.isArray(pm25) || !Array.isArray(pm10)) {
    throw new Error('Open-Meteo AQ response shape not recognized');
  }

  const rows = times.map((time, index) => ({
    time: /(?:Z|[+-]\d\d:\d\d)$/.test(String(time)) ? String(time) : `${time}:00${KST_SUFFIX}`,
    pm25:finiteOrNull(pm25[index]),
    pm10:finiteOrNull(pm10[index])
  })).filter((row) => Number.isFinite(row.pm25) || Number.isFinite(row.pm10));

  return {
    rows,
    metadata:{
      provider:'open_meteo_cams',
      retrievedAt,
      timezone:payload?.timezone || 'Asia/Seoul',
      utcOffsetSeconds:Number.isFinite(Number(payload?.utc_offset_seconds)) ? Number(payload.utc_offset_seconds) : null,
      latitude:finiteOrNull(payload?.latitude),
      longitude:finiteOrNull(payload?.longitude),
      rowCount:rows.length
    }
  };
}

export async function fetchOpenMeteoAirQuality({ lat, lon, forecastHours = 48, fetchImpl = fetch, now = new Date() }) {
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('hourly', 'pm2_5,pm10');
  url.searchParams.set('forecast_hours', String(forecastHours));
  url.searchParams.set('timezone', 'Asia/Seoul');
  url.searchParams.set('cell_selection', 'nearest');

  const response = await fetchImpl(url, { signal:AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Open-Meteo AQ HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.error) throw new Error(`Open-Meteo AQ: ${payload.reason || 'error'}`);
  const normalized = normalizeOpenMeteoAirQuality(payload, { retrievedAt:now.toISOString() });
  return {
    ...normalized,
    metadata:{ ...normalized.metadata, forecastHours }
  };
}
