const KEY='clgReadinessPendingV150';
const isWork24Tab=url=>{try{const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='work24.go.kr'||u.hostname.endsWith('.work24.go.kr'));}catch{return false;}};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let pending=null;

const LABELS={
  q1_1:'같다',q1_2:'같지는 않지만 유사한 직종이다',q1_3:'다르다',
  q2_1:'매우 그렇다',q2_2:'다소 그렇다',q2_3:'전혀 없다',
  q3_1:'매우 그렇다',q3_2:'다소 그렇다',q3_3:'전혀 없다',
  q4_1:'필요 없다',q4_2:'다소 필요하다',q4_3:'매우 필요하다',
  q5_1:'필요없다',q5_2:'다소 필요하다',q5_3:'매우 필요하다',
  q6_1:'많이 향상했다',q6_2:'다소 향상했다',q6_3:'거의 변화 없다',
  q7_1:'없다',q7_2:'다소 해소되었다',q7_3:'여전하다(혹은 새로 생겼다)',
  health1:'무리없다',health2:'다소 어렵다',health3:'매우 어렵다'
};
function setStatus(msg,kind=''){const e=$('status');e.textContent=msg;e.className='status'+(kind?' '+kind:'');}
function render(p){
  pending=p||null;const c=$('content'),btn=$('applyBtn');
  if(!p){setStatus('대기 중인 구직준비도 자료가 없습니다. 통합본 「필수상담(구직재점검)」에서 “구직준비도 전산으로 보내기”를 눌러주세요.');c.innerHTML='';btn.disabled=true;return;}
  const ids=['q1','q2','q3','q4','q5','q6','q7','q8'];
  const answers=[p.q1,p.q2,p.q3,p.q4,p.q5,p.q6,p.q7,p.q8];
  const missing=answers.filter(x=>!x).length;
  setStatus(missing?`응답 ${8-missing}/8개 수신 · 누락 ${missing}개가 있어 자동입력을 중단합니다.`:`✓ 구직준비도 8개 문항 수신 완료${p.q7Detail?' · 장애요인 상세 포함':''}`,missing?'warn':'ok');
  c.innerHTML=`<div class="card"><div class="ct">전송된 구직준비도 응답</div><div class="grid">${ids.map((q,i)=>`<div class="q">${i+1}</div><div class="v">${esc(LABELS[answers[i]]||answers[i]||'미선택')}</div>`).join('')}${p.q7Detail?`<div class="q">7-1</div><div class="v">${esc(p.q7Detail)}</div>`:''}</div>${p.healthDetail?`<div class="muted" style="margin-top:8px">건강 세부내용: ${esc(p.healthDetail)}</div>`:''}</div>`;
  btn.disabled=missing>0;
}
function load(){chrome.storage.local.get(KEY,r=>render(r?.[KEY]||null));}
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[KEY])render(changes[KEY].newValue||null);});
$('refreshBtn').addEventListener('click',load);
$('clearBtn').addEventListener('click',()=>chrome.storage.local.remove(KEY,load));

async function applyReadinessMAIN(payload){
  function scanWork24Detail(){
 const clean=v=>String(v||'').replace(/\s+/g,'').replace(/[:：*]/g,'');
 const styles=new WeakMap();const visible=el=>{const r=el.getBoundingClientRect();if(r.width<1||r.height<1)return false;for(let p=el;p;p=p.parentElement){let s=styles.get(p);if(!s){s=p.ownerDocument.defaultView.getComputedStyle(p);styles.set(p,s)}if(p.hidden||p.getAttribute('aria-hidden')==='true'||s.display==='none'||s.visibility==='hidden'||Number(s.opacity||1)===0)return false}return true};
 try{let view=window;for(let depth=0;view!==view.parent&&depth<16;depth++){if(!view.frameElement||!visible(view.frameElement))return {status:'none',values:{}};view=view.parent}}catch{return {status:'unavailable',values:{}}}
 const values={},ids=new Set(),ambiguous=new Set();
 const labels={IAP등록번호:'regNo',취업활동계획등록번호:'regNo',IAP번호:'regNo',성명:'name',참여자명:'name',구직인증번호:'jobCertNo',구직인증만료일:'jobCertExpire',구직인증기간만료일:'jobCertExpire',IAP수립일:'iapDate',취업지원서비스만료일:'serviceEnd',취업지원기간만료일:'serviceEnd',지정일:'dueDate'};
 function add(key,value){value=String(value||'').trim();if(!value)return;if(key==='regNo'){const no=value.toUpperCase();if(/^A\d{10,30}$/.test(no))ids.add(no);return}if(key!=='name'&&key!=='jobCertNo'){const m=value.match(/^(\d{4})[-./](\d{2})[-./](\d{2})$/);if(!m)return;value=m.slice(1).join('-')}if(value.length>100)return;if(values[key]&&values[key]!==value)ambiguous.add(key);else values[key]=value;}
 for(const el of document.querySelectorAll('input,select,textarea')){
  if(!visible(el)||el.closest('[role=grid],.jqgrid,.grid-body,.w2grid'))continue;
  const tokens=[el.name,el.id].filter(Boolean).map(clean);
  if(tokens.some(token=>/^(?:iapRegNo|iapNo|iapSn|iapMngNo)$/i.test(token)))add('regNo',el.value);
  const label=el.labels?.length===1?clean(el.labels[0].textContent):'';if(labels[label])add(labels[label],el.value);
 }
 const labelled=[...document.querySelectorAll('label,th,dt,span,div')].filter(el=>(el.tagName!=='DIV'||!el.children.length)&&labels[clean(el.textContent)]);
 for(const label of labelled){
  if(labelled.some(child=>child!==label&&label.contains(child))||!visible(label))continue;
  const key=labels[clean(label.textContent)];let next=null;
  if(label.htmlFor)next=document.getElementById(label.htmlFor);
  const table=label.closest('table');if(table?.querySelector('thead')||label.closest('[role=grid],.jqgrid,.w2grid'))continue;
  if(!next){const cell=label.closest('th,td,dt');if(cell)next=cell.nextElementSibling;else{let node=label;for(let depth=0;node&&depth<3;depth++,node=node.parentElement){if(node.nextElementSibling){next=node.nextElementSibling;break}if(!node.parentElement||clean(node.parentElement.textContent)!==clean(label.textContent))break}}}
  if(!next||!visible(next))continue;const input=next.matches('input,select,textarea')?next:next.querySelector('input,select,textarea');add(key,input?input.value:next.textContent);
 }
 for(const key of ambiguous)delete values[key];
 return {status:ids.size>1||ambiguous.has('identity')?'conflict':ids.size===1?'single':'none',regNo:ids.size===1?[...ids][0]:'',values};
}
  const assertIdentity=()=>{const x=scanWork24Detail();if(x.status!=='single'||x.regNo!==payload.iapNo)throw Error('등록번호 검증 실패');};
  assertIdentity();
  const norm=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const compact=s=>norm(s).replace(/\s/g,'').replace(/[.·ㆍ]/g,'');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const out={ok:false,found:false,opened:false,filled:0,failed:[],notes:[],href:location.href};
  const vis=el=>{try{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>1&&r.height>1&&cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)>0}catch{return false}};
  const text=el=>norm(el?.innerText||el?.textContent||el?.value||'');
  const nodes=()=>Array.from(document.querySelectorAll('div,span,td,th,label,p,strong,button,a,input,textarea')).filter(vis);
  const findText=(needle, exact=false, root=document)=>{
    const n=compact(needle);let els=[];try{els=Array.from(root.querySelectorAll('div,span,td,th,label,p,strong,button,a'))}catch{}
    return els.filter(vis).filter(el=>{const t=compact(text(el));return t&&(exact?t===n:t.includes(n));}).sort((a,b)=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return (ar.width*ar.height)-(br.width*br.height)})[0]||null;
  };
  const fireClick=el=>{
    assertIdentity();if(!el)return false;try{el.scrollIntoView({block:'center',inline:'nearest'});}catch{}
    try{const r=el.getBoundingClientRect(),coords={bubbles:true,cancelable:true,view:window,clientX:(r.left+r.right)/2,clientY:(r.top+r.bottom)/2,button:0};
      for(const type of ['mousedown','mouseup'])el.dispatchEvent(new MouseEvent(type,coords));
      el.click?.();
    }catch{return false;}
    return true;
  };
  const findPopup=()=>findText('구직준비도 점검 설문지');
  let heading=findPopup();
  if(!heading){
    const open=findText('구직준비도등록',true)||findText('구직준비도 등록',true)||findText('구직준비도등록');
    if(open){fireClick(open);out.opened=true;await sleep(650);heading=findPopup();}
  }
  if(!heading){out.notes.push('「구직준비도 등록」 팝업을 찾지 못했습니다. IAP등록/관리 화면인지 확인해 주세요.');return out;}
  out.found=true;
  let root=heading;
  for(let i=0;i<12 && root?.parentElement;i++){
    const t=compact(text(root));
    if(t.includes(compact('구직준비도 점검 설문지'))&&t.includes(compact('응답 항목'))&&t.includes(compact('취업을 희망하는 직종')))break;
    root=root.parentElement;
  }
  if(!root)root=document.body;

  const qDefs=[
    {key:'q1',needle:'취업을 희망하는 직종이 참여 초기와 같다'},
    {key:'q2',needle:'3개월 내 취업을 하고자 한다'},
    {key:'q3',needle:'희망 직종으로의 취업에 대한 계획이 있다'},
    {key:'q4',needle:'이력서나 자기소개서 작성 방법 등 구직기술을 배울 필요가 있다'},
    {key:'q5',needle:'구직 정보(취업처 등)가 필요하다'},
    {key:'q6',needle:'취업지원프로그램',needle2:'취업 역량이 상승'},
    {key:'q7',needle:'참여 초반에 있던 취업을 어렵게 만드는 요인'},
    {key:'q8',needle:'현재 나의 건강 상태는 직장생활을 하기에 크게 무리가 없다'}
  ];
  const ansText={
    q1:{q1_1:'같다',q1_2:'같지는 않지만 유사한 직종이다',q1_3:'다르다'},
    q2:{q2_1:'매우 그렇다',q2_2:'다소 그렇다',q2_3:'전혀 없다'},
    q3:{q3_1:'매우 그렇다',q3_2:'다소 그렇다',q3_3:'전혀 없다'},
    q4:{q4_1:'필요 없다',q4_2:'다소 필요하다',q4_3:'매우 필요하다'},
    q5:{q5_1:'필요없다',q5_2:'다소 필요하다',q5_3:'매우 필요하다'},
    q6:{q6_1:'많이 향상했다',q6_2:'다소 향상했다',q6_3:'거의 변화 없다'},
    q7:{q7_1:'없다',q7_2:'다소 해소되었다',q7_3:'여전하다'},
    q8:{health1:'무리없다',health2:'다소 어렵다',health3:'매우 어렵다'}
  };
  const invalid=qDefs.filter(d=>!ansText[d.key]?.[payload?.[d.key]]);
  if(invalid.length){out.failed=invalid.map(d=>d.key+': 전달값 없음 또는 잘못된 응답');return out;}
  // Read the survey's native Grid format, not rendered text bounds. A merged
  // question spans three format rows and lower questions can be virtualized.
  const isGrid=o=>o&&typeof o.getCellCount==='function'&&typeof o.getCellProperty==='function'&&typeof o.getBindDataset==='function';
  const apps=[];for(const w of [window,window.parent,window.top])for(const get of [()=>w.nexacro?.getApplication?.(),()=>w.nexacro?._getApplication?.(),()=>w.nexacro?._application,()=>w._application,()=>w.application])try{const a=get();if(a&&!apps.includes(a))apps.push(a);}catch{}
  const item=(o,k)=>{if(!o)return null;for(const get of [()=>o[k],()=>o.components?.get_item?.(k),()=>o.objects?.get_item?.(k),()=>o.frames?.get_item?.(k),()=>o.childframes?.get_item?.(k),()=>o.lookup?.(k),()=>o.form?.[k]])try{const v=get();if(v)return v;}catch{}return null;};
  const grids=new Set();
  const resolve=id=>{
    const parts=id.split('.').filter(Boolean),mi=parts.indexOf('mainframe');
    for(const a of apps)for(const start of new Set([0,Math.max(0,mi),Math.max(0,mi+1)])){
      let o=start===mi+1&&mi>=0?(item(a,'mainframe')||a._mainframe):a;
      for(let i=start;o&&i<parts.length;i++){o=item(o,parts[i]);if(isGrid(o)){grids.add(o);break;}}
    }
  };
  const paths=new Set();for(const el of document.querySelectorAll('[id]')){
    if(!vis(el)||!/(?:grd|grid)/i.test(el.id))continue;
    const id=el.id.split(/\.(?:body|head|summary|vscrollbar|hscrollbar)(?:\.|$)/i)[0];if(paths.has(id))continue;paths.add(id);resolve(id);
  }
  // Some popup frames expose short DOM ids. Traverse only component collections,
  // never arbitrary application records or participant dataset contents.
  {
    const seen=new Set(),queue=apps.slice();
    while(queue.length&&seen.size<6000){const o=queue.shift();if(!o||typeof o!=='object'||seen.has(o))continue;seen.add(o);if(isGrid(o)){grids.add(o);continue;}
      for(const k of ['form','mainframe','_mainframe','frame','childframe','activeFrame','workFrame','_active_frame'])if(o[k]&&o[k]!==o)queue.push(o[k]);
      for(const k of ['components','objects','all','forms','frames','childframes','popupframes','_frames','_child_list'])try{
        const c=o[k],n=Math.min(Number(c?.length||0),500);
        if(n){for(let i=0;i<n;i++)queue.push(c[i]||c.get_item?.(i));}
        else if(c&&typeof c==='object'){for(const key of Object.keys(c).slice(0,200))if(!key.startsWith('_')&&typeof c[key]==='object')queue.push(c[key]);}
      }catch{}
    }
  }
  const labelMatches=(actual,expected,key)=>{const a=compact(actual),b=compact(expected);return a===b||(key==='q7'&&b==='여전하다'&&/^여전하다[（(]혹은새로생겼다[）)]$/.test(a));};
  // Field evidence (Work24 1.4.20 report): grd_list has 25 dataset rows,
  // four body cells; question=QSTN_CN, selector=EX_SN, label/detail=ANSW_CN.
  // EX_SN is not assumed to be a checkbox value. Click the original native
  // control so Work24's own grouping/result handlers run.
  const rowSurveys=[];
  for(const grid of grids)try{
    const ds=grid.getBindDataset();if(Number(ds?.getRowCount?.())!==25||Number(grid.getCellCount('body'))!==4)continue;
    const binding=c=>String(grid.getCellProperty('body',c,'text')||'');
    if(binding(1)!=='bind:QSTN_CN'||binding(2)!=='bind:EX_SN'||binding(3)!=='bind:ANSW_CN')continue;
    const groups=qDefs.map(def=>Array.from({length:25},(_,r)=>r).filter(r=>{const t=compact(grid.getCellText(r,1));return t.includes(compact(def.needle))&&(!def.needle2||t.includes(compact(def.needle2)));}));
    if(groups.some(g=>g.length!==3)||new Set(groups.flat()).size!==24)continue;
    const chosen=groups.map((group,i)=>group.filter(r=>labelMatches(grid.getCellText(r,3),ansText[qDefs[i].key][payload[qDefs[i].key]],qDefs[i].key)));
    if(chosen.some(r=>r.length!==1))continue;
    const details=Array.from({length:25},(_,r)=>r).filter(r=>compact(grid.getCellText(r,1)).includes(compact('취업을 어렵게 만드는 요인은?')));
    if(details.length!==1||groups.flat().includes(details[0]))continue;
    rowSurveys.push({grid,ds,groups,chosen:chosen.map(r=>r[0]),detailRow:details[0]});
  }catch{}
  if(rowSurveys.length>1){out.failed.push('구직준비도 표가 여러 개여서 대상 팝업을 확정하지 못했습니다.');return out;}
  if(rowSurveys.length===1){
    const {grid,ds,groups,chosen,detailRow}=rowSurveys[0];
    let gridEl;try{const handle=grid.getElement?.()?.handle;if(handle?.nodeType===1&&vis(handle))gridEl=handle;}catch{}
    if(!gridEl){
      const first=findText(qDefs[0].needle,false,document),match=first?.id?.match(/^(.*)\.body\.gridrow_\d+\./);
      if(match)gridEl=document.getElementById(match[1]);
    }
    if(!gridEl){out.failed.push('25행 설문 표는 확인했지만 원본 선택칸의 화면 연결을 찾지 못했습니다.');return out;}
    const cellAt=(r,c)=>document.getElementById(`${gridEl.id}.body.gridrow_${r}.cell_${r}_${c}`);
    const isRadio=el=>/radioitem|cellradio|checkbox/i.test(String(el?.className||'')+' '+String(el?.id||''));
    const selected=r=>{
      const cell=cellAt(r,2);if(!cell)return null;
      const controls=[cell,...cell.querySelectorAll('*')].filter(isRadio);if(!controls.length)return null;
      if(controls.some(el=>el.getAttribute('aria-checked')==='true'||/(?:^|\s)(?:checked|selected)(?:\s|$)/.test((el.getAttribute('userstatus')||'')+' '+String(el.className||''))))return true;
      return false;
    };
    const verifyGroup=(i)=>selected(chosen[i])===true&&groups[i].filter(r=>r!==chosen[i]).every(r=>selected(r)===false);
    const statuses=[];
    for(let i=0;i<8;i++){
      const r=chosen[i];
      try{grid.set_toprow?.(groups[i][0]);}catch{}await sleep(70);
      let cell=cellAt(r,2);if(!cell){statuses.push({question:i+1,row:r,result:'not-rendered'});out.failed.push(`${qDefs[i].key}: 원본 선택칸을 찾지 못함`);continue;}
      if(selected(r)!==true){
        try{cell.scrollIntoView({block:'nearest',inline:'nearest'});}catch{}
        cell=cellAt(r,2)||cell;
        const radio=[...cell.querySelectorAll('*')].filter(isRadio).filter(vis).sort((a,b)=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return ar.width*ar.height-br.width*br.height;})[0];
        const target=radio||cell,rect=target.getBoundingClientRect(),x=(rect.left+rect.right)/2,y=(rect.top+rect.bottom)/2;
        let hit;try{hit=document.elementFromPoint(x,y);}catch{}
        if(!hit||!(cell===hit||cell.contains(hit))){statuses.push({question:i+1,row:r,result:'obscured'});out.failed.push(`${qDefs[i].key}: 선택칸이 다른 화면에 가려져 있음`);continue;}
        assertIdentity();try{const args={bubbles:true,cancelable:true,view:window,clientX:x,clientY:y,button:0};for(const type of ['mousedown','mouseup','click'])hit.dispatchEvent(new MouseEvent(type,args));}catch{}
        await sleep(70);
      }
      if(verifyGroup(i)){out.filled++;statuses.push({question:i+1,row:r,result:'confirmed'});}
      else{statuses.push({question:i+1,row:r,result:'selection-not-verified',controlTypes:[cell,...cell.querySelectorAll('*')].slice(0,12).map(el=>({tag:el.tagName,class:String(el.className||'').slice(0,160),attributes:[...el.attributes].map(a=>a.name).filter(k=>/status|check|select|role|class/i.test(k))}))});out.failed.push(`${qDefs[i].key}: 원본 선택칸 입력 시도 후 선택 상태 확인 필요`);}
    }
    // Revisit each group, including rows virtualized after the later clicks.
    for(let i=0;i<8;i++)if(statuses[i]?.result==='confirmed'){
      try{grid.set_toprow?.(groups[i][0]);}catch{}await sleep(50);
      if(!verifyGroup(i)){out.filled--;out.failed.push(`${qDefs[i].key}: 후속 입력 후 선택 상태 재확인 실패`);}
    }
    if(payload?.q7Detail&&out.failed.length===0){
      const old=ds.getColumn(detailRow,'ANSW_CN');
      try{ds.setColumn(detailRow,'ANSW_CN',String(payload.q7Detail));if(String(ds.getColumn(detailRow,'ANSW_CN'))!==String(payload.q7Detail))throw Error();out.filled++;}
      catch{try{ds.setColumn(detailRow,'ANSW_CN',old);}catch{}out.failed.push('7-1 상세 내용 반영 실패');}
    }
    out.ok=out.failed.length===0&&out.filled>=8;
    out.notes.push('실제 25행 설문 표 연결 · 전산 원본 선택칸 사용 · 최종 저장은 수행하지 않았습니다.');
    if(!out.ok)out.notes.push('선택칸 진단: '+JSON.stringify(statuses));
    return out;
  }

  const plans=[];let surveyGrids=0;
  for(const grid of grids){
    try{
      const ds=grid.getBindDataset();if(!ds||ds.getRowCount?.()!==1)continue;
      const prop=(c,k)=>grid.getCellProperty('body',c,k);
      const count=Number(grid.getCellCount('body'));if(count<24||count>300)continue;
      const cells=Array.from({length:count},(_,c)=>({c,row:Number(prop(c,'row')),col:Number(prop(c,'col')),span:Math.max(1,Number(prop(c,'rowspan'))||1),text:norm(grid.getCellText?.(0,c)??prop(c,'text'))}));
      const qs=qDefs.map(def=>cells.filter(c=>compact(c.text).includes(compact(def.needle))&&(!def.needle2||compact(c.text).includes(compact(def.needle2)))));
      if(qs.some(q=>q.length!==1))continue;surveyGrids++;
      const plan=[];let valid=true;
      for(let i=0;i<8;i++){
        const def=qDefs[i],q=qs[i][0],answer=ansText[def.key]?.[payload?.[def.key]];
        const radios=cells.filter(c=>c.row>=q.row&&c.row<q.row+q.span&&/radioitem/i.test(String(prop(c.c,'displaytype'))+' '+String(prop(c.c,'edittype'))));
        const opts=radios.map(c=>{
          const binding=String(prop(c.c,'text')||'').match(/^bind:([A-Za-z_][\w]*)$/i);
          const code=prop(c.c,'radioitemcodevalue');
          const labels=cells.filter(x=>x.row===c.row&&x.col>c.col&&!/^bind:|^expr:/i.test(String(prop(x.c,'text')||'')));
          return {column:binding?.[1],code,match:labels.some(x=>labelMatches(x.text,answer,def.key))};
        });
        const hit=opts.filter(x=>x.match);
        if(!answer||opts.length!==3||opts.some(x=>!x.column||x.code===undefined||x.code===null||String(x.code)===''||/^expr:|^bind:/i.test(String(x.code)))||new Set(opts.map(x=>x.column)).size!==1||new Set(opts.map(x=>String(x.code))).size!==3||hit.length!==1){valid=false;break;}
        plan.push({key:def.key,column:hit[0].column,value:hit[0].code});
      }
      if(!valid||new Set(plan.map(x=>x.column)).size!==8)continue;
      if(payload?.q7Detail){
        const label=cells.filter(c=>compact(c.text).includes(compact('취업을 어렵게 만드는 요인은?')));
        if(label.length!==1)continue;
        const inputs=cells.filter(c=>c.row===label[0].row&&c.col>label[0].col&&/^bind:([A-Za-z_][\w]*)$/i.test(String(prop(c.c,'text')||''))&&!/radioitem/i.test(String(prop(c.c,'displaytype'))+' '+String(prop(c.c,'edittype'))));
        if(inputs.length!==1)continue;
        const column=String(prop(inputs[0].c,'text')).slice(5);
        if(plan.some(x=>x.column===column))continue;
        plan.push({key:'7-1',column,value:String(payload.q7Detail)});
      }
      if(plan.some(x=>ds.getColumnInfo&&!ds.getColumnInfo(x.column)))continue;
      plans.push({ds,plan});
    }catch{}
  }
  if(plans.length===1&&surveyGrids===1){
    const {ds,plan}=plans[0],before=plan.map(x=>ds.getColumn(0,x.column));
    let verified=false;
    try{
      for(const x of plan){assertIdentity();if(ds.setColumn(0,x.column,x.value)===false)throw Error('값 반영 거부');}
      verified=plan.every(x=>String(ds.getColumn(0,x.column))===String(x.value));
    }catch{}
    if(verified){out.filled=plan.length;out.ok=true;out.notes.push('원본 설문 Grid의 문항·응답 문구·연결 코드로 입력하고 8문항의 실제 선택값을 재확인했습니다. 최종 저장은 수행하지 않았습니다.');return out;}
    // A validation handler can reject a value. Restore only the fields touched.
    for(let i=plan.length-1;i>=0;i--)try{if(ds.getColumn(0,plan[i].column)!==before[i])ds.setColumn(0,plan[i].column,before[i]);}catch{}
    const restored=plan.every((x,i)=>String(ds.getColumn(0,x.column)??'')===String(before[i]??''));
    out.failed.push(restored?'원본 설문 값 검증 실패 · 기존 응답 복구 완료':'원본 설문 값 검증 실패 · 일부 기존 응답 복구 확인 필요');return out;
  }
  if(surveyGrids){out.failed.push('설문 Grid는 찾았지만 8문항의 응답 연결을 확정하지 못해 입력하지 않았습니다.');return out;}
  const rootEls=()=>Array.from(root.querySelectorAll('div,span,td,th,label,p,strong')).filter(vis);
  const findQ=def=>rootEls().filter(el=>{const t=compact(text(el));return t.includes(compact(def.needle))&&(!def.needle2||t.includes(compact(def.needle2)));}).sort((a,b)=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return (ar.width*ar.height)-(br.width*br.height)})[0]||null;
  const questionEls=qDefs.map(d=>({d,el:findQ(d)}));
  const clickAnswer=(idx,answer)=>{
    const q=questionEls[idx].el;if(!q)return false;
    const qr=q.getBoundingClientRect(),cy=(qr.top+qr.bottom)/2;
    const answers=rootEls().filter(el=>labelMatches(text(el),answer,qDefs[idx].key)).filter(el=>el.getBoundingClientRect().left>=qr.right-8);
    answers.sort((a,b)=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return Math.abs((ar.top+ar.bottom)/2-cy)-Math.abs((br.top+br.bottom)/2-cy)||(ar.width*ar.height-br.width*br.height);});
    const label=answers[0];if(!label)return false;
    const r=label.getBoundingClientRect();
    const prev=questionEls[idx-1]?.el?.getBoundingClientRect(),next=questionEls[idx+1]?.el?.getBoundingClientRect();
    if(prev&&(r.top+r.bottom)/2<((prev.top+prev.bottom)/2+cy)/2)return false;
    if(next&&(r.top+r.bottom)/2>((next.top+next.bottom)/2+cy)/2)return false;
    const inputs=Array.from(root.querySelectorAll('input[type="radio"],[role="radio"]')).filter(vis).filter(el=>{const er=el.getBoundingClientRect();return Math.abs((er.top+er.bottom)/2-(r.top+r.bottom)/2)<Math.min(18,r.height/2+6)&&er.right<=r.left+4&&r.left-er.right<70;});
    if(inputs.length!==1)return false;
    const input=inputs[0];if(input.disabled||input.getAttribute('aria-disabled')==='true')return false;
    assertIdentity();if(!(input.checked===true||input.getAttribute('aria-checked')==='true'))input.click();
    return input.checked===true||input.getAttribute('aria-checked')==='true';
  };
  for(let i=0;i<qDefs.length;i++){
    const k=qDefs[i].key,code=payload?.[k],answer=ansText[k]?.[code];
    if(!code||!answer){out.failed.push(`${k}: 전달값 없음`);continue;}
    if(clickAnswer(i,answer)){out.filled++;await sleep(80);}else out.failed.push(`${k}: ${answer} 선택 실패`);
  }
  if(payload?.q7Detail){
    const q71=findText('취업을 어렵게 만드는 요인은?',false,root)||findText('7-1. 취업을 어렵게 만드는 요인은?',false,root);
    if(q71){
      let box=q71;for(let i=0;i<4&&box.parentElement;i++){const r=box.getBoundingClientRect();if(r.width>300&&r.height>25)break;box=box.parentElement;}
      const qr=box.getBoundingClientRect();
      const controls=Array.from(root.querySelectorAll('input[type="text"],textarea,[contenteditable="true"]')).filter(vis).filter(el=>{const r=el.getBoundingClientRect();return r.top>=qr.top-8&&r.top<=qr.bottom+18;}).sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);
      const inp=controls[0];
      if(inp){
        try{inp.scrollIntoView({block:'center'});}catch{}
        try{
          const proto=inp instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
          assertIdentity();const set=Object.getOwnPropertyDescriptor(proto,'value')?.set;if(set)set.call(inp,payload.q7Detail);else inp.value=payload.q7Detail;
          inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));inp.dispatchEvent(new Event('blur',{bubbles:true}));out.filled++;
        }catch{try{inp.value=payload.q7Detail;out.filled++;}catch{out.failed.push('7-1 상세 입력 실패');}}
      }else out.failed.push('7-1 상세 입력칸을 찾지 못함');
    }else out.failed.push('7-1 상세 문항을 찾지 못함');
  }
  out.ok=out.filled>=8 && out.failed.length===0;
  if(out.ok)out.notes.push('응답 자동입력 완료. Work24 화면을 확인한 뒤 저장하세요.');
  return out;
}

$('applyBtn').addEventListener('click',async()=>{
  if(!pending)return;if(!/^A\d{10,30}$/.test(String(pending.iapNo||''))){setStatus('등록번호 확인 필요','error');return;}
  const liveReadiness=(await chrome.storage.local.get(KEY))?.[KEY];
  const sentAtMs=Date.parse(String(pending.sentAt||''));
  if(!liveReadiness||liveReadiness.sentAt!==pending.sentAt||!Number.isFinite(sentAtMs)||Date.now()-sentAtMs>72*3600000||sentAtMs>Date.now()+300000){
    setStatus('전송자료가 만료되었거나 변경되었습니다. 통합본에서 다시 전송해 주세요.','error');await chrome.storage.local.remove(KEY);return;
  }
  if(!confirm('현재 Work24 화면의 참여자와 통합본에서 전송한 설문 대상이 같은지 확인해 주세요.\n\n확인을 누르면 8개 응답을 입력하지만 최종 저장·제출은 하지 않습니다.'))return;
  const btn=$('applyBtn');btn.disabled=true;setStatus('Work24 구직준비도 화면을 찾아 자동입력 중…','warn');
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.id||!isWork24Tab(tab.url||''))throw new Error('활성 탭이 Work24 화면이 아닙니다.');
    const probe=await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},world:'MAIN',func:ClientContextCore.scanWork24Detail});
    const context=ClientContextCore.combine(probe.map(x=>x.result));const targets=probe.filter(x=>x.result?.status==='single'&&x.result.regNo===pending.iapNo);
    if(context.status!=='single'||context.regNo!==pending.iapNo||targets.length!==1||!targets[0].documentId)throw Error('등록번호 검증 실패 · 단일 입력 화면을 확인해 주세요.');
    const rs=await chrome.scripting.executeScript({target:{tabId:tab.id,documentIds:[targets[0].documentId]},world:'MAIN',func:applyReadinessMAIN,args:[pending]});
    const vals=(rs||[]).map(x=>x.result).filter(Boolean);
    const ok=vals.find(x=>x.ok);
    if(ok){setStatus(`✓ 자동입력 완료 · ${ok.filled}개 항목 반영. Work24 화면에서 확인 후 저장하세요.`,'ok');}
    else{
      const best=vals.sort((a,b)=>Number(b.found)-Number(a.found)||(b.filled||0)-(a.filled||0))[0];
      const msg=best?`${best.notes?.join(' ')||''}${best.failed?.length?` / 실패: ${best.failed.join(', ')}`:''}`:'Work24 화면에서 구직준비도 팝업을 찾지 못했습니다.';
      setStatus(`자동입력을 완료하지 못했습니다. ${msg}`,'error');
    }
  }catch(e){setStatus(`자동입력 오류: ${e?.message||e}`,'error');}
  finally{btn.disabled=false;}
});
load();
