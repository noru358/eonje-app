import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const home=await readFile(new URL('../public/home-v2.js',import.meta.url),'utf8');
const sceneJs=await readFile(new URL('../public/scene-system.js',import.meta.url),'utf8');
const sceneCss=await readFile(new URL('../public/scene-system.css',import.meta.url),'utf8');
const mapHtml=await readFile(new URL('../public/map.html',import.meta.url),'utf8');
const mapJs=await readFile(new URL('../public/map.js',import.meta.url),'utf8');
const assetFetch=await readFile(new URL('../scripts/fetch-design-assets.mjs',import.meta.url),'utf8');
const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));

test('first screen keeps verdict before raw data',()=>{assert.match(html,/id="headline"/);assert.match(html,/id="recTime"/);assert.match(html,/id="reasons"/);assert.match(html,/id="recommendation"/);assert.doesNotMatch(html,/slot-score|추천 점수[^는]|raw data/i);});

test('home uses shared scene system without CSP-blocked image styles',()=>{assert.match(html,/href="\/home-v4\.css"/);assert.match(html,/href="\/scene-system\.css"/);assert.doesNotMatch(html,/scene-skyline|scene-river|scene-bank|scene-tree|scene-bench/);assert.doesNotMatch(html,/style="[^"]*background-image/);assert.doesNotMatch(home,/style="background-image/);assert.match(server,/style-src 'self'/);});

test('scene resolver covers four seasons and six dayparts in Seoul time',()=>{for(const season of ['spring','summer','autumn','winter'])assert.match(sceneJs,new RegExp(`'${season}'`));for(const part of ['dawn','morning','day','afternoon','evening','night'])assert.match(sceneJs,new RegExp(`'${part}'`));assert.match(sceneJs,/timeZone:'Asia\/Seoul'/);assert.match(home,/applySceneState/);assert.match(home,/sceneState/);assert.match(mapJs,/applySceneState/);assert.match(mapJs,/sceneState/);});

test('scene CSS maps available park masters and applies seasonal daypart retouch',()=>{for(const place of ['mangwon','yeouido','ichon','banpo','jamsil'])assert.match(sceneCss,new RegExp(`assets/scenes/${place}/spring/master\\.png`));for(const season of ['summer','autumn','winter'])assert.match(sceneCss,new RegExp(`data-season='${season}'`));for(const part of ['dawn','morning','day','afternoon','evening','night'])assert.match(sceneCss,new RegExp(`data-daypart='${part}'`));assert.match(sceneCss,/liquid-glass/);assert.match(sceneCss,/prefers-reduced-motion/);});

test('asset bootstrap verifies base artwork and fetches available park masters',()=>{assert.equal(pkg.scripts.prestart,'node scripts/fetch-design-assets.mjs');assert.match(assetFetch,/8f9bc95005bad23a493e3fdb6ca86fa94ba89fa54fe0a1d462804c0f8b152f5f/);assert.match(assetFetch,/2752/);assert.match(assetFetch,/1536/);for(const place of ['mangwon','yeouido','ichon','banpo','jamsil'])assert.match(assetFetch,new RegExp(`scenes/${place}/spring/master\\.png`));});

test('map keeps real tiles, labeled markers, and scene state linked to selection',()=>{assert.match(mapHtml,/href="\/map-v4\.css"/);assert.match(mapHtml,/href="\/scene-system\.css"/);assert.doesNotMatch(mapHtml,/style="[^"]*background-image/);assert.match(mapJs,/tile\.openstreetmap\.org/);assert.match(mapJs,/park-marker-label/);assert.match(mapJs,/applySceneState\(document\.body,place\.id/);});

test('client consumes server verdict as the single decision source',()=>{assert.match(home,/\/api\/verdict\?place=/);assert.match(mapJs,/\/api\/verdict\?place=/);assert.doesNotMatch(home+mapJs,/makeVerdict/);});

test('demo and stale modes remain visibly disclosed',()=>{assert.match(home,/오늘의 추천 · 데모/);assert.match(home,/오늘의 추천 · 지연/);assert.match(home,/현재 화면은 데모 데이터로 동작 중이에요/);assert.match(home,/실시간 데이터가 지연/);});

test('activity and park state remain shareable',()=>{assert.match(home,/searchParams\.set\('intent'/);assert.match(mapJs,/searchParams\.set\('place'/);assert.match(mapJs,/searchParams\.set\('intent'/);});
