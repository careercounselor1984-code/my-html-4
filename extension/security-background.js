// Security housekeeping is event-driven. No polling and no external telemetry.
(()=>{'use strict';
 const policy=globalThis.ClgSecurityCore;let active=null;
 async function cleanup(){
  if(active)return active;
  active=(async()=>{
   const state=await chrome.storage.local.get(policy.KNOWN);
   const result=policy.cleanup(state);
   if(result.remove.length)await chrome.storage.local.remove(result.remove);
   if(Object.keys(result.set).length)await chrome.storage.local.set(result.set);
   return result;
  })();
  try{return await active;}finally{active=null;}
 }
 chrome.runtime.onStartup.addListener(()=>{void cleanup().catch(()=>{});});
 chrome.runtime.onInstalled.addListener(()=>{void cleanup().catch(()=>{});});
 chrome.runtime.onMessage.addListener((msg,_sender,reply)=>{
  if(msg?.type!=='CLG_SECURITY_CLEANUP')return;
  cleanup().then(r=>reply({ok:true,removed:r.remove.length,pruned:Object.keys(r.set).length})).catch(e=>reply({ok:false,error:String(e?.message||e)}));
  return true;
 });
 let queued=false;
 chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local'||!Object.keys(changes).some(k=>policy.KNOWN.includes(k))||queued)return;
  queued=true;queueMicrotask(()=>{queued=false;void cleanup().catch(()=>{});});
 });
 void cleanup().catch(()=>{});
})();
