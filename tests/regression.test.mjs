import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import crypto from "node:crypto";
import {MM_PER_INCH,calculateInventoryBalance,calculateRoll,convertDimension,csvCell,validateBeltRecord,compoundImperialToInches,inchesToCompoundImperial,ENGINEERING_UNITS,convertEngineeringValue} from "../js/core.mjs";
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const app=read("js/app.js"), core=read("js/core.mjs"), cloud=read("js/cloud.js"), css=read("css/app.css"), html=read("index.html"), sw=read("service-worker.js");
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

// Consolidated regression suite (04.08 -> 04.18)
test('04.23 metadata and network-first cache namespace',()=>{assert.equal(version.build,'2026.08.31.04.23');assert.match(sw,/04-23/);assert.match(html,/app\.js\?v=202608310423/);assert.match(html,/app\.css\?v=202608310423/)});
test('app.js parses in ES module mode',()=>{const tmp=path.join(os.tmpdir(),`brc-app-${process.pid}.mjs`);fs.writeFileSync(tmp,app);const r=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});fs.unlinkSync(tmp);assert.equal(r.status,0,r.stderr||r.stdout)});
test('mobile safe areas and iPad offset remain',()=>{assert.match(css,/safe-area-inset-top/);assert.match(css,/min-width:521px/);assert.match(css,/pointer:coarse/)});
test('sticky edit header remains and Enter advances through editor fields',()=>{assert.match(css,/\.dialog\.sticky-editor \.dialog-title\{position:sticky/);assert.match(app,/fields\[i\+1\]\.focus\(\)/)});
test('stock editor is directly editable and has no unlock control',()=>{const section=app.slice(app.indexOf('function beltEditor'),app.indexOf('function stockAction'));assert.doesNotMatch(section,/stockUnlocked|stock-unlock|Unlock|解锁/);assert.match(section,/stockAdjustmentConfirm/);assert.match(section,/Stock is always visible and editable/)});
test('stock direct edit uses password-protected high-risk warning and controlled set_balance RPC',()=>{assert.match(app,/Confirm Stock Change/);assert.match(app,/确认库存修改/);assert.match(app,/verifyInventoryPin/);assert.match(app,/stock-change-hero/);const section=cloud.slice(cloud.indexOf('async function saveBelt'),cloud.indexOf('async function adjustStock'));assert.match(section,/rpcAdjust\(beltId,locationId,'set_balance'/);assert.doesNotMatch(section,/inventory_balances'\)\.update/)});
test('product detail changes still use Inventory Password when protection is enabled',()=>{const section=app.slice(app.indexOf('function beltEditor'),app.indexOf('function stockAction'));assert.match(section,/detailsChanged&&data\.settings\.passwordProtection/);assert.match(section,/await inventoryAuth\(\)/)});
test('delete belt requires high-risk warning and inventory password in cloud mode',()=>{const section=app.slice(app.indexOf('function beltEditor'),app.indexOf('function stockAction'));assert.match(section,/deleteWarning\(existing\)/);assert.match(section,/await inventoryAuth\(true\)/);assert.match(section,/archiveBelt\(existing\)/)});
test('location editor is free-form structured input, not a closed select',()=>{const section=app.slice(app.indexOf('function locationEditorFields'),app.indexOf('function beltEditor'));for(const k of ['site','department','shelfCabinet','layer','bin'])assert.match(section,new RegExp(`createElement\\('input'\\)|${k}`));assert.match(section,/createElement\('textarea'\)/);assert.doesNotMatch(section,/createElement\('select'\)/);assert.match(app,/buildLocationValue/)});
test('location moves remain atomic and quantity-preserving',()=>{assert.match(cloud,/client\.rpc\('move_inventory_location'/);assert.doesNotMatch(cloud,/inventory_balances'\)\.update/);assert.match(sql14,/for update/);assert.match(sql14,/'transfer_out'/);assert.match(sql14,/'transfer_in'/);assert.match(sql14,/v_target_after := v_target_before \+ v_source_qty/)});
test('inventory passwords remain private and separate from cloud auth password',()=>{assert.match(sql12,/private\.inventory_credentials/);assert.match(sql12,/drop column if exists inventory_pin_hash/);assert.match(cloud,/verify_inventory_pin/);assert.match(edge,/set_inventory_password/)});
test('admin-user retains server-side authorization chain',()=>{assert.match(edge,/const userClient = createClient/);assert.match(edge,/const admin = createClient\(url, secretKey/);assert.match(edge,/Administrator permission required/);assert.match(edge,/admin\.auth\.admin\.updateUserById/)});
test('backup UI remains simplified and export formats remain available',()=>{assert.doesNotMatch(html,/id="shareBackup"/);assert.doesNotMatch(html,/id="backupDestination"/);for(const x of ['exportPdf','exportExcel','exportTxt','exportJson'])assert.match(app,new RegExp(x))});
test('unit converter includes mile, US quart, and US pint',()=>{assert.equal(ENGINEERING_UNITS.length.units.mi,1609.344);assert.equal(ENGINEERING_UNITS.volume.units['US qt'],.000946352946);assert.equal(ENGINEERING_UNITS.volume.units['US pt'],.000473176473)});
test('static startup guard and fallback labels remain',()=>{assert.match(html,/window\.BRCBootFail/);assert.match(html,/id="startupError"/);assert.match(html,/>Calculator<\/button>/);assert.match(html,/data-i="input">Input<\/h2>/)});
test('publishable key may be embedded but secret keys are absent from browser code',()=>{assert.match(cloud,/sb_publishable_bBGvL1QwSX27Eu5bfrERRQ_c9qgziE0/);assert.doesNotMatch(cloud,/sb_secret_/);assert.doesNotMatch(cloud,/service_role/)});

test('04.17 stock field intentionally has no one-click clear control',()=>{const section=app.slice(app.indexOf('function beltEditor'),app.indexOf('function stockAction'));assert.match(section,/smartNumberField\(`\$\{tr\('stock'\)\} \(\$\{inventoryUnit\(\)\}\)`,stock,\{allowClear:false\}\)/);assert.match(app,/function smartNumberField\(label,input,\{allowClear=true\}=\{\}\)/)});
test('04.17 structured location labels follow the selected language without bilingual hard-coding',()=>{assert.match(app,/site:'厂区',department:'部门',shelfCabinet:'货架 \/ 柜',layer:'层',bin:'箱位'/);assert.doesNotMatch(app,/site:'Site \/ 厂区'/);assert.doesNotMatch(app,/department:'Department \/ 部门'/);assert.doesNotMatch(app,/shelfCabinet:'Shelf \/ Cabinet \/ 架柜'/);assert.match(app,/site:'Site',department:'Department',shelfCabinet:'Shelf \/ Cabinet',layer:'Layer',bin:'Bin'/)});


test('04.18 structured location serializer reads DOM field values instead of stringifying elements',()=>{assert.match(app,/function locationFieldValue\(v\)\{return String\(v&&typeof v==='object'&&'value' in v\?v\.value/);assert.match(app,/map\(locationFieldValue\)/);assert.match(app,/custom=locationFieldValue\(parts\.custom\)/)})
test('04.18 detects and suppresses legacy corrupted DOM-object location strings',()=>{assert.match(app,/function locationValueIsCorrupt/);assert.match(app,/Location needs correction/);assert.match(app,/位置需要重新填写/);assert.match(app,/if\(!raw\|\|locationValueIsCorrupt\(raw\)\)return out/)})


test('04.19 inventory password errors render inside the active verification dialog',()=>{assert.match(app,/verify-error/);assert.match(app,/库存修改密码错误，请重新输入/);assert.match(app,/Incorrect inventory password\. Please try again/);const auth=app.slice(app.indexOf('async function inventoryAuth'),app.indexOf('function changeInventoryPin'));assert.doesNotMatch(auth,/return toast\(lang==='zh'\?'库存修改密码错误/)});
test('04.19 stock balance changes require inventory-password verification in the same warning dialog',()=>{const section=app.slice(app.indexOf('async function stockAdjustmentConfirm'),app.indexOf('function deleteWarning'));assert.match(section,/verifyInventoryPin\(p\.value\)/);assert.match(section,/当前库存/);assert.match(section,/新库存/);assert.match(section,/变化/);assert.match(section,/Confirm Change/)});
test('04.19 structured locations serialize and display as fixed five-segment hyphen codes',()=>{assert.match(app,/values\.join\('-'\)/);assert.match(app,/displayLocationValue\(x\.location\)/);assert.match(app,/\.includes\('-'\)/);assert.doesNotMatch(app,/filter\(Boolean\)\.join\(' > '\)/)});
test('04.19 inventory search indexes normalized location codes',()=>{assert.match(app,/\[\.\.\.Object\.values\(x\),displayLocationValue\(x\.location\)\]/)});
test('04.19 interactive controls use double-weight borders without thickening inventory status cards globally',()=>{assert.match(css,/button,select,input,textarea\{border-width:2px\}/);assert.match(css,/\.smart-number,.deskdisplay,.conv-output/);assert.doesNotMatch(css,/\.belt-card\{[^}]*border-width:2px/)});


test('04.20 converter event chain is wired and category changes rebuild unit lists',()=>{
  assert.match(app,/function setupConverterEvents\(\)/);
  assert.match(app,/category\.onchange=\(\)=>\{populateConverterUnits\(\{reset:true\}\)/);
  assert.match(app,/input\.oninput=\(\)=>convert\(false\)/);
  assert.match(app,/from\.onchange=\(\)=>\{updateCompoundVisibility\(\);convert\(true\)\}/);
  assert.match(app,/to\.onchange=\(\)=>\{updateCompoundVisibility\(\);convert\(true\)\}/);
  assert.match(app,/swap\.onclick=swapConverterUnits/);
  assert.match(app,/setupConverterEvents\(\);setupCalculatorControls\(\);translate\(\)/);
});

test('04.20 converter formulas cover required reference conversions',()=>{
  assert.match(app,/convertEngineeringValue\(n,cat,a,b\)/);
  assert.equal(convertEngineeringValue(20,'volume','m³','L'),20000);
  assert.equal(convertEngineeringValue(1,'length','mi','ft'),5280);
  assert.ok(Math.abs(convertEngineeringValue(1,'volume','US gal','US qt')-4)<1e-9);
  assert.ok(Math.abs(convertEngineeringValue(1,'volume','US gal','US pt')-8)<1e-9);
  assert.equal(convertEngineeringValue(100,'temperature','°C','°F'),212);
  assert.ok(Math.abs(convertEngineeringValue(1,'weight','kg','lb')-2.2046226218487757)<1e-12);
});

test('04.20 calculator controls are wired and keys have pressed feedback',()=>{
  assert.match(app,/function setupCalculatorControls\(\)/);
  assert.match(app,/standard\.onclick=\(\)=>\{calcMode='standard';setupDeskCalc\(\)\}/);
  assert.match(app,/scientific\.onclick=\(\)=>\{calcMode='scientific';setupDeskCalc\(\)\}/);
  assert.match(css,/\.calc-keys button\{font-weight:800/);
  assert.match(css,/\.calc-keys button:active\{background:#dbeafe/);
  assert.match(css,/\.calc-keys button\.primary:active\{background:#075fd6/);
});


test('04.21 length converter supports compound feet-inches with fraction/decimal mode conversion',()=>{
  assert.equal(ENGINEERING_UNITS.length.units['ft+in'],null);
  assert.match(app,/function compoundTotalInches\(\)/);
  assert.match(app,/compoundImperialToInches/);
  assert.match(app,/inchesToCompoundImperial/);
  assert.match(app,/function setCompoundMode\(mode\)/);
  assert.match(app,/function formatFeetInches\(totalInches/);
  assert.match(app,/setupCompoundLength\(\)/);
  assert.doesNotMatch(css,/Fraction precision/i);
});

test('04.21 compound imperial controls are aligned and have no fraction-precision row',()=>{
  assert.match(html,/id="compoundFeet"/);
  assert.match(html,/id="compoundInches"/);
  assert.match(html,/id="compoundNumerator"/);
  assert.match(html,/id="compoundDenominator"/);
  assert.match(html,/id="compoundFractionMode"/);
  assert.match(html,/id="compoundDecimalMode"/);
  assert.doesNotMatch(html,/Fraction precision|分数精度/i);
  assert.match(css,/\.compound-fields\{display:grid;grid-template-columns:repeat\(3/);
});

test('04.21 compound conversion reference math is exact',()=>{
  const inches=compoundImperialToInches({feet:5,inches:8,fraction:'3/8',mode:'fraction'});
  assert.equal(inches,68.375);
  assert.ok(Math.abs(inches*25.4-1736.725)<1e-9);
  const decimal=inchesToCompoundImperial(inches,'decimal');
  assert.equal(decimal.feet,5); assert.equal(decimal.inches,8.375);
  const fraction=inchesToCompoundImperial(decimal.feet*12+decimal.inches,'fraction');
  assert.deepEqual(fraction,{feet:5,inches:8,fraction:'3/8'});
  assert.equal(compoundImperialToInches({feet:0,inches:11,fraction:'11/16',mode:'fraction'}),11.6875);
});


test('04.21 every engineering converter category has executable reference coverage',()=>{
  const refs=[
    ['length',1,'m','cm',100],['volume',2,'L','mL',2000],['temperature',32,'°F','°C',0],
    ['pressure',1,'bar','kPa',100],['speed',36,'km/h','m/s',10],['weight',1000,'g','kg',1],
    ['area',1,'m²','cm²',10000],['force',1,'kN','N',1000],['torque',1,'N·m','lb-in',8.85074579],
    ['power',1,'kW','W',1000],['flow',60,'L/min','L/s',1]
  ];
  for(const [cat,v,a,b,expected] of refs){const got=convertEngineeringValue(v,cat,a,b);assert.ok(Number.isFinite(got),`${cat} returned non-finite`);assert.ok(Math.abs(got-expected)<Math.max(1e-6,Math.abs(expected)*1e-6),`${cat}: ${got} != ${expected}`)}
});

test('04.22 fraction UI uses separate numerator and denominator selectors',()=>{
  assert.match(html,/id="compoundNumerator"/);
  assert.match(html,/id="compoundDenominator"/);
  assert.doesNotMatch(html,/id="compoundFraction"/);
  assert.match(app,/const compoundDenominators=\[2,4,8,16,32,64\]/);
  assert.match(app,/function populateNumeratorOptions/);
  assert.match(css,/\.fraction-pair\{display:grid/);
});

test('04.22 decimal compound inches accepts decimal point and round-trips to fraction',()=>{
  assert.equal(compoundImperialToInches({feet:10,inches:'9.5',mode:'decimal'}),129.5);
  assert.equal(compoundImperialToInches({feet:10,inches:'9,5',mode:'decimal'}),129.5);
  const f=inchesToCompoundImperial(129.5,'fraction');
  assert.deepEqual(f,{feet:10,inches:9,fraction:'1/2'});
  assert.equal(compoundImperialToInches({feet:10,inches:9,numerator:1,denominator:2,mode:'fraction'}),129.5);
  assert.match(html,/id="compoundInches" type="text" inputmode="decimal"/);
  assert.match(app,/replace\(','\s*,\s*'\.'\)/);
});

test('04.22 decimal mode truly hides fraction pair and preserves value during mode switching',()=>{
  assert.match(app,/compoundFractionField'\)\.hidden=compoundMode==='decimal'/);
  assert.match(css,/\.compound-fields \[hidden\]\{display:none!important\}/);
  assert.match(app,/const total=compoundTotalInches\(\);[\s\S]*setCompoundFromTotalInches\(total,compoundMode\)/);
});

test('04.23 inventory-critical source remains byte-for-byte unchanged from 04.22 baseline',()=>{
  const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
  assert.equal(hash(cloud),'953dd739adf05e96fd6eb9645d0dcff9e05a0666c9e6a3ca62b6c1086f6f1d96');
  const sections=[
    ['function locationEditorFields','function beltEditor','27e170af1bf21c23108faf1d5a8fb4f5dd1c0d620593f535791631ff1d3c0443'],
    ['function beltEditor','function stockAction','d1988565b9afdc740a95fd3802dcbe163bb006834f6ec4fa57dc38522f1844a2'],
    ['async function inventoryAuth','function changeInventoryPin','92efe1dfd16123ffedc1d86dc88839b3eeb65e0c32d1930aa105b48c9b71723a'],
    ['function stockAdjustmentConfirm','function deleteWarning','e50eb6cde59e858125f9f8b1bf6ae0f6a49246dd3175eb5b999abef7722bc732']
  ];
  for(const [start,end,expected] of sections){const part=app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));assert.equal(hash(part),expected,start)}
});


test('04.23 calculator memory has collapsible visible state with zero-memory distinction',()=>{
  assert.match(html,/id="calcMemoryToggle"/);
  assert.match(html,/id="calcMemoryRow"/);
  assert.match(html,/id="calcMemoryValue"/);
  assert.match(app,/memorySet=false,memoryExpanded=false,memoryUserCollapsed=false/);
  assert.match(app,/function renderMemoryDisplay\(\)/);
  assert.match(app,/if\(k==='MC'\)\{memory=0;memorySet=false/);
  assert.match(app,/else if\(k==='M\+'\)\{memory\+=Number\(currentValue\(\)\)\|\|0;memorySet=true/);
  assert.match(app,/else if\(k==='MR'\)\{if\(memorySet\)calcExpr=String\(memory\)\}/);
  assert.match(css,/\.calc-memory-toggle\.has-memory/);
});

test('04.23 compound input allocates more room to fraction pair and keeps controls equal height',()=>{
  assert.match(css,/\.compound-fields\{grid-template-columns:minmax\(82px,\.72fr\) minmax\(82px,\.62fr\) minmax\(220px,1\.66fr\)\}/);
  assert.match(css,/\.compound-fields input,\.compound-fields select,\.fraction-pair\{height:52px;min-height:52px\}/);
});

test('04.23 Feet + Inches output supports Fraction and Decimal display modes after swap',()=>{
  assert.match(html,/id="compoundOutputMode"/);
  assert.match(html,/id="outputFractionMode"/);
  assert.match(html,/id="outputDecimalMode"/);
  assert.match(app,/let compoundMode='fraction',compoundOutputMode='fraction'/);
  assert.match(app,/outputDisplay=formatFeetInches\(out,compoundOutputMode\)/);
  assert.match(app,/function setCompoundOutputMode\(mode\)/);
  assert.match(app,/if\(a==='ft\+in'\)compoundOutputMode=compoundMode/);
});

test('04.23 About includes localized collapsible Help and FAQ',()=>{
  assert.match(html,/id="faqList"/);
  assert.match(app,/const FAQ=/);
  assert.match(app,/如何在 Mac 上安装 BRC/);
  assert.match(app,/How do I install BRC on a Mac/);
  assert.match(app,/¿Cómo instalo BRC en Mac/);
  assert.match(css,/\.faq-list details/);
});
