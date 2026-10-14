(function(){
'use strict';
if(window.__initialEasyLoaded)return;
window.__initialEasyLoaded=true;
const by=id=>document.getElementById(id);
const attr=key=>Object.prototype.hasOwnProperty.call(labels,key)?labels[key]:null;
const labels={
 '희망직무':'strategyTargetJob','희망 직무':'strategyTargetJob','목표직무':'strategyTargetJob',
 '목표시기':'strategyTiming','취업시기':'strategyTiming','목표 시기':'strategyTiming',
 '참여이유':'motivationReason','참여 이유':'motivationReason','참여계기':'motivationReason','신청이유':'motivationReason',
 '현재상태':'clientStatus','현재 상태':'clientStatus','구직상태':'clientStatus',
 '어려움':'mainDifficulty','주요애로':'mainDifficulty','애로사항':'mainDifficulty','구직애로':'mainDifficulty',
 '구직활동':'motivationEffort','준비활동':'motivationEffort','취업준비':'motivationEffort',
 '강점':'strategyStrength','경력':'initialCareerHistory','최근활동':'initialRecentActivity',
 '지원요청':'_support','우선지원':'_support','희망지원':'_support','원하는도움':'_support',
 '건강유의':'healthCreditDetail'
};
const services={matching:/채용정보|공고|알선|일자리/,documents:/이력서|자소서|자기소개서|입사지원서/,interview:/면접/,goal:/직무목표|진로|직무설정/,skills:/훈련|자격|일경험/,motivation:/동기|자신감/,conditions:/근무조건|시간조정/,welfare:/복지|금융/};
const basic=['counselingDate','startTime','endTime','noticeDate','participatePath','finalEducation'];
const prior={};
let lastGenerated='',appliedMemo='',wasEdited=false;
const clean=s=>String(s||'').replace(/^\s*[-*•]\s*/,'').replace(/\s+/g,' ').trim();
function parse(note){
 const fields={},unknown=[],requested=[];
 const lines=String(note||'').split(/\n+|[;；]+/).map(clean).filter(Boolean);
 for(const s of lines){
  let matched=false;
  const m=s.match(/^([^:：]{2,15})\s*[:：]\s*(.+)$/);
  if(m&&attr(clean(m[1]))){
    const id=attr(clean(m[1]));
    if(id==='_support')requested.push(clean(m[2]));
    else fields[id]=(fields[id]?fields[id]+' / ':'')+clean(m[2]);
    continue;
  }
  const v=s.replace(/[.!。]$/,'');
  let goal=v.match(/^(.{2,30}?)\s*(?:취업을?\s*)?희망(?:함|하고\s*있음|)$/);
  if(goal&&!/지원|도움|상담/.test(goal[1])){fields.strategyTargetJob=clean(goal[1]);matched=true}
  const timing=v.match(/(\d{1,2}개월\s*이내|졸업\s*후\s*바로|올해\s*안)/);
  if(timing&&/(목표|취업|졸업)/.test(v)){fields.strategyTiming=timing[1];matched=true}
  if(!matched&&/(실패|자신감\s*저하|어려움|경력\s*단절|부족|애로)/.test(v)&&/(구직|취업|입사지원|직무|면접|자신감)/.test(v)){
    fields.mainDifficulty=(fields.mainDifficulty?fields.mainDifficulty+' / ':'')+v;matched=true;
  }
  if(!matched&&/(채용공고|입사지원|구직활동|면접\s*참여)/.test(v)&&/(경험|지원|참여|준비)/.test(v)){
    fields.motivationEffort=(fields.motivationEffort?fields.motivationEffort+' / ':'')+v;matched=true;
  }
  if(!matched&&/(취업지원서비스|제도|취업지원)/.test(v)&&/(신청|참여|활용|받고자)/.test(v)){
    fields.motivationReason=(fields.motivationReason?fields.motivationReason+' / ':'')+v;matched=true;
  }
  if(!matched&&/(채용정보|알선|이력서|자소서|면접\s*준비|훈련)/.test(v)&&/(희망|요청|도움|원함)/.test(v)){
    requested.push(v);matched=true;
  }
  if(!matched)unknown.push(s);
 }
 return {fields,requested,unknown};
}
function setExisting(id,v){
 const el=by(id),old=clean(el?.value);
 if(!el||!v)return false;
 if(old&&old!==prior[id])return false;
 if(old===v)return true;
 el.value=v;prior[id]=v;
 el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
 return true;
}
function setServices(list){
 if(!list.length)return;
 const sentence=list.join(' ');
 for(const [id,re] of Object.entries(services)){
  if(!re.test(sentence))continue;
  const el=document.querySelector('input[name="strategyTask"][value="'+id+'"]');
  if(el&&!el.checked){el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}))}
 }
}
function mirror(short,long){
 const a=by(short),b=by(long);if(!a||!b)return;
 const toReal=type=>{if(b.value!==a.value){b.value=a.value;b.dispatchEvent(new Event('input',{bubbles:true}))}if(type==='change')b.dispatchEvent(new Event('change',{bubbles:true}))};
 a.addEventListener('input',()=>toReal('input'));
 a.addEventListener('change',()=>toReal('change'));
 const back=()=>{if(a.value!==b.value)a.value=b.value};
 b.addEventListener('input',back);b.addEventListener('change',back);back();
}
function status(msg,bad=false){const el=by('easyMessage');el.textContent=msg;el.style.color=bad?'#b91c1c':'#475569'}
function render(){
 const out=by('recordOutput')?.textContent||'';
 if(!by('easyPreview'))return;
 by('easyPreview').textContent=out;
 if(document.activeElement!==by('easyOpinion'))by('easyOpinion').value=by('counselorOpinion')?.value||'';
 const size=new TextEncoder().encode(out).length;
 const check=[['noticeDate','인정통지일'],['finalEducation','학력']].filter(([key])=>!clean(by(key)?.value)).map(x=>x[1]);
 const el=by('easyBytes');
 el.textContent=size.toLocaleString('ko-KR')+'/4,000Byte'+(size>4000?' · 초과! 의견을 간결하게 수정해 주세요.':'')+(check.length?' · '+check.join('·')+' 확인 필요':'');
 el.style.color=size>4000?'#b91c1c':check.length?'#b45309':'#475569';
 by('easyCopy').disabled=!out||size>4000;
}
function compose(){
 const memo=clean(by('easyMemo').value),data=parse(by('easyMemo').value);
 for(const [id,value] of Object.entries(data.fields))setExisting(id,value);
 setServices(data.requested);
 const opinion=clean(by('counselorOpinion')?.value);
 if(wasEdited||(opinion&&(!lastGenerated||opinion!==clean(lastGenerated)))){
  status('직접 수정한 상담사 의견은 유지했어요. 필요한 항목만 메모에서 반영했습니다.');
 }else{
  by('generateOpinionBtn')?.click();
  if(data.unknown.length){
   const additional=data.unknown.join(' / ').slice(0,330);
   const original=clean(by('counselorOpinion')?.value);
   if(additional&&!original.includes(additional))by('counselorOpinion').value=(original?original+'\n':'')+'- 추가 상담 확인사항: '+additional;
  }
  lastGenerated=by('counselorOpinion')?.value||'';wasEdited=false;
  by('counselorOpinion')?.dispatchEvent(new Event('input',{bubbles:true}));
  status(data.unknown.length?'정리 완료. 자동 분류가 어려운 문장은 의견 마지막에 원문으로 남겼어요.':'정리 완료. 상담사 의견을 확인한 뒤 복사해 주세요.');
 }
 appliedMemo=memo;
 render();
}
function mode(simple){
 document.body.classList.toggle('clg-initial-easy',simple);
 by('easyQuick').setAttribute('aria-pressed',String(simple));
 by('easyDetail').setAttribute('aria-pressed',String(!simple));
 render();
}
function clipboardCopy(text){
 if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);
 return new Promise((resolve,reject)=>{const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();const ok=document.execCommand('copy');t.remove();ok?resolve():reject(new Error('copy unavailable'))});
}
function create(){
 const panel=document.querySelector('.panel'),sub=panel?.querySelector('.sub');
 if(!panel||!sub||by('initialEasyPanel'))return;
 const toggle=document.createElement('div');
 toggle.className='clg-easy-switch';
 toggle.innerHTML='<strong>초기상담 작성 방식</strong><div class="actions"><button type="button" class="btn" id="easyQuick" aria-pressed="true">간편 작성</button><button type="button" class="btn" id="easyDetail" aria-pressed="false">상세 작성</button></div>';
 const page=document.createElement('div');page.id='initialEasyPanel';
 page.innerHTML=[
 '<div class="clg-easy-card"><div class="clg-easy-head">① 기본정보 확인</div>',
 '<div class="clg-easy-fields"><label>상담일자<input type="date" id="easy_counselingDate"></label><label>시작<input type="text" id="easy_startTime" placeholder="09:00"></label><label>종료<input type="text" id="easy_endTime" placeholder="09:30"></label></div>',
 '<details class="clg-easy-extra"><summary>인정통지일·학력·참여경로 더 입력하기</summary>',
 '<div class="clg-easy-fields basics"><label>인정통지일<input type="date" id="easy_noticeDate"></label><label>참여경로<input type="text" id="easy_participatePath" placeholder="대학·기관"></label><label>최종학력<input type="text" id="easy_finalEducation" placeholder="학교·전공"></label></div></details>',
 '<p class="clg-easy-hint">기존 기록과 연결돼요. 참여 이력·안내사항·수당은 상세 작성에서 확인해 주세요.</p></div>',
 '<div class="clg-easy-card"><div class="clg-easy-head">② 상담 메모</div>',
 '<label for="easyMemo">핵심 내용만 편하게 입력</label>',
 '<textarea id="easyMemo" placeholder="희망직무: 자동차 생산&#10;목표시기: 6개월 이내&#10;참여이유: 취업지원서비스 활용&#10;현재상태: 채용공고 지원 경험 있음&#10;어려움: 구직 실패로 자신감 저하&#10;지원요청: 채용정보 알선, 이력서 보완"></textarea>',
 '<p class="clg-easy-hint">‘희망직무:’, ‘참여이유:’, ‘어려움:’처럼 적으면 더 정확하게 분류돼요. 불확실한 내용은 추측하지 않습니다.</p>',
 '<div class="clg-easy-toolbar"><button class="btn primary" type="button" id="easyBuild">메모 정리·기록 미리보기</button><span id="easyMessage" class="clg-easy-hint" role="status">메모를 적은 다음 정리 버튼을 눌러 주세요.</span></div></div>',
 '<div class="clg-easy-card"><div class="clg-easy-head">③ 의견 확인·기록 복사</div>',
 '<label for="easyOpinion">상담사 의견 (바로 수정 가능)</label><textarea id="easyOpinion" placeholder="메모 정리 후 자동작성된 상담사 의견을 검토하세요."></textarea>',
 '<div class="clg-easy-hint" id="easyBytes" role="status">0/4,000Byte</div>',
 '<details class="clg-easy-extra"><summary>전체 상담기록 미리보기</summary><div id="easyPreview"></div></details>',
 '<label class="clg-easy-verify"><input type="checkbox" id="easyVerified"><span>기본정보·이력·필수 안내·수당 해당 여부를 실제 확인했습니다. ',
 '<button type="button" class="btn" id="easyReviewDetail" style="padding:2px 7px;font-size:11px">상세 항목 확인</button></span></label>',
 '<div class="clg-easy-toolbar"><button type="button" class="btn primary" id="easyCopy">전체 기록 복사</button><span id="easyCopyMessage" class="clg-easy-hint" role="status"></span></div></div>'
 ].join('');
 sub.insertAdjacentElement('afterend',toggle);toggle.insertAdjacentElement('afterend',page);
 basic.forEach(id=>mirror('easy_'+id,id));
 by('easyQuick').addEventListener('click',()=>mode(true));by('easyDetail').addEventListener('click',()=>mode(false));
 by('easyReviewDetail').addEventListener('click',()=>mode(false));
 by('easyBuild').addEventListener('click',compose);
 by('easyOpinion').addEventListener('input',()=>{
  wasEdited=true;
  const original=by('counselorOpinion');
  original.value=by('easyOpinion').value;original.dispatchEvent(new Event('input',{bubbles:true}));
  render();
 });
 by('counselorOpinion')?.addEventListener('input',render);
 by('easyCopy').addEventListener('click',()=>{
  const message=by('easyCopyMessage');
  if(clean(by('easyMemo').value)!==appliedMemo){status('메모가 바뀌었어요. 먼저 정리 버튼을 눌러 주세요.',true);return}
  const record=by('recordOutput')?.textContent||'';
  if(new TextEncoder().encode(record).length>4000){message.textContent='4,000Byte 초과: 의견을 줄인 후 복사해 주세요.';return}
  if(!by('easyVerified').checked){message.textContent='기본정보·이력·안내·수당 확인 후 체크해 주세요.';return}
  if(!record||!clean(by('counselorOpinion')?.value)){message.textContent='상담사 의견부터 확인해 주세요.';return}
  clipboardCopy(record).then(()=>{message.textContent='상담 기록을 복사했습니다.'}).catch(()=>{message.textContent='복사 권한을 확인하거나 상세 작성에서 다시 복사해 주세요.'});
 });
 by('easyVerified').addEventListener('change',()=>by('easyCopyMessage').textContent='');
 document.body.classList.add('clg-initial-easy');
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',create,{once:true});else create();
})();