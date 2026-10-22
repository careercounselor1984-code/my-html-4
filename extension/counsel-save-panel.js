'use strict';
const $=id=>document.getElementById(id),KEY='clgCounselSaveEventsV1',STATUS='clgCounselSaveDetectionV1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=s=>{try{return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(s));}catch{return '-';}};
const date=s=>s?time(s+'T00:00:00+09:00').replace(/\s*00:00$/,''):'미확인';
const labels={confirmed:'저장 확인 완료',excluded:'기록 대상 제외 또는 필수정보 미확인',waiting:'저장 성공 확인 대기',unconfirmed:'저장 확인 보류',replaced:'다른 저장 동작 감지', 'needs-evidence':'저장 응답 연결 점검 필요'};
let records=[];
function render(){const q=$('search').value.trim().toLowerCase(),list=records.filter(r=>(r.name+' '+r.iapNo).toLowerCase().includes(q)).slice().reverse();$('records').innerHTML=list.length?list.map(r=>`<div class="card"><span class="badge">저장 확인</span> · <b>${esc(r.name)}</b><div class="meta">IAP등록번호 ${esc(r.iapNo)}<br>상담일 ${esc(date(r.counselingDate))}<br>저장 확인 ${esc(time(r.saveConfirmedAt))}</div></div>`).join(''):'<div class="empty">저장이 확인된 상담일지가 없습니다.</div>';}
async function load(){const s=await chrome.storage.local.get([KEY,STATUS]);records=s[KEY]?.records||[];const last=s[STATUS];$('status').textContent=last?`${labels[last.status]||'확인 필요'}\n${(last.reasons||[]).join('\n')}\n${last.context?.name||''} ${last.context?.iapNo||''}\n확인 시각 ${time(last.at)}`:'아직 저장 감지 이력이 없습니다. 상담일지 작성 화면에서 인식 점검 후 전산 저장을 눌러주세요.';render();}
$('search').addEventListener('input',render);chrome.storage.onChanged.addListener((c,area)=>{if(area==='local'&&(c[KEY]||c[STATUS]))load();});
$('inspectBtn').addEventListener('click',async()=>{
 const btn=$('inspectBtn');btn.disabled=true;
 try{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const u=new URL(tab?.url||'');if(u.protocol!=='https:'||!(u.hostname==='work24.go.kr'||u.hostname.endsWith('.work24.go.kr')))throw Error('Work24 상담일지 작성 화면에서 실행하세요.');
  const frames=await chrome.webNavigation.getAllFrames({tabId:tab.id})||[{frameId:0}];const results=[];
  for(const f of frames){try{
   let r;try{r=await chrome.tabs.sendMessage(tab.id,{type:'CLG_COUNSEL_SAVE_INSPECT'},{frameId:f.frameId});}catch{await chrome.scripting.executeScript({target:{tabId:tab.id,frameIds:[f.frameId]},files:['basic_content.js','counsel-save-core.js','counsel-save-content.js']});r=await chrome.tabs.sendMessage(tab.id,{type:'CLG_COUNSEL_SAVE_INSPECT'},{frameId:f.frameId});}
   if(r)results.push(r);
  }catch{}}
  const r=results.find(r=>r.eligible)||results.sort((a,b)=>(a.reasons?.length||99)-(b.reasons?.length||99))[0];if(!r)throw Error('상담일지 화면을 읽지 못했습니다. Work24를 새로고침하세요.');
  $('status').textContent=(r.eligible?'저장 감지 준비 완료\n이제 전산에서 상담일지를 저장하세요.':'화면 연결 확인 필요\n'+(r.reasons||[]).join('\n'))+`\n${r.context?.name||''} ${r.context?.iapNo||''}\n상담일 ${date(r.context?.counselingDate)}`;
 }catch(e){$('status').textContent=e.message||String(e);}finally{btn.disabled=false;}
});load();
