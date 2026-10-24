/* 2026.1 국민취업지원제도 업무매뉴얼 인쇄쪽 196–201. Plan guidance, not a payment decision. */
(function(root){'use strict';
const rules=[
 {match:/직업훈련/,text:'지급주기 내 예정 훈련 10일 이상은 2개, 미만은 1개입니다. 실제 이행은 출석률 80% 이상 확인이 필요합니다.',detail:'자비부담 일반학원 등 미인정 과정은 총 10일 이상·40시간 이상이며 출결관리가 되는 경우에 한해 인정 가능합니다. 원격훈련은 수료일이 포함된 지급주기에 총 40시간 이상 2개, 미만 1개로 인정합니다. 집체·실시간 비대면 과정이 10일 미만이거나 40시간 미만이면 시간으로 출석률을 계산합니다.'},
 {match:/일경험/,text:'참여 예정 10일 이상 2개, 미만 1개이며 실제 참여율 80% 이상을 확인합니다.',detail:'참여일수가 확인되지 않는 프로젝트형은 활동 특성에 맞게 구체적인 구직활동의무를 정하고 이행을 확인합니다. 출석·출석률 인정은 직업훈련 기준을 따릅니다.'},
 {match:/집단상담|집단프로그램/,text:'2일 이상 집단상담프로그램 수료는 2개, 단기집단상담은 1개입니다. 여러 지급주기에 걸치면 수료일이 속한 주기에 반영합니다.',detail:'단순히 기간이 이틀이라는 이유만으로 인정하지 않습니다. 프로그램의 형식·내용과 수료 여부를 확인하세요. 고용·복지·금융 연계도 이에 해당하는 집단프로그램이면 2개입니다.'},
 {match:/취업특강/,text:'취업특강은 1회 참여에 1개이며 전체 취업지원서비스 기간 중 최대 2회만 인정합니다.',detail:'현재 표 밖의 과거 이력도 함께 확인하세요. 단기집단상담과 취업특강은 인정 횟수 제한이 다릅니다.'},
 {match:/심리상담|심리안정|취업진로상담|취업상담|클리닉|재진단/,text:'상담·클리닉 1회 참여는 구직활동 1개입니다. IAP 재진단을 위한 필수 대면상담도 포함합니다.',detail:'이력서 클리닉과 자기소개서 클리닉을 다른 날 참여하면 각각 인정할 수 있습니다. 같은 상담을 여러 명칭으로 중복 입력하지 마세요. 심리검사만 실시한 경우를 상담 참여로 자동 간주하지 않습니다.'},
 {match:/복지|금융/,text:'IAP에 포함된 연계 상담 1회 또는 프로그램 수료를 1개로 인정합니다.',detail:'기관 발급 증명서를 확인합니다. 별도 서식이 없으면 서식 39(이행 과정 및 결과 확인서) 또는 기관 담당자 유선확인으로 처리할 수 있습니다. 2일 이상 집단상담에 해당하는 프로그램은 해당 메뉴를 선택하세요.'},
 {match:/입사지원|면접|서류지원|구직활동/,text:'희망 직종·조건에 맞는 사업장 입사지원 또는 면접을 이행한 횟수별로 1개 인정합니다.',detail:'구인 없는 사업장 지원, 현저히 다른 직무 지원, 정당한 사유 없는 알선 거부·면접 불참 등 형식적 활동은 불인정합니다. 면접 없는 이력서 제출이 3회 이상이면 IAP 5회차부터 가급적 알선·직업지도 프로그램 참여 의무를 부과하고 이행을 확인합니다.'},
 {match:/창업|자영업/,text:'IAP에 정한 창업 준비활동과 객관적인 증빙을 확인합니다. 동일 준비활동을 형식적으로 반복하지 않도록 관리합니다.',detail:'시장조사, 장소 물색·임대차계약, 구인광고, 인테리어, 프랜차이즈 교육·계약 등이 해당합니다. 계약서·조사서·참여확인서 등으로 입증되지 않으면 불이행입니다. 활동 내용·일정·이행조건을 구체적으로 합의하세요.'},
 {match:/자격증.*시험/,text:'구직에 필요한 자격증 시험 응시는 1회에 1개 인정할 수 있습니다.',detail:'불합격 후 다른 날 같은 자격증 시험에 재응시한 경우도 각각 인정할 수 있습니다. 원서접수만 한 상태와 실제 시험 응시를 구분하세요.'},
 {match:/전문성 향상/,text:'노무제공자·영세자영업자의 해당 사업 분야 전문성 향상 활동은 각 행위별 1개로 인정합니다.',detail:'보수교육, 시설·장비·기계·차량 유지보수, 사업제안서·포트폴리오 작성 제출, 면접·교육·시험 응시 등이 해당합니다. IAP 관련성, 실제 행위와 증빙을 확인하세요.'},
 {match:/사회봉사/,text:'직업안정기관의 장이 소개한 직무 관련·구직기술 향상 목적의 봉사활동인지 확인합니다.',detail:'구인업체 부족 등으로 직접적 구직활동이 어려운 노동시장 여건을 고려한 예외입니다. 모든 개인 봉사활동이 자동 인정되는 것은 아닙니다.'}
];
const options=['심리상담','복지지원','금융지원','단기집단상담','집단상담(2일 이상)','취업진로상담','취업상담','이력서클리닉','자기소개서클리닉','IAP 재진단 필수 대면상담','고용·복지·금융 집단프로그램(2일 이상)','사회봉사활동','전문성 향상 활동'];
function rule(kind){return rules.find(r=>r.match.test(kind||''));}
function auditFields(tr){const kind=tr.querySelector('.job-kind')?.value||'',end=tr.querySelector('.e-date')?.value||'';
 if(kind==='직업훈련'&&/미인정|비인정|자비/.test(tr.querySelector('.job-name')?.value||'')){const p=tr.__clgActivityRule||{},name=tr.querySelector('.job-name')?.value||'';const eligible=p.name===name&&Number(p.days)>=10&&Number(p.hours)>=40&&p.managed===true&&p.checked===true;return {credit:eligible&&[1,2].includes(Number(p.band))?Number(p.band):0};}
 if(/직업훈련|일경험/.test(kind))return {};
 if(/집단상담|집단프로그램/.test(kind)){const n=/2일 이상/.test(kind)?2:/단기/.test(kind)?1:0;return {activityEligible:true,activityCredit:n,credit:n,remote:true,creditDate:end};}
 const eligible=/심리상담|심리안정|취업진로상담|취업상담|클리닉|재진단|복지지원|금융지원|취업특강|자격증.*시험|전문성 향상/.test(kind);
 return eligible?{activityEligible:true,activityCredit:1}:{};
}
function rowFields(tr){return tr.__clgActivityRule?{activityRule:JSON.parse(JSON.stringify(tr.__clgActivityRule))}:{};}
root.ClgActivityRules={rule,auditFields,options,rowFields};
if(typeof module!=='undefined')module.exports=root.ClgActivityRules;
if(!root.document)return;
const doc=root.document;
const style=doc.createElement('style');style.textContent='.clg-activity-rule{margin:7px 0;color:#475569;font-size:11px;line-height:1.65;max-width:620px;white-space:normal}.clg-activity-rule summary{cursor:pointer;color:#24527b;font-weight:600}.clg-activity-rule p{margin:5px 0}.clg-attendance-guide{padding:12px 16px;border:1px solid #d7e2ec;border-radius:9px;background:#f8fafc;font-size:12px;line-height:1.75;margin:12px 0}.clg-attendance-guide summary{cursor:pointer;font-weight:700}@media print{.clg-activity-rule,.clg-attendance-guide{display:none!important}}';doc.head.append(style);
function refresh(sel){const row=sel.closest('tr,.activity-row')||sel.parentElement;let box=row.querySelector('.clg-activity-rule');const r=rule(sel.value);if(!r){box?.remove();return;}if(!box){box=doc.createElement('div');box.className='clg-activity-rule';const host=row.querySelector('.job-name')?.closest('td')||sel.closest('td')||row;host.append(box);if(!sel.closest('td'))box.style.gridColumn='1 / -1';}if(box.dataset.kind===sel.value)return;box.dataset.kind=sel.value;box.replaceChildren();const brief=doc.createElement('p');brief.textContent=r.text;const d=doc.createElement('details'),s=doc.createElement('summary'),p=doc.createElement('p');s.textContent='예외·확인자료 보기 · 매뉴얼 196–201쪽';p.textContent=r.detail;d.append(s,p);box.append(brief,d);
 if(sel.matches('.job-kind')&&sel.value==='직업훈련'){
 const special=doc.createElement('details');special.innerHTML='<summary>자비·미인정 과정 별도 요건 확인</summary><p>과정명에 자비·미인정을 표시한 과정만 적용합니다. 전체 과정 요건과 지급주기별 예정일수를 구분하세요.</p><label>전체 훈련일수 <input data-rule="days" type="number" min="0" step="1" style="width:70px"></label><label>전체 훈련시간 <input data-rule="hours" type="number" min="0" step="0.5" style="width:70px"></label><label><input data-rule="managed" type="checkbox"> 출결관리 확인</label><label><input data-rule="checked" type="checkbox"> IAP 포함·취업 필요성·전체 요건 확인</label><label>이 행 지급주기 예정일수 <select data-rule="band"><option value="">미확인</option><option value="1">10일 미만 · 1개</option><option value="2">10일 이상 · 2개</option></select></label>';
 const saved=row.__clgActivityRule||{};special.querySelectorAll('[data-rule]').forEach(n=>{if(n.type==='checkbox')n.checked=saved[n.dataset.rule]===true;else n.value=saved[n.dataset.rule]??'';});special.addEventListener('change',()=>{const v={name:row.querySelector('.job-name')?.value||''};special.querySelectorAll('[data-rule]').forEach(n=>v[n.dataset.rule]=n.type==='checkbox'?n.checked:n.value);row.__clgActivityRule=v;row.dispatchEvent(new root.Event('input',{bubbles:true}));});box.append(special);
 }
}
function scan(){doc.querySelectorAll('.job-kind,.act-content').forEach(sel=>{if(sel.matches('.job-kind')||sel.closest('#prog1_list')){for(const name of options)if(![...sel.options].some(o=>o.value===name))sel.add(new root.Option(name,name));if(!sel.dataset.clgRuleMenu){const value=sel.value,rare=doc.createElement('optgroup');rare.label='상담·연계 및 기타 인정 활동';for(const o of [...sel.options])if(options.includes(o.value)&&!['심리상담','복지지원','금융지원'].includes(o.value))rare.append(o);sel.append(rare);sel.value=value;sel.dataset.clgRuleMenu='1';}}refresh(sel);});}
doc.addEventListener('change',e=>{if(e.target.matches('.job-kind,.act-content'))refresh(e.target)});
scan();for(const host of [doc.getElementById('job_tbody'),doc.getElementById('prog1_list'),doc.getElementById('prog2_list')].filter(Boolean))new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&n.matches?.('tr,.activity-row'))))scan();}).observe(host,{childList:true,subtree:true});
const guide=doc.createElement('details');guide.className='clg-attendance-guide';guide.innerHTML='<summary>훈련·일경험 출석 예외 확인 · 매뉴얼 196–198쪽</summary><p>지각·조퇴·외출로 하루 소정시간의 50% 미만 수강 시 결석입니다. 지급주기 내 지각·조퇴·외출 합계 3회는 결석 1일로 처리합니다. 소정 훈련일수 10일 이상은 내일배움카드 운영규정 별표 3의 경조사·휴가 등 출석인정기준을 확인합니다.</p><p>중도 편입은 훈련개시일부터 등록 전날까지를 소정일수에서 제외합니다. 기관 사정으로 폐강되면 폐강 전 소정일수 대비 80% 출석을 확인합니다. 지급주기 중 수강 포기 시 미출석일은 결석이나, 취업으로 포기하면 포기 전 참여일자에 대한 이행 예외를 확인합니다.</p><p>지급주기 중 주 30시간 이상 임금근로·월소득 250만원 이상 노무제공·창업으로 취업지원이 종료되면 출석률과 무관한 취(창)업 지급기준을 확인합니다. 두 과정 이상이면 과정별 출석률을 구분하되, 전체 과정 소정일수 기준 합산 출석률이 80% 이상인 예외도 확인합니다.</p><p>위 안내와 계획상 활동 개수만으로 수당 지급이 확정되지 않습니다. 실제 출석·수료·증빙, 해당 지급주기와 예외 사유를 확인하세요.</p>';
const anchor=doc.getElementById('job_tbody')?.closest('table')||doc.getElementById('prog1_list');anchor?.after(guide);
})(typeof window==='undefined'?globalThis:window);
