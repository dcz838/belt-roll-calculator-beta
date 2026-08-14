import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const app=read('js/app.js'),cloud=read('js/cloud.js'),css=read('css/app.css'),sql=read('supabase/migrations/20260814_0414_inventory_location_move.sql'),version=JSON.parse(read('VERSION.json'));

test('04.14 build metadata',()=>assert.equal(version.build,'2026.08.14.04.14'));
test('inventory verification says Confirm rather than Login',()=>{
  const section=app.slice(app.indexOf('async function inventoryAuth'),app.indexOf('function changeInventoryPin'));
  assert.match(section,/确认':'Confirm/);
  assert.doesNotMatch(section,/btn\(tr\('login'\)/);
});
test('edit dialog has sticky header and action spacing',()=>{
  assert.match(app,/sticky-editor/);
  assert.match(css,/\.dialog\.sticky-editor \.dialog-title\{position:sticky/);
  assert.match(css,/#modalTopActions\{display:flex;align-items:center;gap:10px/);
});
test('existing Stock remains visible, locked, and unlocks with forced inventory verification',()=>{
  const section=app.slice(app.indexOf('function beltEditor'),app.indexOf('function stockAction'));
  assert.match(section,/stock\.disabled=!stockUnlocked/);
  assert.match(section,/inventoryAuth\(true\)/);
  assert.match(section,/can\('setBalance'\)/);
  assert.match(section,/stock-unlock/);
});
test('stock edits use set_balance RPC, not a direct inventory_balances update',()=>{
  const section=cloud.slice(cloud.indexOf('async function saveBelt'),cloud.indexOf('async function adjustStock'));
  assert.match(section,/rpcAdjust\(beltId,locationId,'set_balance'/);
  assert.doesNotMatch(section,/from\('inventory_balances'\)\.update/);
});
test('location edits call dedicated atomic RPC',()=>{
  const section=cloud.slice(cloud.indexOf('async function saveBelt'),cloud.indexOf('async function adjustStock'));
  assert.match(section,/client\.rpc\('move_inventory_location'/);
  assert.doesNotMatch(section,/inventory_balances'\)\.update/);
});
test('location options are loaded from active Supabase locations',()=>{
  assert.match(cloud,/from\('locations'\)\.select\('id,location_code,name,is_active'\)\.eq\('is_active',true\)/);
  assert.match(app,/cloudLocations=window\.BRCCloud\?\.state\?\.locations/);
  assert.match(app,/document\.createElement\('select'\)/);
});
test('location move SQL preserves quantity and writes transfer audit records',()=>{
  assert.match(sql,/create or replace function public\.move_inventory_location/);
  assert.match(sql,/for update/);
  assert.match(sql,/'transfer_out'/);
  assert.match(sql,/'transfer_in'/);
  assert.match(sql,/v_target_after := v_target_before \+ v_source_qty/);
  assert.match(sql,/grant execute on function public\.move_inventory_location/);
});
