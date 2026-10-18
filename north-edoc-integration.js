/* 좋은일자리 · 북부센터 공문 시험 · 양방향 내배카 연동 v2 (2026-10-18) */
(()=>{
'use strict';
const PAGE='p_north_edoc_trial',GROUP='g_north_trial';
const BASE='https://bowxlaiyjxknqccoughl.supabase.co/functions/v1/';
const CHECK=BASE+'training-edoc-trial-access',DOC=BASE+'training-edoc-north-html-v2';
let enabled=false,verification=0,opening=0,incoming=null,outgoing=null,officialDraft=null,currentInit=null;
const frame=()=>document.getElementById('frame');
const value=(d,id)=>String(d?.getElementById(id)?.value??'').trim();
const onTraining=()=>typeof activePageId!=='undefined'&&activePageId==='p13';
const onEdoc=()=>typeof activePageId!=='undefined'&&activePageId===PAGE;
const previousLoad=typeof loadPage==='function'?loadPage:null;
const session=async()=>{const c=window.clgJobArchiveClient?.();if(!c)return null;return (await c.auth.getSession())?.data?.session||null};
function showMenu(){
 if(typeof PAGES==='undefined'||typeof MENU==='undefined')return;
 if(!PAGES.some(p=>p.id===PAGE))PAGES.push({id:PAGE,title:'공문 (북부센터 시험)',b64:''});
 let group=MENU.find(g=>g.id===GROUP);
 if(!group){group={id:GROUP,title:'공문',open:true,items:[]};MENU.push(group)}
 if(!group.items.some(i=>i.pageId===PAGE))group.items.push({pageId:PAGE,label:'📄 공문 작성 · 시험'});
 renderMenu();
}
function hideMenu(){
 enabled=false;opening++;incoming=null;outgoing=null;officialDraft=null;
 if(typeof MENU!=='undefined')MENU=MENU.filter(g=>g.id!==GROUP);
 if(typeof PAGES!=='undefined'){const i=PAGES.findIndex(p=>p.id===PAGE);if(i>=0)PAGES.splice(i,1)}
 if(onEdoc()&&previousLoad)previousLoad('p13');
 if(typeof renderMenu==='function')renderMenu();
}
async function isNorth(){
 try{
  const s=await session();if(!s?.access_token)return false;
  const r=await fetch(CHECK,{method:'POST',headers:{'Content-Type':'application/json',authorization:'Bearer '+s.access_token},body:'{}',cache:'no-store'});
  const data=await r.json();return r.ok&&data.ok===true&&data.allowed===true&&data.team==='북부센터'&&data.division==='국민취업지원사업부';
 }catch(_){return false}
}
async function authorize(){
 const run=++verification,yes=await isNorth();
 if(run!==verification)return;
 if(!yes){hideMenu();return}
 enabled=true;showMenu();injectButton();
}
function snapshot(){
 const doc=frame()?.contentDocument;
 return {iap:value(doc,'clgIapRegNo'),course:{
  title:value(doc,'clgTrCourse')||value(doc,'nextCourse'),
  institution:value(doc,'clgTrOrg'),phone:value(doc,'clgTrTel'),
  startDate:value(doc,'clgTrCourseStart'),endDate:value(doc,'clgTrCourseEnd')
 }};
}
function injectButton(){
 if(!enabled||!onTraining())return;
 let doc;try{doc=frame()?.contentDocument}catch(_){return}
 if(!doc||doc.getElementById('northEdocFromTraining'))return;
 const b=doc.createElement('button');b.id='northEdocFromTraining';b.type='button';
 b.textContent='📄 훈련정보로 공문 작성 (북부센터 시험)';
 b.style.cssText='display:block;margin:10px 0;padding:10px 13px;border:1px solid #a3c1e5;border-radius:8px;background:#eaf3ff;color:#194c83;font:700 13px Malgun Gothic,sans-serif;cursor:pointer';
 b.addEventListener('click',()=>{incoming=snapshot();loadPage(PAGE)});
 (doc.getElementById('clgTrainingHelper')||doc.body).prepend(b);
}
function preserve(){
 if(!onEdoc())return;
 try{officialDraft=frame()?.contentWindow?.GoodJobEdoc?.exportData?.()||officialDraft}catch(_){}
}
function safePage(){
 return '<!doctype html><html lang="ko"><meta charset="utf-8"><body style="font:14px Malgun Gothic,sans-serif;background:#f3f7fc;padding:35px;color:#263950"><div style="margin:0 auto;max-width:540px;padding:24px;background:white;border:1px solid #dde7f3;border-radius:12px">북부센터 공문 시험 기능을 불러오는 중입니다.</div></body></html>';
}
async function open(){
 if(!enabled)return;
 const serial=++opening,view=frame();if(!view)return;
 const s=await session();if(!s?.access_token){hideMenu();return}
 view.dataset.external='0';view.removeAttribute('src');view.srcdoc=safePage();
 document.getElementById('currentTitle').textContent='공문 (북부센터 시험)';
 const bc=document.getElementById('breadcrumbTitle');if(bc)bc.textContent='공문 (북부센터 시험)';
 setActive(PAGE);
 try{
  const r=await fetch(DOC,{method:'POST',headers:{'Content-Type':'application/json',authorization:'Bearer '+s.access_token},body:'{}',cache:'no-store'});
  if(!r.ok)throw Error(r.status===403?'북부센터 직원만 사용할 수 있습니다.':'공문을 불러오지 못했습니다. ('+r.status+')');
  const html=await r.text();
  if(serial!==opening||!onEdoc()||!enabled)return;
  if(!html.includes('gjNorthEdocGateRuntime')||!html.includes('GoodJobEdoc'))throw Error('공문 파일이 완전하지 않습니다.');
  const carry=incoming;incoming=null;
  const sendInit=()=>{
   if(serial!==opening||!enabled||!onEdoc())return;
   try{
    if(!view.contentDocument?.getElementById('gjNorthAccessGate'))return;
    view.contentWindow?.postMessage({type:'gj:north-edoc:init',authorized:true,carryIn:carry,draft:officialDraft},location.origin);
   }catch(e){console.warn('[북부 공문] 승인 신호 재전송 대기',e)}
  };
  currentInit=sendInit;
  view.addEventListener('load',sendInit,{once:true});
  view.srcdoc=html;
  [160,400,850,1500,2800].forEach(ms=>setTimeout(()=>{
    if(serial!==opening)return;
    try{if(!view.contentDocument?.documentElement?.classList.contains('gjNorthApproved'))sendInit()}catch(_){}
  },ms));
 }catch(e){
  if(serial!==opening||!onEdoc())return;
  view.srcdoc='<!doctype html><html lang="ko"><meta charset="utf-8"><body style="font:14px Malgun Gothic,sans-serif;padding:30px;color:#934"><h3>공문 열기 실패</h3><p>'+String(e.message||e).replaceAll('<','&lt;')+'</p></body></html>';
 }
}
function returnToTraining(){
 if(!onEdoc()||!enabled)return;
 try{
  const data=frame()?.contentWindow?.GoodJobEdoc?.exportData?.()||{};
  officialDraft=data;
  const person=data.people?.[data.activeIndex||0]||{};
  const c=person.courses?.primary||{};
  outgoing={iap:person.iap||'',course:{
   title:c.title||'',institution:c.institution||'',phone:c.phone||'',
   startDate:c.startDate||'',endDate:c.endDate||''
  }};
 }catch(_){outgoing=null}
 loadPage('p13');
}
function applyReturn(){
 if(!enabled||!onTraining()||!outgoing)return;
 let doc;try{doc=frame()?.contentDocument}catch(_){return}
 if(!doc?.getElementById('clgTrCourse'))return;
 const a=outgoing;outgoing=null;
 const fields={clgTrCourse:a.course.title,clgTrOrg:a.course.institution,clgTrTel:a.course.phone,clgTrCourseStart:a.course.startDate,clgTrCourseEnd:a.course.endDate};
 for(const [id,raw] of Object.entries(fields)){
  const input=doc.getElementById(id),v=String(raw||'').trim();
  if(!input||!v)continue;
  input.value=v.slice(0,250);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
 }
 const iap=doc.getElementById('clgIapRegNo');
 if(iap&&!value(doc,'clgIapRegNo')&&a.iap){iap.value=String(a.iap).slice(0,250);iap.dispatchEvent(new Event('input',{bubbles:true}))}
 try{frame()?.contentWindow?.generate?.()}catch(_){}
 injectButton();
 const status=doc.getElementById('northEdocFromTraining');
 if(status){let note=doc.getElementById('northEdocReturnStatus');if(!note){note=doc.createElement('div');note.id='northEdocReturnStatus';status.after(note)}note.style.cssText='font-size:12px;color:#187245;margin:5px 0';note.textContent='공문에서 선택한 훈련정보를 반영했습니다. 저장 전 확인해 주세요.'}
}
if(previousLoad){
 loadPage=function(id){
  if(id===PAGE){if(enabled)void open();return}
  preserve();opening++;return previousLoad(id);
 };
}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==frame()?.contentWindow||!enabled)return;
 if(e.data?.type==='gj:north-edoc:ready'&&onEdoc()){currentInit?.();return}
 if(e.data?.type==='gj:north-edoc:return')returnToTraining();
});
frame()?.addEventListener('load',()=>{if(onTraining())setTimeout(()=>{injectButton();applyReturn()},50)});
window.addEventListener('clg-page-change',e=>{if(e.detail?.pageId==='p13')setTimeout(()=>{injectButton();applyReturn()},110)});
window.addEventListener('clg-auth-ready',()=>{void authorize()});
window.addEventListener('clg-auth-logout',()=>{verification++;hideMenu()});
if(window.__CLG_JOURNAL_EMPLOYEE)void authorize();
})();