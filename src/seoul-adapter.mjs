function parseNum(v, fallback = null) {
  if (v == null || v === '') return fallback;
  const cleaned = String(v).replace(/[^0-9.+-]/g, '');
  if (!cleaned) return fallback;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function unwrap(section, key) {
  if (section == null) return null;
  // Seoul JSON/XML conversions are inconsistent across serializers: a section
  // may be an object, a one-item array, or repeat its own tag name one or
  // more times (e.g. WEATHER_STTS.WEATHER_STTS). Peel those wrappers
  // recursively so the rest of the adapter sees one stable object/list.
  if (Array.isArray(section)) {
    if (section.length === 0) return null;
    if (section.length === 1) return unwrap(section[0], key);
    return section.map((item) => unwrap(item, key)).flat().filter(Boolean);
  }
  if (typeof section === 'object' && section[key] != null) {
    return unwrap(section[key], key);
  }
  return section;
}

export function normalizeCrowd(v) {
  if (v == null || String(v).trim() === '') return null;
  const s = String(v);
  if (s.includes('여유')) return '여유';
  if (s.includes('약간')) return '약간 붐빔';
  if (s.includes('붐')) return '붐빔';
  if (s.includes('보통')) return '보통';
  return null;
}

export function toIsoSeoul(value, referenceDate = new Date()) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) {
    const normalized = s.replace(' ', 'T');
    const candidate = /[zZ]|[+-]\d\d:\d\d$/.test(normalized) ? normalized : `${normalized.length === 16 ? normalized + ':00' : normalized}+09:00`;
    return Number.isFinite(new Date(candidate).getTime()) ? candidate : null;
  }
  if (/^\d{12}$/.test(s)) {
    const candidate = `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:00+09:00`;
    return Number.isFinite(new Date(candidate).getTime()) ? candidate : null;
  }
  if (/^\d{8}\s?\d{4}$/.test(s)) {
    const x = s.replace(/\s/g, '');
    const candidate = `${x.slice(0,4)}-${x.slice(4,6)}-${x.slice(6,8)}T${x.slice(8,10)}:${x.slice(10,12)}:00+09:00`;
    return Number.isFinite(new Date(candidate).getTime()) ? candidate : null;
  }
  // SUNSET/SUNRISE may be HH:MM only. Anchor it to the current Seoul date.
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(referenceDate);
    const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const candidate = `${m.year}-${m.month}-${m.day}T${s.padStart(5,'0')}:00+09:00`;
    return Number.isFinite(new Date(candidate).getTime()) ? candidate : null;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function findCityRow(payload) {
  // Seoul XML converted to JSON commonly uses a literal dotted root key.
  const dotted = payload?.['SeoulRtd.citydata'];
  if (dotted?.CITYDATA) return Array.isArray(dotted.CITYDATA) ? dotted.CITYDATA[0] : dotted.CITYDATA;
  const candidates = [
    payload?.CITYDATA,
    payload?.citydata,
    payload?.SeoulRtd?.citydata,
    payload?.SeoulRtd?.CITYDATA
  ];
  for (const c of candidates) {
    if (!c) continue;
    if (Array.isArray(c)) return c[0];
    if (c.CITYDATA) return Array.isArray(c.CITYDATA) ? c.CITYDATA[0] : c.CITYDATA;
    return c;
  }
  return null;
}

function nearestPopulation(popForecast, weatherIso, referenceDate) {
  if (!weatherIso || !popForecast.length) return null;
  const target = new Date(weatherIso).getTime();
  let best = null;
  let delta = Infinity;
  for (const item of popForecast) {
    const iso = toIsoSeoul(item.FCST_TIME, referenceDate);
    if (!iso) continue;
    const d = Math.abs(new Date(iso).getTime() - target);
    if (d < delta) { delta = d; best = item; }
  }
  // Do not marry unrelated forecast points.
  return delta <= 45 * 60 * 1000 ? best : null;
}

export function normalizeSeoulCityData(payload, { referenceDate = new Date() } = {}) {
  const row = findCityRow(payload);
  if (!row) throw new Error('Seoul API response shape not recognized');

  const liveRaw = unwrap(row.LIVE_PPLTN_STTS, 'LIVE_PPLTN_STTS') || {};
  const weatherRaw = unwrap(row.WEATHER_STTS, 'WEATHER_STTS') || {};
  const live = Array.isArray(liveRaw) ? (liveRaw[0] || {}) : liveRaw;
  const weather = Array.isArray(weatherRaw) ? (weatherRaw[0] || {}) : weatherRaw;
  const popForecastRaw = unwrap(live.FCST_PPLTN, 'FCST_PPLTN') || [];
  const weatherForecastRaw = unwrap(weather.FCST24HOURS, 'FCST24HOURS') || [];
  const popForecast = asArray(popForecastRaw).filter(Boolean);
  const weatherForecast = asArray(weatherForecastRaw).filter(Boolean);
  const weatherObservedAt = toIsoSeoul(weather.WEATHER_TIME, referenceDate);
  const populationObservedAt = toIsoSeoul(live.PPLTN_TIME, referenceDate);
  const currentTime = weatherObservedAt || populationObservedAt;
  const sourceDateReference = currentTime ? new Date(currentTime) : referenceDate;

  const slots = weatherForecast.map((f) => {
    const time = toIsoSeoul(f.FCST_DT || f.FCST_TIME, referenceDate);
    const p = nearestPopulation(popForecast, time, referenceDate);
    const crowd = p ? normalizeCrowd(p.FCST_CONGEST_LVL) : null;
    const pm25 = parseNum(weather.PM25);
    const pm10 = parseNum(weather.PM10);
    const uv = parseNum(weather.UV_INDEX);
    return {
      time,
      temp: parseNum(f.TEMP),
      rainChance: parseNum(f.RAIN_CHANCE),
      precipitation: parseNum(f.PRECIPITATION),
      // Seoul citydata provides hourly temperature/rain, but wind/air/UV are current observations.
      // Do not pretend the current wind is an hourly forecast. KMA can fill wind later.
      wind: null,
      pm25,
      pm10,
      uv,
      crowd,
      eventImpact: 0,
      provenance: {
        weather: 'seoul_hourly_forecast',
        wind: 'missing_until_kma',
        air: Number.isFinite(pm25) || Number.isFinite(pm10) ? 'current_observation' : 'missing',
        airObservedAt: Number.isFinite(pm25) || Number.isFinite(pm10) ? weatherObservedAt : null,
        uv: Number.isFinite(uv) ? 'current_observation' : 'missing',
        crowd: crowd ? 'seoul_population_forecast' : 'unknown'
      }
    };
  }).filter((x) => x.time)
    .sort((a, b) => new Date(a.time) - new Date(b.time))
    .slice(0, 24);

  if (!slots.length) throw new Error('No 24h forecast slots in Seoul API response');
  const current = {
    time: currentTime,
    temp: parseNum(weather.TEMP),
    rainChance: null,
    precipitation: parseNum(weather.PRECIPITATION),
    wind: parseNum(weather.WIND_SPD),
    pm25: parseNum(weather.PM25),
    pm10: parseNum(weather.PM10),
    uv: parseNum(weather.UV_INDEX),
    crowd: normalizeCrowd(live.AREA_CONGEST_LVL),
    eventImpact: 0
  };
  return {
    updatedAt: currentTime,
    sourceMetadata:{
      seoul:{ weatherObservedAt, populationObservedAt }
    },
    // Recommendation horizons must use decision time, not a possibly delayed
    // observation timestamp from the upstream feed.
    nowTime: referenceDate.toISOString(),
    current,
    // A bare HH:MM belongs to the source observation's Seoul date, not the
    // server clock's date (important for replay and midnight-delayed feeds).
    sunset: toIsoSeoul(weather.SUNSET, sourceDateReference),
    slots
  };
}
