const KNOWN_CROWD = new Set(['여유', '보통', '약간 붐빔', '붐빔']);

function hasKnownCrowd(slot) {
  return Boolean(slot && KNOWN_CROWD.has(slot.crowd));
}

function minutesBetween(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000;
}

function appendDetail(existing, detail) {
  if (!detail) return existing || null;
  if (!existing) return detail;
  return existing.includes(detail) ? existing : `${existing} · ${detail}`;
}

function hasExpiredCurrentAir(slot, current) {
  if (slot?.provenance?.air !== 'current_observation' || !slot?.time) return false;
  const observedAt = slot.provenance.airObservedAt || current?.time;
  return !observedAt || minutesBetween(slot.time, observedAt) > 90;
}

export function sanitizeVerdict(verdict, data = {}) {
  if (!verdict || verdict.status !== 'go') return verdict;

  const next = {
    ...verdict,
    reasons: Array.isArray(verdict.reasons) ? [...verdict.reasons] : [],
    alternative: verdict.alternative ? { ...verdict.alternative } : null
  };

  const best = verdict.best;
  const current = data.current;
  const startMs = new Date(verdict.start).getTime();
  const endMs = new Date(verdict.end).getTime();
  const windowSlots = Array.isArray(verdict.scored) && Number.isFinite(startMs) && Number.isFinite(endMs)
    ? verdict.scored.filter((slot) => {
      const time = new Date(slot.time).getTime();
      return Number.isFinite(time) && time >= startMs && time < endMs;
    })
    : [];
  const supportSlots = windowSlots.length ? windowSlots : [best].filter(Boolean);

  // Never turn "unknown" crowd into a comparative claim. Unknown is not quieter,
  // busier, or equivalent to any observed/forecast congestion level.
  if (supportSlots.some((slot) => !hasKnownCrowd(slot))) {
    next.reasons = next.reasons.filter((reason) => reason?.icon !== 'people');
  }

  if (next.alternative?.type === 'crowd') {
    const candidate = verdict.scored?.find((slot) => slot.time === next.alternative.time);
    if (!hasKnownCrowd(best) || !hasKnownCrowd(candidate)) next.alternative = null;
  }
  if (next.alternative && (!hasKnownCrowd(best) || !hasKnownCrowd(verdict.scored?.find((slot) => slot.time === next.alternative.time)))) {
    if (/사람|붐/.test(next.alternative.tradeoff || '')) {
      next.alternative.tradeoff = '전체 조건은 기본 추천이 조금 더 낫다.';
    }
  }

  // A current air-quality observation can still protect as a safety gate, but it
  // must not be phrased as a future-hour benefit when the recommended slot is far away.
  const missingFutureAir = supportSlots.some((slot) => hasExpiredCurrentAir(slot, current));
  if (missingFutureAir) {
    next.reasons = next.reasons.filter((reason) => reason?.icon !== 'air');
  }

  const missing = [];
  if (supportSlots.some((slot) => !hasKnownCrowd(slot))) missing.push('추천 구간 혼잡 예측 없음');
  if (supportSlots.some((slot) => !Number.isFinite(slot?.wind))) missing.push('추천 구간 풍속 예보 없음');
  if (supportSlots.some((slot) => !Number.isFinite(slot?.temp))) missing.push('추천 구간 기온 예보 없음');
  if (supportSlots.some((slot) => !Number.isFinite(slot?.rainChance) || !Number.isFinite(slot?.precipitation))) missing.push('추천 구간 강수 예보 불완전');
  if (missingFutureAir) missing.push('추천 구간 대기질 예보 없음');

  // Crowd is 34% of utility, and weather includes wind. Missing either materially
  // weakens a "high confidence" claim even if the available components score well.
  if (missing.length && next.confidence === '높음') {
    next.confidence = '보통';
  }
  if (data.quality?.state === 'stale') {
    if (next.confidence === '높음') next.confidence = '보통';
    next.confidenceDetail = appendDetail(next.confidenceDetail, `원천 데이터 ${data.quality.ageMinutes}분 지연`);
  }
  if (missing.length) next.confidenceDetail = appendDetail(next.confidenceDetail, missing.join(' · '));

  return next;
}
