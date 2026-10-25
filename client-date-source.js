/* Keep only the date needed by the owner-scoped client calendar. */
(()=>{'use strict';const MARKER='CLG_COUNSEL_BRIDGE_V113',PREFIX='goodjob_client_basic_dates_v1:';let owner='';
const email=()=>{try{return window.clgJobArchiveClient?.()?String(window.__CLG_JOURNAL_EMPLOYEE?.email||'').trim().toLowerCase():''}catch{return ''}};
const valid=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
function request(){const next=email();if(owner&&owner!==next)try{localStorage.removeItem(PREFIX+owner)}catch{}owner=next;if(owner)window.postMessage({marker:MARKER,type:'REQUEST_PENDING'},location.origin)}
window.addEventListener('message',e=>{if(e.source!==window||e.origin!==location.origin||e.data?.marker!==MARKER||e.data.type!=='PENDING_STATE')return;const account=email(),p=e.data.payload?.basic;if(!account||!p)return;const age=Date.now()-Date.parse(p.sentAt),reg=String(p.iapNo||'').replace(/\s/g,'').toLowerCase(),date=String(p.jobCertExpire||'');if(!reg||reg.length>100||!valid(date)||!Number.isFinite(age)||age< -300000||age>86400000)return;
 try{const key=PREFIX+account,db=JSON.parse(localStorage.getItem(key)||'{"records":{}}');db.records=db.records&&typeof db.records==='object'?db.records:{};for(const [id,r]of Object.entries(db.records))if(!Number.isFinite(Date.parse(r.seenAt))||Date.now()-Date.parse(r.seenAt)>86400000)delete db.records[id];if(db.records[reg]?.jobCertExpire===date)return;db.records[reg]={regNo:reg,jobCertExpire:date,source:'helper',sourceAt:p.sentAt,seenAt:new Date().toISOString()};localStorage.setItem(key,JSON.stringify({version:1,records:db.records}));owner=account;}catch{}
});
window.addEventListener('clg-auth-ready',request);window.addEventListener('clg-auth-logout',()=>{if(owner)try{localStorage.removeItem(PREFIX+owner)}catch{}owner=''});if(email())request();
})();
