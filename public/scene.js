const month = new Date().getMonth() + 1;
const hour = Number(new Intl.DateTimeFormat('en-US', {
  hour:'2-digit', hour12:false, timeZone:'Asia/Seoul'
}).format(new Date()));

const season = month >= 3 && month <= 5 ? 'spring'
  : month >= 6 && month <= 8 ? 'summer'
  : month >= 9 && month <= 11 ? 'autumn'
  : 'winter';

const daypart = hour >= 20 || hour < 6 ? 'night'
  : hour >= 17 ? 'sunset'
  : 'day';

function currentPlaceId() {
  const url = new URL(location.href);
  return url.searchParams.get('place') || localStorage.getItem('eonje.place') || 'yeouido';
}

function syncScene() {
  document.body.dataset.season = season;
  document.body.dataset.daypart = daypart;
  document.body.dataset.place = currentPlaceId();
}

syncScene();

const originalReplaceState = history.replaceState.bind(history);
history.replaceState = (...args) => {
  const result = originalReplaceState(...args);
  syncScene();
  return result;
};

window.addEventListener('popstate', syncScene);
window.addEventListener('storage', syncScene);
