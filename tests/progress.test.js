import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, ORDER } from '../js/data.js';
import { percent, groupPercent, expiringIds, nextItem } from '../js/progress.js';
import { defaultState } from '../js/store.js';

const TODAY = new Date('2026-11-07T12:00:00');
const doneAll = () => Object.fromEntries(ITEMS.map(i => [i.id, '2026-11-01']));
const plusDays = n => new Date(TODAY.getTime() + n * 864e5).toISOString().slice(0, 10);

test('state ว่าง → 0% และข้อแรกตามลำดับ', () => {
  const s = defaultState();
  assert.equal(percent(s, ITEMS), 0);
  assert.deepEqual(nextItem(s, ORDER, TODAY), { id: ORDER[0], reason: 'todo' });
});

test('ทำ 15 จาก 30 → 50%', () => {
  const s = defaultState();
  ITEMS.slice(0, 15).forEach(i => { s.done[i.id] = '2026-11-07'; });
  assert.equal(percent(s, ITEMS), 50);
});

test('% ต่อกลุ่ม', () => {
  const s = defaultState();
  s.done['contact-1'] = '2026-11-07';
  assert.equal(groupPercent(s, ITEMS, 'contact'), 25);
  assert.equal(groupPercent(s, ITEMS, 'cyber'), 0);
});

test('ข้ามข้อแรก → เสนอข้อถัดไป', () => {
  const s = defaultState();
  s.skipped[ORDER[0]] = true;
  assert.deepEqual(nextItem(s, ORDER, TODAY), { id: ORDER[1], reason: 'todo' });
});

test('เหลือแต่ข้อที่ข้าม → วนกลับมาเสนอ', () => {
  const s = defaultState();
  s.done = doneAll();
  delete s.done['money-4'];
  s.skipped['money-4'] = true;
  assert.deepEqual(nextItem(s, ORDER, TODAY), { id: 'money-4', reason: 'skipped' });
});

test('ครบทุกข้อ → null', () => {
  const s = defaultState();
  s.done = doneAll();
  assert.equal(nextItem(s, ORDER, TODAY), null);
  assert.equal(percent(s, ITEMS), 100);
});

test('ของใกล้หมดอายุใน 10 วัน → กลับมาเป็นข้อต่อไป', () => {
  const s = defaultState();
  s.done = doneAll();
  s.expiry['kit-1'] = plusDays(10);
  assert.deepEqual(expiringIds(s, TODAY), ['kit-1']);
  assert.deepEqual(nextItem(s, ORDER, TODAY), { id: 'kit-1', reason: 'expiring' });
});

test('หมดอายุอีก 60 วัน → ยังไม่เตือน', () => {
  const s = defaultState();
  s.done = doneAll();
  s.expiry['kit-1'] = plusDays(60);
  assert.deepEqual(expiringIds(s, TODAY), []);
  assert.equal(nextItem(s, ORDER, TODAY), null);
});

test('ข้อที่ยังไม่ทำ ไม่ถูกนับว่าใกล้หมดอายุ', () => {
  const s = defaultState();
  s.expiry['kit-2'] = plusDays(5);
  assert.deepEqual(expiringIds(s, TODAY), []);
});
