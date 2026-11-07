import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { precacheFiles, currentVersion, expectedVersion } from '../scripts/sw-version.mjs';

const src = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('ทุกไฟล์ใน FILES มีอยู่จริง', () => {
  for (const f of precacheFiles(src)) {
    assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), f);
  }
});

test('ทุกไฟล์ใน js/ ถูก precache (ไม่งั้นออฟไลน์จะพัง)', () => {
  const files = precacheFiles(src);
  for (const f of ['js/app.js', 'js/data.js', 'js/progress.js', 'js/scam.js', 'js/store.js']) {
    assert.ok(files.includes(f), f);
  }
});

test('VERSION ตรงกับเนื้อหาไฟล์ — ถ้าล้ม ให้รัน npm run stamp', () => {
  assert.equal(currentVersion(src), expectedVersion(src));
});
