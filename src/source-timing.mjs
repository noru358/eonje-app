function timestampDiagnostic(timestamp, now) {
  if (!timestamp) return { timestamp:null, ageMinutes:null };
  const ms = new Date(timestamp).getTime();
  if (!Number.isFinite(ms)) return { timestamp:String(timestamp), ageMinutes:null };
  return {
    timestamp:new Date(ms).toISOString(),
    ageMinutes:Math.round((now.getTime() - ms) / 60000)
  };
}

export function kmaBaseToIso(base) {
  const date = String(base?.base_date || '');
  const time = String(base?.base_time || '');
  if (!/^\d{8}$/.test(date) || !/^\d{4}$/.test(time)) return null;
  const year = date.slice(0, 4);
  const month = date.slice(4, 6);
  const day = date.slice(6, 8);
  const hour = time.slice(0, 2);
  const minute = time.slice(2, 4);
  const iso = `${year}-${month}-${day}T${hour}:${minute}:00+09:00`;
  return Number.isFinite(new Date(iso).getTime()) ? iso : null;
}

export function assessSourceTiming(data, { now = new Date() } = {}) {
  const seoul = data?.sourceMetadata?.seoul || {};
  const kma = data?.sourceMetadata?.kma || {};
  const aq = data?.sourceMetadata?.aqShadow || data?.aqShadow?.metadata || {};

  return {
    seoulWeather:timestampDiagnostic(seoul.weatherObservedAt || data?.updatedAt, now),
    seoulPopulation:timestampDiagnostic(seoul.populationObservedAt, now),
    kmaBase:timestampDiagnostic(kmaBaseToIso(kma.selectedBase), now),
    kmaRetrieved:null,
    aqShadow:timestampDiagnostic(aq.retrievedAt, now)
  };
}
