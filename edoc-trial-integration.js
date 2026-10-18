
(function(){
  'use strict';
  const PAGE='p36', API='https://bowxlaiyjxknqccoughl.supabase.co/functions/v1/training-edoc-trial-access';
  let access=false,token='',pending=null,round=0;
  function currentClient(){try{return window.clgJobArchiveClient?.()||null;}catch(_){return null;}}
  function frame(){return document.getElementById('frame');}
  async function validate(){
    const my=++round,client=currentClient();
    access=false;token='';
    if(!client){revoke();return false;}
    try{
      const {data,error}=await client.auth.getSession();
      const jwt=data?.session?.access_token;
      if(error||!jwt)throw Error('로그인이 필요합니다.');
      const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+jwt,'apikey':'sb_publishable_H_OzeWaIff410mkxFD6NGQ_kiHNm8Ha'},body:'{}',cache:'no-store'});
      const result=await response.json();
      if(my!==round)return false;
      if(!response.ok||result.allowed!==true)throw Error('북부센터 전용 기능입니다.');
      token=jwt;access=true;activate();return true;
    }catch(_){if(my===round)revoke();return false;}
  }
  function activate(){
    if(!PAGES.some(p=>p.id===PAGE))PAGES.push({id:PAGE,title:'공문 · 북부센터 시험',url:'./edoc-trial.html'});
    let group=MENU.find(g=>g.id==='g_edoc_trial');
    if(!group){group={id:'g_edoc_trial',title:'공문',open:true,items:[]};MENU.push(group);}
    if(!group.items.some(i=>i.pageId===PAGE))group.items.push({pageId:PAGE,label:'공문 작성 (북부센터 시험)'});
    group.items.forEach(i=>{if(i.pageId===PAGE)i.hidden=false;});
    if(typeof renderMenu==='function')renderMenu();
    addCardAction();
  }
  function revoke(){
    access=false;token='';
    for(const group of MENU){if(group.id==='g_edoc_trial')group.items=group.items.filter(i=>i.pageId!==PAGE);}
    const place=document.getElementById('clgEdocFromTraining');if(place)place.remove();
    if(typeof activePageId!=='undefined'&&activePageId===PAGE && typeof loadPage==='function')loadPage('p13');
    if(typeof renderMenu==='function')renderMenu();
  }
  function val(d,id){return d.getElementById(id)?.value?.trim()||'';}
  function addCardAction(){
    if(!access||typeof activePageId==='undefined'||activePageId!=='p13')return;
    const f=frame(),d=f?.contentDocument;if(!d||d.getElementById('clgEdocFromTraining'))return;
    const anchor=d.getElementById('clgTrainingHelper')||d.getElementById('clgTrCourse')?.closest('section')||d.body?.firstElementChild;
    if(!anchor)return;
    const box=d.createElement('div');box.id='clgEdocFromTraining';box.style.cssText='margin:12px 0;padding:13px 14px;border:1px solid #bdd3ed;background:#f0f6ff;border-radius:10px;font-family:Malgun Gothic,sans-serif;font-size:13px;color:#284362';
    const button=d.createElement('button');button.type='button';button.textContent='공문으로 가져가기 →';button.style.cssText='background:#215fae;color:#fff;border:0;border-radius:7px;padding:10px 14px;font-size:13px;font-weight:700;cursor:pointer;';
    const note=d.createElement('div');note.textContent='북부센터 시험 기능 · 입력한 훈련과정 정보를 공문에 전달합니다. 내담자 인적사항은 공문에서 확인하세요.';note.style.cssText='margin-top:6px;font-size:11px;color:#5d718b';
    box.append(button,note);anchor.parentNode.insertBefore(box,anchor.nextSibling);
    button.addEventListener('click',async()=>{
      const data={kind:'NATIONAL_TRAINING_CARD',iap:val(d,'clgIapRegNo'),desiredJob:val(d,'desiredJob'),course:{title:val(d,'clgTrCourse')||val(d,'nextCourse'),institution:val(d,'clgTrOrg'),phone:val(d,'clgTrTel'),startDate:val(d,'clgTrCourseStart'),endDate:val(d,'clgTrCourseEnd')},previousCourse:val(d,'currentCourse'),counselDate:val(d,'cDate'),createdAt:new Date().toISOString()};
      const noData=!data.iap&&!data.course.title&&!data.course.institution;
      if(noData && !confirm('공문으로 전달할 훈련과정 정보가 없습니다. 빈 공문으로 이동할까요?'))return;
      if(!await validate()){alert('북부센터 직원 로그인 확인이 필요합니다.');return;}
      pending=data;
      if(typeof loadPage==='function')loadPage(PAGE);
    });
  }
  async function deliver(){
    const f=frame();if(!f||typeof activePageId==='undefined'||activePageId!==PAGE)return;
    if(!await validate())return;
    const dst=f.contentWindow;if(!dst)return;
    dst.postMessage({marker:'GOODJOB_EDOC_TRIAL',type:'AUTHORIZE',token},location.origin);
    if(pending){
      dst.postMessage({marker:'GOODJOB_EDOC_TRIAL',type:'IMPORT',payload:pending},location.origin);
      pending=null;
    }
  }
  window.addEventListener('clg-auth-ready',()=>{void validate()});
  window.addEventListener('clg-auth-logout',()=>{round++;revoke()});
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>void validate(),350)});
  window.addEventListener('load',()=>{setTimeout(()=>void validate(),800)});
  frame()?.addEventListener('load',()=>{
    if(typeof activePageId!=='undefined'&&activePageId===PAGE)void deliver();
    else setTimeout(addCardAction,100);
  });
  window.addEventListener('clg-page-change',()=>setTimeout(addCardAction,200));
})();
