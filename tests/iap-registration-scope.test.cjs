'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),cp=require('node:child_process'),{JSDOM}=require('jsdom');
const files=Object.fromEntries(['iap.js','iap.html','bridge-security.js','manifest.json','basic.js','basic_content.js'].map(n=>[n,fs.readFileSync('extension/'+n,'utf8')]));
const A='A12345678901',B='A98765432109';
function visible(w){w.HTMLElement.prototype.getBoundingClientRect=function(){return {width:100,height:20}};}
async function extension(){
 const dom=new JSDOM(files['iap.html'],{runScripts:'outside-only',url:'https://extension.test/'}),w=dom.window,d=w.document;visible(w);
 const site=new JSDOM('<body></body>',{runScripts:'outside-only',url:'https://www.work24.go.kr/'}),s=site.window;visible(s);
 const inject=func=>s.eval('('+func.toString()+')');
 const p={iapNo:A,sentAt:new Date().toISOString(),audit:{ok:true},jobRows:[{kind:'직업훈련'}],actRows:[{kind:'입사지원'}]};
 let stored=p,mode='match',writes=[],changesDuringWrite=false,removed=0;
 w.confirm=()=>true;
 w.chrome={storage:{local:{get:async(k,cb)=>{const r={[k]:stored};cb?.(r);return r},remove:async()=>{removed++}},onChanged:{addListener(){}}},runtime:{getManifest:()=>({version:'1.4.28'})},tabs:{query:async()=>[{id:1,url:'https://www.work24.go.kr/'}]},scripting:{executeScript:async args=>{
  const name=args.func.name;
  if(name==='probeIapFrameMAIN')return [{frameId:1,documentId:'job',result:{jobGrid:true}},{frameId:2,documentId:'act',result:{actGrid:true}}];
  if(name==='checkIapParticipantMAIN')return args.target.frameIds.map(id=>({frameId:id,documentId:id===1?'job':'act',result:{ok:mode==='match'||(mode==='split'&&id===1),reason:'번호 불일치'}}));
  assert(args.target.documentIds?.length===1,'mutation pinned to checked document');
  if(changesDuringWrite){await assert.rejects(inject(args.func)({iapNo:B}),/등록번호 검증 실패/);throw Error('등록번호 검증 실패');}
  writes.push(name);return [{frameId:1,result:{ok:true,found:true,added:1}}];
 }}};
 w.eval(files['iap.js']);
 const check=inject(w.checkIapParticipantMAIN),sd=s.document;
 const set=text=>{sd.body.replaceChildren();let el=sd.createElement('span');el.id='identity';el.textContent=text;sd.body.prepend(el)};
 set(A);assert(check(A).ok);
 sd.body.innerHTML='<span>'+A+'</span>'+Array.from({length:5000},(_,i)=>'<div>일반 항목 '+i+'<span>내용</span></div>').join('');
 let styleReads=0,layoutReads=0;const realStyle=s.getComputedStyle.bind(s),realRect=s.HTMLElement.prototype.getBoundingClientRect;
 s.getComputedStyle=(el)=>{styleReads++;return realStyle(el)};
 s.HTMLElement.prototype.getBoundingClientRect=function(){layoutReads++;return realRect.call(this)};
 assert(check(A).ok);assert(styleReads<30,'style reads limited to number candidates and ancestors');assert(layoutReads<10,'ordinary fields do not trigger layout reads');
 console.log('PERF 10,001 elements: '+styleReads+' style reads, '+layoutReads+' layout reads per identity check');
 s.getComputedStyle=realStyle;s.HTMLElement.prototype.getBoundingClientRect=realRect;
 set(A);
 assert(!check(B).ok);assert(!check('').ok);assert(!check('A123').ok);
 set('***'+A.slice(-5));assert(!check(A).ok,'masked ID rejected');
 set(A+' '+B);assert(!check(A).ok,'ambiguous participants rejected');
 set('X'+A+'Z');assert(!check(A).ok,'substring rejected');
 set(A);const hidden=sd.createElement('span');hidden.textContent=B;hidden.style.display='none';sd.body.append(hidden);assert(check(A).ok,'hidden old tab ignored');hidden.remove();
 // Work24 controls can have their own text plus child elements.
 sd.body.innerHTML='<div>'+A+'<input value=""></div>';assert(check(A).ok,'wrapper own text is readable');
 sd.body.innerHTML='<div style="display:none"><span>'+B+'</span></div><span>'+A+'</span>';assert(check(A).ok,'hidden ancestors ignored');
 sd.body.innerHTML='<div aria-hidden="true"><span>'+B+'</span></div><span>'+A+'</span>';assert(check(A).ok,'inactive accessible tab ignored');
 sd.body.innerHTML='<h1>IAP등록/관리</h1><iframe id="basic"></iframe><iframe id="plan"></iframe><iframe id="old" style="display:none"></iframe>';
 const basic=sd.getElementById('basic').contentWindow,plan=sd.getElementById('plan').contentWindow,old=sd.getElementById('old').contentWindow;
 for(const frame of [basic,plan,old])visible(frame);
 basic.document.body.innerHTML='<span>'+A+'</span>';old.document.body.innerHTML='<span>'+B+'</span>';
 const planCheck=plan.eval('('+w.checkIapParticipantMAIN.toString()+')');
 assert(planCheck(A).ok,'plan frame reads visible sibling basic information');
 sd.querySelector('h1').textContent='다른 화면';assert(!planCheck(A).ok,'unrelated sibling identity cannot authorize a plan');sd.querySelector('h1').textContent='IAP등록/관리';
 assert(!planCheck(B).ok,'visible sibling number must match transfer');
 basic.document.body.innerHTML='<span>'+A+' '+B+'</span>';assert(!planCheck(A).ok,'visible conflicting numbers block');
 basic.document.body.innerHTML='<span>***12345</span>';assert(!planCheck(A).ok,'masked sibling ID blocks');
 basic.document.body.innerHTML='<span>'+A+'</span>';sd.getElementById('plan').style.display='none';assert(!planCheck(A).ok,'hidden destination blocks');
 sd.getElementById('plan').style.display='';basic.document.body.innerHTML='<span>'+B+'</span>';assert(!planCheck(A).ok,'changed participant blocks immediately');

 // A list in the parent document must not contaminate the IAP input document.
 sd.body.innerHTML='<div id="list">'+Array.from({length:8},(_,i)=>'<span>A9876543210'+i+'</span>').join('')+'</div><iframe id="iap"></iframe>';
 const iap=sd.getElementById('iap').contentWindow;visible(iap);
 iap.document.body.innerHTML='<h1>IAP등록/관리</h1><label for="reg">IAP번호</label><input id="reg" value="'+A+'">';
 const currentCheck=iap.eval('('+w.checkIapParticipantMAIN.toString()+')');
 assert(currentCheck(A).ok,'parent recipient list ignored when destination has an IAP identity');
 assert(!currentCheck(B).ok,'list number cannot replace current participant');
 // Even if another list is in the same document, use explicitly labelled IAP fields.
 iap.document.body.insertAdjacentHTML('beforeend','<div id="otherList"><span>'+B+'</span></div>');
 assert(currentCheck(A).ok,'same-document list ignored in favour of IAP fields');
 iap.document.getElementById('reg').value=B;assert(!currentCheck(A).ok,'actual IAP participant change blocks');
 iap.document.getElementById('reg').value='';assert(!currentCheck(A).ok,'empty field never borrows list identity');
 iap.document.getElementById('reg').value='***12345';assert(!currentCheck(A).ok,'masked field never borrows list identity');
 iap.document.getElementById('reg').value=A;
 iap.document.body.insertAdjacentHTML('afterbegin','<table><tr><th><span>IAP 번호</span></th><td><div>'+B+'</div></td></tr></table>');
 assert(!currentCheck(A).ok,'conflicting search/basic IAP fields block');
 iap.document.querySelector('table').remove();
 iap.document.body.innerHTML='<div><div><span>IAP번호</span></div><div>'+A+'</div></div><div><span>'+B+'</span></div>';
 assert(currentCheck(A).ok,'Nexacro label/value wrappers ignore separate list');
 // Both embedded mutation guards must use the same scope as preflight.
 iap.document.body.innerHTML='<label for="reg">IAP번호</label><input id="reg" value="'+A+'"><div>'+B+'</div>';
 for(const name of ['applyIapActivitiesMAIN','applyIapJobProgramsMAIN']){
  const fn=iap.eval('('+w[name].toString()+')');
  await fn({iapNo:A,jobRows:[],actRows:[]});
  await assert.rejects(fn({iapNo:B,jobRows:[],actRows:[]}),/등록번호 검증 실패/);
 }
 set(A);

 for(const name of ['applyIapActivitiesMAIN','applyIapJobProgramsMAIN']){
  await assert.rejects(inject(w[name])({iapNo:B,jobRows:[],actRows:[]}),/등록번호 검증 실패/);
  await assert.rejects(inject(w[name])({jobRows:[],actRows:[]}),/등록번호 검증 실패/);
 }
 const click=async()=>{d.getElementById('applyBtn').disabled=false;d.getElementById('applyBtn').click();await new Promise(r=>setTimeout(r,20))};
 mode='split';await click();assert.deepEqual(writes,[],'all destination sections checked before first write');
 mode='match';changesDuringWrite=true;await click();assert.deepEqual(writes,[],'participant switch at mutation time rejected');
 changesDuringWrite=false;await click();assert.deepEqual(writes,['applyIapJobProgramsMAIN','applyIapActivitiesMAIN']);
 assert.match(d.getElementById('status').textContent,/입력 완료/);
 writes=[];d.getElementById('applyBtn').click();d.getElementById('applyBtn').click();await new Promise(r=>setTimeout(r,20));
 assert.equal(writes.length,2,'rapid double click cannot enter two asynchronous input runs');
 stored={...p,iapNo:B,sentAt:new Date(Date.now()+1).toISOString()};writes=[];await click();assert.deepEqual(writes,[],'replaced pending payload rejected');
 assert.equal(removed,0,'outdated panel cannot delete a newer transfer');
 w.eval(files['bridge-security.js']);const valid=w.ClgBridgeSecurity.validTransfer;
 assert(valid(p,'iap'));assert(!valid({...p,iapNo:''},'iap'));assert(!valid({...p,iapNo:'K12345678901'},'iap'),'job certificate cannot substitute for IAP');
 assert(files['basic.js'].includes('jobCertNo:lastData.jobCertNo'));
 assert(files['basic.js'].includes('jobCertExpire:lastData.jobCertExpire'));
 assert.equal(JSON.parse(files['manifest.json']).version,'1.4.29');assert(JSON.parse(files['manifest.json']).version_name.startsWith('1.4.29'));w.close();s.close();
}
async function journal(){
 const outer=fs.readFileSync('index.html','utf8'),pages=JSON.parse(outer.match(/const PAGES = (\[.*?\]);/s)[1]);
 const html=Buffer.from(pages.find(x=>x.id==='p05').b64,'base64').toString();
 const dom=new JSDOM(html,{url:'https://journal.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>'';w.scrollTo=()=>{};w.TextEncoder=TextEncoder;w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('src='))w.eval(m[2]);
 d.dispatchEvent(new w.Event('DOMContentLoaded'));
 await new Promise(r=>setTimeout(r,10));
 const number=d.getElementById('iapRegNo');number.value='';assert(!w.clgIapTransferIdentity().ok);
 number.value=A;assert(w.clgIapTransferIdentity().ok);
 const draft=w.clgWorkspaceState.collect();draft.formRegNo=A;draft.regNo=B;w.clgWorkspaceState.apply(draft);
 assert(!w.clgIapTransferIdentity().ok,'editing search number cannot relabel another client form');
 let sent=[];w.postMessage=x=>sent.push(x);d.getElementById('iapSendWork24Btn').click();assert.equal(sent.length,0);
 draft.regNo=A;w.clgWorkspaceState.apply(draft);
 d.getElementById('iapAuditRunBtn').addEventListener('click',()=>d.getElementById('iapAuditList').replaceChildren());
 d.getElementById('iapSendWork24Btn').click();const msg=sent.find(x=>x.type==='SAVE_IAP_PENDING');assert.equal(msg?.payload.iapNo,A,'full ID travels with IAP rows');
 assert.match(outer,/!\/\^A\\d\{10,\}\$\/.test\(String\(p.iapNo/,'parent relay rejects numberless old senders');await new Promise(r=>setTimeout(r,20));await new Promise(r=>setTimeout(r,20));w.close();
}
(async()=>{await journal();await extension();console.log('PASS wrapper text, visible sibling frames, hidden ancestors/destinations, participant changes; IAP registration required, form owner, mismatch/missing/masked/ambiguous IDs, all-frame preflight, document pinning, changed participant, stale pending and matching transfer.');})().catch(e=>{console.error(e);process.exit(1)});
