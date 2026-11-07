// คำนวณความคืบหน้าและเลือก "ข้อต่อไป" — ฟังก์ชันบริสุทธิ์

const DAY = 864e5;

export function doneCount(state, items) {
  return items.filter(i => state.done[i.id]).length;
}

export function percent(state, items) {
  if (!items.length) return 0;
  return Math.round((doneCount(state, items) / items.length) * 100);
}

export function groupPercent(state, items, group) {
  return percent(state, items.filter(i => i.group === group));
}

function parseDay(s) {
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ข้อที่ทำแล้วและหมดอายุภายใน `days` วัน (รวมที่หมดไปแล้ว) เรียงจากใกล้สุด
export function expiringIds(state, today, days = 30) {
  const limit = today.getTime() + days * DAY;
  return Object.entries(state.expiry)
    .filter(([id]) => state.done[id])
    .map(([id, s]) => [id, parseDay(s)])
    .filter(([, d]) => d && d.getTime() <= limit)
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);
}

export const SNOOZE_DAYS = 7;

// เลื่อนเตือนไว้ถึงวันที่ใน snoozed[id] — แต่ถ้าของหมดอายุไปแล้ว เตือนเสมอ
export function isSnoozed(state, id, today) {
  const until = state.snoozed?.[id] && parseDay(state.snoozed[id]);
  if (!until || until.getTime() <= today.getTime()) return false;
  const exp = state.expiry[id] && parseDay(state.expiry[id]);
  return !(exp && exp.getTime() <= today.getTime());
}

// วันที่ (YYYY-MM-DD) ที่ห่างจาก today ไป n วัน ตามเวลาท้องถิ่น
export function addDays(today, n) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// เลยวันหมดอายุแล้ว (ไม่ใช่แค่ใกล้)
export function isExpired(state, id, today) {
  const exp = state.expiry[id] && parseDay(state.expiry[id]);
  return !!exp && exp.getTime() <= today.getTime();
}

// ล็อตใหม่ที่ใส่ตอนกด "ทำแล้ว": รับทราบไว้จนถึง SNOOZE_DAYS วันก่อนหมดอายุ
// ถ้าเหลือไม่ถึงนั้น คืน null = เตือนเลย
export function ackUntil(expiry, today) {
  const exp = parseDay(expiry);
  if (!exp) return null;
  const until = addDays(exp, -SNOOZE_DAYS);
  return parseDay(until).getTime() > today.getTime() ? until : null;
}

// id ที่ไม่อยู่ใน order ไม่ถูกเสนอเลย
export function nextItem(state, order, today) {
  const exp = expiringIds(state, today).find(id => order.includes(id) && !isSnoozed(state, id, today));
  if (exp) return { id: exp, reason: isExpired(state, exp, today) ? 'expired' : 'expiring' };
  const todo = order.find(id => !state.done[id] && !state.skipped[id]);
  if (todo) return { id: todo, reason: 'todo' };
  const skipped = order.find(id => !state.done[id]);
  if (skipped) return { id: skipped, reason: 'skipped' };
  return null;
}
