import { makeVerdict } from './engine.mjs';
import { sanitizeVerdict } from './verdict-sanitizer.mjs';
import { applyIntentToSlots, decorateIntentVerdict, normalizeIntent } from './intent-policy.mjs';

function seoulParts(iso) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'
  }).formatToParts(new Date(iso));
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

function dateKey(iso) {
  const p = seoulParts(iso);
  return `${p.year}-${p.month}-${p.day}`;
}

function hour(iso) {
  return Number(seoulParts(iso).hour);
}

function timeLabel(iso) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Asia/Seoul'
  }).format(new Date(iso));
}

function toSeoulIso(iso) {
  const p = seoulParts(iso);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+09:00`;
}

function nextDateKey(iso) {
  return dateKey(new Date(new Date(iso).getTime() + 24 * 60 * 60 * 1000).toISOString());
}

function futureSlot(slot, nowMs) {
  const t = new Date(slot.time).getTime();
  return Number.isFinite(t) && t + 60 * 60 * 1000 > nowMs;
}

function headlineFromActualNow(verdict, nowIso) {
  if (verdict?.status !== 'go' || !verdict.start) return verdict;
  const waitMinutes = Math.max(0, Math.round((new Date(verdict.start).getTime() - new Date(nowIso).getTime()) / 60000));
  const startsNow = new Date(verdict.start).getTime() <= new Date(nowIso).getTime();
  const headline = startsNow
    ? '지금 가는 게 낫다.'
    : waitMinutes >= 180
      ? `${timeLabel(verdict.start)}쯤 가는 게 낫다.`
      : waitMinutes > 20
        ? `지금 말고 ${Math.round(waitMinutes / 10) * 10}분 뒤가 낫다.`
        : `${timeLabel(verdict.start)}부터 가면 좋다.`;
  return { ...verdict, headline };
}

function chooseGo(a, b) {
  const decisionScore = (slot) => Number.isFinite(slot?.selectionScore) ? slot.selectionScore : (slot?.score ?? -Infinity);
  if (a?.status === 'go' && b?.status === 'go') return decisionScore(a.best) >= decisionScore(b.best) ? a : b;
  if (a?.status === 'go') return a;
  if (b?.status === 'go') return b;
  if (a?.status === 'avoid' || b?.status === 'avoid') return a?.status === 'avoid' ? a : b;
  return a || b;
}

function compressPrimaryWindow(verdict, nowIso) {
  if (verdict?.status !== 'go' || !Array.isArray(verdict.scored) || !verdict.best?.time) return verdict;
  const bestIndex = verdict.scored.findIndex((slot) => slot.time === verdict.best.time);
  if (bestIndex < 0) return verdict;

  const best = verdict.scored[bestIndex];
  const decisionScore = (slot) => Number.isFinite(slot?.selectionScore) ? slot.selectionScore : slot?.score;
  const neighbors = [bestIndex - 1, bestIndex + 1]
    .filter((i) => i >= 0 && i < verdict.scored.length)
    .map((i) => ({ index:i, slot:verdict.scored[i] }))
    .filter(({ slot }) => {
      const delta = Math.abs(new Date(slot.time).getTime() - new Date(best.time).getTime());
      return delta > 0 && delta <= 61 * 60 * 1000 && !slot.gated
        && Number.isFinite(decisionScore(slot)) && decisionScore(best) - decisionScore(slot) <= 4.0;
    })
    .sort((a, b) => decisionScore(b.slot) - decisionScore(a.slot));

  let start = best.time;
  let end = toSeoulIso(new Date(new Date(best.time).getTime() + 60 * 60 * 1000).toISOString());
  if (neighbors.length) {
    const neighbor = neighbors[0];
    if (neighbor.index < bestIndex) {
      start = neighbor.slot.time;
      end = toSeoulIso(new Date(new Date(best.time).getTime() + 60 * 60 * 1000).toISOString());
    } else {
      start = best.time;
      end = toSeoulIso(new Date(new Date(neighbor.slot.time).getTime() + 60 * 60 * 1000).toISOString());
    }
  }

  const startsNow = new Date(start).getTime() <= new Date(nowIso).getTime();
  const crossesCalendarMidnight = dateKey(start) !== dateKey(nowIso);
  return {
    ...verdict,
    start,
    end,
    windowLabel:`${startsNow ? '지금' : timeLabel(start)}–${timeLabel(end)}`,
    subhead:`${verdict.place?.shortName || ''}: ${timeLabel(start)}부터가 ${crossesCalendarMidnight ? '오늘 밤의 답' : '오늘의 답'}.`
  };
}

function normalizePublicTimes(verdict) {
  if (!verdict) return verdict;
  const normalize = (value) => value && Number.isFinite(new Date(value).getTime()) ? toSeoulIso(value) : value;
  return {
    ...verdict,
    start:normalize(verdict.start),
    end:normalize(verdict.end),
    best:verdict.best ? { ...verdict.best, time:normalize(verdict.best.time) } : verdict.best,
    scored:Array.isArray(verdict.scored) ? verdict.scored.map((slot) => ({ ...slot, time:normalize(slot.time) })) : verdict.scored,
    alternative:verdict.alternative ? { ...verdict.alternative, time:normalize(verdict.alternative.time) } : verdict.alternative
  };
}

function explainWindow(verdict, sunset) {
  if (verdict?.status !== 'go' || !verdict.start || !verdict.end || !sunset) return verdict;
  const startMs = new Date(verdict.start).getTime();
  const endMs = new Date(verdict.end).getTime();
  const sunsetMs = new Date(sunset).getTime();
  if (![startMs, endMs, sunsetMs].every(Number.isFinite) || sunsetMs < startMs || sunsetMs > endMs) return verdict;

  const reasons = Array.isArray(verdict.reasons) ? [...verdict.reasons] : [];
  if (!reasons.some((reason) => reason?.icon === 'sun')) {
    reasons.unshift({ icon:'sun', title:'해질 무렵과 겹침', detail:`일몰 ${timeLabel(sunset)}` });
  }
  return { ...verdict, reasons:reasons.slice(0, 3) };
}

export function makeProductVerdict({ place, slots, sunset, nowTime, current = null, intent = 'general', quality = null }) {
  if (!slots?.length) throw new Error('slots are required');
  const normalizedIntent = normalizeIntent(intent);
  const preferenceSlots = applyIntentToSlots(slots, normalizedIntent, sunset);
  const nowIso = nowTime || current?.time || preferenceSlots[0].time;
  const nowMs = new Date(nowIso).getTime();
  const today = dateKey(nowIso);
  const nowHour = hour(nowIso);
  const tomorrow = nextDateKey(nowIso);
  const future = preferenceSlots.filter((s) => futureSlot(s, nowMs));

  let verdict;
  if (nowHour < 6) {
    const dawn = future.filter((s) => dateKey(s.time) === today && hour(s.time) < 6);
    const daytime = future.filter((s) => dateKey(s.time) === today && hour(s.time) >= 6);
    const dawnVerdict = dawn.length ? makeVerdict({ place, slots:dawn, sunset, nowTime:nowIso, current, intent:normalizedIntent }) : null;
    const dayAnchor = `${today}T06:00:00+09:00`;
    const daytimeVerdict = daytime.length ? makeVerdict({ place, slots:daytime, sunset, nowTime:dayAnchor, current, intent:normalizedIntent }) : null;
    verdict = chooseGo(dawnVerdict, daytimeVerdict);
  } else {
    const horizon = future.filter((s) => {
      const d = dateKey(s.time);
      if (d === today) return true;
      return nowHour >= 18 && d === tomorrow && hour(s.time) < 6;
    });
    verdict = horizon.length
      ? makeVerdict({ place, slots:horizon, sunset, nowTime:nowIso, current, intent:normalizedIntent })
      : { status:'done', headline:'오늘은 시간이 다 갔다.', subhead:'내일 다시 보는 게 낫다.', scored:[], reasons:[] };
  }

  if (!verdict) verdict = { status:'done', headline:'오늘은 시간이 다 갔다.', subhead:'내일 다시 보는 게 낫다.', scored:[], reasons:[] };
  const compact = compressPrimaryWindow(verdict, nowIso);
  const explained = explainWindow(headlineFromActualNow(compact, nowIso), sunset);
  const decorated = decorateIntentVerdict(explained, normalizedIntent, sunset);
  return sanitizeVerdict(normalizePublicTimes(decorated), { current, quality });
}
