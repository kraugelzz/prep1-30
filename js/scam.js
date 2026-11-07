// ประเมินข้อความน่าสงสัยจากสัญญาณที่ผู้ใช้แตะ — ทำในเครื่องทั้งหมด

export function assess(selected, signals) {
  const picked = signals.filter(s => selected.includes(s.id));
  let level = 'none';
  if (picked.length === 1 && !picked[0].severe) level = 'caution';
  if (picked.length >= 2 || picked.some(s => s.severe)) level = 'likely';
  return { level, advice: picked.map(s => s.advice) };
}
