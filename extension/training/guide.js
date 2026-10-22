// Official sources reviewed on 2026-10-16. Bundled text, no remote code/API calls.
const GUIDE_SOURCES = [
  {title:'고용24 · 국민내일배움카드 안내 (2026.07.27 수정)',url:'https://www.work24.go.kr/cm/c/f/1100/selecSystInfo.do?systId=SI00000351'},
  {title:'국가법령정보센터 · 국민내일배움카드 운영규정 (2026.05.11 시행)',url:'https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq=2100000279150&chrClsCd=010201'},
  {title:'운영규정 별표 3 · 출석인정일수 (2026.01.01 개정)',url:'https://www.law.go.kr/LSW/flDownload.do?bylClsCd=200201&flSeq=160599637'},
  {title:'고용노동부 1350 · 출결관리 안내 (2026.07.27 답변)',url:'https://1350.moel.go.kr/rtmview.do?id=1000325509'}
];
const GUIDES = [
  {id:'attendance',title:'출결 확인·지각·조퇴·외출',base:true,source:3,text:'훈련 시작과 종료 때마다 본인이 출석 확인을 해주세요. 출결 누락·기기 오류는 당일 훈련기관에 바로 알려주세요. 지각·조퇴·외출로 하루 훈련시간의 50% 미만을 수강하면 결석 처리되며, 지각·조퇴·외출 3회는 결석 1일로 계산됩니다.'},
  {id:'sick',title:'병가·질병·입원',base:true,source:2,text:'소정훈련일수가 10일 이상인 과정은 본인 또는 만 19세 미만 자녀의 질병·입원에 대해 출석인정을 받을 수 있습니다. 한도는 전체 소정훈련일수의 10%를 반올림한 일수입니다. 아프거나 입원하면 훈련기관에 먼저 알리고, 진단서·진료확인서 등 필요한 증빙과 제출기한을 확인하세요. 병원 방문만으로 자동 인정되는 것은 아닙니다.'},
  {id:'recognized',title:'면접·시험·경조사 출석인정',base:false,source:2,text:'소정훈련일수 10일 이상 과정은 채용 필기·면접, 훈련 직종 관련 자격시험, 예비군·민방위 등 사유의 소요시간·일수를 출석인정 기준에 따라 처리할 수 있습니다. 결혼은 본인 5일·자녀 1일, 배우자 출산은 5일입니다. 사망은 배우자·양가 부모 5일, 양가 조부모·외조부모, 자녀와 그 배우자, 본인·배우자의 형제자매 3일입니다. 사유 발생 전에 기관에 알리고 증빙과 인정기간을 확인하세요.'},
  {id:'vacation',title:'장기훈련 휴가',base:false,source:2,text:'주평균 훈련일수 5일 이상·일평균 훈련시간 6시간 이상이고 전체 훈련기간이 6개월 이상이면 월 1일 휴가 기준을 적용합니다. 700시간 이상이면서 월력상 5개월 16일 이상인 과정은 6개월로 보아 최대 6일을 부여할 수 있습니다. 적치 사용이 가능하며 고등학교 재학생은 제외됩니다. 해당 과정인지 훈련기관에 확인 후 신청하세요.'},
  {id:'allowance',title:'출석률·훈련장려금',base:true,source:0,text:'훈련장려금은 지급대상 요건을 충족해야 하며, 단위기간 출석률이 80% 미만이면 지급되지 않습니다. 훈련시간·실제 출석일수·근로 및 실업급여 수급 여부 등에 따라 지급 여부와 금액이 달라집니다. 예정 훈련일수 계산만으로 수당이 확정되지는 않습니다.'},
  {id:'change',title:'취업·근로·소득·과정 변경',base:true,source:1,text:'취업, 아르바이트, 사업·소득 발생, 과정 변경이나 중단 예정이 있으면 담당 상담사와 훈련기관에 바로 알려주세요. 국민취업지원제도 참여자는 IAP 계획·수당 신청에 미치는 영향도 담당 상담사에게 함께 확인하세요.'},
  {id:'dropout',title:'중도포기·부정출결',base:true,source:0,text:'질병·사고 등 불가피한 사정 없이 중도포기하면 사용한 훈련비 외에 카드 한도가 1회 20만원·2회 50만원·3회 이상 100만원 추가 차감될 수 있습니다. 그만두기 전에 사유와 증빙을 상담하세요. 대리출석이나 허위 출결은 하지 마세요. 부정수급은 지원 중단·반환 등 불이익이 있습니다.'},
  {id:'finish',title:'수료 후 만족도 조사',base:true,source:0,text:'훈련 종료 후 30일 이내에 고용24 만족도 조사를 완료해주세요. 기한 내 미참여 시 마지막 달 훈련장려금이 지급되지 않을 수 있습니다. 수료 후 취업 준비와 알선도 담당 상담사와 이어서 진행하세요.'}
];
function guideSelection(){return GUIDES.filter(g=>document.getElementById('guide-'+g.id).checked);}
function generateGuide(){
  const selected = guideSelection();
  const lines=['[국민내일배움카드 훈련 안내]'];
  if(document.getElementById('includeResults').checked && latestResults){
    lines.push('',makeCopyText(latestResults));
  }
  selected.forEach(g=>lines.push('', '■ '+g.title, g.text));
  lines.push('', '※ 과정 유형·개인별 적용 여부와 증빙은 훈련기관 및 담당 상담사에게 확인해주세요.', '안내 확인일: 2026.10.16');
  const indices=[...new Set(selected.map(g=>g.source))];
  if(indices.length) lines.push('', '[공식 근거]',...indices.map(i=>GUIDE_SOURCES[i].title+'\n'+GUIDE_SOURCES[i].url));
  document.getElementById('guidePreview').value=lines.join('\n');
}
function guideMessage(s){document.getElementById('guideMessage').textContent=s;}
function rebuildGuide(){
  generateGuide();
  guideMessage('선택한 안내로 문구를 새로 만들었습니다. 직접 수정한 내용은 복사·출력에 반영됩니다.');
}
for(const g of GUIDES){
  const card=document.createElement('div');card.className='guide-card';
  const label=document.createElement('label');label.className='guide-title';
  const check=document.createElement('input');check.type='checkbox';check.id='guide-'+g.id;check.checked=g.base;
  check.addEventListener('change',rebuildGuide);
  label.append(check,document.createTextNode(g.title));
  const detail=document.createElement('details');const summary=document.createElement('summary');summary.textContent='내용 보기';
  const para=document.createElement('p');para.textContent=g.text;
  detail.append(summary,para);card.append(label,detail);document.getElementById('guideCards').append(card);
}
for(const s of GUIDE_SOURCES){const a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener';a.textContent=s.title;document.getElementById('sourceLinks').append(a);}
for(const [id,fn] of [['essentialBtn',g=>g.base],['allGuideBtn',()=>true],['clearGuideBtn',()=>false]]){
  document.getElementById(id).addEventListener('click',()=>{GUIDES.forEach(g=>document.getElementById('guide-'+g.id).checked=fn(g));rebuildGuide();});
}
document.getElementById('includeResults').addEventListener('change',()=>{
  if(document.getElementById('includeResults').checked&&!latestResults){document.getElementById('includeResults').checked=false;guideMessage('먼저 회차 계산을 완료해주세요.');return;}
  rebuildGuide();
});
window.addEventListener('training-results-changed',()=>{
  if(document.getElementById('includeResults').checked){
    if(!latestResults) document.getElementById('includeResults').checked=false;
    // Regenerate to remove stale calculated dates, even if preview was edited.
    generateGuide();guideMessage('계산 정보가 변경되어 안내 문구를 갱신했습니다.');
  }
});
document.getElementById('copyGuideBtn').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(document.getElementById('guidePreview').value);guideMessage('복사했습니다. 카카오톡 대화창에 붙여넣어 보내세요.');}
  catch{document.getElementById('guidePreview').select();guideMessage('복사가 차단되었습니다. 선택된 문구를 Ctrl+C로 복사하세요.');}
});
document.getElementById('printGuideBtn').addEventListener('click',async()=>{
  const text=document.getElementById('guidePreview').value.trim();
  if(!text){guideMessage('출력할 안내 문구를 입력해주세요.');return;}
  try{
    const key='training-print-'+crypto.randomUUID();
    await chrome.storage.session.set({[key]:{text,createdAt:Date.now()}});
    await chrome.tabs.create({url:chrome.runtime.getURL('training/print.html')+'#'+key});
    guideMessage('출력 화면을 열었습니다. 인쇄 대상에서 PDF로 저장하거나 프린터를 선택하세요.');
  }catch(e){guideMessage('출력 화면을 열지 못했습니다. '+e.message);}
});
generateGuide();
