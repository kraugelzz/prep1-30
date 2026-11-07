import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, ORDER, GROUPS, SIGNALS, SOS_STEPS, HOTLINES } from '../js/data.js';

test('มี 30 ข้อ id ไม่ซ้ำ', () => {
  assert.equal(ITEMS.length, 30);
  assert.equal(new Set(ITEMS.map(i => i.id)).size, 30);
});

test('ORDER เป็นการเรียงใหม่ของ id ทั้งหมด', () => {
  assert.deepEqual([...ORDER].sort(), ITEMS.map(i => i.id).sort());
});

test('ทุกข้อมีกลุ่มที่รู้จักและขั้นตอน 1–5 ขั้น', () => {
  for (const it of ITEMS) {
    assert.ok(GROUPS[it.group], it.id);
    assert.ok(it.steps.length >= 1 && it.steps.length <= 5, it.id);
    assert.ok(it.title && it.why && it.minutes > 0, it.id);
  }
});

test('จำนวนต่อกลุ่มตรงสเปก', () => {
  const count = g => ITEMS.filter(i => i.group === g).length;
  assert.deepEqual([count('cyber'), count('money'), count('kit'), count('contact')], [10, 6, 10, 4]);
});

test('สัญญาณหลอก 6 ข้อ, ขั้นเกิดเหตุ 5 ข้อ, มีเบอร์ฉุกเฉิน', () => {
  assert.equal(SIGNALS.length, 6);
  assert.equal(SOS_STEPS.length, 5);
  assert.ok(HOTLINES.length >= 7);
});
