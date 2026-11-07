// เก็บข้อมูลในเครื่อง (localStorage) — ทนต่อ storage ที่ใช้ไม่ได้

export const KEY = 'prep72.v1';

export function defaultState() {
  return {
    version: 1,
    done: {},
    skipped: {},
    snoozed: {},
    expiry: {},
    dailySpend: null,
    contacts: [],
    meetNear: '',
    meetFar: '',
    sosChecked: [],
  };
}

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function validate(d) {
  if (!isObj(d)) return 'ไม่ใช่ไฟล์สำรองของพร้อม 72';
  if (d.version !== 1) return 'ไฟล์นี้มาจากเวอร์ชันอื่น';
  for (const k of ['done', 'skipped', 'expiry']) if (!isObj(d[k])) return 'ข้อมูลในไฟล์ไม่ครบ';
  if (!Array.isArray(d.contacts)) return 'ข้อมูลในไฟล์ไม่ครบ';
  return null;
}

// เก็บเฉพาะ id ที่แอปรู้จัก และค่าที่มีรูปแบบถูกต้อง
function pick(obj, known, keep) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if ((!known || known.has(k)) && keep(v)) out[k] = v;
  }
  return out;
}

function normalize(d, known) {
  const done = pick(d.done, known, v => typeof v === 'string' && v.length > 0);
  return {
    ...defaultState(),
    done,
    // ข้อที่ทำแล้วไม่ควรมีสถานะข้ามค้าง (ข้อมูลจากเวอร์ชันเก่า)
    skipped: Object.fromEntries(Object.entries(pick(d.skipped, known, v => v === true)).filter(([id]) => !done[id])),
    snoozed: isObj(d.snoozed) ? pick(d.snoozed, known, v => typeof v === 'string' && DAY_RE.test(v)) : {},
    expiry: pick(d.expiry, known, v => typeof v === 'string' && DAY_RE.test(v)),
    dailySpend: typeof d.dailySpend === 'number' && d.dailySpend > 0 ? d.dailySpend : null,
    contacts: d.contacts
      .filter(isObj)
      .slice(0, 5)
      .map(c => ({ name: String(c.name ?? ''), phone: String(c.phone ?? '') }))
      .filter(c => c.name && c.phone),
    meetNear: typeof d.meetNear === 'string' ? d.meetNear : '',
    meetFar: typeof d.meetFar === 'string' ? d.meetFar : '',
    sosChecked: Array.isArray(d.sosChecked) ? d.sosChecked.filter(Number.isInteger) : [],
  };
}

/**
 * @param storage  localStorage หรือของปลอมสำหรับทดสอบ (null = ใช้หน่วยความจำ)
 * @param opts.knownIds  id ที่แอปรู้จัก — id อื่นในข้อมูลจะถูกทิ้ง
 */
export function createStore(storage, { knownIds } = {}) {
  const known = knownIds ? new Set(knownIds) : null;

  // อ่านกับเขียนแยกกัน: เครื่องที่พื้นที่เต็มยังอ่านข้อมูลเดิมได้ แม้จะบันทึกเพิ่มไม่ได้
  function load() {
    if (!storage) return defaultState();
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return defaultState();
      const d = JSON.parse(raw);
      return validate(d) ? defaultState() : normalize(d, known);
    } catch {
      return defaultState();
    }
  }

  function canWrite() {
    if (!storage) return false;
    try {
      storage.setItem(KEY + '.probe', '1');
      storage.removeItem(KEY + '.probe');
      return true;
    } catch {
      return false;
    }
  }

  let state = load();
  let persistent = canWrite();

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
    // โหลดใหม่จาก storage (เมื่ออีกแท็บหนึ่งบันทึก) เพื่อไม่ให้เขียนทับกัน
    reload() {
      state = load();
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
      state = normalize(d, known);
      save();
      return { ok: true };
    },
  };
}
