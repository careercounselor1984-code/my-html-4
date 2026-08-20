from pathlib import Path
import base64
import re

INDEX = Path("index.html")
s = INDEX.read_text(encoding="utf-8")

patterns = [
    re.compile(r'\{"id":"p11","title":"종료/사후관리","b64":"([A-Za-z0-9+/=]+)"\}'),
    re.compile(r'"id":"p11","title":"종료/사후관리","b64":"([A-Za-z0-9+/=]+)"'),
]
match = None
for pattern in patterns:
    match = pattern.search(s)
    if match:
        break
if not match:
    raise RuntimeError("p11 종료/사후관리 module not found")

html = base64.b64decode(match.group(1)).decode("utf-8")
if 'data-tab="DEFER"' in html:
    print("ALREADY_PATCHED")
    Path("p11-decoded.html").write_text(html, encoding="utf-8")
    raise SystemExit(0)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    print(f"{label}: anchor_count={count}")
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 anchor, found {count}")
    return text.replace(old, new, 1)


html = replace_once(
    html,
    "취업 종료 / 취업지원서비스 기간 종료 / 국민취업지원제도 종료를 한 화면에서 작성·복사합니다.",
    "취업 종료 / 취업지원서비스 기간 종료 / 국민취업지원제도 종료·유예·중단을 한 화면에서 작성·복사합니다.",
    "subtitle",
)
html = replace_once(
    html,
    '          <button class="tabbtn" data-tab="STOP" type="button">4) 중단</button>',
    '          <button class="tabbtn" data-tab="DEFER" type="button">4) 유예</button>\n'
    '          <button class="tabbtn" data-tab="STOP" type="button">5) 중단</button>',
    "stop tab",
)
html = replace_once(
    html,
    '          <button class="tabbtn" data-tab="SUCC_BONUS" type="button">5) 취업성공수당</button>',
    '          <button class="tabbtn" data-tab="SUCC_BONUS" type="button">6) 취업성공수당</button>',
    "success tab",
)
html = replace_once(
    html,
    '          <button class="tabbtn" data-tab="REVIEW_EVENT" type="button">6) 취업자 후기 이벤트</button>',
    '          <button class="tabbtn" data-tab="REVIEW_EVENT" type="button">7) 취업자 후기 이벤트</button>',
    "review tab",
)

pane = '''      <!-- 4) 유예 -->
      <div class="card col12 tabPane hidden" data-pane="DEFER">
        <div class="grid" style="margin-top:0">
          <div class="col12">
            <div class="note"><b>유예 상담일지</b>: 유예 사유와 기간, 확인사항·증빙, 재개 계획을 기록합니다. 실제 유예 가능기간과 필요 증빙은 기관 기준에 맞게 확인해 입력하세요.</div>
          </div>
          <div class="col6">
            <label>유예 사유</label>
            <input id="deferReason" type="text" placeholder="유예 사유를 입력하세요"/>
          </div>
          <div class="col6">
            <label>유예 시작일</label>
            <input id="deferStartDate" type="date"/>
          </div>
          <div class="col6">
            <label>유예 종료예정일</label>
            <input id="deferEndDate" type="date"/>
          </div>
          <div class="col6">
            <label>재개 예정일</label>
            <input id="deferResumeDate" type="date"/>
          </div>
          <div class="col12">
            <label>확인사항·증빙</label>
            <textarea id="deferProof" placeholder="확인한 내용, 제출·확인한 증빙 등을 입력하세요"></textarea>
          </div>
          <div class="col12">
            <label>향후 상담계획</label>
            <textarea id="deferPlan" placeholder="재개 시점 연락, 참여 재개 여부 확인, 다음 상담계획 등을 입력하세요"></textarea>
          </div>
          <div class="col12">
            <label>특이사항</label>
            <textarea id="deferNotes" placeholder="추가로 기록할 사항이 있으면 입력하세요"></textarea>
          </div>
        </div>
      </div>

      <!-- 5) 중단 -->'''
html = replace_once(html, "      <!-- 4) 중단 -->", pane, "defer pane")
html = html.replace(
    "      <!-- 5) 취업성공수당(카톡 멘트용) -->",
    "      <!-- 6) 취업성공수당(카톡 멘트용) -->",
    1,
)
html = html.replace(
    "      <!-- 6) 취업자 후기 이벤트(카톡 발송용) -->",
    "      <!-- 7) 취업자 후기 이벤트(카톡 발송용) -->",
    1,
)

record_block = '''    if(tab==='DEFER'){
      const reason = ($('deferReason')?.value || '').trim();
      const start = $('deferStartDate')?.value || '';
      const end = $('deferEndDate')?.value || '';
      const resume = $('deferResumeDate')?.value || '';
      const proof = ($('deferProof')?.value || '').trim();
      const plan = ($('deferPlan')?.value || '').trim();
      const notes = ($('deferNotes')?.value || '').trim();

      lines.push('');
      lines.push('<국민취업지원제도 유예>');
      lines.push(`- 유예 사유 : ${reason || '-'}`);
      lines.push(`- 유예 시작일 : ${start || '-'}`);
      lines.push(`- 유예 종료예정일 : ${end || '-'}`);
      lines.push(`- 재개 예정일 : ${resume || '-'}`);
      lines.push(`- 확인사항·증빙 : ${proof || '-'}`);
      lines.push('- 유예 사유 또는 기간에 변동사항 발생 시 담당자에게 연락하도록 안내함');
      lines.push('- 재개 예정 시점에 참여 재개 여부 및 상담 일정을 다시 확인하기로 함');
      lines.push('');
      lines.push('<향후 상담계획>');
      lines.push(plan || '-');
      lines.push('');
      lines.push('<특이사항>');
      lines.push(notes || '-');
    }

'''
record_start = html.index("  function buildRecord(){")
record_end = html.index("  function buildServEndPreMent(){", record_start)
record_stop = html.index("    if(tab==='STOP'){", record_start, record_end)
html = html[:record_stop] + record_block + html[record_stop:]

ment_block = '''    if(tab==='DEFER'){
      const reason = ($('deferReason')?.value || '').trim();
      const start = $('deferStartDate')?.value || '';
      const end = $('deferEndDate')?.value || '';
      const resume = $('deferResumeDate')?.value || '';
      let periodLine = '유예 기간은 입력된 일정에 따라 처리될 예정입니다.';
      if(start && end) periodLine = `${start}부터 ${end}까지 유예 기간으로 확인했습니다.`;
      else if(start) periodLine = `${start}부터 유예가 시작되는 것으로 확인했습니다.`;
      else if(end) periodLine = `유예 종료예정일은 ${end}입니다.`;
      return [
        '국민취업지원제도 유예 관련하여 안내드립니다.',
        '',
        reason ? `확인된 유예 사유 : ${reason}` : '유예 사유와 관련된 내용을 확인했습니다.',
        periodLine,
        resume ? `재개 예정일은 ${resume}입니다.` : '유예 종료 후 참여 재개 가능 여부와 일정을 다시 확인하겠습니다.',
        '',
        '유예 사유나 기간에 변동이 생기면 담당자에게 미리 연락 부탁드립니다.',
        '재개 시점에 다시 연락드려 참여 재개 여부와 상담 일정을 확인하겠습니다.'
      ].join('\\n');
    }

'''
ment_start = html.index("  function buildMent(){")
ment_end = html.index("function renderMentChat", ment_start)
ment_stop = html.index("    if(tab==='STOP'){", ment_start, ment_end)
html = html[:ment_stop] + ment_block + html[ment_stop:]

html = replace_once(
    html,
    "'empOpinion','stopDate','stopReason','stopOpinion','sbExtra'",
    "'empOpinion','deferReason','deferStartDate','deferEndDate','deferResumeDate','deferProof','deferPlan','deferNotes','stopDate','stopReason','stopOpinion','sbExtra'",
    "reset ids",
)

html = html.replace(
    "// 5) 취업성공수당 탭은 상담일지 기록이 아니라 카톡 멘트 생성용",
    "// 6) 취업성공수당 탭은 상담일지 기록이 아니라 카톡 멘트 생성용",
    1,
)
html = html.replace(
    "// 6) 취업자 후기 이벤트 탭은 상담일지 기록이 아니라 카톡 멘트 생성용",
    "// 7) 취업자 후기 이벤트 탭은 상담일지 기록이 아니라 카톡 멘트 생성용",
    1,
)

expected = {
    'data-tab="DEFER"': 1,
    'data-pane="DEFER"': 1,
    "if(tab==='DEFER')": 2,
    'id="deferReason"': 1,
    'id="deferStartDate"': 1,
    'id="deferEndDate"': 1,
    'id="deferResumeDate"': 1,
    'id="deferProof"': 1,
    'id="deferPlan"': 1,
    'id="deferNotes"': 1,
}
for token, wanted in expected.items():
    got = html.count(token)
    print(f"check {token}: {got}")
    if got != wanted:
        raise RuntimeError(f"validation failed: {token}={got}, expected {wanted}")

new_b64 = base64.b64encode(html.encode("utf-8")).decode("ascii")
s = s[: match.start(1)] + new_b64 + s[match.end(1) :]
INDEX.write_text(s, encoding="utf-8")
Path("p11-decoded.html").write_text(html, encoding="utf-8")
print("PATCH_OK")
print("patched module chars:", len(html))
