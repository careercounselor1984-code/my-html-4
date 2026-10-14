'use strict';
const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
(async()=>{for(const id of ['p01','p02']){
 const m=html.match(new RegExp('"id":"'+id+'","title":"[^"]+","b64":"([^"]+)"'));
 const dom=new JSDOM(Buffer.from(m[1],'base64').toString('utf8'),{runScripts:'outside-only',url:'https://example.test/',pretendToBeVisual:true}),w=dom.window,d=w.document;
 w.TextEncoder=TextEncoder;w.confirm=()=>true;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};let copied='';Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async t=>{copied=t}}});
 for(const s of d.querySelectorAll('script:not([src])'))w.eval(s.textContent);
 for(const asset of ['initial-easy-mode.js','initial-work24-assist.js'])w.eval(fs.readFileSync(path.join(root,asset),'utf8'));
 w.eval(html.match(/<script id="clg-initial-compact-ui-v1">([\s\S]*?)<\/script>/)[1]);d.dispatchEvent(new w.Event('DOMContentLoaded'));
 const by=id=>d.getElementById(id),set=(id,v)=>{by(id).value=v;by(id).dispatchEvent(new w.Event('input',{bubbles:true}));by(id).dispatchEvent(new w.Event('change',{bubbles:true}));};
 const choose=(id,label)=>{const opt=[...by(id).options].find(o=>o.textContent===label);assert.ok(opt,id+': missing '+label);set(id,opt.value);return opt.value;};
 for(const control of ['motivationReasonPreset','motivationEffortPreset','work24SupportPreset','typeReasonPreset']){assert.ok(by(control).closest('#work24SourceFields'));assert.equal(d.querySelectorAll('#'+control).length,1);}
 assert.equal(by('motivationReason').closest('details').open,false);assert.equal(by('motivationEffort').closest('details').open,false);
 const purpose=choose('motivationReasonPreset','혼자 준비 어려움·단계 지원');const effort=choose('motivationEffortPreset','고용24·민간 채용공고 확인');choose('work24SupportPreset','채용정보·취업알선');
 assert.equal(by('motivationReason').value,purpose);assert.equal(by('motivationEffort').value,effort);
 // Compact labels must describe the actual stored full sentence, including the last three effort choices.
 choose('motivationEffortPreset','경력·보유기술 정리');assert.ok(by('motivationEffort').value.includes('기존 경력'));
 choose('motivationEffortPreset','근무지역·시간·임금 정리');assert.ok(by('motivationEffort').value.includes('희망 근무지역'));
 choose('motivationEffortPreset','구체적인 취업준비 전');assert.ok(by('motivationEffort').value.includes('활동은 하지 못한'));
 choose('motivationEffortPreset','고용24·민간 채용공고 확인');
 set('strategyTargetJob','치과위생사');set('strategyTiming','6개월 이내');set('totalScore','60');assert.equal(by('grade').value,'낮음');assert.equal(by('resultType').value,'');assert.ok(by('scoreValidationHint').textContent.includes('재량구간'));
 set('resultType','빠른취업지원형');await Promise.resolve();assert.equal(by('typeReasonPreset').disabled,false);
 choose('typeReasonPreset','직무·조건·경력 명확');assert.ok(by('typeReasonText').value.includes('즉시'));by('work24Build').click();
 assert.ok(by('work24_motivation').value.includes(purpose));assert.ok(by('work24_motivation').value.includes(effort));by('work24_motivation_copy').click();await Promise.resolve();assert.equal(copied,by('work24_motivation').value);
 for(const type of ['의욕향상지원형','능력향상지원형','종합지원형']){
  set('resultType',type);await Promise.resolve();assert.ok(by('typeReasonPreset').options[1].textContent.length<30);set('typeReasonPreset',by('typeReasonPreset').options[1].value);
  const ground=by('typeReasonText').value;assert.ok(ground.includes(type==='의욕향상지원형'?'구직의지':type==='능력향상지원형'?'취업의지':'구직의지와 구직역량'));
 }
 set('resultType','빠른취업지원형');await Promise.resolve();
 choose('clientStatusPreset','퇴사 후 재취업 · 경력 활용 가능');choose('opinionNeedPreset','구직활동 관련 특이 애로 없음');choose('opinionDirectionPreset','채용정보 제공·취업알선');
 set('counselorOpinion','기존 직접 작성한 의견');by('opinionPresetBuild').click();assert.equal(by('counselorOpinion').value,'기존 직접 작성한 의견');
 const draft=by('opinionAssistDraft').value;assert.ok(draft.includes('치과위생사'));assert.ok(draft.includes(purpose));assert.ok(draft.includes('퇴사 후 재취업'));assert.ok(draft.includes('애로요인은 확인되지'));assert.ok(draft.includes('취업알선'));
 by('opinionAssistApply').click();assert.ok(by('counselorOpinion').value.startsWith('기존 직접 작성한 의견'));assert.ok(by('counselorOpinion').value.includes(draft));
 if(id==='p01'){assert.ok(by('stipendGuide').value.includes('취업·창업·소득 신고'));assert.ok(by('recordOutput').textContent.includes('- 구직촉진수당 유의사항: 지정일 신청'));set('stipendGuide','직접 안내한 내용');assert.ok(by('recordOutput').textContent.includes('직접 안내한 내용'));}
 by('resetBtn').click();await Promise.resolve();assert.equal(by('typeReasonPreset').disabled,true);assert.equal(by('typeReasonText').value,'');
 if(id==='p01'){assert.ok(by('stipendGuide').value.includes('지정일 신청'));assert.ok(by('recordOutput').textContent.includes('부정수급 관련 주요 유의사항 안내'));}
 dom.window.close();console.log(id+': dropdown-only templates, all type grounds, no auto type, manual-opinion preservation and stipend restoration passed');
}})().catch(e=>{console.error(e);process.exit(1)});
