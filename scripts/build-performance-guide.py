"""Build read-only, offline-capable 2026 evaluation reference pages."""
from pathlib import Path
import json, re, html

ROOT = Path(__file__).resolve().parents[1]
TOPICS = [
    ('overview', '종합안내', '평가 배점과 상담사 핵심 확인사항'),
    ('employment', '취업·종료', '평가 종료자와 실제 취업종료 조건 구분'),
    ('referral', '알선취업', '구직인증번호·취업경로·기관 일치'),
    ('early', '조기취업', 'IAP 수립일 기준 3개월과 대상자 가중'),
    ('wages', '임금수준', '고용보험 취득연도별 월 보수 기준'),
    ('retention', '고용유지', '180일 초과와 취업성공수당 근속 구분'),
    ('experience', '일경험', '상담 연계·평가 취업·연계 가점을 각각 확인'),
    ('linkage', '연계 가점', '대상 사업·연계 및 참여 증빙·집계'),
    ('satisfaction', '만족도·우수사례', '평가 조사와 일반 만족도 조사 구분'),
    ('review', '점검·증빙', '중간점검·수기자료·마감 전 확인표'),
    ('sources', '근거·확인사항', '매뉴얼 쪽수·공식 법령·개정 확인 기록'),
]
LAW='https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=253641&efYd=20240209'
RULE='https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=291203&efYd=20261014'
OP='https://www.law.go.kr/LSW/admRulLsInfoP.do?admRulSeq=2100000280036'
def jo(seq, no):
    return f'https://www.law.go.kr/LSW/lsSideInfoP.do?lsiSeq={seq}&joNo={no:04}&joBrNo=00&docCls=jo&urlMode=lsScJoRltInfoR'
def a(url, label):
    return f'<a href="{html.escape(url, quote=True)}" target="_blank" rel="noopener noreferrer">{html.escape(label)} ↗</a>'
def manual(pages, pdfpages):
    return f'2026.1 업무매뉴얼 인쇄 {pages}쪽 / PDF {pdfpages}쪽'
def card(cid, title, body, source, kind='상담 처리', cls='operation'):
    return f'<article id="{cid}" class="{cls}"><span class="tag">{kind}</span><h2>{title}</h2>{body}<div class="source">근거: {source}</div></article>'

supplements={
'employment':[
card('actual-end','상담에서 취업종료할 때의 기준', '''
<div class="table"><table><thead><tr><th>상황</th><th>처리 기준</th></tr></thead><tbody>
<tr><td>임금근로</td><td><b>주 30시간 이상</b> 근로. 일용근로·자활근로·재정지원 직접일자리 등 제외·별도 기준을 확인합니다.</td></tr>
<tr><td>노무제공·프리랜서</td><td><b>월 소득 250만원 이상</b>. 입금액·매출과 소득을 구분하고 실제 발생 소득을 확인합니다.</td></tr>
<tr><td>창업</td><td>사업자등록으로 개업하여 실제 영리를 목적으로 사업을 영위하는지 확인합니다.</td></tr>
<tr><td>불완전 취업의 희망 종료</td><td>주 15시간 이상~30시간 미만 근로, 또는 월 소득 70만원 이상~250만원 미만 노무제공은 <b>본인 요청에 따라 취업종료 가능</b>. 고용보험 피보험자격을 취득했다면 주 15시간 미만 근로도 본인 희망 종료가 가능합니다.</td></tr>
</tbody></table></div><p class="notice"><b>평가실적에서 제외되는 일자리라고 취업종료도 하지 않는 것은 아닙니다.</b> 실제 종료사유를 먼저 판단하고, 평가 산정 여부는 따로 확인합니다. 평가에 맞추어 실제 날짜나 취업경로를 바꾸지 않습니다.</p>
<details><summary>노무제공자의 소득·종료일 확인</summary><p>공적자료로 소득이 확인되면 확인된 소득을 적용합니다. 소득이 아닌 수입·매출만 확인될 때에는 운영규정 제3조제3항의 업종별 조정률을 적용합니다. 노무제공자 취업종료 판단에서는 고용보험 신고 보수월액만 보지 말고 실제 발생 소득을 확인합니다.</p><p>종료일은 월 단위 발생, 일시적 소득, 다수 사업장 등 발생형태에 따라 확인합니다. 매뉴얼 105쪽의 유형별 기준을 적용하고, 정한 날을 이후 관련 처리에도 일관되게 적용합니다.</p></details>''', manual('104~106','112~114')+' / '+a(jo('291203',20),'시행규칙 제20조')+' / '+a(OP,'운영규정 제3조')),
card('service-period','서비스 만료일과 취업지원 종료일은 다릅니다', '''
<ul><li>서비스기간은 인정통지를 받은 날부터 <b>원칙 1년</b>이며, 필요한 경우 최대 6개월 연장할 수 있습니다.</li><li>미취업 사후관리는 원칙 3개월, 필요시 1개월 범위 연장입니다.</li><li><b>취업종료는 취업한 날</b>, <b>기간만료 종료는 해당 서비스·사후관리 만료일 다음 날</b>을 구분합니다.</li></ul>
<p class="notice">위 법령상 종료일과 평가자료의 <b>IAP 종료일 필드</b>를 이름만 보고 동일하다고 간주하지 마세요. 평가 대상은 지표정의서가 지정한 필드와 로우데이터로 확인합니다.</p>
<p>서비스 연장은 참여 필요성과 집중 취업알선기간 3개월 확보 등을 검토하고, 기존 종료 7일 전까지 결정·전산 입력·IAP 변경 절차를 진행합니다. 평가를 위한 임의 연장은 하지 않습니다.</p>''',manual('67~68·102~104','75~76·110~112')+' / '+a(jo('253641',15),'법 제15조')+' / '+a(jo('253641',29),'법 제29조')+' / '+a(jo('291203',11),'시행규칙 제11조')),
card('continue-and-notice','첫 취업 후 조기퇴사·종료통지 확인', '''
<p>첫 번째 취·창업 종료 후 <b>1개월 미만</b> 근무·영업하다 퇴직·폐업하고, <b>퇴사 후 1개월 이내</b> 지속참여 신청서(서식 23)를 제출한 경우 종료를 취소하여 지속참여할 수 있습니다. 첫 취업에 한하여 1회 적용하는 예외이며, 유예 후 재개와 다릅니다.</p>
<p>본인 희망 종료는 명시적 의사를 서면으로 확인합니다. 종료 시 사실과 이유를 기재한 서면통지, 필요한 사전통지·의견청취 절차를 확인합니다. 통지·처분 절차는 고용센터와 협의하여 진행합니다.</p>''',manual('107~108·114~117','115~116·122~125')+' / '+a(jo('253641',29),'법 제29조제4항')),
],
'referral':[
card('route-types','매뉴얼의 취업경로 분류와 평가 산식을 함께 봅니다', '''
<div class="table"><table><thead><tr><th>실제 지원 내용</th><th>매뉴얼상 확인</th><th>평가에서 추가 확인</th></tr></thead><tbody>
<tr><td>고용24 유효공고를 상담·알선하여 채용</td><td>상담알선</td><td>B1: 상용 알선채용·기관·구직인증번호·기간</td></tr>
<tr><td>고용24에 구인신청이 없는 일자리 소개 후 채용</td><td>외부구인정보소개. 알선에 준하는 소개 과정 확인</td><td>B3: 외부구인정보소개(O) 마감·기관 일치</td></tr>
<tr><td>목표기업 지원서·면접을 개별 컨설팅 후 취업</td><td>컨설팅제공</td><td>컨설팅만으로 B1·B3에 자동 포함하지 않기</td></tr>
<tr><td>스스로 찾아 취업</td><td>본인취업</td><td>기관 알선이나 연계로 바꾸어 집계하지 않기</td></tr>
</tbody></table></div><p>법령은 일자리 소개와 구직기술 지원의 근거를 두고 있고, <b>2026 평가의 기관 일치·마감코드·구직인증번호 조건은 별도 평가문서</b>가 정합니다.</p>''',manual('115~116','123~124')+' / '+a(jo('253641',14),'법 제14조')+' / '+a(jo('291203',9),'시행규칙 제9조')+' / 지표정의서 B1~B3'),
],
'early':[
card('iap-standard','조기취업을 위해 IAP 날짜를 바꾸지 않습니다', '''
<p>조기취업의 <b>3개월</b>은 성과평가 C1의 기준입니다. 법령상 서비스기간이나 IAP 수립기한과는 다른 기준입니다.</p><ul><li>IAP는 인정결정 통지 다음 날부터 1개월 이내 수립, 필요한 경우 7일 범위 연장합니다.</li><li>대면상담은 원칙 최소 3회. 매뉴얼은 특성화고 졸업예정자 대면 2회, 특별재난지역 유선 2회 예외를 별도로 안내합니다. 적용대상·지침을 확인합니다.</li><li>취·창업이 확정되었는지 수립 전에 확인하고, 실제 상담일·수립일을 기록합니다.</li></ul>''',manual('72·81','80·89')+' / 지표정의서 C1'),
],
'wages':[
card('wage-vs-income','258만원과 250만원은 비교 대상이 다릅니다', '''
<div class="table"><table><thead><tr><th>판단 목적</th><th>금액·자료</th></tr></thead><tbody><tr><td>2026년 임금수준 평가 D1</td><td><b>258만원 이상</b> — 고용보험 취득 시 입력한 월 보수총액</td></tr><tr><td>노무제공자의 취업종료</td><td><b>월 소득 250만원 이상</b> — 실제 소득 확인, 매출이면 필요한 소득환산</td></tr><tr><td>임금근로자의 취업종료</td><td>주 30시간 등 근로조건 기준 — 월 258만원이 되어야만 종료하는 것이 아님</td></tr></tbody></table></div><div class="examples"><b>예시</b> 2026년 취득 월 보수 255만원·주 40시간 일자리: 취업종료 기준을 검토하되, 임금수준 평가의 258만원 기준에는 미달합니다.</div>''',manual('104~106','112~114')+' / 지표정의서 D1'),
],
'retention':[
card('retention-vs-allowance','평가 고용유지와 취업성공수당 근속은 별도 판단', '''
<div class="table"><table><thead><tr><th>구분</th><th>확인사항</th></tr></thead><tbody><tr><td>평가 F1</td><td><b>180일 초과</b>, 인정 취업건·전환일·평가마감 기준 확인</td></tr><tr><td>취업성공수당</td><td>대상자·취업조건·동일사업장 근속 및 별도 예외를 확인. 평가 F1과 동일한 판정이 아님</td></tr></tbody></table></div><p>매뉴얼은 취업성공수당에서 근로조건 변경, 피보험기간 단절 없는 사업장 변경, 첫 취업 후 이직 등의 예외를 별도로 둡니다. <b>취업성공수당에서 근속이 인정됐다는 이유로 평가 F1에서도 같은 예외를 자동 적용하지 않습니다.</b></p><p>반대로 평가 고용유지 실적이 인정된다고 참여자의 취업성공수당 지급이 자동 확정되는 것도 아닙니다.</p>''',manual('221~224','229~232')+' / 지표정의서 F1 / 2차 점검 유의사항 1'),
],
'experience':[
card('experience-three-tests','일경험은 세 가지 기준을 따로 판단합니다', '''
<div class="table"><table><thead><tr><th>질문</th><th>기준</th><th>실무 확인</th></tr></thead><tbody><tr><td>상담서비스로 연계할 수 있나?</td><td>업무매뉴얼·법령</td><td>직무 습득 필요성, 사전상담, IAP 반영, 참여기간·횟수</td></tr><tr><td>평가 취업자가 되나?</td><td>평가 A3·F1</td><td>인정 취득건, 종료·전환 시점, 중간/최종 반영</td></tr><tr><td>연계 가점으로 인정되나?</td><td>평가 가점·QA</td><td>평가기간 종료자, 참여기간, 추천·참여 증빙, 제외 사업</td></tr></tbody></table></div>
<p class="notice"><b>현장실습:</b> 매뉴얼 166쪽에는 대학생 현장실습 등을 일경험으로 연계할 수 있다고 안내하지만, 이번 평가 QA는 ‘현장실습을 일경험으로 연계’한 건을 가점에서 제외합니다.<br><b>직접일자리:</b> 매뉴얼·운영규정의 제한적 IAP 연계 예외와 평가 QA의 가점 제외 기준을 구분합니다. 공공근로 등을 무조건 일경험으로 연계하지 않습니다.<br><b>기존 참여:</b> 매뉴얼 167쪽은 신청·IAP 수립 전 시작한 일자리도 연계 가능하다고 하나, QA는 참여자가 직접 찾아 문의·먼저 지원한 경우의 연계 가점을 불인정합니다.</p>''',manual('166~167','174~175')+' / '+a(jo('253641',13),'법 제13조')+' / '+a(jo('291203',8),'시행규칙 제8조')+' / '+a(OP,'운영규정 제8조제2항')+' / 가점 QA'),
card('experience-process','상담서비스로 일경험을 운영할 때', '''
<ol><li>일경험이 필요한 이유와 희망직무를 확인하고 참여자와 사전 협의합니다.</li><li><b>IAP에 반드시 반영</b>하고 서비스기간 내 종료 가능 여부, 집중 취업알선기간 3개월 확보를 확인합니다.</li><li>운영상 참여 횟수는 최대 2회. 중도탈락·미수료도 1회, 미래내일 ‘기업탐방’은 횟수에서 제외한다고 안내합니다.</li><li>직접일자리를 예외적으로 일경험으로 연계하는 경우 반드시 사전 협의·IAP 반영 후 시작해야 합니다. 직무체험 목적에 맞지 않는 공공근로 등은 연계하지 않습니다.</li><li>종료 후 정규직 전환 여부를 확인합니다. 미전환이면 남은 서비스 참여 가능, 전환이면 취업종료와 전환 시작일을 확인합니다.</li></ol><p>이 <b>운영상 참여횟수</b>와 평가 QA의 <b>가점 집계횟수</b>는 서로 다른 규정입니다.</p>''',manual('166~167','174~175')+' / '+a(OP,'운영규정 제8조')),
],
'linkage':[
card('linkage-process','실제 연계업무는 ‘필요성 → 동의 → 의뢰 → 참여 확인’', '''
<ol><li>취업을 막는 심리·돌봄·채무·주거 등의 어려움과 지원 필요성을 확인합니다.</li><li>참여자에게 목적·연계기관·공유할 정보를 설명하고 필요한 동의를 받습니다.</li><li>추천서·공식 전산의뢰 등으로 연계하고, 실제 참여 여부와 결과를 확인합니다.</li><li>상담일지에는 필요성과 경과를 기록합니다. 평가 가점용으로는 연계 증빙과 실제 참여 증빙도 별도로 확보합니다.</li></ol><p>매뉴얼 154쪽은 심리상담 추천 시 수급자의 동의와 추천서(서식 32)를, 172쪽은 사례관리 의뢰 전 개인정보 이용·제공동의서 안내를 제시합니다. 178쪽은 창업지원 추천 후 대상 확정과 월 1회 이상 모니터링을 안내합니다.</p><p class="notice">법령상 연계 가능한 기관의 범위와 <b>평가 가점 인정기관의 범위는 같지 않을 수 있습니다.</b> 서비스가 필요하면 지원하되 가점은 QA의 기관·사업·증빙 기준을 따로 확인합니다.</p>''',manual('154~155·170~179','162~163·178~187')+' / '+a(jo('253641',13),'법 제13조')+' / 가점 QA'),
],
'satisfaction':[
card('satisfaction-different','고용24 단계별 조사와 평가용 만족도 조사를 구분', '''
<p>매뉴얼은 고용24에서 참여 단계에 따라 <b>신청 과정 / IAP 상담 과정·결과 / 종료 후 프로그램</b> 만족도 조사를 안내하며, 필수사항은 아니라고 설명합니다.</p><p>이번 <b>성과평가용 만족도</b>는 지표정의서 G1·G2의 표집기간·기관별 30~50명·서비스 만족도 상위 80% 반영 기준입니다. 고용24 설문 3회를 모두 제출하면 평가점수가 자동 확정되는 방식으로 안내하지 않습니다.</p><p>상담사는 서비스 내용·일정·후속지원 안내를 명확히 하고, 평가 관련 별도 공문이 있으면 그 안내를 확인합니다.</p>''',manual('83','91')+' / 지표정의서 G1·G2'),
],
'review':[
card('review-termination','실적을 맞추기 위한 일괄 종료는 하지 않습니다', '''
<p>실제 종료사유·절차를 먼저 확인합니다. <b>구직촉진수당 수급이 끝났다고 취업지원서비스가 항상 끝나는 것은 아닙니다.</b> 매뉴얼은 법 제29조제1항제7호·제8호 사유에서는 남은 서비스 제공이 가능한 경우를 구분합니다.</p><p>지급신청서 연속 미제출 처리도 단순히 ‘미제출 횟수’만으로 일괄 종료하지 않습니다. 매뉴얼 114~115쪽은 연속 2회 이상 미제출 때 확인·종료 가능 절차와 사전통지·의견청취, 처분 전 다시 성실히 참여한 경우의 예외를 함께 안내합니다.</p><p class="notice">‘지급신청서 미제출’, ‘소득초과 지급정지’, ‘IAP 불이행 지급중단’은 구분하여 처리해야 합니다. 이 페이지는 수급권 소멸이나 서비스 종료를 자동 판정하지 않습니다.</p>''',manual('102·114~117','110·122~125')+' / '+a(jo('253641',29),'법 제29조')+' / '+a(jo('291203',20),'시행규칙 제20조')),
],
}

CSS='''
:root{font-family:'Malgun Gothic','Noto Sans CJK KR',system-ui,sans-serif;color:#203247;background:#f3f6f8;font-size:15px;line-height:1.8}*{box-sizing:border-box}body{margin:0}a{color:#165d83}button,input{font:inherit}button,a,input{touch-action:manipulation}button{cursor:pointer;background:#fff;border:1px solid #b9c8d3;border-radius:7px;padding:8px 12px;color:#203247}button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #2a8abc;outline-offset:3px}a[aria-current=page]{background:#e5f3ee;color:#135f4d;font-weight:800}.layout{display:grid;grid-template-columns:230px minmax(0,1fr);max-width:1390px;margin:auto}.rail{padding:25px 18px;position:sticky;top:0;height:100vh;overflow-y:auto;background:white;border-right:1px solid #dae4e9}.brand{font-size:17px;font-weight:800;line-height:1.5;margin:0 9px 22px;color:#185e50}.rail a{display:block;text-decoration:none;color:#3c5064;border-radius:8px;padding:8px 12px;margin:3px 0;font-size:14px}.rail small{display:block;padding:12px 9px;color:#607487;font-size:12px}main{padding:32px 35px 64px;min-width:0;max-width:1120px}h1{font-size:30px;line-height:1.4;margin:10px 0}h2{font-size:21px;line-height:1.5;margin:0 0 13px}h3{font-size:17px;line-height:1.5;margin:18px 0 8px}p{margin:10px 0}.eyebrow{font-size:12px;font-weight:800;color:#27725f;letter-spacing:.08em}.muted,small{color:#5b7081}.box,article{background:white;border:1px solid #d9e3e9;border-radius:12px;padding:22px;margin:17px 0}.operation{border-top:4px solid #568cb2}.notice{background:#fff7e5;border-left:4px solid #c3932c;padding:13px 16px;border-radius:6px}.lead{background:#e9f5ef;border-left:4px solid #2b8069;padding:13px 16px;border-radius:6px}.tag{display:inline-block;background:#edf2f6;color:#506578;font-size:12px;font-weight:800;border-radius:4px;padding:2px 8px;margin-bottom:9px}.operation .tag{background:#eaf2fa;color:#315d80}.source{font-size:12px;color:#617284;border-top:1px solid #e2e9ee;margin-top:17px;padding-top:11px}.source a{display:inline-block;margin-right:6px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.tile{padding:16px;border:1px solid #dce6ec;border-radius:10px;background:white;text-decoration:none;color:#203247}.tile b{display:block;font-size:17px;color:#1d6f5b}.tile span{display:block;font-size:13px;color:#5f7183;margin-top:6px}.metric{padding:13px;background:#f3f7f9;border-radius:8px}.metric strong{display:block;font-size:23px;color:#216e5b}.metric span{display:block}.table{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:10px 12px;border-bottom:1px solid #dce4ea;vertical-align:top;text-align:left}th{background:#eef4f7}ul,ol{padding-left:23px}li{margin:7px 0}summary{cursor:pointer;font-weight:700;padding:10px 0}details{border-top:1px solid #e1e8ed;margin-top:12px}.examples{background:#f2f6fa;padding:12px 16px;border-radius:8px}.tools{border-bottom:1px solid #d8e3e8;padding:15px 0}.tools input{width:100%;padding:12px 15px;border:1px solid #a8bdca;border-radius:8px;background:white}.actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}#result{font-size:13px;color:#617284;margin:6px 0}.check{display:flex;align-items:baseline;gap:10px;margin:10px 0}input[type=checkbox]{width:17px;height:17px;accent-color:#23765f;flex-shrink:0}.pagenav{display:flex;justify-content:space-between;gap:15px;margin-top:27px}.pagenav a{display:block;background:white;border:1px solid #ccdce5;border-radius:8px;text-decoration:none;padding:10px 14px}footer{font-size:12px;color:#607487;margin-top:30px}.empty{padding:25px;text-align:center}#globalResults a{display:block;padding:13px;border:1px solid #d7e3e9;border-radius:8px;margin:9px 0;background:white;text-decoration:none}#globalResults a small{display:block}article{scroll-margin-top:12px}[hidden]{display:none!important}.scope{display:flex;gap:8px;flex-wrap:wrap;font-size:12px}.scope span{background:#e8eef3;padding:3px 9px;border-radius:6px}@media(max-width:1000px){.layout{grid-template-columns:190px minmax(0,1fr)}main{padding:24px 20px}.rail{padding:20px 10px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.layout{display:block}.rail{height:auto;position:static;border-right:0;border-bottom:1px solid #d8e3e9;padding:15px}.rail nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.rail a{padding:6px;margin:0;text-align:center;font-size:12px}.brand{margin:0 0 10px}.rail small{display:none}main{padding:20px 13px 45px}h1{font-size:25px}.box,article{padding:17px}.grid{gap:8px}.tile{padding:12px}.tile b{font-size:15px}th,td{padding:8px}table{min-width:380px}}@media print{.layout{display:block}.rail,.tools,.actions,.pagenav,#result{display:none}main{max-width:none;padding:0}body{background:white;font-size:11pt}article,.box{break-inside:avoid;border-radius:0}article[hidden]{display:block!important}.source{font-size:9pt}a{color:inherit;text-decoration:none}h1{font-size:21pt}.grid{grid-template-columns:repeat(3,1fr)}footer{margin-top:15px}}
'''
JS='''(()=>{'use strict';const d=document,q=d.getElementById('search'),cards=[...d.querySelectorAll('#cards article')];
function update(){const words=q.value.trim().toLocaleLowerCase().split(/\\s+/).filter(Boolean);if(d.body.dataset.topic==='overview'){const results=d.getElementById('globalResults');results.replaceChildren();if(words.length){let count=0;window.guideIndex.forEach(item=>{if(words.every(word=>item.text.toLocaleLowerCase().includes(word))){const link=d.createElement('a'),title=d.createElement('b'),snippet=d.createElement('small');link.href=item.url;title.textContent=item.title;snippet.textContent=item.topic+' · '+item.preview;link.append(title,snippet);results.append(link);count++}});d.getElementById('result').textContent=count+'개 항목';results.hidden=false;d.getElementById('empty').hidden=count!==0}else{results.hidden=true;d.getElementById('result').textContent='업무별 페이지 전체에서 검색합니다.';d.getElementById('empty').hidden=true}return}let n=0;cards.forEach(c=>{const show=words.every(word=>c.textContent.toLocaleLowerCase().includes(word));c.hidden=!show;if(show)n++});d.getElementById('result').textContent=n+'개 항목 / 이 페이지 '+cards.length+'개';d.getElementById('empty').hidden=n!==0}
q.addEventListener('input',update);d.getElementById('clearSearch').addEventListener('click',()=>{q.value='';update();q.focus()});d.getElementById('reset')?.addEventListener('click',()=>d.querySelectorAll('#checklist input').forEach(c=>c.checked=false));let open=[];window.addEventListener('beforeprint',()=>{open=[...d.querySelectorAll('details')].map(c=>[c,c.open]);open.forEach(([c])=>c.open=true)});window.addEventListener('afterprint',()=>open.forEach(([c,state])=>c.open=state));d.getElementById('print').addEventListener('click',()=>window.print());update();})();'''

def path(topic):
    return 'performance-guide-2026.html' if topic=='overview' else f'performance-2026/{topic}.html'
def href(current, dest):
    return ('../' if current!='overview' else '')+path(dest)
def text(s):
    return html.unescape(re.sub('<[^>]+>',' ',s))

def overview():
    metrics=[('30','취업실적'),('25','알선취업실적'),('10','조기취업실적'),('10','임금수준'),('15','고용유지'),('10','참여자 만족도')]
    tiles=''.join(f'<a class="tile" href="{path(k)}"><b>{title}</b><span>{desc}</span></a>' for k,title,desc in TOPICS[1:])
    return '''<section class="box"><h2>업무별로 나눠서 보세요</h2><p>각 페이지에서 <b>평가 기준</b>을 먼저 읽고, 파란색 <b>상담 처리</b> 설명과 출처를 확인하세요.</p><div class="grid">'''+tiles+'''</div></section>
<section class="box"><h2>상담사가 먼저 챙길 6가지</h2><ol><li>평가기간 내 IAP 종료일·종료사유를 확인합니다.</li><li>알선과 국취 취업종료는 같은 구직인증번호로 연결합니다.</li><li>조기취업은 IAP 수립일부터 3개월 이내입니다.</li><li>평가 고용유지는 180일 초과입니다.</li><li>연계 가점은 기관의 연계와 실제 참여 증빙이 모두 필요합니다.</li><li>서비스 연계 가능 여부와 평가실적 인정 여부를 따로 봅니다.</li></ol><div class="source">근거: 지표정의서 A2·B1·C1·F1·연계 가점, 2차 점검 안내, 가점 QA / 업무매뉴얼 166~167쪽</div></section>
<section class="box"><h2>기본 100점 + 별도 가점</h2><div class="grid">'''+''.join(f'<div class="metric"><strong>{v}점</strong><span>{name}</span></div>' for v,name in metrics)+'''</div><p>타사업 연계: 10~19건 1점 / 20~39건 2점 / 40건 이상 3점</p><details><summary>취업률 목표를 달성하면 점수가 확정되나요?</summary><p>취업·알선·조기취업은 평균·표준편차를 사용하는 상대평가입니다. 단독기관은 비율 80%·인원 20%, 컨소시엄은 90%·10%를 반영합니다. 임금수준은 권역별 표준점수입니다. 우리 기관의 실적만으로 최종점수를 확정할 수 없습니다.</p></details><p class="notice">알선 시트 제목·산식은 25점, A7에는 20점으로 서로 다릅니다. 여기서는 제목·산식의 25점을 표시하되 원문 오기 확인이 필요합니다.</p><div class="source">근거: 지표정의서 각 시트·산식·가점 E9</div></section>'''

def sources():
    data=[('평가 지표정의서 v2','기본 배점·지표별 대상·일자·제외·가점','각 평가 카드의 시트·지표 ID·셀'),('2차 점검 유의사항(2026.9.7.)','중간점검 미반영·취득일·마감·검증요청','중간점검의 한시 안내와 본평가를 구분'),('수기자료검증 가점 QA','연계 가점의 사업·증빙·참여·제외','법령상 서비스 가능 여부와 다를 수 있음'),('업무매뉴얼(2026.1)','상담·IAP·서비스기간·종료·연계·근속','본문 인쇄 쪽수와 PDF 페이지를 병기')]
    rows=''.join('<tr>'+''.join('<td>'+html.escape(c)+'</td>' for c in row)+'</tr>' for row in data)
    content='<div class="table"><table><thead><tr><th>자료</th><th>사용 범위</th><th>읽는 방법</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    content+='<h3>직접 확인한 공식 법령·고시</h3><ul>'
    content+='<li>'+a(LAW,'구직자 취업촉진 및 생활안정지원에 관한 법률')+' — 법률 제19610호, 전체 시행 2024.2.9. 표시본. 제13·14·15·29조를 대조했습니다. 조문 팝업은 조문별 시행 표기가 다를 수 있습니다.</li>'
    content+='<li>'+a(RULE,'같은 법 시행규칙')+' — <b>2026.10.14. 시행, 고용노동부령 제486호</b>. 제8·9·11·20조를 대조했습니다.</li>'
    content+='<li>'+a(OP,'국민취업지원제도 운영규정')+' — <b>2026.5.28. 시행, 고용노동부고시 제2026-35호</b>. 제3조 소득환산, 제8조 IAP에 따른 직접일자리 예외를 대조했습니다.</li></ul>'
    content+='<h3>법령 원문 바로가기</h3><div class="actions">'+''.join(a(jo('253641',n),'법 제'+str(n)+'조') for n in [13,14,15,29])+''.join(a(jo('291203',n),'시행규칙 제'+str(n)+'조') for n in [8,9,11,20])+'</div>'
    content+='<p class="notice"><b>최신 개정 반영:</b> 시행규칙 제20조제2항제3호는 관련 수당 수급 시점에 대해 ‘수당을 처음 받는 날’이 아니라 <b>‘수당 지급기간의 첫 날’</b>로 변경되어 있습니다. 해당 종료사유에 적용할 때 1월 매뉴얼의 종전 표현만 사용하지 않습니다.</p>'
    content+='<h3>자료 대조 원칙</h3><p>법령·고시는 실제 서비스 제공과 처분의 기준으로, 평가문서는 해당 연도 실적 산정 기준으로 확인합니다. 평가 QA가 더 좁은 인정 범위를 정한다고 해서 필요한 상담서비스를 제한하는 근거가 되는 것은 아닙니다. 같은 내용에 차이가 있으면 적용일·적용대상을 확인하고 담당 고용센터에 문의합니다.</p>'
    content+='<h3>아직 해석 확인이 필요한 항목</h3><ul><li>평가지표의 일부 연도·배점·산식 참조 ID 불일치.</li><li>평가기간은 2025.11.1.~2026.10.31.로 안내하지만 A2의 날짜 비교에는 엄격한 부등호(&lt;) 표기도 있어, 경계일 종료 건의 산정은 로우데이터와 담당기관 확인이 필요합니다.</li><li>‘다른 종류 사업 중복 인정’과 ‘일경험 외 타사업 1회’가 병존하는 집계 범위.</li><li>정확히 1개월인 일경험 과정 또는 개인 참여기간의 연계 가점 처리.</li><li>중간점검 안내 이후 최종평가 수기 검증결과·추가 공지.</li></ul>'
    content+='<p><b>확인일: 2026.10.21.</b> 법령은 국가법령정보센터 공식 원문을 직접 조회·대조했습니다. 실시간 법령 API 자동연동·개정 자동 갱신 기능은 아닙니다. 이 안내는 첨부 평가자료 3종, 업무매뉴얼 1종, 위에서 확인한 관련 법령·고시 범위의 업무 참고 최종 정리본입니다. 매뉴얼 전체의 모든 업무를 대체하지 않습니다.</p>'
    return card('source-register','근거자료와 법령 확인 기록',content,'사용자 제공 4종 자료 / 국가법령정보센터 직접 확인 2026.10.21.','근거·확인 기록','reference')

def checklist():
    labels=['평가기간 내 IAP 종료일·종료사유를 확인했다.','알선과 국취 종료처리의 구직인증번호·기관을 확인했다.','취득일·조기취업·임금·고용유지를 각각 확인했다.','연계와 실제 참여 증빙을 모두 확보하고 IAP에 입력·첨부했다.','제외·중복·수기 확인 대상을 검토했다.','미반영 건은 마감시점·본평가 제출 절차를 확인했다.']
    return '<section class="box" id="checklist"><h2>마감 전 확인표</h2><p class="muted">현재 화면에서만 체크되며, 새로고침하면 초기화됩니다. 참여자 정보·체크내용을 저장하지 않습니다.</p>'+''.join('<label class="check"><input type="checkbox">'+x+'</label>' for x in labels)+'<button type="button" id="reset">확인표 초기화</button></section>'

def build():
    records=json.loads((ROOT/'docs/performance-2026-content.json').read_text())
    bodies={k:[] for k,_,_ in TOPICS}
    for r in records:
        bodies[r['topic']].append(f'<article id="{r["id"]}" class="criterion"><span class="tag">평가 기준</span>'+r['html']+'</article>')
    for k,items in supplements.items():
        bodies[k]+=items
    # Supply manual page provenance for the applicable evaluation cards as well.
    for k in ['employment','referral','early','wages','retention','experience','linkage','satisfaction','review']:
        bodies[k].insert(0,'<div class="scope"><span>회색: 평가문서 기준</span><span>파란색: 매뉴얼·법령에 따른 상담 처리</span></div>')
    bodies['overview']=[overview()]
    bodies['sources']=[sources()]
    bodies['review'].append(checklist())
    index=[]
    for k,title,_ in TOPICS:
        for part in bodies[k]:
            m=re.search(r'<article id="([^"]+)"',part)
            h=re.search(r'<h2>(.*?)</h2>',part,re.S)
            if m and h:
                plain=re.sub(r'\s+',' ',text(part)).strip()
                index.append({'url':path(k)+'#'+m[1],'title':text(h[1]),'topic':title,'text':plain,'preview':plain[:135]})
    for pos,(k,title,desc) in enumerate(TOPICS):
        nav=''.join(f'<a href="{href(k,dest)}"'+(' aria-current="page"' if dest==k else '')+'>'+html.escape(name)+'</a>' for dest,name,_ in TOPICS)
        prev=TOPICS[pos-1] if pos else None; nxt=TOPICS[pos+1] if pos<len(TOPICS)-1 else None
        paging='<div class="pagenav">'+(f'<a href="{href(k,prev[0])}">← {prev[1]}</a>' if prev else '<span></span>')+(f'<a href="{href(k,nxt[0])}">{nxt[1]} →</a>' if nxt else '<span></span>')+'</div>'
        searchLabel='전체 페이지에서 검색' if k=='overview' else '이 페이지에서 검색'
        srcLink=href(k,'sources')
        notice='2026년 평가기간: 2025.11.1.~2026.10.31. · 이후 연도에 그대로 적용하지 않습니다.'
        doc=f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} · 2026 성과평가 길잡이</title><style>{CSS}</style></head><body data-topic="{k}"><div class="layout"><aside class="rail"><div class="brand">좋은일자리<br>2026 성과평가 길잡이</div><nav aria-label="업무별 페이지">{nav}</nav><small>확인일 2026.10.21.<br>업무매뉴얼·평가자료·공식 법령 대조<br>개정 자동 갱신 아님</small></aside><main><header><div class="eyebrow">2026 PERFORMANCE GUIDE · {pos+1:02d} / {len(TOPICS):02d}</div><h1>{title}</h1><p>{desc}</p><p class="muted">{notice}</p><p class="muted"><a href="{srcLink}">근거자료·법령 확인 기록</a> · 평가실적 인정과 실제 상담 처리를 따로 확인하세요.</p></header><div class="tools"><label for="search"><b>{searchLabel}</b></label><input type="search" id="search" placeholder="예: 구직인증번호, 현장실습, 258만원, 본인 희망" autocomplete="off"><div class="actions"><button type="button" id="clearSearch">검색 초기화</button><button type="button" id="print">이 페이지 인쇄</button></div><div id="result" role="status" aria-live="polite"></div></div><div id="globalResults" hidden></div><p id="empty" class="empty" hidden>검색 결과가 없습니다. 다른 단어로 검색하거나 검색을 초기화하세요.</p><div id="cards">{''.join(bodies[k])}</div>{paging}<footer>좋은일자리 · 2026 성과평가 길잡이 v2 · 첨부 평가자료 3종 + 2026.1 업무매뉴얼 + 관련 법령·고시 대조<br>확인표·검색내용·개인정보를 저장하거나 전송하지 않습니다.</footer></main></div>'''
        if k=='overview':
            doc+='<script>window.guideIndex='+json.dumps(index,ensure_ascii=False).replace('<','\\u003c')+';</script>'
        doc+='<script>'+JS+'</script></body></html>'
        dest=ROOT/path(k);dest.parent.mkdir(exist_ok=True);dest.write_text(doc+'\n')
    print(f'Built {len(TOPICS)} pages, {len(index)} searchable reference cards')

if __name__=='__main__':
    build()
