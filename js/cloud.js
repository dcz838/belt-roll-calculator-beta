const CONFIG_KEY='brc_supabase_config';
const DEVICE_KEY='brc_device_id';
const DIRTY_KEY='brc_cloud_dirty';
const PROFILE_CACHE_KEY='brc_cloud_profile_cache';
let client=null,channel=null,reloadTimer=0,applying=false,authBound=false;
const deviceId=localStorage.getItem(DEVICE_KEY)||crypto.randomUUID();
localStorage.setItem(DEVICE_KEY,deviceId);
const cfg=()=>{try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}')}catch{return {}}};
const state={status:'not-configured',user:null,profile:null,profiles:[],lastSync:'',error:''};
const markDirty=()=>localStorage.setItem(DIRTY_KEY,'1');
const clearDirty=()=>localStorage.removeItem(DIRTY_KEY);
const isDirty=()=>localStorage.getItem(DIRTY_KEY)==='1';
function emit(){window.dispatchEvent(new CustomEvent('brc-cloud-state',{detail:{...state}}))}
function setState(p){Object.assign(state,p);emit()}
function configured(){const c=cfg();return /^https:\/\/.+\.supabase\.co$/.test(c.url||'')&&String(c.key||'').startsWith('sb_publishable_')}
function initClient(){
  if(client)return client;
  if(!configured()||!window.supabase){setState({status:configured()?'library-error':'not-configured'});return null}
  const c=cfg();
  client=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  if(!authBound){
    authBound=true;
    client.auth.onAuthStateChange((_event,session)=>{
      state.user=session?.user||null;
      if(!session){localStorage.removeItem(PROFILE_CACHE_KEY);stopRealtime();setState({status:'signed-out',user:null,profile:null,profiles:[]})}
    });
  }
  return client;
}
function saveConfig(url,key){
  const cleanUrl=String(url||'').trim().replace(/\/$/,'');
  const cleanKey=String(key||'').trim();
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
async function signOut(){if(client)await client.auth.signOut();stopRealtime();setState({status:'signed-out',user:null,profile:null,profiles:[]})}
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
    color:r.belt_catalog?.color||'',application:r.belt_catalog?.supplier||'',coreDiameter:0,stock:Number(r.quantity||0),
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
    client.from('inventory_balances').select('id,belt_id,location_id,quantity,updated_at,belt_catalog(id,belt_code,description,manufacturer,width_mm,thickness_mm,color,supplier,minimum_stock,notes,updated_at,is_active),locations(id,location_code,name)').order('updated_at',{ascending:false}),
    client.from('inventory_transactions').select('id,belt_id,location_id,transaction_type,quantity_change,quantity_before,quantity_after,notes,performed_by,created_at,belt_catalog(belt_code,description)').order('created_at',{ascending:true}).limit(5000),
    client.from('profiles').select('id,display_name,role,is_active,can_add_belt,can_modify_belt,can_delete_belt,can_add_stock,can_use_stock,can_set_balance,can_manage_users,can_restore_backup')
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
  const payload={belt_code:code,description:b.name||code,manufacturer:b.manufacturer||null,width_mm:Number(b.width)||null,thickness_mm:Number(b.thickness)||null,color:b.color||null,supplier:b.application||null,minimum_stock:Number(b.minStock)||0,notes:b.notes||null,is_active:true,updated_by:state.user.id};
  const existing=knownId?{id:knownId}:await findBeltByCode(code);
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
  const r=await client.rpc('adjust_inventory',{p_belt_id:beltId,p_location_id:locationId,p_transaction_type:type,p_amount:Number(amount),p_reference:reference,p_notes:notes||null,p_device_id:deviceId});
  if(r.error)throw r.error;return r.data?.[0]||null;
}
async function saveBelt(rec,original=null){
  if(!client||!state.user)throw new Error('Cloud sign-in required.');
  setState({status:'syncing',error:''});
  try{
    const beltId=await upsertBelt(rec,original?.cloudId||original?.id||null);
    const newLocationId=await ensureLocation(rec.location);
    const bal=await currentBalance(beltId,newLocationId);
    const target=Number(rec.stock)||0;
    if(!bal||Math.abs(Number(bal.quantity||0)-target)>1e-9){await rpcAdjust(beltId,newLocationId,original?'set_balance':'initial_import',target,original?'Belt record updated':'Belt created')}
    if(original?.cloudId&&String(original.location||'DEFAULT').trim().toLowerCase()!==String(rec.location||'DEFAULT').trim().toLowerCase()){
      const oldLocationId=await ensureLocation(original.location);
      const oldBal=await currentBalance(beltId,oldLocationId);
      if(oldBal&&Number(oldBal.quantity)>0)await rpcAdjust(beltId,oldLocationId,'set_balance',0,'Inventory moved to another location');
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
  const id=belt.cloudId||belt.id;
  const r=await client.from('belt_catalog').update({is_active:false,updated_by:state.user.id}).eq('id',id);
  if(r.error)throw r.error;await loadCloud();
}
async function undoTransaction(tx){
  if(!client||!state.user)throw new Error('Cloud sign-in required.');
  const belt=(window.BRCApp?.getData?.().belts||[]).find(b=>b.id===tx.beltId);
  if(!belt)throw new Error('Belt not found.');
  return adjustStock(belt,'set',Number(tx.before),`Undo transaction ${tx.id}`);
}
async function updateProfile(id,patch){
  if(!client||!state.user)throw new Error('Cloud sign-in required.');
  const allowed=['display_name','role','is_active','can_add_belt','can_modify_belt','can_delete_belt','can_add_stock','can_use_stock','can_set_balance','can_manage_users','can_restore_backup'];
  const safe=Object.fromEntries(Object.entries(patch||{}).filter(([k])=>allowed.includes(k)));
  const r=await client.from('profiles').update(safe).eq('id',id).select().single();
  if(r.error)throw r.error;await loadProfile();await loadCloud();return r.data;
}
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
  const p=state.profile;if(!p||!p.is_active)return false;if(p.role==='admin')return true;
  const map={addBelt:'can_add_belt',editBelt:'can_modify_belt',deleteBelt:'can_delete_belt',addStock:'can_add_stock',useStock:'can_use_stock',setBalance:'can_set_balance',manageUsers:'can_manage_users',restoreBackup:'can_restore_backup'};
  return !!p[map[permission]];
}
window.BRCCloud={state,configured,cfg,saveConfig,clearConfig,signIn,signOut,start,loadCloud,syncFromLocal,pushLocalToCloud,saveBelt,adjustStock,archiveBelt,undoTransaction,updateProfile,markDirty,isDirty,isApplying:()=>applying,can,deviceId};
window.addEventListener('offline',()=>{const cp=cachedProfile();if(cp&&!state.profile)state.profile=cp;setState({status:'offline',error:''})});
window.addEventListener('online',()=>start().catch(e=>setState({status:'error',error:e.message||String(e)})));
window.addEventListener('load',()=>{if(navigator.onLine)start().catch(e=>setState({status:'error',error:e.message||String(e)}));else{state.profile=cachedProfile();setState({status:'offline'})}});
