/* Work24 initial counseling: three editable, independently copyable fields (1,500Byte each). */
(function(){
'use strict';
if(window.__initialWork24AssistLoaded)return;
window.__initialWork24AssistLoaded=true;
const by=id=>document.getElementById(id);
const clean=s=>String(s||'').replace(/^\s*[-•*]\s*/,'').replace(/\s+/g,' ').trim();
const val=id=>clean(by(id)?.value);
const typeNames={'빠른취업지원형':'빠른취업준비형'};
const supportLabels={direction:'희망직무·취업방향 설정',matching:'채용정보·취업알선',documents:'이력서·자기소개서 보완',interview:'면접 준비',skills:'자격·훈련·일경험',conditions:'근무조건 조정',welfare:'복지·금융 연계'};
function data(){
 const selected=[...document.querySelectorAll('input[name="motivationSupport"]:checked')].map(e=>supportLabels[e.value]).filter(Boolean);
 const type=val('resultType')||document.querySelector('input[name="type2"]:checked')?.value||'';
 return {reason:val('motivationReason'),effort:val('motivationEffort'),support:val('work24ExpectedSupport')||selected.join(', '),job:val('strategyTargetJob'),timing:val('strategyTiming'),type:typeNames[type]||type,ground:val('typeReasonText'),extra:val('strategyExtra'),health:['healthPhysical','healthMental','creditIssue'].some(n=>document.querySelector('input[name="'+n+'"]:checked')?.value==='있음')};
}
function drafts(d){
 const motivation=[`- 참여목적 : ${d.reason||'-'}`,`- 현재까지의 취업준비 노력 : ${d.effort||'-'}`,`- 기대하는 지원 : ${d.support||'-'}`,`- 취업목표 : ${d.job||'-'}${d.timing?' ('+d.timing+')':''}`].join('\n');
 const type=[`- 2차 유형분류 : ${d.type||'-'}`,`- 유형분류 및 근거 : ${d.ground||'-'}`].join('\n');
 const targets={
  '1개월 이내':'1개월 이내 입사지원과 취업연계를 추진하고자 함.',
  '3개월 이내':'3개월 이내 필요한 준비를 보완하고 입사지원을 추진하고자 함.',
  '6개월 이내':'6개월 이내 필요한 준비를 마치고 취업연계로 이어가고자 함.',
  '졸업 후 바로':'졸업 후 바로 취업으로 연계하고자 함.',
  '훈련·자격 준비 후':'필요한 훈련과 자격 준비 후 취업으로 연계하고자 함.'
 };
 const goal=d.job?`- ${d.job} 취업을 목표로 하며, ${targets[d.timing]||(d.timing?d.timing+' 취업연계를 추진하고자 함.':'입사지원과 취업연계를 추진하고자 함.')}`:'- 희망직무 입력 필요';
 const strategy=['* 상담목표',goal];
 if(d.type)strategy.push(`- ${d.type} 특성을 고려하여 확인한 지원과제를 추진하고자 함.`);
 strategy.push('','* 상담전략',d.support&&d.job?`- ${d.job} 취업을 위해 ${d.support} 등을 중심으로 지원할 예정임.`:'- 희망직무와 기대하는 지원 입력 필요');
 if(d.health)strategy.push('- 확인된 건강·신용 관련 제약을 고려하여 직무와 근무조건 검토를 병행할 예정임.');
 if(d.extra)strategy.push('- 추가 지원계획 : '+d.extra);
 strategy.push('- 상담 과정에서 구직활동을 점검하고 필요 시 지원계획을 조정할 예정임.');
 return {motivation,type,strategy:strategy.join('\n')};
}
function create(){
 const opinionSection=document.querySelector('.clg-opinion-main');if(!opinionSection||by('initialWork24Assist'))return;
 const box=document.createElement('details');box.id='initialWork24Assist';box.className='section clg-work24-assist';
 box.innerHTML='<summary>전산 입력 문구 · 참여동기 / 유형분류 / 상담목표·전략</summary><p class="small">문구를 드롭다운에서 고르면 전산의 세 칸을 각각 작성합니다. 초안을 수정한 뒤 필요한 칸만 복사하세요. 각 칸 1,500Byte 제한입니다.</p><div class="grid" id="work24SourceFields"></div><div class="actions"><button type="button" class="btn primary" id="work24Build">전산 문구 만들기</button><span class="small" id="work24BuildStatus" role="status"></span></div><div class="clg-work24-outputs" id="work24Outputs" hidden></div>';
 opinionSection.insertAdjacentElement('afterend',box);
 const fields=by('work24SourceFields');
 // Reuse the existing real selectors and their event handlers; no mirrored duplicate fields.
 const purposeLabels=['취업방향 설정','채용정보·알선 필요','경력 공백 후 재취업','직무전환 준비','서류·면접 도움','자격·직무역량 보완','개인 여건에 맞는 일자리','탈락 원인 점검','생계 안정','혼자 준비 어려움·단계 지원'];
 const effortLabels=['고용24·민간 채용공고 확인','이력서·자기소개서 준비','희망직무 입사지원 경험','면접 참여·준비','자격증 취득·준비','직업훈련·교육 탐색','진로·취업상담 경험','경력·보유기술 정리','근무지역·시간·임금 정리','구체적인 취업준비 전'];
 const groundLabels={
  '빠른취업지원형':['직무·조건·경력 명확','입사지원 준비 완료','역량·의지·조건 충족','훈련·자격 준비 완료'],
  '의욕향상지원형':['취업방향 구체화 필요','구직활동 지속성 보완','반복 탈락·자신감 저하','직무정보·목표 설정 필요'],
  '능력향상지원형':['실무경험·직무역량 보완','자격·훈련 추가 준비','서류·면접 기술 보완','직무전환 준비'],
  '종합지원형':['복합 애로·단계별 지원','목표·경험·역량 부족','개인 여건·구직준비 보완','동기·역량·알선 병행']
 };
 function moveField(id,label,presetId,labels){
  const el=by(id);if(!el)return;
  const cell=document.createElement('div');cell.className='col6';
  const title=document.createElement('label');title.htmlFor=presetId||id;title.textContent=label;cell.append(title);
  const preset=presetId&&by(presetId);
  if(preset){
   cell.append(preset);
   const preview=document.createElement('div');preview.className='small clg-selected-phrase';cell.append(preview);
   const edit=document.createElement('details');edit.className='clg-phrase-edit';
   const summary=document.createElement('summary');summary.textContent='선택 문구 확인·수정';edit.append(summary,el);cell.append(edit);
   function refresh(){
    const names=id==='typeReasonText'?(groundLabels[preset.dataset.type]||[]):labels;
    [...preset.options].filter(o=>o.value).forEach((o,i)=>{const name=names?.[i];if(name&&o.textContent!==name)o.textContent=name;});
    const value=val(id),matched=[...preset.options].find(o=>o.value&&o.value===value);
    preset.value=matched?.value||'';
    if(preset.options[0]&&!preset.disabled)preset.options[0].textContent=value&&!matched?'직접 수정한 문구 사용':label+' 선택';
    preview.textContent=value||'드롭다운에서 문구를 고르세요.';preview.title=value;
   }
   preset.addEventListener('change',refresh);el.addEventListener('input',refresh);el.addEventListener('change',refresh);
   if(id==='typeReasonText')new MutationObserver(refresh).observe(preset,{childList:true});
   refresh();
  }else cell.append(el);
  fields.append(cell);el.style.marginTop='0';if(el.tagName==='TEXTAREA')el.style.minHeight='68px';
 }
 moveField('strategyTargetJob','희망직무');moveField('strategyTiming','취업목표 시기');
 moveField('motivationReason','참여목적','motivationReasonPreset',purposeLabels);
 moveField('motivationEffort','취업준비 노력','motivationEffortPreset',effortLabels);
 const support=document.createElement('div');support.className='col6';
 support.innerHTML='<label for="work24SupportPreset">기대하는 지원</label><select id="work24SupportPreset"><option value="">지원내용 선택</option><option value="채용정보·취업알선">채용정보·취업알선</option><option value="채용정보·취업알선, 이력서·자기소개서 보완">채용정보·알선 + 서류 보완</option><option value="이력서·자기소개서 보완, 면접 준비">서류 보완 + 면접 준비</option><option value="희망직무·취업방향 설정, 채용정보·취업알선">취업방향 설정 + 채용정보</option><option value="자격·훈련·일경험 연계">자격·훈련·일경험</option><option value="근무조건 조정, 채용정보·취업알선">개인 여건에 맞는 조건·알선</option><option value="구직목표 설정·직업정보 탐색">구직목표 설정·직업정보 탐색</option><option value="구직동기 강화·단계별 구직활동 점검">구직동기 강화·활동 점검</option><option value="복지·심리정서 지원 연계, 단계별 취업지원">복지·심리정서 연계 + 단계별 지원</option><option value="__custom">직접 수정하기</option></select><div class="small clg-selected-phrase" id="work24SupportSelected"></div><details class="clg-phrase-edit" id="work24SupportEdit"><summary>선택 문구 확인·수정</summary><input type="text" id="work24ExpectedSupport" placeholder="필요한 경우 지원 문구 수정"></details>';
 fields.append(support);
 const supportPreset=by('work24SupportPreset'),supportText=by('work24ExpectedSupport');
 function refreshSupport(){const value=data().support,match=[...supportPreset.options].find(o=>o.value===value);supportPreset.value=match?.value||(value?'__custom':'');by('work24SupportSelected').textContent=value||'드롭다운에서 지원내용을 고르세요.';by('work24SupportSelected').title=value;}
 supportPreset.addEventListener('change',()=>{
  if(supportPreset.value==='__custom'){by('work24SupportEdit').open=true;supportText.focus();return;}
  supportText.value=supportPreset.value;supportText.dispatchEvent(new Event('input',{bubbles:true}));supportText.dispatchEvent(new Event('change',{bubbles:true}));
 });
 supportText.addEventListener('input',refreshSupport);supportText.addEventListener('change',refreshSupport);refreshSupport();
 moveField('typeReasonText','유형분류 근거','typeReasonPreset',[]);
 const labels={motivation:'참여동기',type:'유형분류 및 근거',strategy:'상담목표 및 전략'};
 for(const [key,label] of Object.entries(labels)){
  const card=document.createElement('div');card.className='card';
  const title=document.createElement('label');title.htmlFor='work24_'+key;title.textContent=label;
  const textarea=document.createElement('textarea');textarea.id='work24_'+key;textarea.setAttribute('aria-label',label+' 전산 복사 문구');
  const row=document.createElement('div');row.className='clg-work24-copyrow';
  const count=document.createElement('span');count.id='work24_'+key+'_bytes';count.className='small';count.setAttribute('role','status');
  const button=document.createElement('button');button.type='button';button.className='btn';button.id='work24_'+key+'_copy';button.textContent=label+' 복사';
  row.append(count,button);card.append(title,textarea,row);by('work24Outputs').append(card);
 }
 let signature='';
 const names=['motivation','type','strategy'];
 function missing(d){return {motivation:[!d.reason&&'참여목적',!d.effort&&'취업준비 노력',!d.support&&'기대하는 지원',!d.job&&'희망직무'].filter(Boolean),type:[!d.type&&'유형',!d.ground&&'분류 근거'].filter(Boolean),strategy:[!d.job&&'희망직무',!d.support&&'기대하는 지원'].filter(Boolean)};}
 function update(){
  const d=data(),stale=signature&&signature!==JSON.stringify(d),gaps=missing(d);
  for(const key of names){
   const text=by('work24_'+key).value,size=new TextEncoder().encode(text).length,count=by('work24_'+key+'_bytes');
   const issues=[stale&&'입력 변경됨 · 문구 다시 만들기',gaps[key].length&&gaps[key].join('·')+' 입력 필요',size>1500&&'초과 · 문구를 줄여주세요'].filter(Boolean);
   count.textContent=size.toLocaleString('ko-KR')+'/1,500Byte'+(issues.length?' · '+issues.join(' / '):'');count.style.color=issues.length?'#b91c1c':'#475569';
   by('work24_'+key+'_copy').disabled=!signature||!text||stale||gaps[key].length>0||size>1500;
  }
 }
 by('work24Build').addEventListener('click',()=>{
  const d=data(),texts=drafts(d);
  for(const key of names)by('work24_'+key).value=texts[key];
  signature=JSON.stringify(d);by('work24Outputs').hidden=false;by('work24Build').textContent='전산 문구 다시 만들기';
  by('work24BuildStatus').textContent='초안을 확인·수정한 뒤 해당 칸의 복사 버튼을 누르세요. 다시 만들면 세 초안이 교체됩니다.';
  update();
 });
 async function copy(text){
  if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return;}catch{}}
  const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();
  const ok=document.execCommand('copy');area.remove();if(!ok)throw new Error('copy failed');
 }
 for(const key of names){
  by('work24_'+key).addEventListener('input',update);
  by('work24_'+key+'_copy').addEventListener('click',async()=>{
   update();if(by('work24_'+key+'_copy').disabled)return;
   try{await copy(by('work24_'+key).value);by('work24BuildStatus').textContent=labels[key]+' 문구를 복사했습니다.';}
   catch{by('work24BuildStatus').textContent='자동 복사를 사용할 수 없습니다. 해당 문구를 선택해 Ctrl+C로 복사하세요.';}
  });
 }
 document.addEventListener('input',update);document.addEventListener('change',update);
 by('resetBtn')?.addEventListener('click',()=>{
  if(!by('counselingDate')?.value){signature='';by('work24Outputs').hidden=true;by('work24BuildStatus').textContent='';by('work24Build').textContent='전산 문구 만들기';update();}
 });
 update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',create,{once:true});else create();
})();
