import { PLACES } from '/module/places.mjs';
import { applySceneState, seasonFor, daypartFor } from '/scene-system.js';
import { isSaved, savePlan, removeSaved, recordRecent } from '/storage.js';

const INTENTS=[{id:'general',label:'산책'},{id:'picnic',label:'피크닉'},{id:'run',label:'러닝'},{id:'sunset',label:'노을'}];
const SEASON_LABEL={spring:'봄',summer:'여름',autumn:'가을',winter:'겨울'};
const DAYPART_LABEL={dawn:'새벽',morning:'아침',day:'낮',afternoon:'오후',evening:'저녁',night:'밤'};
const params=new URL(location.href).searchParams;
let intent=params.get('intent')||localStorage.getItem('eonje.intent')||'sunset';
if(!INTENTS.some(i=>i.id===intent))intent='sunset';
let currentPlan=null;
const $=(id)=>document.getElementById(id);
const scoreOf=(v)=>Number.isFinite(v?.best?.selectionScore)?v.best.selectionScore:Number.isFinite(v?.best?.score)?v.best.score:-9999;
const fmt=(iso)=>iso?new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(new Date(iso)):'';

function renderIntents(){
  $('intentSwitch').innerHTML=INTENTS.map(i=>`<button type="button" class="${i.id===intent?'active':''}" data-id="${i.id}">${i.label}</button>`).join('');
  $('intentSwitch').querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{intent=btn.dataset.id;localStorage.setItem('eonje.intent',intent);const url=new URL(location.href);url.searchParams.set('intent',intent);history.replaceState(null,'',url);renderIntents();load();}));
}
async function getVerdict(place){const res=await fetch(`/api/verdict?place=${encodeURIComponent(place.id)}&intent=${encodeURIComponent(intent)}`,{headers:{accept:'application/json'}});if(!res.ok)throw new Error(`${place.id} verdict failed`);const payload=await res.json();return{place,payload,verdict:payload.verdict,data:payload.data}}
function chooseWinner(results){const go=results.filter(r=>r.verdict?.status==='go'&&r.verdict?.best);const pool=go.length?go:results.filter(r=>r.verdict?.best);return[...pool].sort((a,b)=>scoreOf(b.verdict)-scoreOf(a.verdict))[0]||results[0]}
function reasonIcon(reason){const icon=reason?.icon;if(icon==='sun')return '☀';if(icon==='people')return '◉';if(icon==='rain')return '☂';if(icon==='air')return '≈';if(icon==='temp')return '°';return '✦'}
function planFrom(winner){return{placeId:winner.place.id,placeName:winner.place.name,signature:winner.place.signature,intent,intentLabel:INTENTS.find(i=>i.id===intent)?.label||intent,windowLabel:winner.verdict.windowLabel||'',headline:winner.verdict.subhead||winner.verdict.headline||'',reasons:(winner.verdict.reasons||[]).slice(0,3),season:seasonFor(new Date()),daypart:daypartFor(winner.verdict?.best?.time?new Date(winner.verdict.best.time):new Date())}}
function updateSaveButton(){if(!currentPlan)return;const saved=isSaved(currentPlan);$('savePlanButton').textContent=saved?'저장됨 · 취소':'이 추천 저장';$('savePlanButton').classList.toggle('saved',saved)}
function renderWinner(winner){
  const {place,verdict,data}=winner;const quality=data?.quality?.state;
  $('recBadge').textContent=data?.mode!=='live'?'오늘의 추천 · 데모':quality==='stale'?'오늘의 추천 · 지연':'오늘의 추천';
  $('recPlace').textContent=place.name;$('parkSignature').textContent=place.signature||'';$('recSub').textContent=verdict.subhead||verdict.headline||'오늘 조건을 함께 비교했어요.';$('recTime').textContent=verdict.windowLabel||'오늘은 패스';
  $('recMood').textContent=INTENTS.find(i=>i.id===intent)?.label||'';
  $('reasons').innerHTML=(verdict.reasons||[]).slice(0,3).map(r=>`<div class="reason"><div class="reason-icon">${reasonIcon(r)}</div><div><strong>${r.title}</strong><span>${r.detail||''}</span></div></div>`).join('');
  const when=verdict?.best?.time?new Date(verdict.best.time):new Date();applySceneState(document.body,place.id,when);const season=seasonFor(when),daypart=daypartFor(when);$('seasonContext').textContent=`${SEASON_LABEL[season]} · ${DAYPART_LABEL[daypart]}`;
  $('mapPlanLink').href=`/map.html?place=${encodeURIComponent(place.id)}&intent=${encodeURIComponent(intent)}`;
  localStorage.setItem('eonje.place',place.id);currentPlan=planFrom(winner);recordRecent(currentPlan);updateSaveButton();
}
function renderAlt(results,winner){const alts=results.filter(r=>r.place.id!==winner.place.id&&r.verdict?.status==='go'&&r.verdict?.best).sort((a,b)=>scoreOf(b.verdict)-scoreOf(a.verdict));const alt=alts[0];if(!alt){$('altName').textContent='다른 공원은 지금 큰 차이가 없어요';$('altTime').textContent='';$('altLink').href='/map.html';return}$('altName').textContent=alt.place.name;$('altTime').textContent=alt.verdict.windowLabel||'';$('altLink').href=`/map.html?place=${encodeURIComponent(alt.place.id)}&intent=${encodeURIComponent(intent)}`}
function renderTimeCards(winner){
  const scored=(winner.verdict?.scored||[]).filter(s=>!s.gated);const bestTime=winner.verdict?.best?.time;let choices=[];
  if(scored.length){const bestIndex=Math.max(0,scored.findIndex(s=>s.time===bestTime));const indices=[Math.max(0,bestIndex-1),bestIndex,Math.min(scored.length-1,bestIndex+1)];choices=[...new Set(indices)].map(i=>scored[i]).filter(Boolean);while(choices.length<3&&scored[choices.length])choices.push(scored[choices.length])}
  const labels=['조금 일찍, 더 한적하게','오늘의 중심 시간','조금 늦게, 야경까지'];const tags=['여유','추천','늦은 선택'];
  $('timeCards').innerHTML=[0,1,2].map((idx)=>{const s=choices[idx]||winner.verdict?.best;const start=fmt(s?.time);let end='';if(s?.time){const d=new Date(s.time);d.setMinutes(d.getMinutes()+60);end=fmt(d.toISOString())}return `<article class="time-card liquid-glass" data-index="${idx}"><div class="card-kicker">${labels[idx]}</div><strong>${start||'—'}${start?' – ':''}${end||''}</strong><span class="tag">${tags[idx]}</span></article>`}).join('');
  $('timeCards').querySelectorAll('.time-card').forEach((card,idx)=>{const s=choices[idx]||winner.verdict?.best;const d=s?.time?new Date(s.time):new Date();applySceneState(card,winner.place.id,d)});
}
function setScene(winner){const d=winner.verdict?.best?.time?new Date(winner.verdict.best.time):new Date();applySceneState(document.body,winner.place.id,d)}
async function load(){document.body.className='loading';$('statusCopy').textContent='날씨와 시간, 사람까지 함께 비교하고 있어요';try{const settled=await Promise.allSettled(PLACES.map(getVerdict));const results=settled.filter(x=>x.status==='fulfilled').map(x=>x.value);if(!results.length)throw new Error('no verdicts');const winner=chooseWinner(results);renderWinner(winner);renderAlt(results,winner);renderTimeCards(winner);setScene(winner);const quality=winner.data?.quality?.state;$('statusCopy').textContent=winner.data?.mode!=='live'?'현재 화면은 데모 데이터로 동작 중이에요':quality==='stale'?'일부 실시간 데이터가 지연되어 표시되고 있어요':'오늘 조건을 비교해 한 곳만 골랐어요';document.body.className='ready'}catch(error){console.error(error);document.body.className='error';$('errorMessage').textContent='추천 데이터를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.'}}
$('savePlanButton').addEventListener('click',()=>{if(!currentPlan)return;if(isSaved(currentPlan))removeSaved(currentPlan);else savePlan(currentPlan);updateSaveButton()});
$('retryButton').addEventListener('click',load);renderIntents();load();
