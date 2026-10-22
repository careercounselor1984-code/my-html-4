(function(root){
'use strict';
const text=v=>String(v??'').replace(/\s+/g,' ').trim();
function date(v){const m=text(v).match(/^((?:19|20)\d{2})[-./]?(\d{2})[-./]?(\d{2})(?:$|[ T])/);if(!m)return '';const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return d.getUTCFullYear()===+m[1]&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[3]?`${m[1]}-${m[2]}-${m[3]}`:'';}
function validate(raw){
 const c={iapNo:text(raw?.iapNo),name:text(raw?.name),progress:text(raw?.progress),iapDate:date(raw?.iapDate),counselingDate:date(raw?.counselingDate)};
 const reasons=[];
 if(!/^A\d{10,}$/i.test(c.iapNo))reasons.push('IAP등록번호 미확인');
 if(!c.name)reasons.push('이름 미확인');
 const phase=c.progress.replace(/\s/g,'');
 if(!/^취업지원서비스(?:기간|단계)?$/.test(phase))reasons.push(/IAP.*수립/i.test(phase)?'IAP 수립단계 제외':'취업지원서비스기간 미확인 또는 종료 상태');
 if(!c.iapDate)reasons.push('확정 IAP 수립일 미확인');
 if(!c.counselingDate)reasons.push('상담일 미확인');
 if(c.iapDate&&c.counselingDate&&c.counselingDate<=c.iapDate)reasons.push('IAP 수립 다음날 이전 상담 제외');
 return {eligible:!reasons.length,context:c,reasons};
}
function resultMessage(value){
 const s=text(value).replace(/[.!。]/g,'');
 if(/(?:저장|등록|수정).*(?:실패|오류|불가|않았|않습)|(?:실패|오류).*(?:저장|등록|수정)/.test(s))return 'error';
 // A generic save/confirmation prompt may belong to another Work24 feature.
 // It is never sufficient evidence of a saved counseling journal.
 if(/^(?:상담일지|상담내역|상담내용)(?:가|이|을|는)?\s*(?:정상적으로\s*)?(?:저장|등록|수정)(?:이|가)?\s*(?:완료되었|완료됐|되었|됐|완료되|되었습|됐습).*$/u.test(s)&&!/[?？]|하시겠|할까요/.test(s))return 'confirmed';
 if(/^(?:정상적으로\s*)?(?:저장|등록|수정)(?:이|가)?\s*(?:완료되었|완료됐|되었|됐|완료되|되었습|됐습)/.test(s))return 'generic';
 return '';
}
function append(state,event,now){
 if(event?.type!=='confirmed'||!/^cs-[a-z0-9-]{8,100}$/i.test(event.attemptId||''))throw Error('잘못된 저장 확인 기록');
 const checked=validate(event.context);if(!checked.eligible)throw Error(checked.reasons.join(' / '));
 if(resultMessage(event.evidence)!=='confirmed')throw Error('상담일지 저장 성공 근거 미확인');
 const records=Array.isArray(state?.records)?state.records:[];
 if(records.some(r=>r.attemptId===event.attemptId))return {version:1,records};
 const savedAt=new Date(now).toISOString();
 return {version:1,records:[...records,{...checked.context,attemptId:event.attemptId,saveConfirmedAt:savedAt,source:'work24-journal-success-message',kind:'save-event',consultationId:null}]};
}
const api={date,validate,resultMessage,append};root.ClgCounselSaveCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
