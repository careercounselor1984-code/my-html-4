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
 const section=document.createElement('section');
 section.className='section blue clg-opinion-main';
 const title=document.createElement('h2');title.className='sectionTitle';title.textContent='상담사 의견';
 section.append(title,card);basic.insertAdjacentElement('afterend',section);
 card.querySelector(':scope > label')?.remove();
 card.querySelector(':scope > .grid')?.setAttribute('hidden','');
 card.querySelector(':scope > .actions')?.setAttribute('hidden','');
 const label=card.querySelector('label[for="counselorOpinion"]');if(label)label.textContent='최종 상담사 의견';
 opinion.placeholder='현재 상태와 참여 이유, 실제 확인된 어려움, 앞으로의 지원계획을 작성하세요. 필요한 경우 아래 메모 보조를 사용할 수 있습니다.';
 opinion.rows=7;
 const helper=document.createElement('details');helper.className='clg-opinion-helper';
 helper.innerHTML='<summary>의견 작성 도움 (선택)</summary><p class="small">현재 상태 → 참여 이유 → 어려움 → 지원계획 순으로 메모해 주세요. 입력한 내용만 정리하며, 기본정보·유형·지원항목은 바꾸지 않습니다.</p><textarea id="opinionAssistMemo" aria-label="의견 작성 메모" placeholder="현재 상태: 생산직 경력 3년, 현재 구직 중\n참여 이유: 재취업을 위한 채용정보 필요\n어려움: 교대근무 어려움\n지원계획: 주간근무 채용정보 제공 및 알선"></textarea><div class="actions"><button type="button" class="btn" id="opinionAssistBuild">메모 정리</button></div><div id="opinionAssistResult" hidden><label for="opinionAssistDraft">의견 초안 · 검토 후 반영</label><textarea id="opinionAssistDraft"></textarea><button type="button" class="btn" id="opinionAssistApply">의견에 추가</button></div><p id="opinionAssistStatus" class="small" role="status"></p>';
 card.append(helper);
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
