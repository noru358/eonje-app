const HOUR_MS = 3_600_000;

export const CROWD_ORDINAL = Object.freeze({
  '여유':0,
  '보통':1,
  '약간 붐빔':2,
  '붐빔':3
});

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function localHourKey(value) {
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / HOUR_MS);
}

function placeId(record) {
  return record?.place?.id || record?.place || null;
}

export function pairAqForecasts(records) {
  const observations = [];
  for (const record of records) {
    const place = placeId(record);
    const observedAt = record?.current?.time || record?.sourceMetadata?.seoul?.weatherObservedAt;
    const hour = localHourKey(observedAt);
    if (!place || hour == null) continue;
    if (!finite(record?.current?.pm25) && !finite(record?.current?.pm10)) continue;
    observations.push({
      place,
      hour,
      observedAt,
      pm25:finite(record.current.pm25) ? record.current.pm25 : null,
      pm10:finite(record.current.pm10) ? record.current.pm10 : null
    });
  }

  const pairs = [];
  for (const record of records) {
    const place = placeId(record);
    const retrievedAt = record?.aqShadow?.metadata?.retrievedAt || record?.sourceMetadata?.aqShadow?.retrievedAt;
    const retrievedMs = new Date(retrievedAt).getTime();
    if (!place || !Number.isFinite(retrievedMs) || !Array.isArray(record?.aqShadow?.rows)) continue;
    for (const forecast of record.aqShadow.rows) {
      const targetMs = new Date(forecast.time).getTime();
      const targetHour = localHourKey(forecast.time);
      if (!Number.isFinite(targetMs) || targetHour == null || targetMs <= retrievedMs) continue;
      const observation = observations.find((item) => item.place === place && item.hour === targetHour);
      if (!observation) continue;
      pairs.push({
        place,
        retrievedAt,
        targetTime:forecast.time,
        observedAt:observation.observedAt,
        leadHours:Math.round((targetMs - retrievedMs) / HOUR_MS),
        forecastPm25:finite(forecast.pm25) ? forecast.pm25 : null,
        observedPm25:observation.pm25,
        forecastPm10:finite(forecast.pm10) ? forecast.pm10 : null,
        observedPm10:observation.pm10
      });
    }
  }
  return pairs;
}

export function pairCrowdForecasts(records) {
  const observations = [];
  for (const record of records) {
    const place = placeId(record);
    const observedAt = record?.sourceMetadata?.seoul?.populationObservedAt || record?.current?.time;
    const hour = localHourKey(observedAt);
    const crowd = record?.current?.crowd;
    if (!place || hour == null || CROWD_ORDINAL[crowd] == null) continue;
    observations.push({ place, hour, observedAt, crowd });
  }

  const pairs = [];
  for (const record of records) {
    const place = placeId(record);
    const issuedAt = record?.sourceMetadata?.seoul?.populationObservedAt || record?.capturedAt;
    const issuedMs = new Date(issuedAt).getTime();
    if (!place || !Number.isFinite(issuedMs) || !Array.isArray(record?.slots)) continue;
    for (const slot of record.slots) {
      if (slot?.provenance?.crowd !== 'seoul_population_forecast') continue;
      if (CROWD_ORDINAL[slot.crowd] == null) continue;
      const targetMs = new Date(slot.time).getTime();
      const targetHour = localHourKey(slot.time);
      if (!Number.isFinite(targetMs) || targetHour == null || targetMs <= issuedMs) continue;
      const observation = observations.find((item) => item.place === place && item.hour === targetHour);
      if (!observation) continue;
      const forecastOrdinal = CROWD_ORDINAL[slot.crowd];
      const observedOrdinal = CROWD_ORDINAL[observation.crowd];
      pairs.push({
        place,
        issuedAt,
        targetTime:slot.time,
        observedAt:observation.observedAt,
        leadHours:Math.round((targetMs - issuedMs) / HOUR_MS),
        forecast:slot.crowd,
        observed:observation.crowd,
        ordinalError:forecastOrdinal - observedOrdinal,
        absoluteOrdinalError:Math.abs(forecastOrdinal - observedOrdinal),
        exact:slot.crowd === observation.crowd
      });
    }
  }
  return pairs;
}

function numericMetrics(rows, forecastKey, observedKey) {
  const valid = rows.filter((row) => finite(row[forecastKey]) && finite(row[observedKey]));
  if (!valid.length) return { count:0, mae:null, bias:null, rmse:null };
  const errors = valid.map((row) => row[forecastKey] - row[observedKey]);
  const count = errors.length;
  const mae = errors.reduce((sum, error) => sum + Math.abs(error), 0) / count;
  const bias = errors.reduce((sum, error) => sum + error, 0) / count;
  const rmse = Math.sqrt(errors.reduce((sum, error) => sum + error * error, 0) / count);
  return { count, mae, bias, rmse };
}

function bucketLead(leadHours) {
  if (leadHours <= 3) return '1-3h';
  if (leadHours <= 6) return '4-6h';
  if (leadHours <= 12) return '7-12h';
  if (leadHours <= 24) return '13-24h';
  return '25h+';
}

export function summarizeAqPairs(pairs) {
  const buckets = {};
  for (const pair of pairs) {
    const key = bucketLead(pair.leadHours);
    (buckets[key] ||= []).push(pair);
  }
  return Object.fromEntries(Object.entries(buckets).map(([key, rows]) => [key, {
    pm25:numericMetrics(rows, 'forecastPm25', 'observedPm25'),
    pm10:numericMetrics(rows, 'forecastPm10', 'observedPm10')
  }]));
}

export function summarizeCrowdPairs(pairs) {
  const buckets = {};
  for (const pair of pairs) {
    const key = bucketLead(pair.leadHours);
    (buckets[key] ||= []).push(pair);
  }
  return Object.fromEntries(Object.entries(buckets).map(([key, rows]) => {
    const count = rows.length;
    return [key, {
      count,
      exactAccuracy:count ? rows.filter((row) => row.exact).length / count : null,
      meanAbsoluteOrdinalError:count ? rows.reduce((sum, row) => sum + row.absoluteOrdinalError, 0) / count : null,
      bias:count ? rows.reduce((sum, row) => sum + row.ordinalError, 0) / count : null
    }];
  }));
}
