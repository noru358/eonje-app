import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const home=await readFile(new URL('../public/home-v2.js',import.meta.url),'utf8');
const sceneJs=await readFile(new URL('../public/scene-system.js',import.meta.url),'utf8');
const sceneCss=await readFile(new URL('../public/scene-system.css',import.meta.url),'utf8');
const storage=await readFile(new URL('../public/storage.js',import.meta.url),'utf8');
const historyHtml=await readFile(new URL('../public/history.html',import.meta.url),'utf8');
const historyJs=await readFile(new URL('../public/history.js',import.meta.url),'utf8');
const mapHtml=await readFile(new URL('../public/map.html',import.meta.url),'utf8');
const mapJs=await readFile(new URL('../public/map.js',import.meta.url),'utf8');
const assetFetch=await readFile(new URL('../scripts/fetch-design-assets.mjs',import.meta.url),'utf8');
const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));

test('main screen is a decision panel, not a raw dashboard',()=>{for(const id of ['headline','recTime','reasons','recommendation','savePlanButton','mapPlanLink','parkSignature'])assert.match(html,new RegExp(`id="${id}"`));assert.doesNotMatch(html,/slot-score|추천 점수[^는]|raw data/i);});

test('home uses shared scene system without CSP-blocked image styles',()=>{assert.match(html,/scene-system\.css/);assert.doesNotMatch(html,/scene-skyline|scene-river|scene-bank|scene-tree|scene-bench/);assert.doesNotMatch(html,/style="[^"]*background-image/);assert.doesNotMatch(home,/style="background-image/);assert.match(server,/style-src 'self'/);});

test('scene resolver makes actual Seoul season primary and event theme optional',()=>{for(const season of ['spring','summer','autumn','winter'])assert.match(sceneJs,new RegExp(`'${season}'`));for(const part of ['dawn','morning','day','afternoon','evening','night'])assert.match(sceneJs,new RegExp(`'${part}'`));assert.match(sceneJs,/timeZone:'Asia\/Seoul'/);assert.match(sceneJs,/themeFor/);assert.match(sceneJs,/'cherry'/);assert.match(home,/applySceneState/);assert.match(mapJs,/applySceneState/);assert.match(sceneCss,/data-season='autumn'/);assert.match(sceneCss,/season-wash/);assert.match(sceneCss,/data-theme='cherry'/);});

test('park identity metadata is surfaced in home and map',()=>{assert.match(home,/place\.signature/);assert.match(mapJs,/place\.signature/);assert.match(mapJs,/panel-signature/);});

test('scene CSS maps available park masters and provides liquid glass motion',()=>{for(const place of ['mangwon','yeouido','ichon','banpo','jamsil'])assert.match(sceneCss,new RegExp(`assets/scenes/${place}/spring/master\\.png`));assert.match(sceneCss,/liquid-glass/);assert.match(sceneCss,/prefers-reduced-motion/);});

test('save and recent history are real local features',()=>{assert.match(storage,/eonje\.saved\.v1/);assert.match(storage,/eonje\.recent\.v1/);assert.match(home,/savePlan\(/);assert.match(home,/recordRecent\(/);assert.match(historyHtml,/id="savedList"/);assert.match(historyHtml,/id="recentList"/);assert.match(historyJs,/getSaved/);assert.match(historyJs,/clearRecent/);assert.match(html,/history\.html#saved/);assert.match(html,/history\.html#recent/);});

test('asset bootstrap verifies base artwork and fetches available park masters',()=>{assert.equal(pkg.scripts.prestart,'node scripts/fetch-design-assets.mjs');assert.match(assetFetch,/8f9bc95005bad23a493e3fdb6ca86fa94ba89fa54fe0a1d462804c0f8b152f5f/);for(const place of ['mangwon','yeouido','ichon','banpo','jamsil'])assert.match(assetFetch,new RegExp(`scenes/${place}/spring/master\\.png`));});

test('map keeps real tiles, labeled markers, saves, and scene selection state',()=>{assert.match(mapHtml,/map-v5-polish\.css/);assert.match(mapJs,/tile\.openstreetmap\.org/);assert.match(mapJs,/park-marker-label/);assert.match(mapJs,/data-save/);assert.match(mapJs,/applySceneState\(document\.body,place\.id/);});

test('client consumes server verdict as the single decision source',()=>{assert.match(home,/\/api\/verdict\?place=/);assert.match(mapJs,/\/api\/verdict\?place=/);assert.doesNotMatch(home+mapJs,/makeVerdict/);});

test('demo and stale modes remain visibly disclosed',()=>{assert.match(home,/오늘의 추천 · 데모/);assert.match(home,/오늘의 추천 · 지연/);assert.match(home,/현재 화면은 데모 데이터로 동작 중이에요/);assert.match(home,/실시간 데이터가 지연/);});

test('activity and park state remain shareable',()=>{assert.match(home,/searchParams\.set\('intent'/);assert.match(mapJs,/searchParams\.set\('place'/);assert.match(mapJs,/searchParams\.set\('intent'/);});
