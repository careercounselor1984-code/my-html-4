 'use strict';
const PENDING=['clgBasicToCounselPendingV111','clgAllowanceToCounselPendingV112','clgTerminationToCounselPendingV113','clgIapTransferPendingV120','clgReadinessPendingV150'];
const KEYS=[...PENDING,'clgTrainingPlanContextV1','clgVerifiedTrainingSchedulesV1','clgCounselSaveEventsV1','clgCounselSaveDetectionV1'];
const el=id=>document.getElementById(id);
async function refresh(){
 const r=await chrome.storage.local.get(KEYS);
 const present=PENDING.filter(k=>r[k]!=null).length;
 const ev=Array.isArray(r.clgCounselSaveEventsV1?.records)?r.clgCounselSaveEventsV1.records.length:0;
 const plans=r.clgVerifiedTrainingSchedulesV1&&typeof r.clgVerifiedTrainingSchedulesV1==='object'?Object.keys(r.clgVerifiedTrainingSchedulesV1).length:0;
 el('counts').textContent=`전송 대기 ${present}종 · 상담 저장 이력 ${ev}건 · 훈련 시간표 ${plans}건 · 기타 자료 ${['clgTrainingPlanContextV1','clgCounselSaveDetectionV1'].filter(k=>r[k]!=null).length}종`;
}
el('clean').addEventListener('click',async()=>{
 try{const r=await chrome.runtime.sendMessage({type:'CLG_SECURITY_CLEANUP'});if(!r?.ok)throw Error(r?.error||'실패');el('status').textContent='보관기간이 지난 자료를 정리했습니다.';await refresh();}
 catch(e){el('status').textContent='정리 오류: '+e.message;}
});
el('clearTemp').addEventListener('click',async()=>{
 if(!confirm('기본정보·수당·종료·IAP·구직준비도의 전송 대기자료를 모두 삭제합니다. 통합본에서 다시 전송해야 할 수 있습니다. 진행할까요?'))return;
 await chrome.storage.local.remove(PENDING);el('status').textContent='전송 대기자료를 삭제했습니다.';await refresh();
});
el('clearAll').addEventListener('click',async()=>{
 if(!confirm('도우미 내담자·훈련·상담 저장 이력을 모두 삭제합니다. 복원할 수 없습니다. 정말 삭제할까요?'))return;
 await chrome.storage.local.remove(KEYS);el('status').textContent='도우미 보관자료를 모두 삭제했습니다.';await refresh();
});
refresh().catch(e=>el('counts').textContent='조회 실패: '+e.message);
