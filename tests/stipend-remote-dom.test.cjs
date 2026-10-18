'use strict';
const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),pages=JSON.parse(html.match(/const PAGES = (\[.*?\]);/s)[1]);
const page=Buffer.from(pages.find(p=>p.id==='p06').b64,'base64').toString();
const source=fs.readFileSync('stipend-remote.js','utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const fixture=(patch={})=>({fullBase:600000,fullFam:0,fullEntitlement:600000,appliedBase:600000,appliedFam:0,payCap:600000,familyCount:0,nonProgramIncome:0,programIncome:0,reportedIncome:0,excludedIncome:0,criteria:1538543,decision:'소득 없음',pay:600000,...patch});
async function setup(){
 const dom=new JSDOM(page,{url:'https://careercounselor1984-code.github.io/my-html-4/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,d=w.document;
 const state={signedIn:true,calls:[],reply:()=>fixture(),alerts:[],copies:0};
 w.alert=message=>state.alerts.push(message);w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};d.execCommand=()=>{state.copies++;return true};
 w.clgJobArchiveClient=()=>state.signedIn?state:null;
 w.clgComputeStipend=async fields=>{state.calls.push(JSON.parse(JSON.stringify(fields)));return state.reply(fields)};
 w.eval(source);for(const script of d.querySelectorAll('script:not([src])'))w.eval(script.textContent);
 await w.calculate({immediate:true});await settle();
 const set=(id,value)=>{d.getElementById(id).value=value;d.getElementById(id).dispatchEvent(new w.Event('change',{bubbles:true}));};
 return {w,d,state,set,close:()=>w.close()};
}
(async()=>{
 assert(!page.includes('const fullBase = 600000;'));assert(!page.includes('const criteria = Math.max'));
 assert(page.includes('stipend-remote.js'));assert(page.includes('await calculate({immediate:true,fresh:true})'));
 const s=await setup();try{
  assert.equal(s.d.getElementById('finalPayment').innerText,'600,000');assert.equal(s.state.calls.length,1);
  const allowed=['years','referenceYear','ratePct','familyCount','incomeStatus','nonProgramIncome','programIncome','excludedIncome'];
  assert.deepEqual(Object.keys(s.state.calls[0]).sort(),allowed.sort(),'only numeric/enumerated inputs, no identity or narrative');
  await s.w.calculate();await s.w.calculate();assert.equal(s.state.calls.length,1,'identical inputs reuse recent results');
  const before=s.state.calls.length;s.set('familyCount','1');s.set('familyCount','2');s.set('familyCount','3');assert.equal(s.state.calls.length,before,'rapid changes wait for one request');
  s.state.reply=()=>fixture({fullFam:300000,fullEntitlement:900000,appliedFam:300000,payCap:900000,familyCount:3,pay:900000,criteria:1800000});
  await s.w.calculate({immediate:true});assert.equal(s.state.calls.length,before+1);assert.equal(s.d.getElementById('finalPayment').innerText,'900,000');
  await s.w.generateResult();assert(s.d.getElementById('logResult').value.includes('- 최종 지급액: 900,000원'));assert(s.d.getElementById('kakaoResult').value.includes('900,000원'));assert.equal(s.d.getElementById('resultArea').dataset.current,'1');
  s.w.copyText('logResult');assert.equal(s.state.copies,1);
  s.d.getElementById('logResult').value='직접 고친 결과';s.set('nextPlanActivities','새 과제');s.w.copyText('logResult');assert.equal(s.state.copies,1,'copy blocked after source changes');assert.equal(s.d.getElementById('logResult').value,'직접 고친 결과');
  s.state.reply=()=>{throw Error('network failure')};await s.w.generateResult();assert.equal(s.d.getElementById('logResult').value,'직접 고친 결과');assert.equal(s.d.getElementById('generateStipendBtn').disabled,false);assert.equal(s.d.getElementById('resultArea').dataset.current,'0');
  s.state.signedIn=false;s.w.dispatchEvent(new s.w.Event('clg-auth-logout'));const n=s.state.calls.length;assert.equal(await s.w.calculate({immediate:true}),null);assert.equal(s.state.calls.length,n,'no request when logged out');
  s.state.signedIn=true;s.state.reply=()=>fixture();s.w.dispatchEvent(new s.w.Event('clg-auth-ready'));await settle();assert.equal(s.state.calls.length,n+1,'reauth recalculates');
 }finally{s.close();}
 const t=await setup();try{
  let release;t.state.reply=()=>new Promise(resolve=>{release=resolve});
  t.d.getElementById('logResult').value='보존할 기록';const pending=t.w.generateResult();await settle();
  t.set('nextPlanActivities','대기 중 수정한 계획');release(fixture());await pending;
  assert.equal(t.d.getElementById('logResult').value,'보존할 기록');assert(t.d.getElementById('incomeDecisionDisplay').innerText.includes('변경'));
  let releaseOld;t.state.reply=()=>new Promise(resolve=>{releaseOld=resolve});t.set('familyCount','1');const old=t.w.calculate({immediate:true});await settle();
  t.set('familyCount','2');t.state.reply=()=>fixture({familyCount:2,fullFam:200000,fullEntitlement:800000,appliedFam:200000,payCap:800000,pay:800000});await t.w.calculate({immediate:true});releaseOld(fixture({familyCount:1,pay:700000}));assert.equal(await old,null);assert.equal(t.d.getElementById('finalPayment').innerText,'800,000','old response does not overwrite new amount');
  t.set('counselingDate','2027-01-02');const calls=t.state.calls.length;await t.w.generateResult();assert.equal(t.state.calls.length,calls,'future-year result generation blocked locally');assert(t.state.alerts.some(x=>x.includes('2027')));
 }finally{t.close();}
 console.log('PASS: allowance DOM uses numeric-only server inputs, debounce/cache, generated amounts, manual-output preservation, stale copy guard, network/logout/relogin, late result and future-year guards.');
})().catch(error=>{console.error(error);process.exitCode=1;});
