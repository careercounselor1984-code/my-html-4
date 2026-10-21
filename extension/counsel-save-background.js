(()=>{
'use strict';const core=globalThis.ClgCounselSaveCore;let queue=Promise.resolve();
const KEY='clgCounselSaveEventsV1',STATUS='clgCounselSaveDetectionV1';
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
 if(msg?.type!=='CLG_COUNSEL_SAVE_EVENT')return;
 let url;try{url=new URL(sender.url);}catch{return;}
 if(url.protocol!=='https:'||!(url.hostname==='work24.go.kr'||url.hostname.endsWith('.work24.go.kr')))return;
 const event=msg.event;
 queue=queue.catch(()=>{}).then(async()=>{
  try{
   const now=Date.now();
   if(event?.type==='confirmed'){
    const raw=await chrome.storage.local.get(KEY),state=core.append(raw[KEY],event,now);
    await chrome.storage.local.set({[KEY]:state,[STATUS]:{status:'confirmed',at:new Date(now).toISOString(),context:core.validate(event.context).context,reasons:['상담일지 저장 성공 문구 확인 · 브라우저에 기록 완료']}});
   }else if(event?.type==='detection'){
    const allowed=['excluded','waiting','needs-evidence','unconfirmed','replaced'];if(!allowed.includes(event.status))throw Error('잘못된 감지 상태');
    const clean=core.validate(event.context).context;
    await chrome.storage.local.set({[STATUS]:{status:event.status,at:new Date(now).toISOString(),context:clean,reasons:(Array.isArray(event.reasons)?event.reasons:[]).slice(0,8).map(s=>String(s).slice(0,160))}});
   }else throw Error('지원하지 않는 감지 자료');
   reply({ok:true});
  }catch(e){reply({ok:false,error:String(e?.message||e)});}
 });return true;
});
})();
