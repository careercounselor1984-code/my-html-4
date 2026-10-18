'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
const root=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
for(const id of ['p01','p02']){
 const m=root.match(new RegExp('"id":"'+id+'","title":"[^"]+","b64":"([^"]+)"'));assert.ok(m);
 const page=Buffer.from(m[1],'base64').toString('utf8');
 const a=page.indexOf('function compactInitialFact('),b=page.indexOf('function buildRecordText(){',a);
 const fn=vm.runInNewContext(page.slice(a,b)+'\n({compactInitialFact,hasPhysicalWorkConstraint})');
 const health='신체적 부담이 큰 작업 수행에 어려움이 있다고 진술하여 희망직무의 작업환경 확인이 필요함. / 상담에서 확인한 범위에서는 구직활동에 영향을 미치는 신용 관련 제약이 없다고 진술함.';
 assert.ok(fn.compactInitialFact(health,'health',true).includes('작업환경 확인 필요'));
 assert.ok(!fn.compactInitialFact(health,'health',true).includes('진술'));
 assert.ok(!fn.compactInitialFact(health,'health',true).includes('신용'));
 assert.equal(fn.compactInitialFact('상담을 통해 확인한 결과 현재 구직활동에 영향을 미치는 구체적인 취업 애로요인은 없는 것으로 확인됨.','difficulty'),'구직활동 관련 특이 애로 없음');
 assert.ok(page.includes('const physicalCheck=')&&page.includes('const shortDifficulty='));
 assert.ok(page.includes('recordLengthStatus'));
 assert.ok(page.includes("if(!$('counselorOpinion').value.trim()){showToast('상담사 의견을 작성한 뒤 복사해 주세요.')"));

}
console.log('Initial counseling brief fact output tests passed.');
