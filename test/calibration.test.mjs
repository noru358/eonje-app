import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pairAqForecasts,
  pairCrowdForecasts,
  summarizeAqPairs,
  summarizeCrowdPairs
} from '../src/calibration.mjs';

const records = [
  {
    capturedAt:'2026-09-01T10:00:00Z',
    place:{ id:'yeouido' },
    sourceMetadata:{
      seoul:{ populationObservedAt:'2026-09-01T19:00:00+09:00' },
      aqShadow:{ retrievedAt:'2026-09-01T10:00:00Z' }
    },
    current:{ time:'2026-09-01T19:00:00+09:00', pm25:8, pm10:14, crowd:'보통' },
    aqShadow:{
      metadata:{ retrievedAt:'2026-09-01T10:00:00Z' },
      rows:[{ time:'2026-09-01T21:00:00+09:00', pm25:12, pm10:20 }]
    },
    slots:[{
      time:'2026-09-01T21:00:00+09:00', crowd:'약간 붐빔',
      provenance:{ crowd:'seoul_population_forecast' }
    }]
  },
  {
    capturedAt:'2026-09-01T12:05:00Z',
    place:{ id:'yeouido' },
    sourceMetadata:{ seoul:{ populationObservedAt:'2026-09-01T21:05:00+09:00' } },
    current:{ time:'2026-09-01T21:05:00+09:00', pm25:10, pm10:18, crowd:'보통' },
    slots:[]
  }
];

test('pairs earlier AQ forecast with later Seoul observation in the same hour', () => {
  const pairs = pairAqForecasts(records);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].leadHours, 2);
  assert.equal(pairs[0].forecastPm25, 12);
  assert.equal(pairs[0].observedPm25, 10);

  const summary = summarizeAqPairs(pairs);
  assert.equal(summary['1-3h'].pm25.count, 1);
  assert.equal(summary['1-3h'].pm25.mae, 2);
  assert.equal(summary['1-3h'].pm25.bias, 2);
});

test('pairs population forecast with later observed crowd and reports ordinal error', () => {
  const pairs = pairCrowdForecasts(records);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].forecast, '약간 붐빔');
  assert.equal(pairs[0].observed, '보통');
  assert.equal(pairs[0].ordinalError, 1);
  assert.equal(pairs[0].absoluteOrdinalError, 1);
  assert.equal(pairs[0].exact, false);

  const summary = summarizeCrowdPairs(pairs);
  assert.equal(summary['1-3h'].count, 1);
  assert.equal(summary['1-3h'].exactAccuracy, 0);
  assert.equal(summary['1-3h'].meanAbsoluteOrdinalError, 1);
});

test('does not match forecasts across different parks', () => {
  const otherParkObservation = {
    capturedAt:'2026-09-01T12:05:00Z',
    place:{ id:'banpo' },
    sourceMetadata:{ seoul:{ populationObservedAt:'2026-09-01T21:05:00+09:00' } },
    current:{ time:'2026-09-01T21:05:00+09:00', pm25:10, pm10:18, crowd:'보통' },
    slots:[]
  };
  assert.equal(pairAqForecasts([records[0], otherParkObservation]).length, 0);
  assert.equal(pairCrowdForecasts([records[0], otherParkObservation]).length, 0);
});
