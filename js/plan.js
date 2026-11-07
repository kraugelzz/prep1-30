// จำนวนวันที่ผู้ใช้อยากเตรียมให้พอ (1–30) และตัวเลขที่ขึ้นกับจำนวนวัน — ฟังก์ชันบริสุทธิ์

export const MIN_DAYS = 1;
export const MAX_DAYS = 30;
export const DEFAULT_DAYS = 3;
const WATER_PER_DAY = 4; // ลิตรต่อคนต่อวัน (ดื่ม + ล้างเล็กน้อย)
const MIN_MEDS = 7; // ยาประจำตัวสำรองอย่างน้อย 7 วันเสมอ

// ข้อที่ปริมาณขึ้นกับจำนวนวัน: เพิ่มวันแล้วต้องเตรียมเพิ่ม
export const SCALES_WITH_DAYS = ['money-2', 'kit-1', 'kit-2', 'kit-3'];

export function clampDays(n) {
  const v = Number(n);
  if (n === null || n === '' || !Number.isFinite(v)) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(v)));
}

export function quantities(days) {
  const d = clampDays(days);
  return { days: d, water: WATER_PER_DAY * d, meds: Math.max(MIN_MEDS, d) };
}

// แทน {days} {water} {meds} ในข้อความเนื้อหา
export function fill(text, days) {
  const q = quantities(days);
  return text.replace(/\{(days|water|meds)\}/g, (_, k) => String(q[k]));
}

// เปลี่ยนจำนวนวัน — ข้อที่เคยเตรียมไว้น้อยกว่าเป้าใหม่จะถูกยกเลิกการติ๊ก คืน id ที่ถูกยกเลิก
// doneDays[id] = จำนวนวันตอนกด "ทำแล้ว" (ข้อมูลเก่าที่ไม่มี ถือว่าเท่ากับจำนวนวันเดิม)
export function applyDays(state, days) {
  const next = clampDays(days);
  const prev = clampDays(state.days);
  state.days = next;
  state.doneDays ??= {};
  // ข้อที่ทำแล้วแต่ยังไม่มีบันทึก: จดว่าเตรียมไว้พอสำหรับจำนวนวันเดิม (กันลด-เพิ่มกลับแล้วถูกยกเลิก)
  for (const id of SCALES_WITH_DAYS) if (state.done[id] && !state.doneDays[id]) state.doneDays[id] = prev;
  const reset = SCALES_WITH_DAYS.filter(id => state.done[id] && state.doneDays[id] < next);
  for (const id of reset) {
    delete state.done[id];
    delete state.doneDays[id];
  }
  return reset;
}

export function warning(days) {
  const d = clampDays(days);
  if (d > 14) return 'มากกว่าที่รัฐเกือบทุกประเทศแนะนำ ต้องมีที่เก็บน้ำและอาหารจำนวนมาก หมุนเวียนของก่อนหมดอายุ และไม่ควรเก็บเงินสดไว้ในบ้านมากเกินไป';
  if (d > 7) return 'มากกว่าที่รัฐส่วนใหญ่แนะนำ (3–7 วัน) ใช้เงินและพื้นที่มากขึ้น';
  return '';
}
