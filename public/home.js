import { PLACES } from '/module/places.mjs';
import { applySceneState, seasonFor, daypartFor } from '/scene-system.js';
import { isSaved, savePlan, removeSaved, recordRecent, confirmPlan, clearConfirmed, isConfirmed } from '/storage.js';

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
const safe=(v,fallback='—')=>v===null||v===undefined||v===''?fallback:v;

function renderIntents(){
  $('intentSwitch').innerHTML=INTENTS.map(i=>`<button type="button" class="${i.id===intent?'active':''}" data-id="${i.id}">${i.label}</button>`).join('');
  $('intentSwitch').querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{intent=btn.dataset.id;localStorage.setItem('eonje.intent',intent);const url=new URL(location.href);url.searchParams.set('intent',intent);history.replaceState(null,'',url);renderIntents();load();}));
}
async function getVerdict(place){const res=await fetch(`/api/verdict?place=${encodeURIComponent(place.id)}&intent=${encodeURIComponent(intent)}`,{headers:{accept:'application/json'}});if(!res.ok)throw new Error(`${place.id} verdict failed`);const payload=await res.json();return{place,payload,verdict:payload.verdict,data:payload.data}}
function chooseWinner(results){const go=results.filter(r=>r.verdict?.status==='go'&&r.verdict?.best);const pool=go.length?go:results.filter(r=>r.verdict?.best);return[...pool].sort((a,b)=>scoreOf(b.verdict)-scoreOf(a.verdict))[0]||results[0]}
function reasonIcon(reason){const icon=reason?.icon;if(icon==='sun')return '☀';if(icon==='people')return '◉';if(icon==='rain')return '☂';if(icon==='air')return '≈';if(icon==='temp')return '°';if(icon==='warn')return '!';return '✦'}
function planFrom(winner){const best=winner.verdict?.best||{};const when=best.time?new Date(best.time):new Date();return{placeId:winner.place.id,placeName:winner.place.name,signature:winner.place.signature,intent,intentLabel:INTENTS.find(i=>i.id===intent)?.label||intent,windowLabel:winner.verdict.windowLabel||'',headline:winner.verdict.subhead||winner.verdict.headline||'',reasons:(winner.verdict.reasons||[]).slice(0,3),season:seasonFor(when),daypart:daypartFor(when),temp:best.temp,crowd:best.crowd,wind:best.wind,rainChance:best.rainChance}}
function updateActionButtons(){if(!currentPlan)return;const saved=isSaved(currentPlan),confirmed=isConfirmed(currentPlan);$('savePlanButton').textContent=saved?'저장됨':'저장';$('savePlanButton').classList.toggle('saved',saved);$('confirmPlanButton').textContent=confirmed?'이 일정으로 정했어요':'이 시간으로 정하기';$('confirmPlanButton').classList.toggle('confirmed',confirmed)}
function conditionMarkup(best={}){const items=[];if(Number.isFinite(best.temp))items.push(['기온',`${Math.round(best.temp)}°`]);if(best.crowd)items.push(['혼잡',best.crowd]);if(Number.isFinite(best.wind))items.push(['바람',`${best.wind.toFixed(1)}m/s`]);if(Number.isFinite(best.rainChance))items.push(['비',`${Math.round(best.rainChance)}%`]);return items.slice(0,4).map(([k,v])=>`<div class="condition"><span>${k}</span><strong>${v}</strong></div>`).join('')}
function cautionItems(verdict={}){const best=verdict.best||{},items=[];if(best.crowd==='약간 붐빔'||best.crowd==='붐빔')items.push({title:'사람은 조금 감수해야 해요',detail:best.crowd});if(Number.isFinite(best.wind)&&best.wind>=5)items.push({title:'바람이 느껴질 수 있어요',detail:`${best.wind.toFixed(1)}m/s`});if(Number.isFinite(best.temp)&&best.temp>=28)items.push({title:'걷다 보면 더울 수 있어요',detail:`${Math.round(best.temp)}°`});if(Number.isFinite(best.temp)&&best.temp<=16)items.push({title:'겉옷이 있으면 좋아요',detail:`${Math.round(best.temp)}°`});if(Number.isFinite(best.rainChance)&&best.rainChance>30)items.push({title:'비 가능성은 남아 있어요',detail:`강수확률 ${Math.round(best.rainChance)}%`});if(verdict.confidence==='낮음')items.push({title:'예측 확신은 낮아요',detail:verdict.confidenceDetail||'일부 데이터가 부족해요'});return items.slice(0,2)}
// An empty caution list means one of two very different things. Saying
// "큰 경고가 없어요" when the inputs were never received turns missing data
// into reassurance, which is the failure mode docs/CODE_REVIEW_RESULT.md
// lists as P0 elsewhere in the pipeline. Name the unknown instead.
const CAUTION_INPUTS=[['crowd',v=>typeof v==='string'&&v.length>0],['temp',Number.isFinite],['rainChance',Number.isFinite],['wind',Number.isFinite]];
function unknownConditions(best={}){return CAUTION_INPUTS.filter(([key,ok])=>!ok(best[key])).map(([key])=>({crowd:'혼잡',temp:'기온',rainChance:'비',wind:'바람'})[key])}
function emptyCaution(verdict={}){
  const unknown=unknownConditions(verdict.best||{});
  return unknown.length
    ? {title:`${unknown.join('·')} 정보를 못 받았어요`,detail:'괜찮다는 뜻이 아니라 아직 모르는 상태예요.'}
    : {title:'걸리는 조건이 없어요',detail:'혼잡·기온·비·바람 모두 확인했어요.'};
}
function renderEvidence(verdict){const positives=(verdict.reasons||[]).slice(0,3);$('positives').innerHTML=positives.length?positives.map(r=>`<div class="evidence-item"><i>${reasonIcon(r)}</i><div><strong>${r.title}</strong><span>${r.detail||''}</span></div></div>`).join(''):'<div class="evidence-item"><i>✓</i><div><strong>전체 조건이 가장 균형적이에요</strong><span>비교한 공원 중 지금 1순위예요.</span></div></div>';const cautions=cautionItems(verdict);const empty=cautions.length?null:emptyCaution(verdict);$('cautions').innerHTML=cautions.length?cautions.map(r=>`<div class="evidence-item"><i>·</i><div><strong>${r.title}</strong><span>${r.detail}</span></div></div>`).join(''):`<div class="evidence-item quiet"><i>${unknownConditions(verdict.best||{}).length?'?':'✓'}</i><div><strong>${empty.title}</strong><span>${empty.detail}</span></div></div>`}
function renderWinner(winner){
  const {place,verdict,data}=winner;const quality=data?.quality?.state,best=verdict?.best||{};
  $('recBadge').textContent=data?.mode!=='live'?'추천 · 데모':quality==='stale'?'추천 · 데이터 지연':'오늘의 1순위';
  $('recPlace').textContent=place.name;$('parkSignature').textContent=place.signature||'';$('recSub').textContent=verdict.headline||verdict.subhead||'오늘 조건을 함께 비교했어요.';$('recTime').textContent=verdict.windowLabel||'오늘은 패스';$('recMood').textContent=INTENTS.find(i=>i.id===intent)?.label||'';
  const when=best.time?new Date(best.time):new Date();applySceneState(document.body,place.id,when);const season=seasonFor(when),daypart=daypartFor(when);$('seasonContext').textContent=`${SEASON_LABEL[season]} · ${DAYPART_LABEL[daypart]}`;$('conditions').innerHTML=conditionMarkup(best);renderEvidence(verdict);
  $('mapPlanLink').href=`/map.html?place=${encodeURIComponent(place.id)}&intent=${encodeURIComponent(intent)}`;localStorage.setItem('eonje.place',place.id);currentPlan=planFrom(winner);recordRecent(currentPlan);updateActionButtons();
}
function renderAlt(results,winner){const alts=results.filter(r=>r.place.id!==winner.place.id&&r.verdict?.status==='go'&&r.verdict?.best).sort((a,b)=>scoreOf(b.verdict)-scoreOf(a.verdict));const alt=alts[0];if(!alt){$('altName').textContent='지금은 1순위와 비슷한 대안이 없어요';$('altTime').textContent='';$('altLink').href='/map.html';return}$('altName').textContent=alt.place.name;$('altTime').textContent=alt.verdict.windowLabel||'';$('altLink').href=`/map.html?place=${encodeURIComponent(alt.place.id)}&intent=${encodeURIComponent(intent)}`}
function slotSummary(s){const parts=[];if(s?.crowd)parts.push(s.crowd);if(Number.isFinite(s?.temp))parts.push(`${Math.round(s.temp)}°`);if(Number.isFinite(s?.rainChance))parts.push(`비 ${Math.round(s.rainChance)}%`);return parts.join(' · ')}
function renderTimeCards(winner){
  const scored=(winner.verdict?.scored||[]).filter(s=>!s.gated);const bestTime=winner.verdict?.best?.time;let choices=[];if(scored.length){const bestIndex=Math.max(0,scored.findIndex(s=>s.time===bestTime));const indices=[Math.max(0,bestIndex-1),bestIndex,Math.min(scored.length-1,bestIndex+1)];choices=[...new Set(indices)].map(i=>scored[i]).filter(Boolean);while(choices.length<3&&scored[choices.length])choices.push(scored[choices.length])}
  const labels=['먼저 가면','가장 좋은 한 시간','조금 늦게 가면'];const tags=['한적함 쪽','오늘의 추천','야경 쪽'];$('timeCards').innerHTML=[0,1,2].map(idx=>{const s=choices[idx]||winner.verdict?.best;const start=fmt(s?.time);let end='';if(s?.time){const d=new Date(s.time);d.setMinutes(d.getMinutes()+60);end=fmt(d.toISOString())}return `<article class="time-card liquid-glass ${idx===1?'featured':''}" data-index="${idx}"><div class="card-kicker">${labels[idx]}</div><strong>${start||'—'}${start?' – ':''}${end||''}</strong><p>${slotSummary(s)}</p><span class="tag">${tags[idx]}</span></article>`}).join('');$('timeCards').querySelectorAll('.time-card').forEach((card,idx)=>{const s=choices[idx]||winner.verdict?.best;applySceneState(card,winner.place.id,s?.time?new Date(s.time):new Date())});
}
async function load(){document.body.className='loading';$('statusCopy').textContent='6개 공원을 비교하는 중이에요';try{const settled=await Promise.allSettled(PLACES.map(getVerdict));const results=settled.filter(x=>x.status==='fulfilled').map(x=>x.value);if(!results.length)throw new Error('no verdicts');const winner=chooseWinner(results);renderWinner(winner);renderAlt(results,winner);renderTimeCards(winner);const quality=winner.data?.quality?.state;$('statusCopy').textContent=winner.data?.mode!=='live'?'현재 화면은 데모 데이터로 동작 중이에요':quality==='stale'?'일부 실시간 데이터가 지연되어 표시되고 있어요':'오늘 조건을 비교해 한 곳만 골랐어요';document.body.className='ready'}catch(error){console.error(error);document.body.className='error';$('errorMessage').textContent='추천 데이터를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.'}}
$('savePlanButton').addEventListener('click',()=>{if(!currentPlan)return;if(isSaved(currentPlan))removeSaved(currentPlan);else savePlan(currentPlan);updateActionButtons()});
$('confirmPlanButton').addEventListener('click',()=>{if(!currentPlan)return;if(isConfirmed(currentPlan))clearConfirmed();else confirmPlan(currentPlan);updateActionButtons()});
$('sharePlanButton').addEventListener('click',async()=>{if(!currentPlan)return;const url=new URL(location.href);url.searchParams.set('intent',currentPlan.intent);const data={title:`언제 · ${currentPlan.placeName}`,text:`${currentPlan.placeName} ${currentPlan.windowLabel} · ${currentPlan.intentLabel}`,url:url.toString()};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(`${data.text}\n${data.url}`);$('sharePlanButton').textContent='복사됨';setTimeout(()=>$('sharePlanButton').textContent='공유',1400)}}catch{}});
$('retryButton').addEventListener('click',load);renderIntents();load();
