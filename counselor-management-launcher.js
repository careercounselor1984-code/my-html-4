/* North-center integration. Authorization comes from active server employee records. */
(()=>{'use strict';
const PAGE='p_counselor_management',VERSION='20261105-menu-1';
let generation=0,busy=false,current=null;
const nativeRenderMenu=renderMenu,nativeLoadPage=loadPage;
function syncMenu(){
 if(!current){
  for(const group of MENU)group.items=group.items.filter(item=>item.pageId!==PAGE);
  const at=PAGES.findIndex(p=>p.id===PAGE);if(at>=0)PAGES.splice(at,1);
 }else{
  if(!PAGES.some(p=>p.id===PAGE))PAGES.push({id:PAGE,title:'상담사 관리',url:'./counselor-management/index.html?v='+VERSION});
  if(!MENU.some(g=>g.items.some(item=>item.pageId===PAGE))){
   let group=MENU.find(g=>g.id==='g_toolsnew')||MENU.find(g=>g.title==='업무도구');
   if(!group){group={id:'g_toolsnew',title:'업무도구',open:false,items:[]};MENU.push(group);}
   group.items.unshift({pageId:PAGE});
  }
 }
}
renderMenu=function(){syncMenu();return nativeRenderMenu.apply(this,arguments);};
loadPage=function(pageId,options){
 if(pageId!==PAGE)return nativeLoadPage.call(this,pageId,options);
 return (async()=>{
 try{
  const verified=await access();if(verified.userId!==current?.userId)throw Error('로그인을 다시 확인하세요.');
  const tab=nativeLoadPage.call(this,pageId,options);
  if(tab?.frame&&tab.frame.src==='about:blank')tab.frame.src='./counselor-management/index.html?v='+VERSION;
  return tab;
 }catch(e){invalidate();alert(e.message);}
 })();
};
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
 generation++;current=null;renderMenu();
 if(typeof uiRenderFavorites==='function')uiRenderFavorites();
 for(const tab of window.clgGetWorkTabs?.()||[]){if(tab.pageId!==PAGE)continue;
  try{tab.frame.contentWindow.dispatchEvent(new Event('cm-access-revoked'));}catch{}
  tab.frame.removeAttribute('srcdoc');tab.frame.src='about:blank';
 }
}
async function refresh(){
 if(busy)return;busy=true;const token=generation;
 try{const next=await access();if(token!==generation)return;
  if(current&&current.userId!==next.userId){invalidate();return;}
  const changed=!current;current=next;
  if(changed){renderMenu();if(typeof uiRenderFavorites==='function')uiRenderFavorites();}
 }catch{if(token===generation)invalidate();}finally{busy=false;}
}
window.addEventListener('clg-auth-ready',()=>{invalidate();refresh();});
window.addEventListener('clg-auth-logout',invalidate);
window.addEventListener('pagehide',invalidate);
setInterval(refresh,60000);refresh();
})();
