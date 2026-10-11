/* 좋은일자리 상담일지 통합본: PC Web Push 연결.
   상담일정표 iframe의 기존 직원 인증을 재사용하며 토큰은 전달하지 않습니다. */
(()=>{
 'use strict';
 if(window.__CLG_JOURNAL_PUSH_V1__)return;
 window.__CLG_JOURNAL_PUSH_V1__=true;
 const ORIGIN='https://careercounselor1984-code.github.io';
 const OWNER_KEY='clg_journal_push_owner_v1';
 const $=id=>document.getElementById(id);
 const bridge=$('clgWorkAlertBridge');
 const btn=$('clgJournalPushToggle');
 const note=$('clgJournalPushStatus');
 if(!bridge||!btn||!note)return;
 let busy=false,enabled=false,employeeName='',pending=new Map(),seq=0,registration=null,needsOpen=false;
 const norm=x=>String(x||'').replace(/\s/g,'').trim();
 const serviceSupported=()=>location.protocol==='https:'&&'serviceWorker' in navigator&&
   'PushManager' in window&&typeof Notification!=='undefined';
 const isSignedIn=()=>Boolean(employeeName)&&!document.documentElement.classList.contains('cc-auth-pending');
 const setNote=(text,isError=false)=>{
   note.textContent=text;note.style.color=isError?'#b42318':'#51677d';
 };
 function render(){
   const ready=isSignedIn(),supported=serviceSupported();
   btn.disabled=busy||!ready||!supported;
   btn.textContent=busy?'알림 설정 중…':enabled?'🔕 이 PC 알림 끄기':'🔔 이 PC 알림 켜기';
   if(!supported)setNote('현재 환경에서는 PC 푸시 알림을 사용할 수 없습니다. 설치한 크롬 앱에서 열어 주세요.',true);
   else if(!ready)setNote('통합본 직원 로그인 후 PC 알림을 설정할 수 있습니다.');
 }
 function request(action,extras={},timeout=12000){
   if(!isSignedIn())return Promise.reject(Error('상담일지 통합본에 먼저 로그인하세요.'));
   if(!bridge.contentWindow)return Promise.reject(Error('상담일정표 연결 화면을 불러오는 중입니다.'));
   const id='jpush-'+(++seq)+'-'+Date.now();
   return new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>{pending.delete(id);reject(Error('일정관리 연결이 지연됩니다. 일정관리 로그인 후 다시 시도해 주세요.'))},timeout);
     pending.set(id,{resolve,reject,timer});
     bridge.contentWindow.postMessage({
       type:'goodjob:journal-push:v1',action,requestId:id,expectedName:employeeName,...extras
     },ORIGIN);
   });
 }
 window.addEventListener('message',event=>{
   if(event.source!==bridge.contentWindow||event.origin!==ORIGIN||event.data?.type!=='goodjob:journal-push-result:v1')return;
   const task=pending.get(String(event.data.requestId||''));
   if(!task)return;
   clearTimeout(task.timer);pending.delete(String(event.data.requestId));
   if(!event.data.ok)task.reject(Error(String(event.data.message||'일정관리 계정 연결 실패')));
   else task.resolve(event.data);
 });
 async function swReady(){
   if(!registration){
     registration=await navigator.serviceWorker.register('./journal-push-sw.js',{scope:'./'});
     await navigator.serviceWorker.ready;
   }
   return registration;
 }
 async function state(){
   if(!serviceSupported()){render();return}
   try{
     const reg=await swReady();
     const sub=await reg.pushManager.getSubscription();
     const owner=norm(localStorage.getItem(OWNER_KEY));
     enabled=Boolean(sub && Notification.permission==='granted'&& owner===norm(employeeName));
     if(sub&&owner&&employeeName&&owner!==norm(employeeName)){
       // A previously registered user's OS notification must not remain on a shared PC.
       await sub.unsubscribe();
       enabled=false;
       localStorage.removeItem(OWNER_KEY);
       setNote('PC 사용 직원이 변경되어 이전 직원의 알림을 해제했습니다.');
     }
   }catch(e){setNote('푸시 상태 확인 실패: '+String(e?.message||e),true)}
   render();
 }
 async function toggle(){
   if(busy||!serviceSupported()||!isSignedIn())return;
   busy=true;render();
   try{
     // Must be requested in direct click gesture, before awaiting the relay.
     const allowed=enabled?'granted':Notification.permission==='granted'?'granted':await Notification.requestPermission();
     if(allowed!=='granted')throw Error('Windows/Chrome 알림 권한이 허용되지 않았습니다. 사이트 알림 설정에서 허용해 주세요.');
     const reg=await swReady();
     let sub=await reg.pushManager.getSubscription();
     if(enabled && sub){
       try{await request('unregister',{endpoint:sub.endpoint})}catch(e){console.warn('서버 구독 해제 지연',e.message)}
       await sub.unsubscribe();enabled=false;localStorage.removeItem(OWNER_KEY);
       setNote('이 PC의 업무 푸시 알림을 껐습니다. 통합본 안의 업무 알림은 계속 사용할 수 있습니다.');
     }else{
       const reply=await request('key');
       if(!/^[A-Za-z0-9_-]{75,110}$/.test(reply.publicKey||''))throw Error('알림 서버 공개키 오류');
       if(!sub){
         const raw=atob(reply.publicKey.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(reply.publicKey.length/4)*4,'='));
         const key=Uint8Array.from(raw,c=>c.charCodeAt(0));
         sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
       }
       try{await request('register',{subscription:sub.toJSON()})}
       catch(error){await sub.unsubscribe().catch(()=>{});throw error}
       localStorage.setItem(OWNER_KEY,norm(employeeName));enabled=true;
       try{
         const t=await request('test',{endpoint:sub.endpoint});
         setNote(t.sent?'PC 알림을 켰습니다. 연결 확인 알림을 발송했습니다.':'PC 알림은 등록됐지만 테스트 수신은 확인되지 않았습니다. Windows 알림 설정을 확인하세요.');
       }catch(e){setNote('PC 알림 등록 완료. 테스트 알림 확인은 잠시 후 다시 시도해 주세요.')}
     }
   }catch(e){setNote('설정 실패: '+String(e?.message||e),true)}
   finally{busy=false;render()}
 }
 btn.addEventListener('click',toggle);
 function signedIn(detail){
   employeeName=String(detail?.name||'').trim();
   render();state().catch(()=>{});
   if(needsOpen && isSignedIn())openAlerts();
 }
 function openAlerts(){
   if(!isSignedIn()){needsOpen=true;return}
   needsOpen=false;
   $('clgWorkAlertMenuBtn')?.click();
   const u=new URL(location.href);
   if(u.searchParams.has('workAlerts')){u.searchParams.delete('workAlerts');history.replaceState(null,'',u.pathname+u.search+u.hash)}
 }
 window.addEventListener('clg-auth-ready',event=>signedIn(event.detail));
 window.addEventListener('clg-auth-logout',()=>{
   const previous=employeeName;
   employeeName='';enabled=false;render();
   // The server will discard stale browser endpoints after a 404/410;
   // immediately revoke the local push subscription to protect a shared PC.
   if(previous)swReady().then(reg=>reg.pushManager.getSubscription()).then(sub=>{
     if(!sub)return;
     const old=previous;
     bridge.contentWindow?.postMessage({
       type:'goodjob:journal-push:v1',action:'unregister',
       requestId:'logout-'+Date.now(),expectedName:old,endpoint:sub.endpoint
     },ORIGIN);
     return sub.unsubscribe().then(()=>localStorage.removeItem(OWNER_KEY));
   }).catch(()=>{});
 });
 if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{
   if(e.data?.type==='clg:open-alert-center')openAlerts();
 });
 const existing=window.__CLG_JOURNAL_EMPLOYEE;
 if(existing?.name)signedIn(existing);
 else render();
 if(new URLSearchParams(location.search).get('workAlerts')==='1'){
   needsOpen=true;if(isSignedIn())openAlerts();
 }
})();
