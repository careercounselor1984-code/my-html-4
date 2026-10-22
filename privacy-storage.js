/* Temporary working data only. Formal saved records stay in their existing store.
 * Legacy unversioned data is never removed by this module: migrate after a verified backup.
 */
(()=>{'use strict';
const temporary=new Set(['career_consult_log_draft_v7','kakao_memo_inputs_v5','kakao_memo_last_v5','counsel_ai_prompt_builder_v1']);
const prefix='gj_temp_v1:',ttl=24*60*60*1000;
let owner='';
const identityScoped=new Set(['clg_iap_common_profiles_v1','iap_participant_records_v1']);
const identityKey=name=>'gj_identity_v1:'+encodeURIComponent(owner.toLowerCase())+':'+name;
const native=window.localStorage;
function key(name){return prefix+encodeURIComponent(owner)+':'+name}
function purge(allOwners=false){for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i);if(!k?.startsWith(prefix))continue;try{const row=JSON.parse(sessionStorage.getItem(k));if((allOwners&&k.startsWith(prefix+encodeURIComponent(owner)+':'))||!Number.isFinite(row.at)||row.at>Date.now()+60000||Date.now()-row.at>=ttl)sessionStorage.removeItem(k)}catch{sessionStorage.removeItem(k)}}}
const storage={getItem(name){if(identityScoped.has(name))return owner?native.getItem(identityKey(name)):null;if(!temporary.has(name))return native.getItem(name);if(!owner)return null;purge();try{const row=JSON.parse(sessionStorage.getItem(key(name))||'null');return typeof row?.value==='string'?row.value:null}catch{return null}},
setItem(name,value){if(identityScoped.has(name)){if(!owner)throw Error('직원 로그인 후 저장해 주세요.');native.setItem(identityKey(name),value);return}if(!temporary.has(name)){native.setItem(name,value);return}if(!owner)throw Error('직원 로그인 후 임시저장이 가능합니다.');sessionStorage.setItem(key(name),JSON.stringify({at:Date.now(),value:String(value)}))},
removeItem(name){if(identityScoped.has(name)){if(owner)native.removeItem(identityKey(name));return}if(temporary.has(name)){if(owner)sessionStorage.removeItem(key(name));return}native.removeItem(name)},
key(i){return native.key(i)},get length(){return native.length}};
window.GoodJobPrivacy={storage,temporaryKeys:[...temporary],purge};
window.addEventListener('clg-auth-ready',()=>{const next=window.__CLG_JOURNAL_EMPLOYEE?.email||'';if(owner&&owner!==next)purge(true);owner=next;purge()});
window.addEventListener('clg-auth-logout',()=>{if(owner)purge(true);owner=''});
window.addEventListener('pageshow',()=>purge());
})();
