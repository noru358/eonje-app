import { PLACES } from '/module/places.mjs';

const INTENTS=[
  {id:'general',label:'산책'},
  {id:'picnic',label:'피크닉'},
  {id:'run',label:'러닝'},
  {id:'sunset',label:'노을'}
];
const params=new URL(location.href).searchParams;
let currentIntent=params.get('intent')||localStorage.getItem('eonje.intent')||'sunset';
if(!INTENTS.some(i=>i.id===currentIntent))currentIntent='sunset';
let currentPlace=params.get('place')||localStorage.getItem('eonje.place')||'yeouido';
if(!PLACES.some(p=>p.id===currentPlace))currentPlace='yeouido';
const markers=new Map();
const cache=new Map();
const failure=document.getElementById('mapFailure');

if(!globalThis.L){
  failure.hidden=false;
  failure.textContent='지도 엔진을 불러오지 못했어요.';
  throw new Error('Leaflet failed to load');
}

const map=L.map('map',{zoomControl:false,attributionControl:true,preferCanvas:true}).setView([37.5288,126.997],12);
L.control.zoom({position:'bottomleft'}).addTo(map);
const tile=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'});
let tileLoaded=false;
tile.on('tileload',()=>{tileLoaded=true;failure.hidden=true;});
tile.on('tileerror',()=>{if(!tileLoaded)failure.hidden=false;});
tile.addTo(map);

function scoreOf(v){return Number.isFinite(v?.best?.selectionScore)?v.best.selectionScore:Number.isFinite(v?.best?.score)?v.best.score:-9999;}
function markerIcon(active=false){
  return L.divIcon({className:'',html:`<div class="park-marker ${active?'active':''}"></div>`,iconSize:active?[30,40]:[24,32],iconAnchor:active?[15,38]:[12,30]});
}
function setActiveMarker(id){
  markers.forEach((marker,key)=>marker.setIcon(markerIcon(key===id)));
  document.querySelectorAll('.park-pill').forEach(el=>el.classList.toggle('active',el.dataset.id===id));
}
function renderIntents(){
  const root=document.getElementById('intentList');
  root.innerHTML=INTENTS.map(i=>`<button class="intent-chip ${i.id===currentIntent?'active':''}" data-id="${i.id}" type="button">${i.label}</button>`).join('');
  root.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',async()=>{
    currentIntent=btn.dataset.id;
    localStorage.setItem('eonje.intent',currentIntent);
    const url=new URL(location.href);url.searchParams.set('intent',currentIntent);history.replaceState(null,'',url);
    cache.clear();renderIntents();await refreshOverview(true);
  }));
}
async function getVerdict(place){
  const key=`${place.id}:${currentIntent}`;
  if(cache.has(key))return cache.get(key);
  const response=await fetch(`/api/verdict?place=${encodeURIComponent(place.id)}&intent=${encodeURIComponent(currentIntent)}`,{headers:{accept:'application/json'}});
  if(!response.ok)throw new Error('verdict fetch failed');
  const payload=await response.json();
  const result={place,verdict:payload.verdict,data:payload.data};cache.set(key,result);return result;
}
function reasonMarkup(reasons=[]){
  return reasons.slice(0,3).map(r=>`<div class="panel-reason"><b>${r.title}</b><span>${r.detail||''}</span></div>`).join('');
}
function panelMarkup(result){
  const {place,verdict}=result;
  const time=verdict.windowLabel||(verdict.status==='avoid'?'오늘은 패스':'오늘 추천 종료');
  return `<span class="recommend-chip">${verdict.status==='go'?'추천':'확인'}</span>
    <h2>${place.name}</h2>
    <p>${verdict.headline||verdict.subhead||'오늘 조건을 비교했어요.'}</p>
    <div class="panel-time-wrap"><div class="panel-time-label">◷ 가장 좋은 시간</div><div class="panel-time"><strong>${time}</strong><span>${currentIntent==='sunset'?'☀ 노을':''}</span></div></div>
    <div class="panel-reasons">${reasonMarkup(verdict.reasons)}</div>
    <a class="panel-action" href="/?intent=${encodeURIComponent(currentIntent)}">이 공원 추천 보기</a>`;
}
function renderStrip(results){
  const root=document.getElementById('parkStrip');
  const sorted=[...results].sort((a,b)=>scoreOf(b.verdict)-scoreOf(a.verdict));
  const current=sorted.find(r=>r.place.id===currentPlace);
  const choices=[current,...sorted.filter(r=>r.place.id!==currentPlace)].filter(Boolean).slice(0,3);
  root.innerHTML=choices.map(r=>`<button type="button" class="park-pill ${r.place.id===currentPlace?'active':''}" data-id="${r.place.id}"><strong>${r.place.name}</strong><span>${r.verdict.windowLabel||'오늘 조건 보기'}</span><em>${r.verdict.status==='go'?'좋아요':r.verdict.status==='avoid'?'아쉬워요':'확인'}</em></button>`).join('');
  root.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>selectPark(btn.dataset.id)));
}
async function selectPark(id,{pan=true,refreshStrip=true}={}){
  const place=PLACES.find(p=>p.id===id);if(!place)return;
  currentPlace=id;localStorage.setItem('eonje.place',id);
  const url=new URL(location.href);url.searchParams.set('place',id);url.searchParams.set('intent',currentIntent);history.replaceState(null,'',url);
  setActiveMarker(id);
  if(pan)map.panTo([place.lat,place.lon],{animate:true});
  const panel=document.getElementById('parkPanel');
  panel.innerHTML=`<span class="recommend-chip">확인 중</span><h2>${place.name}</h2><p>날씨·혼잡·일몰을 함께 비교하고 있어요.</p>`;
  try{
    const result=await getVerdict(place);panel.innerHTML=panelMarkup(result);
    if(refreshStrip){const results=(await Promise.allSettled(PLACES.map(getVerdict))).filter(x=>x.status==='fulfilled').map(x=>x.value);renderStrip(results);}
  }catch{
    panel.innerHTML=`<span class="recommend-chip">오류</span><h2>${place.name}</h2><p>추천 데이터는 불러오지 못했지만 지도 위치는 그대로 확인할 수 있어요.</p>`;
  }
}
async function refreshOverview(selectBest=false){
  const settled=await Promise.allSettled(PLACES.map(getVerdict));
  const results=settled.filter(x=>x.status==='fulfilled').map(x=>x.value);
  if(!results.length){await selectPark(currentPlace,{refreshStrip:false});return;}
  if(selectBest){const go=results.filter(r=>r.verdict?.status==='go');const winner=[...(go.length?go:results)].sort((a,b)=>scoreOf(b.verdict)-scoreOf(a.verdict))[0];if(winner)currentPlace=winner.place.id;}
  renderStrip(results);await selectPark(currentPlace,{pan:false,refreshStrip:false});
}

PLACES.forEach(place=>{
  const marker=L.marker([place.lat,place.lon],{icon:markerIcon(place.id===currentPlace),title:place.name}).addTo(map);
  marker.on('click',()=>selectPark(place.id,{pan:false}));markers.set(place.id,marker);
});
const bounds=L.latLngBounds(PLACES.map(p=>[p.lat,p.lon]));map.fitBounds(bounds.pad(.1),{padding:[34,34]});
renderIntents();
refreshOverview(!params.get('place'));
setTimeout(()=>map.invalidateSize(),50);
