import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {MM_PER_INCH,calculateInventoryBalance,calculateRoll,convertDimension,csvCell,validateBeltRecord} from "../js/core.mjs";
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const app=read("js/app.js"), cloud=read("js/cloud.js"), css=read("css/app.css"), html=read("index.html"), sw=read("service-worker.js");
const edge=read("supabase/functions/admin-user/index.ts"), sql09=read("supabase/migrations/20260814_0409_inventory_security.sql"), sql12=read("supabase/migrations/20260814_0412_inventory_credentials.sql"), sql14=read("supabase/migrations/20260814_0414_inventory_location_move.sql");
const version=JSON.parse(read("VERSION.json"));

test("OD calculation matches the reference workbook", () => {
  const result = calculateRoll({
    unit: "MM",
    mode: "od",
    thickness: 1,
    coreDiameter: 10,
    remaining: 10.1,
  });
  assert.equal(result.ok, true);
  assert.ok(Math.abs(result.lengthNative - 1.578650308428864) < 1e-12);
  assert.ok(Math.abs(result.turns - 0.05) < 1e-12);
  assert.equal(result.outsideDiameter, 10.1);
});

test("turn calculation matches the documented formula", () => {
  const result = calculateRoll({
    unit: "MM",
    mode: "turns",
    thickness: 1,
    coreDiameter: 10,
    remaining: 3,
  });
  assert.equal(result.ok, true);
  assert.ok(Math.abs(result.lengthNative - Math.PI * 3 * 12) < 1e-12);
  assert.equal(result.turns, 3);
  assert.equal(result.outsideDiameter, 16);
});

test("inch inputs produce the same physical result as converted millimeters", () => {
  const metric = calculateRoll({ unit: "MM", mode: "od", thickness: 2, coreDiameter: 100, remaining: 300 });
  const imperial = calculateRoll({
    unit: "IN",
    mode: "od",
    thickness: 2 / MM_PER_INCH,
    coreDiameter: 100 / MM_PER_INCH,
    remaining: 300 / MM_PER_INCH,
  });
  assert.ok(Math.abs(metric.lengthM - imperial.lengthM) < 1e-10);
});

test("invalid calculator inputs return stable error codes", () => {
  assert.equal(calculateRoll({ unit: "MM", mode: "od", thickness: "", coreDiameter: 10, remaining: 20 }).error, "required");
  assert.equal(calculateRoll({ unit: "MM", mode: "od", thickness: 1, coreDiameter: 10, remaining: 10 }).error, "odGreaterThanCore");
  assert.equal(calculateRoll({ unit: "MM", mode: "turns", thickness: -1, coreDiameter: 10, remaining: 2 }).error, "positive");
});

test("unit conversion is reversible", () => {
  const inches = convertDimension(254, "MM", "IN");
  assert.equal(inches, 10);
  assert.equal(convertDimension(inches, "IN", "MM"), 254);
});

test("inventory never permits negative balance", () => {
  assert.deepEqual(calculateInventoryBalance({ operation: "use", before: 10, amount: 4 }), { ok: true, after: 6 });
  assert.equal(calculateInventoryBalance({ operation: "use", before: 10, amount: 11 }).error, "insufficientStock");
  assert.equal(calculateInventoryBalance({ operation: "add", before: 10, amount: -1 }).error, "positiveAmount");
  assert.equal(calculateInventoryBalance({ operation: "set", before: 10, amount: -1 }).error, "nonNegativeAmount");
});

test("belt records require safe numeric values", () => {
  const valid = { name: "Blue", width: 25, thickness: 4, stock: 10, minStock: 2 };
  assert.equal(validateBeltRecord(valid).ok, true);
  assert.equal(validateBeltRecord({ ...valid, name: "" }).error, "beltNameRequired");
  assert.equal(validateBeltRecord({ ...valid, thickness: 0 }).error, "thicknessPositive");
});

test("CSV cells quote commas, quotes, and newlines", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
});

// Consolidated regression suite (04.08 -> 04.17)
test('04.17 metadata and network-first cache namespace',()=>{assert.equal(version.build,'2026.08.17.04.17');assert.match(sw,/04-17/);assert.match(html,/app\.js\?v=202608170417/);assert.match(html,/app\.css\?v=202608170417/)});
test('app.js parses in ES module mode',()=>{const tmp=path.join(os.tmpdir(),`brc-app-${process.pid}.mjs`);fs.writeFileSync(tmp,app);const r=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});fs.unlinkSync(tmp);assert.equal(r.status,0,r.stderr||r.stdout)});
test('mobile safe areas and iPad offset remain',()=>{assert.match(css,/safe-area-inset-top/);assert.match(css,/min-width:521px/);assert.match(css,/pointer:coarse/)});
test('sticky edit header remains and Enter advances through editor fields',()=>{assert.match(css,/\.dialog\.sticky-editor \.dialog-title\{position:sticky/);assert.match(app,/fields\[i\+1\]\.focus\(\)/)});
test('stock editor is directly editable and has no unlock control',()=>{const section=app.slice(app.indexOf('function beltEditor'),app.indexOf('function stockAction'));assert.doesNotMatch(section,/stockUnlocked|stock-unlock|Unlock|解锁/);assert.match(section,/stockAdjustmentWarning/);assert.match(section,/Stock is always visible and editable/)});
test('stock direct edit uses explicit warning and controlled set_balance RPC',()=>{assert.match(app,/Confirm Stock Adjustment/);assert.match(app,/确认库存调整/);const section=cloud.slice(cloud.indexOf('async function saveBelt'),cloud.indexOf('async function adjustStock'));assert.match(section,/rpcAdjust\(beltId,locationId,'set_balance'/);assert.doesNotMatch(section,/inventory_balances'\)\.update/)});
test('product detail changes still use Inventory Password when protection is enabled',()=>{const section=app.slice(app.indexOf('function beltEditor'),app.indexOf('function stockAction'));assert.match(section,/detailsChanged&&data\.settings\.passwordProtection/);assert.match(section,/await inventoryAuth\(\)/)});
test('delete belt requires high-risk warning and inventory password in cloud mode',()=>{const section=app.slice(app.indexOf('function beltEditor'),app.indexOf('function stockAction'));assert.match(section,/deleteWarning\(existing\)/);assert.match(section,/await inventoryAuth\(true\)/);assert.match(section,/archiveBelt\(existing\)/)});
test('location editor is free-form structured input, not a closed select',()=>{const section=app.slice(app.indexOf('function locationEditorFields'),app.indexOf('function beltEditor'));for(const k of ['site','department','shelfCabinet','layer','bin'])assert.match(section,new RegExp(`createElement\\('input'\\)|${k}`));assert.match(section,/createElement\('textarea'\)/);assert.doesNotMatch(section,/createElement\('select'\)/);assert.match(app,/buildLocationValue/)});
test('location moves remain atomic and quantity-preserving',()=>{assert.match(cloud,/client\.rpc\('move_inventory_location'/);assert.doesNotMatch(cloud,/inventory_balances'\)\.update/);assert.match(sql14,/for update/);assert.match(sql14,/'transfer_out'/);assert.match(sql14,/'transfer_in'/);assert.match(sql14,/v_target_after := v_target_before \+ v_source_qty/)});
test('inventory passwords remain private and separate from cloud auth password',()=>{assert.match(sql12,/private\.inventory_credentials/);assert.match(sql12,/drop column if exists inventory_pin_hash/);assert.match(cloud,/verify_inventory_pin/);assert.match(edge,/set_inventory_password/)});
test('admin-user retains server-side authorization chain',()=>{assert.match(edge,/const userClient = createClient/);assert.match(edge,/const admin = createClient\(url, secretKey/);assert.match(edge,/Administrator permission required/);assert.match(edge,/admin\.auth\.admin\.updateUserById/)});
test('backup UI remains simplified and export formats remain available',()=>{assert.doesNotMatch(html,/id="shareBackup"/);assert.doesNotMatch(html,/id="backupDestination"/);for(const x of ['exportPdf','exportExcel','exportTxt','exportJson'])assert.match(app,new RegExp(x))});
test('unit converter includes mile, US quart, and US pint',()=>{assert.match(app,/mi:1609\.344/);assert.match(app,/'US qt':\.000946352946/);assert.match(app,/'US pt':\.000473176473/)});
test('static startup guard and fallback labels remain',()=>{assert.match(html,/window\.BRCBootFail/);assert.match(html,/id="startupError"/);assert.match(html,/>Calculator<\/button>/);assert.match(html,/data-i="input">Input<\/h2>/)});
test('publishable key may be embedded but secret keys are absent from browser code',()=>{assert.match(cloud,/sb_publishable_bBGvL1QwSX27Eu5bfrERRQ_c9qgziE0/);assert.doesNotMatch(cloud,/sb_secret_/);assert.doesNotMatch(cloud,/service_role/)});

test('04.17 stock field intentionally has no one-click clear control',()=>{const section=app.slice(app.indexOf('function beltEditor'),app.indexOf('function stockAction'));assert.match(section,/smartNumberField\(`\$\{tr\('stock'\)\} \(\$\{inventoryUnit\(\)\}\)`,stock,\{allowClear:false\}\)/);assert.match(app,/function smartNumberField\(label,input,\{allowClear=true\}=\{\}\)/)});
test('04.17 structured location labels follow the selected language without bilingual hard-coding',()=>{assert.match(app,/site:'厂区',department:'部门',shelfCabinet:'货架 \/ 柜',layer:'层',bin:'箱位'/);assert.doesNotMatch(app,/site:'Site \/ 厂区'/);assert.doesNotMatch(app,/department:'Department \/ 部门'/);assert.doesNotMatch(app,/shelfCabinet:'Shelf \/ Cabinet \/ 架柜'/);assert.match(app,/site:'Site',department:'Department',shelfCabinet:'Shelf \/ Cabinet',layer:'Layer',bin:'Bin'/)});
