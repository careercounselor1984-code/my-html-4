'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../counselor-management/index.html'),'utf8');
const needle="(function(root){'use strict';\nfunction build(snapshots,period,H)";
const start=html.indexOf(needle);
const end=html.indexOf('})(globalThis);',start);
assert.ok(start>=0&&end>start,'manager calculation module must remain discoverable');
const context={};
vm.runInNewContext(html.slice(start,end+'})(globalThis);'.length),context);
const manager=context.CounselorManager;
const eligibleDate='2027-02-01';
const make=(iapNo,stage='취업')=>({physicalRow:6,fields:{iapNo,stage,employedAt:eligibleDate,iapEndedAt:eligibleDate}});
const helpers={
  X:{management:()=>({active:false}),alerts:()=>[]},
  PF:{
    cohort:()=>'current',
    endInfo:f=>({date:f.iapEndedAt}),
    valid:v=>/^\d{4}-\d{2}-\d{2}$/.test(v||''),
    retention:()=>({kind:'tracking'})
  },
  RD:{inspect:()=>({kind:'none'})}
};

test('manager report distinguishes Excel employment entries from eligible internal candidates',()=>{
  const records=[
    make('A12345678901'),
    make(''),
    make('A99999999999'),
    make('A99999999999')
  ];
  const r=manager.build([{owner:'가상상담사',readAt:0,records}],{today:'2027-05-01',start:'2026-11-01',end:'2027-10-31'},helpers);
  assert.equal(r.totals.records,4);
  assert.equal(r.totals.rawEmployed,4);
  assert.equal(r.totals.employed,1);
  assert.equal(r.totals.identity,3);
  assert.equal(r.totals.missingIap,1);
  assert.equal(r.totals.duplicateIap,2);
  assert.equal(r.reports[0].rawEmployed,4);
  assert.equal(r.issues.filter(x=>x.identity).length,3);
});
