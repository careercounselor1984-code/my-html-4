'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),cp=require('node:child_process'),{JSDOM}=require('jsdom');
const files=JSON.parse(cp.execFileSync('python3',['-c',`import zipfile,json; z=zipfile.ZipFile('releases/work24-helper-1.4.24.zip');print(json.dumps({n:z.read(n).decode() for n in ['iap.js','iap.html','bridge-security.js','manifest.json','basic.js','basic_content.js']}))`],{maxBuffer:2e6}));
const A='A12345678901',B='A98765432109';
function visible(w){w.HTMLElement.prototype.getBoundingClientRect=function(){return {width:100,height:20}};}
async function extension(){
 const dom=new JSDOM(files['iap.html'],{runScripts:'outside-only',url:'https://extension.test/'}),w=dom.window,d=w.document;visible(w);
 const site=new JSDOM('<body></body>',{runScripts:'outside-only',url:'https://www.work24.go.kr/'}),s=site.window;visible(s);
 const inject=func=>s.eval('('+func.toString()+')');
 const p={iapNo:A,sentAt:new Date().toISOString(),audit:{ok:true},jobRows:[{kind:'직업훈련'}],actRows:[{kind:'입사지원'}]};
 let stored=p,mode='match',writes=[],changesDuringWrite=false;
 w.confirm=()=>true;
 w.chrome={storage:{local:{get:async(k,cb)=>{const r={[k]:stored};cb?.(r);return r},remove:async()=>{}},onChanged:{addListener(){}}},runtime:{getManifest:()=>({version:'1.4.24'})},tabs:{query:async()=>[{id:1,url:'https://www.work24.go.kr/'}]},scripting:{executeScript:async args=>{
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
 set(A);assert(check(A).ok);assert(!check(B).ok);assert(!check('').ok);assert(!check('A123').ok);
 set('***'+A.slice(-5));assert(!check(A).ok,'masked ID rejected');
 set(A+' '+B);assert(!check(A).ok,'ambiguous participants rejected');
 set('X'+A+'Z');assert(!check(A).ok,'substring rejected');
 set(A);const hidden=sd.createElement('span');hidden.textContent=B;hidden.style.display='none';sd.body.append(hidden);assert(check(A).ok,'hidden old tab ignored');hidden.remove();
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
 w.eval(files['bridge-security.js']);const valid=w.ClgBridgeSecurity.validTransfer;
 assert(valid(p,'iap'));assert(!valid({...p,iapNo:''},'iap'));assert(!valid({...p,iapNo:'K12345678901'},'iap'),'job certificate cannot substitute for IAP');
 assert(files['basic.js'].includes('jobCertNo:lastData.jobCertNo'));
 assert(files['basic.js'].includes('jobCertExpire:lastData.jobCertExpire'));
 assert.equal(JSON.parse(files['manifest.json']).version,'1.4.24');w.close();s.close();
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
 assert.match(outer,/!\/\^A\\d\{10,\}\$\/.test\(String\(p.iapNo/,'parent relay rejects numberless old senders');w.close();
}
(async()=>{await journal();await extension();console.log('PASS IAP registration required, form owner, mismatch/missing/masked/ambiguous IDs, all-frame preflight, document pinning, changed participant, stale pending and matching transfer.');})().catch(e=>{console.error(e);process.exit(1)});
