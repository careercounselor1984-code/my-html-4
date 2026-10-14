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
 const x=page.indexOf('function buildCounselorOpinion(){'),y=page.indexOf('function buildCounselorOpinionLegacy(){',x);
 const vals={strategyTargetJob:'자동차 생산',strategyTiming:'6개월 이내',clientStatus:'채용공고 탐색 중',motivationReason:'취업지원서비스를 활용해 취업 준비하고자 신청함',motivationEffort:'희망직무 관련 공고에 입사지원한 경험이 있음',mainDifficulty:'반복 구직 실패로 취업 자신감 저하',strategyStrength:'자동차 관련 현장경험',resultType:'의욕향상지원형',healthCreditDetail:health};
 const els=Object.fromEntries(Object.entries(vals).map(([k,v])=>[k,{value:v}]));els.counselorOpinion={value:''};
 const selected={'input[name="strategyTask"]:checked':[{value:'goal'},{value:'matching'},{value:'documents'}]};
 const opinion=vm.runInNewContext(page.slice(x,y)+'\nbuildCounselorOpinion()',{$:id=>els[id]||null,qa:s=>selected[s]||[],checkedValue:()=>'',autoExpand:()=>{},hasPhysicalWorkConstraint:fn.hasPhysicalWorkConstraint});
 assert.ok(opinion.includes('자동차 생산')&&opinion.includes('6개월 이내'));
 assert.ok(opinion.indexOf('참여 배경')>0&&opinion.indexOf('취업 준비상 애로')>opinion.indexOf('참여 배경'));
 assert.ok(opinion.indexOf('향후')>opinion.indexOf('취업 준비상 애로'));
 assert.ok(opinion.includes('반복된 구직 어려움과 취업 자신감 저하'));
 assert.ok(opinion.includes('직무목표 구체화, 채용정보·알선, 입사지원서 보완'));
 assert.ok(!opinion.includes('진술함'));assert.ok(Buffer.byteLength(opinion,'utf8')<1500);
}
console.log('Initial counseling brief output and narrative tests passed.');
