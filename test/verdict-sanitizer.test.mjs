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

test('unknown crowd removes crowd comparison from a non-crowd alternative tradeoff', () => {
  const out = sanitizeVerdict({
    status:'go', confidence:'보통',
    best:{ time:'2026-08-29T20:00:00+09:00', crowd:null, wind:1, temp:24, rainChance:0, precipitation:0 },
    scored:[
      { time:'2026-08-29T20:00:00+09:00', crowd:null },
      { time:'2026-08-29T22:00:00+09:00', crowd:'붐빔' }
    ],
    reasons:[],
    alternative:{ type:'weather', time:'2026-08-29T22:00:00+09:00', tradeoff:'대신 사람은 기본 추천보다 많을 수 있다.' }
  });
  assert.equal(out.alternative.tradeoff, '전체 조건은 기본 추천이 조금 더 낫다.');
});

test('missing data anywhere in the public window caps confidence', () => {
  const out = sanitizeVerdict({
    status:'go', confidence:'높음', start:'2026-08-29T19:00:00+09:00', end:'2026-08-29T21:00:00+09:00',
    best:{ time:'2026-08-29T19:00:00+09:00', crowd:'여유', wind:1, temp:24, rainChance:0, precipitation:0 },
    scored:[
      { time:'2026-08-29T19:00:00+09:00', crowd:'여유', wind:1, temp:24, rainChance:0, precipitation:0 },
      { time:'2026-08-29T20:00:00+09:00', crowd:null, wind:null, temp:24, rainChance:0, precipitation:0 }
    ],
    reasons:[{ icon:'people', title:'한산함' }]
  });
  assert.equal(out.confidence, '보통');
  assert.equal(out.reasons.some((reason) => reason.icon === 'people'), false);
  assert.match(out.confidenceDetail, /추천 구간 혼잡 예측 없음/);
  assert.match(out.confidenceDetail, /추천 구간 풍속 예보 없음/);
});
