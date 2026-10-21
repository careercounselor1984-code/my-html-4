'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const files=['performance-guide-2026.html',...fs.readdirSync('performance-2026').filter(x=>x.endsWith('.html')).map(x=>'performance-2026/'+x)];
assert.equal(files.length,11);
let cards=0;
for(const file of files){
 const html=fs.readFileSync(file,'utf8');
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test/'+file});
 const w=dom.window,d=w.document;
 assert.equal(d.querySelectorAll('h1').length,1,file);
 assert.equal(d.querySelectorAll('nav[aria-label="업무별 페이지"] a').length,11,file);
 assert.equal(d.querySelectorAll('nav a[aria-current="page"]').length,1,file);
 assert.equal(new Set([...d.querySelectorAll('[id]')].map(n=>n.id)).size,d.querySelectorAll('[id]').length,'unique IDs: '+file);
 for(const a of d.querySelectorAll('a[href]')){
  const href=a.getAttribute('href');
  if(/^https?:/.test(href))continue;
  const [rel,id]=href.split('#');const target=path.resolve(path.dirname(file),rel);
  assert(fs.existsSync(target),'missing link '+file+' -> '+href);
  if(id)assert(fs.readFileSync(target,'utf8').includes('id="'+id+'"'),'missing fragment '+href);
 }
 assert(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(html),'no persistent store or transmission');
 const articles=[...d.querySelectorAll('article')];cards+=articles.length;
 assert(articles.every(c=>c.querySelector('.source')),'card sources: '+file);
 const q=d.getElementById('search');q.value='존재하지않는검색문구';q.dispatchEvent(new w.Event('input'));
 assert.equal(d.getElementById('empty').hidden,false,file);
 d.getElementById('clearSearch').click();assert.equal(q.value,'');assert.equal(d.getElementById('empty').hidden,true);
 if(d.body.dataset.topic==='overview'){
  assert.equal(w.guideIndex.length,29);q.value='현장실습';q.dispatchEvent(new w.Event('input'));
  assert(d.querySelectorAll('#globalResults a').length>=2,'global search covers distinct pages');
  assert([...d.querySelectorAll('#globalResults a')].some(a=>a.href.includes('experience.html')));
 }else{
  assert(articles.every(c=>!c.hidden));
  if(articles.length){const term=articles[0].querySelector('h2').textContent;q.value=term;q.dispatchEvent(new w.Event('input'));assert(articles.filter(c=>!c.hidden).length>=1)}
 }
 const checks=[...d.querySelectorAll('#checklist input')];if(checks.length){checks.forEach(c=>c.checked=true);d.getElementById('reset').click();assert(checks.every(c=>!c.checked))}
 const details=[...d.querySelectorAll('details')];if(details.length)details[0].open=true;const states=details.map(x=>x.open);
 w.dispatchEvent(new w.Event('beforeprint'));assert(details.every(x=>x.open));w.dispatchEvent(new w.Event('afterprint'));assert.deepEqual(details.map(x=>x.open),states);
 let printed=false;w.print=()=>printed=true;d.getElementById('print').click();assert(printed);
 assert(html.includes('article[hidden]{display:block!important}'),'print whole current page despite search');
 dom.window.close();
}
assert.equal(cards,29);
const employment=fs.readFileSync('performance-2026/employment.html','utf8');
assert(employment.includes('주 15시간 미만')&&employment.includes('월 소득 250만원 이상')&&employment.includes('인쇄 104~106쪽 / PDF 112~114쪽'));
const experience=fs.readFileSync('performance-2026/experience.html','utf8');assert(experience.includes('현장실습')&&experience.includes('가점에서 제외'));
const sources=fs.readFileSync('performance-2026/sources.html','utf8');assert(sources.includes('2026.10.14.')&&sources.includes('수당 지급기간의 첫 날')&&sources.includes('실시간 법령 API 자동연동'));
const shell=fs.readFileSync('index.html','utf8');const registration=shell.match(/<script id="clg-evaluation-guide-registration">([\s\S]*?)<\/script>/)[1];
assert(shell.indexOf('id="clgEvaluationGuideBtn"')<shell.indexOf('id="boardOpenBtn"'),'evaluation is left of board');
assert(/class="topBtn evaluationTopBtn" id="clgEvaluationGuideBtn"/.test(shell),'guide is in top toolbar');
const ctx={PAGES:[],MENU:[],renderMenu:()=>{}};vm.createContext(ctx);vm.runInContext(registration,ctx);vm.runInContext(registration,ctx);
assert.equal(ctx.PAGES.length,11);assert.equal(ctx.MENU.length,1);assert.equal(ctx.MENU[0].items.length,11);
for(const p of ctx.PAGES)assert(fs.existsSync(p.url.split('?')[0]),p.url);
assert(shell.indexOf('id="clg-evaluation-guide-registration"')<shell.indexOf('id="clg-multi-work-tabs-v1-script"'));
console.log('PASS: 11 independent pages, 29 source-backed cards, local/global search, links/fragments, print, transient checklist and idempotent work-tab registration');
