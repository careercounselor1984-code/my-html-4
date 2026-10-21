// v1.4.23: limited local retention, never contact external services.
(function(root){'use strict';
 const PENDING=['clgBasicToCounselPendingV111','clgAllowanceToCounselPendingV112','clgTerminationToCounselPendingV113','clgIapTransferPendingV120','clgReadinessPendingV150'];
 const KNOWN=[...PENDING,'clgTrainingPlanContextV1','clgVerifiedTrainingSchedulesV1','clgCounselSaveEventsV1','clgCounselSaveDetectionV1'];
 const HOUR=3600000,DAY=24*HOUR;
 const TTL={pending:72*HOUR,trainingContext:7*DAY,trainingSchedules:180*DAY,counselEvents:90*DAY,saveStatus:7*DAY};
 function fresh(value,now,ttl){
  const time=typeof value==='number'?value:Date.parse(String(value??''));
  return Number.isFinite(time)&&time>0&&time<=now+5*60*1000&&now-time<=ttl;
 }
 function cleanup(state,now=Date.now()){
  const remove=[],set={};if(!state||typeof state!=='object')return {remove,set};
  for(const key of PENDING)if(Object.prototype.hasOwnProperty.call(state,key)&&!fresh(state[key]?.sentAt,now,TTL.pending))remove.push(key);
  if(Object.prototype.hasOwnProperty.call(state,'clgTrainingPlanContextV1')&&!fresh(state.clgTrainingPlanContextV1?.updatedAt,now,TTL.trainingContext))remove.push('clgTrainingPlanContextV1');
  if(Object.prototype.hasOwnProperty.call(state,'clgCounselSaveDetectionV1')&&!fresh(state.clgCounselSaveDetectionV1?.at,now,TTL.saveStatus))remove.push('clgCounselSaveDetectionV1');
  if(Object.prototype.hasOwnProperty.call(state,'clgCounselSaveEventsV1')){
   const records=state.clgCounselSaveEventsV1?.records;
   if(!Array.isArray(records))remove.push('clgCounselSaveEventsV1');
   else{
    const keep=records.filter(r=>fresh(r?.saveConfirmedAt,now,TTL.counselEvents)).slice(-250);
    if(keep.length!==records.length)set.clgCounselSaveEventsV1={version:1,records:keep};
   }
  }
  if(Object.prototype.hasOwnProperty.call(state,'clgVerifiedTrainingSchedulesV1')){
   const schedules=state.clgVerifiedTrainingSchedulesV1;
   if(!schedules||typeof schedules!=='object'||Array.isArray(schedules))remove.push('clgVerifiedTrainingSchedulesV1');
   else{
    const entries=Object.entries(schedules),keep=entries.filter(([key,v])=>fresh(v?.calculatedAt,now,TTL.trainingSchedules)).slice(-120);
    if(keep.length!==entries.length)set.clgVerifiedTrainingSchedulesV1=Object.fromEntries(keep);
   }
  }
  return {remove,set};
 }
 const api={PENDING,KNOWN,TTL,fresh,cleanup};root.ClgSecurityCore=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
