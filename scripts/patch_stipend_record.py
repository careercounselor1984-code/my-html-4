#!/usr/bin/env python3
"""Patch only embedded p06 output logic; retain existing stipend calculation logic."""
from pathlib import Path
import re,base64
p=Path('index.html')
s=p.read_text('utf-8')
m=re.search(r'("id":"p06","title":"[^"]+","b64":")([A-Za-z0-9+/=]+)(")',s)
assert m,"p06 page not found"
h=base64.b64decode(m.group(2)).decode('utf-8')
if 'function buildPaymentRecordSection(' in h:
 print('ALREADY_PATCHED');raise SystemExit(0)
def ro(old,new,name):
 global h
 n=h.count(old); assert n==1,f'{name}: matched {n}'
 h=h.replace(old,new,1)
anchor='''            <div class="mb-8 p-4 border rounded-xl bg-white shadow-sm">
                <h2 class="text-lg font-bold text-gray-700 mb-3 border-b pb-2">지급 금액 산정 (2026년 기준)</h2>'''
family_ui='''            <div class="mb-4 p-3 rounded-xl border border-sky-200 bg-sky-50">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <label for="familyChangeType" class="text-sm font-bold text-sky-800">가족수당 변동사항</label>
                    <select id="familyChangeType" onchange="toggleFamilyChange()" class="w-full sm:w-auto p-2 text-sm border border-sky-300 bg-white rounded-lg">
                        <option value="none" selected>변동 없음 (상담일지 미표기)</option>
                        <option value="increase">대상자 추가 (출생·자격 발생 등)</option>
                        <option value="decrease">대상자 제외 (연령 초과·자격 상실 등)</option>
                        <option value="other">기타 인원 변경</option>
                    </select>
                </div>
                <p class="mt-2 text-xs text-sky-700">기존 가족수당은 IAP 결정내용을 기준으로 확인합니다. 실제 변동이 있을 때만 아래 내용을 기록하세요.</p>
                <div id="familyChangeFields" class="hidden mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white border border-sky-200 rounded-lg p-3">
                    <div><label for="familyBeforeCount" class="block text-xs font-semibold mb-1">변경 전 대상 가족 수</label>
                        <select id="familyBeforeCount" class="w-full p-2 border rounded-lg text-sm">
                            <option value="" selected>선택</option><option value="0">0명</option><option value="1">1명</option><option value="2">2명</option><option value="3">3명</option><option value="4">4명</option>
                        </select></div>
                    <div><label for="familyChangeDate" class="block text-xs font-semibold mb-1">변동 적용일</label><input id="familyChangeDate" type="date" class="w-full p-2 border rounded-lg text-sm"></div>
                    <div><label for="familyChangeReason" class="block text-xs font-semibold mb-1">변동 사유</label><input id="familyChangeReason" type="text" placeholder="예: 자녀 출생, 연령 초과" class="w-full p-2 border rounded-lg text-sm"></div>
                    <p class="md:col-span-3 text-xs text-gray-600">변경 후 가족 수는 아래 <b>지급 금액 산정 → 부양가족 수</b>에서 선택합니다. 증빙과 고용센터 확인 후 적용하세요.</p>
                </div>
            </div>

'''
ro(anchor,family_ui+anchor,'family-change controls')
helper=r'''        function toggleFamilyChange() {
            const fields = document.getElementById('familyChangeFields');
            fields.classList.toggle('hidden', document.getElementById('familyChangeType').value === 'none');
        }

        // 산정 기능은 유지하고 실제 소득·가족수당·이행률 변동만 상담일지에 남긴다.
        function buildPaymentRecordSection(calc, incomeStatus, ratePct, familyChange) {
            const lines = ['- 소득 발생: ' + (incomeStatus === '있음' ? '있음' : '없음')];
            if (incomeStatus === '있음') {
                if (calc.reportedIncome > 0) lines.push('- 신고소득 합계: ' + calc.reportedIncome.toLocaleString() + '원');
                if (calc.nonProgramIncome > 0 && calc.nonProgramIncome !== calc.reportedIncome)
                    lines.push('- 프로그램 수당 제외 신고소득: ' + calc.nonProgramIncome.toLocaleString() + '원');
                if (calc.programIncome > 0) lines.push('- 취업지원프로그램 수당: ' + calc.programIncome.toLocaleString() + '원');
                if (calc.excludedIncome > 0) lines.push('- 산정 제외·참고 금액: ' + calc.excludedIncome.toLocaleString() + '원');
                lines.push('- 소득 판정: ' + calc.decision);
                lines.push('- 소득 판정 기준금액: ' + calc.criteria.toLocaleString() + '원');
            }
            if (familyChange) {
                lines.push('- 가족수당 변동: ' + familyChange.typeLabel);
                lines.push('- 가족수당 대상 가족 수: ' + familyChange.before + '명 → ' + familyChange.after + '명');
                lines.push('- 변동 적용일: ' + familyChange.date);
                lines.push('- 변동 사유: ' + familyChange.reason);
                lines.push('- 가족수당 변경사항은 증빙 확인 후 관할 고용센터에 신고·확인하도록 안내함');
            }
            if (ratePct !== 100) {
                lines.push('- 구직활동 이행에 따른 조정: ' + (ratePct === 50 ? '일부 미이행(50% 지급)' : '전체 미이행(부지급)'));
            }
            if (incomeStatus === '있음' || familyChange || ratePct !== 100) {
                lines.push('- 지급 예상액: ' + calc.pay.toLocaleString() + '원 (고용센터 심사 후 확정)');
            }
            return lines.join('\n');
        }

'''
ro('        function generateResult() {',helper+'        function generateResult() {','record helper')
old='''            const calc = calculate();
            const incStatus = document.querySelector('input[name="incomeStatus"]:checked').value;
            const finalCounselorOpinion = getFinalCounselorOpinion(round);

            // 상담일지 내용'''
new=r'''            const calc = calculate();
            const incStatus = document.querySelector('input[name="incomeStatus"]:checked').value;
            const finalCounselorOpinion = getFinalCounselorOpinion(round);
            const ratePct = Number(document.getElementById('paymentRate').value || 0);
            const changeType = document.getElementById('familyChangeType').value;
            let familyChange = null;
            if (changeType !== 'none') {
                const beforeValue = document.getElementById('familyBeforeCount').value;
                const date = document.getElementById('familyChangeDate').value;
                const reason = document.getElementById('familyChangeReason').value.trim();
                const after = calc.familyCount;
                if (beforeValue === '' || !date || !reason) {
                    alert('가족수당 변동 시 변경 전 가족 수, 변동 적용일, 사유를 입력해주세요.');
                    document.getElementById('resultArea').classList.add('hidden');
                    return;
                }
                const before = Number(beforeValue);
                if (before === after ||
                    (changeType === 'increase' && after <= before) ||
                    (changeType === 'decrease' && after >= before)) {
                    alert('가족수당 변경 전후 인원을 확인해주세요. 변경 후 인원은 지급 금액 산정의 부양가족 수에서 선택합니다.');
                    document.getElementById('resultArea').classList.add('hidden');
                    return;
                }
                const typeLabel = {increase:'대상자 추가',decrease:'대상자 제외',other:'대상 인원 변경'}[changeType];
                familyChange = {typeLabel, before, after, date:fmtDate(date), reason};
            }
            if (incStatus === '있음' && ![...document.querySelectorAll('#incomeGroups .inc-amt')].some(el => Number(el.value || 0) > 0)) {
                alert('소득 있음으로 선택한 경우 발생 소득의 금액과 내용을 입력해주세요.');
                document.getElementById('resultArea').classList.add('hidden');
                return;
            }
            const paymentRecord = buildPaymentRecordSection(calc, incStatus, ratePct, familyChange);
            // 소득 없음으로 전환하면 숨겨진 과거 소득 행이 출력에 남지 않게 한다.
            const incomeDetailSection = incStatus === '있음'
                ? '<소득 신고 상세 내역>\n' + getIncomeDetailString() + '\n\n'
                : '';

            // 상담일지 내용'''
ro(old,new,'generateResult variables')
old_record='''<지급 및 소득>
- 기본 수당: ${calc.appliedBase.toLocaleString()}원
- 가족 수당: ${calc.appliedFam ? calc.appliedFam.toLocaleString() + '원' : '비해당'}
- 신고소득 합계: ${incStatus === '없음' ? '0원' : calc.reportedIncome.toLocaleString() + '원'}
- 프로그램 수당 제외 신고소득: ${incStatus === '없음' ? '0원' : calc.nonProgramIncome.toLocaleString() + '원'}
- 소득 판정 기준금액: ${calc.criteria.toLocaleString()}원
- 소득 판정: ${calc.decision}
- 최종 지급 총액: ${calc.pay.toLocaleString()}원

<소득 신고 상세 내역>
${getIncomeDetailString()}

<필수 안내사항>'''
new_record='''<지급 및 소득>
${paymentRecord}

${incomeDetailSection}<필수 안내사항>'''
ro(old_record,new_record,'summary replacement')
for mark in ['id="familyChangeType"','id="familyBeforeCount"','id="familyChangeDate"','id="familyChangeReason"','function toggleFamilyChange(', 'function buildPaymentRecordSection(', '${paymentRecord}', '${incomeDetailSection}']:
 assert h.count(mark)==1,(mark,h.count(mark))
js=re.search(r'<script>(.*?)</script>',h,re.S)
assert js
Path('debug').mkdir(exist_ok=True)
Path('debug/p06-patched.js').write_text(js.group(1),'utf-8')
Path('debug/p06-patched.html').write_text(h,'utf-8')
s=s[:m.start(2)]+base64.b64encode(h.encode('utf-8')).decode('ascii')+s[m.end(2):]
p.write_text(s,'utf-8')
print('PATCH_OK p06 chars='+str(len(h)))
