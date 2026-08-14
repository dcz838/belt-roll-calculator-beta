import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const appPath = new URL('../js/app.js', import.meta.url);
const htmlPath = new URL('../index.html', import.meta.url);
const app = fs.readFileSync(appPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

test('app.js parses in ES module mode', () => {
  const tmp = path.join(os.tmpdir(), `brc-app-${process.pid}.mjs`);
  fs.writeFileSync(tmp, app);
  const r = spawnSync(process.execPath, ['--check', tmp], {encoding:'utf8'});
  fs.unlinkSync(tmp);
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('share backup handler closes all call parentheses', () => {
  assert.ok(app.includes("adminAuth(()=>shareBackup().catch(()=>toast(tr('shareUnavailable'))))}"));
});

test('startup watchdog preserves first concrete failure', () => {
  assert.match(html, /let ready=false,failed=false/);
  assert.match(html, /if\(ready\|\|failed\)return;failed=true/);
  assert.match(html, /if\(!ready&&!failed\)/);
});
