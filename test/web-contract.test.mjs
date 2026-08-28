import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

test('first screen keeps verdict before raw data', () => {
  assert.match(html, /id="headline"/);
  assert.match(html, /id="windowLabel"/);
  assert.match(html, /id="reasons"/);
  assert.match(html, /id="details" hidden/);
  assert.doesNotMatch(html, /slot-score|추천 점수[^는]/);
});

test('web UI never pretends an unimplemented reminder was scheduled', () => {
  assert.doesNotMatch(html + app, /알림 예약됨|예약 완료/);
  assert.match(app, /BEGIN:VCALENDAR/);
});

test('client consumes the server verdict as the single decision source', () => {
  assert.match(app, /\/api\/verdict\?place=/);
  assert.doesNotMatch(app, /makeVerdict/);
});

test('demo mode is disclosed rather than presented as live data', () => {
  assert.match(app, /data\.mode !== 'live' \? '데모'/);
  assert.match(app, /현재 화면은 데모 데이터로 동작 중/);
});

test('stale live data is visibly distinguished from fresh live data', () => {
  assert.match(app, /quality\?\.state === 'stale' \? '지연'/);
  assert.match(app, /분 지연/);
});
