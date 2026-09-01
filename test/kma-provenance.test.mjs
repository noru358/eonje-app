import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeKmaIntoSlots } from '../src/kma-adapter.mjs';

test('KMA merge updates weather and wind provenance', () => {
  const slots = [{
    time:'2026-08-29T20:00:00+09:00', temp:27, rainChance:20, precipitation:0, wind:null,
    provenance:{ weather:'seoul_hourly_forecast', wind:'missing_until_kma', crowd:'unknown' }
  }];
  const kma = [{ time:'2026-08-29T20:00:00+09:00', temp:26, rainChance:0, precipitation:0, wind:0.1 }];
  const [out] = mergeKmaIntoSlots(slots, kma);
  assert.equal(out.weatherSource, 'KMA');
  assert.equal(out.provenance.weather, 'kma_hourly_forecast');
  assert.equal(out.provenance.wind, 'kma_hourly_forecast');
  assert.equal(out.provenance.windObservedAt, null);
  assert.equal(out.wind, 0.1);
});
