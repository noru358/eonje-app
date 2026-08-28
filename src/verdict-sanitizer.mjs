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

export function sanitizeVerdict(verdict, data = {}) {
  if (!verdict || verdict.status !== 'go') return verdict;

  const next = {
    ...verdict,
    reasons: Array.isArray(verdict.reasons) ? [...verdict.reasons] : [],
    alternative: verdict.alternative ? { ...verdict.alternative } : null
  };

  const best = verdict.best;
  const current = data.current;

  // Never turn "unknown" crowd into a comparative claim. Unknown is not quieter,
  // busier, or equivalent to any observed/forecast congestion level.
  if (!hasKnownCrowd(best)) {
    next.reasons = next.reasons.filter((reason) => reason?.icon !== 'people');
  }

  if (next.alternative?.type === 'crowd') {
    const candidate = verdict.scored?.find((slot) => slot.time === next.alternative.time);
    if (!hasKnownCrowd(best) || !hasKnownCrowd(candidate)) next.alternative = null;
  }

  // A current air-quality observation can still protect as a safety gate, but it
  // must not be phrased as a future-hour benefit when the recommended slot is far away.
  if (best?.provenance?.air === 'current_observation' && current?.time && best?.time && minutesBetween(best.time, current.time) > 90) {
    next.reasons = next.reasons.filter((reason) => reason?.icon !== 'air');
  }

  const missing = [];
  if (!hasKnownCrowd(best)) missing.push('추천 시간 혼잡 예측 없음');
  if (!Number.isFinite(best?.wind)) missing.push('시간별 풍속 예보 없음');

  // Crowd is 34% of utility, and weather includes wind. Missing either materially
  // weakens a "high confidence" claim even if the available components score well.
  if ((!hasKnownCrowd(best) || !Number.isFinite(best?.wind)) && next.confidence === '높음') {
    next.confidence = '보통';
  }
  if (missing.length) next.confidenceDetail = appendDetail(next.confidenceDetail, missing.join(' · '));

  return next;
}
