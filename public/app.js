import { PLACES, getPlace } from '/module/places.mjs';

const $ = (id) => document.getElementById(id);
const savedPlace = localStorage.getItem('eonje.place');
const urlPlace = new URL(location.href).searchParams.get('place');
let currentPlace = PLACES.some((p) => p.id === urlPlace) ? urlPlace : PLACES.some((p) => p.id === savedPlace) ? savedPlace : 'yeouido';
let currentVerdict = null;
let currentData = null;
let toastTimer = null;

const ICONS = {
  people: '<svg viewBox="0 0 24 24"><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20"/><circle cx="9.5" cy="7.5" r="3.5"/><path d="M17 11a3 3 0 1 0 0-6M21 20v-1.5a4 4 0 0 0-3-3.7"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  rain: '<svg viewBox="0 0 24 24"><path d="M7 16a5 5 0 0 1 .7-10 6 6 0 0 1 11 3.3A3.7 3.7 0 0 1 18 16H7Z"/><path d="m8 19-1 2M13 19l-1 2M18 19l-1 2"/></svg>',
  temp: '<svg viewBox="0 0 24 24"><path d="M14 14.8V5a3 3 0 0 0-6 0v9.8a5 5 0 1 0 6 0Z"/><path d="M11 7v9"/></svg>',
  air: '<svg viewBox="0 0 24 24"><path d="M4 8h10a2.5 2.5 0 1 0-2.2-3.7M4 12h15a2.5 2.5 0 1 1-2.2 3.7M4 16h6"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>'
};

function formatTime(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('ko-KR', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Asia/Seoul' }).format(new Date(iso));
}

function formatDateTime(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('ko-KR', { month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Asia/Seoul' }).format(new Date(iso));
}

function showToast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2100);
}

function setUrlPlace(id) {
  const url = new URL(location.href);
  url.searchParams.set('place', id);
  history.replaceState(null, '', url);
  localStorage.setItem('eonje.place', id);
}

function renderPlaces() {
  $('placeList').innerHTML = PLACES.map((p) => `
    <button class="place-option ${p.id === currentPlace ? 'active' : ''}" type="button" data-id="${p.id}">
      <div><strong>${p.name}</strong><br><span>${p.shortName} · 오늘 시간 추천</span></div>
      ${p.id === currentPlace ? '<svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>' : ''}
    </button>`).join('');

  document.querySelectorAll('.place-option').forEach((btn) => btn.addEventListener('click', () => {
    currentPlace = btn.dataset.id;
    setUrlPlace(currentPlace);
    $('placeDialog').close();
    load();
  }));
}

function renderReasons(reasons = []) {
  $('reasons').innerHTML = reasons.map((r) => `
    <div class="reason">
      <span class="reason-icon" aria-hidden="true">${ICONS[r.icon] ?? ICONS.warn}</span>
      <span class="reason-title">${r.title}</span>
      <span class="reason-detail">${r.detail ?? ''}</span>
    </div>`).join('');
}

function renderTimeline(scored = [], bestTime) {
  $('timeline').innerHTML = scored.map((s) => `
    <div class="time-slot ${s.time === bestTime ? 'best' : ''} ${s.gated ? 'gated' : ''}">
      <div class="slot-time">
        <span>${formatTime(s.time)}</span>
        ${s.time === bestTime ? '<span class="best-mark">BEST</span>' : ''}
      </div>
      ${s.gated
        ? `<div class="slot-gate">${s.gate || '추천 제외'}</div>`
        : `<div class="slot-crowd">${s.crowd}</div><div class="slot-meta">${s.temp}° · 비 ${s.rainChance ?? 0}%<br>바람 ${s.wind ?? '—'}m/s</div>`}
    </div>`).join('');
}

function renderSummary(verdict) {
  const best = verdict.best;
  if (!best) { $('detailSummary').innerHTML = ''; return; }
  $('detailSummary').innerHTML = `
    <div class="metric"><span class="metric-label">혼잡</span><span class="metric-value">${best.crowd}</span></div>
    <div class="metric"><span class="metric-label">체감 조건</span><span class="metric-value">${best.temp}° · 바람 ${best.wind ?? '—'}</span></div>
    <div class="metric"><span class="metric-label">비</span><span class="metric-value">${best.rainChance ?? 0}%</span></div>`;
}

function confidenceLabel(value) {
  if (value === '높음') return '판단 근거 충분';
  if (value === '보통') return '판단 근거 보통';
  return '조건 차이 작음';
}

function sourceText(data) {
  if (data.mode === 'live') return `데이터 출처: ${data.source || '서울특별시 실시간 도시데이터'}`;
  return '현재 화면은 데모 데이터로 동작 중';
}

function renderVerdict(place, data, verdict) {
  document.body.dataset.state = 'ready';
  document.body.dataset.mode = data.mode === 'live' ? 'live' : 'demo';
  document.body.dataset.status = verdict.status;
  $('answer').setAttribute('aria-busy', 'false');
  $('placeName').textContent = place.name;
  $('modeLabel').innerHTML = `<i></i><span>${data.mode === 'live' ? '실시간' : '데모'}</span>`;
  $('updatedLabel').textContent = data.updatedAt ? `${formatTime(data.updatedAt)} 업데이트` : '';
  $('headline').textContent = verdict.headline;
  $('windowLabel').textContent = verdict.windowLabel ?? (verdict.status === 'avoid' ? '오늘은 패스' : '내일 다시');
  $('subhead').textContent = verdict.subhead;
  renderReasons(verdict.reasons);
  $('confidence').textContent = verdict.status === 'go' ? confidenceLabel(verdict.confidence) : verdict.status === 'avoid' ? '오늘 추천 제외' : '오늘 추천 종료';
  renderTimeline(verdict.scored, verdict.best?.time);
  renderSummary(verdict);
  $('sourceLabel').textContent = sourceText(data);
  $('calendarButton').disabled = verdict.status !== 'go';
  $('bestHint').textContent = verdict.best ? `${formatTime(verdict.best.time)}가 가장 나음` : '추천 제외 시간 표시';
}

function renderError(error) {
  document.body.dataset.state = 'error';
  $('answer').hidden = true;
  $('details').hidden = true;
  $('errorPanel').hidden = false;
  $('errorMessage').textContent = error?.message || '잠시 뒤 다시 시도해 달라.';
}

async function load() {
  const place = getPlace(currentPlace);
  currentVerdict = null;
  currentData = null;
  document.body.dataset.state = 'loading';
  $('answer').hidden = false;
  $('errorPanel').hidden = true;
  $('answer').setAttribute('aria-busy', 'true');
  $('placeName').textContent = place.name;
  $('details').hidden = true;
  $('whyButton').setAttribute('aria-expanded', 'false');
  renderPlaces();

  try {
    const res = await fetch(`/api/verdict?place=${encodeURIComponent(currentPlace)}`, { headers:{ accept:'application/json' } });
    if (!res.ok) throw new Error(`데이터 서버 응답 오류 (${res.status})`);
    const payload = await res.json();
    const data = payload.data;
    const verdict = payload.verdict;
    currentData = data;
    currentVerdict = verdict;
    renderVerdict(place, data, verdict);
  } catch (error) {
    console.error(error);
    renderError(error);
  }
}

function escapeIcs(text = '') {
  return String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function icsUtc(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function downloadCalendar() {
  if (!currentVerdict?.best || currentVerdict.status !== 'go') return;
  const place = getPlace(currentPlace);
  const reasons = currentVerdict.reasons.map((r) => `${r.title} (${r.detail})`).join('\n');
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//eonje//recommendation//KO', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${place.id}@eonje.local`,
    `DTSTAMP:${icsUtc(new Date().toISOString())}`,
    `DTSTART:${icsUtc(currentVerdict.start)}`,
    `DTEND:${icsUtc(currentVerdict.end)}`,
    `SUMMARY:${escapeIcs(`${place.shortName} 한강 가기`)}`,
    `LOCATION:${escapeIcs(place.name)}`,
    `DESCRIPTION:${escapeIcs(`언제 추천: ${currentVerdict.headline}\n${reasons}`)}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([body], { type:'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eonje-${place.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('캘린더 파일을 만들었다.');
}

async function shareResult() {
  if (!currentVerdict) return;
  const place = getPlace(currentPlace);
  const text = `${place.shortName} 한강은 ${currentVerdict.windowLabel ?? '오늘 패스'} · ${currentVerdict.headline}`;
  const shareData = { title:'언제 — 오늘 한강 언제 가지?', text, url:location.href };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${location.href}`);
    showToast('결과 링크를 복사했다.');
  } catch (error) {
    if (error?.name !== 'AbortError') showToast('공유하지 못했다.');
  }
}

$('placeButton').addEventListener('click', () => $('placeDialog').showModal());
$('placeClose').addEventListener('click', () => $('placeDialog').close());
$('whyButton').addEventListener('click', () => {
  const opening = $('details').hidden;
  $('details').hidden = !opening;
  $('whyButton').setAttribute('aria-expanded', String(opening));
  $('whyButton').querySelector('span').textContent = opening ? '근거 닫기' : '왜 이 시간이야?';
  if (opening) setTimeout(() => $('details').scrollIntoView({ behavior:'smooth', block:'nearest' }), 30);
});
$('calendarButton').addEventListener('click', downloadCalendar);
$('shareButton').addEventListener('click', shareResult);
$('retryButton').addEventListener('click', load);
$('infoButton').addEventListener('click', () => $('infoDialog').showModal());
$('dialogClose').addEventListener('click', () => $('infoDialog').close());
$('placeDialog').addEventListener('click', (event) => {
  if (event.target === $('placeDialog')) $('placeDialog').close();
});
$('infoDialog').addEventListener('click', (event) => {
  if (event.target === $('infoDialog')) $('infoDialog').close();
});

renderPlaces();
load();
