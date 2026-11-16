'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('journal-workspace.js','utf8');
new (require('node:vm').Script)(source);
const A='A12345678901',B='A98765432109';
const dom=new JSDOM('<body><div class="clgWorkTab" data-tab-id="t1"><button id="close1" class="clgWorkTabClose">닫기</button></div></body>',{
 url:'https://journal.test/',runScripts:'outside-only',pretendToBeVisual:true
});
const w=dom.window,d=w.document;
w.__CLG_JOURNAL_EMPLOYEE={email:'staff@example.test'};
w.confirm=()=>false;
const tabs=[];
w.clgGetWorkTabs=()=>tabs;
w.clgSetWorkTabClient=()=>{};
function tab(id,pageId){
 const frame=d.createElement('iframe');
 frame.className='clgWorkFrame is-active';
 frame.dataset.pageId=pageId;
 d.body.appendChild(frame);
 const doc=frame.contentDocument;
 const base='<input id="clgIapRegNo"><button id="clgIapCommonLoadBtn">검색</button><button id="clgIapCommonSaveBtn">저장</button>';
 doc.body.innerHTML=pageId==='p05'?
  '<section id="iapParticipantCard"><input id="iapRegNo"><button id="iapParticipantLoadBtn">검색</button><button id="iapParticipantSaveBtn">저장</button><p id="iapParticipantStatus"></p></section><textarea id="memo"></textarea>':
  '<div id="clgIapLinkCard">'+base+'</div><textarea id="memo"></textarea>';
 const t={id,pageId,draftId:id+'-draft',dirty:false,frame,client:null};tabs.push(t);
 return {t,doc,win:frame.contentWindow};
}
const x=tab('t1','p01');
let nativeLoads=0,nativeSaves=0;
x.doc.getElementById('clgIapCommonLoadBtn').addEventListener('click',()=>nativeLoads++);
x.doc.getElementById('clgIapCommonSaveBtn').addEventListener('click',()=>nativeSaves++);
w.eval(source);
function search(y,number=A){
 const gate=y.doc.getElementById('clgRequiredFlowGate');
 assert(gate,'search gate exists');
 const input=y.doc.getElementById('clgFlowRegister');
 input.value=number;
 y.doc.getElementById('clgFlowLookup').click();
 return gate;
}
assert.equal(x.doc.getElementById('memo').inert,true,'editing blocked before search');
search(x,'WRONG');
assert.match(x.doc.getElementById('clgFlowError').textContent,/등록번호/,'invalid IAP rejected');
assert(x.doc.getElementById('clgRequiredFlowGate'),'invalid search stays locked');
search(x);
assert.equal(nativeLoads,1,'native shared-profile search invoked');
assert.equal(x.doc.getElementById('clgRequiredFlowGate'),null,'editor unlocked by explicit lookup');
assert.notEqual(x.doc.getElementById('memo').inert,true);
assert.equal(x.doc.getElementById('memo').value,'','no stale state');
x.doc.getElementById('clgFlowSave').click();
assert.match(x.doc.getElementById('clgFlowStatus').textContent,/먼저 작성/,'empty new form cannot be marked complete');
const memo=x.doc.getElementById('memo');
memo.value='상담 지원 방향과 다음 일정 기록';
memo.dispatchEvent(new x.win.Event('input',{bubbles:true}));
assert.match(x.doc.getElementById('clgFlowStatus').textContent,/저장되지/,'editing flags unsaved');
x.doc.getElementById('clgFlowSave').click();
assert.equal(nativeSaves,1,'native shared profile still saved');
const key='clg_required_consult_records_v1:'+encodeURIComponent('staff@example.test');
const saved=JSON.parse(w.localStorage.getItem(key));
assert(saved['p01|'+A],'complete form stored under page and IAP number');
assert(saved['p01|'+A].fields.some(f=>f.key==='id:memo'&&f.value==='상담 지원 방향과 다음 일정 기록'));
assert.match(x.doc.getElementById('clgFlowStatus').textContent,/전체 저장 완료/);
let closed=0;d.getElementById('close1').addEventListener('click',()=>closed++);
memo.value='추가 변경';
memo.dispatchEvent(new x.win.Event('input',{bubbles:true}));
d.getElementById('close1').click();
assert.equal(closed,0,'tab cannot close on cancelled discard of unsaved edits');
w.confirm=()=>true;d.getElementById('close1').click();assert.equal(closed,1,'explicit discard allows close');
const y=tab('t2','p01');w.dispatchEvent(new w.CustomEvent('clg-tab-frame-load',{detail:{tabId:'t2',pageId:'p01',frame:y.t.frame}}));
search(y);
assert.equal(y.doc.getElementById('memo').value,'상담 지원 방향과 다음 일정 기록','saved full record restored on next search');
const z=tab('t3','p01');w.dispatchEvent(new w.CustomEvent('clg-tab-frame-load',{detail:{tabId:'t3',pageId:'p01',frame:z.t.frame}}));
search(z,B);
assert.equal(z.doc.getElementById('memo').value,'','other participant remains isolated');
// The IAP screen must preserve its existing full-save authority, not create a second competing copy.
const i=tab('t4','p05');
i.doc.getElementById('iapParticipantLoadBtn').addEventListener('click',()=>i.doc.getElementById('iapParticipantStatus').textContent='해당 등록번호로 저장된 IAP가 없습니다.');
i.doc.getElementById('iapParticipantSaveBtn').addEventListener('click',()=>{
 const reg=i.doc.getElementById('iapRegNo').value;
 w.localStorage.setItem('iap_participant_records_v1',JSON.stringify({records:{[reg]:{regNo:reg,state:{memo:i.doc.getElementById('memo').value},updatedAt:new Date().toISOString()}}}));
});
w.dispatchEvent(new w.CustomEvent('clg-tab-frame-load',{detail:{tabId:'t4',pageId:'p05',frame:i.t.frame}}));
search(i);
i.doc.getElementById('memo').value='IAP 수립 기록';
i.doc.getElementById('memo').dispatchEvent(new i.win.Event('input',{bubbles:true}));
i.doc.getElementById('clgFlowSave').click();
assert.match(i.doc.getElementById('clgFlowStatus').textContent,/IAP 저장 확인 완료/);
assert.equal(JSON.parse(w.localStorage.getItem('iap_participant_records_v1')).records[A].state.memo,'IAP 수립 기록');
assert.equal(JSON.parse(w.localStorage.getItem(key))['p05|'+A],undefined,'IAP native record not duplicated');
w.close();
console.log('PASS mandatory search, invalid ID, inert editing gate, full save, empty-form rejection, dirty close, reloading, participant isolation, native IAP save');
