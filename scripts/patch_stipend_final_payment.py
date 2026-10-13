#!/usr/bin/env python3
"""Update the already-embedded p06 stipend record to always show final expected amount."""
import base64,re
from pathlib import Path
index=Path('index.html')
s=index.read_text(encoding='utf-8')
m=re.search(r'("id":"p06","title":"[^"]+","b64":")([A-Za-z0-9+/=]+)(")',s)
assert m,'embedded p06 missing'
html=base64.b64decode(m.group(2)).decode('utf-8')
old="""            if (incomeStatus === '있음' || familyChange || ratePct !== 100) {
                lines.push('- 지급 예상액: ' + calc.pay.toLocaleString() + '원 (고용센터 심사 후 확정)');
            }"""
new="""            lines.push('- 최종 지급 예상액: ' + calc.pay.toLocaleString() + '원 (고용센터 심사 후 확정)');"""
if new in html and old not in html:
    print('ALREADY_PATCHED')
else:
    assert html.count(old)==1, f"expected 1 summary block, found {html.count(old)}"
    html=html.replace(old,new,1)
    s=s[:m.start(2)]+base64.b64encode(html.encode('utf-8')).decode('ascii')+s[m.end(2):]
    index.write_text(s,encoding='utf-8')
    print('PATCH_OK: final estimated payment now always included')
# Extract page scripts to check syntax
for i,match in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',html,re.I)):
    if 'src=' in match.group(1) or not match.group(2).strip():continue
    Path(f'/tmp/p06-script-{i}.js').write_text(match.group(2),'utf-8')
    print('JS_SCRIPT',f'/tmp/p06-script-{i}.js')
