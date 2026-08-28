import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeVerdict } from '../src/verdict-sanitizer.mjs';

test('unknown best crowd removes people claim and crowd alternative', () => {
  const verdict = {
    status:'go', confidence:'높음', confidenceDetail:null,
    best:{ time:'2026-08-29T20:00:00+09:00', crowd:null, wind:0.1, provenance:{ air:'current_observation' } },
    scored:[
      { time:'2026-08-29T08:00:00+09:00', crowd:'여유' },
      { time:'2026-08-29T20:00:00+09:00', crowd:null }
    ],
    reasons:[
      { icon:'people', title:'지금보다 한산해짐', detail:'여유 → null' },
      { icon:'rain', title:'비 걱정이 적음', detail:'강수확률 0%' },
      { icon:'air', title:'공기도 무난함', detail:'초미세먼지 6' }
    ],
    alternative:{ type:'crowd', time:'2026-08-29T08:00:00+09:00' }
  };
  const out = sanitizeVerdict(verdict, {
    current:{ time:'2026-08-29T03:30:00+09:00', crowd:'여유' }
  });
  assert.equal(out.reasons.some((r) => r.icon === 'people'), false);
  assert.equal(out.reasons.some((r) => r.icon === 'air'), false);
  assert.equal(out.alternative, null);
  assert.equal(out.confidence, '보통');
  assert.match(out.confidenceDetail, /혼잡 예측 없음/);
});
