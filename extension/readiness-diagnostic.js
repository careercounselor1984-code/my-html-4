// A read-only structural report. Never include participant fields, input values,
// selected answers, URLs, HTML, counseling notes, or dataset record contents.
async function inspectReadinessStructureMAIN(){
 const norm=v=>String(v??'').replace(/\s+/g,' ').trim(),compact=v=>norm(v).replace(/[\s.·ㆍ]/g,'');
 const known=['구직준비도 점검 설문지','취업을 희망하는 직종이 참여 초기와 같다','3개월 내 취업을 하고자 한다','희망 직종으로의 취업에 대한 계획이 있다','이력서나 자기소개서 작성 방법 등 구직기술을 배울 필요가 있다','구직 정보(취업처 등)가 필요하다','취업지원프로그램','참여 초반에 있던 취업을 어렵게 만드는 요인','현재 나의 건강 상태는 직장생활을 하기에 크게 무리가 없다','같다','같지는 않지만 유사한 직종이다','다르다','매우 그렇다','다소 그렇다','전혀 없다','필요 없다','다소 필요하다','매우 필요하다','많이 향상했다','다소 향상했다','거의 변화 없다','없다','다소 해소되었다','여전하다','무리없다','다소 어렵다','매우 어렵다','취업을 어렵게 만드는 요인은?'];
 const isKnown=s=>known.some(k=>compact(s).includes(compact(k)));
 const safeId=s=>norm(s).replace(/A\d{10,}/ig,'[id]').replace(/\d{6}[- ]?[1-4]\d{6}/g,'[id]').slice(0,200);
 const safeText=s=>{s=norm(s);if(/^bind:[A-Za-z_]\w*$/i.test(s))return s;return known.filter(k=>compact(s).includes(compact(k))).map(k=>known.indexOf(k));};
 const rect=el=>{const r=el.getBoundingClientRect();return [r.x??r.left,r.y??r.top,r.width,r.height].map(n=>Math.round(n));};
 const visible=el=>{try{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';}catch{return false;}};
 const node=el=>({tag:el.tagName,id:safeId(el.id),class:safeId(el.className),role:el.getAttribute('role')||'',rect:rect(el)});
 const out={schema:1,found:false,legend:known,dom:{tableCount:document.querySelectorAll('table').length,radioInputs:document.querySelectorAll('input[type="radio"]').length,ariaRadios:document.querySelectorAll('[role="radio"]').length,questions:[],radioShapes:[]},applicationSources:[],visited:0,grids:[],controls:[]};
 const elements=[...document.querySelectorAll('h1,h2,h3,div,span,td,th,label,p,strong')];
 out.found=elements.some(el=>visible(el)&&norm(el.textContent).length<80&&compact(el.textContent).includes(compact(known[0])));
 if(!out.found)return {schema:1,found:false};
 for(let i=1;i<=8;i++){
  const matches=elements.filter(el=>visible(el)&&norm(el.textContent).length<400&&compact(el.textContent).includes(compact(known[i]))).sort((a,b)=>a.textContent.length-b.textContent.length);
  const el=matches[0];if(!el){out.dom.questions.push({question:i,found:false});continue;}
  const parents=[];for(let p=el.parentElement,n=0;p&&n<4;p=p.parentElement,n++)parents.push(node(p));
  out.dom.questions.push({question:i,found:true,node:node(el),parents});
 }
 for(const el of document.querySelectorAll('input[type="radio"],[role="radio"],[class*="radioitem"],[class*="Radio"]')){
  if(out.dom.radioShapes.length>=40)break;if(visible(el))out.dom.radioShapes.push(node(el));
 }
 const roots=[];const add=(o,source)=>{if(o&&(typeof o==='object'||typeof o==='function')&&!roots.some(x=>x.o===o)){roots.push({o,source});out.applicationSources.push(source);}};
 for(const [w,label] of [[window,'window'],[window.parent,'parent'],[window.top,'top']]){
  try{add(w.nexacro?.getApplication?.(),label+'.nexacro.getApplication');}catch{}
  try{add(w.nexacro?._getApplication?.(),label+'.nexacro._getApplication');}catch{}
  for(const k of ['application','_application','__application','app'])try{add(w[k],label+'.'+k);}catch{}
  for(const k of ['application','_application','__application','_app','app'])try{add(w.nexacro?.[k],label+'.nexacro.'+k);}catch{}
 }
 const items=c=>{const a=[];if(!c)return a;let n;try{n=Math.min(Number(c.length)||0,500);}catch{return a;}
  if(n){for(let i=0;i<n;i++)try{const v=c[i]||c.get_item?.(i);if(v)a.push(v);}catch{}}
  else if(typeof c==='object'){for(const k of Object.keys(c).slice(0,200)){if(/^(?:_|length)/.test(k))continue;try{const v=c[k];if(v&&typeof v==='object')a.push(v);}catch{}}}return a;};
 const queue=roots.map(x=>({...x,depth:0})),seen=new Set();
 while(queue.length&&seen.size<6000){
  const {o,source,depth}=queue.shift();if(!o||(typeof o!=='object'&&typeof o!=='function')||seen.has(o))continue;seen.add(o);out.visited++;
  if(typeof o.getCellCount==='function'&&typeof o.getCellProperty==='function'){
   try{
    const prop=(c,k)=>o.getCellProperty('body',c,k),n=Math.min(Number(o.getCellCount('body'))||0,300),ds=o.getBindDataset?.(),rows=Number(ds?.getRowCount?.()||0);
    const format=[];let survey=false;
    for(let c=0;c<n;c++){
     const raw=prop(c,'text'),display=norm(prop(c,'displaytype')),edit=norm(prop(c,'edittype'));
     let t=raw;try{if(rows)t=o.getCellText?.(0,c)??raw;}catch{}
     if(isKnown(t))survey=true;
     const code=String(prop(c,'radioitemcodevalue')??'');
     format.push({cell:c,row:prop(c,'row'),col:prop(c,'col'),rowspan:prop(c,'rowspan'),text:safeText(raw),visibleLabel:safeText(t),display:/^[a-z0-9_]*$/i.test(display)?display:'[expr]',edit:/^[a-z0-9_]*$/i.test(edit)?edit:'[expr]',radioCode:/^[a-z0-9_-]{1,20}$/i.test(code)&&!/^A\d{10,}$/i.test(code)?code:code?'[expr]':''});
    }
    const entry={id:safeId(o.name||o.id),path:safeId(source),cells:n,rows,survey};
    if(survey){entry.format=format;entry.labels=[];
     for(let r=0;r<Math.min(rows,35);r++)for(let c=0;c<n;c++)try{const t=o.getCellText?.(r,c);if(t&&isKnown(t))entry.labels.push({row:r,cell:c,known:safeText(t)});}catch{}
    }
    if(out.grids.length<30)out.grids.push(entry);
   }catch{out.grids.push({error:'format-read-failed'});}
   continue;
  }
  try{if(typeof o.getInnerDataset==='function'&&typeof o.set_index==='function'&&out.controls.length<25)out.controls.push({id:safeId(o.name||o.id),type:safeId(o._type_name||o.constructor?.name),path:safeId(source)});}catch{}
  if(depth>=16)continue;
  const kids=[];for(const k of ['components','objects','all','forms','frames','childframes','popupframes','_frames','_child_list'])try{kids.push(...items(o[k]));}catch{}
  for(const k of ['form','mainframe','_mainframe','frame','childframe','activeFrame','workFrame','_active_frame'])try{if(o[k]&&o[k]!==o)kids.push(o[k]);}catch{}
  if(depth<4)for(const k of Object.getOwnPropertyNames(o).slice(0,800)){if(!/frame|form|component|child|popup/i.test(k))continue;try{const v=o[k];if(v&&typeof v==='object'&&v!==o)kids.push(v);}catch{}}
  for(const child of new Set(kids))queue.push({o:child,source:source+'/'+safeId(child.name||child.id||child._type_name||'node'),depth:depth+1});
 }
 return out;
}
const readinessDiagnoseBtn=document.getElementById('diagnoseBtn');
readinessDiagnoseBtn?.addEventListener('click',async()=>{
 readinessDiagnoseBtn.disabled=true;const status=document.getElementById('status'),field=document.getElementById('readinessDiag');
 try{
  status.textContent='구직준비도 화면 구조를 읽고 있습니다. 입력값을 변경하지 않습니다.';
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const u=new URL(tab?.url||'');if(u.protocol!=='https:'||!(u.hostname==='work24.go.kr'||u.hostname.endsWith('.work24.go.kr')))throw Error('Work24 구직준비도 팝업을 열고 실행하세요.');
  const results=await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},world:'MAIN',func:inspectReadinessStructureMAIN});
  const reports=results.filter(r=>r.result?.found).map(r=>({frame:r.frameId,...r.result}));
  if(!reports.length)throw Error('구직준비도 팝업을 찾지 못했습니다. 팝업을 열고 다시 눌러주세요.');
  field.hidden=false;field.value=JSON.stringify({extension:chrome.runtime.getManifest().version,reports},null,2);
  try{await navigator.clipboard.writeText(field.value);status.textContent='화면 구조 진단을 복사했습니다. 이 대화에 붙여넣어 주세요. 개인정보·답변 선택값·상담일지 본문은 포함하지 않습니다.';}catch{field.focus();field.select();status.textContent='진단 결과를 선택했습니다. Ctrl+C로 복사한 뒤 이 대화에 붙여넣어 주세요.';}
 }catch(e){status.textContent=e.message||String(e);}finally{readinessDiagnoseBtn.disabled=false;}
});
