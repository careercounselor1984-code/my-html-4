'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function scriptsValid(text,name){
 const scripts=[...text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
   .filter(m=>!/\bsrc\s*=/.test(m[1])&&m[2].trim()&&!/\btype=['"](?:application\/json|importmap)/.test(m[1]));
 scripts.forEach((m,i)=>new vm.Script(m[2],{filename:name+'-inline-'+i+'.js'}));
 return scripts.length;
}
const outerCount=scriptsValid(html,'journal-main');
const marker='const PAGES = ';
const at=html.indexOf(marker);
assert(at>=0);
const end=html.indexOf(';\n',at+marker.length);
assert(end>at);
const pages=JSON.parse(html.slice(at+marker.length,end));
assert(pages.length>=28,'all embedded pages included');
const getPage=id=>{
 const p=pages.find(v=>v.id===id);
 assert(p,'embedded page '+id);
 return Buffer.from(p.b64,'base64').toString('utf8');
};
const iap=getPage('p05'),stipend=getPage('p06'),school=getPage('p23');
const p05Count=scriptsValid(iap,'regular-iap'),p06Count=scriptsValid(stipend,'stipend'),p23Count=scriptsValid(school,'school-iap');
const firstInitial=getPage('p01'),secondInitial=getPage('p02');
for(const [name,page] of [['type1',firstInitial],['type2',secondInitial]]){
  assert(scriptsValid(page,name+'-initial')>=1,name+' initial scripts parse');
  const a=page.indexOf('function buildRecordText()');
  const b=page.indexOf('async function copyText',a);
  assert(a>=0 && b>a,name+' record generator exists');
  const generator=page.slice(a,b);
  assert(!generator.includes('[참여자 종합 프로필]'),name+' full record must not duplicate the profile');
  assert(generator.includes('buildInitialSummary();'),name+' standalone profile preview remains synced');
  assert(generator.includes('recordLengthStatus'),name+' must display output length');
  assert(generator.includes('new TextEncoder().encode(text).length'),name+' UTF-8 byte measurement');
  assert(page.includes('id="copyInitialSummaryBtn"'),name+' standalone profile copying preserved');
  const opinionBlock=page.slice(page.indexOf('function collectCounselorOpinionInput()'),page.indexOf('function buildMotivationRecordLines()'));
  for(const field of ['strategyTiming','strategyTargetJob','strategyTasks','motivationSupports'])assert(opinionBlock.includes(field),name+' server input '+field);
  assert(opinionBlock.includes('window.parent?.clgGenerateInitialOpinion'),name+' authenticated server bridge');
  assert(!page.includes('buildCounselorOpinionLegacy'),name+' obsolete local synthesis removed');
}

function extractPeriodEnd(src){
 const found=src.match(/^  function periodEnd\(dt, months=1\)\{[\s\S]*?^  \}/m);
 assert(found,'periodEnd implemented');
 return found[0].trim();
}
const addDays=(dt,n)=>{const t=new Date(dt);t.setDate(t.getDate()+n);return t};
const p05End=new Function('addDays','return ('+extractPeriodEnd(iap)+')')(addDays);
const p23End=new Function('addDays','return ('+extractPeriodEnd(school)+')')(addDays);
const fmt=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const date=s=>new Date(s+'T12:00:00');
const examples=[
 ['2026-01-31',1,'2026-02-28'],
 ['2028-01-31',1,'2028-02-29'],
 ['2026-03-31',1,'2026-04-30'],
 ['2026-01-15',1,'2026-02-14'],
 ['2028-02-29',12,'2029-02-28']
];
for(const [start,months,want] of examples){
 assert.equal(fmt(p05End(date(start),months)),want,'regular IAP '+start);
 assert.equal(fmt(p23End(date(start),months)),want,'special-school IAP '+start);
}
// Regression: a February end must not pin the next month's end to the 28th.
function iapFunction(name){
  const start=iap.indexOf('  function '+name+'(');
  assert(start>=0,'IAP function '+name+' exists');
  const end=iap.indexOf('\n  }\n',start);
  assert(end>start,'IAP function '+name+' complete');
  return iap.slice(start,end+5);
}
const controls={
  recognitionDate:{value:'2026-10-01'},
  iapDate:{value:'2026-10-28'},
  svcEnd:{value:'2027-10-07'},
  visitStart:{value:'',dataset:{}},
  visitEnd:{value:'',dataset:{}}
};
const {activityCyclePeriod,trainingPeriodDefinitions,getReassessRoundPeriod,refreshVisitPeriod,fmtDate}=new Function('byId',`
 const pad2=v=>String(v).padStart(2,'0');
 const isValidDateStr=s=>/^\\d{4}-\\d{2}-\\d{2}$/.test(s||'');
 ${['parseDate','fmtDate','addDays','periodEnd','iapCyclePeriodFromDate','activityCyclePeriod','trainingPeriodDefinitions','getReassessRoundPeriod','refreshVisitPeriod'].map(iapFunction).join('\n')}
 return {activityCyclePeriod,trainingPeriodDefinitions,getReassessRoundPeriod,refreshVisitPeriod,fmtDate};
`)(id=>controls[id]);
const period=c=>{const p=activityCyclePeriod(c);return [fmtDate(p.start),fmtDate(p.end)];};
assert.deepEqual(period(5),['2027-01-29','2027-02-28']);
assert.deepEqual(period(6),['2027-03-01','2027-03-31']);
assert.deepEqual(period('after6'),['2027-04-01','2027-10-07']);
assert.equal(fmtDate(trainingPeriodDefinitions().find(p=>p.label==='6회차').end),'2027-03-31');
assert.equal(fmtDate(getReassessRoundPeriod(6).end),'2027-03-31');
refreshVisitPeriod();
assert.equal(controls.visitEnd.value,'2027-03-31');
controls.visitEnd.value='2027-03-20'; controls.visitEnd.dataset.touched='1';
refreshVisitPeriod();
assert.equal(controls.visitEnd.value,'2027-03-20','manual reassessment override is retained');
controls.iapDate.value='2027-10-30';
assert.deepEqual(period(5),['2028-02-01','2028-02-29'],'leap February has 29 days');
assert.deepEqual(period(6),['2028-03-01','2028-03-31'],'March follows leap February');
controls.iapDate.value='2026-06-24';
assert.deepEqual(period(4),['2026-08-25','2026-09-24'],'ordinary mid-month cycle unchanged');
assert.deepEqual(period(6),['2026-10-25','2026-11-24'],'ordinary 6th cycle unchanged');
assert(/\$\('visitEnd'\)\.value = fmtDate\(addMonths\(iap,5\)\);/.test(school),'school IAP 6th-cycle endpoint derived from IAP date');
assert(/function oneMonthPeriodEnd\(startValue\)/.test(stipend),'stipend month-end calculation exists');
assert(!/const endDt = addDays\(addMonths\(startDt, 1\), -1\)/.test(iap),'month-end off-by-one copy removed');
console.log('OK: journal scripts',outerCount,'; embedded pages',pages.length,'; p05/p06/p23 scripts',p05Count,p06Count,p23Count,'; month-end cases',examples.length,'; IAP 6th-cycle alignment.');
