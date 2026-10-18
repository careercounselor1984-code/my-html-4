/* 좋은일자리 상담일지 통합본 · 북부센터 전용 공문 시험 v1.4
 * 공문 전체는 로그인 및 북부센터 소속 검증 뒤에만 서버에서 내려받습니다.
 * 기존 상담 페이지 구성/데이터는 그대로 유지합니다.
 */
(()=>{
'use strict';
const ID='p_north_edoc_trial', GROUP='g_north_trial';
const CHECK='https://bowxlaiyjxknqccoughl.supabase.co/functions/v1/training-edoc-trial-access';
const APP='https://bowxlaiyjxknqccoughl.supabase.co/functions/v1/training-edoc-trial-document';
let enabled=false,verifyRun=0,openRun=0,pending=null,fromOfficial=null;
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
  const payload=pending||{};pending=null;
  const sync=()=>{
   if(serial!==openRun||activePageId!==ID)return;
   let doc;try{doc=view.contentDocument}catch(e){}
   if(!doc?.querySelector('[data-course="title"]'))return;
   const map={iapNumber:'#iapLookup',course:'[data-course="title"]',institution:'[data-course="institution"]',phone:'[data-course="phone"]',startDate:'[data-course="startDate"]',endDate:'[data-course="endDate"]'};
   for(const [key,selector] of Object.entries(map)){
    const value=String(payload[key]||'').trim();if(!value)continue;
    const el=doc.querySelector(selector);if(!el)continue;
    el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
   }
   // The official document keeps its own data model; update that too.
   try{
     const bridge=view.contentWindow?.GOODJOB_V19_PATCH;
     if(bridge&&Object.keys(payload).length){
       const c={};
       for(const [src,dest] of [['course','title'],['institution','institution'],['phone','phone'],['startDate','startDate'],['endDate','endDate']]){
         if(payload[src])c[dest]=String(payload[src]).slice(0,250);
       }
       if(payload.iapNumber)bridge.person({iap:String(payload.iapNumber).slice(0,250)});
       if(Object.keys(c).length)bridge.course(c);
     }
   }catch(e){}
   addReturnButton();
  };
  view.addEventListener('load',sync,{once:true});
  view.srcdoc=html;
  setTimeout(sync,400);
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

function addReturnButton(){
 if(!enabled||activePageId!==ID)return;
 let doc,win;try{doc=frame()?.contentDocument;win=frame()?.contentWindow}catch(e){return}
 if(!doc||doc.getElementById('northEdocBackToCounsel'))return;
 const host=doc.querySelector('.top-tools')||doc.querySelector('.top')||doc.body;
 if(!host)return;
 const btn=doc.createElement('button');btn.id='northEdocBackToCounsel';btn.type='button';
 btn.textContent='← 국민내일배움카드 상담일지';
 btn.title='선택한 훈련과정을 상담일지로 가져갑니다';
 btn.style.cssText='border:1px solid #90b4df;border-radius:8px;background:#edf5ff;color:#194a83;padding:9px 12px;font:700 12px sans-serif;cursor:pointer;';
 btn.addEventListener('click',()=>{
   const p=win?.GOODJOB_TRAINING_V14?.getActive?.()||{};
   const c=p.courses?.primary||{};
   const v=(k,selector)=>String(c[k]||doc.querySelector(selector)?.value||'').trim().slice(0,250);
   fromOfficial={
     course:v('title','[data-course="title"]'),
     institution:v('institution','[data-course="institution"]'),
     phone:v('phone','[data-course="phone"]'),
     startDate:v('startDate','[data-course="startDate"]'),
     endDate:v('endDate','[data-course="endDate"]'),
     iapNumber:String(p.iap||doc.getElementById('iapLookup')?.value||'').trim().slice(0,250)
   };
   loadPage('p13');
 });
 host.prepend(btn);
}
function applyFromOfficial(){
 if(!enabled||!onTraining()||!fromOfficial)return;
 let doc;try{doc=frame()?.contentDocument}catch(e){return}
 if(!doc||!doc.getElementById('clgTrCourse'))return;
 const data=fromOfficial;fromOfficial=null;
 const fields={clgTrCourse:data.course,clgTrOrg:data.institution,clgTrTel:data.phone,clgTrCourseStart:data.startDate,clgTrCourseEnd:data.endDate,clgIapRegNo:data.iapNumber};
 for(const [id,value] of Object.entries(fields)){
   if(!value)continue;
   const input=doc.getElementById(id);if(!input)continue;
   input.value=value.slice(0,250);
   input.dispatchEvent(new Event('input',{bubbles:true}));
   input.dispatchEvent(new Event('change',{bubbles:true}));
 }
 try{frame()?.contentWindow?.generate?.()}catch(e){}
 const b=doc.getElementById('northEdocFromTraining');
 if(b){const info=doc.createElement('span');info.textContent='공문에서 선택한 훈련과정을 불러왔어. 저장 전에 확인해 줘.';info.style.cssText='display:block;color:#216e49;font-size:12px;margin:4px 0';b.after(info);}
}

async function authorize(){
 const n=++verifyRun;
 const yes=await allowed();
 if(n!==verifyRun)return;
 if(!yes){disableMenu();return}
 enabled=true;enableMenu();addButton();
}
function logout(){verifyRun++;fromOfficial=null;disableMenu()}
window.addEventListener('clg-auth-ready',()=>void authorize());
window.addEventListener('clg-auth-logout',logout);
window.addEventListener('clg-page-change',e=>{if(e.detail?.pageId==='p13')setTimeout(()=>{addButton();applyFromOfficial()},200)});
frame()?.addEventListener('load',()=>{if(onTraining()){addButton();setTimeout(applyFromOfficial,60)}else if(activePageId===ID)setTimeout(addReturnButton,60)});
window.addEventListener('message',event=>{
 if(!enabled||event.origin!==location.origin||event.source!==frame()?.contentWindow)return;
 if(event.data?.type==='GOODJOB_EDOC_READY_V1'){
  const d=pending||{};pending=null;
  frame().contentWindow.postMessage({type:'GOODJOB_EDOC_PREFILL_V1',payload:d},location.origin);
 }
});
if(window.__CLG_JOURNAL_EMPLOYEE)void authorize();
})();
