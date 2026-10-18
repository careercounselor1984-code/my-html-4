const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('index.html','utf8'),pages=JSON.parse(source.match(/const PAGES = (.*?);\n/s)[1]);
const page=id=>Buffer.from(pages.find(p=>p.id===id).b64,'base64').toString();
const nested=(id,name)=>Buffer.from(page(id).match(new RegExp('const '+name+' = "([A-Za-z0-9+/=]+)"'))[1],'base64').toString();
const helper=fs.readFileSync('protected-core.js','utf8'),wait=(ms=20)=>new Promise(r=>setTimeout(r,ms));
const packet=()=>({opinion:'서버 의견',data:{strongestAreas:'강점',weakestAreas:'보완',overallType:'유형',readiness:'서버 해석',service:'서버 지원방향',career:'서버 직무적합성',style:'서버 성격반영',opinionLines:['서버 추천'],serviceItems:['서버 지원'],finalOpinion:'서버 의견'}});
async function load(html,bridge){const dom=new JSDOM(html,{url:'https://example.test/my-html-4/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;await wait();w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.Chart=class{destroy(){}update(){}};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.clgRunProtectedCore=bridge;w.eval(helper);for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!m[1].includes('src='))w.eval(m[2]);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await wait();return {dom,w,d:w.document,close:()=>w.close()};}
(async()=>{
 for(const [name,html]of [['L',page('p03')],['S',page('p04')],['schoolL',nested('p23','SRC_L')],['schoolS',nested('p23','SRC_S')]]){
  let received,calls=0,release;const s=await load(html,async(op,values)=>{calls++;received={op,values};return packet()});const {w,d}=s;
  const text=await w.generateRecord();assert(text.includes('서버 해석'),name);assert(text.includes('서버 의견'));assert(!text.includes('[object Promise]'));assert(!Object.keys(received.values).some(k=>/name|regno|phone|pdf|extracted/i.test(k)));assert(!JSON.stringify(received.values).includes('상담일시'));assert(w.ClgProtectedCore.isCurrent(d.getElementById('reportContent')));
  d.getElementById('counselorOpinionDetail').value='직접 의견';await w.generateRecord();assert(d.getElementById('reportContent').textContent.includes('직접 의견'));
  const old=d.getElementById('reportContent').textContent;w.clgRunProtectedCore=()=>new Promise(r=>{release=r});const pending=w.generateRecord();await wait();d.getElementById('nextGoal1').value='도중 변경';release(packet());await pending;assert.equal(d.getElementById('reportContent').textContent,old,name+' stale final');assert(!w.ClgProtectedCore.isCurrent(d.getElementById('reportContent')));
  w.clgRunProtectedCore=async()=>{throw Error('offline')};await w.generateRecord();assert.equal(d.getElementById('reportContent').textContent,old);
  s.close();
 }
 for(const variant of ['SRC_TYPE1','SRC_TYPE2']){
  let received,release;const s=await load(nested('p21',variant),async(op,v)=>{received={op,v};return{text:'특성화고 서버 의견'}});const {w,d}=s;d.getElementById('generateOpinionBtn').click();await wait();assert.equal(d.getElementById('counselorOpinion').value,'특성화고 서버 의견');assert.equal(received.op,'schoolInitial');assert.equal(Object.keys(received.v).length,8);
  w.clgRunProtectedCore=()=>new Promise(r=>{release=r});d.getElementById('generateOpinionBtn').click();await wait();d.getElementById('counselorOpinion').value='수기 보존';d.getElementById('counselorOpinion').dispatchEvent(new w.Event('input',{bubbles:true}));release({text:'늦은 응답'});await wait();assert.equal(d.getElementById('counselorOpinion').value,'수기 보존');s.close();
 }
 {
  let release;const s=await load(page('p16'),async(op,v)=>({amount:20000,eligible:true,after:1,remain:80000,reason:'서버 판정'}));const {w,d}=s;await w.generateParticipation();assert(d.getElementById('participationResult').textContent.includes('20,000원'));assert(d.getElementById('participationResult').textContent.includes('서버 판정'));
  d.getElementById('applicationYear').value='2025';w.applyYearRule();d.getElementById('days').value='10';await w.calculateAmount();assert.equal(d.getElementById('amount').value,'20,000');w.clgRunProtectedCore=()=>new Promise(r=>{release=r});const pending=w.calculateAmount();await wait();assert.equal(d.getElementById('amount').value,'');d.getElementById('days').value='11';release({amount:180000});await pending;assert.equal(d.getElementById('amount').value,'');s.close();
 }
 {
  const s=await load(page('p34'),async()=>({amount:40000,amountText:'50만원'}));const {w,d}=s;await wait();d.getElementById('build').click();await wait();assert(d.getElementById('output').textContent.includes('40,000원'));assert(w.ClgProtectedCore.isCurrent(d.getElementById('output')));s.close();
 }
 {
  let copied=0,fail=false;const s=await load(page('p23'),async(op)=>{if(fail)throw Error('offline');return op==='schoolCombined'?{text:'학교 통합 서버 의견'}:packet()});const {w,d}=s;w.clgGenerateIapOpinion=async()=> '학교 IAP 서버 의견';d.execCommand=()=>{copied++;return true};
  async function fillFrame(id,html){const iw=d.getElementById(id).contentWindow;const cd=iw.document;cd.open();cd.write(html);cd.close();await wait();iw.alert=()=>{};iw.confirm=()=>true;iw.scrollTo=()=>{};iw.TextEncoder=TextEncoder;iw.TextDecoder=TextDecoder;iw.Chart=class{destroy(){}update(){}};iw.HTMLElement.prototype.scrollIntoView=()=>{};iw.eval(helper);for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!m[1].includes('src='))iw.eval(m[2]);cd.dispatchEvent(new iw.Event('DOMContentLoaded'));await wait();return iw;}
  await fillFrame('frameL',nested('p23','SRC_L'));await fillFrame('frameS',nested('p23','SRC_S'));const iap=await fillFrame('frameIap',nested('p23','SRC_IAP'));
  d.getElementById('counselingDate').value='2026-10-18';d.getElementById('iapDateTop').value='2026-10-18';d.getElementById('svcStart').value='2026-10-18';d.getElementById('startTime').value='09:00';d.getElementById('endTime').value='10:00';iap.document.getElementById('wishJob').value='생산직';d.getElementById('buildIntegratedBtn').click();await wait(200);
  const text=d.getElementById('integratedOutput').value;assert(text.includes('학교 통합 서버 의견'),'school integrated opinion');assert(text.includes('서버 해석'),'school waits for psych');assert(!text.includes('[object Promise]'));assert(!text.includes('출력값을 가져오지 못했습니다'));
  fail=true;d.getElementById('copyIntegratedBtn').click();await wait(150);assert.equal(copied,0,'failed regeneration must not copy stale fallback');assert.equal(d.getElementById('integratedOutput').value,text);s.close();
 }
 console.log('PASS: psych L/S and nested copies, async final output, minimal fields, manual opinions, stale edits/outage, school initial copies, allowance pending safety.');
})().catch(e=>{console.error(e);process.exit(1)});
