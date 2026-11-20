'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const file=path.join(__dirname,'../counselor-management/formula-audit.js');
const js=fs.readFileSync(file,'utf8');
const sandbox={module:{exports:{}},globalThis:null,TextEncoder,TextDecoder};
sandbox.globalThis=sandbox;
vm.runInNewContext(js,sandbox);
const A=sandbox.module.exports;

test('browser-safe module is syntactically valid and exposes pure formula helpers',()=>{
  assert.equal(typeof A.audit,'function');
  assert.equal(typeof A.createCorrectedCopy,'function');
  assert.equal(typeof A.shift,'function');
});
test('row relative and absolute references preserve anchors and quoted sheet names',()=>{
  assert.equal(A.shift("SUM(B10,$C10,D$5,$E$2,'2026 평가기준'!F10,\"A10\")",2),
    "SUM(B12,$C12,D$5,$E$2,'2026 평가기준'!F12,\"A10\")");
  assert.equal(A.shift('SUM(A1:A2)',-1),null);
});
test('adjacent identical formula patterns yield one review proposal',()=>{
  const prev={row:10,formula:'SUM(G10:H10)'},next={row:12,formula:'SUM(G12:H12)'};
  assert.equal(A.guess(prev,next,11),'SUM(G11:H11)');
  assert.equal(A.guess(prev,{row:12,formula:'SUM(G12:H13)'},11),null);
  assert.equal(A.guess(prev,{row:15,formula:'SUM(G15:H15)'},11),null);
  assert.equal(A.guess({row:10,formula:'INDIRECT("A10")'},next,11),null);
});
test('external, volatile and broken expressions never become automated proposals',()=>{
  for(const f of ['[other.xlsx]Sheet1!A1','INDIRECT("B2")','#REF!','WEBSERVICE("https://a")']){
    assert.equal(A.safeFormula(f),false);
  }
});
function cell(col,row,formula,opts={}){
 const c={children:formula?[{localName:'f'}]:[],getElementsByTagNameNS:()=>[]};
 return {address:col+row,row,col,formula,formulaNode:formula?{attributes:[]}:null,cell:c,cache:opts.cache||'',type:opts.type||''};
}
test('auditor flags missing formulas, #REF errors and preserves non-repairable errors',()=>{
 const cells=new Map();
 for(const c of [
   cell('B',10,'SUM(C10:D10)'),cell('B',12,'SUM(C12:D12)'),
   cell('E',10,'SUM(F10:G10)'),cell('E',11,'SUM(#REF!)'),cell('E',12,'SUM(F12:G12)'),
   cell('H',18,'DIVIDE(0,0)',{type:'e',cache:'#DIV/0!'})
 ])cells.set(c.address,c);
 const sheet={name:'진행통계',path:'xl/worksheets/sheet6.xml',cells,rows:new Map([[11,{}]]),protected:false,merges:[]};
 const result=A.audit({sheets:[sheet],totalFormulas:6,externalLinks:1});
 const missing=result.issues.find(i=>i.address==='B11'&&i.kind==='missing');
 const reference=result.issues.find(i=>i.address==='E11'&&i.kind==='reference');
 assert.equal(missing.after,'SUM(C11:D11)');
 assert.equal(reference.after,'SUM(F11:G11)');
 assert.equal(result.counts.cache,1);
 assert.equal(result.counts.external,1);
});
test('protected sheets do not get formula fix proposals',()=>{
 const cells=new Map([['B10',cell('B',10,'SUM(C10:D10)')],['B12',cell('B',12,'SUM(C12:D12)')]]);
 const report=A.audit({sheets:[{name:'평가통계',path:'xl/worksheets/sheet7.xml',cells,rows:new Map([[11,{}]]),protected:true,merges:[]}],totalFormulas:2,externalLinks:0});
 assert.equal(report.counts.repairable,0);
});
test('inline application embeds the auditor only through an authorized in-page panel',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../counselor-management/index.html'),'utf8');
 for(const marker of ['id="formulaAuditFile"','id="formulaAuditApprove"','id="formulaAuditSave"','window.CounselorFormulaAudit?.mount();','shellAuditButton.onclick','archive,inflate,rebuild}']){
  assert.ok(html.includes(marker),marker);
 }
});
