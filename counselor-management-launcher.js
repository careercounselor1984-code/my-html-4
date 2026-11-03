/* North-center integration. Authorization comes from active server employee records. */
(()=>{'use strict';
const PAGE='p_counselor_management',VERSION='20261103-1';
let generation=0,busy=false,entry=null,current=null;
async function access(){
 const client=window.clgJobArchiveClient?.();
 if(!client)throw Error('통합본에 로그인해 주세요.');
 const {data,error}=await client.rpc('counselor_management_access');
 if(error||!data?.allowed||!data.userId)throw Error('북부센터 직원만 사용할 수 있습니다.');
 if(client!==window.clgJobArchiveClient?.())throw Error('로그인 계정이 변경되었습니다.');
 return data;
}
window.clgCounselorManagementAccess=access;
function invalidate(){
 generation++;current=null;entry?.remove();entry=null;
 for(const tab of window.clgGetWorkTabs?.()||[]){if(tab.pageId!==PAGE)continue;
  try{tab.frame.contentWindow.dispatchEvent(new Event('cm-access-revoked'));}catch{}
  tab.frame.removeAttribute('srcdoc');tab.frame.src='about:blank';
 }
}
async function refresh(){
 if(busy)return;busy=true;const token=generation;
 try{const next=await access();if(token!==generation)return;
  if(current&&current.userId!==next.userId){invalidate();return;}
  current=next;if(entry)return;
  const menu=document.getElementById('menu');if(!menu)return;
  entry=document.createElement('div');entry.id='clgCounselorManagementMenu';
  const button=document.createElement('button');button.type='button';button.className='page-btn';
  button.dataset.pageId=PAGE;button.textContent='상담사 관리';button.title='북부센터 · 관리엑셀 연동';
  button.addEventListener('click',async()=>{button.disabled=true;try{
   const verified=await access();if(verified.userId!==current?.userId)throw Error('로그인을 다시 확인하세요.');
   window.clgOpenClientWorkTab(PAGE,{});
  }catch(e){invalidate();alert(e.message);}finally{button.disabled=false;}});
  entry.append(button);menu.after(entry);
 }catch{if(token===generation)invalidate();}finally{busy=false;}
}
if(typeof PAGES!=='undefined'&&!PAGES.some(p=>p.id===PAGE))PAGES.push({id:PAGE,title:'상담사 관리',url:'./counselor-management/index.html?v='+VERSION});
window.addEventListener('clg-auth-ready',()=>{invalidate();refresh();});
window.addEventListener('clg-auth-logout',invalidate);
window.addEventListener('pagehide',invalidate);
setInterval(refresh,60000);refresh();
})();
