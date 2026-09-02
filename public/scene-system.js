export const SEASONS=['spring','summer','autumn','winter'];
export const DAYPARTS=['dawn','morning','day','afternoon','evening','night'];

export function seasonFor(date=new Date()){
  const month=new Intl.DateTimeFormat('en-US',{month:'numeric',timeZone:'Asia/Seoul'}).format(date);
  const m=Number(month);
  if(m>=3&&m<=5)return 'spring';
  if(m>=6&&m<=8)return 'summer';
  if(m>=9&&m<=11)return 'autumn';
  return 'winter';
}

export function daypartFor(date=new Date()){
  const hour=Number(new Intl.DateTimeFormat('en-US',{hour:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(date));
  if(hour>=4&&hour<7)return 'dawn';
  if(hour>=7&&hour<11)return 'morning';
  if(hour>=11&&hour<15)return 'day';
  if(hour>=15&&hour<17)return 'afternoon';
  if(hour>=17&&hour<21)return 'evening';
  return 'night';
}

export function applySceneState(target,placeId,date=new Date(),forcedDaypart){
  if(!target)return;
  target.dataset.place=placeId||'default';
  target.dataset.season=seasonFor(date);
  target.dataset.daypart=forcedDaypart||daypartFor(date);
}

export function sceneState(placeId,date=new Date(),forcedDaypart){
  return {place:placeId||'default',season:seasonFor(date),daypart:forcedDaypart||daypartFor(date)};
}
