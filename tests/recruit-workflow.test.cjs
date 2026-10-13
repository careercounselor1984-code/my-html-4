'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require(process.env.GOODJOB_JSDOM||'jsdom');
const outer=fs.readFileSync('index.html','utf8');const pages=JSON.parse(outer.match(/const PAGES = (\[.*?\]);/s)[1]);const html=Buffer.from(pages.find(p=>p.id==='p35').b64,'base64').toString();
for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
const errors=[],alerts=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const d=new JSDOM(html,{url:'https://test.invalid/',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.structuredClone=structuredClone;w.alert=s=>alerts.push(s);w.confirm=()=>true;}}),w=d.window,$=id=>w.document.getElementById(id),ev=s=>w.eval(s);
assert.deepEqual(errors,[],'Initial render errors');
ev(`state.recruits=[
{id:'old',name:'이전유입',branch:'북부',source:'인스타',sourceDetail:'인스타그램',registeredAt:'2026-09-01',status:'배정',allocatedAt:'2026-10-03',activityId:'act',memo:'보존',phone:'01011112222'},
{id:'new',name:'이번유입',branch:'북부',source:'인스타그램',registeredAt:'2026-10-01',status:'신청예정',activityId:'act'},
{id:'new2',name:'두번째',branch:'북부',source:'SNS',registeredAt:'2026-10-02',status:'배정',allocatedAt:'2026-10-05',activityId:'act'},
{id:'other',name:'타지사',branch:'서부',source:'SNS',registeredAt:'2026-10-02',status:'배정',allocatedAt:'2026-10-05',activityId:'act'}];
state.activities=[{id:'act',branch:'북부',institution:'테스트학교',date:'2026-09-01',activityType:'설명회',status:'완료',participants:30,applications:99,recognized:99,allocated:99,metricsMode:'linked'},
{id:'manual',branch:'북부',institution:'기존수기',date:'2026-10-01',activityType:'설명회',status:'완료',participants:20,applications:8,recognized:5,allocated:3}];
state.contacts=[];document.getElementById('branchSel').value='북부';renderAll();`);
assert.equal(ev("normalizeActivity(state.activities[0]).applications"),2,'linked list is same-branch and includes later outcomes');
assert.equal(ev("normalizeActivity(state.activities[0]).allocated"),2);
assert.equal(ev("state.activities[0].applications"),99,'manual source values not overwritten');
assert.equal(ev("normalizeActivity(state.activities[1]).applications"),8,'legacy manual preserved');
$('reportDate').value='2026-10-10';$('reportType').value='month';
assert.equal(ev("reportData('북부','전체','month').src[0].total"),2);
assert.equal(ev("reportData('북부','전체','month').src[0].achieved"),1,'report denominator includes unconverted new entrants');
$('analysisDate').value='2026-10-10';$('periodSel').value='month';w.renderAnalysis();assert.match($('analysisCards').textContent,/50%/);assert.doesNotMatch($('analysisCards').textContent,/100%.*해당 기간 유입/);
$('marketingType').value='month';$('marketingDate').value='2026-10-10';w.renderMarketing();assert.match($('sourceTable').textContent,/50%/);
$('marketingDimension').value='activity';w.renderMarketing();assert.match($('sourceTable').textContent,/테스트학교/);
$('marketingDimension').value='method';w.renderMarketing();assert.match($('sourceTable').textContent,/설명회/);
$('marketingDimension').value='institution';w.renderMarketing();assert.match($('sourceTable').textContent,/테스트학교/);
w.openRecruit('old');assert.equal($('f_source').value,'인스타');assert.equal($('f_activityId').value,'act');$('saveRecruit').click();assert.equal(ev("state.recruits.find(r=>r.id==='old').source"),'인스타');assert.equal(ev("state.recruits.find(r=>r.id==='old').memo"),'보존');assert.equal(ev("state.recruits.find(r=>r.id==='old').activityId"),'act');assert.equal(ev('state.recruits.length'),4);
w.openRecruit();$('f_name').value='새명단';$('f_source').value='대학교·학교';$('f_activityId').value='act';$('f_activityId').dispatchEvent(new w.Event('change'));$('saveRecruit').click();assert.equal(ev('state.recruits.at(-1).activityId'),'act');assert.equal(ev('state.recruits.at(-1).sourceDetail'),'테스트학교');
w.openActivity('act');assert.equal($('f_ametrics').value,'linked');$('saveActivity').click();assert.equal(ev('state.activities[0].applications'),99);assert.equal(ev('normalizeActivity(state.activities[0]).applications'),2);
w.openActivity();$('f_ainst').value='신규활동';$('saveActivity').click();assert.equal(ev('state.activities.at(-1).metricsMode'),'linked');
$('roleSel').value='지사팀장';$('branchSel').value='북부';w.applyRole();w.renderAll();assert.doesNotMatch($('branchRiskTable').textContent,/서부/);assert.doesNotMatch($('sourceBranchTable').textContent,/서부/);
assert.equal(w.document.querySelectorAll('.side>.navbtn').length,4);
for(const page of ['home','followups','recruits','sync','outreach','api','marketing','analysis','report','reportinput'])w.gotoPage(page);
w.simpleLinkActivity('act');assert.equal($('linkRoster').textContent.includes('타지사'),false);const check=$('linkRoster').querySelector('[data-link-id=old]');check.checked=false;check.dispatchEvent(new w.Event('change',{bubbles:true}));$('linkSave').click();assert.equal(ev("state.recruits.find(r=>r.id==='old').activityId"),'');assert.equal(ev('state.recruits.length'),5);assert.equal(ev('normalizeActivity(state.activities[0]).allocated'),1);
ev("state.recruits.find(r=>r.id==='old').status='온라인배정'");w.openRecruit('old');assert.equal($('f_status').value,'온라인배정');$('saveRecruit').click();assert.equal(ev("state.recruits.find(r=>r.id==='old').status"),'온라인배정');
$('roleSel').value='부장';w.applyRole();assert.equal(w.document.querySelector('[data-page=outreach]').style.display,'none');
assert.deepEqual(errors,[]);assert.deepEqual(alerts,[]);d.window.close();
console.log('PASS: cohort rates, cross-month linked counts, legacy preservation, forms, four menus, branch scope, all work areas');
