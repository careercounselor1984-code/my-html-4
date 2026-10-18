/* 좋은일자리 상담일지 통합본 · 북부센터 전용 공문 시험 v1.1
 * 공문 전체는 로그인 및 북부센터 소속 검증 뒤에만 서버에서 내려받습니다.
 * 기존 상담 페이지 구성/데이터는 그대로 유지합니다.
 */
(()=>{
'use strict';
const ID='p_north_edoc_trial', GROUP='g_north_trial';
const CHECK='https://bowxlaiyjxknqccoughl.supabase.co/functions/v1/training-edoc-trial-access';
const APP='https://bowxlaiyjxknqccoughl.supabase.co/functions/v1/training-edoc-trial-app';
let enabled=false,verifyRun=0,openRun=0,pending=null;
const frame=()=>document.getElementById('frame');
const ready=()=>typeof PAGES!=='undefined'&&Array.isArray(PAGES)&&typeof MENU!=='undefined'&&Array.isArray(MENU);
const onTraining=()=>typeof activePageId!=='undefined'&&activePageId==='p13';
const originalLoadPage=typeof loadPage==='function'?loadPage:null;
async function token(){
 const cli=window.clgJobArchiveClient?.();
 const result=await cli?.auth?.getSession?.();
 return result?.data?.session?.access_token||'';
}
async function allowed(){
 try{
  const jwt=await token();if(!jwt)return false;
  const r=await fetch(CHECK,{method:'POST',headers:{Authorization:'Bearer '+jwt,'Content-Type':'application/json'},body:'{}',cache:'no-store'});
  const x=await r.json();return r.ok&&x.allowed===true;
 }catch(e){return false;}
}
function enableMenu(){
 if(!ready())return;
 if(!PAGES.some(p=>p.id===ID))PAGES.push({id:ID,title:'공문 작성 (북부센터 시험)',b64:''});
 let g=MENU.find(g=>g.id===GROUP);
 if(!g){g={id:GROUP,title:'공문',open:true,items:[]};MENU.push(g);}
 if(!g.items.some(x=>x.pageId===ID))g.items.push({pageId:ID,label:'공문 작성 · 시험'});
 renderMenu();
}
function disableMenu(){
 enabled=false;pending=null;openRun++;
 if(!ready())return;
 MENU=MENU.filter(g=>g.id!==GROUP);
 const i=PAGES.findIndex(p=>p.id===ID);if(i>=0)PAGES.splice(i,1);
 if(activePageId===ID&&originalLoadPage)originalLoadPage('p13');
 renderMenu();
}
function fromTraining(){
 let doc;try{doc=frame()?.contentDocument}catch(e){return {}}
 const val=id=>String(doc?.getElementById(id)?.value||'').trim();
 return Object.fromEntries(Object.entries({
  iapNumber:val('clgIapRegNo'),course:val('clgTrCourse')||val('nextCourse'),
  institution:val('clgTrOrg'),phone:val('clgTrTel'),
  startDate:val('clgTrCourseStart'),endDate:val('clgTrCourseEnd')
 }).filter(([,v])=>v));
}
function addButton(){
 if(!enabled||!onTraining())return;
 let doc;try{doc=frame()?.contentDocument}catch(e){return}
 if(!doc||doc.getElementById('northEdocFromTraining'))return;
 const where=doc.getElementById('clgTrainingHelper')||doc.querySelector('main')||doc.body;
 if(!where)return;
 const b=doc.createElement('button');
 b.id='northEdocFromTraining';b.type='button';b.textContent='공문으로 작성 (북부센터 시험)';
 b.style.cssText='display:inline-flex;align-items:center;justify-content:center;margin:10px 0;padding:9px 13px;border:0;border-radius:8px;background:#245d9e;color:white;cursor:pointer;font:700 13px sans-serif';
 b.addEventListener('click',()=>{if(!enabled)return;pending=fromTraining();loadPage(ID);});
 where.prepend(b);
}
const splash=(title,desc)=>{
 const escaped=(s)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
 return '<!doctype html><html lang="ko"><meta charset="utf-8"><style>body{font:14px sans-serif;background:#f5f7fb;padding:40px;color:#234}main{background:white;border:1px solid #dde6f2;border-radius:12px;max-width:480px;margin:30px auto;padding:25px}</style><main><strong>'+escaped(title)+'</strong><p>'+escaped(desc)+'</p></main></html>';
};
async function openDocument(){
 const view=frame();if(!view||!enabled)return;
 const serial=++openRun;
 view.dataset.external='0';view.removeAttribute('src');
 view.srcdoc=splash('공문 시험 화면 불러오는 중','북부센터 계정 접근 권한을 확인하고 있어.');
 document.getElementById('currentTitle').textContent='공문 작성 (북부센터 시험)';
 setActive(ID);
 try{
  const jwt=await token();if(!jwt)throw Error('통합본 로그인이 필요해.');
  const r=await fetch(APP,{method:'POST',headers:{Authorization:'Bearer '+jwt,'Content-Type':'application/json'},body:'{}',cache:'no-store'});
  if(!r.ok)throw Error(r.status===403?'북부센터 직원만 사용할 수 있어.':'공문을 불러오지 못했어.');
  const html=await r.text();
  if(serial!==openRun||!enabled||activePageId!==ID)return;
  if(!html.startsWith('<!DOCTYPE html>')&&!html.startsWith('<!doctype html>'))throw Error('공문 화면 응답이 올바르지 않아.');
  view.srcdoc=html;
 }catch(e){
  if(serial!==openRun||activePageId!==ID)return;
  view.srcdoc=splash('공문 열기 실패',String(e?.message||e));
 }
}
if(originalLoadPage){
 loadPage=function(pageId){
  if(pageId===ID){if(enabled)void openDocument();return}
  openRun++;return originalLoadPage(pageId);
 };
}
async function authorize(){
 const n=++verifyRun;
 const yes=await allowed();
 if(n!==verifyRun)return;
 if(!yes){disableMenu();return}
 enabled=true;enableMenu();addButton();
}
function logout(){verifyRun++;disableMenu()}
window.addEventListener('clg-auth-ready',()=>void authorize());
window.addEventListener('clg-auth-logout',logout);
window.addEventListener('clg-page-change',e=>{if(e.detail?.pageId==='p13')setTimeout(addButton,200)});
frame()?.addEventListener('load',()=>{if(onTraining())addButton()});
window.addEventListener('message',event=>{
 if(!enabled||event.origin!==location.origin||event.source!==frame()?.contentWindow)return;
 if(event.data?.type==='GOODJOB_EDOC_READY_V1'){
  const d=pending||{};pending=null;
  frame().contentWindow.postMessage({type:'GOODJOB_EDOC_PREFILL_V1',payload:d},location.origin);
 }
});
if(window.__CLG_JOURNAL_EMPLOYEE)void authorize();
})();
