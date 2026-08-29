const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));

export const CROWD_SCORE = {
  '여유': 100,
  '보통': 82,
  '약간 붐빔': 56,
  '붐빔': 24
};

function tempScore(t) {
  if (!Number.isFinite(t)) return 70;
  if (t >= 20 && t <= 26) return 100;
  if (t >= 17 && t < 20) return 90 - (20 - t) * 4;
  if (t > 26 && t <= 29) return 92 - (t - 26) * 9;
  if (t >= 12 && t < 17) return 74 - (17 - t) * 6;
  if (t > 29 && t <= 32) return 58 - (t - 29) * 12;
  return 20;
}

function airScore(pm25 = 20, pm10 = 35) {
  const pm25Score = pm25 <= 15 ? 100 : pm25 <= 35 ? 88 : pm25 <= 75 ? 60 : 20;
  const pm10Score = pm10 <= 30 ? 100 : pm10 <= 80 ? 88 : pm10 <= 150 ? 58 : 20;
  return Math.min(pm25Score, pm10Score);
}

function windScore(wind) {
  // Unknown future wind must not silently become "perfect" weather.
  if (!Number.isFinite(wind)) return 75;
  if (wind <= 3.5) return 100;
  if (wind <= 5) return 86;
  if (wind <= 7) return 62;
  if (wind <= 10) return 35;
  return 10;
}

function rainScore(chance, precipitation) {
  const hasChance = Number.isFinite(chance);
  const hasAmount = Number.isFinite(precipitation);
  if (hasChance && hasAmount) return clamp(100 - chance * 0.62 - Math.min(55, precipitation * 22));
  if (!hasChance && !hasAmount) return 70;
  const knownScore = hasChance
    ? clamp(100 - chance * 0.62)
    : clamp(100 - Math.min(55, precipitation * 22));
  return (knownScore + 70) / 2;
}

function uvScore(uv = 0) {
  if (uv <= 2) return 100;
  if (uv <= 5) return 88;
  if (uv <= 7) return 67;
  if (uv <= 9) return 42;
  return 22;
}

function minutesBetween(a, b) {
  return (new Date(a).getTime() - new Date(b).getTime()) / 60000;
}

function experienceScore(slot, sunsetIso) {
  if (!sunsetIso) return 72;
  const d = minutesBetween(slot.time, sunsetIso);
  if (d >= -45 && d <= 20) return 100;
  if (d > 20 && d <= 70) return 86;
  if (d >= -100 && d < -45) return 86;
  if (d > 70 && d <= 120) return 70;
  return 66;
}

function seoulHour(iso) {
  if (!iso) return null;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone:'Asia/Seoul', hour:'2-digit', hourCycle:'h23' }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  return Number.isFinite(hour) ? hour : null;
}

function timePreferenceAdjustment(slot, intent = 'general') {
  const hour = seoulHour(slot.time);
  if (hour === null) return 0;

  // Time-of-day is a preference, not a safety constraint.
  // The default profile gently reflects mainstream outing behavior without forbidding night use.
  if (intent === 'night') {
    if (hour >= 0 && hour < 5) return 5;
    if (hour >= 22) return 3;
    return 0;
  }

  if (hour >= 0 && hour < 5) return -7;
  if (hour === 5) return -4;
  if (hour === 6 || hour === 7) return -1;
  if (hour === 23) return -2;
  return 0;
}

export function hardGate(slot) {
  if (slot.warning === 'severe') return '기상특보';
  if (Number.isFinite(slot.rainChance) && Number.isFinite(slot.precipitation) && slot.rainChance >= 70 && slot.precipitation >= 0.5) return '비 가능성 높음';
  if (Number.isFinite(slot.precipitation) && slot.precipitation >= 2) return '강한 비';
  if (Number.isFinite(slot.temp) && slot.temp >= 33) return '너무 더움';
  if (Number.isFinite(slot.temp) && slot.temp <= -5) return '너무 추움';
  if ((Number.isFinite(slot.pm25) && slot.pm25 >= 76) || (Number.isFinite(slot.pm10) && slot.pm10 >= 151)) return '대기질 나쁨';
  if (Number.isFinite(slot.wind) && slot.wind >= 11) return '바람이 너무 강함';
  return null;
}

export function scoreSlot(slot, context = {}) {
  const gate = hardGate(slot);
  if (gate) return { score: -999, gated: true, gate, components: {} };

  // Only time-varying inputs should materially determine *when* to go.
  // Air quality remains a safety gate until we have trustworthy hourly forecasts.
  const weather = (
    tempScore(slot.temp) * 0.40 +
    rainScore(slot.rainChance, slot.precipitation) * 0.40 +
    windScore(slot.wind) * 0.20
  );
  const crowd = CROWD_SCORE[slot.crowd] ?? 70;
  const experience = experienceScore(slot, context.sunset);
  // Optional inputs must never poison the total with NaN/Infinity.
  const eventAdjustment = Number.isFinite(slot.eventImpact) ? slot.eventImpact : 0;
  const timeAdjustment = timePreferenceAdjustment(slot, context.intent || 'general');
  const score = clamp(weather * 0.46 + crowd * 0.34 + experience * 0.20 + eventAdjustment + timeAdjustment);
  return {
    score: Math.round(score * 10) / 10,
    gated: false,
    components: {
      weather: Math.round(weather),
      crowd: Math.round(crowd),
      experience: Math.round(experience),
      timePreference: timeAdjustment
    }
  };
}

function seoulDateKey(iso) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul'
  }).format(new Date(iso));
}

function outingDayKey(iso) {
  // Treat 00:00–05:59 as part of the previous evening's outing day.
  // This lets a 23:00 query naturally consider 01:00–03:00 without asking for a special night mode.
  const shifted = new Date(new Date(iso).getTime() - 6 * 60 * 60 * 1000);
  return seoulDateKey(shifted.toISOString());
}

function timeLabel(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }).format(d);
}

function crowdRank(crowd) {
  return ['여유', '보통', '약간 붐빔', '붐빔'].indexOf(crowd);
}

function worstCrowd(slots) {
  if (!slots.length || slots.some((slot) => crowdRank(slot.crowd) < 0)) return null;
  return slots.reduce((worst, slot) => crowdRank(slot.crowd) > crowdRank(worst) ? slot.crowd : worst, slots[0].crowd);
}

function rangeDetail(values, suffix = '') {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? `${min}${suffix}` : `${min}–${max}${suffix}`;
}

function buildReasons(windowSlots, best, now, context) {
  const reasons = [];
  const windowCrowd = worstCrowd(windowSlots);
  const bestCrowdRank = crowdRank(windowCrowd);
  const nowCrowdRank = crowdRank(now?.crowd);
  if (bestCrowdRank >= 0 && nowCrowdRank >= 0 && bestCrowdRank + 1 <= nowCrowdRank) {
    reasons.push({ icon: 'people', title: '구간 내내 지금보다 한산함', detail: `${now.crowd} → 최대 ${windowCrowd}` });
  } else if (windowCrowd === '여유' || windowCrowd === '보통') {
    reasons.push({ icon: 'people', title: '구간 내내 크게 붐비지 않음', detail: `최대 ${windowCrowd}` });
  }

  const dSun = context.sunset ? minutesBetween(best.time, context.sunset) : null;
  if (dSun !== null && dSun >= -45 && dSun <= 25) {
    reasons.push({ icon: 'sun', title: '해질 무렵과 겹침', detail: `일몰 ${timeLabel(context.sunset)}` });
  }

  const rainChances = windowSlots.map((slot) => slot.rainChance);
  if (rainChances.length && rainChances.every(Number.isFinite) && Math.max(...rainChances) <= 30) {
    const windowEndMs = Math.max(...windowSlots.map((slot) => new Date(slot.time).getTime())) + 60 * 60 * 1000;
    const laterRain = context.slots?.find((s) => new Date(s.time).getTime() >= windowEndMs && Number.isFinite(s.rainChance) && s.rainChance >= 60);
    reasons.push({
      icon: 'rain',
      title: laterRain ? '비 오기 전에 끝낼 수 있음' : '비 걱정이 적음',
      detail: `구간 최대 강수확률 ${Math.max(...rainChances)}%`
    });
  }

  const temperatures = windowSlots.map((slot) => slot.temp);
  if (reasons.length < 3 && temperatures.length && temperatures.every(Number.isFinite) && Math.min(...temperatures) >= 20 && Math.max(...temperatures) <= 27) {
    reasons.push({ icon: 'temp', title: '구간 내내 걷기 좋은 온도', detail: rangeDetail(temperatures, '°') });
  }
  const pm25Values = windowSlots.map((slot) => slot.pm25);
  if (reasons.length < 3 && pm25Values.length && pm25Values.every(Number.isFinite) && Math.max(...pm25Values) <= 35) {
    reasons.push({ icon: 'air', title: '공기도 무난함', detail: `구간 최대 초미세먼지 ${Math.max(...pm25Values)}` });
  }
  return reasons.slice(0, 3);
}

function describeAlternative(candidate, best) {
  const crowdGain = (candidate.components?.crowd ?? 0) - (best.components?.crowd ?? 0);
  const experienceGain = (candidate.components?.experience ?? 0) - (best.components?.experience ?? 0);
  const weatherGain = (candidate.components?.weather ?? 0) - (best.components?.weather ?? 0);

  const options = [
    { key:'crowd', gain:crowdGain, threshold:18, label:'한적함이 더 중요하면', reason:`${candidate.crowd} · ${timeLabel(candidate.time)}` },
    { key:'experience', gain:experienceGain, threshold:14, label:'분위기가 더 중요하면', reason:`${timeLabel(candidate.time)} · 일몰 쪽` },
    { key:'weather', gain:weatherGain, threshold:12, available:Number.isFinite(candidate.temp) && Number.isFinite(candidate.rainChance), label:'날씨 편안함이 더 중요하면', reason:`${candidate.temp}° · 비 ${candidate.rainChance}%` }
  ].filter((x) => x.available !== false && x.gain >= x.threshold).sort((a,b) => b.gain - a.gain);

  if (!options.length) return null;
  const chosen = options[0];
  let tradeoff = '전체 조건은 기본 추천이 조금 더 낫다.';
  if (chosen.key === 'crowd' && (best.components?.experience ?? 0) - (candidate.components?.experience ?? 0) >= 14) {
    tradeoff = '대신 노을·분위기는 기본 추천보다 약하다.';
  } else if (chosen.key === 'experience' && (best.components?.crowd ?? 0) - (candidate.components?.crowd ?? 0) >= 18) {
    tradeoff = '대신 기본 추천보다 더 붐빌 수 있다.';
  } else if (chosen.key === 'weather' && (best.components?.crowd ?? 0) - (candidate.components?.crowd ?? 0) >= 18) {
    tradeoff = '대신 사람은 기본 추천보다 많을 수 있다.';
  }

  return {
    type: chosen.key,
    label: chosen.label,
    time: candidate.time,
    timeLabel: timeLabel(candidate.time),
    reason: chosen.reason,
    tradeoff,
    scoreGap: Math.round((best.score - candidate.score) * 10) / 10
  };
}

function findMeaningfulAlternative(scored, bestIndex, primaryWindow) {
  const best = scored[bestIndex];
  const bestMs = new Date(best.time).getTime();
  let winner = null;

  scored.forEach((candidate, index) => {
    if (candidate.gated || index === bestIndex) return;
    if (index >= primaryWindow.left && index <= primaryWindow.right) return;
    const distanceMinutes = Math.abs(new Date(candidate.time).getTime() - bestMs) / 60000;
    if (distanceMinutes < 90) return;
    const scoreGap = best.score - candidate.score;
    if (scoreGap < -0.1 || scoreGap > 11) return;

    const described = describeAlternative(candidate, best);
    if (!described) return;
    const strongestGain = Math.max(
      (candidate.components?.crowd ?? 0) - (best.components?.crowd ?? 0),
      (candidate.components?.experience ?? 0) - (best.components?.experience ?? 0),
      (candidate.components?.weather ?? 0) - (best.components?.weather ?? 0)
    );
    const utility = strongestGain - scoreGap * 0.75;
    if (!winner || utility > winner.utility) winner = { ...described, utility };
  });

  if (!winner) return null;
  const { utility, ...alternative } = winner;
  return alternative;
}

function contiguousWindow(scored, bestIndex, tolerance = 5.5) {
  const best = scored[bestIndex];
  let left = bestIndex;
  let right = bestIndex;
  const adjacent = (earlier, later) => {
    const delta = new Date(later.time).getTime() - new Date(earlier.time).getTime();
    return Number.isFinite(delta) && delta > 0 && delta <= 61 * 60 * 1000;
  };
  while (left > 0 && adjacent(scored[left - 1], scored[left]) && !scored[left - 1].gated && best.score - scored[left - 1].score <= tolerance) left--;
  while (right < scored.length - 1 && adjacent(scored[right], scored[right + 1]) && !scored[right + 1].gated && best.score - scored[right + 1].score <= tolerance) right++;
  return { left, right };
}

export function makeVerdict({ place, slots, sunset, nowTime, current = null, intent = 'general' }) {
  if (!slots?.length) throw new Error('slots are required');
  const nowIso = nowTime || current?.time || slots[0].time;
  const nowMs = new Date(nowIso).getTime();
  const today = outingDayKey(nowIso);
  // A slot represents roughly the following hour. Keep the current hour if it is still in progress.
  // The outing-day boundary is 06:00, not calendar midnight.
  const remainingToday = slots.filter((slot) => {
    const t = new Date(slot.time).getTime();
    return Number.isFinite(t) && outingDayKey(slot.time) === today && t + 60 * 60 * 1000 > nowMs;
  });
  if (!remainingToday.length) {
    return { status: 'done', headline: '오늘은 시간이 다 갔다.', subhead: '내일 다시 보는 게 낫다.', scored: [], reasons: [] };
  }
  const scored = remainingToday.map((slot) => ({ ...slot, ...scoreSlot(slot, { sunset, intent }) }));
  const valid = scored.filter((s) => !s.gated);
  if (!valid.length) {
    return {
      status: 'avoid',
      headline: '오늘은 굳이 안 가는 게 낫다.',
      subhead: '날씨나 환경 조건이 좋지 않다.',
      scored,
      reasons: scored.slice(0, 3).map((s) => ({ icon: 'warn', title: s.gate || '조건 나쁨', detail: timeLabel(s.time) }))
    };
  }

  let bestIndex = scored.findIndex((slot) => !slot.gated && Number.isFinite(slot.score));
  if (bestIndex < 0) {
    return {
      status: 'avoid', headline: '오늘은 추천을 계산하기 어렵다.',
      subhead: '유효한 시간대별 데이터가 부족하다.', scored, reasons: []
    };
  }
  scored.forEach((s, i) => {
    if (!s.gated && Number.isFinite(s.score) && s.score > scored[bestIndex].score) bestIndex = i;
  });
  const best = scored[bestIndex];
  const window = contiguousWindow(scored, bestIndex);
  const windowSlots = scored.slice(window.left, window.right + 1);
  const alternative = findMeaningfulAlternative(scored, bestIndex, window);
  const start = scored[window.left].time;
  // A slot covers the following hour. Derive the end from the selected slot
  // itself; the next array element may be hours away when upstream has gaps.
  const end = new Date(new Date(scored[window.right].time).getTime() + 60 * 60000).toISOString();
  const currentHour = scored.find((s) => {
    const t = new Date(s.time).getTime();
    return t <= nowMs && nowMs < t + 60 * 60 * 1000;
  });
  const currentMs = new Date(current?.time).getTime();
  const usableCurrent = Number.isFinite(currentMs) && Math.abs(nowMs - currentMs) <= 90 * 60 * 1000 ? current : null;
  const now = usableCurrent || currentHour || null;
  const waitMinutes = Math.max(0, Math.round((new Date(start).getTime() - nowMs) / 60000));
  const startsNow = new Date(start).getTime() <= nowMs;

  const headline = startsNow
    ? '지금 가는 게 낫다.'
    : waitMinutes >= 180
      ? `${timeLabel(start)}쯤 가는 게 낫다.`
      : waitMinutes > 20
        ? `지금 말고 ${Math.round(waitMinutes / 10) * 10}분 뒤가 낫다.`
        : `${timeLabel(start)}부터 가면 좋다.`;
  const crossesCalendarMidnight = seoulDateKey(start) !== seoulDateKey(nowIso);
  return {
    status: 'go',
    place,
    best,
    scored,
    start,
    end,
    windowLabel: `${startsNow ? '지금' : timeLabel(start)}–${timeLabel(end)}`,
    headline,
    subhead: `${place.shortName}: ${timeLabel(start)}부터가 ${crossesCalendarMidnight ? '오늘 밤의 답' : '오늘의 답'}.`,
    reasons: buildReasons(windowSlots, best, now, { sunset, slots }),
    alternative,
    confidence: Math.min(...windowSlots.map((slot) => slot.score)) >= 86 ? '높음'
      : Math.min(...windowSlots.map((slot) => slot.score)) >= 74 ? '보통' : '낮음'
  };
}
