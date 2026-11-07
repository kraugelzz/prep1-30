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
    check('ข้อแรกเป็นข้อง่าย (เพิ่มคนสำคัญ)', text('.lead') === 'เพิ่มคนสำคัญอย่างน้อย 2 คน', text('.lead'));
    check('ชื่อแอปเห็นได้บนหน้าแรก', text('h1') === 'พร้อม 72' && q('h1').getBoundingClientRect().width > 50, text('h1'));
    check('บอกว่าแอปทำอะไร', text('.purpose')?.includes('72 ชั่วโมง'), text('.purpose'));
    check('บอกว่าฟรี ไม่ต้องสมัคร ข้อมูลอยู่ในเครื่อง', ['ฟรี', 'ไม่ต้องสมัคร', 'อยู่ในเครื่อง'].every(w => text('.promise')?.includes(w)), text('.promise'));
    check('บอกเวลารวมที่เหลือ', /ราว .*(ชั่วโมง|นาที)/.test(text('.total') ?? ''), text('.total'));
    check('มีปุ่มโทร 191 และ 1669 บนหน้าแรก', !!q('a[href="tel:191"]') && !!q('a[href="tel:1669"]'));
    check('ปุ่มฉุกเฉินสูงอย่างน้อย 44px', q('.sos').getBoundingClientRect().height >= 44);
    check('ปุ่มฉุกเฉินชื่อชัด', text('.sos') === 'ฉุกเฉิน', text('.sos'));
    check('มีลิงก์เกี่ยวกับแอป', !!q('a[href="#/about"]'));
  },

  async 'หัวข้อที่รับโฟกัสไม่มีกรอบดำ'() {
    await boot(null, '#/all');
    const h = q('h1');
    check('โฟกัสอยู่ที่หัวข้อ', doc().activeElement === h);
    check('ไม่มีเส้นกรอบ', win().getComputedStyle(h).outlineStyle === 'none', win().getComputedStyle(h).outlineStyle);
  },

  async 'รายการทั้งหมดบอกเวลาแต่ละข้อ'() {
    await boot(null, '#/all');
    check('มีนาทีข้างแต่ละข้อ', doc().querySelectorAll('.row .mins').length === 30);
  },

  async 'หน้าเกี่ยวกับแอป'() {
    await boot(null, '#/about');
    check('บอกว่าไม่แสวงกำไร', doc().body.textContent.includes('ไม่แสวงกำไร'));
    check('มีแหล่งอ้างอิง ธปท.', !!q('a[href*="bot.or.th"]'));
    check('บอกวันที่ตรวจข้อมูลล่าสุด', doc().body.textContent.includes('ตรวจข้อมูลล่าสุด'));
  },

  async 'ทำข้อแรกจนจบ'() {
    await boot(null, '#/item/cyber-1/0');
    check('ชื่อข้อแสดงทุกขั้น', text('.mt40 .small')?.includes('รหัส 2 ชั้น'), text('.mt40 .small'));
    for (let i = 0; i < 3; i++) { click('a.btn'); await wait(80); }
    check('ขั้นสุดท้ายยังเห็นชื่อข้อ', text('.mt40 .small')?.includes('รหัส 2 ชั้น'));
    click('[data-act="done"]');
    await wait(120);
    check('กลับหน้าแรก 3%', text('.big') === '3%', text('.big'));
  },

  async 'ตรวจข้อความ: ยังไม่เลือก = ยังไม่ตัดสิน'() {
    await boot(null, '#/check');
    check('ไม่บอกว่าปลอดภัยก่อนเลือก', !doc().body.textContent.includes('ไม่พบสัญญาณหลอก'));
    check('บอกให้แตะข้อที่ตรง', text('#scam-result .level')?.includes('แตะ'), text('#scam-result .level'));
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

  async 'ของที่หมดอายุแล้ว: ไม่มีปุ่มเลื่อน และบอกว่าหมดอายุแล้ว'() {
    await boot(seed({ done: allDone(), expiry: { 'kit-1': isoIn(-2) } }));
    check('หน้าแรกบอกหมดอายุแล้ว', text('.small.warn') === 'หมดอายุแล้ว ถึงเวลาเปลี่ยน', text('.small.warn'));
    await go('#/item/kit-1/2');
    check('ไม่มีปุ่มเตือนอีก 7 วัน', !q('[data-act="snooze"]'));
    check('ยังมีปุ่มยังไม่ได้ทำ', !!q('[data-act="undo"]'));
  },

  async 'ล็อตใหม่: เตือนล่วงหน้า 7 วัน'() {
    await boot(seed({ done: allDone(), expiry: { 'kit-3': isoIn(3) } }), '#/item/kit-3/2');
    q('#f-expiry').value = isoIn(25);
    click('[data-act="done"]');
    await wait(100);
    check('ยังไม่เตือนตอนนี้', text('.lead') === 'พร้อมแล้ว', text('.lead'));
    const st = JSON.parse(localStorage.getItem(KEY));
    check('เลื่อนไว้ถึง 7 วันก่อนหมดอายุ', st.snoozed['kit-3'] === isoIn(18), st.snoozed['kit-3']);
    await go('#/item/kit-3/2');
    q('#f-expiry').value = isoIn(5);
    click('[data-act="done"]');
    await wait(100);
    check('ล็อตที่เหลือไม่ถึง 7 วัน เตือนทันที', text('.lead') === 'ยาประจำตัว 7 วัน และยาสามัญ', text('.lead'));
  },

  async 'รายชื่อ: ชี้แถวที่ผิดจริง'() {
    await boot(null, '#/item/contact-1/1');
    const rows = doc().querySelectorAll('#f-contacts [data-row]');
    rows[0].querySelector('[data-k=name]').value = 'แม่';
    rows[0].querySelector('[data-k=phone]').value = '0812345678';
    rows[1].querySelector('[data-k=name]').value = 'พ่อ';
    click('[data-act="done"]');
    await wait(30);
    const phone2 = rows[1].querySelector('[data-k=phone]');
    check('โฟกัสช่องเบอร์ของแถว 2', doc().activeElement === phone2);
    check('แถว 1 ไม่ถูกทำเครื่องหมายผิด', !rows[0].querySelector('[aria-invalid]'));
    phone2.value = '0';
    phone2.dispatchEvent(new Event('input', { bubbles: true }));
    check('พิมพ์แล้ว aria-describedby หายด้วย', !phone2.hasAttribute('aria-describedby') && !phone2.hasAttribute('aria-invalid'));
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
