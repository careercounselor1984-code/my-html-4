'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const chrome=['google-chrome','chromium','chromium-browser'].find(cmd=>cp.spawnSync('which',[cmd],{encoding:'utf8'}).status===0);
assert.ok(chrome,'Chrome not available on runner');
for(const id of ['p01','p02']){
 const m=html.match(new RegExp('"id":"'+id+'","title":"[^"]+","b64":"([^"]+)"'));
 assert.ok(m,'missing '+id);
 const file=path.join(root,'.initial-easy-smoke-'+id+'.html');
 const scenario=String.raw`<script>
window.addEventListener('DOMContentLoaded',function(){
 try{
  const by=id=>document.getElementById(id);
  const set=(id,v)=>{by(id).value=v;by(id).dispatchEvent(new Event('input',{bubbles:true}));by(id).dispatchEvent(new Event('change',{bubbles:true}));};
  const must=(condition,message)=>{if(!condition)throw new Error(message);};
  for(const id of ['totalScore','grade']){const el=by(id),r=el.getBoundingClientRect();must(!el.closest('details')&&r.width>0&&r.height>0,id+' must be visible outside folds');}
  must(by('checkUnifiedGuidance').checked,'guidance default');
  must(document.querySelector('input[name="healthPhysical"]:checked').value==='없음','health default');
  if(document.querySelector('input[name="familySupportStatus"]'))must(document.querySelector('input[name="familySupportStatus"]:checked').value==='대상 아님','family default');
  set('totalScore','80');must(by('grade').value==='높음','grade calculation');
  set('counselorOpinion','상담사가 작성한 의견');
  by('initialWork24Assist').open=true;
  set('strategyTargetJob','치과위생사');set('strategyTiming','6개월 이내');
  const choose=(id,label)=>{const opt=[...by(id).options].find(o=>o.textContent===label);must(!!opt,id+' option '+label);set(id,opt.value);};
  for(const id of ['motivationReasonPreset','motivationEffortPreset','work24SupportPreset','typeReasonPreset'])must(by(id).getBoundingClientRect().width>0,id+' dropdown must be visible');
  choose('motivationReasonPreset','혼자 준비 어려움·단계 지원');choose('motivationEffortPreset','고용24·민간 채용공고 확인');choose('work24SupportPreset','채용정보·취업알선');set('resultType','빠른취업지원형');
  must(by('motivationReason').value.includes('단계적인 지원'),'purpose selection');must(by('motivationEffort').value.includes('고용24'),'effort selection');
  choose('clientStatusPreset','퇴사 후 재취업 · 경력 활용 가능');choose('opinionNeedPreset','구직활동 관련 특이 애로 없음');choose('opinionDirectionPreset','채용정보 제공·취업알선');
  by('opinionPresetBuild').click();must(by('opinionAssistDraft').value.includes('치과위생사')&&by('opinionAssistDraft').value.includes('퇴사 후 재취업'),'opinion dropdown draft');
  if(by('stipendGuide')){must(by('stipendGuide').value.includes('취업·창업·소득 신고'),'stipend guidance restored');must(by('recordOutput').textContent.includes('구직촉진수당 유의사항: 지정일 신청'),'stipend record restored');}
  by('work24Build').click();must(by('work24_motivation').value.includes('- 취업목표 : 치과위생사 (6개월 이내)'),'motivation format');
  must(by('work24_type').value.includes('빠른취업준비형'),'Work24 type name');
  must(by('work24_strategy').value.includes('* 상담목표')&&by('work24_strategy').value.includes('* 상담전략'),'strategy format');
  must(!by('work24_strategy').value.includes('건강·신용'),'no health plan on negative defaults');
  must(by('counselorOpinion').value==='상담사가 작성한 의견','manual opinion must be preserved');
  set('work24_motivation','가'.repeat(501));must(by('work24_motivation_copy').disabled,'1500-byte limit');
  set('strategyTargetJob','간호조무사');must(by('work24_type_copy').disabled,'stale copy guard');
  document.body.dataset.work24BrowserTest='passed';
 }catch(e){document.body.dataset.work24BrowserTest='failed';document.body.dataset.work24BrowserError=e.message;}
});
</script>`;
 fs.writeFileSync(file,Buffer.from(m[1],'base64').toString('utf8').replace('</body>',scenario+'</body>'));
 try{
  const run=cp.spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=4000','--dump-dom','file://'+file],{cwd:root,encoding:'utf8',timeout:40000,maxBuffer:12*1024*1024});
  assert.equal(run.status,0,id+' chrome failed: '+(run.stderr||'').slice(0,400));
  assert.ok(/<body[^>]*class="[^"]*clg-initial-focused/.test(run.stdout),id+' focused form not mounted');
  assert.ok(run.stdout.includes('class="section blue clg-opinion-main"'),id+' opinion section did not mount');
  assert.ok(run.stdout.includes('id="opinionAssistMemo"'),id+' memo missing');
  assert.ok(run.stdout.includes('id="copyRecordBtn"'),id+' copy button missing');
  assert.ok(run.stdout.includes('id="counselorOpinion"'),id+' opinion field missing');
  assert.ok(run.stdout.includes('data-work24-browser-test="passed"'),id+' Work24 browser interaction failed: '+(run.stdout.match(/data-work24-browser-error="([^"]*)/)?.[1]||'no marker'));
 }finally{fs.rmSync(file,{force:true})}
}
console.log('Initial counseling I/II headless Chrome defaults, visible assessment and Work24 interaction tests passed.');
