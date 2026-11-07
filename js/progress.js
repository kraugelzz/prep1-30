// คำนวณความคืบหน้าและเลือก "ข้อต่อไป" — ฟังก์ชันบริสุทธิ์

const DAY = 864e5;

export function percent(state, items) {
  if (!items.length) return 0;
  const done = items.filter(i => state.done[i.id]).length;
  return Math.round((done / items.length) * 100);
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

export function nextItem(state, order, today) {
  const exp = expiringIds(state, today);
  if (exp.length) return { id: exp[0], reason: 'expiring' };
  const todo = order.find(id => !state.done[id] && !state.skipped[id]);
  if (todo) return { id: todo, reason: 'todo' };
  const skipped = order.find(id => !state.done[id]);
  if (skipped) return { id: skipped, reason: 'skipped' };
  return null;
}
