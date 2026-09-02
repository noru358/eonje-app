import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const home = await readFile(new URL('../public/home-v2.js', import.meta.url), 'utf8');
const homeCss = await readFile(new URL('../public/home-v4.css', import.meta.url), 'utf8');
const mapHtml = await readFile(new URL('../public/map.html', import.meta.url), 'utf8');
const mapJs = await readFile(new URL('../public/map.js', import.meta.url), 'utf8');
const mapCss = await readFile(new URL('../public/map-v4.css', import.meta.url), 'utf8');
const assetFetch = await readFile(new URL('../scripts/fetch-design-assets.mjs', import.meta.url), 'utf8');
const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('first screen keeps verdict before raw data', () => {
  assert.match(html, /id="headline"/);
  assert.match(html, /id="recTime"/);
  assert.match(html, /id="reasons"/);
  assert.match(html, /id="recommendation"/);
  assert.doesNotMatch(html, /slot-score|추천 점수[^는]|raw data/i);
});

test('home has one stylesheet, no shape DOM, and no CSP-blocked inline style', () => {
  assert.match(html, /href="\/home-v4\.css"/);
  assert.doesNotMatch(html, /home-v2\.css|home-v3\.css|home-polish-v3\.css/);
  assert.doesNotMatch(html, /scene-skyline|scene-river|scene-bank|scene-tree|scene-bench/);
  assert.doesNotMatch(html, /style="[^"]*background-image/);
  assert.match(server, /style-src 'self'/);
});

test('home production artwork is raster-only and cannot silently fall back to SVG', () => {
  assert.match(homeCss, /hanriver-spring-sunset\.png/);
  assert.doesNotMatch(homeCss, /hanriver-spring-sunset(?:-v2)?\.svg/);
  assert.match(homeCss, /scene-skyline,.scene-river,.scene-bank,.scene-tree,.scene-bench\{display:none!important\}/);
  assert.equal(pkg.scripts.prestart, 'node scripts/fetch-design-assets.mjs');
  assert.match(assetFetch, /EXPECTED_SHA256/);
  assert.match(assetFetch, /8f9bc95005bad23a493e3fdb6ca86fa94ba89fa54fe0a1d462804c0f8b152f5f/);
  assert.match(assetFetch, /2752/);
  assert.match(assetFetch, /1536/);
  assert.doesNotMatch(assetFetch, /fallback/i);
});

test('map has one stylesheet, raster scene, real tiles, and labeled markers', () => {
  assert.match(mapHtml, /href="\/map-v4\.css"/);
  assert.doesNotMatch(mapHtml, /href="\/map\.css"|map-v3\.css|map-polish-v3\.css/);
  assert.doesNotMatch(mapHtml, /style="[^"]*background-image/);
  assert.match(mapCss, /hanriver-spring-sunset\.png/);
  assert.doesNotMatch(mapCss, /hanriver-spring-sunset(?:-v2)?\.svg/);
  assert.match(mapJs, /tile\.openstreetmap\.org/);
  assert.match(mapJs, /park-marker-label/);
  assert.match(mapCss, /park-marker-label/);
});

test('client consumes the server verdict as the single decision source', () => {
  assert.match(home, /\/api\/verdict\?place=/);
  assert.match(mapJs, /\/api\/verdict\?place=/);
  assert.doesNotMatch(home + mapJs, /makeVerdict/);
});

test('demo and stale modes are visibly disclosed on the redesigned home', () => {
  assert.match(home, /오늘의 추천 · 데모/);
  assert.match(home, /오늘의 추천 · 지연/);
  assert.match(home, /현재 화면은 데모 데이터로 동작 중이에요/);
  assert.match(home, /실시간 데이터가 지연/);
});

test('redesign keeps activity and park state shareable', () => {
  assert.match(home, /searchParams\.set\('intent'/);
  assert.match(mapJs, /searchParams\.set\('place'/);
  assert.match(mapJs, /searchParams\.set\('intent'/);
});
