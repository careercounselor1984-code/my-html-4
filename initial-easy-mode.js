/* Initial counseling: keep the original form; assist only the counselor's opinion. */
(function(){
'use strict';
if(window.__initialOpinionAssistLoaded)return;
window.__initialOpinionAssistLoaded=true;
const by=id=>document.getElementById(id);
function create(){
 const opinion=by('counselorOpinion');
 const card=opinion?.closest('.card');
 const basic=by('finalEducation')?.closest('.section');
 if(!card||!basic)return;
 document.body.classList.add('clg-initial-focused');
 // Move the real assessment controls once; keep their existing calculation/event bindings.
 const assessmentSource=by('totalScore')?.closest('.section');
 const assessment=document.createElement('section');assessment.className='section blue clg-assessment-main';
 const assessmentTitle=document.createElement('h2');assessmentTitle.className='sectionTitle';assessmentTitle.textContent='취업역량평가';
 const assessmentGrid=document.createElement('div');assessmentGrid.className='grid';
 for(const id of ['totalScore','grade','resultType']){
  const col=by(id)?.closest('.col4');if(col)assessmentGrid.append(col);
 }
 assessment.append(assessmentTitle,assessmentGrid);
 const scoreHint=by('scoreValidationHint');if(scoreHint){scoreHint.className='small';assessment.append(scoreHint);}
 basic.insertAdjacentElement('afterend',assessment);
 if(assessmentSource)assessmentSource.hidden=true;
 const interpretation=document.createElement('details');interpretation.className='clg-eval-reference';
 interpretation.innerHTML='<summary>평가 결과 해석 참고</summary><p class="small">도구 설명 → 종합결과 해석 → 세부영역 확인 → 추천 서비스 안내 → 질문·해석 마무리 순으로 진행합니다. 결과표를 설명하고 취업목표·구직역량·방해요인을 추가 확인한 뒤, 참여자와 필요한 서비스와 최종 유형을 논의합니다.</p><p class="small">종합점수 등급과 세부 서비스 유형을 구분합니다. 유형은 구직의지·구직역량의 세부 결과를 참고하며, 방해요인 프로파일은 점수가 낮을수록 취약합니다.</p><div class="small">빠른취업지원형: 의지·역량 모두 높음 · 목표·준비·구직기술 추가 확인<br>의욕향상지원형: 역량 높음·의지 낮음 · 목표 설정과 동기 강화<br>능력향상지원형: 의지 높음·역량 낮음 · 자격·훈련·일경험 등 보완<br>종합지원형: 의지·역량 모두 낮음 · 방해요인 탐색과 단계별·복지 연계</div><p class="small">2026.1 업무매뉴얼 p.133~139 참고</p>';
 assessment.append(interpretation);
 const section=document.createElement('section');
 section.className='section blue clg-opinion-main';
 const title=document.createElement('h2');title.className='sectionTitle';title.textContent='상담사 의견';
 section.append(title,card);assessment.insertAdjacentElement('afterend',section);
 card.querySelector(':scope > label')?.remove();
 card.querySelector(':scope > .grid')?.setAttribute('hidden','');
 card.querySelector(':scope > .actions')?.setAttribute('hidden','');
 const label=card.querySelector('label[for="counselorOpinion"]');if(label)label.textContent='최종 상담사 의견';
 opinion.placeholder='드롭다운으로 초안을 만든 뒤 반영하거나, 최종 의견을 직접 수정하세요.';
 opinion.rows=7;
 const helper=document.createElement('details');helper.className='clg-opinion-helper';
 helper.innerHTML='<summary>드롭다운으로 의견 작성</summary><p class="small">현재 상태·보완점·지원방향을 고르면 참여목적과 취업목표를 함께 반영해 초안을 만듭니다.</p><div class="grid" id="opinionChoiceFields"></div><button type="button" class="btn primary" id="opinionPresetBuild">선택 문구로 의견 초안 만들기</button><details class="clg-phrase-edit"><summary>추가 메모로 보완하기 (선택)</summary><textarea id="opinionAssistMemo" aria-label="의견 작성 메모" placeholder="현재 상태: 생산직 경력 3년, 현재 구직 중\n참여 이유: 재취업을 위한 채용정보 필요\n어려움: 교대근무 어려움\n지원계획: 주간근무 채용정보 제공 및 알선"></textarea><div class="actions"><button type="button" class="btn" id="opinionAssistBuild">메모 정리</button></div></details><div id="opinionAssistResult" hidden><label for="opinionAssistDraft">의견 초안 · 검토 후 반영</label><textarea id="opinionAssistDraft"></textarea><button type="button" class="btn" id="opinionAssistApply">의견에 추가</button></div><p id="opinionAssistStatus" class="small" role="status"></p>';
 helper.open=true;
 card.insertBefore(helper,label||opinion);
 const choices=by('opinionChoiceFields');
 for(const [id,title] of [['clientStatusPreset','현재 구직상태'],['opinionNeedPreset','주요 보완점'],['opinionDirectionPreset','중점 지원방향']]){
  const select=by(id);if(!select)continue;
  const col=document.createElement('div');col.className='col4';
  const name=document.createElement('label');name.htmlFor=id;name.textContent=title;col.append(name,select);choices.append(col);
 }
 const noNeed=document.createElement('option');noNeed.value='현재 구직활동에 영향을 미치는 구체적인 취업 애로요인은 확인되지 않음.';noNeed.textContent='구직활동 관련 특이 애로 없음';by('opinionNeedPreset')?.append(noNeed);
 by('opinionPresetBuild').addEventListener('click',()=>by('generateOpinionBtn')?.click());
 const status=by('opinionAssistStatus');
 by('opinionAssistBuild').addEventListener('click',()=>{
  const lines=by('opinionAssistMemo').value.split(/\n+/).map(s=>s.trim().replace(/^[-•*]\s*/,'' )).filter(Boolean);
  if(!lines.length){status.textContent='확인한 상담 내용을 메모해 주세요.';return;}
  by('opinionAssistDraft').value=lines.map(s=>'- '+s).join('\n');
  by('opinionAssistResult').hidden=false;status.textContent='문장과 사실관계를 검토해 주세요. 아직 최종 의견에는 반영하지 않았습니다.';
 });
 by('opinionAssistApply').addEventListener('click',()=>{
  const draft=by('opinionAssistDraft').value.trim();if(!draft)return;
  const existing=opinion.value.trim();
  if(existing.includes(draft)){status.textContent='이미 반영된 초안입니다.';return;}
  opinion.value=existing?(existing+'\n'+draft):draft;
  opinion.dispatchEvent(new Event('input',{bubbles:true}));
  status.textContent='의견에 추가했습니다. 기존 의견은 유지했습니다.';
 });
 // Existing recommendation buttons are hidden; retain their handlers for old callers.
 // Only an explicit action on this helper can append the memo to the final opinion.
 by('resetBtn')?.addEventListener('click',()=>{
  // The original reset owns confirmation; clear the preview only if it actually cleared the memo.
  if(!by('opinionAssistMemo').value){by('opinionAssistResult').hidden=true;status.textContent='';}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',create,{once:true});else create();
})();
