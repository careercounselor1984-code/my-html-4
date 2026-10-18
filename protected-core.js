(function(){
 'use strict';
 if(window.ClgProtectedCore)return;
 let revision=0;
 const outputs=new WeakMap(),flights=new Map();
 const stamp=(exclude=[])=>JSON.stringify(Array.from(document.querySelectorAll('input,select,textarea')).filter(el=>!exclude.includes(el.id)&&el.id!=='integratedOutput'&&!el.id.endsWith('Result')).map(el=>[el.id,el.name,el.value,el.checked]));
 document.addEventListener('input',()=>{revision++;},true);
 document.addEventListener('change',()=>{revision++;},true);
 document.addEventListener('reset',()=>{revision++;},true);
 function guard(exclude=[]){const before=stamp(exclude),rev=revision;return()=>before===stamp(exclude)&&rev===revision;}
 function stale(){const e=new Error('입력 내용이 변경되었습니다. 생성 버튼을 다시 눌러 주세요.');e.stale=true;return e;}
 function report(error,quiet=false){if(error?.stale||quiet)return;const message=error?.message||'서버 처리에 실패했습니다. 기존 작성 내용은 유지됩니다.';if(typeof window.showCustomMessage==='function')window.showCustomMessage(message,'#dc2626');else if(typeof window.showToast==='function')window.showToast(message);else window.alert(message);}
 function bridge(name,...args){let target=window;for(let i=0;i<8;i++){if(typeof target[name]==='function')return target[name](...args);if(target===target.parent)break;target=target.parent;}throw new Error('로그인한 통합본에서 이용해 주세요.');}
 function call(operation,values){const key=JSON.stringify([operation,values]);if(flights.has(key))return flights.get(key);const promise=Promise.resolve().then(()=>bridge('clgRunProtectedCore',operation,values)).finally(()=>flights.delete(key));flights.set(key,promise);return promise;}
 window.ClgProtectedCore={call,bridge,guard,stale,report,stamp,mark:el=>outputs.set(el,stamp()),isCurrent:el=>outputs.get(el)===stamp()};
})();
