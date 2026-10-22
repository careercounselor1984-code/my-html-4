'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const bridge=html.match(/<script id="clg-work24-counsel-bridge-v113-script">([\s\S]*?)<\/script>/)[1];
new vm.Script(bridge);
const pages=JSON.parse(html.match(/const PAGES = (\[.*?\]);/s)[1]);
const page=Buffer.from(pages.find(p=>p.id==='p06').b64,'base64').toString();
function harness(){
 const dom=new JSDOM(page,{runScripts:'outside-only',url:'https://example.test/'}),w=dom.window,d=w.document;
 w.scrollTo=()=>{};w.confirm=()=>true;
 for(const script of d.querySelectorAll('script:not([src])'))w.eval(script.textContent);
 const messages=[],sent=[];
 const ctx={Event:w.Event,window:{postMessage:p=>sent.push(p),clgParseAllowanceSupport:require('../work24-allowance-support.js')},MARKER:'test',lastAllowanceSummary:'',
  showMessage:(text,kind)=>messages.push({text,kind}),withTargetPage:(id,ready,cb)=>cb(d,w),
  num:v=>{const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:null;},
  money:v=>String(v),esc:v=>String(v??''),reviewText:()=>''};
 vm.createContext(ctx);
 const input=bridge.slice(bridge.indexOf('  function setInput('),bridge.indexOf('  // Tabs can be reused'));
 const funcs=bridge.slice(bridge.indexOf('  function parseRange('),bridge.indexOf('  function normalizeSuccess('));
 vm.runInContext(input+funcs,ctx);
 return {d,w,messages,sent,ctx,close:()=>w.close()};
}
const supportRow={type:'단기집단상담',program:'마음을 사로잡는 면접',period:'2026-10-14 ~ 2026-10-14',institution:'한국고용정보원'};
const activity={activityType:'입사지원에 필요한 컨설팅 참여',activityName:'입사지원서',activityContent:'이력서 컨설팅',activityPeriod:'2026-10-14 ~ 2026-10-14'};
function payload(support={results:[supportRow]}){return {data:{round:'3',supportStart:'2026-09-22',supportEnd:'2026-10-21',designatedDate:'2026-10-21',employmentSupport:support,activities:[activity],income:{count:0,items:[]},payment:{basicAmount:600000,familyAmount:0,totalRequest:600000}}};}
function run(name,fn){fn();console.log('PASS '+name);}
run('screenshot reproduction: dropped short group counseling recovered from retained result text',()=>{
 const h=harness();const p=payload({results:[],resultCount:0,resultRaw:'취업지원 프로그램 참여 결과 보고 연번 상태 등록구분 구분 프로그램명 참여기간 운영기관명 전화번호 1 인터넷 등록 단기집단상담 마음을 사로잡는 면접 2026. 10. 14. ~ 2026. 10. 14. 한국고용정보원 15771114 1'});
 h.ctx.applyAllowance(p);
 assert.equal(h.d.querySelectorAll('#prog1_list .activity-row').length,1);
 assert.equal(h.d.querySelector('#prog1_list .act-content').value,'집단상담');
 assert.match(h.d.querySelector('#prog1_list .act-detail').value,/마음을 사로잡는 면접/);
 assert.equal(h.d.querySelector('#prog1_list .act-start').value,'2026-10-14');
 assert.equal(h.d.querySelectorAll('#prog2_list .activity-row').length,1);
 assert.equal(h.sent.length,1);assert.equal(h.sent[0].type,'CLEAR_PENDING_ALLOWANCE');
 assert.match(h.ctx.lastAllowanceSummary,/취업지원 1건 \/ 구직활동 1건/);h.close();
});
run('existing structured rows, unknown category detail and repeated apply remain lossless',()=>{
 const h=harness(),p=payload({results:[{...supportRow,type:'새로운프로그램'}]});
 h.ctx.applyAllowance(p);h.ctx.applyAllowance(p);
 assert.equal(h.d.querySelectorAll('#prog1_list .activity-row').length,1);
 assert.equal(h.d.querySelector('#prog1_list .act-content').value,'기타');
 assert.match(h.d.querySelector('#prog1_list .act-detail').value,/새로운프로그램/);h.close();
});
run('unread result text preserves existing input and pending data',()=>{
 const h=harness();h.w.addActivityRow('prog1_list');const original=h.d.querySelector('#prog1_list .activity-row');
 original.querySelector('.act-detail').value='상담사 입력';
 h.ctx.applyAllowance(payload({results:[],resultRaw:'인터넷 등록 단기집단상담 마음을 사로잡는 면접 날짜 미인식'}));
 assert.equal(h.sent.length,0);assert.equal(h.d.querySelector('#prog1_list .activity-row'),original);
 assert.equal(original.querySelector('.act-detail').value,'상담사 입력');assert.match(h.messages.at(-1).text,/보존/);assert.equal(h.d.getElementById('startDate').value,'2026-09-22');assert.equal(h.d.querySelectorAll('#prog2_list .activity-row').length,1);h.close();
});
run('failed row import restores original nodes and handlers and does not acknowledge',()=>{
 const h=harness();h.w.addActivityRow('prog1_list');const original=h.d.querySelector('#prog1_list .activity-row');
 let clicks=0;original.addEventListener('click',()=>clicks++);
 const p=payload();p.data.activities[0]={...activity,activityPeriod:'2026-02-30 ~ 2026-03-01'};
 h.ctx.applyAllowance(p);assert.equal(h.sent.length,0);assert.equal(h.d.querySelector('#prog1_list .activity-row'),original);
 original.click();assert.equal(clicks,1);assert.equal(h.d.querySelectorAll('#prog2_list .activity-row').length,0);h.close();
});
run('raw recovery excludes another round and rejects a partial multirow result',()=>{
 const h=harness();const p=payload({results:[],resultRaw:'인터넷 등록 단기집단상담 과거 회차 2026-08-01 ~ 2026-08-01 고용정보원 052-123-4567 1 인터넷 등록 단기집단상담 현재 회차 2026-10-14 ~ 2026-10-14 고용정보원 052-123-4567 2'});
 assert.equal(h.ctx.allowanceSupport(p.data).rows.length,1);
 p.data.employmentSupport.resultRaw+=' 인터넷 등록 단기집단상담 날짜 없는 두번째 행';
 assert.equal(h.ctx.allowanceSupport(p.data).unread,true);h.ctx.applyAllowance(p);assert.equal(h.sent.length,0);h.close();
});
run('known empty result leaves no fake rows and can complete',()=>{
 const h=harness();h.ctx.applyAllowance(payload({results:[],resultRaw:'등록된 참여 결과가 없습니다.'}));
 assert.equal(h.d.querySelectorAll('#prog1_list .activity-row').length,0);assert.equal(h.sent.length,1);h.close();
});
run('missing target field preserves pending and existing rows',()=>{
 const h=harness();h.d.getElementById('designationDate').remove();h.ctx.applyAllowance(payload());assert.equal(h.sent.length,0);h.close();
});
run('partial extractor output recovers extra categories without duplicating known rows',()=>{
 const h=harness();const p=payload({results:[supportRow],resultRaw:'인터넷 등록 단기집단상담 마음을 사로잡는 면접 2026-10-14 ~ 2026-10-14 한국고용정보원 052-123-4567 1 인터넷 등록 심리안정지원 마음건강 2026-10-15 ~ 2026-10-15 고용센터 052-123-4567 2'});
 h.ctx.applyAllowance(p);assert.equal(h.d.querySelectorAll('#prog1_list .activity-row').length,2);assert.equal(h.sent.length,1);h.close();
});
run('missing income details do not clear pending data or original income rows',()=>{
 const h=harness();h.w.addIncomeRow('deductibleList');const original=h.d.getElementById('deductibleList').firstChild;
 const p=payload();p.data.income={count:1,items:[]};h.ctx.applyAllowance(p);
 assert.equal(h.sent.length,0);assert.equal(h.d.getElementById('deductibleList').firstChild,original);h.close();
});
run('single digit and compact dates parse correctly and invalid dates are rejected',()=>{
 const h=harness();assert.equal(h.ctx.parseRange('2026. 9. 2. ~ 2026. 10. 1.').join(','),'2026-09-02,2026-10-01');
 assert.equal(h.ctx.parseRange('20261014').join(','),'2026-10-14,2026-10-14');assert.equal(h.ctx.parseRange('2026-02-30')[0],'');h.close();
});
run('completion summary remains visible after the extension clears the pending payload',()=>{
 const h=harness();h.ctx.applyAllowance(payload());let subtitle='',details=[];
 Object.assign(h.ctx,{isReadinessPage:()=>false,isIapPage:()=>false,panel:{hidden:true},setCompactMode:()=>{},setTitle:(title,sub)=>subtitle=sub,setDetails:rows=>details=rows,$:()=>({textContent:''})});
 vm.runInContext(bridge.slice(bridge.indexOf('  function showConnectedEmpty('),bridge.indexOf('  function renderBasic(')),h.ctx);
 h.ctx.showConnectedEmpty();assert.match(subtitle,/최근 반영 완료/);assert.equal(details[0][0],'최근 반영');h.close();
});
run('registration omitted: category, program and compact dates still recover',()=>{
 const h=harness();const p=payload({results:[],resultRaw:'취업지원 프로그램 참여 결과 보고 사이버진로교육센터 조회 행삭제 연번 상태 등록구분 구분 프로그램명 참여기간 운영기관명 전화번호 1 단기집단상담 마음을 사로잡는 면접 20261014 ~ 20261014 한국고용정보원 15771114 사이버진로교육센터 조회 행삭제'});
 h.ctx.applyAllowance(p);assert.equal(h.sent.length,1);
 assert.equal(h.d.querySelector('#prog1_list .act-content').value,'집단상담');
 assert.equal(h.d.querySelector('#prog1_list .act-detail').value,'마음을 사로잡는 면접 / 한국고용정보원');h.close();
});
run('joined registration labels and trailing toolbar do not suppress programs',()=>{
 const h=harness();h.ctx.applyAllowance(payload({results:[],resultRaw:'1 인터넷등록 단기취업특강 마음을 사로잡는 면접 2026.10.14 ~ 2026.10.14 한국고용정보원 1577-1114 1 사이버진로교육센터 조회 행삭제'}));
 assert.equal(h.sent.length,1);assert.equal(h.d.querySelector('#prog1_list .act-content').value,'단기취업특강');h.close();
});
run('unrecognized source text is displayed literally while confirmed data is applied without acknowledgment',()=>{
 const h=harness();const p=payload({results:[],resultRaw:'인터넷 등록 <img src=x onerror=alert(1)> 2026-10-14 ~ 2026-10-14'});
 h.ctx.applyAllowance(p);assert.equal(h.sent.length,0);assert.equal(h.d.getElementById('startDate').value,'2026-09-22');
 const details=h.d.getElementById('clgWork24SupportUnread');assert.ok(details);assert.equal(details.querySelector('img'),null);assert.match(details.textContent,/<img/);
 assert.match(h.messages.at(-1).text,/일부 반영/);h.close();
});
run('program names containing header words remain unchanged',()=>{
 const h=harness();h.ctx.applyAllowance(payload({results:[],resultRaw:'인터넷등록 단기집단상담 취업상태와 진로 구분 2026-10-14 ~ 2026-10-14 고용정보원 15771114'}));
 assert.equal(h.d.querySelector('#prog1_list .act-detail').value,'취업상태와 진로 구분 / 고용정보원');h.close();
});
run('support parser loads as a browser script and the main page loads it before the bridge',()=>{
 const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('work24-allowance-support.js','utf8'),sandbox);
 assert.equal(typeof sandbox.window.clgParseAllowanceSupport,'function');
 assert.ok(html.indexOf('src="./work24-allowance-support.js?')<html.indexOf('<script id="clg-work24-counsel-bridge-v113-script">'));
});
