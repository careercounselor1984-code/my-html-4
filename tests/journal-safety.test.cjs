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
assert(/const sixthDesignated = addMonths\(iap,5\);/.test(iap),'regular IAP 6th-cycle endpoint derived from IAP date');
assert(/\$\('visitEnd'\)\.value = fmtDate\(addMonths\(iap,5\)\);/.test(school),'school IAP 6th-cycle endpoint derived from IAP date');
assert(/function oneMonthPeriodEnd\(startValue\)/.test(stipend),'stipend month-end calculation exists');
assert(!/const endDt = addDays\(addMonths\(startDt, 1\), -1\)/.test(iap),'month-end off-by-one copy removed');
console.log('OK: journal scripts',outerCount,'; embedded pages',pages.length,'; p05/p06/p23 scripts',p05Count,p06Count,p23Count,'; month-end cases',examples.length,'; IAP 6th-cycle alignment.');
