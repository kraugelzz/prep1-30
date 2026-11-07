import { GROUPS, ITEMS, ORDER, HOTLINES, NEWS, SIGNALS, SOS_STEPS, IF_SCAMMED } from './data.js';
import { percent, groupPercent, nextItem, expiringIds, doneCount, addDays, SNOOZE_DAYS } from './progress.js';
import { assess } from './scam.js';
import { createStore, KEY } from './store.js';

const $app = document.getElementById('app');
const byId = Object.fromEntries(ITEMS.map(i => [i.id, i]));

function safeLocalStorage() {
  try { return window.localStorage; } catch { return null; }
}
const store = createStore(safeLocalStorage(), { knownIds: ITEMS.map(i => i.id) });

// lastPct: ค่าที่เส้นความคืบหน้าแสดงอยู่ เพื่อให้เส้นขยับจากค่าเดิมไปค่าใหม่
const ui = { offlineReady: null, updateReady: null, scamPicked: [], showScammed: false, lastPct: null };

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date();
const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const baht = n => Math.round(n).toLocaleString('th-TH');
const telHref = n => `tel:${String(n).replace(/[^\d+]/g, '')}`;

// ───────── หน้าแรก ─────────
function viewHome() {
  const s = store.state;
  const pct = percent(s, ITEMS);
  const done = doneCount(s, ITEMS);
  const next = nextItem(s, ORDER, today());
  const it = next && byId[next.id];

  let nextBlock;
  if (it) {
    const label = { todo: 'ต่อไป', skipped: 'ที่ข้ามไว้', expiring: 'ใกล้หมดอายุ ถึงเวลาเปลี่ยน' }[next.reason];
    nextBlock = `
      <p class="small ${next.reason === 'expiring' ? 'warn' : ''}">${label}</p>
      <p class="lead">${esc(it.title)}</p>
      <p class="why">ราว ${it.minutes} นาที ${esc(it.why)}</p>
      <a class="btn mt20" href="#/item/${it.id}/0">เริ่ม</a>`;
  } else {
    nextBlock = `
      <p class="lead">พร้อมแล้ว</p>
      <p class="why">กลับมาดูทุก 3 เดือน แอปจะเตือนเมื่อของใกล้หมดอายุ</p>
      <a class="btn mt20" href="#/all">ดูทั้งหมด</a>`;
  }

  const notices = [];
  if (!store.persistent) notices.push('<p class="notice">ความคืบหน้าจะไม่ถูกบันทึกในโหมดนี้</p>');
  if (ui.offlineReady === false) notices.push('<p class="notice">ยังใช้ออฟไลน์ไม่ได้ เปิดผ่านลิงก์ https อีกครั้ง</p>');
  if (ui.updateReady) notices.push('<button class="notice" data-act="update">มีเวอร์ชันใหม่ แตะเพื่อโหลด</button>');

  return `
    <div class="top"><h1 class="sr" tabindex="-1">พร้อม 72 ความพร้อมของคุณ</h1><span></span><a class="sos" href="#/sos">เกิดเหตุ</a></div>
    ${notices.join('')}
    <p class="big">${pct}%</p>
    <div class="bar" aria-hidden="true"><span data-pct="${pct}"></span></div>
    <p class="small">ทำแล้ว ${done} จาก ${ITEMS.length}</p>
    <div class="spacer"></div>
    ${nextBlock}
    <nav class="foot" aria-label="เมนู">
      <a href="#/all">ทั้งหมด</a><a href="#/check">ตรวจข้อความ</a><a href="#/contacts">เบอร์ฉุกเฉิน</a>
    </nav>`;
}

// ───────── ทำทีละขั้น ─────────
function inputFields(it) {
  const s = store.state;
  let html = '';
  if (it.input === 'dailySpend') {
    const v = s.dailySpend ?? '';
    html += `<label class="field">ใช้เงินต่อวันประมาณ (บาท)
      <input type="number" inputmode="numeric" min="1" step="1" id="f-spend" value="${esc(v)}" placeholder="400"></label>
      <p class="small" id="f-goal">${v ? `เป้าเงินสด ${baht(v * 3)} บาท` : ''}</p>`;
  }
  if (it.input === 'contacts') {
    const rows = s.contacts.length ? s.contacts : [{ name: '', phone: '' }, { name: '', phone: '' }];
    html += `<div id="f-contacts">${rows.map((c, i) => contactRow(c, i)).join('')}</div>
      ${rows.length < 5 ? '<button class="link" data-act="add-contact" type="button">เพิ่มอีกคน</button>' : ''}`;
  }
  if (it.input === 'meetNear' || it.input === 'meetFar') {
    const ph = it.input === 'meetNear' ? 'หน้าร้านสะดวกซื้อปากซอย' : 'บ้านป้าที่ลำปาง';
    html += `<label class="field">จุดนัดพบ
      <input type="text" id="f-meet" maxlength="120" value="${esc(s[it.input])}" placeholder="${ph}"></label>`;
  }
  if (it.expiry) {
    html += `<label class="field">หมดอายุวันที่ (ไม่ใส่ก็ได้)
      <input type="date" id="f-expiry" value="${esc(s.expiry[it.id] || '')}"></label>`;
  }
  return html;
}

function contactRow(c, i) {
  return `<div class="pair" data-row="${i}">
    <label class="field">ชื่อ<input type="text" maxlength="40" data-k="name" value="${esc(c.name)}" placeholder="แม่"></label>
    <label class="field">เบอร์<input type="tel" inputmode="tel" maxlength="20" data-k="phone" value="${esc(c.phone)}" placeholder="081 234 5678"></label>
  </div>`;
}

function viewItem(id, stepStr) {
  const it = byId[id];
  if (!it) return viewHome();
  const n = it.steps.length;
  const step = Math.min(Math.max(parseInt(stepStr, 10) || 0, 0), n - 1);
  const last = step === n - 1;
  const done = !!store.state.done[id];
  const expiring = isExpiring(id);

  // ปุ่มรอง: ยังไม่ทำ = ไว้ทีหลัง (ข้าม), ใกล้หมดอายุ = เตือนอีก 7 วัน (เลื่อน),
  // ทำแล้ว = ปิด (หน้าแรก) — ข้อที่ทำแล้วไม่ถูกติดสถานะข้าม
  const secondary = !done
    ? `<button class="btn ghost" data-act="skip" data-id="${id}">ไว้ทีหลัง</button>`
    : expiring
      ? `<button class="btn ghost" data-act="snooze" data-id="${id}">เตือนอีก ${SNOOZE_DAYS} วัน</button>`
      : '<a class="btn ghost" href="#/">ปิด</a>';
  const undoBtn = done ? `<button class="btn ghost" data-act="undo" data-id="${id}">ยังไม่ได้ทำ</button>` : '';

  return `
    <div class="top"><a href="#/">ปิด</a><span class="small">${esc(GROUPS[it.group])}</span></div>
    <div class="mt40">
      <p class="small">${esc(it.title)}</p>
      ${n > 1 ? `<p class="small">ขั้นที่ ${step + 1} จาก ${n}</p>` : ''}
      <h1 class="lead mt8" tabindex="-1">${esc(it.steps[step])}</h1>
      ${last ? inputFields(it) : ''}
      <p class="err" id="f-err" role="alert"></p>
    </div>
    <div class="spacer"></div>
    ${last
      ? `<button class="btn" data-act="done" data-id="${id}">ทำแล้ว</button>${expiring ? secondary : ''}${undoBtn || secondary}`
      : `<a class="btn" href="#/item/${id}/${step + 1}">ต่อไป</a>
         ${step > 0 ? `<a class="btn ghost" href="#/item/${id}/${step - 1}">ย้อนกลับ</a>` : secondary}`}`;
}

function isExpiring(id) {
  return expiringIds(store.state, today()).includes(id);
}

function collectAndValidate(it) {
  const errEl = document.getElementById('f-err');
  const fail = (msg, el) => {
    errEl.textContent = msg;
    if (el) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', 'f-err'); el.focus(); }
    return null;
  };
  const firstContact = () => document.querySelector('#f-contacts input');
  const patch = {};
  if (it.input === 'dailySpend') {
    const v = Number(document.getElementById('f-spend').value);
    if (!Number.isFinite(v) || v <= 0) return fail('ใส่จำนวนเงินต่อวันก่อน', document.getElementById('f-spend'));
    patch.dailySpend = Math.round(v);
  }
  if (it.input === 'contacts') {
    const rows = [...document.querySelectorAll('#f-contacts [data-row]')].map(r => ({
      name: r.querySelector('[data-k="name"]').value.trim(),
      phone: r.querySelector('[data-k="phone"]').value.trim(),
    })).filter(c => c.name || c.phone);
    if (rows.some(c => !c.name || !c.phone)) return fail('ใส่ทั้งชื่อและเบอร์ในแถวที่กรอก', firstContact());
    if (rows.some(c => c.phone.replace(/\D/g, '').length < 3)) return fail('เบอร์โทรดูไม่ถูกต้อง', firstContact());
    if (rows.length < 2) return fail('ใส่อย่างน้อย 2 คน', firstContact());
    patch.contacts = rows.slice(0, 5);
  }
  if (it.input === 'meetNear' || it.input === 'meetFar') {
    const v = document.getElementById('f-meet').value.trim();
    if (!v) return fail('พิมพ์จุดนัดพบก่อน', document.getElementById('f-meet'));
    patch[it.input] = v;
  }
  if (it.expiry) {
    patch.expiry = document.getElementById('f-expiry').value || null;
    // เปลี่ยนของแล้วต้องใส่วันของล็อตใหม่ ไม่งั้นจะถูกเตือนข้อเดิมวนไม่จบ
    if (patch.expiry && patch.expiry === store.state.expiry[it.id] && isExpiring(it.id)) {
      return fail('ใส่วันหมดอายุของล็อตใหม่ หรือเว้นว่างไว้', document.getElementById('f-expiry'));
    }
  }
  return patch;
}

// ───────── ทั้งหมด ─────────
function viewAll() {
  const s = store.state;
  const exp = new Set(expiringIds(s, today()));
  const groups = Object.keys(GROUPS).map(g => `
    <div class="group-head"><h2>${GROUPS[g]}</h2><span class="small">${groupPercent(s, ITEMS, g)}%</span></div>
    <div class="rows">${ITEMS.filter(i => i.group === g).map(it => {
      const d = !!s.done[it.id];
      const mark = d ? 'on' : s.skipped[it.id] ? 'skip' : '';
      const end = exp.has(it.id) ? '<span class="end warn">ใกล้หมดอายุ</span>' : '';
      return `<a class="row" href="#/item/${it.id}/0"><span class="mark ${mark}" aria-hidden="true"></span>
        <span class="grow">${esc(it.title)}<span class="sr">${d ? ' (ทำแล้ว)' : s.skipped[it.id] ? ' (ข้ามไว้)' : ''}</span></span>${end}</a>`;
    }).join('')}</div>`).join('');

  return `
    <div class="top"><a href="#/">ปิด</a><span class="small">${percent(s, ITEMS)}%</span></div>
    <h1 class="mt16" tabindex="-1">ทั้งหมด</h1>
    ${groups}
    <h2>ข้อมูลของคุณ (อยู่ในเครื่องนี้เท่านั้น)</h2>
    <div class="rows">
      <button class="row" data-act="export"><span class="grow">สำรองข้อมูลเป็นไฟล์</span></button>
      <button class="row" data-act="pick-import"><span class="grow">นำข้อมูลกลับจากไฟล์</span></button>
      <input type="file" accept="application/json,.json" id="f-import" data-act="import" hidden>
      <a class="row" href="#/print"><span class="grow">พิมพ์สรุป</span></a>
      <button class="row" data-act="reset"><span class="grow warn">ล้างข้อมูลทั้งหมด</span></button>
    </div>
    <p class="err" id="f-err" role="alert"></p>`;
}

// ───────── ตรวจข้อความ ─────────
function scamResult() {
  const r = assess(ui.scamPicked, SIGNALS);
  const [level, tips] = {
    none: ['ไม่พบสัญญาณหลอกที่ชัด', ['ถ้ายังไม่แน่ใจ โทรถามเจ้าของเรื่องด้วยเบอร์ที่หาเอง']],
    caution: ['ระวัง', r.advice],
    likely: ['น่าจะหลอก', r.advice],
  }[r.level];
  return `<p class="level ${r.level === 'likely' ? 'warn' : ''}">${level}</p>
      <ul>${tips.map(a => `<li>${esc(a)}</li>`).join('')}</ul>`;
}

function viewCheck() {
  return `
    <div class="top"><a href="#/">ปิด</a><span></span></div>
    <h1 class="lead q" tabindex="-1">ข้อความที่ได้รับ…</h1>
    <div role="group" aria-label="สัญญาณที่พบ">
      ${SIGNALS.map(sg => `<button class="opt" data-act="signal" data-id="${sg.id}" aria-pressed="${ui.scamPicked.includes(sg.id)}">${esc(sg.label)}</button>`).join('')}
    </div>
    <div class="result" id="scam-result" aria-live="polite" aria-atomic="true">${scamResult()}</div>
    <div class="spacer"></div>
    <button class="btn ghost" data-act="toggle-scammed" aria-expanded="${ui.showScammed}">ถ้าโดนหลอกไปแล้ว</button>
    ${ui.showScammed ? `${numberedList(IF_SCAMMED)}
      <a class="btn mt12" href="tel:1441">โทร 1441</a>` : ''}
    <p class="small mt12">ตรวจในเครื่องนี้ ไม่มีข้อมูลส่งออกไปไหน</p>`;
}

// ───────── เกิดเหตุ ─────────
function viewSos() {
  const s = store.state;
  return `
    <div class="top"><a href="#/">ปิด</a><button class="link" data-act="sos-reset">เริ่มใหม่</button></div>
    <h1 class="mt16" tabindex="-1">ทำทีละข้อ</h1>
    <div class="rows mt12">
      ${SOS_STEPS.map((t, i) => {
        const on = s.sosChecked.includes(i);
        return `<button class="row" data-act="sos" data-i="${i}" aria-pressed="${on}"><span class="mark ${on ? 'on' : ''}" aria-hidden="true"></span><span class="grow">${esc(t)}</span></button>`;
      }).join('')}
    </div>
    ${personalBlock()}
    <h2>เบอร์ฉุกเฉิน</h2>
    ${hotlineList()}`;
}

function personalBlock() {
  const s = store.state;
  const contacts = s.contacts.length
    ? s.contacts.map(c => `<a class="tel" href="${telHref(c.phone)}"><b>${esc(c.name)}</b><span>${esc(c.phone)}</span></a>`).join('')
    : `<a class="tel no-print" href="#/item/contact-1/${byId['contact-1'].steps.length - 1}"><span>ยังไม่ได้เพิ่ม แตะเพื่อเพิ่ม</span></a>`;
  const meet = (label, v, id) => v
    ? `<div class="tel"><span class="l">${label}</span><b class="v">${esc(v)}</b></div>`
    : `<a class="tel no-print" href="#/item/${id}/${byId[id].steps.length - 1}"><span class="l">${label}</span><span>ยังไม่ได้ตั้ง</span></a>`;
  return `
    <h2>คนสำคัญ</h2>${contacts}
    <h2>จุดนัดพบ</h2>${meet('ใกล้บ้าน', s.meetNear, 'contact-2')}${meet('นอกพื้นที่', s.meetFar, 'contact-3')}`;
}

function numberedList(lines) {
  return `<ol class="steps">${lines.map((t, i) => `<li><span class="n">${i + 1}</span><span>${esc(t)}</span></li>`).join('')}</ol>`;
}

function hotlineList() {
  return HOTLINES.map(h => `<a class="tel" href="tel:${h.num}"><b>${h.num}</b><span>${esc(h.label)}</span></a>`).join('');
}

// ───────── เบอร์ฉุกเฉิน ─────────
function viewContacts() {
  return `
    <div class="top"><a href="#/">ปิด</a><span></span></div>
    <h1 class="mt16" tabindex="-1">เบอร์ฉุกเฉิน</h1>
    <p class="small">แตะเบอร์เพื่อโทร</p>
    ${hotlineList()}
    ${personalBlock()}
    <h2>เช็กข่าวจากแหล่งทางการ</h2>
    ${NEWS.map(n => `<a class="tel" href="${n.url}" target="_blank" rel="noopener noreferrer"><span class="l ink">${esc(n.name)}</span><span>${esc(n.url.replace(/^https:\/\/(www\.)?/, ''))}</span></a>`).join('')}
    <p class="small mt12">ลิงก์ข่าวต้องใช้เน็ต ส่วนเบอร์โทรใช้ได้เสมอ</p>`;
}

// ───────── พิมพ์สรุป ─────────
function viewPrint() {
  const s = store.state;
  const todo = ORDER.filter(id => !s.done[id]).map(id => byId[id]);
  return `
    <div class="top no-print"><a href="#/">ปิด</a><span></span></div>
    <h1 class="mt16" tabindex="-1">พร้อม 72 สรุปฉุกเฉิน</h1>
    <p class="small">พิมพ์เมื่อ ${isoDay(today())}</p>
    <h2>เมื่อเกิดเหตุ</h2>
    ${numberedList(SOS_STEPS)}
    ${personalBlock()}
    ${s.dailySpend ? `<h2>เงินสดสำรอง</h2><p>เป้า ${baht(s.dailySpend * 3)} บาท (แบงก์ย่อย)</p>` : ''}
    <h2>เบอร์ฉุกเฉิน</h2>
    ${hotlineList()}
    ${todo.length ? `<h2>ยังไม่ได้ทำ (${todo.length})</h2><p class="small">${todo.map(t => esc(t.title)).join(' / ')}</p>` : ''}
    <div class="spacer no-print"></div>
    <button class="btn no-print" data-act="print">พิมพ์</button>`;
}

// ───────── router ─────────
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  switch (parts[0]) {
    case 'item': return viewItem(parts[1], parts[2]);
    case 'all': return viewAll();
    case 'check': return viewCheck();
    case 'sos': return viewSos();
    case 'contacts': return viewContacts();
    case 'print': return viewPrint();
    default: return viewHome();
  }
}

// ปุ่มที่กดอยู่ระบุได้ด้วย data-act + data-id/data-i — ใช้หาปุ่มเดิมหลัง render ใหม่
function focusKey(el) {
  if (!el || !$app.contains(el) || !el.dataset || !el.dataset.act) return null;
  return `[data-act="${el.dataset.act}"]` +
    (el.dataset.id ? `[data-id="${el.dataset.id}"]` : '') +
    (el.dataset.i ? `[data-i="${el.dataset.i}"]` : '');
}

function setBar(el, pct) {
  el.style.transform = `scaleX(${pct / 100})`;
}

let lastHash = null;
function render() {
  const keep = focusKey(document.activeElement);
  $app.innerHTML = route();

  // เส้นความคืบหน้า: วาดที่ค่าเดิมก่อน แล้วค่อยขยับไปค่าใหม่ในเฟรมถัดไป ให้เห็นว่าเพิ่มขึ้น
  const bar = $app.querySelector('[data-pct]');
  if (bar) {
    const pct = Number(bar.dataset.pct);
    if (ui.lastPct !== null && ui.lastPct !== pct) {
      setBar(bar, ui.lastPct);
      void bar.offsetWidth; // บังคับให้เบราว์เซอร์คำนวณค่าเดิมก่อน transition จึงทำงาน (ไม่พึ่ง rAF ที่หยุดตอนแท็บอยู่เบื้องหลัง)
    }
    setBar(bar, pct);
    ui.lastPct = pct;
  }

  if (location.hash !== lastHash) {
    lastHash = location.hash;
    window.scrollTo(0, 0);
    const h = $app.querySelector('h1[tabindex]');
    (h || $app).focus({ preventScroll: true });
  } else if (keep) {
    $app.querySelector(keep)?.focus({ preventScroll: true });
  }
}

function goHome() { location.hash = '#/'; }

// ───────── events ─────────
$app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'INPUT') return;
  const act = el.dataset.act;
  const id = el.dataset.id;

  if (act === 'done') {
    const it = byId[id];
    const patch = collectAndValidate(it);
    if (!patch) return;
    store.update(s => {
      s.done[id] = isoDay(today());
      delete s.skipped[id];
      if ('dailySpend' in patch) s.dailySpend = patch.dailySpend;
      if (patch.contacts) s.contacts = patch.contacts;
      if (patch.meetNear) s.meetNear = patch.meetNear;
      if (patch.meetFar) s.meetFar = patch.meetFar;
      delete s.snoozed[id];
      if (it.expiry) {
        if (patch.expiry) s.expiry[id] = patch.expiry; else delete s.expiry[id];
      }
    });
    // ล็อตใหม่ที่หมดอายุภายใน 30 วันอยู่แล้ว: รับทราบแล้ว เตือนอีกทีวันที่หมดอายุจริง
    if (isExpiring(id)) store.update(s => { s.snoozed[id] = s.expiry[id]; });
    goHome();
  } else if (act === 'snooze') {
    store.update(s => { s.snoozed[id] = addDays(today(), SNOOZE_DAYS); });
    goHome();
  } else if (act === 'undo') {
    store.update(s => { delete s.done[id]; delete s.skipped[id]; delete s.snoozed[id]; });
    goHome();
  } else if (act === 'skip') {
    store.update(s => { s.skipped[id] = true; });
    goHome();
  } else if (act === 'add-contact') {
    const box = document.getElementById('f-contacts');
    const count = box.querySelectorAll('[data-row]').length;
    if (count < 5) box.insertAdjacentHTML('beforeend', contactRow({ name: '', phone: '' }, count));
    if (count + 1 >= 5) el.remove();
  } else if (act === 'signal') {
    ui.scamPicked = ui.scamPicked.includes(id) ? ui.scamPicked.filter(x => x !== id) : [...ui.scamPicked, id];
    // แก้เฉพาะปุ่มและผล ไม่สร้างหน้าใหม่ — live region ต้องคงอยู่ โปรแกรมอ่านหน้าจอถึงจะอ่านผล
    el.setAttribute('aria-pressed', String(ui.scamPicked.includes(id)));
    document.getElementById('scam-result').innerHTML = scamResult();
  } else if (act === 'toggle-scammed') {
    ui.showScammed = !ui.showScammed;
    render();
  } else if (act === 'sos') {
    const i = Number(el.dataset.i);
    store.update(s => { s.sosChecked = s.sosChecked.includes(i) ? s.sosChecked.filter(x => x !== i) : [...s.sosChecked, i]; });
    render();
  } else if (act === 'sos-reset') {
    store.update(s => { s.sosChecked = []; });
    render();
  } else if (act === 'export') {
    exportBackup();
  } else if (act === 'pick-import') {
    document.getElementById('f-import').click();
  } else if (act === 'reset') {
    if (confirm('ล้างความคืบหน้า รายชื่อ และจุดนัดพบทั้งหมดในเครื่องนี้?')) {
      store.reset();
      goHome();
    }
  } else if (act === 'print') {
    window.print();
  } else if (act === 'update' && ui.updateReady) {
    ui.updateReady.postMessage('skipWaiting');
  }
});

// navigator.standalone มีเฉพาะ iOS Safari — Android ใช้ลิงก์ดาวน์โหลดตามปกติ (บันทึกลง Downloads ได้)
const isIOSApp = () => navigator.standalone === true;

// แอปที่ติดตั้งบน iPhone: ลิงก์ดาวน์โหลด blob จะเปิดไฟล์ค้างโดยไม่มีปุ่มกลับ จึงใช้แผ่นแชร์แทน
async function exportBackup() {
  const name = `prep72-${isoDay(today())}.json`;
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  if (isIOSApp() && typeof File === 'function' && navigator.canShare) {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$app.addEventListener('change', async e => {
  if (e.target.dataset.act !== 'import') return;
  const input = e.target;
  const file = input.files[0];
  input.value = ''; // ให้เลือกไฟล์เดิมซ้ำได้หลังแก้ไฟล์
  if (!file) return;
  const r = store.importJSON(await file.text());
  if (r.ok) goHome();
  else document.getElementById('f-err').textContent = `${r.error} ข้อมูลเดิมยังอยู่ครบ`;
});

// อีกแท็บหรือแอปที่ติดตั้งบันทึก → โหลดค่าใหม่ ไม่ให้เขียนทับกัน
window.addEventListener('storage', e => {
  if (e.key !== KEY && e.key !== null) return;
  store.reload();
  // ไม่ render ทับฟอร์มที่กำลังกรอกอยู่ ค่าใหม่จะแสดงเมื่อเปลี่ยนหน้า
  if (!location.hash.startsWith('#/item/')) render();
});

$app.addEventListener('input', e => {
  const errEl = document.getElementById('f-err');
  if (errEl) errEl.textContent = '';
  e.target.removeAttribute?.('aria-invalid');
  if (e.target.id === 'f-spend') {
    const v = Number(e.target.value);
    document.getElementById('f-goal').textContent = v > 0 ? `เป้าเงินสด ${baht(v * 3)} บาท` : '';
  }
});

window.addEventListener('hashchange', render);
render();

// ───────── ออฟไลน์ ─────────
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(reg => {
    ui.offlineReady = true;
    const watch = w => {
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) {
          ui.updateReady = w;
          render();
        }
      });
    };
    if (reg.waiting && navigator.serviceWorker.controller) { ui.updateReady = reg.waiting; render(); }
    reg.addEventListener('updatefound', () => watch(reg.installing));
  }).catch(() => {
    ui.offlineReady = false;
    render();
  });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !ui.updateReady) return;
    reloading = true;
    location.reload();
  });
} else {
  ui.offlineReady = false;
  render();
}
