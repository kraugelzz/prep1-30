import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { precacheFiles, currentVersion, expectedVersion } from '../scripts/sw-version.mjs';

const src = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('ทุกไฟล์ใน FILES มีอยู่จริง', () => {
  for (const f of precacheFiles(src)) {
    assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), f);
  }
});

test('ทุกไฟล์ที่แอปใช้ถูก precache (ไม่งั้นออฟไลน์จะพัง)', () => {
  const files = precacheFiles(src);
  const onDisk = [
    'index.html',
    'manifest.webmanifest',
    ...['css', 'js', 'fonts', 'icons'].flatMap(dir =>
      readdirSync(new URL(`../${dir}/`, import.meta.url))
        .filter(f => !f.endsWith('.txt'))
        .map(f => `${dir}/${f}`)),
  ];
  for (const f of onDisk) assert.ok(files.includes(f), `${f} ยังไม่อยู่ใน FILES ของ sw.js`);
});

test('activate ลบเฉพาะ cache ของแอปนี้', () => {
  assert.match(src, /k\.startsWith\('prep72-'\)/);
});

test('VERSION ตรงกับเนื้อหาไฟล์ — ถ้าล้ม ให้รัน npm run stamp', () => {
  assert.equal(currentVersion(src), expectedVersion(src));
});
