'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),pages=JSON.parse(html.match(/const PAGES = (\[.*?\]);/s)[1]),page=id=>Buffer.from(pages.find(p=>p.id===id).b64,'base64').toString();
const iap=page('p05');for(const token of ['iapPdfImportCard','pdfjsLib','pdfReadFile','전산 IAP 자동 불러오기'])assert(!iap.includes(token),token+' removed');
for(const token of ['iapRegNo','iapParticipantLoadBtn','iapParticipantSaveBtn','iapSendWork24Btn','collectWorkspaceIapDraft'])assert(iap.includes(token),token+' retained');
const ready=page('p07'),sender=ready.match(/<script id="clg-readiness-page-v150-script">([\s\S]*?)<\/script>/)[1];
const dom=new JSDOM('<div id="toast-container"></div><button id="readinessSendBtn"></button>'+['q1_jobGoal','q2_jobWill','q3_jobPlan','q4_jobSkill','q5_jobInfo','q6_competencyChange','q7_barrier','health'].map((name,i)=>`<input type="radio" name="${name}" id="${i===7?'health1':'q'+(i+1)+'_1'}" checked>`).join(''),{runScripts:'outside-only'}),w=dom.window;
const requests=[],messages=[];w.postMessage=d=>requests.push(d);w.showMessage=(...args)=>messages.push(args);w.eval(sender);const btn=w.document.getElementById('readinessSendBtn');btn.click();btn.click();assert.equal(requests.length,1);
const ack={marker:'CLG_READINESS_PAGE_V150',type:'READINESS_SAVED',payload:{sentAt:requests[0].payload.sentAt,answers:8}};
for(let i=0;i<3;i++)w.dispatchEvent(new w.MessageEvent('message',{source:w,data:ack}));assert.equal(messages.length,1,'duplicate relay replies show one success');assert.equal(btn.disabled,false);w.close();
(async()=>{
 const dom=new JSDOM('<iframe id="frame"></iframe>',{runScripts:'outside-only',url:'https://example.test/'}),w=dom.window;await new Promise(r=>setTimeout(r,5));const doc=w.document.getElementById('frame').contentDocument;
 doc.body.innerHTML='<input id="clgIapRegNo" value="A123"><input id="clientName" value="상담자"><textarea id="note">작성내용</textarea>';
 const tab={id:'tab1',pageId:'p07',draftId:'draft-test',frame:w.document.getElementById('frame')};w.__CLG_JOURNAL_EMPLOYEE={email:'test@example.test'};w.clgGetWorkTabs=()=>[tab];w.clgSetWorkTabClient=(id,c)=>tab.client=c;w.clgOpenNewWorkTab=()=>{throw Error('must not force a new client tab')};
 w.eval(fs.readFileSync('journal-workspace.js','utf8'));assert(!doc.querySelector('.clg-client-workspace'));assert(!doc.getElementById('clgIapRegNo').readOnly);
 const reg=doc.getElementById('clgIapRegNo');reg.value='B456';reg.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));assert.equal(reg.value,'B456');w.clgFlushWorkDrafts();
 const saved=JSON.parse(w.sessionStorage.getItem('clg_work_drafts_v1:test@example.test'));assert(saved['draft-test'].fields.some(f=>f.key==='id:note'&&f.value==='작성내용'));assert.equal(tab.client.reg,'B456');w.close();
 console.log('PASS journal cleanup: PDF removed; IAP search/save/send retained; duplicate acks collapse; native identity editable; per-tab drafts preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
