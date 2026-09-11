import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeProductVerdict } from '../src/product-verdict.mjs';
import { getPlace } from '../src/places.mjs';

const home = await readFile(new URL('../public/home.js', import.meta.url), 'utf8');
const mapJs = await readFile(new URL('../public/map.js', import.meta.url), 'utf8');

const slots = ['17:00', '18:00', '19:00', '20:00', '21:00'].map((hm) => ({
  time: `2026-09-11T${hm}:00+09:00`,
  temp: 24, rainChance: 10, precipitation: 0, wind: 2, pm25: 15, pm10: 25, crowd: '보통'
}));

test('sunset intent states the sunset argument once, not twice', () => {
  const verdict = makeProductVerdict({
    place: getPlace('yeouido'), slots,
    sunset: '2026-09-11T19:07:00+09:00',
    nowTime: '2026-09-11T16:40:00+09:00',
    intent: 'sunset'
  });
  const sunReasons = (verdict.reasons || []).filter((r) => r.icon === 'sun');
  assert.equal(sunReasons.length, 1, `expected one sunset reason, got ${JSON.stringify(verdict.reasons)}`);
  const titles = (verdict.reasons || []).map((r) => r.title);
  assert.equal(new Set(titles).size, titles.length);
});

test('every reason argues a different axis of evidence', () => {
  for (const intent of ['general', 'picnic', 'run', 'sunset']) {
    const verdict = makeProductVerdict({
      place: getPlace('yeouido'), slots,
      sunset: '2026-09-11T19:07:00+09:00',
      nowTime: '2026-09-11T16:40:00+09:00',
      intent
    });
    const icons = (verdict.reasons || []).map((r) => r.icon);
    assert.equal(new Set(icons).size, icons.length, `${intent} repeated an icon: ${icons.join(',')}`);
  }
});

test('an empty caution list never reports missing inputs as no downside', () => {
  for (const source of [home, mapJs]) {
    assert.match(source, /unknownConditions/);
    assert.doesNotMatch(source, /눈에 띄는 약점은 적어요|큰 약점 없음/);
    assert.match(source, /괜찮다는 뜻/);
  }
});
