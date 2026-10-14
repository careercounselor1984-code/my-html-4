'use strict';
// Run with jsdom installed (CI installs its pinned version in a temporary directory).
const {JSDOM}=require('jsdom');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const id of ['p01','p02']){
 const m=html.match(new RegExp('"id":"'+id+'","title":"[^"]+","b64":"([^"]+)"'));
 const dom=new JSDOM(Buffer.from(m[1],'base64').toString('utf8'),{runScripts:'outside-only',url:'https://example.test/',pretendToBeVisual:true});
 const w=dom.window,d=w.document;w.TextEncoder=TextEncoder;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
 for(const s of d.querySelectorAll('script:not([src])'))w.eval(s.textContent);
 w.eval(fs.readFileSync(path.join(root,'initial-easy-mode.js'),'utf8'));
 // Include the actual outer app's compact layout, which previously produced duplicate controls.
 w.eval(html.match(/<script id="clg-initial-compact-ui-v1">([\s\S]*?)<\/script>/)[1]);
 d.dispatchEvent(new w.Event('DOMContentLoaded'));
 const by=id=>d.getElementById(id),set=(id,value)=>{by(id).value=value;by(id).dispatchEvent(new w.Event('input',{bubbles:true}));};
 const record=()=>by('recordOutput').textContent;
 assert.ok(d.body.classList.contains('clg-initial-focused'));assert.equal(by('easyQuick'),null);assert.equal(by('easyDetail'),null);
 assert.ok(by('counselorOpinion').closest('.clg-opinion-main'));assert.equal(by('finalEducation').tagName,'SELECT');
 assert.equal(d.querySelectorAll('.clgQuickBar button').length,id==='p01'?4:3);
 assert.ok(record().includes('건강(육체적) 미확인'));assert.ok(record().includes('참여 이력: 미확인'));assert.ok(!record().includes('과정 안내함'));assert.ok(!record().includes('작성·배부'));
 set('finalEducation','대졸');set('participatePath','울산대학교');
 const tasks=()=>[...d.querySelectorAll('input[name="strategyTask"]:checked')].map(e=>e.value);
 set('counselorOpinion','상담사가 확인한 내용.');
 set('opinionAssistMemo','현재 상태: 구직 중\n지원계획: 이력서 보완\n분류되지 않은 중요한 내용');by('opinionAssistBuild').click();
 assert.equal(by('counselorOpinion').value,'상담사가 확인한 내용.');assert.ok(by('opinionAssistDraft').value.includes('분류되지 않은 중요한 내용'));assert.deepEqual(tasks(),[]);
 by('opinionAssistApply').click();const appended=by('counselorOpinion').value;assert.ok(appended.startsWith('상담사가 확인한 내용.'));assert.ok(record().includes('분류되지 않은 중요한 내용'));
 by('opinionAssistApply').click();assert.equal(by('counselorOpinion').value,appended);
 set('opinionAssistMemo','지원계획: 면접 준비');by('opinionAssistBuild').click();assert.ok(!by('opinionAssistDraft').value.includes('이력서'));assert.deepEqual(tasks(),[]);
 assert.equal(by('finalEducation').value,'대졸');assert.equal(by('participatePath').value,'울산대학교');
 // An explicit negative and an actual completed guidance check still print correctly.
 const radio=d.querySelector('input[name="healthPhysical"][value="없음"]');radio.checked=true;radio.dispatchEvent(new w.Event('change',{bubbles:true}));
 by('checkUnifiedGuidance').checked=true;by('checkUnifiedGuidance').dispatchEvent(new w.Event('change',{bubbles:true}));assert.ok(record().includes('건강(육체적) 없음'));assert.ok(record().includes('작성·배부'));
 if(id==='p01'){assert.ok(record().includes('가족수당 대상: 미확인'));const r=d.querySelector('input[name="familySupportStatus"][value="대상 아님"]');r.checked=true;r.dispatchEvent(new w.Event('change',{bubbles:true}));assert.ok(record().includes('가족수당 대상 없음'));}
 // Copy does not invent an opinion when the counselor has left it blank.
 set('counselorOpinion','');by('copyRecordBtn').click();assert.equal(by('counselorOpinion').value,'');
 by('resetBtn').click();assert.equal(by('checkUnifiedGuidance').checked,false);assert.ok(record().includes('건강(육체적) 미확인'));
 dom.window.close();console.log(id+': preserved form, simplified navigation, memo-only draft, no overwrite/duplicate, explicit checks and reset passed');
}
