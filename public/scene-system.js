export const SEASONS=['spring','summer','autumn','winter'];
export const DAYPARTS=['dawn','morning','day','afternoon','evening','night'];
export const THEMES=['none','cherry','festival','fireworks'];

function seoulPart(date,options){return new Intl.DateTimeFormat('en-US',{...options,timeZone:'Asia/Seoul'}).format(date)}
export function seasonFor(date=new Date()){
  const m=Number(seoulPart(date,{month:'numeric'}));
  if(m>=3&&m<=5)return 'spring';
  if(m>=6&&m<=8)return 'summer';
  if(m>=9&&m<=11)return 'autumn';
  return 'winter';
}
export function daypartFor(date=new Date()){
  const hour=Number(seoulPart(date,{hour:'2-digit',hour12:false}));
  if(hour>=4&&hour<7)return 'dawn';
  if(hour>=7&&hour<11)return 'morning';
  if(hour>=11&&hour<15)return 'day';
  if(hour>=15&&hour<17)return 'afternoon';
  if(hour>=17&&hour<21)return 'evening';
  return 'night';
}
export function themeFor(url=globalThis.location?.href){
  if(!url)return 'none';
  try{const t=new URL(url).searchParams.get('theme')||'none';return THEMES.includes(t)?t:'none'}catch{return 'none'}
}
export function applySceneState(target,placeId,date=new Date(),forcedDaypart,forcedTheme){
  if(!target)return;
  target.dataset.place=placeId||'default';
  target.dataset.season=seasonFor(date);
  target.dataset.daypart=forcedDaypart||daypartFor(date);
  target.dataset.theme=forcedTheme||themeFor();
}
export function sceneState(placeId,date=new Date(),forcedDaypart,forcedTheme){
  return {place:placeId||'default',season:seasonFor(date),daypart:forcedDaypart||daypartFor(date),theme:forcedTheme||themeFor()};
}
