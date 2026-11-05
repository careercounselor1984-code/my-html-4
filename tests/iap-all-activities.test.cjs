'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const outer=fs.readFileSync('index.html','utf8');
const html=Buffer.from(outer.match(/"id":"p05","title":"[^"]+","b64":"([^"]+)"/)[1],'base64').toString();
const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document,$=id=>d.getElementById(id);
w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};w.TextEncoder=TextEncoder;w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('src='))w.eval(m[2].replace('function iapAuditRows(tbodyId,type){','window.auditTools={audit:iapRunAudit,progress:iapProgressRender,rows:iapAuditRows};function iapAuditRows(tbodyId,type){'));
d.dispatchEvent(new w.Event('DOMContentLoaded'));
for(const name of ['experience-days.js','training-days.js','activity-rules.js'])w.eval(fs.readFileSync(name,'utf8'));
const p=[['2026-11-06','2026-12-05'],['2026-12-06','2027-01-05'],['2027-01-06','2027-02-05'],['2027-02-06','2027-03-05'],['2027-03-06','2027-04-05']];
for(const [id,value] of Object.entries({recognitionDate:'2026-11-05',iapDate:'2026-11-05',svcStart:'2026-11-05',svcEnd:'2027-11-04',visitStart:p[2][0],visitEnd:p[4][1]}))$(id).value=value;
d.querySelector('input[name="userType"][value="1"]').checked=true;
function field(tr,selector,value){const n=tr.querySelector(selector);n.value=value;n.dispatchEvent(new w.Event('change',{bubbles:true}));return n;}
function job(kind,name,dates){$('job_addManual').click();const tr=$('job_tbody').lastElementChild;field(tr,'.job-kind',kind);field(tr,'.job-name',name);field(tr,'.s-date',dates[0]);field(tr,'.e-date',dates[1]);return tr;}
function act(kind,detail,cnt,dates){$('act_addManual').click();const tr=$('act_tbody').lastElementChild;field(tr,'.act-kind',kind);field(tr,'.act-detail',detail);field(tr,'.s-date',dates[0]);field(tr,'.e-date',dates[1]);field(tr,'.act-cnt',String(cnt));return tr;}
function reset({reassess=true,base=1}={}){$('job_tbody').replaceChildren();$('act_tbody').replaceChildren();act('입사지원서 제출','희망직무 입사지원',base,['2026-11-06','2027-11-04']);if(reassess)act('입사지원에 필요한 컨설팅 참여','필수 대면상담(구직준비도 재점검)',1,p[4]);}
function check(){w.auditTools.audit();w.auditTools.progress();return {totals:[...d.querySelectorAll('.iap-progress-count strong')].map(n=>Number(n.textContent)),required:[...d.querySelectorAll('.iap-progress-count')].map(n=>Number(n.textContent.match(/\/\s*(\d+)/)[1])),issues:$('iapAuditList').textContent,bad:[...d.querySelectorAll('#iapAuditList .bad')].map(n=>n.textContent)};}
const single=['심리상담','심리안정','취업진로상담','취업상담','이력서클리닉','자기소개서클리닉','복지지원','금융지원','자격증 시험응시','단기취업특강','전문성 향상 활동','단기집단상담'];
try{
 // Every existing fixed-credit menu must include both boundary dates, including a one-day plan.
 for(const kind of single)for(const date of p[1]){reset();job(kind,'검증 프로그램',[date,date]);const r=check();assert.equal(r.totals[1],2,kind+' on '+date);assert(!r.bad.some(t=>t.includes(p[1][0])),'audit agrees for '+kind);const snapshot=w.clgWorkspaceState.collect();w.clgWorkspaceState.apply(snapshot);assert.equal(check().totals[1],2,kind+' survives save/load');}
 for(const kind of ['집단상담(2일 이상)','고용·복지·금융 집단프로그램(2일 이상)']){reset();job(kind,'검증 프로그램',p[1]);assert.equal(check().totals[1],3,kind);}
 // All actual activity menu choices use the same inclusive date boundaries.
 for(const kind of ['입사지원서 제출','입사 면접 참여','입사지원에 필요한 컨설팅 참여','상담사가 부과한 과제 이행 후 상담 참여','기타 구직 활동']){reset();act(kind,'검증 활동',1,[p[1][1],p[1][1]]);assert.equal(check().totals[1],2,kind+' last day');}
 // Reassessment in the programs table must both satisfy registration and raise the requirement to three.
 reset({reassess:false,base:2});job('IAP 재진단 필수 대면상담','필수 대면상담',p[4]);let r=check();assert.equal(r.totals[4],3);assert.equal(r.required[4],3);assert(!r.bad.some(t=>t.includes('재진단 활동계획')));
 reset({reassess:false,base:2});job('취업상담','IAP 재진단 필수 대면상담',p[4]);r=check();assert.equal(r.required[4],3,'program name is also searched');assert(!r.bad.some(t=>t.includes('재진단 활동계획')));
 reset({reassess:false,base:2});job('IAP 재진단 필수 대면상담','재진단 상담',[p[4][1],p[4][1]]);r=check();assert.equal(r.totals[4],3);assert.equal(r.required[4],3);assert(!r.bad.some(t=>t.includes('재진단 활동계획')),'one-day program on cycle end is valid');
 // A missing cycle selection must be explained, not silently ignored or repeated across cycles.
 reset();job('이력서클리닉','한 번 참여',[p[0][0],p[1][1]]);r=check();assert.deepEqual(r.totals.slice(0,2),[1,1]);assert(r.issues.includes('프로그램 반영기간 확인'));
 // Conditional activities only count after the counselor confirms the specific requirements.
 for(const kind of ['창업지원','사회봉사활동']){reset();const tr=job(kind,'확인할 구체적 활동',p[1]);assert.equal(check().totals[1],1);const control=tr.querySelector('[data-activity-confirm]');assert(control,kind+' confirmation available');control.checked=true;control.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(check().totals[1],2);const snapshot=w.clgWorkspaceState.collect();w.clgWorkspaceState.apply(snapshot);assert.equal(check().totals[1],2,kind+' confirmation restored');const restored=$('job_tbody').firstElementChild;field(restored,'.job-name','다른 활동');assert.equal(check().totals[1],1,kind+' renamed activity needs reconfirmation');}
 reset();job('기타','확인되지 않은 프로그램',p[1]);r=check();assert.equal(r.totals[1],1);assert(r.issues.includes('기타 프로그램 인정기준 확인'));
 // Training and work experience retain explicit per-cycle credit selections and restore them.
 for(const kind of ['직업훈련','일경험'])for(const [band,credit] of [['lt10',1],['ge10',2]]){reset();const tr=job(kind,'검증 과정',p[1]);field(tr,'.job-credit-select',band);assert.equal(check().totals[1],1+credit,kind+' '+band);const snapshot=w.clgWorkspaceState.collect();w.clgWorkspaceState.apply(snapshot);assert.equal(check().totals[1],1+credit,kind+' credit restored');}
 const RealDate=w.Date;w.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[2026,10,6,0,1]));}};check();assert($('iapProgressCurrent').textContent.includes('2회차'),'current cycle starts at midnight on the first date');w.Date=RealDate;
 // Type II is not subjected to Type I's two/three-activity requirement.
 d.querySelector('input[name="userType"][value="2"]').checked=true;reset();job('취업상담','검증 상담',p[1]);assert(!check().bad.some(t=>t.includes('기간별 구직활동 2회')));
 console.log('PASS: all IAP activity menus, single-day boundaries, save/load, both reassessment tables, conditional confirmation, unsplit guidance, training credits and Type II');
}finally{w.close();}
