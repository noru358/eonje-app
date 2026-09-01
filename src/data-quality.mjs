import { assessSourceTiming } from './source-timing.mjs';

export function assessDataQuality(data, { now = new Date(), staleAfterMinutes = 20 } = {}) {
  const sourceTiming = assessSourceTiming(data, { now });
  if (!data) return { state:'missing', ageMinutes:null, sourceTiming };
  if (data.liveError) return { state:'fallback', ageMinutes:null, sourceTiming };
  if (data.mode !== 'live') return { state:'demo', ageMinutes:null, sourceTiming };

  const updatedMs = data.updatedAt ? new Date(data.updatedAt).getTime() : NaN;
  if (!Number.isFinite(updatedMs)) return { state:'unknown', ageMinutes:null, sourceTiming };
  const rawAgeMinutes = Math.round((now.getTime() - updatedMs) / 60000);
  if (rawAgeMinutes < -5) return { state:'unknown', ageMinutes:rawAgeMinutes, sourceTiming };
  const ageMinutes = Math.max(0, rawAgeMinutes);
  return {
    state: ageMinutes > staleAfterMinutes ? 'stale' : 'fresh',
    ageMinutes,
    sourceTiming
  };
}
