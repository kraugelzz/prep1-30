import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SIGNALS } from '../js/data.js';
import { assess } from '../js/scam.js';

test('ไม่เลือกอะไร → none', () => {
  assert.deepEqual(assess([], SIGNALS), { level: 'none', advice: [] });
});

test('สัญญาณเบา 1 ข้อ → caution', () => {
  const r = assess(['link'], SIGNALS);
  assert.equal(r.level, 'caution');
  assert.equal(r.advice.length, 1);
});

test('สัญญาณเบา 2 ข้อ → likely', () => {
  assert.equal(assess(['link', 'urgent'], SIGNALS).level, 'likely');
});

test('ขอ OTP หรือให้โอนเงินข้อเดียว → likely', () => {
  assert.equal(assess(['otp'], SIGNALS).level, 'likely');
  assert.equal(assess(['transfer'], SIGNALS).level, 'likely');
});

test('คำแนะนำเรียงตามลำดับสัญญาณ ไม่ใช่ลำดับที่แตะ', () => {
  const r = assess(['install', 'link'], SIGNALS);
  assert.deepEqual(r.advice, [SIGNALS[0].advice, SIGNALS[5].advice]);
});

test('id ที่ไม่รู้จักถูกเพิกเฉย', () => {
  assert.equal(assess(['nope'], SIGNALS).level, 'none');
});
