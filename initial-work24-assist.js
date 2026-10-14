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
 box.innerHTML='<summary>전산 입력 문구 · 참여동기 / 유형분류 / 상담목표·전략</summary><p class="small">아래 내용으로 전산의 세 칸을 각각 작성합니다. 초안을 수정한 뒤 필요한 칸만 복사하세요. 각 칸 1,500Byte 제한입니다.</p><div class="grid" id="work24SourceFields"></div><div class="actions"><button type="button" class="btn primary" id="work24Build">전산 문구 만들기</button><span class="small" id="work24BuildStatus" role="status"></span></div><div class="clg-work24-outputs" id="work24Outputs" hidden></div>';
 opinionSection.insertAdjacentElement('afterend',box);
 const fields=by('work24SourceFields');
 function moveField(id,label){
  const el=by(id);if(!el)return;
  const cell=document.createElement('div');cell.className='col6';
  const title=document.createElement('label');title.htmlFor=id;title.textContent=label;
  cell.append(title,el);fields.append(cell);
  el.style.marginTop='0';if(el.tagName==='TEXTAREA')el.style.minHeight='68px';
 }
 moveField('strategyTargetJob','희망직무');moveField('strategyTiming','취업목표 시기');
 moveField('motivationReason','참여목적');moveField('motivationEffort','현재까지의 취업준비 노력');
 const support=document.createElement('div');support.className='col6';support.innerHTML='<label for="work24ExpectedSupport">기대하는 지원</label><input type="text" id="work24ExpectedSupport" list="work24SupportChoices" placeholder="예: 채용정보·취업알선, 이력서 보완"><datalist id="work24SupportChoices"><option value="채용정보·취업알선"></option><option value="채용정보·취업알선, 이력서·자기소개서 보완"></option><option value="이력서·자기소개서 보완, 면접 준비"></option><option value="희망직무·취업방향 설정, 자격·훈련·일경험"></option></datalist>';
 fields.append(support);moveField('typeReasonText','유형분류 근거 · 상단에서 유형 선택 후 실제 내용에 맞게 수정');
 by('motivationReason').placeholder='예: 혼자 취업준비를 진행하는 데 어려움이 있어 단계적인 지원을 받고자 신청함.';
 by('motivationEffort').placeholder='예: 고용24와 민간 채용사이트에서 희망직무 채용공고를 확인하였음.';
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
