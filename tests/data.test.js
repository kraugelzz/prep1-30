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

test('ข้อแรกเป็นข้อง่ายที่เสร็จเร็ว', () => {
  const first = ITEMS.find(i => i.id === ORDER[0]);
  assert.ok(first.minutes <= 3, `${first.id} ใช้ ${first.minutes} นาที`);
  assert.equal(first.group === 'cyber' && first.id === 'cyber-1', false);
});

test('ข้อที่มี extra: from อยู่ในช่วง 1–30 และขั้นรวมไม่เกิน 5', () => {
  for (const it of ITEMS.filter(i => i.extra)) {
    assert.ok(it.extra.from >= 1 && it.extra.from <= 30, it.id);
    assert.ok(it.steps.length + 1 <= 5, it.id);
  }
});

test('ไม่มีตัวเลขวันตายตัวหลงเหลือในข้อของ/เงิน', () => {
  for (const id of ['money-1', 'kit-1', 'kit-2', 'kit-3']) {
    const it = ITEMS.find(i => i.id === id);
    assert.doesNotMatch(it.title + it.steps.join(' '), /\b3 วัน|12 ลิตร|คูณ 3/, id);
  }
});

test('ข้อความทุกช่องใช้ตัวแทนที่รู้จัก และ fill แล้วไม่เหลือ {', async () => {
  const { fill } = await import('../js/plan.js');
  for (const it of ITEMS) {
    const texts = [it.title, it.why, ...it.steps, it.extra?.text].filter(Boolean);
    for (const t of texts) {
      for (const m of t.matchAll(/\{(\w+)\}/g)) assert.ok(['days', 'water', 'meds'].includes(m[1]), `${it.id}: {${m[1]}}`);
      for (const d of [1, 3, 7, 30]) assert.doesNotMatch(fill(t, d), /[{}]/, `${it.id} @${d}`);
    }
  }
});
