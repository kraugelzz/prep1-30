// ทดสอบหน้าจอจริงของแอปใน iframe — เปิด http://localhost:8172/tests/e2e.html
// ผลอยู่ใน window.__e2e = { passed, failed, results } ด้วย
// ระวัง: ล้าง service worker/cache ของ origin นี้ และสำรอง+คืนข้อมูล prep72.v1 ให้เอง

const KEY = 'prep72.v1';
const frame = document.getElementById('app');
const results = [];
const wait = ms => new Promise(r => setTimeout(r, ms));

const win = () => frame.contentWindow;
const doc = () => frame.contentDocument;
const q = s => doc().querySelector(s);
const text = s => q(s)?.textContent.trim() ?? null;

function isoIn(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ALL = [
  'cyber-1', 'cyber-2', 'cyber-3', 'cyber-4', 'cyber-5', 'cyber-6', 'cyber-7', 'cyber-8', 'cyber-9', 'cyber-10',
  'money-1', 'money-2', 'money-3', 'money-4', 'money-5', 'money-6',
  'kit-1', 'kit-2', 'kit-3', 'kit-4', 'kit-5', 'kit-6', 'kit-7', 'kit-8', 'kit-9', 'kit-10',
  'contact-1', 'contact-2', 'contact-3', 'contact-4',
];
function seed(extra = {}) {
  return { version: 1, done: {}, skipped: {}, snoozed: {}, expiry: {}, dailySpend: null, contacts: [], meetNear: '', meetFar: '', sosChecked: [], ...extra };
}
const allDone = () => Object.fromEntries(ALL.map(i => [i, '2026-01-01']));

async function boot(state, hash = '#/') {
  if (state) localStorage.setItem(KEY, JSON.stringify(state)); else localStorage.removeItem(KEY);
  await new Promise(r => { frame.onload = r; frame.src = `../index.html?t=${Date.now()}${hash}`; });
  await wait(150);
}
async function go(hash) {
  win().location.hash = hash;
  await wait(80);
}
function click(sel) {
  const el = q(sel);
  if (!el) throw new Error(`ไม่พบ ${sel}`);
  el.click();
}
function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail: cond ? '' : detail });
}

const scenarios = {
  async 'หน้าแรกว่างเปล่า'() {
    await boot(null);
    check('แสดง 0%', text('.big') === '0%', text('.big'));
    check('ข้อแรกคืออีเมล 2 ชั้น', text('.lead')?.includes('ยืนยันตัวตน 2 ชั้น'), text('.lead'));
    check('มี h1 สำหรับโปรแกรมอ่านหน้าจอ', !!q('h1'));
    check('ปุ่มเกิดเหตุสูงอย่างน้อย 44px', q('.sos').getBoundingClientRect().height >= 44);
  },

  async 'ทำข้อแรกจนจบ'() {
    await boot(null);
    click('a.btn');
    await wait(80);
    check('ชื่อข้อแสดงทุกขั้น', text('.mt40 .small')?.includes('ยืนยันตัวตน'));
    for (let i = 0; i < 3; i++) { click('a.btn'); await wait(80); }
    check('ขั้นสุดท้ายยังเห็นชื่อข้อ', text('.mt40 .small')?.includes('ยืนยันตัวตน'));
    click('[data-act="done"]');
    await wait(120);
    check('กลับหน้าแรก 3%', text('.big') === '3%', text('.big'));
  },

  async 'ฟอร์มเงินสด: ตรวจช่องว่าง'() {
    await boot(null, '#/item/money-1/1');
    click('[data-act="done"]');
    await wait(30);
    const input = q('#f-spend');
    check('ขึ้นข้อความผิด', text('#f-err') === 'ใส่จำนวนเงินต่อวันก่อน', text('#f-err'));
    check('ช่องถูกทำเครื่องหมาย aria-invalid', input.getAttribute('aria-invalid') === 'true');
    check('โฟกัสไปที่ช่องที่ผิด', doc().activeElement === input);
    input.value = '400';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    check('คำนวณเป้า 1,200 บาท', text('#f-goal') === 'เป้าเงินสด 1,200 บาท', text('#f-goal'));
    check('พิมพ์แล้ว aria-invalid หาย', !input.hasAttribute('aria-invalid'));
  },

  async 'รายชื่อ: ต้องมี 2 คน และกันโค้ดแปลก'() {
    await boot(null, '#/item/contact-1/1');
    const rows = doc().querySelectorAll('#f-contacts [data-row]');
    rows[0].querySelector('[data-k=name]').value = 'แม่';
    rows[0].querySelector('[data-k=phone]').value = '0812345678';
    click('[data-act="done"]');
    await wait(30);
    check('คนเดียวไม่ผ่าน', text('#f-err') === 'ใส่อย่างน้อย 2 คน', text('#f-err'));
    rows[1].querySelector('[data-k=name]').value = '<img src=x onerror=alert(1)>';
    rows[1].querySelector('[data-k=phone]').value = '0899999999';
    click('[data-act="done"]');
    await wait(100);
    await go('#/sos');
    check('ชื่อถูกแสดงเป็นตัวหนังสือ ไม่กลายเป็นแท็ก', !q('#app img') && doc().body.textContent.includes('<img src=x'));
  },

  async 'ตรวจข้อความ: live region และโฟกัส'() {
    await boot(null, '#/check');
    const region = q('#scam-result');
    const btn = q('[data-id="link"]');
    btn.focus();
    btn.click();
    await wait(30);
    check('ผลเป็น "ระวัง"', text('#scam-result .level') === 'ระวัง', text('#scam-result .level'));
    check('live region เป็นตัวเดิม (โปรแกรมอ่านหน้าจออ่านผลได้)', q('#scam-result') === region);
    check('โฟกัสอยู่ปุ่มเดิม', doc().activeElement === btn);
    check('aria-pressed เป็น true', btn.getAttribute('aria-pressed') === 'true');
    click('[data-id="otp"]');
    await wait(30);
    check('ขอ OTP → น่าจะหลอก', text('#scam-result .level') === 'น่าจะหลอก');
  },

  async 'ของใกล้หมดอายุ: เลื่อนเตือนและยืนยันวันเดิม'() {
    await boot(seed({ done: allDone(), expiry: { 'kit-1': isoIn(10) } }));
    check('หน้าแรกเตือนน้ำดื่ม', text('.lead') === 'น้ำดื่ม 12 ลิตร', text('.lead'));
    await go('#/item/kit-1/2');
    check('มีปุ่มเตือนอีก 7 วัน', !!q('[data-act="snooze"]'));
    check('มีปุ่มยังไม่ได้ทำ', !!q('[data-act="undo"]'));
    click('[data-act="done"]');
    await wait(30);
    check('ยืนยันวันเดิมไม่ได้', text('#f-err') === 'ใส่วันหมดอายุของล็อตใหม่ หรือเว้นว่างไว้', text('#f-err'));
    click('[data-act="snooze"]');
    await wait(100);
    check('เลื่อนแล้วหน้าแรกพร้อม', text('.lead') === 'พร้อมแล้ว', text('.lead'));
    const st = JSON.parse(localStorage.getItem(KEY));
    check('บันทึกวันเลื่อน 7 วัน', st.snoozed['kit-1'] === isoIn(7), st.snoozed['kit-1']);
  },

  async 'ล็อตใหม่ที่หมดอายุใน 30 วันไม่วนเตือน'() {
    await boot(seed({ done: allDone(), expiry: { 'kit-1': isoIn(5) } }), '#/item/kit-1/2');
    q('#f-expiry').value = isoIn(20);
    click('[data-act="done"]');
    await wait(100);
    check('หน้าแรกไม่เตือนซ้ำ', text('.lead') === 'พร้อมแล้ว', text('.lead'));
  },

  async 'ข้อที่ทำแล้วไม่ถูกติดสถานะข้าม'() {
    await boot(seed({ done: { 'cyber-1': '2026-01-01' } }), '#/item/cyber-1/0');
    check('ปุ่มรองคือ ปิด', text('.btn.ghost') === 'ปิด', text('.btn.ghost'));
  },

  async 'นำไฟล์เข้า: ไฟล์เสียและ id แปลก'() {
    await boot(seed({ done: { 'cyber-1': '2026-01-01' } }), '#/all');
    const put = async content => {
      const input = q('#f-import');
      const dt = new DataTransfer();
      dt.items.add(new File([content], 'b.json', { type: 'application/json' }));
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(120);
    };
    await put('ไม่ใช่ json');
    check('ไฟล์เสียแจ้งผิด', text('#f-err')?.includes('ข้อมูลเดิมยังอยู่ครบ'), text('#f-err'));
    check('ข้อมูลเดิมยังอยู่', JSON.parse(localStorage.getItem(KEY)).done['cyber-1']);
    check('เลือกไฟล์ซ้ำได้ (value ถูกล้าง)', q('#f-import').value === '');
    await put(JSON.stringify(seed({ done: { 'kit-99': 'x', 'kit-1': '2026-01-01' }, expiry: { 'kit-99': isoIn(2) } })));
    check('id แปลกไม่ทำให้หน้าแรกพัง', text('.big') === '3%', text('.big'));
  },

  async 'อีกแท็บบันทึก → หน้านี้อัปเดตตาม'() {
    await boot(null, '#/all');
    localStorage.setItem(KEY, JSON.stringify(seed({ done: allDone() })));
    await wait(150);
    check('แสดง 100% จากอีกแท็บ', text('.top .small') === '100%', text('.top .small'));
  },
};

async function run() {
  const backup = localStorage.getItem(KEY);
  for (const r of await navigator.serviceWorker?.getRegistrations?.() ?? []) await r.unregister();
  for (const k of await caches.keys()) if (k.startsWith('prep72-')) await caches.delete(k);
  for (const [name, fn] of Object.entries(scenarios)) {
    try { await fn(); } catch (err) { check(`${name}: ทำงานจนจบ`, false, String(err)); }
    for (const r of results) r.scenario ??= name;
  }
  if (backup === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, backup);

  const failed = results.filter(r => !r.ok);
  window.__e2e = { passed: results.length - failed.length, failed: failed.length, results };
  document.getElementById('summary').textContent = `ผ่าน ${results.length - failed.length} / ${results.length}`;
  document.getElementById('results').innerHTML = results.map(r =>
    `<li class="${r.ok ? 'pass' : 'fail'}">${r.ok ? '✓' : '✗'} ${r.scenario}: ${r.name}${r.detail ? ` (ได้ ${r.detail})` : ''}</li>`).join('');
}

run();
