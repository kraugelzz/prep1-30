import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampDays, quantities, fill, applyDays, SCALES_WITH_DAYS, DEFAULT_DAYS, warning } from '../js/plan.js';
import { defaultState } from '../js/store.js';

test('clampDays: 1–30 จำนวนเต็ม ค่าแปลกใช้ค่าเริ่มต้น', () => {
  assert.equal(clampDays(7), 7);
  assert.equal(clampDays(0), 1);
  assert.equal(clampDays(99), 30);
  assert.equal(clampDays(7.6), 8);
  assert.equal(clampDays('abc'), DEFAULT_DAYS);
  assert.equal(clampDays(null), DEFAULT_DAYS);
  assert.equal(DEFAULT_DAYS, 3);
});

test('quantities ตามจำนวนวัน', () => {
  assert.deepEqual(quantities(3), { days: 3, water: 12, meds: 7 });
  assert.deepEqual(quantities(7), { days: 7, water: 28, meds: 7 });
  assert.deepEqual(quantities(30), { days: 30, water: 120, meds: 30 });
});

test('fill แทนค่าในข้อความ', () => {
  assert.equal(fill('น้ำดื่ม {water} ลิตร พอ {days} วัน ยา {meds} วัน', 7), 'น้ำดื่ม 28 ลิตร พอ 7 วัน ยา 7 วัน');
  assert.equal(fill('ไม่มีตัวแปร', 7), 'ไม่มีตัวแปร');
});

test('applyDays: เพิ่มวัน → ข้อที่ต้องเตรียมเพิ่มถูกยกเลิกการติ๊ก', () => {
  const s = defaultState();
  s.done = { 'kit-1': 'x', 'kit-2': 'x', 'cyber-1': 'x', 'money-2': 'x' };
  const reset = applyDays(s, 7);
  assert.equal(s.days, 7);
  assert.deepEqual(reset.sort(), ['kit-1', 'kit-2', 'money-2']);
  assert.equal(s.done['cyber-1'], 'x', 'ข้อที่ไม่ขึ้นกับจำนวนวันไม่ถูกแตะ');
  assert.equal(s.done['kit-1'], undefined);
});

test('applyDays: ลดวัน หรือเท่าเดิม → ไม่แตะข้อที่ทำแล้ว', () => {
  const s = defaultState();
  s.days = 14;
  s.done = { 'kit-1': 'x' };
  assert.deepEqual(applyDays(s, 7), []);
  assert.equal(s.done['kit-1'], 'x');
  assert.deepEqual(applyDays(s, 7), []);
});

test('SCALES_WITH_DAYS เป็นข้อของ เงิน และยา', () => {
  assert.deepEqual([...SCALES_WITH_DAYS].sort(), ['kit-1', 'kit-2', 'kit-3', 'money-2']);
});

test('warning: ไม่มีคำเตือนถึง 7 วัน, มีเมื่อเกิน 7 และเกิน 14', () => {
  assert.equal(warning(3), '');
  assert.equal(warning(7), '');
  assert.match(warning(10), /มากกว่า/);
  assert.match(warning(21), /ที่เก็บ/);
});

test('applyDays: ลด แล้วเพิ่มกลับไม่เกินที่เคยเตรียมไว้ → ไม่ยกเลิกติ๊ก', () => {
  const s = defaultState();
  s.days = 7;
  s.done = { 'kit-1': 'x' };
  s.doneDays = { 'kit-1': 7 };
  assert.deepEqual(applyDays(s, 3), []);
  assert.deepEqual(applyDays(s, 7), [], 'เคยเตรียมไว้ 7 วันแล้ว');
  assert.equal(s.done['kit-1'], 'x');
  assert.deepEqual(applyDays(s, 10), ['kit-1'], 'เกินที่เคยเตรียม → ต้องเพิ่ม');
});

test('applyDays: ข้อมูลเก่าที่ไม่มี doneDays ถือว่าเตรียมไว้เท่าจำนวนวันเดิม', () => {
  const s = defaultState();
  s.days = 3;
  s.done = { 'kit-1': 'x' };
  assert.deepEqual(applyDays(s, 5), ['kit-1']);
});

test('applyDays: ข้อมูลเก่า 7 → 3 → 7 ไม่ยกเลิกติ๊ก', () => {
  const s = defaultState();
  s.days = 7;
  s.done = { 'kit-1': 'x' };
  applyDays(s, 3);
  assert.deepEqual(applyDays(s, 7), []);
  assert.equal(s.done['kit-1'], 'x');
});
