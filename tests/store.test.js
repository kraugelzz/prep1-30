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

test('เครื่องพื้นที่เต็ม (อ่านได้ เขียนไม่ได้) → ยังเห็นข้อมูลเดิม', () => {
  const st = fakeStorage();
  createStore(st).update(s => { s.done['cyber-1'] = '2026-11-01'; });
  const full = { getItem: st.getItem, setItem() { throw new Error('QuotaExceededError'); }, removeItem: st.removeItem };
  const b = createStore(full);
  assert.equal(b.persistent, false);
  assert.equal(b.state.done['cyber-1'], '2026-11-01');
});

test('import ทิ้ง id ที่ไม่รู้จักและค่าที่ผิดรูปแบบ', () => {
  const a = createStore(fakeStorage(), { knownIds: ['cyber-1', 'kit-1'] });
  const r = a.importJSON(JSON.stringify({
    version: 1,
    done: { 'cyber-1': '2026-11-01', 'kit-99': 'x', 'kit-1': 5 },
    skipped: { 'kit-99': true, 'cyber-1': 'yes' },
    expiry: { 'kit-99': '2026-11-10', 'kit-1': 'พรุ่งนี้' },
    contacts: [{ name: 'แม่', phone: '0812345678' }, { name: 'ว่าง' }],
    meetNear: { x: 1 },
  }));
  assert.deepEqual(r, { ok: true });
  assert.deepEqual(a.state.done, { 'cyber-1': '2026-11-01' });
  assert.deepEqual(a.state.skipped, {});
  assert.deepEqual(a.state.expiry, {});
  assert.deepEqual(a.state.contacts, [{ name: 'แม่', phone: '0812345678' }]);
  assert.equal(a.state.meetNear, '');
});

test('ข้อมูลใน storage ที่มี id แปลกก็ถูกกรองตอนเปิดแอป', () => {
  const st = fakeStorage();
  st.setItem(KEY, JSON.stringify({ version: 1, done: { 'kit-99': 'x' }, skipped: {}, expiry: { 'kit-99': '2026-11-10' }, contacts: [] }));
  const a = createStore(st, { knownIds: ['kit-1'] });
  assert.deepEqual(a.state.done, {});
  assert.deepEqual(a.state.expiry, {});
});

test('reload อ่านค่าที่แท็บอื่นบันทึก', () => {
  const st = fakeStorage();
  const tabA = createStore(st);
  const tabB = createStore(st);
  tabA.update(s => { s.done['cyber-1'] = '2026-11-07'; });
  tabB.reload();
  tabB.update(s => { s.sosChecked = [1]; });
  const fresh = createStore(st);
  assert.equal(fresh.state.done['cyber-1'], '2026-11-07');
  assert.deepEqual(fresh.state.sosChecked, [1]);
});

test('reset ล้างกลับเป็นค่าเริ่มต้น', () => {
  const st = fakeStorage();
  const a = createStore(st);
  a.update(s => { s.done['cyber-1'] = 'x'; });
  a.reset();
  assert.deepEqual(a.state, defaultState());
  assert.deepEqual(createStore(st).state, defaultState());
});
