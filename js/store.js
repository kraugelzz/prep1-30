// เก็บข้อมูลในเครื่อง (localStorage) — ทนต่อ storage ที่ใช้ไม่ได้

export const KEY = 'prep72.v1';

export function defaultState() {
  return {
    version: 1,
    done: {},
    skipped: {},
    expiry: {},
    dailySpend: null,
    contacts: [],
    meetNear: '',
    meetFar: '',
    sosChecked: [],
  };
}

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function validate(d) {
  if (!isObj(d)) return 'ไม่ใช่ไฟล์สำรองของพร้อม 72';
  if (d.version !== 1) return 'ไฟล์นี้มาจากเวอร์ชันอื่น';
  for (const k of ['done', 'skipped', 'expiry']) if (!isObj(d[k])) return 'ข้อมูลในไฟล์ไม่ครบ';
  if (!Array.isArray(d.contacts)) return 'ข้อมูลในไฟล์ไม่ครบ';
  return null;
}

function normalize(d) {
  const base = defaultState();
  return {
    ...base,
    done: { ...d.done },
    skipped: { ...d.skipped },
    expiry: { ...d.expiry },
    dailySpend: typeof d.dailySpend === 'number' && d.dailySpend > 0 ? d.dailySpend : null,
    contacts: d.contacts
      .filter(isObj)
      .slice(0, 5)
      .map(c => ({ name: String(c.name ?? ''), phone: String(c.phone ?? '') })),
    meetNear: String(d.meetNear ?? ''),
    meetFar: String(d.meetFar ?? ''),
    sosChecked: Array.isArray(d.sosChecked) ? d.sosChecked.filter(Number.isInteger) : [],
  };
}

export function createStore(storage) {
  let persistent = false;
  let state = defaultState();

  if (storage) {
    try {
      const raw = storage.getItem(KEY);
      storage.setItem(KEY + '.probe', '1');
      storage.removeItem(KEY + '.probe');
      persistent = true;
      if (raw) {
        const d = JSON.parse(raw);
        if (!validate(d)) state = normalize(d);
      }
    } catch {
      // storage ถูกบล็อก หรือข้อมูลเก่าเสีย — ใช้ค่าเริ่มต้น
    }
  }

  function save() {
    if (!persistent) return;
    try {
      storage.setItem(KEY, JSON.stringify(state));
    } catch {
      persistent = false;
    }
  }

  return {
    get state() { return state; },
    get persistent() { return persistent; },
    update(fn) {
      fn(state);
      save();
    },
    reset() {
      state = defaultState();
      if (persistent) {
        try { storage.removeItem(KEY); } catch { persistent = false; }
      }
    },
    exportJSON() {
      return JSON.stringify(state, null, 2);
    },
    importJSON(text) {
      let d;
      try { d = JSON.parse(text); } catch { return { ok: false, error: 'ไฟล์นี้ใช้ไม่ได้ ลองไฟล์สำรองอื่น' }; }
      const err = validate(d);
      if (err) return { ok: false, error: err };
      state = normalize(d);
      save();
      return { ok: true };
    },
  };
}
