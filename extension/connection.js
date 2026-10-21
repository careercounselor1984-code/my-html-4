'use strict';
const connectBtn=document.getElementById('connectJournalBtn');
const connectStatus=document.getElementById('journalConnectionStatus');
async function connectJournal(){
 connectBtn.disabled=true;connectStatus.textContent='현재 통합본 탭의 연결을 확인하고 있습니다…';
 try{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id)throw Error('현재 탭을 찾지 못했습니다.');
  const u=new URL(tab.url||'');
  if(!((u.protocol==='https:'&&u.hostname==='careercounselor1984-code.github.io'&&/^\/my-html-4(?:\/|$)/.test(u.pathname))||(u.protocol==='file:'&&/상담일지\s*통합본/.test(tab.title||''))))throw Error('허용된 상담일지 통합본 주소가 아닙니다.');
  const check=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{
   const title=String(document.title||'');
   const hasWorkTabs=!!document.querySelector('iframe.clgWorkFrame,iframe#frame');
   return {journal:hasWorkTabs&&/상담|통합본/.test(title)};
  }});
  if(!check[0]?.result?.journal)throw Error('상담일지 통합본이 열린 탭을 먼저 선택한 뒤 다시 눌러주세요.');
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:['bridge-security.js','training-core.js','counsel_bridge_content.js','direct_bridge_v148.js','training-journal.js','readiness-journal.js']});
  const result=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>new Promise(resolve=>{
   const marker='CLG_COUNSEL_BRIDGE_V113';let timer;
   const handler=e=>{if(e.source!==window||(location.protocol==='file:'?e.origin!=='null':e.origin!==location.origin)||e.data?.marker!==marker||e.data?.type!=='BRIDGE_READY')return;clearTimeout(timer);window.removeEventListener('message',handler);resolve({ok:true,version:e.data.payload?.version||''});};
   window.addEventListener('message',handler);
   timer=setTimeout(()=>{window.removeEventListener('message',handler);resolve({ok:false});},1500);
   window.postMessage({marker,type:'PING_BRIDGE'},location.protocol==='file:'?'*':location.origin);
  })});
  if(!result[0]?.result?.ok)throw Error('연결 응답이 없습니다. 이전 버전이 꺼져 있는지 확인하고 통합본을 새로고침한 뒤 재시도해 주세요.');
  connectStatus.textContent=`✓ ${result[0].result.version} 연결 확인 완료 · 통합본에서 ‘국취전산으로 보내기’를 다시 눌러주세요.`;
 }catch(e){connectStatus.textContent='연결 실패: '+(e?.message||String(e));}
 finally{connectBtn.disabled=false;}
}
connectBtn.addEventListener('click',connectJournal);
