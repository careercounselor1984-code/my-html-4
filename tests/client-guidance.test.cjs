const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'..','client-guidance.js'),'utf8');

function setup(html,withPlan=true){
  const dom=new JSDOM('<!doctype html><html><head></head><body>'+html+'</body></html>',{
    url:'https://careercounselor1984-code.github.io/my-html-4/',
    runScripts:'outside-only'
  });
  dom.window.scrollTo=()=>{};
  dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
  dom.window.console.warn=()=>{};
  if(withPlan){
    dom.window.localStorage.setItem('clg_iap_common_profiles_v1',JSON.stringify({
      TEST123:{
        iapDate:'2026-10-05',
        recognitionDate:'2026-09-28',
        iapSavedAt:'2026-10-05T09:00:00.000Z',
        iapActRows:[{
          kind:'입사지원서(취업알선상담 포함)제출',
          detail:'희망직종에 입사지원',
          start:'2026-10-06',end:'2026-11-05',cnt:'2'
        }]
      }
    }));
  }
  dom.window.eval(source);
  return dom;
}

const markup='<div id="clgSudangIapBox"></div>'
+'<input id="clgSudangIapRegNo" value="TEST123"/>'
+'<button id="clgSudangIapLoad"></button>'
+'<select id="round"><option value="1">1</option><option value="2" selected>2</option><option value="3">3</option></select>'
+'<input id="startDate" value="2026-10-06"/>'
+'<input id="endDate" value="2026-11-05"/>'
+'<input id="designationDate" value="2026-11-05"/>';

{
  const dom=setup(markup);
  const d=dom.window.document;
  const panel=d.getElementById('clgClientGuidance');
  assert(panel,'구촉수당 화면에 접이식 안내 영역이 있어야 함');
  panel.open=true;
  panel.dispatchEvent(new dom.window.Event('toggle'));
  const text=d.getElementById('clgGuidePreview').value;
  assert.match(text,/2회차 안내/);
  assert.match(text,/2026\.10\.06/);
  assert.match(text,/입사지원/);
  assert.doesNotMatch(text,/TEST123/,'등록번호는 내담자 안내문에 노출하지 않음');
  const copy=d.getElementById('clgGuideCopy');
  assert.equal(copy.disabled,true,'확인 전 복사 제한');
  const confirmed=d.getElementById('clgGuideVerify');
  confirmed.checked=true;
  confirmed.dispatchEvent(new dom.window.Event('change'));
  assert.equal(copy.disabled,false,'확인 후 복사 가능');
  d.getElementById('round').value='3';
  d.getElementById('round').dispatchEvent(new dom.window.Event('change'));
  assert.equal(copy.disabled,true,'회차 변경 시 확인 초기화');
  dom.window.close();
}
{
  const dom=setup(markup,false);
  const d=dom.window.document;
  const panel=d.getElementById('clgClientGuidance');
  panel.open=true;
  panel.dispatchEvent(new dom.window.Event('toggle'));
  assert.match(d.getElementById('clgGuideStatus').textContent,/저장된 IAP가 없습니다/);
  assert.equal(d.getElementById('clgGuideCopy').disabled,true);
  dom.window.close();
}
{
  const dom=setup(
    '<div id="iapSendWork24Btn"></div>'
    +'<input id="iapRegNo" value="TEST123"/>'
    +'<label><input name="userType" type="radio" value="1" checked></label>'
    +'<label><input name="userType" type="radio" value="2"></label>');
  let target='';
  dom.window.loadPage=(id)=>{target=id};
  dom.window.document.getElementById('clgIapClientGuidanceJump').click();
  assert.equal(target,'p06','IAP 화면에서 구촉수당 화면으로 이동해야 함');
  const pending=JSON.parse(dom.window.sessionStorage.getItem('clg_client_guidance_pending_v1'));
  assert.equal(pending.regNo,'TEST123');
  dom.window.close();
}
console.log('client-guidance smoke: passed');