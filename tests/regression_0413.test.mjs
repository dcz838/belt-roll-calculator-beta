import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const cloud=read('js/cloud.js'), edge=read('supabase/functions/admin-user/index.ts'), version=JSON.parse(read('VERSION.json'));

test('build retains 04.13-or-newer authorization chain',()=>{assert.ok(Number(version.build.split('.').at(-1))>=13)});
test('admin operations do not trust cached front-end manageUsers state',()=>{
  const adminSection=cloud.slice(cloud.indexOf('async function adminResetPassword'),cloud.indexOf('async function verifyInventoryPin'));
  assert.doesNotMatch(adminSection,/can\('manageUsers'\)/);
  assert.match(adminSection,/invokeAdmin/);
});
test('edge function separates caller identity client from privileged admin client',()=>{
  assert.match(edge,/SUPABASE_PUBLISHABLE_KEYS/);
  assert.match(edge,/const userClient = createClient/);
  assert.match(edge,/global: \{ headers: \{ Authorization: `Bearer \$\{token\}` \} \}/);
  assert.match(edge,/const admin = createClient\(url, secretKey/);
  assert.match(edge,/userClient\.auth\.getUser\(token\)/);
  assert.match(edge,/userClient\s*\.from\('profiles'\)/);
});
test('caller lookup errors are distinguished from permission denial',()=>{
  assert.match(edge,/Unable to verify administrator profile/);
  assert.match(edge,/Administrator profile not found/);
  assert.match(edge,/Administrator permission required/);
  assert.match(edge,/callerError\.message/);
});
test('authorized admin actions still use secret client',()=>{
  assert.match(edge,/admin\.auth\.admin\.updateUserById/);
  assert.match(edge,/admin\.rpc\('admin_set_inventory_pin'/);
  assert.match(edge,/admin\.from\('profiles'\)\.update/);
});
