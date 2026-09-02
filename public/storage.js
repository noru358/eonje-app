const SAVED_KEY='eonje.saved.v1';
const RECENT_KEY='eonje.recent.v1';
const CONFIRMED_KEY='eonje.confirmed.v1';
const read=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const keyOf=(p)=>`${p.placeId}|${p.intent}|${p.windowLabel||''}`;
export function getSaved(){return read(SAVED_KEY)}
export function getRecent(){return read(RECENT_KEY)}
export function getConfirmed(){return read(CONFIRMED_KEY,null)}
export function isSaved(plan){const k=keyOf(plan);return getSaved().some(x=>keyOf(x)===k)}
export function isConfirmed(plan){const item=getConfirmed();return Boolean(item&&keyOf(item)===keyOf(plan))}
export function savePlan(plan){const item={...plan,savedAt:new Date().toISOString()};const k=keyOf(item);const next=[item,...getSaved().filter(x=>keyOf(x)!==k)].slice(0,30);write(SAVED_KEY,next);return item}
export function removeSaved(plan){const k=keyOf(plan);write(SAVED_KEY,getSaved().filter(x=>keyOf(x)!==k))}
export function confirmPlan(plan){const item={...plan,confirmedAt:new Date().toISOString()};write(CONFIRMED_KEY,item);return item}
export function clearConfirmed(){localStorage.removeItem(CONFIRMED_KEY)}
export function recordRecent(plan){const item={...plan,viewedAt:new Date().toISOString()};const k=keyOf(item);write(RECENT_KEY,[item,...getRecent().filter(x=>keyOf(x)!==k)].slice(0,24));return item}
export function clearRecent(){write(RECENT_KEY,[])}
