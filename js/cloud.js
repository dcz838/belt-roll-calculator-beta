const CONFIG_KEY='brc_supabase_config';
const DEVICE_KEY='brc_device_id';
const DIRTY_KEY='brc_cloud_dirty';
const PROFILE_CACHE_KEY='brc_cloud_profile_cache';
const EMBEDDED_CONFIG=Object.freeze({
  url:'https://wbitcssptqllibnfcxsg.supabase.co',
  key:'sb_publishable_bBGvL1QwSX27Eu5bfrERRQ_c9qgziE0',
  redirectTo:'https://dcz838.github.io/belt-roll-calculator-beta/'
});
let client=null,channel=null,reloadTimer=0,applying=false,authBound=false;
const deviceId=localStorage.getItem(DEVICE_KEY)||crypto.randomUUID();
localStorage.setItem(DEVICE_KEY,deviceId);
const cfg=()=>{try{const saved=JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}');return {url:saved.url||EMBEDDED_CONFIG.url,key:saved.key||EMBEDDED_CONFIG.key,redirectTo:EMBEDDED_CONFIG.redirectTo}}catch{return {...EMBEDDED_CONFIG}}};
const state={status:'signed-out',user:null,profile:null,profiles:[],lastSync:'',error:'',recovery:false};
const markDirty=()=>localStorage.setItem(DIRTY_KEY,'1');
const clearDirty=()=>localStorage.removeItem(DIRTY_KEY);
const isDirty=()=>localStorage.getItem(DIRTY_KEY)==='1';
function emit(){window.dispatchEvent(new CustomEvent('brc-cloud-state',{detail:{...state}}))}
function setState(p){Object.assign(state,p);emit()}
function configured(){const c=cfg();return /^https:\/\/.+\.supabase\.co$/.test(c.url||'')&&String(c.key||'').startsWith('sb_publishable_')}
function isUuid(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''))}
function initClient(){
  if(client)return client;
  if(!configured()||!window.supabase){setState({status:configured()?'library-error':'not-configured'});return null}
  const c=cfg();
  client=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  if(!authBound){
    authBound=true;
    client.auth.onAuthStateChange((event,session)=>{
      state.user=session?.user||null;
      if(event==='PASSWORD_RECOVERY'){setState({status:'recovery',user:session?.user||null,recovery:true,error:''});return}
      if(!session){localStorage.removeItem(PROFILE_CACHE_KEY);stopRealtime();setState({status:'signed-out',user:null,profile:null,profiles:[],recovery:false})}
    });
  }
  return client;
}
function saveConfig(url,key){
  const cleanUrl=String(url||EMBEDDED_CONFIG.url).trim().replace(/\/$/,'');
  const cleanKey=String(key||EMBEDDED_CONFIG.key).trim();
  if(!/^https:\/\/.+\.supabase\.co$/.test(cleanUrl))throw new Error('Invalid Supabase Project URL.');
  if(!cleanKey.startsWith('sb_publishable_'))throw new Error('Use the Supabase Publishable Key (sb_publishable_...).');
  localStorage.setItem(CONFIG_KEY,JSON.stringify({url:cleanUrl,key:cleanKey}));
  location.reload();
}
function clearConfig(){localStorage.removeItem(CONFIG_KEY);localStorage.removeItem(PROFILE_CACHE_KEY);location.reload()}
function cachedProfile(){try{return JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY)||'null')}catch{return null}}
function cacheProfile(p){if(p)localStorage.setItem(PROFILE_CACHE_KEY,JSON.stringify(p))}
async function signIn(email,password){
  if(!initClient())throw new Error('Cloud is not configured.');
  setState({status:'connecting',error:''});
  const {error}=await client.auth.signInWithPassword({email:String(email||'').trim(),password:String(password||'')});
  if(error){setState({status:'error',error:error.message});throw error}
  await start();
}
async function signOut(){if(client)await client.auth.signOut();stopRealtime();setState({status:'signed-out',user:null,profile:null,profiles:[],recovery:false})}
async function requestPasswordReset(email){
  const c=initClient();if(!c)throw new Error('Cloud is unavailable.');
  const target=String(email||'').trim();if(!target)throw new Error('Enter your email address.');
  const {error}=await c.auth.resetPasswordForEmail(target,{redirectTo:EMBEDDED_CONFIG.redirectTo});
  if(error)throw error;return true;
}
async function updatePassword(password){
  const c=initClient();if(!c)throw new Error('Cloud is unavailable.');
  const p=String(password||'');if(p.length<8)throw new Error('Password must be at least 8 characters.');
  const {error}=await c.auth.updateUser({password:p});if(error)throw error;
  setState({status:'connected',recovery:false,error:''});return true;
}
function endRecovery(){state.recovery=false;if(state.user)setState({status:'connecting',recovery:false});else setState({status:'signed-out',recovery:false})}
async function getDefaultLocation(){
  let {data,error}=await client.from('locations').select('id,location_code,name').eq('location_code','DEFAULT').maybeSingle();
  if(error)throw error;
  if(!data){const r=await client.from('locations').insert({location_code:'DEFAULT',name:'Default Location',description:'Initial location'}).select().single();if(r.error)throw r.error;data=r.data}
  return data;
}
async function ensureLocation(code){
  const c=(code||'DEFAULT').trim()||'DEFAULT';
  let r=await client.from('locations').select('id,location_code').ilike('location_code',c).maybeSingle();
  if(r.error)throw r.error;
  if(r.data)return r.data.id;
  r=await client.from('locations').insert({location_code:c,name:c,created_by:state.user.id,updated_by:state.user.id}).select('id').single();
  if(r.error)throw r.error;
  return r.data.id;
}
function mapCloud(rows,txns,profiles){
  const activeRows=(rows||[]).filter(r=>r.belt_catalog&&r.belt_catalog.is_active!==false);
  const belts=activeRows.map(r=>({
    id:r.belt_id,cloudId:r.belt_id,balanceId:r.id,
    name:r.belt_catalog?.description||r.belt_catalog?.belt_code||'Unnamed',part:r.belt_catalog?.belt_code||'',
    manufacturer:r.belt_catalog?.manufacturer||'',width:Number(r.belt_catalog?.width_mm||0),thickness:Number(r.belt_catalog?.thickness_mm||0),
    color:r.belt_catalog?.color||'',application:r.belt_catalog?.application||r.belt_catalog?.supplier||'',coreDiameter:Number(r.belt_catalog?.core_diameter_mm||0),stock:Number(r.quantity||0),
    minStock:Number(r.belt_catalog?.minimum_stock||0),location:r.locations?.location_code||'DEFAULT',notes:r.belt_catalog?.notes||'',
    modified:r.updated_at||r.belt_catalog?.updated_at||new Date().toISOString()
  }));
  const pmap=Object.fromEntries((profiles||[]).map(p=>[p.id,p.display_name]));
  const history=(txns||[]).map(t=>({
    id:t.id,date:t.created_at,beltId:t.belt_id,belt:t.belt_catalog?.description||t.belt_catalog?.belt_code||'',part:t.belt_catalog?.belt_code||'',
    action:t.transaction_type==='set_balance'?'set':t.transaction_type==='initial_import'?'set':t.transaction_type,
    amount:Math.abs(Number(t.quantity_change||0)),before:Number(t.quantity_before||0),after:Number(t.quantity_after||0),
    user:pmap[t.performed_by]||'Cloud User',note:t.notes||'',protected:true,cloud:true
  }));
  return {belts,history,profiles:profiles||[]};
}
async function loadCloud(){
  if(!client||!state.user)return;
  setState({status:'syncing',error:''});
  const local=window.BRCApp?.getData?.()||{belts:[]};
  const [b,t,p]=await Promise.all([
    client.from('inventory_balances').select('id,belt_id,location_id,quantity,updated_at,belt_catalog(id,belt_code,description,manufacturer,width_mm,thickness_mm,color,supplier,core_diameter_mm,application,minimum_stock,notes,updated_at,is_active),locations(id,location_code,name)').order('updated_at',{ascending:false}),
    client.from('inventory_transactions').select('id,belt_id,location_id,transaction_type,quantity_change,quantity_before,quantity_after,notes,performed_by,created_at,belt_catalog(belt_code,description)').order('created_at',{ascending:true}).limit(5000),
    client.from('profiles').select('id,display_name,role,is_active,can_add_belt,can_modify_belt,can_delete_belt,can_add_stock,can_use_stock,can_set_balance,can_manage_users,can_backup,can_restore_backup')
  ]);
  for(const r of [b,t])if(r.error)throw r.error;
  if(p.error)p.data=state.profile?[state.profile]:[];
  state.profiles=p.data||[];
  if(!(b.data||[]).length&&(local.belts||[]).length){setState({status:'migration-needed',lastSync:'',error:'',profiles:state.profiles});return}
  const mapped=mapCloud(b.data,t.data,p.data);
  applying=true;window.BRCApp?.applyCloudData(mapped);applying=false;
  clearDirty();
  setState({status:'connected',lastSync:new Date().toISOString(),error:'',profiles:state.profiles});
}
async function findBeltByCode(code){
  const r=await client.from('belt_catalog').select('id,belt_code,is_active').ilike('belt_code',String(code||'').trim()).maybeSingle();
  if(r.error)throw r.error;return r.data;
}
async function upsertBelt(b,knownId=null){
  const code=String(b.part||b.id||crypto.randomUUID()).trim();
  if(!code)throw new Error('Part number is required for cloud inventory.');
  const payload={belt_code:code,description:b.name||code,manufacturer:b.manufacturer||null,width_mm:Number(b.width)||null,thickness_mm:Number(b.thickness)||null,color:b.color||null,supplier:b.application||null,application:b.application||null,core_diameter_mm:Number(b.coreDiameter)||0,minimum_stock:Number(b.minStock)||0,notes:b.notes||null,is_active:true,updated_by:state.user.id};
  const existing=isUuid(knownId)?{id:knownId}:await findBeltByCode(code);
  let r;
  if(existing){r=await client.from('belt_catalog').update(payload).eq('id',existing.id).select('id').single()}
  else{payload.created_by=state.user.id;r=await client.from('belt_catalog').insert(payload).select('id').single()}
  if(r.error)throw r.error;return r.data.id;
}
async function currentBalance(beltId,locationId){
  const r=await client.from('inventory_balances').select('id,quantity').eq('belt_id',beltId).eq('location_id',locationId).maybeSingle();
  if(r.error)throw r.error;return r.data;
}
async function rpcAdjust(beltId,locationId,type,amount,notes,reference='BRC Cloud Edition'){
  const allowed=new Set(['add','use','set_balance','transfer_in','transfer_out','initial_import','restore']);
  if(type==='edit')type='set_balance';
  if(!allowed.has(type))throw new Error(`Unsupported inventory transaction type: ${type}`);
  const r=await client.rpc('adjust_inventory',{p_belt_id:beltId,p_location_id:locationId,p_transaction_type:type,p_amount:Number(amount),p_reference:reference,p_notes:notes||null,p_device_id:deviceId});
  if(r.error)throw r.error;return r.data?.[0]||null;
}
async function saveBelt(rec,original=null){
  if(!client||!state.user)throw new Error('Cloud sign-in required.');
  setState({status:'syncing',error:''});
  try{
    const knownId=isUuid(original?.cloudId)?original.cloudId:(isUuid(original?.id)?original.id:null);
    const beltId=await upsertBelt(rec,knownId);
    if(original){
      // Product metadata edits never change quantity. Location changes move the existing balance row in-place.
      if(String(original.location||'DEFAULT').trim().toLowerCase()!==String(rec.location||'DEFAULT').trim().toLowerCase()){
        const newLocationId=await ensureLocation(rec.location);
        let balanceId=original.balanceId;
        if(!balanceId){const oldLocationId=await ensureLocation(original.location);const old=await currentBalance(beltId,oldLocationId);balanceId=old?.id}
        if(balanceId){
          const collision=await currentBalance(beltId,newLocationId);
          if(collision&&collision.id!==balanceId)throw new Error('This product already has inventory at the selected location. Choose a different location.');
          const moved=await client.from('inventory_balances').update({location_id:newLocationId,updated_by:state.user.id}).eq('id',balanceId);
          if(moved.error)throw moved.error;
        }
      }
    }else{
      const locationId=await ensureLocation(rec.location);
      const target=Number(rec.stock)||0;
      await rpcAdjust(beltId,locationId,'initial_import',target,'Belt created');
    }
    await loadCloud();return beltId;
  }catch(e){setState({status:'error',error:e.message||String(e)});throw e}
}
async function adjustStock(belt,op,amount,notes=''){
  if(!client||!state.user)throw new Error('Cloud sign-in required.');
  const beltId=belt.cloudId||belt.id,locationId=await ensureLocation(belt.location);
  const n=Number(amount);
  const type=op==='add'?'add':op==='use'?'use':'set_balance';
  const value=op==='use'?-Math.abs(n):op==='add'?Math.abs(n):n;
  setState({status:'syncing',error:''});
  try{const result=await rpcAdjust(beltId,locationId,type,value,notes);await loadCloud();return result}catch(e){setState({status:'error',error:e.message||String(e)});throw e}
}
async function archiveBelt(belt){
  if(!client||!state.user)throw new Error('Cloud sign-in required.');
  let id=isUuid(belt.cloudId)?belt.cloudId:(isUuid(belt.id)?belt.id:null);
  if(!id){const found=await findBeltByCode(belt.part||belt.id);id=found?.id}
  if(!id)throw new Error('Cloud belt record not found.');
  const r=await client.from('belt_catalog').update({is_active:false,updated_by:state.user.id}).eq('id',id);
  if(r.error)throw r.error;await loadCloud();
}
async function undoTransaction(tx){
  if(!client||!state.user)throw new Error('Cloud sign-in required.');
  const belt=(window.BRCApp?.getData?.().belts||[]).find(b=>b.id===tx.beltId);
  if(!belt)throw new Error('Belt not found.');
  return adjustStock(belt,'set',Number(tx.before),`Undo transaction ${tx.id}`);
}
async function edgeErrorMessage(error,fallback){
  let detail='';
  try{const r=error?.context;if(r&&typeof r.clone==='function'){const c=r.clone();const j=await c.json();detail=j?.error||j?.message||''}}catch{}
  return detail||error?.message||fallback;
}
async function invokeAdmin(body,fallback){
  const {data,error}=await client.functions.invoke('admin-user',{body});
  if(error)throw new Error(await edgeErrorMessage(error,fallback));
  if(data?.error)throw new Error(data.error);
  return data;
}
async function adminResetPassword(userId,password){
  if(!client||!state.user)throw new Error('Cloud sign-in required.');
  if(!can('manageUsers'))throw new Error('Administrator permission required.');
  const p=String(password||'');if(p.length<8)throw new Error('Password must be at least 8 characters.');
  await invokeAdmin({action:'reset_password',user_id:userId,password:p},'Password reset failed.');
  return true;
}
async function adminSetInventoryPin(userId,pin){
  if(!client||!state.user)throw new Error('Cloud sign-in required.');
  if(!can('manageUsers'))throw new Error('Administrator permission required.');
  const p=String(pin||'');if(!/^\d{4,}$/.test(p))throw new Error('Inventory password must contain at least 4 digits.');
  await invokeAdmin({action:'set_inventory_password',user_id:userId,pin:p},'Inventory password update failed.');
  return true;
}
async function updateProfile(id,patch){
  if(!client||!state.user)throw new Error('Cloud sign-in required.');
  if(!can('manageUsers'))throw new Error('Administrator permission required.');
  const allowed=['display_name','role','is_active','can_add_belt','can_modify_belt','can_delete_belt','can_add_stock','can_use_stock','can_set_balance','can_manage_users','can_backup','can_restore_backup'];
  const safe=Object.fromEntries(Object.entries(patch||{}).filter(([k])=>allowed.includes(k)));
  const data=await invokeAdmin({action:'update_profile',user_id:id,patch:safe},'Permission update failed.');await loadProfile();await loadCloud();return data?.profile;
}
async function verifyInventoryPin(pin){if(!client||!state.user)throw new Error('Cloud sign-in required.');const r=await client.rpc('verify_inventory_pin',{p_pin:String(pin||'')});if(r.error)throw r.error;return r.data===null?null:!!r.data}
async function setInventoryPin(pin){if(!client||!state.user)throw new Error('Cloud sign-in required.');const p=String(pin||'');if(!/^\d{4,}$/.test(p))throw new Error('Inventory password must contain at least 4 digits.');const r=await client.rpc('set_inventory_pin',{p_pin:p});if(r.error)throw r.error;return true}

async function syncFromLocal(localData,force=false){
  if(applying||!client||!state.user||(!force&&state.status==='syncing'))return;
  setState({status:'syncing',error:''});
  try{
    const rr=await client.from('inventory_balances').select('quantity,belt_catalog(belt_code),locations(location_code)');if(rr.error)throw rr.error;
    const remote=new Map((rr.data||[]).map(r=>[`${String(r.belt_catalog?.belt_code||'').toLowerCase()}|${String(r.locations?.location_code||'DEFAULT').toLowerCase()}`,Number(r.quantity||0)]));
    for(const b of localData.belts||[]){
      const beltId=await upsertBelt(b),locationId=await ensureLocation(b.location),code=String(b.part||b.id||'').trim().toLowerCase(),loc=String(b.location||'DEFAULT').trim().toLowerCase(),target=Number(b.stock)||0,current=remote.get(`${code}|${loc}`);
      if(current===undefined||Math.abs(current-target)>1e-9)await rpcAdjust(beltId,locationId,force?'initial_import':'set_balance',target,force?'Initial local inventory upload':'Offline/local synchronization');
    }
    clearDirty();setState({status:'connected',lastSync:new Date().toISOString(),error:''});await loadCloud();
  }catch(e){setState({status:'error',error:e.message||String(e)});throw e}
}
async function pushLocalToCloud(){const d=window.BRCApp?.getData?.();if(!d)throw new Error('Local inventory is unavailable.');await syncFromLocal(d,true)}
function scheduleReload(){clearTimeout(reloadTimer);reloadTimer=setTimeout(()=>loadCloud().catch(e=>setState({status:'error',error:e.message||String(e)})),350)}
function startRealtime(){
  stopRealtime();
  channel=client.channel('brc-cloud')
   .on('postgres_changes',{event:'*',schema:'public',table:'belt_catalog'},scheduleReload)
   .on('postgres_changes',{event:'*',schema:'public',table:'inventory_balances'},scheduleReload)
   .on('postgres_changes',{event:'*',schema:'public',table:'inventory_transactions'},scheduleReload)
   .on('postgres_changes',{event:'*',schema:'public',table:'locations'},scheduleReload)
   .subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')setState({status:'error',error:`Realtime ${status.toLowerCase()}`})});
}
function stopRealtime(){if(channel&&client)client.removeChannel(channel);channel=null}
async function loadProfile(){
  const r=await client.from('profiles').select('*').eq('id',state.user.id).single();
  if(r.error)throw r.error;
  state.profile=r.data;cacheProfile(r.data);
  if(!r.data.is_active)throw new Error('This account is inactive.');
  return r.data;
}
async function start(){
  if(!initClient())return;
  const {data:{session}}=await client.auth.getSession();
  if(!session){setState({status:'signed-out',user:null,profile:null,profiles:[]});return}
  state.user=session.user;
  try{await loadProfile()}catch(e){setState({status:'error',error:e.message||String(e)});return}
  if(isDirty()){const d=window.BRCApp?.getData?.();if(d)await syncFromLocal(d,false)}
  await loadCloud();startRealtime();
}
function can(permission){
  const p=state.profile;if(!p||!p.is_active)return false;
  const map={addBelt:'can_add_belt',editBelt:'can_modify_belt',deleteBelt:'can_delete_belt',addStock:'can_add_stock',useStock:'can_use_stock',setBalance:'can_set_balance',manageUsers:'can_manage_users',backup:'can_backup',restoreBackup:'can_restore_backup'};
  if(p.role==='admin'&&permission==='manageUsers')return true;
  const field=map[permission];return field?!!p[field]:false;
}
window.BRCCloud={state,configured,cfg,saveConfig,clearConfig,signIn,signOut,requestPasswordReset,updatePassword,endRecovery,start,loadCloud,syncFromLocal,pushLocalToCloud,saveBelt,adjustStock,archiveBelt,undoTransaction,adminResetPassword,adminSetInventoryPin,updateProfile,verifyInventoryPin,setInventoryPin,markDirty,isDirty,isApplying:()=>applying,can,deviceId,embeddedConfig:EMBEDDED_CONFIG};
window.addEventListener('offline',()=>{const cp=cachedProfile();if(cp&&!state.profile)state.profile=cp;setState({status:'offline',error:''})});
window.addEventListener('online',()=>start().catch(e=>setState({status:'error',error:e.message||String(e)})));
window.addEventListener('load',()=>{if(navigator.onLine)start().catch(e=>setState({status:'error',error:e.message||String(e)}));else{state.profile=cachedProfile();setState({status:'offline'})}});
