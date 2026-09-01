const CROWD_ADJ = {
  '여유': 3,
  '보통': 1,
  '약간 붐빔': -2,
  '붐빔': -5
};

export const OUTING_INTENTS = {
  general: { label:'그냥 바람 쐬기', short:'바람 쐬기' },
  picnic: { label:'피크닉', short:'피크닉' },
  run: { label:'러닝', short:'러닝' },
  sunset: { label:'노을 보기', short:'노을' }
};

export function normalizeIntent(intent) {
  return Object.hasOwn(OUTING_INTENTS, intent) ? intent : 'general';
}

function seoulHour(iso) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone:'Asia/Seoul', hour:'2-digit', hourCycle:'h23'
  }).formatToParts(new Date(iso));
  const value = Number(parts.find((p) => p.type === 'hour')?.value);
  return Number.isFinite(value) ? value : null;
}

function minutesFromSunset(time, sunset) {
  if (!sunset) return null;
  const value = (new Date(time).getTime() - new Date(sunset).getTime()) / 60000;
  return Number.isFinite(value) ? value : null;
}

function comfortableTemp(temp, min, max, shoulder = 3) {
  if (!Number.isFinite(temp)) return 0;
  if (temp >= min && temp <= max) return 3;
  if (temp >= min - shoulder && temp <= max + shoulder) return 1;
  return -3;
}

export function intentAdjustment(slot, intentInput, sunset = null) {
  const intent = normalizeIntent(intentInput);
  if (intent === 'general') return 0;

  const hour = seoulHour(slot.time);
  const crowd = CROWD_ADJ[slot.crowd] ?? 0;
  const rain = Number.isFinite(slot.rainChance) ? slot.rainChance : null;
  const wind = Number.isFinite(slot.wind) ? slot.wind : null;
  let adjustment = 0;

  if (intent === 'picnic') {
    adjustment += crowd * 0.9;
    adjustment += comfortableTemp(slot.temp, 19, 27);
    if (rain !== null) adjustment += rain <= 20 ? 3 : rain >= 50 ? -4 : 0;
    if (wind !== null) adjustment += wind <= 4 ? 2 : wind >= 7 ? -3 : 0;
    if (hour !== null && (hour >= 22 || hour < 7)) adjustment -= 5;
  }

  if (intent === 'run') {
    adjustment += comfortableTemp(slot.temp, 12, 22, 4) * 1.2;
    if (rain !== null) adjustment += rain <= 25 ? 2 : rain >= 60 ? -3 : 0;
    if (wind !== null) adjustment += wind <= 4 ? 2 : wind >= 8 ? -3 : 0;
    if (hour !== null && ((hour >= 6 && hour <= 9) || (hour >= 18 && hour <= 22))) adjustment += 3;
    adjustment += crowd * 0.35;
  }

  if (intent === 'sunset') {
    const d = minutesFromSunset(slot.time, sunset);
    if (d !== null) {
      if (d >= -45 && d <= 20) adjustment += 10;
      else if (d >= -90 && d <= 45) adjustment += 5;
      else if (Math.abs(d) >= 180) adjustment -= 5;
    }
    adjustment += crowd * 0.35;
    if (rain !== null && rain >= 50) adjustment -= 3;
  }

  return Math.max(-10, Math.min(12, Math.round(adjustment * 10) / 10));
}

export function applyIntentToSlots(slots, intentInput, sunset = null) {
  const intent = normalizeIntent(intentInput);
  if (intent === 'general') return slots;
  return slots.map((slot) => ({
    ...slot,
    eventImpact:(Number.isFinite(slot.eventImpact) ? slot.eventImpact : 0) + intentAdjustment(slot, intent, sunset)
  }));
}

function timeLabel(iso) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Asia/Seoul'
  }).format(new Date(iso));
}

export function decorateIntentVerdict(verdict, intentInput, sunset = null) {
  const intent = normalizeIntent(intentInput);
  if (!verdict || intent === 'general') return { ...verdict, intent };
  const label = OUTING_INTENTS[intent].short;

  if (verdict.status === 'avoid') {
    return {
      ...verdict,
      intent,
      headline:`오늘 ${label}은 접는 편이 낫다.`,
      subhead:`${label} 기준으로 남은 시간대를 비교했지만 추천할 만한 구간이 없다.`
    };
  }

  if (verdict.status !== 'go' || !verdict.best) return { ...verdict, intent };

  const reasons = Array.isArray(verdict.reasons) ? [...verdict.reasons] : [];
  let intentReason = null;
  if (intent === 'picnic') {
    intentReason = { icon:'people', title:'피크닉 기준으로 고른 시간', detail:`${verdict.best.crowd ?? '혼잡 미확인'} · ${verdict.best.temp ?? '—'}°` };
  } else if (intent === 'run') {
    intentReason = { icon:'temp', title:'러닝하기 상대적으로 편한 구간', detail:`${verdict.best.temp ?? '—'}° · 바람 ${verdict.best.wind ?? '—'}m/s` };
  } else if (intent === 'sunset' && sunset) {
    intentReason = { icon:'sun', title:'노을 타이밍을 우선함', detail:`일몰 ${timeLabel(sunset)}` };
  }

  if (intentReason && !reasons.some((r) => r.title === intentReason.title)) reasons.unshift(intentReason);
  return {
    ...verdict,
    intent,
    subhead:`${label} 기준 · ${verdict.subhead}`,
    reasons:reasons.slice(0, 3)
  };
}
