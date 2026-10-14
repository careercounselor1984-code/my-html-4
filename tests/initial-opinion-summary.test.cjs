'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
function execute(pageId,data={},selected={}){
  const m=root.match(new RegExp('"id":"'+pageId+'","title":"[^"]+","b64":"([^"]+)"'));
  assert.ok(m,'page missing '+pageId);
  const page=Buffer.from(m[1],'base64').toString('utf8');
  const from=page.indexOf('function buildCounselorOpinion(){');
  const to=page.indexOf('function buildCounselorOpinionLegacy(){',from);
  assert.ok(from>=0 && to>from,'opinion code missing');
  const elements={...Object.fromEntries(Object.entries(data).map(([key,value])=>[key,{value}])),counselorOpinion:{value:''}};
  const sandbox={
    $:id=>elements[id]||null,
    checkedValue:(name,fallback)=>selected[name]||fallback,
    qa:selector=>selected[selector]||[],
    autoExpand:()=>{}
  };
  const result=vm.runInNewContext(page.slice(from,to)+'\n buildCounselorOpinion()',sandbox);
  assert.equal(result,elements.counselorOpinion.value);
  return {result,page};
}
const sample={
  strategyTargetJob:'자동차 생산',
  strategyTiming:'6개월 이내',
  motivationReason:'희망직무가 명확하지 않아 상담을 통해 취업방향을 구체화하고자 신청함',
  motivationEffort:'희망직무 관련 채용공고에 입사지원한 경험이 있음',
  mainDifficulty:'반복적인 구직 실패로 취업 자신감이 저하됨',
  clientStatus:'적극적인 구직활동을 희망함',
  strategyStrength:'자동차 관련 현장경험',
};
const selected={
 'input[name="strategyTask"]:checked':[{value:'goal'},{value:'matching'},{value:'documents'}],
 resultType:'의욕향상지원형'
};
for(const id of ['p01','p02']){
  const {result,page}=execute(id,{...sample,resultType:'의욕향상지원형'},selected);
  assert.ok(result.includes('자동차 생산'),id+' goal');
  assert.ok(result.includes('6개월 이내'),id+' target time');
  assert.ok(result.includes('반복된 구직 어려움과 취업 자신감 저하'),id+' specific obstacle');
  assert.ok(result.includes('입사지원한 경험'),id+' actual job search');
  assert.ok(result.includes('자동차 관련 현장경험'),id+' strength');
  assert.ok(result.includes('직무목표 구체화, 채용정보·알선, 입사지원서 보완'),id+' priority tasks');
  assert.ok(Buffer.byteLength(result,'utf8')<1300,id+' opinion too verbose');
  assert.ok(!result.includes('상담사 종합의견:'),id+' summary duplication');
  assert.ok(page.includes("if(!$('counselorOpinion').value.trim()) buildCounselorOpinion()"),id+' manual opinion overwritten on copy');
  assert.ok(page.includes('recordLengthStatus'),id+' 4,000 byte status missing');
  const empty=execute(id,{},{}).result;
  assert.ok(!empty.includes('희망직무로 확인됨'),id+' invented goal');
  const basic=execute(id,{strategyTargetJob:'사회복지사',strategyTiming:'졸업 후 바로',mainDifficulty:'이력서 작성 어려움',strategyStrength:'관련 전공'},{}).result;
  assert.ok(basic.includes('구직기술 보완'),id+' document support');
  assert.ok(basic.includes('관련 전공'),id+' academic strength');
}
console.log('Initial opinion synthesis checks passed for types I and II');
