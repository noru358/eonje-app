const BASE_URL = (process.env.EONJE_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const ALLOW_DEMO = process.argv.includes('--allow-demo');

async function getJson(path) {
  const response = await fetch(`${BASE_URL}${path}`, { signal:AbortSignal.timeout(20_000) });
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

const health = await getJson('/api/health');
const places = await getJson('/api/places');
const rows = await Promise.all(places.map(async (place) => {
  const city = await getJson(`/api/city?place=${encodeURIComponent(place.id)}`);
  const result = await getJson(`/api/verdict?place=${encodeURIComponent(place.id)}`);
  const slots = city.slots || [];
  const verdict = result.verdict || {};
  const issues = [];
  if (city.mode !== 'live') issues.push(`mode=${city.mode || 'missing'}`);
  if (city.quality?.state !== 'fresh') issues.push(`quality=${city.quality?.state || 'missing'}`);
  if (slots.length < 12) issues.push(`short_horizon=${slots.length}`);
  if (!verdict.best && verdict.status === 'go') issues.push('go_without_best');
  if (verdict.end && !String(verdict.end).endsWith('+09:00')) issues.push('end_not_kst');
  return {
    place:place.id,
    mode:city.mode,
    quality:city.quality?.state,
    ageMinutes:city.quality?.ageMinutes,
    slots:slots.length,
    horizonHours:horizonHours(slots),
    known:{
      temp:countKnown(slots, 'temp'),
      rainChance:countKnown(slots, 'rainChance'),
      precipitation:countKnown(slots, 'precipitation'),
      wind:countKnown(slots, 'wind'),
      crowd:countKnown(slots, 'crowd')
    },
    verdict:{
      status:verdict.status,
      windowLabel:verdict.windowLabel || null,
      end:verdict.end || null,
      reasons:(verdict.reasons || []).map((reason) => reason.title),
      confidence:verdict.confidence || null,
      confidenceDetail:verdict.confidenceDetail || null,
      bestProvenance:verdict.best?.provenance || null
    },
    issues
  };
}));

console.log(JSON.stringify({ checkedAt:new Date().toISOString(), baseUrl:BASE_URL, health, parks:rows }, null, 2));

const integrationMissing = !health.integrations?.seoul || !health.integrations?.kma;
const rowIssues = rows.flatMap((row) => row.issues.map((issue) => `${row.place}:${issue}`));
if (!ALLOW_DEMO && (integrationMissing || rowIssues.length)) {
  console.error(`Live QC failed: ${[
    integrationMissing ? 'required integrations are not both connected' : null,
    ...rowIssues
  ].filter(Boolean).join(', ')}`);
  process.exitCode = 1;
}
