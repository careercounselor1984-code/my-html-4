const isWork24Tab=url=>{try{const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='work24.go.kr'||u.hostname.endsWith('.work24.go.kr'));}catch{return false;}};
const FIELD_ORDER=[
 ['name','이름'],['birthDate','생년월일'],['phone','휴대전화번호'],['iapNo','IAP번호'],['jobCertNo','구직인증번호'],['jobCertExpire','구직인증 만료일'],['type','유형구분'],['progress','진행상태'],['recognitionDate','인정일'],['assignmentDate','배정일'],['initialCounselDate','초기상담일'],['noticeReceivedDate','인정통지를 받은날'],['iapDate','IAP 수립일'],['centerCounselor','관할센터/담당자'],['svcEnd','취업지원서비스 만료일'],['visitStart','재진단 기간 시작'],['visitEnd','재진단 기간 만료']
];
const $=id=>document.getElementById(id);
let lastData=null;
const COUNSEL_KEY='clgBasicToCounselPendingV111';
function setStatus(msg,kind=''){ $('status').textContent=msg; $('status').className='status'+(kind?` ${kind}`:''); }
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function displayValue(d,k){
  if(k==='iapDate' && d?._validation?.iapDateStatus==='미확정'){
    const raw=d._validation.iapDateRaw||'';
    return raw ? `미확정 (화면값: ${raw})` : '미확정';
  }
  return d[k]||'미인식';
}
function isEmptyValue(d,k){
  if(k==='iapDate' && d?._validation?.iapDateStatus==='미확정') return false;
  return !d[k];
}
function render(d){ $('result').innerHTML=FIELD_ORDER.map(([k,l])=>`<div class="row"><div class="label">${esc(l)}</div><div class="value ${isEmptyValue(d,k)?'empty':''}">${esc(displayValue(d,k))}</div></div>`).join(''); $('result').classList.add('show'); }

async function ensureContentScript(tabId, frameId){
  try{
    await chrome.tabs.sendMessage(tabId,{type:'GUKCHWI_PING'},{frameId});
    return true;
  }catch{}
  try{
    await chrome.scripting.executeScript({target:{tabId,frameIds:[frameId]},files:['basic_content.js']});
    return true;
  }catch{return false;}
}

$('readBtn').addEventListener('click',async()=>{
  $('readBtn').disabled=true; $('copyBtn').disabled=true; $('sendCounselBtn').disabled=true; setStatus('현재 화면의 프레임을 확인하고 있습니다…');
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.id) throw new Error('현재 탭을 찾지 못했습니다.');
    if(!isWork24Tab(tab.url||'')) throw new Error('Work24 전산 화면 탭에서 실행해 주세요.');

    let frames=[];
    try{frames=await chrome.webNavigation.getAllFrames({tabId:tab.id})||[];}catch{}
    if(!frames.length) frames=[{frameId:0,url:tab.url}];

    const results=[];
    for(const f of frames){
      const injected=await ensureContentScript(tab.id,f.frameId);
      if(!injected){ results.push({frameId:f.frameId,url:f.url,error:'스크립트 접근 불가'}); continue; }
      try{
        const r=await chrome.tabs.sendMessage(tab.id,{type:'GUKCHWI_EXTRACT_BASICINFO'},{frameId:f.frameId});
        results.push({frameId:f.frameId,url:f.url,result:r});
      }catch(e){results.push({frameId:f.frameId,url:f.url,error:String(e?.message||e)});}
    }

    const score=x=>(x.result?.data?.name?1000:0)+(x.result?.data?.iapNo?500:0)+(x.result?.found||0);
    const candidates=results.filter(x=>x.result).sort((a,b)=>score(b)-score(a));
    const best=candidates[0];
    const dbg=results.map(x=>{
      const d=x.result?.debug;
      return `frame ${x.frameId}\nURL: ${x.url||d?.url||'-'}\n찾은 항목: ${x.result?.found??0}\n기본정보 글자: ${d?.hasBasicText?'있음':'없음'}\nbody 글자수: ${d?.bodyChars??'-'}\ninput 수: ${d?.inputs??'-'}${x.error?`\n오류: ${x.error}`:''}`;
    }).join('\n\n');
    $('debug').textContent=dbg || '프레임 정보를 가져오지 못했습니다.';

    if(!best || !best.result?.ok){
      throw new Error(`기본정보 값을 아직 찾지 못했습니다. (확인한 프레임 ${frames.length}개) 아래 '진단 정보 보기' 내용도 함께 캡처해 주세요.`);
    }
    lastData=best.result.data; render(lastData); $('copyBtn').disabled=false; $('sendCounselBtn').disabled=false;
    setStatus(`✓ ${best.result.found}/${FIELD_ORDER.length}개 항목을 읽었습니다.`, 'ok');
  }catch(e){lastData=null;$('result').classList.remove('show');$('result').innerHTML='';setStatus(`읽기 실패: ${e.message||e}`,'err');}
  finally{$('readBtn').disabled=false;}
});

$('copyBtn').addEventListener('click',async()=>{if(!lastData)return; const t=FIELD_ORDER.map(([k,l])=>`${l}: ${displayValue(lastData,k)}`).join('\n'); try{await navigator.clipboard.writeText(t);setStatus('✓ 결과를 복사했습니다.','ok');}catch{setStatus('복사하지 못했습니다.','err');}});
$('clearBtn').addEventListener('click',()=>{lastData=null;$('result').classList.remove('show');$('result').innerHTML='';$('copyBtn').disabled=true;$('sendCounselBtn').disabled=true;$('debug').textContent='아직 실행하지 않았습니다.';setStatus('비웠습니다. 다시 읽기를 눌러주세요.');});


$('sendCounselBtn').addEventListener('click', async()=>{
  if(!lastData) return;
  if(!lastData.name){setStatus('이름을 읽지 못해 전송을 중단했습니다. 해당 참여자의 기본정보를 펼친 뒤 다시 읽어주세요.','err');return;}
  const payload={
    source:'Work24 기본정보',
    bridgeVersion:1,
    sentAt:new Date().toISOString(),
    name:lastData.name||'',
    birthDate:lastData.birthDate||'',
    phone:lastData.phone||'',
    iapNo:lastData.iapNo||'',
    type:lastData.type||'',
    progress:lastData.progress||'',
    recognitionDate:lastData.recognitionDate||'',
    initialCounselDate:lastData.initialCounselDate||'',
    noticeReceivedDate:lastData.noticeReceivedDate||'',
    assignmentDate:lastData.assignmentDate||'',
    iapDate:lastData.iapDate||'',
    jobCertNo:lastData.jobCertNo||'',
    jobCertExpire:lastData.jobCertExpire||'',
    centerCounselor:lastData.centerCounselor||'',
    svcEnd:lastData.svcEnd||'',
    visitStart:lastData.visitStart||'',
    visitEnd:lastData.visitEnd||'',
    _validation:lastData._validation||{}
  };
  const sendBtn=$('sendCounselBtn');
  const originalText=sendBtn?.textContent||'상담일지 통합본으로 보내기';
  try{
    if(sendBtn){sendBtn.disabled=true;sendBtn.textContent='전달 중…';}
    await chrome.storage.local.set({[COUNSEL_KEY]:payload});
    const saved=await chrome.storage.local.get(COUNSEL_KEY);
    const actual=saved?.[COUNSEL_KEY];
    if(!actual || actual.sentAt!==payload.sentAt) throw new Error('저장 확인 실패');
    try{await chrome.runtime.sendMessage({type:'CLG_COUNSEL_REFRESH_PENDING'});}catch(e){}
    if(sendBtn)sendBtn.textContent='✓ 전달 완료';
    setStatus('✓ 상담일지 전달 완료 · 통합본 미니바에 기본정보가 바로 표시됩니다.','ok');
    setTimeout(()=>{if(sendBtn){sendBtn.disabled=false;sendBtn.textContent=originalText;}},1400);
  }catch(e){
    if(sendBtn){sendBtn.disabled=false;sendBtn.textContent='전달 실패 · 다시 시도';}
    setStatus(`전달 실패: ${e?.message||e}`,'err');
    setTimeout(()=>{if(sendBtn)sendBtn.textContent=originalText;},2200);
  }

});
