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

// ข้อที่ข้ามไว้จะไม่ถูกเสนอเป็น "ใกล้หมดอายุ" ซ้ำ จนกว่าจะกด "ทำแล้ว" ใหม่
// id ที่ไม่อยู่ใน order ไม่ถูกเสนอเลย
export function nextItem(state, order, today) {
  const exp = expiringIds(state, today).find(id => order.includes(id) && !state.skipped[id]);
  if (exp) return { id: exp, reason: 'expiring' };
  const todo = order.find(id => !state.done[id] && !state.skipped[id]);
  if (todo) return { id: todo, reason: 'todo' };
  const skipped = order.find(id => !state.done[id]);
  if (skipped) return { id: skipped, reason: 'skipped' };
  return null;
}
