const KST_OFFSET = 9 * 60 * 60 * 1000;
const RELEASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];

export function latLonToKmaGrid(lat, lon) {
  const RE = 6371.00877, GRID = 5.0;
  const SLAT1 = 30.0, SLAT2 = 60.0, OLON = 126.0, OLAT = 38.0;
  const XO = 43, YO = 136, DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD, slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD, olat = OLAT * DEGRAD;
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;
  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5)
  };
}

function kstParts(date) {
  const shifted = new Date(date.getTime() + KST_OFFSET);
  return {
    year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes()
  };
}

function ymd({year, month, day}) {
  return `${year}${String(month).padStart(2,'0')}${String(day).padStart(2,'0')}`;
}

export function latestKmaBase(now = new Date()) {
  // KMA short-term forecasts are published 8x/day. Use a 15-minute safety lag.
  const safe = new Date(now.getTime() - 15 * 60 * 1000);
  const p = kstParts(safe);
  let hour = [...RELEASE_HOURS].reverse().find((h) => h <= p.hour);
  let baseDate = safe;
  if (hour == null) {
    hour = 23;
    baseDate = new Date(safe.getTime() - 24 * 60 * 60 * 1000);
  }
  return { base_date: ymd(kstParts(baseDate)), base_time: `${String(hour).padStart(2,'0')}00` };
}

function parseNumber(v) {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parsePcp(v) {
  if (v == null || String(v).trim() === '') return null;
  if (String(v).includes('강수없음')) return 0;
  const m = String(v).match(/[0-9.]+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

export function normalizeKmaForecast(payload) {
  const items = payload?.response?.body?.items?.item;
  if (!Array.isArray(items)) throw new Error('KMA response shape not recognized');
  const byTime = new Map();
  for (const item of items) {
    const key = `${item.fcstDate}${item.fcstTime}`;
    const row = byTime.get(key) || { key, fcstDate:item.fcstDate, fcstTime:item.fcstTime };
    row[item.category] = item.fcstValue;
    byTime.set(key, row);
  }
  return [...byTime.values()].sort((a,b) => a.key.localeCompare(b.key)).map((r) => ({
    time: `${r.fcstDate.slice(0,4)}-${r.fcstDate.slice(4,6)}-${r.fcstDate.slice(6,8)}T${r.fcstTime.slice(0,2)}:${r.fcstTime.slice(2,4)}:00+09:00`,
    temp: parseNumber(r.TMP),
    rainChance: parseNumber(r.POP),
    precipitation: parsePcp(r.PCP),
    wind: parseNumber(r.WSD),
    humidity: parseNumber(r.REH),
    precipType: parseNumber(r.PTY),
    sky: parseNumber(r.SKY)
  })).filter((r) => [r.temp, r.rainChance, r.precipitation, r.wind].some(Number.isFinite));
}

export async function fetchKmaForecast({ serviceKey, lat, lon, now = new Date() }) {
  const { nx, ny } = latLonToKmaGrid(lat, lon);
  const { base_date, base_time } = latestKmaBase(now);
  const url = new URL('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst');
  // data.go.kr displays both encoded and decoded key forms. URLSearchParams
  // performs encoding itself, so decode a displayed encoded key once to avoid
  // silently sending `%252B`/`%253D` and losing KMA data.
  let normalizedKey = serviceKey;
  try { normalizedKey = decodeURIComponent(serviceKey); } catch {}
  url.searchParams.set('serviceKey', normalizedKey);
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('numOfRows', '1000');
  url.searchParams.set('dataType', 'JSON');
  url.searchParams.set('base_date', base_date);
  url.searchParams.set('base_time', base_time);
  url.searchParams.set('nx', String(nx));
  url.searchParams.set('ny', String(ny));
  const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`KMA HTTP ${response.status}`);
  const payload = await response.json();
  const resultCode = payload?.response?.header?.resultCode;
  if (resultCode && resultCode !== '00') throw new Error(`KMA ${resultCode}: ${payload?.response?.header?.resultMsg || 'error'}`);
  return normalizeKmaForecast(payload);
}

export function mergeKmaIntoSlots(slots, kma) {
  return slots.map((slot) => {
    const target = new Date(slot.time).getTime();
    let best = null, delta = Infinity;
    for (const k of kma) {
      const d = Math.abs(new Date(k.time).getTime() - target);
      if (d < delta) { delta = d; best = k; }
    }
    if (!best || delta > 31 * 60 * 1000) return slot;
    const hasTemp = Number.isFinite(best.temp);
    const hasRainChance = Number.isFinite(best.rainChance);
    const hasPrecipitation = Number.isFinite(best.precipitation);
    const hasWind = Number.isFinite(best.wind);
    const weatherFields = [hasTemp, hasRainChance, hasPrecipitation];
    const hasWeather = weatherFields.some(Boolean);
    const hasCompleteWeather = weatherFields.every(Boolean);
    return {
      ...slot,
      temp: hasTemp ? best.temp : slot.temp,
      rainChance: hasRainChance ? best.rainChance : slot.rainChance,
      precipitation: hasPrecipitation ? best.precipitation : slot.precipitation,
      wind: hasWind ? best.wind : slot.wind,
      provenance: {
        ...(slot.provenance || {}),
        weather: hasCompleteWeather
          ? 'kma_hourly_forecast'
          : hasWeather ? 'mixed_hourly_forecast' : (slot.provenance?.weather || 'missing'),
        temp: hasTemp ? 'kma_hourly_forecast' : (slot.provenance?.temp || slot.provenance?.weather || 'missing'),
        rain: hasRainChance ? 'kma_hourly_forecast' : (slot.provenance?.rain || slot.provenance?.weather || 'missing'),
        precipitation: hasPrecipitation ? 'kma_hourly_forecast' : (slot.provenance?.precipitation || slot.provenance?.weather || 'missing'),
        wind: hasWind ? 'kma_hourly_forecast' : (slot.provenance?.wind || 'missing')
      },
      weatherSource: hasWeather || hasWind ? 'KMA' : slot.weatherSource
    };
  });
}
