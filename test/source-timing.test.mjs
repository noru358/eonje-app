import test from 'node:test';
import assert from 'node:assert/strict';
import { assessSourceTiming, kmaBaseToIso } from '../src/source-timing.mjs';
import { assessDataQuality } from '../src/data-quality.mjs';

test('KMA base metadata converts to a KST timestamp', () => {
  assert.equal(
    kmaBaseToIso({ base_date:'20260901', base_time:'2000' }),
    '2026-09-01T20:00:00+09:00'
  );
  assert.equal(kmaBaseToIso({ base_date:'bad', base_time:'2000' }), null);
});

test('source timing keeps Seoul, KMA, and AQ ages separate', () => {
  const now = new Date('2026-09-01T12:30:00Z'); // 21:30 KST
  const timing = assessSourceTiming({
    updatedAt:'2026-09-01T21:20:00+09:00',
    sourceMetadata:{
      seoul:{
        weatherObservedAt:'2026-09-01T21:20:00+09:00',
        populationObservedAt:'2026-09-01T20:55:00+09:00'
      },
      kma:{ selectedBase:{ base_date:'20260901', base_time:'2000' } },
      aqShadow:{ retrievedAt:'2026-09-01T12:26:00Z' }
    }
  }, { now });

  assert.equal(timing.seoulWeather.ageMinutes, 10);
  assert.equal(timing.seoulPopulation.ageMinutes, 35);
  assert.equal(timing.kmaBase.ageMinutes, 90);
  assert.equal(timing.aqShadow.ageMinutes, 4);
});

test('composite quality semantics stay unchanged while source timing is attached', () => {
  const quality = assessDataQuality({
    mode:'live',
    updatedAt:'2026-09-01T21:20:00+09:00',
    sourceMetadata:{ seoul:{ populationObservedAt:'2026-09-01T20:55:00+09:00' } }
  }, { now:new Date('2026-09-01T12:30:00Z'), staleAfterMinutes:20 });

  assert.equal(quality.state, 'fresh');
  assert.equal(quality.ageMinutes, 10);
  assert.equal(quality.sourceTiming.seoulPopulation.ageMinutes, 35);
});
