import http from 'node:http';
import { appendFile, mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLACES } from './src/places.mjs';
import { mockCityData } from './src/mock-data.mjs';
import { normalizeSeoulCityData } from './src/seoul-adapter.mjs';
import { parseSeoulXml } from './src/seoul-xml.mjs';
import { fetchKmaForecast, mergeKmaIntoSlots } from './src/kma-adapter.mjs';
import { makeProductVerdict } from './src/product-verdict.mjs';
import { assessDataQuality } from './src/data-quality.mjs';
import { loadEnvFile } from './src/env.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
loadEnvFile(join(ROOT, '.env'));
const PORT = Number(process.env.PORT || 4173);
const SEOUL_API_KEY = process.env.SEOUL_API_KEY || '';
const DATA_GO_KR_API_KEY = process.env.DATA_GO_KR_API_KEY || '';
const STORE_SNAPSHOTS = process.env.STORE_SNAPSHOTS === '1';
const SNAPSHOT_DIR = process.env.SNAPSHOT_DIR || join(ROOT, 'data', 'snapshots');

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml'
};

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
};

function json(res, status, body) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

const liveCache = new Map();
const snapshotBuckets = new Set();

function seoulDate(iso = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul'
  }).format(iso);
}

async function persistSnapshot(place, data) {
  if (!STORE_SNAPSHOTS || data.mode !== 'live') return;
  const bucket = Math.floor(Date.now() / 300_000);
  const dedupeKey = `${place.id}:${bucket}`;
  if (snapshotBuckets.has(dedupeKey)) return;

  await mkdir(SNAPSHOT_DIR, { recursive: true });
  const file = join(SNAPSHOT_DIR, `${seoulDate()}.jsonl`);
  const record = {
    capturedAt: new Date().toISOString(),
    place: { id: place.id, name: place.name },
    source: data.source,
    updatedAt: data.updatedAt,
    nowTime: data.nowTime,
    sunset: data.sunset,
    current: data.current ?? null,
    slots: data.slots
  };
  await appendFile(file, `${JSON.stringify(record)}\n`, 'utf8');
  snapshotBuckets.add(dedupeKey);
  if (snapshotBuckets.size > 2000) snapshotBuckets.clear();
}

async function fetchReal(place) {
  const cached = liveCache.get(place.id);
  if (cached && Date.now() - cached.at < 60_000) return cached.data;

  const area = encodeURIComponent(place.name);
  const url = `http://openapi.seoul.go.kr:8088/${SEOUL_API_KEY}/xml/citydata/1/5/${area}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Seoul API HTTP ${response.status}`);
  const xml = await response.text();
  const payload = parseSeoulXml(xml);
  let normalized = normalizeSeoulCityData(payload);
  let weatherSource = '서울특별시 실시간 도시데이터';
  if (DATA_GO_KR_API_KEY) {
    try {
      const kma = await fetchKmaForecast({ serviceKey: DATA_GO_KR_API_KEY, lat: place.lat, lon: place.lon });
      normalized = { ...normalized, slots: mergeKmaIntoSlots(normalized.slots, kma) };
      weatherSource = '기상청 단기예보 + 서울특별시 실시간 도시데이터';
    } catch (error) {
      normalized = { ...normalized, kmaError: error.message };
    }
  }
  let data = { ...normalized, mode: 'live', source: weatherSource };
  try {
    await persistSnapshot(place, data);
  } catch (error) {
    console.error(`Snapshot persistence failed for ${place.id}:`, error);
    data = { ...data, snapshotError:error.message };
  }
  liveCache.set(place.id, { at: Date.now(), data });
  return data;
}

async function getCityData(place) {
  if (!SEOUL_API_KEY) return { ...mockCityData(place.id, new Date()), source: 'DEMO — 서울시 API 키 연결 전' };
  try {
    return await fetchReal(place);
  } catch (error) {
    return { ...mockCityData(place.id, new Date()), source: 'DEMO fallback', liveError: error.message };
  }
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health') return json(res, 200, {
    ok:true, version:'0.6.2', integrations:{ seoul:Boolean(SEOUL_API_KEY), kma:Boolean(DATA_GO_KR_API_KEY) }, snapshots:STORE_SNAPSHOTS
  });
  if (url.pathname === '/api/places') return json(res, 200, PLACES);
  if (url.pathname === '/api/city' || url.pathname === '/api/verdict') {
    const id = url.searchParams.get('place') || 'yeouido';
    const place = PLACES.find((p) => p.id === id);
    if (!place) return json(res, 400, { error:'invalid_place', message:`지원하지 않는 장소: ${id}` });
    const data = await getCityData(place);
    const quality = assessDataQuality(data);
    if (url.pathname === '/api/city') return json(res, 200, { ...data, quality });

    const intent = url.searchParams.get('intent') || 'general';
    const verdict = makeProductVerdict({
      place, slots: data.slots, sunset: data.sunset, nowTime: data.nowTime, current: data.current, intent, quality
    });
    return json(res, 200, {
      place,
      data: {
        mode: data.mode, source: data.source, updatedAt: data.updatedAt, nowTime: data.nowTime,
        liveError: data.liveError || null, kmaError: data.kmaError || null,
        quality
      },
      verdict
    });
  }
  return false;
}

async function serveStatic(req, res, pathname) {
  let p = pathname === '/' ? '/index.html' : pathname;
  p = normalize(p).replace(/^(\.\.[/\\])+/, '');
  const file = join(PUBLIC, p);
  if (!file.startsWith(PUBLIC)) return false;
  try {
    const st = await stat(file);
    if (!st.isFile()) return false;
    const body = await readFile(file);
    const cacheControl = extname(file) === '.html' ? 'no-cache' : 'public, max-age=300';
    res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': cacheControl });
    res.end(body);
    return true;
  } catch { return false; }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/module/')) {
      const modPath = url.pathname.replace('/module/', '');
      const file = join(ROOT, 'src', modPath);
      try { const body = await readFile(file); res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': 'text/javascript; charset=utf-8', 'cache-control':'public, max-age=300' }); res.end(body); return; } catch {}
    }
    if (url.pathname.startsWith('/api/')) {
      const handled = await handleApi(req, res, url);
      if (handled !== false) return;
    }
    if (await serveStatic(req, res, url.pathname)) return;
    res.writeHead(404, SECURITY_HEADERS); res.end('Not found');
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, 500, { error:'internal_error', message:'데이터를 처리하지 못했다.' });
    else res.end();
  }
});

function listenWithFallback(port = PORT, attempt = 0) {
  const maxAttempts = 10;
  const onListening = () => {
    server.removeListener('error', onError);
    console.log(`언제 v0.6.2 → http://localhost:${port}`);
  };
  const onError = (error) => {
    if (error?.code === 'EADDRINUSE' && attempt < maxAttempts) {
      server.removeListener('listening', onListening);
      const nextPort = port + 1;
      console.warn(`포트 ${port} 사용 중 → ${nextPort}로 재시도`);
      setTimeout(() => listenWithFallback(nextPort, attempt + 1), 0);
      return;
    }
    throw error;
  };
  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(port);
}

listenWithFallback();
