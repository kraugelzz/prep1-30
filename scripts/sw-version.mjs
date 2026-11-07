// คำนวณ VERSION ของ service worker จากเนื้อหาไฟล์ที่ precache
// ใช้: node scripts/sw-version.mjs        → เขียน VERSION ใหม่ลง sw.js
//      import { expectedVersion } …        → ใช้ในเทสต์
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SW = join(ROOT, 'sw.js');
const TEXT = /\.(html|css|js|mjs|json|webmanifest|svg|txt)$/;

export function precacheFiles(swSource) {
  const m = swSource.match(/const FILES = \[([\s\S]*?)\];/);
  if (!m) throw new Error('ไม่พบ FILES ใน sw.js');
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]).filter(f => f !== './');
}

export function currentVersion(swSource) {
  const m = swSource.match(/const VERSION = '([^']+)';/);
  return m ? m[1] : null;
}

export function expectedVersion(swSource = readFileSync(SW, 'utf8')) {
  const h = createHash('sha256');
  for (const f of precacheFiles(swSource).sort()) {
    let buf = readFileSync(join(ROOT, f));
    // git บน Windows อาจแปลง LF↔CRLF — ทำให้ hash เท่ากันทุกเครื่อง
    if (TEXT.test(f)) buf = Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'));
    h.update(f).update('\0').update(buf).update('\0');
  }
  return `prep72-${h.digest('hex').slice(0, 8)}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const src = readFileSync(SW, 'utf8');
  const next = expectedVersion(src);
  writeFileSync(SW, src.replace(/const VERSION = '[^']+';/, `const VERSION = '${next}';`));
  console.log(`sw.js VERSION = ${next}`);
}
