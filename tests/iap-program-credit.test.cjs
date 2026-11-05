'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const outer=fs.readFileSync('index.html','utf8');
const pages=JSON.parse(outer.match(/const PAGES = (.*?);\n/s)[1]);
const html=Buffer.from(pages.find(p=>p.id==='p05').b64,'base64').toString();
const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.TextEncoder=TextEncoder;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('src='))w.eval(m[2].replace('function iapAuditRows(tbodyId,type){','window.testIap={rows:iapAuditRows,audit:iapRunAudit,progress:iapProgressRender};function iapAuditRows(tbodyId,type){'));
d.dispatchEvent(new w.Event('DOMContentLoaded'));
w.eval(fs.readFileSync('activity-rules.js','utf8'));
const $=id=>d.getElementById(id);
const periods=[['2026-11-06','2026-12-05'],['2026-12-06','2027-01-05'],['2027-01-06','2027-02-05'],['2027-02-06','2027-03-05'],['2027-03-06','2027-04-05']];
d.querySelector('input[name="userType"][value="1"]').checked=true;
for(const [id,value] of Object.entries({recognitionDate:'2026-11-05',iapDate:'2026-11-05',svcStart:'2026-11-05',svcEnd:'2027-11-04',visitStart:'2027-01-06',visitEnd:'2027-04-05'}))$(id).value=value;
$('job_tbody').replaceChildren();$('act_tbody').replaceChildren();
function job(kind,name,period){
 const existing=new Set($('job_tbody').children);$('job_addManual').click();const tr=[...$('job_tbody').children].find(n=>!existing.has(n));
 for(const [sel,value] of Object.entries({'.job-kind':kind,'.job-name':name,'.s-date':period[0],'.e-date':period[1]}))tr.querySelector(sel).value=value;
 tr.querySelector('.job-name').dispatchEvent(new w.Event('input',{bubbles:true}));return tr;
}
function act(kind,cnt,period){const tr=d.createElement('tr');for(const [cls,value] of Object.entries({'act-kind':kind,'act-detail':'','act-cnt':String(cnt),'s-date':period[0],'e-date':period[1]})){const n=d.createElement('input');n.className=cls;n.value=value;tr.append(n);}$('act_tbody').append(tr);return tr;}
const cap=job('집단상담','CAP@ 집단프로그램',periods[1]);
job('단기취업특강','마음을 사로잡는 면접전형 준비',periods[2]);
const ai=job('기타','AI면접',periods[2]);
job('자격증 시험응시','전산세무2급 자격증 응시',periods[3]);
act('입사지원',2,periods[0]);act('입사지원',1,periods[3]);act('입사지원',2,periods[4]);act('필수 대면상담',1,periods[4]);act('입사지원',2,['2027-04-06','2027-11-04']);
function check(){w.testIap.audit();w.testIap.progress();return {bad:[...d.querySelectorAll('#iapAuditList .bad')].map(n=>n.textContent),totals:[...d.querySelectorAll('.iap-progress-count strong')].map(n=>Number(n.textContent))};}
let result=check();assert.deepEqual(result.bad,[]);assert.deepEqual(result.totals,[2,2,2,2,3]);
assert($('iapAuditList').textContent.includes('AI면접 프로그램 참여 확인'),'actual participation remains a manual check');
assert(ai.querySelector('.clg-activity-rule').textContent.includes('계획상'));
const capData=w.testIap.rows('job_tbody','job')[0];assert.equal(capData.activityCredit,2);assert.equal(capData.creditDate,periods[1][1]);
// Legacy CAP plans crossing cycles belong only to the completion cycle.
cap.querySelector('.s-date').value=periods[0][0];result=check();assert.deepEqual(result.totals,[2,2,2,2,3]);
cap.querySelector('.e-date').value=periods[2][0];result=check();assert.deepEqual(result.totals,[2,0,4,2,3],'completion on next cycle first day is credited only there');
cap.querySelector('.e-date').value=periods[1][1];
cap.querySelector('.job-kind').value='단기집단상담';result=check();assert.equal(result.totals[1],1);assert(result.bad.some(t=>t.includes('합계 1회 / 필요 2회')));
cap.querySelector('.job-kind').value='집단상담';cap.querySelector('.job-name').value='미확인 집단 프로그램';assert.equal(w.testIap.rows('job_tbody','job')[0].activityCredit,0,'unknown groups need explicit subtype');
cap.querySelector('.job-name').value='CAP@ 집단프로그램';
ai.querySelector('.job-name').value='기타 미확인 활동';result=check();assert.equal(result.totals[2],1);assert(result.bad.length>0,'unknown miscellaneous activities do not receive credit');
ai.querySelector('.job-name').value='AI 면접';result=check();assert.equal(result.totals[2],2);assert.equal(result.bad.length,0);
// Exercise the actual transfer gate without sending anything outside the test window.
const messages=[];w.postMessage=message=>messages.push(message);w.clgIapTransferIdentity=()=>({ok:true,iapNo:'A12345678901'});
$('iapSendWork24Btn').click();const saved=messages.find(m=>m.type==='SAVE_IAP_PENDING');assert(saved,'valid plan passes transfer gate');assert(saved.payload.audit.ok);assert(saved.payload.jobRows.some(r=>r.kind==='기타'&&r.name==='AI 면접'),'original transfer category preserved');
w.dispatchEvent(new w.MessageEvent('message',{source:w,data:{marker:'CLG_IAP_PAGE_V120',type:'IAP_SAVED',payload:{sentAt:saved.payload.sentAt,jobCount:4,actCount:5}}}));
messages.length=0;ai.querySelector('.job-name').value='미확인';$('iapSendWork24Btn').click();assert(messages.some(m=>m.type==='IAP_SEND_BLOCKED'));assert(!messages.some(m=>m.type==='SAVE_IAP_PENDING'),'actual shortages still block transfer');
w.close();console.log('PASS: screenshot CAP/AI plan, progress/audit agreement, completion cycle, short/unknown groups, unknown miscellaneous activities, and transfer gate');
