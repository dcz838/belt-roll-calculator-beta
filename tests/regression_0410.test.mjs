import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const html=read('index.html'), app=read('js/app.js'), css=read('css/app.css'), sw=read('service-worker.js'), config=read('supabase/config.toml');

test('critical UI has static fallback text before JavaScript initializes',()=>{
  for (const s of ['>Calculator</button>','>Tools</button>','>Inventory</button>','>History</button>','>Users</button>','>Settings</button>','>About</button>','data-i="input">Input</h2>','data-i="result">Result</h2>']) assert.match(html,new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('startup guard is installed before app module and module load has explicit failure handler',()=>{
  assert.match(html,/window\.BRCBootFail/);
  assert.match(html,/id="startupError"/);
  assert.match(html,/type="module"[^>]+onerror="window\.BRCBootFail/);
  assert.ok(html.indexOf('window.BRCBootFail') < html.indexOf('type="module"'));
});

test('app marks startup ready only after main initialization path completes',()=>{
  assert.match(app,/translate\(\);window\.BRCMarkReady\?\.\(\)/);
});

test('startup error has visible non-destructive UI',()=>{
  assert.match(css,/\.startup-error/);
  assert.match(html,/Reload App/);
  assert.doesNotMatch(html,/localStorage\.clear/);
});

test('edge function CLI config matches dashboard custom auth mode',()=>{
  assert.match(config,/verify_jwt\s*=\s*false/);
});

test('service worker cache is isolated to current build',()=>{
  assert.match(sw,/04-15/);
  assert.doesNotMatch(sw,/04-09/);
});
