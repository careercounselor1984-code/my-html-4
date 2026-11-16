'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const raw=fs.readFileSync('index.html','utf8');
const pages=JSON.parse(raw.match(/const PAGES = (\[.*?\]);/s)[1]);
const html=Buffer.from(pages.find(p=>p.id==='p05').b64,'base64').toString('utf8');
const workspace=fs.readFileSync('journal-workspace.js','utf8');
const A='A12345678901';
const parent=new JSDOM('<body></body>',{url:'https://journal.test/',runScripts:'outside-only',pretendToBeVisual:true});
const w=parent.window,d=w.document,tabList=[];
w.__CLG_JOURNAL_EMPLOYEE={email:'native-iap-audit@example.test'};
w.clgGetWorkTabs=()=>tabList;
w.clgSetWorkTabClient=()=>{};
w.confirm=()=>true;w.alert=()=>{};w.prompt=()=> '상담내용 수정';
async function attach(){
 const iframe=d.createElement('iframe');iframe.className='clgWorkFrame is-active';iframe.dataset.pageId='p05';iframe.dataset.external='0';
 d.body.append(iframe);const doc=iframe.contentDocument;doc.open();doc.write(html);doc.close();const cw=iframe.contentWindow;
 // Let jsdom's automatic DOMContentLoaded finish before registering the actual page scripts.
 await new Promise(resolve=>setTimeout(resolve,45));
 cw.alert=()=>{};cw.confirm=()=>true;cw.prompt=()=> '상담내용 수정';
 cw.scrollTo=()=>{};cw.HTMLElement.prototype.scrollIntoView=()=>{};cw.TextEncoder=TextEncoder;
 cw.HTMLDialogElement.prototype.showModal=function(){this.open=true};cw.HTMLDialogElement.prototype.close=function(){this.open=false};
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('src='))cw.eval(m[2]);
 // Native main() is installed after jsdom's auto event, so dispatch exactly once here.
 doc.dispatchEvent(new cw.Event('DOMContentLoaded'));
 const tab={pageId:'p05',id:'tab'+tabList.length,frame:iframe,draftId:'draft'+tabList.length,dirty:false,client:null};
 tabList.push(tab);return {iframe,doc,cw,tab};
}

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const db=()=>JSON.parse(w.localStorage.getItem('iap_participant_records_v1')||'{}');
function lookup(ctx){
 const id=x=>ctx.doc.getElementById(x);
 assert(id('clgRequiredFlowGate'),'mandatory screen');
 id('clgFlowRegister').value=A;id('clgFlowLookup').click();
 assert(!id('clgRequiredFlowGate'),'unlocked by search');
}
function field(ctx,id,value){
 const el=ctx.doc.getElementById(id);assert(el,id);el.value=value;
 el.dispatchEvent(new ctx.cw.Event('input',{bubbles:true}));
 el.dispatchEvent(new ctx.cw.Event('change',{bubbles:true}));
}
(async()=>{
 const first=await attach();w.eval(workspace);await wait(25);
 lookup(first);await wait(15);
 field(first,'wishJob','기계 설계 업무');
 field(first,'counselNote','역량 향상 훈련 신청 및 입사지원 계획');
 first.doc.getElementById('clgFlowSave').click();
 assert(db().records?.[A],'IAP saved via mandatory toolbar');
 assert.equal(db().records[A].state.fields['#wishJob'],'기계 설계 업무');
 assert.match(first.doc.getElementById('clgFlowStatus').textContent,/저장 확인 완료/);
 const second=await attach();await wait(25);
 w.dispatchEvent(new w.CustomEvent('clg-tab-frame-load',{detail:{tabId:second.tab.id,pageId:'p05',frame:second.iframe}}));
 await wait(15);
lookup(second);await wait(10);

 const dialog=second.doc.getElementById('iapLoadConfirmDialog');
 if(dialog?.open){const confirm=second.doc.getElementById('iapLoadContinue');assert(confirm,'load confirmation');confirm.click();}
 await wait(35);
 const status=second.doc.getElementById('iapParticipantStatus').textContent;
 assert.equal(second.doc.getElementById('wishJob').value,'기계 설계 업무','IAP old record loaded; status='+status+', modal='+!!dialog?.open);
 field(second,'wishJob','전기 설계 업무');
 second.doc.getElementById('clgFlowSave').click();
 assert.equal(db().records[A].state.fields['#wishJob'],'전기 설계 업무','native IAP edit persisted');
 assert.match(second.doc.getElementById('clgFlowStatus').textContent,/저장 확인 완료/);
 second.doc.getElementById('iapRegNo').value='A98765432109';
 second.doc.getElementById('clgFlowSave').click();
 assert.equal(db().records[A].state.fields['#wishJob'],'전기 설계 업무','wrong IAP number refused');
 assert(!db().records['A98765432109'],'different IAP not created');
 console.log('PASS: actual embedded IAP search, first save, reopen, native confirmation, modify, verified re-save and number mismatch protection');
 parent.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;parent.window.close();});
