'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
const pages=JSON.parse(root.match(/const PAGES = (\[.*?\]);/s)[1]);
function setup(page, bridge){
 const elements=Object.fromEntries(['counselorOpinion','opinionAssistDraft','opinionAssistStatus','applyOpinionPresetBtn','generateOpinionBtn','opinionPresetBuild','clientName','regNo','phone','strategyTargetJob','strategyTiming','clientStatus','healthCreditDetail'].map(id=>[id,{value:'',textContent:'',disabled:false}]));
 Object.assign(elements.strategyTargetJob,{value:'치과위생사'});elements.strategyTiming.value='6개월 이내';elements.clientName.value='private-name';elements.phone.value='private-phone';elements.healthCreditDetail.value='private-health-detail';
 const errors=[];const sandbox={$:id=>elements[id]||null,qa:()=>[],checkedValue:()=>'',autoExpand(){},hasPhysicalWorkConstraint:()=>true,showToast:message=>errors.push(message),window:{parent:bridge?{clgGenerateInitialOpinion:bridge}:{}}};
 const a=page.indexOf('  let opinionRequestId='),b=page.indexOf('  function buildMotivationRecordLines()',a);assert(a>=0&&b>a);
 const f=vm.runInNewContext(page.slice(a,b)+';({buildCounselorOpinion,collectCounselorOpinionInput,cancel(){opinionRequestId++}})',sandbox);
 return {...f,elements,errors};
}
(async()=>{
 for(const id of ['p01','p02']){
  const page=Buffer.from(pages.find(p=>p.id===id).b64,'base64').toString();
  assert(!page.includes('function buildCounselorOpinionLegacy('),'old local generator removed');
  assert(!page.includes('반복된 구직 어려움과 취업 자신감 저하가 확인되어 실행 가능한 과제와 구직활동 점검이 필요함'),'server synthesis rule absent');
  let calls=0;const normal=setup(page,async fields=>{calls++;assert.equal(fields.strategyTargetJob,'치과위생사');assert.equal(fields.strategyTiming,'6개월 이내');assert.equal(fields.physicalWorkConstraint,true);for(const key of ['clientName','regNo','phone','healthCreditDetail','counselorOpinion'])assert(!Object.hasOwn(fields,key));return '서버에서 받은 초안';});
  assert.equal(await normal.buildCounselorOpinion(),'서버에서 받은 초안');assert.equal(normal.elements.counselorOpinion.value,'서버에서 받은 초안');
  normal.elements.counselorOpinion.value='직접 작성';assert.equal(await normal.buildCounselorOpinion(false),'서버에서 받은 초안');assert.equal(normal.elements.counselorOpinion.value,'직접 작성');assert.equal(calls,2);
  const absent=setup(page);assert.equal(await absent.buildCounselorOpinion(),null);assert(absent.errors.length);assert.equal(absent.elements.counselorOpinion.value,'');
  const fail=setup(page,async()=>{throw Error('연결 오류');});fail.elements.counselorOpinion.value='보존할 의견';assert.equal(await fail.buildCounselorOpinion(),null);assert.equal(fail.elements.counselorOpinion.value,'보존할 의견');assert(!fail.elements.generateOpinionBtn.disabled);
  for(const mutation of ['input','manual','draft','reset']){
   let resolve;const s=setup(page,()=>new Promise(r=>{resolve=r;}));s.elements.counselorOpinion.value='원래 의견';
   const pending=s.buildCounselorOpinion(mutation==='draft'?false:true);assert(s.elements.opinionPresetBuild.disabled);assert.equal(await s.buildCounselorOpinion(),null,'duplicate requests blocked');
   if(mutation==='input')s.elements.strategyTargetJob.value='변경 직무';
   if(mutation==='manual')s.elements.counselorOpinion.value='대기 중 수정';
   if(mutation==='draft')s.elements.opinionAssistDraft.value='대기 중 초안 수정';
   if(mutation==='reset')s.cancel();
   resolve('늦게 도착한 초안');assert.equal(await pending,null);assert(!s.elements.opinionPresetBuild.disabled);
   assert.equal(s.elements.counselorOpinion.value,mutation==='manual'?'대기 중 수정':'원래 의견');
   if(mutation==='draft')assert.equal(s.elements.opinionAssistDraft.value,'대기 중 초안 수정');
  }
 }
 console.log('PASS: initial I/II use server results; no direct identifiers/health narrative sent; manual content preserved; stale edits/reset/duplicate/failure guarded; local generator removed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
