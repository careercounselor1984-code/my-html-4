'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const outer=fs.readFileSync('index.html','utf8'),html=Buffer.from(outer.match(/"id":"p05","title":"[^"]+","b64":"([^"]+)"/)[1],'base64').toString();
const wait=()=>new Promise(r=>setTimeout(r,10));
(async()=>{
 const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,alerts=[],prompts=[];
 w.alert=x=>alerts.push(x);w.confirm=x=>{prompts.push(x);return true};w.prompt=()=> '수정';w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.TextEncoder=TextEncoder;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 await wait();for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('src='))w.eval(m[2]);d.dispatchEvent(new w.Event('DOMContentLoaded'));await wait();
 const el=id=>d.getElementById(id),click=id=>el(id).click(),change=()=>el('iapRegNo').dispatchEvent(new w.Event('change',{bubbles:true}));
 const reg=value=>{el('iapRegNo').value=value;el('iapRegNo').dispatchEvent(new w.Event('input',{bubbles:true}));};
 const db=()=>JSON.parse(w.localStorage.getItem('iap_participant_records_v1'));
 reg('A');click('iapParticipantLoadBtn');
 el('wishJob').value='A 직종';el('counselNote').value='A 의견';el('svcStart').value='2026-10-19';el('svcEnd').value='2027-10-18';
 const draft=w.clgWorkspaceState.collect();draft.state.jobRows=[{kind:'직업훈련',name:'A 훈련',start:'2026-10-20',end:'2026-11-20',org:'A 기관'}];draft.state.actRows=[{kind:'입사지원',detail:'A 활동',start:'2026-10-20',end:'2026-11-20',cnt:'2'}];w.clgWorkspaceState.apply(draft);
 click('iapParticipantSaveBtn');const savedA=JSON.stringify(db().records.A);prompts.length=0;
 el('output').textContent='A 생성 결과';
 w.localStorage.setItem('clg_iap_common_profiles_v1',JSON.stringify({B:{initialDesiredJob:'B 직종',recognitionDate:'2026-10-01'}}));
 reg('B');change();
 assert.equal(prompts.length,0,'saved form switches without discard confirmation');assert.equal(el('iapRegNo').value,'B');assert.equal(el('wishJob').value,'B 직종');assert.equal(el('counselNote').value,'');assert.notEqual(el('svcStart').value,'2026-10-19');assert.equal(el('job_tbody').children.length,0);assert.equal(el('act_tbody').children.length,0);assert(!el('output').textContent.includes('A 생성 결과'));
 click('iapParticipantLoadBtn');assert.match(el('iapParticipantStatus').textContent,/저장된 IAP가 없습니다/);assert.equal(el('wishJob').value,'B 직종');assert.equal(JSON.stringify(db().records.A),savedA);
 el('counselNote').value='B 의견';click('iapParticipantSaveBtn');const savedB=JSON.stringify(db().records.B);
 // Existing records load their own rows and remain editable after switching.
 reg('A');change();click('iapParticipantLoadBtn');assert.equal(el('wishJob').value,'A 직종');assert.equal(el('job_tbody').querySelector('.job-name').value,'A 훈련');assert.equal(el('counselNote').value,'A 의견');
 el('counselNote').value='A 수정';click('iapParticipantSaveBtn');assert.equal(db().records.A.state.fields['#counselNote'],'A 수정');assert.equal(JSON.stringify(db().records.B),savedB);
 // Enter/click lookup without a change event must also clear the old form.
 reg('C');click('iapParticipantLoadBtn');assert.equal(el('iapRegNo').value,'C');assert.equal(el('wishJob').value,'');assert.equal(el('job_tbody').children.length,0);
 el('wishJob').value='C 미저장';reg('B');w.confirm=()=>false;click('iapParticipantLoadBtn');assert.equal(el('iapRegNo').value,'C');assert.equal(el('wishJob').value,'C 미저장');assert.equal(JSON.stringify(db().records.B),savedB);
 // Draft restore preserves the original owner even if the search number is being edited.
 reg('D');const pending=w.clgWorkspaceState.collect();w.clgWorkspaceState.apply(pending);w.confirm=()=>true;click('iapParticipantSaveBtn');assert(!db().records.D,'save must not copy C into D');assert.equal(el('wishJob').value,'');assert.equal(el('iapRegNo').value,'D');
 reg('A');click('iapParticipantLoadBtn');let release;w.clgGenerateIapOpinion=()=>new Promise(r=>release=r);click('applyIapOpinionBtn');reg('B');change();release('A 늦은 의견');await wait();assert.equal(el('counselNote').value,'','old async opinion cannot enter the new client form');
 w.close();console.log('PASS: A→new/common B→saved A, rows/output clearing, storage isolation, dirty cancellation, Enter lookup, draft owner, save guard and stale async opinion.');
})().catch(e=>{console.error(e);process.exit(1)});
