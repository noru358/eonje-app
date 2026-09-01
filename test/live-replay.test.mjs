import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeProductVerdict } from '../src/product-verdict.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/live-2026-09-01.json', import.meta.url), 'utf8'));

test('six-park live replay preserves source completeness and honest recommendations', () => {
  assert.equal(fixture.records.length, 6);
  for (const record of fixture.records) {
    const kma = record.sourceMetadata?.kma;
    assert.equal(kma.truncated, false, record.place.id);
    assert.equal(kma.receivedItems, kma.totalCount, record.place.id);
    assert.equal(record.slots.length, 24, record.place.id);
    assert.equal(record.slots.filter((slot) => slot.crowd != null).length, 12, record.place.id);

    const verdict = makeProductVerdict({
      place:record.place,
      slots:record.slots,
      sunset:record.sunset,
      nowTime:record.nowTime,
      current:record.current,
      quality:{ state:'fresh', ageMinutes:10 }
    });
    assert.equal(verdict.status, 'go', record.place.id);
    assert.match(verdict.end, /\+09:00$/, record.place.id);
    assert.equal(verdict.reasons.some((reason) => reason.icon === 'air'), false, record.place.id);
    assert.match(verdict.confidenceDetail || '', /대기질 예보 없음/, record.place.id);
  }
});
