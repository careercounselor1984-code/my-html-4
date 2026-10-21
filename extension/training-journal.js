/* Show verified training counts inside the journal before any Work24 transfer. */
(function(){
'use strict';
if(location.protocol==='file:'&&!/상담일지\s*통합본/.test(document.title||''))return;if(window.__CLG_TRAINING_JOURNAL_V116__)return;window.__CLG_TRAINING_JOURNAL_V116__=true;
const bound=new WeakSet();let schedules={},timer;
function plan(doc){return {jobRows:[...doc.querySelectorAll('#job_tbody tr')].map(tr=>({kind:tr.querySelector('.job-kind')?.value||'',name:tr.querySelector('.job-name')?.value||'',org:tr.querySelector('.job-org')?.value||'',start:tr.querySelector('.s-date')?.value||'',end:tr.querySelector('.e-date')?.value||''}))};}
function draw(doc){
 const table=doc.getElementById('job_tbody');if(!table)return;const counts=ClgTrainingCounts.counts(plan(doc),schedules);
 let box=doc.getElementById('clgTrainingBeforeSend');if(!box){box=doc.createElement('section');box.id='clgTrainingBeforeSend';box.style.cssText='padding:12px;margin:10px 0;border:1px solid #99f6e4;border-radius:10px;background:#f0fdfa;font-size:12px';table.closest('table').insertAdjacentElement('afterend',box);}
 box.replaceChildren();box.hidden=!counts.length;if(!counts.length)return;
 const title=doc.createElement('b');title.textContent='전산 전송 전 · 회차별 예정 훈련일수';box.append(title);
 for(const r of counts){const p=doc.createElement('p');p.textContent=`${r.name} · ${r.start}~${r.end} · ${r.matched?r.count+'일':r.reason}`;box.append(p);}
 const note=doc.createElement('p');note.textContent='전산도우미의 훈련 일수 계산에서 실제 시간표를 계산하면 여기에 반영됩니다. 회차·기간이 맞는지 확인한 뒤 전산으로 보내세요. 실제 출석·인정일수와는 다릅니다.';box.append(note);
}
function sync(doc,frame){
 draw(doc);if(!frame.classList.contains('is-active')&&frame.id!=='frame')return;
 const iapDate=doc.getElementById('iapDate')?.value;
 if(/^\d{4}-\d{2}-\d{2}$/.test(iapDate||''))void chrome.storage.local.set({clgTrainingPlanContextV1:{iapDate,updatedAt:new Date().toISOString(),source:'통합본 작성 중 IAP'}}).catch(()=>{});
}
function bind(frame){try{
 const doc=frame.contentDocument;if(!doc?.getElementById('job_tbody'))return;
 if(bound.has(doc)){sync(doc,frame);return;}bound.add(doc);
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>sync(doc,frame),200);};doc.addEventListener('input',schedule);doc.addEventListener('change',schedule);
 new MutationObserver(schedule).observe(doc.getElementById('job_tbody'),{childList:true});sync(doc,frame);
}catch{}}
function scan(){for(const f of document.querySelectorAll('iframe.clgWorkFrame,iframe#frame')){if(!f.dataset.clgTrainingListener){f.dataset.clgTrainingListener='1';f.addEventListener('load',()=>bind(f));}bind(f);}}
chrome.storage.local.get('clgVerifiedTrainingSchedulesV1').then(r=>{schedules=r.clgVerifiedTrainingSchedulesV1||{};scan();}).catch(()=>{});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.clgVerifiedTrainingSchedulesV1){schedules=changes.clgVerifiedTrainingSchedulesV1.newValue||{};scan();}});
new MutationObserver(records=>{if(records.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('iframe')||n.querySelector?.('iframe')))))scan();}).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('focus',scan);scan();
})();
