'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const map=fs.readFileSync(path.join(root,'work24-nearby-map.html'),'utf8');
const archive=fs.readFileSync(path.join(root,'job-archive.js'),'utf8');
const extract=(source,a,b)=>{
  const start=source.indexOf(a),end=source.indexOf(b,start);
  assert.ok(start>=0&&end>start,'extract '+a);
  return source.slice(start,end);
};
const clean=(v,n=200)=>String(v||'').trim().slice(0,n);
const scopeCode=fs.readFileSync(path.join(root,'nearby-search-scope.js'),'utf8');
const scopeWindow={};new Function('window',scopeCode)(scopeWindow);
const getAutoRegion=scopeWindow.GoodjobNearbyScope.province;
for(const [q,wanted] of [
  ['울산광역시 북구 호계로 309-20','31000'],['부산 해운대구','26000'],
  ['경상북도 경주시','47000'],['경상남도 양산시','48000'],['경기도 수원시','41000'],
  ['충청북도 청주시','43000'],['충청남도 천안시','44000'],['서울시 서초구','']
])assert.equal(getAutoRegion(q),wanted,'autoselect Work24 region: '+q);
assert.match(map,/id="regionHint"/,'scope explanation visible');
assert.match(map,/type:"GJ_NEARBY_MAP_IMPORT"/,'map sends import request');
assert.match(map,/GJ_NEARBY_MAP_IMPORT_RESULT/,'map receives result feedback');
assert.match(map,/function unverifiedCard\(j\)[\s\S]*?requestImport\(j\)/,'unlocated jobs also importable');
assert.match(map,/function card\(j,idx\)[\s\S]*?requestImport\(j\)/,'located job card importable');
assert.match(map,/function selectJob\(idx\)[\s\S]*?requestImport\(j\)/,'map popup importable');
const part=extract(archive,'let nearbyModal=null,','function closeNearbyMap(){');
const mapped=new Function(part+';return fromNearbyJob;')();
const row={wantedAuthNo:'K123456789012345',title:'생산직 모집',company:'샘플기업',basicAddr:'울산 북구 송내4길 14',detailAddr:'2층',pay:'월급 250만원',closeDate:'2026-12-18'};
const detail={wantedAuthNo:row.wantedAuthNo,title:'생산직 모집',company:'샘플기업',duties:'부품 생산 및 검수',workTime:'09:00~18:00',employmentType:'기간의 정함이 없음',education:'고졸',career:'신입'};
const j=mapped(row,detail);
assert.equal(j.company,'샘플기업');
assert.equal(j.location,'울산 북구 송내4길 14 2층');
assert.equal(j.duties,'부품 생산 및 검수');
assert.equal(j.workHours,'09:00~18:00');
assert.equal(j.salary,'월급 250만원');
assert.ok(j.url.includes('wantedAuthNo='+row.wantedAuthNo));
const fallback=mapped(row,null);
assert.equal(fallback.duties,'미확인','unknown duties should not be fabricated');
assert.equal(fallback.workHours,'미확인','unknown hours should not be fabricated');
assert.ok(archive.includes("panel.loadJob(fromNearbyJob(raw,detail))"),'parent fills existing form');
assert.ok(archive.includes("panels.set(d,{refresh,connectSave,clear,loadJob:load})"),'reuse archive load method');
assert.ok(archive.includes("e.source!==frame.contentWindow"),'source verification');
assert.ok(archive.includes("window.confirm("),'no silent draft overwrite');
assert.ok(archive.includes("await work24NearbyDetail(no)"),'enrich with existing detail API');
assert.ok(!extract(archive,'async function importNearbyPosting(raw,child){','function closeNearbyMap(){').includes('await save('),'import must never auto-save');
console.log('PASS: Work24 map region help, map-to-counseling transport, detail field mapping and overwrite safety');
