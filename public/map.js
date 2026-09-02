import { PLACES } from '/module/places.mjs';

const INTENTS = [
  { id:'general', label:'바람 쐬기' },
  { id:'picnic', label:'피크닉' },
  { id:'run', label:'러닝' },
  { id:'sunset', label:'노을' }
];

let currentIntent = localStorage.getItem('eonje.intent') || 'general';
let currentPlace = new URL(location.href).searchParams.get('place') || localStorage.getItem('eonje.place') || 'yeouido';
const markers = new Map();

const map = L.map('map', { zoomControl:false, attributionControl:true }).setView([37.5288,126.997],12);
L.control.zoom({position:'topright'}).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom:19,
  attribution:'&copy; OpenStreetMap contributors'
}).addTo(map);

function markerIcon(active=false){
  return L.divIcon({
    className:'',
    html:`<div class="park-marker ${active?'active':''}"></div>`,
    iconSize:active?[22,22]:[18,18],
    iconAnchor:active?[11,11]:[9,9]
  });
}

function setActiveMarker(id){
  markers.forEach((marker,key)=>marker.setIcon(markerIcon(key===id)));
  document.querySelectorAll('.park-pill').forEach((el)=>el.classList.toggle('active',el.dataset.id===id));
}

function renderIntents(){
  const root=document.getElementById('intentList');
  root.innerHTML=INTENTS.map((intent)=>`<button class="intent-chip ${intent.id===currentIntent?'active':''}" data-id="${intent.id}" type="button">${intent.label}</button>`).join('');
  root.querySelectorAll('button').forEach((btn)=>btn.addEventListener('click',()=>{
    currentIntent=btn.dataset.id;
    localStorage.setItem('eonje.intent',currentIntent);
    renderIntents();
    selectPark(currentPlace,{pan:false});
  }));
}

function renderStrip(){
  const root=document.getElementById('parkStrip');
  root.innerHTML=PLACES.map((place)=>`<button type="button" class="park-pill ${place.id===currentPlace?'active':''}" data-id="${place.id}"><strong>${place.shortName}</strong><span>오늘 조건 보기</span></button>`).join('');
  root.querySelectorAll('button').forEach((btn)=>btn.addEventListener('click',()=>selectPark(btn.dataset.id)));
}

function reasonMarkup(reasons=[]){
  return reasons.slice(0,3).map((reason)=>`<div class="panel-reason"><b>${reason.title}</b><span>${reason.detail||''}</span></div>`).join('');
}

async function selectPark(id,{pan=true}={}){
  const place=PLACES.find((item)=>item.id===id);
  if(!place)return;
  currentPlace=id;
  localStorage.setItem('eonje.place',id);
  const url=new URL(location.href);
  url.searchParams.set('place',id);
  history.replaceState(null,'',url);
  setActiveMarker(id);
  renderStrip();
  if(pan) map.panTo([place.lat,place.lon],{animate:true});

  const panel=document.getElementById('parkPanel');
  panel.innerHTML=`<p class="panel-kicker">${place.name}</p><h2>오늘 조건을 확인하는 중</h2><p>날씨·혼잡·일몰을 함께 비교하고 있다.</p>`;
  try{
    const response=await fetch(`/api/verdict?place=${encodeURIComponent(id)}&intent=${encodeURIComponent(currentIntent)}`,{headers:{accept:'application/json'}});
    if(!response.ok)throw new Error('verdict fetch failed');
    const payload=await response.json();
    const verdict=payload.verdict;
    const time=verdict.windowLabel || (verdict.status==='avoid'?'오늘은 패스':'오늘 추천 종료');
    panel.innerHTML=`
      <p class="panel-kicker">${place.name}</p>
      <h2>${verdict.headline}</h2>
      <p class="panel-time">${time}</p>
      <p>${verdict.subhead||''}</p>
      <div class="panel-reasons">${reasonMarkup(verdict.reasons)}</div>
      <a class="panel-action" href="/?place=${encodeURIComponent(id)}&intent=${encodeURIComponent(currentIntent)}">이 추천 자세히 보기</a>`;
  }catch{
    panel.innerHTML=`<p class="panel-kicker">${place.name}</p><h2>지금은 추천을 불러오지 못했어.</h2><p>위치는 그대로 확인할 수 있고, 잠시 뒤 다시 선택하면 조건을 다시 불러온다.</p>`;
  }
}

PLACES.forEach((place)=>{
  const marker=L.marker([place.lat,place.lon],{icon:markerIcon(place.id===currentPlace),title:place.name}).addTo(map);
  marker.on('click',()=>selectPark(place.id,{pan:false}));
  markers.set(place.id,marker);
});

const bounds=L.latLngBounds(PLACES.map((place)=>[place.lat,place.lon]));
map.fitBounds(bounds.pad(.12),{padding:[28,28]});
renderIntents();
renderStrip();
selectPark(currentPlace,{pan:false});
