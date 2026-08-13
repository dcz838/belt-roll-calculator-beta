import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const version=JSON.parse(read("VERSION.json"));
const html=read("index.html"), manifest=JSON.parse(read("manifest.webmanifest")), sw=read("service-worker.js"), app=read("js/app.js");
test("build metadata is current and no stale sidebar version remains",()=>{assert.equal(version.build,"2026.08.13.04.04");assert.match(html,/sidebarVersion/);assert.doesNotMatch(html,/2026\.07\.27\.03\.07/);assert.doesNotMatch(html,/Web Edition 2\.2 Beta/)});
test("Beta PWA identity is distinct",()=>{assert.equal(manifest.short_name,"BRC Beta");assert.match(manifest.name,/Beta/);assert.match(html,/BRC Beta · Belt Roll Calculator/)});
test("cloud module is available offline",()=>{assert.match(sw,/js\/cloud\.js/);assert.match(app,/localDataNote:'Inventory data is synchronized securely through the cloud/)});
test("inventory uses summary cards rather than duplicate filter buttons",()=>{assert.doesNotMatch(html,/data-filter=/);assert.match(app,/summary-card/)});
test("result Select All control was removed",()=>{assert.doesNotMatch(html,/selectAllResults/);assert.match(html,/clearResultSelection/)});
test("unit labels are localized",()=>{assert.match(app,/千米 \(km\)/);assert.match(app,/Kilómetros \(km\)/)});

test("cloud build uses Supabase Auth and direct inventory RPC",()=>{const cloud=read("js/cloud.js");assert.match(cloud,/signInWithPassword/);assert.match(cloud,/rpc\('adjust_inventory'/);assert.match(cloud,/from\('inventory_balances'\)/);assert.match(cloud,/postgres_changes/);assert.match(app,/Cloud sign-in required/)});
test("cloud permissions drive inventory controls",()=>{assert.match(app,/window\.BRCCloud\?\.can/);assert.match(app,/can\('addStock'\)/);assert.match(app,/can\('useStock'\)/);assert.match(app,/can\('setBalance'\)/)});

test("cloud credentials are embedded safely and recovery is implemented",()=>{const cloud=read("js/cloud.js");assert.match(cloud,/sb_publishable_bBGvL1QwSX27Eu5bfrERRQ_c9qgziE0/);assert.match(cloud,/PASSWORD_RECOVERY/);assert.match(cloud,/resetPasswordForEmail/);assert.match(cloud,/auth\.updateUser/);assert.doesNotMatch(cloud,/sb_secret_/);assert.doesNotMatch(cloud,/service_role/);});
