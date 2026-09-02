import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const home = await readFile(new URL('../public/home-v2.js', import.meta.url), 'utf8');
const homeCss = await readFile(new URL('../public/home-v3.css', import.meta.url), 'utf8');
const mapHtml = await readFile(new URL('../public/map.html', import.meta.url), 'utf8');
const mapJs = await readFile(new URL('../public/map.js', import.meta.url), 'utf8');
const mapCss = await readFile(new URL('../public/map-v3.css', import.meta.url), 'utf8');

test('first screen keeps verdict before raw data', () => {
  assert.match(html, /id="headline"/);
  assert.match(html, /id="recTime"/);
  assert.match(html, /id="reasons"/);
  assert.match(html, /id="recommendation"/);
  assert.doesNotMatch(html, /slot-score|추천 점수[^는]|raw data/i);
});

test('redesigned home uses one production stylesheet and one scene asset', () => {
  assert.match(html, /href="\/home-v3\.css"/);
  assert.doesNotMatch(html, /home-v2\.css|home-polish-v3\.css/);
  assert.doesNotMatch(html, /scene-skyline|scene-river|scene-bank|scene-tree|scene-bench/);
  assert.match(homeCss, /hanriver-spring-sunset-v2\.svg/);
});

test('redesigned map uses one production stylesheet and labeled real-map markers', () => {
  assert.match(mapHtml, /href="\/map-v3\.css"/);
  assert.doesNotMatch(mapHtml, /href="\/map\.css"|map-polish-v3\.css/);
  assert.match(mapJs, /tile\.openstreetmap\.org/);
  assert.match(mapJs, /park-marker-label/);
  assert.match(mapCss, /park-marker-label/);
});

test('client consumes the server verdict as the single decision source', () => {
  assert.match(home, /\/api\/verdict\?place=/);
  assert.match(mapJs, /\/api\/verdict\?place=/);
  assert.doesNotMatch(home + mapJs, /makeVerdict/);
});

test('demo mode is visibly disclosed on the redesigned home', () => {
  assert.match(home, /오늘의 추천 · 데모/);
});

test('redesign keeps activity and park state shareable', () => {
  assert.match(home, /searchParams\.set\('intent'/);
  assert.match(mapJs, /searchParams\.set\('place'/);
  assert.match(mapJs, /searchParams\.set\('intent'/);
});
