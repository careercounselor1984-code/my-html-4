const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const outer=fs.readFileSync('index.html','utf8'),html=Buffer.from(outer.match(/"id":"p05","title":"[^"]+","b64":"([^"]+)"/)[1],'base64').toString();
const wait=()=>new Promise(r=>setTimeout(r,10));
(async()=>{
 const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,alerts=[];
 w.alert=x=>alerts.push(x);w.confirm=()=>true;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.TextEncoder=TextEncoder;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 await wait();for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('src='))w.eval(m[2]);d.dispatchEvent(new w.Event('DOMContentLoaded'));await wait();
 let calls=0,release,received;
 w.clgGenerateIapOpinion=async f=>{calls++;received=f;return '서버 강점\n서버 보완\n서버 방향'};
 const el=id=>d.getElementById(id),click=id=>el(id).click();
 el('wishJob').value='생산직';el('iapRegNo').value='개인 이름';
 click('applyIapOpinionBtn');await wait();assert.equal(el('counselNote').value,'서버 강점\n서버 보완\n서버 방향');assert.equal(calls,1);
 assert.deepEqual(Object.keys(received).sort(),['wishJob','hasMethods','career','area','wtime','strength','need','direction'].sort());assert(!JSON.stringify(received).includes('개인 이름'));
 w.clgGenerateIapOpinion=f=>{received=f;return new Promise(r=>{release=r})};click('applyIapOpinionBtn');assert(el('btnBuild').disabled);assert(el('applyIapOpinionBtn').disabled);
 el('counselNote').value='직접 작성';el('counselNote').dispatchEvent(new w.Event('input',{bubbles:true}));release('늦은 결과');await wait();assert.equal(el('counselNote').value,'직접 작성');assert(!el('btnBuild').disabled);
 click('applyIapOpinionBtn');el('wishJob').value='바뀐 직종';release('이전 직종 결과');await wait();assert.equal(el('counselNote').value,'직접 작성','programmatic changes also cancel old result');
 w.clgGenerateIapOpinion=async()=>{throw Error('인터넷 연결 오류')};click('applyIapOpinionBtn');await wait();assert.equal(el('counselNote').value,'직접 작성');assert(alerts.pop().includes('연결 오류'));assert(!el('applyIapOpinionBtn').disabled);
 // Final record still accepts manual opinions offline, and awaits automatic opinion if blank.
 for(const [id,value] of Object.entries({iapDate:'2026-10-15',startTime:'09:00',endTime:'10:00',svcStart:'2026-10-15',svcEnd:'2027-10-14'}))el(id).value=value;
 click('btnBuild');await wait();assert(el('output').textContent.includes('직접 작성'),'manual opinion produces existing record without server');
 el('counselNote').value='';w.clgGenerateIapOpinion=async()=> '자동 IAP 의견';click('btnBuild');await wait();assert(el('output').textContent.includes('자동 IAP 의견'));assert(!el('output').textContent.includes('[object Promise]'));
 el('counselNote').value='';const previous=el('output').textContent;w.clgGenerateIapOpinion=()=>new Promise(r=>{release=r});click('btnBuild');el('wishJob').value='다시 변경';release('무효 의견');await wait();assert.equal(el('output').textContent,previous,'changed inputs prevent stale final record');
 delete w.clgGenerateIapOpinion;click('applyIapOpinionBtn');await wait();assert(alerts.pop().includes('로그인'));assert.equal(el('counselNote').value,'');
 assert(!html.includes("if(career && career !== '무' && career !== '없음') strength="));
 w.close();console.log('PASS: IAP actual DOM, minimal fields, async final record, manual text, stale edits, failures, missing auth and button recovery.');
})().catch(e=>{console.error(e);process.exit(1)});
