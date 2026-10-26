'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const outer=fs.readFileSync('index.html','utf8');
const b64=outer.match(/"id":"p05","title":"[^"]+","b64":"([^"]+)"/)[1];
const html=Buffer.from(b64,'base64').toString('utf8');
function source(name){const start=html.indexOf('  function '+name+'(');assert(start>=0,name);const end=html.indexOf('\n  }',start);assert(end>start,name);return html.slice(start,end+4);}
const date=s=>s?new Date(s+'T00:00:00Z'):null;
const fmtDate=d=>d.toISOString().slice(0,10);
const addDays=(d,n)=>new Date(d.getTime()+n*86400000);
const addMonths=(d,n)=>{const r=new Date(d);r.setUTCMonth(r.getUTCMonth()+n);return r;};
function row(s,e,extra={}){return {idx:1,kind:'입사지원',detail:'',s,e,sd:date(s),ed:date(e),cnt:2,...extra};}
function audit({type='2',iap='2026-10-26',jobs=[],acts=[row('2026-10-27','2027-09-17')]}={}){
 const nodes=Object.fromEntries(Object.entries({recognitionDate:'2026-09-18',iapDate:iap,svcStart:'2026-09-18',svcEnd:'2027-09-17',visitStart:'2026-12-27',visitEnd:'2027-03-26'}).map(([k,value])=>[k,{value}]));
 nodes.iapAuditList={innerHTML:''};nodes.iapAuditSummary={innerHTML:''};
 const context={Date,Map,Set,Number,byId:id=>nodes[id],document:{querySelector:()=>({value:type})},parseDate:date,fmtDate,addDays,addMonths,periodEnd:(s,n)=>addDays(addMonths(s,n),-1),iapAuditRows:id=>id==='job_tbody'?jobs:acts,trainingPeriodDefinitions:()=>[],trainingIntersect:(s,e,a,b)=>s<=b&&e>=a,trainingUnitCountForRange:()=>1,iapRequiredCount:()=>2,iapAuditDays:(a,b)=>(b-a)/86400000,iapAuditWithin:(s,e,a,b)=>s>=a&&e<=b,iapAuditOneMonth:(s,e)=>fmtDate(addDays(addMonths(s,1),-1))===fmtDate(e)};
 vm.createContext(context);
 vm.runInContext(['iapAuditStatusLabel','iapAuditEsc','iapAuditType2Segments','iapRunAudit'].map(source).join('\n')+'\niapRunAudit();',context);
 return nodes.iapAuditList.innerHTML;
}
for(const type of ['1','2']){
 const normal=audit({type});
 assert(!normal.includes('취업지원프로그램 계획'),'optional empty programs do not produce a visible alert, type '+type);
 assert(!normal.includes('계획 시작구간'),'IAP next-day start is normal, type '+type);
 const delayed=audit({type,acts:[row('2026-10-29','2027-09-17')]});
 assert(delayed.includes('계획 시작구간')&&delayed.includes('IAP 수립일 다음 날(2026-10-27)'),'genuine gap uses IAP next day, type '+type);
 assert(audit({type,jobs:[row('2026-11-02','2026-11-01',{kind:'집단상담',name:''})]}).includes('취업지원프로그램 날짜'),'entered programs still validate reversed dates');
 assert(audit({type,acts:[]}).includes('구직활동지원 계획'),'missing activity plans still require attention');
 assert(audit({type,acts:[row('2026-10-27','2027-08-01')]}).includes('1년 계획 범위'),'missing final plan coverage still requires attention');
}
const missing=audit({iap:''});
assert(missing.includes('인정일 · IAP 수립일'));
assert(!missing.includes('계획 시작구간'),'missing IAP does not fall back to service start');
console.log('PASS: optional programs and IAP next-day starts are normal for both types; actual gaps, invalid dates and missing plans remain visible');
