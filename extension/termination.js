const isWork24Tab=url=>{try{const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='work24.go.kr'||u.hostname.endsWith('.work24.go.kr'));}catch{return false;}};

const $=id=>document.getElementById(id);
let lastData=null;
const COUNSEL_TERMINATION_KEY='clgTerminationToCounselPendingV113';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val=v=>v===0?'0':(v||'미인식');
const money=v=>v||v===0?`${v}원`:'미인식';
function setStatus(msg,kind=''){ $('status').textContent=msg; $('status').className='status'+(kind?` ${kind}`:''); }
function row(label,value,cls=''){const empty=!(value||value===0);return `<div class="row"><div class="label">${esc(label)}</div><div class="value ${empty?'empty':''} ${cls}">${esc(val(value))}</div></div>`;}
function yn(v){return v===true?'일치':v===false?'불일치':'비교불가';}
function ynClass(v){return v===true?'okv':v===false?'bad':'';}

function render(d){
  const ins=d.insurance||{}, cmp=d.compare||{};
  $('result').innerHTML=`
    <section class="card"><div class="cardTitle">취업종료 기본정보</div>
      ${row('종료사유',[d.reason,d.reasonDetail].filter(Boolean).join(' / '))}
      ${row('고용보험 취득신고',d.acquisitionStatus)}
      ${row('종료등록일자',d.endRegistrationDate)}
      ${row('구직마감유형',d.jobCloseType)}
      ${row('알선형태',d.mediationType)}
      ${row('성공수당 지급대상',d.successAllowance)}
    </section>
    <section class="card"><div class="cardTitle">취업처 정보</div>
      ${row('사업장명',d.company)}
      ${row('사업자번호',d.businessNo)}
      ${row('고용보험 관리번호',d.insuranceManagementNo)}
      ${row('직종명',d.occupation)}
      ${row('업종명',d.industry)}
      ${row('월 임금',d.wage?money(d.wage):'')}
      ${row('취업일자',d.employmentDate)}
      ${row('취업처리일자',d.processedDate)}
      ${row('주 소정근로시간',d.weeklyHours?d.weeklyHours+'시간':'')}
    </section>
    <section class="card"><div class="cardTitle">고용보험 가입이력 대조</div>
      ${row('가입 사업장',ins.company)}
      ${row('고용보험 취득일',ins.acquisitionDate)}
      ${row('가입이력 주 근로시간',ins.weeklyHours?ins.weeklyHours+'시간':'')}
      ${row('가입이력 임금',ins.wage?money(ins.wage):'')}
      ${row('사업장명 대조',yn(cmp.company),ynClass(cmp.company))}
      ${row('취업일↔취득일',yn(cmp.employmentDate),ynClass(cmp.employmentDate))}
      ${row('근로시간 대조',yn(cmp.weeklyHours),ynClass(cmp.weeklyHours))}
      ${row('임금 대조',yn(cmp.wage),ynClass(cmp.wage))}
    </section>`;
  $('result').classList.add('show');
}

function toText(d){
  const ins=d.insurance||{}, cmp=d.compare||{};
  const lines=[
    '[취업종료]',
    `종료사유: ${[d.reason,d.reasonDetail].filter(Boolean).join(' / ')||'미인식'}`,
    `고용보험 취득신고: ${val(d.acquisitionStatus)}`,
    `종료등록일자: ${val(d.endRegistrationDate)}`,
    `구직마감유형: ${val(d.jobCloseType)}`,
    `알선형태: ${val(d.mediationType)}`,
    '',
    `사업장명: ${val(d.company)}`,
    `사업자번호: ${val(d.businessNo)}`,
    `고용보험 사업장관리번호: ${val(d.insuranceManagementNo)}`,
    `직종명: ${val(d.occupation)}`,
    `업종명: ${val(d.industry)}`,
    `월 임금: ${d.wage?money(d.wage):'미인식'}`,
    `취업일자: ${val(d.employmentDate)}`,
    `취업처리일자: ${val(d.processedDate)}`,
    `주 소정근로시간: ${d.weeklyHours?d.weeklyHours+'시간':'미인식'}`,
    `성공수당 지급대상: ${val(d.successAllowance)}`,
    '',
    '[고용보험 가입이력 대조]',
    `가입 사업장: ${val(ins.company)}`,
    `고용보험 취득일: ${val(ins.acquisitionDate)}`,
    `가입이력 주 근로시간: ${ins.weeklyHours?ins.weeklyHours+'시간':'미인식'}`,
    `가입이력 임금: ${ins.wage?money(ins.wage):'미인식'}`,
    `사업장명: ${yn(cmp.company)}`,
    `취업일↔취득일: ${yn(cmp.employmentDate)}`,
    `근로시간: ${yn(cmp.weeklyHours)}`,
    `임금: ${yn(cmp.wage)}`
  ];
  return lines.join('\n');
}

async function ensureScript(tabId,frameId){
  try{await chrome.tabs.sendMessage(tabId,{type:'GUKCHWI_EMP_TERM_PING_V018'},{frameId});return true;}catch{}
  try{await chrome.scripting.executeScript({target:{tabId,frameIds:[frameId]},files:['termination_content.js']});return true;}catch{return false;}
}

$('readBtn').addEventListener('click',async()=>{
  $('readBtn').disabled=true;$('copyBtn').disabled=true;$('sendCounselBtn').disabled=true;setStatus('취업종료 화면을 확인하고 있습니다…');
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.id)throw new Error('현재 탭을 찾지 못했습니다.');
    if(!isWork24Tab(tab.url||''))throw new Error('Work24 종료신청조회 화면에서 실행해 주세요.');

    let frames=[];
    try{frames=await chrome.webNavigation.getAllFrames({tabId:tab.id})||[];}catch{}
    if(!frames.length)frames=[{frameId:0,url:tab.url||''}];

    const results=[];
    for(const f of frames){
      const frameId=f.frameId;
      if(!(await ensureScript(tab.id,frameId)))continue;
      try{
        const r=await chrome.tabs.sendMessage(tab.id,{type:'GUKCHWI_EXTRACT_EMP_TERM_V018'},{frameId});
        if(r)results.push({frameId,url:f.url||'',result:r});
      }catch{}
    }
    if(!results.length)throw new Error('읽을 수 있는 Work24 화면을 찾지 못했습니다.');

    results.sort((a,b)=>{
      const as=(a.result?.titleOk?20:0)+(a.result?.employmentOnly?15:0)+(a.result?.found||0);
      const bs=(b.result?.titleOk?20:0)+(b.result?.employmentOnly?15:0)+(b.result?.found||0);
      return bs-as;
    });
    const best=results[0];

    $('debug').textContent=results.map(x=>`frame ${x.frameId} URL: ${x.url}
인식 점수: ${x.result?.found||0}/${x.result?.total||17}
종료신청조회: ${x.result?.titleOk?'예':'아니오'}
취업종료: ${x.result?.employmentOnly?'예':'아니오'}
상세 진단: ${JSON.stringify(x.result?.debug||{},null,2)}
${x.result?.error?`오류: ${x.result.error}`:''}`).join('\n\n');

    if(!best.result?.titleOk)throw new Error('종료신청조회 화면을 찾지 못했습니다.');
    if(!best.result?.employmentOnly)throw new Error('현재 버전은 취업 종료만 지원합니다.');
    if(!best.result?.ok)throw new Error(`취업종료 화면은 찾았지만 값 인식이 부족합니다. 진단 정보를 보내주세요. (${best.result?.found||0}/${best.result?.total||17})`);

    lastData=best.result.data;
    render(lastData);
    $('copyBtn').disabled=false;
    $('sendCounselBtn').disabled=false;
    setStatus(`✓ 취업종료 정보를 읽었습니다. (검증항목 ${best.result.found}/${best.result.total})`,'ok');
  }catch(e){
    lastData=null;$('result').classList.remove('show');$('result').innerHTML='';
    $('sendCounselBtn').disabled=true;
    setStatus(`읽기 실패: ${e.message||e}`,'err');
  }finally{
    $('readBtn').disabled=false;
  }
});

$('copyBtn').addEventListener('click',async()=>{
  if(!lastData)return;
  try{await navigator.clipboard.writeText(toText(lastData));setStatus('✓ 결과를 복사했습니다.','ok');}
  catch{setStatus('복사하지 못했습니다.','err');}
});
$('clearBtn').addEventListener('click',()=>{
  lastData=null;$('result').classList.remove('show');$('result').innerHTML='';
  $('copyBtn').disabled=true;$('sendCounselBtn').disabled=true;$('debug').textContent='아직 실행하지 않았습니다.';
  setStatus('비웠습니다. 종료신청조회에서 다시 읽어주세요.');
});


$('sendCounselBtn').addEventListener('click', async()=>{
  if(!lastData) return;
  const ins=lastData.insurance||{}, cmp=lastData.compare||{};
  const payload={
    source:'Work24 취업종료',
    bridgeVersion:3,
    sentAt:new Date().toISOString(),
    company:lastData.company||'',
    employmentDate:lastData.employmentDate||'',
    processedDate:lastData.processedDate||'',
    insuranceAcquisitionDate:ins.acquisitionDate||'',
    successAllowance:lastData.successAllowance||'',
    data:lastData
  };
  const sendBtn=$('sendCounselBtn');
  const originalText=sendBtn?.textContent||'상담일지 통합본으로 보내기';
  try{
    if(sendBtn){sendBtn.disabled=true;sendBtn.textContent='전달 중…';}
    await chrome.storage.local.set({[COUNSEL_TERMINATION_KEY]:payload});
    const saved=await chrome.storage.local.get(COUNSEL_TERMINATION_KEY);
    const actual=saved?.[COUNSEL_TERMINATION_KEY];
    if(!actual || actual.sentAt!==payload.sentAt) throw new Error('저장 확인 실패');
    try{await chrome.runtime.sendMessage({type:'CLG_COUNSEL_REFRESH_PENDING'});}catch(e){}
    if(sendBtn)sendBtn.textContent='✓ 전달 완료';
    setStatus('✓ 상담일지 전달 완료 · 통합본 미니바에 취업종료 자료가 바로 표시됩니다.','ok');
    setTimeout(()=>{if(sendBtn){sendBtn.disabled=false;sendBtn.textContent=originalText;}},1400);
  }catch(e){
    if(sendBtn){sendBtn.disabled=false;sendBtn.textContent='전달 실패 · 다시 시도';}
    setStatus(`전달 실패: ${e?.message||e}`,'err');
    setTimeout(()=>{if(sendBtn)sendBtn.textContent=originalText;},2200);
  }

});
