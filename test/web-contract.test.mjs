import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const home=await readFile(new URL('../public/home-v2.js',import.meta.url),'utf8');
const homeCss=await readFile(new URL('../public/home-v4.css',import.meta.url),'utf8');
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

test('main screen is a dense decision surface, not a raw dashboard',()=>{for(const id of ['headline','recTime','recommendation','conditions','positives','cautions','confirmPlanButton','savePlanButton','sharePlanButton','mapPlanLink','parkSignature'])assert.match(html,new RegExp(`id="${id}"`));assert.doesNotMatch(html,/slot-score|추천 점수[^는]|raw data/i);assert.match(homeCss,/evidence-grid/);assert.match(homeCss,/grid-template-columns:\.92fr 1\.16fr \.92fr/);});

test('home uses shared scene system without CSP-blocked image styles',()=>{assert.match(html,/scene-system\.css/);assert.doesNotMatch(html,/scene-skyline|scene-river|scene-bank|scene-tree|scene-bench/);assert.doesNotMatch(html,/style="[^"]*background-image/);assert.doesNotMatch(home,/style="background-image/);assert.match(server,/style-src 'self'/);});

test('scene resolver makes actual Seoul season primary and event theme optional',()=>{for(const season of ['spring','summer','autumn','winter'])assert.match(sceneJs,new RegExp(`'${season}'`));for(const part of ['dawn','morning','day','afternoon','evening','night'])assert.match(sceneJs,new RegExp(`'${part}'`));assert.match(sceneJs,/timeZone:'Asia\/Seoul'/);assert.match(sceneJs,/themeFor/);assert.match(sceneCss,/data-theme='cherry'/);assert.match(home,/applySceneState/);assert.match(mapJs,/applySceneState/);});

test('autumn is a physical park-specific source asset, not a tinted blossom fallback',()=>{for(const place of ['mangwon','yeouido','ichon','jamsil'])assert.match(sceneCss,new RegExp(`scenes/${place}/autumn/master-v2\\.png`));assert.match(sceneCss,/banpo\/autumn\/night-v2\.png/);assert.match(sceneCss,/ttukseom\/autumn\/night-v2\.png/);assert.match(assetFetch,/upload\.wikimedia\.org/i);assert.match(assetFetch,/AUTUMN_SOURCES/);assert.match(assetFetch,/sharp/);assert.equal(pkg.dependencies.sharp,'0.34.3');});

test('night scene stays luminous and changes light source instead of crushing brightness',()=>{const night=sceneCss.match(/body\[data-daypart='night'\][\s\S]*?\}\n/)?.[0]||'';assert.match(night,/--day-bright:\.94/);assert.match(night,/radial-gradient/);assert.match(night,/rgba\(249,247,220/);assert.doesNotMatch(night,/--day-bright:\.(?:[0-7]\d?)/);});

test('park identity metadata is surfaced in home and map',()=>{assert.match(home,/place\.signature/);assert.match(mapJs,/place\.signature/);assert.match(mapJs,/panel-signature/);});

test('save recent and confirmed outing are real local features',()=>{assert.match(storage,/eonje\.saved\.v1/);assert.match(storage,/eonje\.recent\.v1/);assert.match(storage,/eonje\.confirmed\.v1/);assert.match(home,/confirmPlan\(/);assert.match(home,/navigator\.share/);assert.match(historyHtml,/id="confirmedList"/);assert.match(historyJs,/getConfirmed/);assert.match(historyJs,/clearConfirmed/);});

test('map keeps real tiles, evidence, confirmation and scene selection state',()=>{assert.match(mapHtml,/map-v5-polish\.css/);assert.match(mapJs,/tile\.openstreetmap\.org/);assert.match(mapJs,/park-marker-label/);assert.match(mapJs,/map-conditions/);assert.match(mapJs,/map-evidence/);assert.match(mapJs,/data-confirm/);assert.match(mapJs,/applySceneState\(document\.body,place\.id/);});

test('client consumes server verdict as the single decision source',()=>{assert.match(home,/\/api\/verdict\?place=/);assert.match(mapJs,/\/api\/verdict\?place=/);assert.doesNotMatch(home+mapJs,/makeVerdict/);});

test('demo and stale modes remain visibly disclosed',()=>{assert.match(home,/추천 · 데모/);assert.match(home,/추천 · 데이터 지연/);assert.match(home,/현재 화면은 데모 데이터로 동작 중이에요/);assert.match(home,/실시간 데이터가 지연/);});

test('activity and park state remain shareable',()=>{assert.match(home,/searchParams\.set\('intent'/);assert.match(mapJs,/searchParams\.set\('place'/);assert.match(mapJs,/searchParams\.set\('intent'/);});
