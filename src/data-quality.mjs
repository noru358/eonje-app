export function assessDataQuality(data, { now = new Date(), staleAfterMinutes = 20 } = {}) {
  if (!data) return { state:'missing', ageMinutes:null };
  if (data.liveError) return { state:'fallback', ageMinutes:null };
  if (data.mode !== 'live') return { state:'demo', ageMinutes:null };

  const updatedMs = data.updatedAt ? new Date(data.updatedAt).getTime() : NaN;
  if (!Number.isFinite(updatedMs)) return { state:'unknown', ageMinutes:null };
  const rawAgeMinutes = Math.round((now.getTime() - updatedMs) / 60000);
  if (rawAgeMinutes < -5) return { state:'unknown', ageMinutes:rawAgeMinutes };
  const ageMinutes = Math.max(0, rawAgeMinutes);
  return {
    state: ageMinutes > staleAfterMinutes ? 'stale' : 'fresh',
    ageMinutes
  };
}
