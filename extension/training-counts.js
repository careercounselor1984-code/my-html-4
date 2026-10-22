/* Compare verified timetable dates with the actual periods of pending IAP training rows. */
(function(root){
'use strict';
const counts=root.ClgTrainingCounts.counts;
if(typeof module!=='undefined'&&module.exports){module.exports={counts};return;}
const box=document.createElement('div');box.className='card';box.style.cssText='margin-top:10px;padding:10px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;font-size:12px';document.getElementById('content').insertAdjacentElement('afterend',box);
let serial=0;
async function refresh(){const ticket=++serial;const r=await chrome.storage.local.get(['clgIapTransferPendingV120','clgVerifiedTrainingSchedulesV1']);if(ticket!==serial)return;const rows=counts(r.clgIapTransferPendingV120,r.clgVerifiedTrainingSchedulesV1);box.replaceChildren();box.hidden=!rows.length;if(!rows.length)return;const title=document.createElement('b');title.textContent='직업훈련 · IAP 훈련행 기간별 예정 일수';box.append(title);for(const row of rows){const line=document.createElement('p');line.textContent=`${row.name} · ${row.start} ~ ${row.end} · ${row.matched?row.count+'일 (실제 시간표 기준 · 계산 '+String(row.calculatedAt||'').slice(0,10)+')':row.reason}`;box.append(line);}const link=document.createElement('a');link.href='training/popup.html';link.textContent='훈련 상세페이지에서 시간표 계산하기';box.append(link);const note=document.createElement('p');note.textContent='예정 훈련일수이며 실제 출석·수당 인정일수가 아닙니다. 전산 입력값은 자동 변경하지 않습니다.';box.append(note);}
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.clgIapTransferPendingV120||changes.clgVerifiedTrainingSchedulesV1))refresh();});
document.getElementById('refreshBtn')?.addEventListener('click',refresh);document.getElementById('clearBtn')?.addEventListener('click',()=>setTimeout(refresh,50));refresh();
})(typeof window!=='undefined'?window:globalThis);
