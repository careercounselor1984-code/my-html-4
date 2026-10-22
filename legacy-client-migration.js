/* Explicit, per-number adoption of unowned legacy browser records. Never enumerates them. */
(function(root){'use strict';
function create({storage,identity,locks,confirmOwner,validReg}){
 const C='clg_iap_common_profiles_v1',I='iap_participant_records_v1';
 const scoped=(owner,key)=>'gj_identity_v1:'+encodeURIComponent(owner)+':'+key;
 const parse=(key,fallback)=>{const raw=storage.getItem(key);if(raw===null)return fallback;const x=JSON.parse(raw);if(!x||typeof x!=='object'||Array.isArray(x))throw Error('저장자료 형식을 확인해 주세요.');return x;};
 const own=()=>String(identity()||'').trim().toLowerCase();
 function source(no){const c=parse(C,{}),i=parse(I,{records:{}});return {common:c[no]||null,iap:i.records?.[no]||null};}
 function available(no){if(!own()||!validReg(no))return false;try{const claim=parse('gj_legacy_claim_v1:'+no,{});if(claim.complete||claim.owner&&claim.owner!==own())return false;const s=source(no);return !!(s.common||s.iap)}catch{return false}}
 async function migrate(no){
  if(!validReg(no))throw Error('전체 IAP 등록번호를 입력해 주세요.');const owner=own();if(!owner)throw Error('직원 로그인 후 연결해 주세요.');
  if(!locks?.request)throw Error('이 브라우저에서는 기존자료를 안전하게 연결할 수 없습니다. Chrome에서 이용해 주세요.');
  if(!await confirmOwner(no))return {cancelled:true};
  return locks.request('gj-legacy-identity:'+no,async()=>{
   if(own()!==owner)throw Error('로그인 직원이 변경되었습니다.');const stamp='gj_legacy_claim_v1:'+no,claim=parse(stamp,{});
   if(claim.owner&&claim.owner!==owner)throw Error('다른 직원에게 연결된 기존자료입니다. 관리자에게 확인해 주세요.');
   if(claim.complete)return {already:true};const src=source(no);if(!src.common&&!src.iap)throw Error('이 번호로 보관된 기존자료가 없습니다.');
   for(const r of [src.common,src.iap].filter(Boolean)){const email=String(r.ownerEmail||r.employeeEmail||'').toLowerCase();if(email&&email!==owner)throw Error('다른 직원의 자료는 연결할 수 없습니다.');if(r.regNo&&r.regNo!==no)throw Error('기존자료의 등록번호가 일치하지 않습니다.');}
   const ck=scoped(owner,C),ik=scoped(owner,I),beforeC=storage.getItem(ck),beforeI=storage.getItem(ik),targetC=parse(ck,{}),targetI=parse(ik,{version:1,records:{}});
   if(!targetI.records||typeof targetI.records!=='object'||Array.isArray(targetI.records))throw Error('IAP 저장자료 형식을 확인해 주세요.');
   const mergedCommon={...(src.common||{}),...(targetC[no]||{})};
   for(const [key,value]of Object.entries(src.common||{})){const old=targetC[no]?.[key];if(old!==undefined&&old!==null&&old!==''&&JSON.stringify(old)!==JSON.stringify(value)&&!['createdAt','updatedAt','lastPage'].includes(key))throw Error('이미 저장된 자료와 다릅니다. 기존값은 유지했습니다.');if(old===undefined||old===null||old==='')mergedCommon[key]=value;}
   if(targetI.records[no]&&JSON.stringify(targetI.records[no])!==JSON.stringify(src.iap))throw Error('이미 저장된 IAP 자료와 다릅니다. 기존값은 유지했습니다.');
   const at=new Date().toISOString(),backup='gj_legacy_backup_v1:'+encodeURIComponent(owner)+':'+no;
   if(storage.getItem(backup)===null)storage.setItem(backup,JSON.stringify({owner,regNo:no,at,source:src,beforeC,beforeI}));
   const priorClaim=storage.getItem(stamp);storage.setItem(stamp,JSON.stringify({owner,at,complete:false}));
   try{if(src.common){targetC[no]=mergedCommon;storage.setItem(ck,JSON.stringify(targetC));}if(src.iap){targetI.records[no]=src.iap;storage.setItem(ik,JSON.stringify(targetI));}storage.setItem(stamp,JSON.stringify({owner,at,complete:true}));}
   catch(error){try{if(beforeC===null)storage.removeItem(ck);else storage.setItem(ck,beforeC);if(beforeI===null)storage.removeItem(ik);else storage.setItem(ik,beforeI);if(priorClaim===null)storage.removeItem(stamp);else storage.setItem(stamp,priorClaim);}catch{throw Error('연결을 완료하지 못했습니다. 원본과 복구 사본은 보존되어 있습니다. 관리자에게 확인해 주세요.');}throw error;}
   return {migrated:true};
  });
 }
 return {available,migrate};
}
if(typeof module!=='undefined'){module.exports={create};return;}
root.GoodJobLegacyIdentity=create({storage:root.localStorage,identity:()=>root.clgJobArchiveClient?.()?root.__CLG_JOURNAL_EMPLOYEE?.email:'',locks:root.navigator.locks,confirmOwner:no=>root.confirm('등록번호 '+no+'의 이전 저장자료가 본인 담당 자료임을 확인하고 연결할까요?\n원본은 보존되며, 기존에 저장된 다른 값은 덮어쓰지 않습니다.'),validReg:root.ClientLinkModel.validReg});
})(typeof window==='undefined'?globalThis:window);
