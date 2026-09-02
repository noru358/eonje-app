import { PLACES } from '/module/places.mjs';

const INTENTS=[
  {id:'general',label:'산책'},
  {id:'picnic',label:'피크닉'},
  {id:'run',label:'러닝'},
  {id:'sunset',label:'노을'}
];
const params=new URL(location.href).searchParams;
let intent=params.get('intent')||localStorage.getItem('eonje.intent')||'sunset';
if(!INTENTS.some(i=>i.id===intent))intent='sunset';

const $=(id)=>document.getElementById(id);
const scoreOf=(v)=>Number.isFinite(v?.best?.selectionScore)?v.best.selectionScore:Number.isFinite(v?.best?.score)?v.best.score:-9999;
const fmt=(iso)=>iso?new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(new Date(iso)):'';
const sceneStack="linear-gradient(180deg,rgba(255,255,255,.16),rgba(19,35,53,.1)),url('/assets/hanriver-spring-sunset.png'),url('/assets/hanriver-spring-sunset-v2.svg')";

function renderIntents(){
  $('intentSwitch').innerHTML=INTENTS.map(i=>`<button type="button" class="${i.id===intent?'active':''}" data-id="${i.id}">${i.label}</button>`).join('');
  $('intentSwitch').querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
    intent=btn.dataset.id;
    localStorage.setItem('eonje.intent',intent);
    const url=new URL(location.href);url.searchParams.set('intent',intent);history.replaceState(null,'',url);
    renderIntents();load();
  }));
}

async function getVerdict(place){
  const res=await fetch(`/api/verdict?place=${encodeURIComponent(place.id)}&intent=${encodeURIComponent(intent)}`,{headers:{accept:'application/json'}});
  if(!res.ok)throw new Error(`${place.id} verdict failed`);
  const payload=await res.json();
  return {place,payload,verdict:payload.verdict,data:payload.data};
}

function chooseWinner(results){
  const go=results.filter(r=>r.verdict?.status==='go'&&r.verdict?.best);
  const pool=go.length?go:results.filter(r=>r.verdict?.best);
  return [...pool].sort((a,b)=>scoreOf(b.verdict)-scoreOf(a.verdict))[0]||results[0];
}

function reasonIcon(reason){
  const icon=reason?.icon;
  if(icon==='sun')return '☀';
  if(icon==='people')return '♟';
  if(icon==='rain')return '☂';
  if(icon==='air')return '≋';
  if(icon==='temp')return '◌';
  return '✦';
}

function renderWinner(winner){
  const {place,verdict,data}=winner;
  const quality=data?.quality?.state;
  $('recBadge').textContent=data?.mode!=='live'?'✦ 오늘의 추천 · 데모':quality==='stale'?'✦ 오늘의 추천 · 지연':'✦ 오늘의 추천';
  $('recPlace').textContent=place.name;
  $('recSub').textContent=verdict.subhead||verdict.headline||'오늘 조건을 함께 비교했어요.';
  $('recTime').textContent=verdict.windowLabel||'오늘은 패스';
  $('recMood').textContent=intent==='sunset'?'☀ 노을':intent==='run'?'⌁ 러닝':intent==='picnic'?'◉ 피크닉':'⌁ 산책';
  const reasons=(verdict.reasons||[]).slice(0,3);
  $('reasons').innerHTML=reasons.map(r=>`<div class="reason"><div class="reason-icon">${reasonIcon(r)}</div><div><strong>${r.title}</strong><span>${r.detail||''}</span></div></div>`).join('');
  localStorage.setItem('eonje.place',place.id);
}

function renderAlt(results,winner){
  const alts=results.filter(r=>r.place.id!==winner.place.id&&r.verdict?.status==='go'&&r.verdict?.best).sort((a,b)=>scoreOf(b.verdict)-scoreOf(a.verdict));
  const alt=alts[0];
  if(!alt){
    $('altName').textContent='다른 공원은 지금 큰 차이가 없어요';
    $('altTime').textContent='';
    $('altLink').href='/map.html';
    return;
  }
  $('altName').textContent=alt.place.name;
  $('altTime').textContent=alt.verdict.windowLabel||'';
  $('altLink').href=`/map.html?place=${encodeURIComponent(alt.place.id)}&intent=${encodeURIComponent(intent)}`;
}

function renderTimeCards(winner){
  const scored=(winner.verdict?.scored||[]).filter(s=>!s.gated);
  const bestTime=winner.verdict?.best?.time;
  let choices=[];
  if(scored.length){
    const bestIndex=Math.max(0,scored.findIndex(s=>s.time===bestTime));
    const indices=[Math.max(0,bestIndex-1),bestIndex,Math.min(scored.length-1,bestIndex+1)];
    choices=[...new Set(indices)].map(i=>scored[i]).filter(Boolean);
    while(choices.length<3&&scored[choices.length])choices.push(scored[choices.length]);
  }
  const labels=['여유롭게 즐기고 싶다면','가장 좋은 시간','조금 더 늦게 간다면'];
  const tags=['여유로운 시간','최적의 시간','야경 감상'];
  $('timeCards').innerHTML=[0,1,2].map((idx)=>{
    const s=choices[idx]||winner.verdict?.best;
    const start=fmt(s?.time);
    let end='';
    if(s?.time){const d=new Date(s.time);d.setMinutes(d.getMinutes()+60);end=fmt(d.toISOString());}
    return `<article class="time-card" style="background-image:${sceneStack}"><div class="card-kicker">${labels[idx]}</div><strong>${start||'—'}${start?' – ':''}${end||''}</strong><span class="tag">${tags[idx]}</span></article>`;
  }).join('');
}

function setScene(winner){
  document.body.dataset.place=winner.place.id;
  const h=new Date().getHours();
  document.body.dataset.daypart=h<11?'morning':h<17?'day':h<20?'sunset':'night';
}

async function load(){
  document.body.className='loading';
  $('statusCopy').textContent='날씨와 시간, 사람까지 함께 비교하고 있어요';
  try{
    const settled=await Promise.allSettled(PLACES.map(getVerdict));
    const results=settled.filter(x=>x.status==='fulfilled').map(x=>x.value);
    if(!results.length)throw new Error('no verdicts');
    const winner=chooseWinner(results);
    renderWinner(winner);renderAlt(results,winner);renderTimeCards(winner);setScene(winner);
    const quality=winner.data?.quality?.state;
    $('statusCopy').textContent=winner.data?.mode!=='live'?'현재 화면은 데모 데이터로 동작 중이에요':quality==='stale'?'일부 실시간 데이터가 지연되어 표시되고 있어요':'오늘의 날씨와 시간, 사람까지 고려했어요';
    document.body.className='ready';
  }catch(error){
    console.error(error);
    document.body.className='error';
    $('errorMessage').textContent='추천 데이터를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.';
  }
}

$('retryButton').addEventListener('click',load);
renderIntents();
load();
