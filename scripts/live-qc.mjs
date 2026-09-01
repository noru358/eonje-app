import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE_URL = (process.env.EONJE_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const ALLOW_DEMO = process.argv.includes('--allow-demo');
const outputArgIndex = process.argv.indexOf('--output');
const OUTPUT_PATH = outputArgIndex >= 0 ? process.argv[outputArgIndex + 1] : null;
if (outputArgIndex >= 0 && !OUTPUT_PATH) throw new Error('--output requires a file path');

async function getJson(path) {
  // Six-park QC intentionally bounds KMA upstream concurrency. Later requests
  // may spend time queued before their own bounded retry window begins, so the
  // client timeout must cover queue time as well as network time.
  const response = await fetch(`${BASE_URL}${path}`, { signal:AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json();
}

function countKnown(slots, key) {
  return slots.filter((slot) => slot[key] != null && (typeof slot[key] !== 'number' || Number.isFinite(slot[key]))).length;
}

function horizonHours(slots) {
  if (slots.length < 2) return 0;
  return Math.round((new Date(slots.at(-1).time) - new Date(slots[0].time)) / 3_600_000);
}

function isKmaField(slot, key) {
  const provenance = slot?.provenance || {};
  if (key === 'temp') return provenance.temp === 'kma_hourly_forecast';
  if (key === 'rainChance') return provenance.rain === 'kma_hourly_forecast';
  if (key === 'precipitation') return provenance.precipitation === 'kma_hourly_forecast';
  if (key === 'wind') return provenance.wind === 'kma_hourly_forecast';
  return false;
}

function kmaCoverage(slots, nowTime) {
  const now = Number.isFinite(new Date(nowTime).getTime()) ? new Date(nowTime).getTime() : Date.now();
  const actionable = slots.filter((slot) => new Date(slot.time).getTime() > now);
  return {
    actionable: actionable.length,
    temp: actionable.filter((slot) => isKmaField(slot, 'temp')).length,
    rainChance: actionable.filter((slot) => isKmaField(slot, 'rainChance')).length,
    precipitation: actionable.filter((slot) => isKmaField(slot, 'precipitation')).length,
    wind: actionable.filter((slot) => isKmaField(slot, 'wind')).length
  };
}

const health = await getJson('/api/health');
const places = await getJson('/api/places');
const rows = await Promise.all(places.map(async (place) => {
  const city = await getJson(`/api/city?place=${encodeURIComponent(place.id)}`);
  const result = await getJson(`/api/verdict?place=${encodeURIComponent(place.id)}`);
  const slots = city.slots || [];
  const verdict = result.verdict || {};
  const issues = [];
  const coverage = kmaCoverage(slots, city.nowTime);
  const kma = city.sourceMetadata?.kma;
  const aqShadow = city.sourceMetadata?.aqShadow;

  if (city.mode !== 'live') issues.push(`mode=${city.mode || 'missing'}`);
  if (city.quality?.state !== 'fresh') issues.push(`quality=${city.quality?.state || 'missing'}`);
  if (slots.length < 12) issues.push(`short_horizon=${slots.length}`);
  if (!verdict.best && verdict.status === 'go') issues.push('go_without_best');
  if (verdict.end && !String(verdict.end).endsWith('+09:00')) issues.push('end_not_kst');

  if (health.integrations?.kma) {
    if (city.kmaError) issues.push(`kma_error=${city.kmaError}`);
    if (!kma) issues.push('kma_metadata_missing');
    if (kma?.truncated) issues.push(`kma_truncated=${kma.receivedItems}/${kma.totalCount}`);
    if (kma && !(kma.mergedSlotCount > 0)) issues.push('kma_no_merge');
    if (coverage.actionable > 0) {
      for (const key of ['temp', 'rainChance', 'precipitation', 'wind']) {
        if (coverage[key] < coverage.actionable) issues.push(`kma_${key}_coverage=${coverage[key]}/${coverage.actionable}`);
      }
    }
  }

  if (health.integrations?.aqShadow) {
    if (city.aqShadowError) issues.push(`aq_shadow_error=${city.aqShadowError}`);
    if (!aqShadow) issues.push('aq_shadow_metadata_missing');
    if (aqShadow && aqShadow.provider !== 'open_meteo_cams') issues.push(`aq_shadow_provider=${aqShadow.provider || 'missing'}`);
    if (aqShadow && !(aqShadow.rowCount >= 24)) issues.push(`aq_shadow_short=${aqShadow.rowCount || 0}`);
  }

  return {
    place:place.id,
    mode:city.mode,
    quality:city.quality?.state,
    ageMinutes:city.quality?.ageMinutes,
    sourceTiming:city.quality?.sourceTiming || null,
    slots:slots.length,
    horizonHours:horizonHours(slots),
    known:{
      temp:countKnown(slots, 'temp'),
      rainChance:countKnown(slots, 'rainChance'),
      precipitation:countKnown(slots, 'precipitation'),
      wind:countKnown(slots, 'wind'),
      crowd:countKnown(slots, 'crowd')
    },
    kmaCoverage:coverage,
    kmaError:city.kmaError || null,
    aqShadowError:city.aqShadowError || null,
    verdict:{
      status:verdict.status,
      windowLabel:verdict.windowLabel || null,
      end:verdict.end || null,
      reasons:(verdict.reasons || []).map((reason) => reason.title),
      confidence:verdict.confidence || null,
      confidenceDetail:verdict.confidenceDetail || null,
      bestProvenance:verdict.best?.provenance || null
    },
    sourceMetadata:city.sourceMetadata || null,
    issues
  };
}));

const report = { checkedAt:new Date().toISOString(), baseUrl:BASE_URL, health, parks:rows };
const reportJson = `${JSON.stringify(report, null, 2)}\n`;
if (OUTPUT_PATH) await writeFile(resolve(OUTPUT_PATH), reportJson, 'utf8');
console.log(reportJson.trimEnd());

const integrationMissing = !health.integrations?.seoul || !health.integrations?.kma;
const rowIssues = rows.flatMap((row) => row.issues.map((issue) => `${row.place}:${issue}`));
if (!ALLOW_DEMO && (integrationMissing || rowIssues.length)) {
  console.error(`Live QC failed: ${[
    integrationMissing ? 'required integrations are not both connected' : null,
    ...rowIssues
  ].filter(Boolean).join(', ')}`);
  process.exitCode = 1;
}
