(()=>{
'use strict';if(window.__clgCounselSaveObserverV1)return;window.__clgCounselSaveObserverV1=true;
const core=globalThis.ClgCounselSaveCore;
const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
const visible=el=>{try{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';}catch{return false;}};
const val=el=>norm(el?.value||el?.textContent);
const action=(el,re)=>el?.nodeType===1&&String(el.value||el.textContent||'').length<40&&re.test(val(el));
const send=data=>{try{const p=chrome.runtime.sendMessage({type:'CLG_COUNSEL_SAVE_EVENT',event:data});p?.catch?.(()=>{});}catch{}};
let attempt=null;
function scopeFor(button){
 for(let el=button?.parentElement;el&&el!==document.body;el=el.parentElement){
  const headings=[...el.querySelectorAll('h1,h2,h3,[role="heading"],div,span,strong')].filter(x=>String(x.textContent||'').length<80).filter(visible).filter(x=>/^(?:상담일지|상담내역)\s*(?:등록|작성|수정|상세|관리)(?:\s*\[[^\]]+\])?$/.test(val(x)));
  if(headings.length&&el.querySelector('input,textarea'))return el;
 }
 return null;
}
function counselDate(scope){
 const values=new Set();if(!scope)return '';
 for(const el of scope.querySelectorAll('label,th,td,div,span')){
  if(!visible(el)||!/^상담\s*(?:일자|일시|일)$/.test(val(el).replace(/[：:]$/,'')))continue;
  if(el.children.length&&[...el.children].some(c=>norm(c.textContent)))continue;
  let p=el;for(let i=0;i<3&&p;i++,p=p.parentElement){
   const inputs=[...p.querySelectorAll('input')].filter(visible);if(inputs.length===1){const d=core.date(inputs[0].value);if(d)values.add(d);break;}
   if(inputs.length>1)break;
  }
 }
 return values.size===1?[...values][0]:'';
}
function inspect(button){
 const scope=scopeFor(button);if(!scope)return {eligible:false,context:{},reasons:['상담일지 작성 화면 미확인']};let raw={};try{raw=window.__clgCounselSaveReadBasic?.()||{};}catch{}
 // Do not use a cached participant from an earlier screen. Require this IAP
 // number to be visible in the current document as well as the parsed result.
 const seenIaps=new Set();for(const el of document.querySelectorAll('input,span,td,div')){
  if(!visible(el)||el.children.length)continue;
  for(const m of val(el).matchAll(/\bA\d{10,}\b/ig))seenIaps.add(m[0].toUpperCase());
 }
 if(seenIaps.size!==1||!seenIaps.has(String(raw.iapNo||'').toUpperCase()))raw={...raw,iapNo:''};
 const checked=core.validate({...raw,counselingDate:counselDate(scope)});
 if(!scope){checked.eligible=false;checked.reasons.unshift('상담일지 작성 화면 미확인');}
 return checked;
}
function end(status,reasons=[]){if(!attempt)return;const a=attempt;attempt=null;clearTimeout(a.timer);a.observer?.disconnect();send({type:'detection',attemptId:a.id,status,reasons,context:a.checked.context});}
function observe(button){
 if(attempt)end('replaced',['다른 저장 동작으로 확인 중단']);
 const checked=inspect(button),id='cs-'+crypto.randomUUID();
 if(!checked.eligible){send({type:'detection',attemptId:id,status:'excluded',reasons:checked.reasons,context:checked.context});return;}
 const baseline=new Map();for(const el of document.querySelectorAll('div,span,p,[role="alert"],[role="dialog"]')){const s=val(el);if(visible(el)&&s.length<180&&core.resultMessage(s))baseline.set(el,s);}
 attempt={id,checked,observer:null,timer:null};
 send({type:'detection',attemptId:id,status:'waiting',reasons:['저장 클릭 감지 · 성공 응답 확인 대기'],context:checked.context});
 const observer=new MutationObserver(changes=>{
  if(!attempt||attempt.id!==id)return;
  const candidates=new Set();for(const change of changes){const el=change.target.nodeType===1?change.target:change.target.parentElement;if(el)candidates.add(el);for(const n of change.addedNodes){if(n.nodeType!==1)continue;candidates.add(n);for(const c of n.querySelectorAll('div,span,p,[role="alert"]'))candidates.add(c);}}
  for(const el of candidates){
   if(!visible(el))continue;const message=val(el);if(message.length>180||baseline.get(el)===message)continue;
   const result=core.resultMessage(message);if(!result)continue;
   if(result==='error'){end('unconfirmed',['저장 오류 문구 감지 · 저장 완료로 기록하지 않음']);return;}
   if(result==='generic'){send({type:'detection',attemptId:id,status:'needs-evidence',reasons:['일반 저장 성공 문구 감지 · 상담일지 저장 응답인지 추가 확인 필요'],context:checked.context});continue;}
   // A different participant/date/phase may have been selected while waiting.
   const current=inspect(button);
   if(!current.eligible||JSON.stringify(current.context)!==JSON.stringify(checked.context)){end('unconfirmed',['대상 또는 상담일 변경 · 저장 확인 보류']);return;}
   const a=attempt;attempt=null;clearTimeout(a.timer);observer.disconnect();send({type:'confirmed',attemptId:id,context:checked.context,evidence:message});return;
  }
 });
 attempt.observer=observer;observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','class','hidden']});
 attempt.timer=setTimeout(()=>end('unconfirmed',['20초 내 상담일지 저장 성공을 확인하지 못함 · 저장 실패를 의미하지 않음']),20000);
}
document.addEventListener('click',e=>{
 if(!e.isTrusted)return;
 const path=e.composedPath?.()||[e.target];const button=path.find(el=>action(el,/^(?:저장|등록)(?:\s*\(F\d+\))?$/));
 if(button){if(scopeFor(button))observe(button);else if(attempt)end('unconfirmed',['다른 화면의 저장 동작 · 상담일지 저장 확인 보류']);return;}
 if(attempt&&path.some(el=>action(el,/^(?:닫기|취소|초기화)(?:\s*\(F\d+\))?$/)))end('unconfirmed',['닫기 또는 취소 동작 · 저장 확인 보류']);
},true);
window.addEventListener('pagehide',()=>end('unconfirmed',['화면 이동으로 저장 성공 확인 중단']));
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
 if(msg?.type!=='CLG_COUNSEL_SAVE_INSPECT')return;
 const buttons=[...document.querySelectorAll('button,a,div,span,input[type="button"]')].filter(visible).filter(el=>/^(?:저장|등록)(?:\s*\(F\d+\))?$/.test(val(el)));
 const contexts=buttons.map(inspect).filter(c=>!c.reasons.includes('상담일지 작성 화면 미확인'));
 reply(contexts[0]||{eligible:false,context:{},reasons:['현재 프레임에서 상담일지 작성 화면을 찾지 못함']});
});
})();
