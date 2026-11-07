import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, defaultState, KEY } from '../js/store.js';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
  };
}
const brokenStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
  removeItem() { throw new Error('blocked'); },
};

test('บันทึกแล้วเปิดใหม่ได้ค่าเดิม', () => {
  const st = fakeStorage();
  const a = createStore(st);
  assert.equal(a.persistent, true);
  a.update(s => { s.done['cyber-1'] = '2026-11-07'; s.dailySpend = 400; });
  const b = createStore(st);
  assert.equal(b.state.done['cyber-1'], '2026-11-07');
  assert.equal(b.state.dailySpend, 400);
});

test('storage ใช้ไม่ได้ → ทำงานในหน่วยความจำ', () => {
  const a = createStore(brokenStorage);
  assert.equal(a.persistent, false);
  a.update(s => { s.done['cyber-1'] = 'x'; });
  assert.equal(a.state.done['cyber-1'], 'x');
});

test('ไม่มี storage เลย (null) → ทำงานในหน่วยความจำ', () => {
  const a = createStore(null);
  assert.equal(a.persistent, false);
  assert.deepEqual(a.state, defaultState());
});

test('ข้อมูลเก่าเสียใน storage → เริ่มใหม่', () => {
  const st = fakeStorage();
  st.setItem(KEY, '{เสีย');
  assert.deepEqual(createStore(st).state, defaultState());
});

test('export แล้ว import กลับได้เหมือนเดิม', () => {
  const a = createStore(fakeStorage());
  a.update(s => { s.done['kit-1'] = '2026-11-07'; s.expiry['kit-1'] = '2027-01-01'; s.contacts.push({ name: 'แม่', phone: '0800000000' }); });
  const json = a.exportJSON();
  const b = createStore(fakeStorage());
  assert.deepEqual(b.importJSON(json), { ok: true });
  assert.deepEqual(b.state, a.state);
});

test('import ไฟล์เสียหรือผิดเวอร์ชัน → ไม่แตะข้อมูลเดิม', () => {
  const a = createStore(fakeStorage());
  a.update(s => { s.done['cyber-1'] = 'keep'; });
  for (const bad of ['ไม่ใช่ json', '{"version":2}', '{"version":1,"done":[]}', '{"version":1,"done":{},"skipped":{},"expiry":{},"contacts":"x"}', 'null']) {
    const r = a.importJSON(bad);
    assert.equal(r.ok, false, bad);
    assert.ok(r.error);
    assert.equal(a.state.done['cyber-1'], 'keep');
  }
});

test('reset ล้างกลับเป็นค่าเริ่มต้น', () => {
  const st = fakeStorage();
  const a = createStore(st);
  a.update(s => { s.done['cyber-1'] = 'x'; });
  a.reset();
  assert.deepEqual(a.state, defaultState());
  assert.deepEqual(createStore(st).state, defaultState());
});
