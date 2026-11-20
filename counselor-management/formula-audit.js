/* Local-only Excel formula audit and approved-copy repairs.
 * Never writes the user's source file, persists workbook content, or contacts a server.
 * Proposals are syntactic candidates, NOT validation of government performance rules.
 */
(function(root){'use strict';
const LIMIT_ISSUES=1000,MAX_FORMULAS=30000,MAX_AUDIT_CELLS=750000;
const enc=typeof TextEncoder==='function'?new TextEncoder():null;
const dec=typeof TextDecoder==='function'?new TextDecoder('utf-8',{fatal:true}):null;
const $=id=>root.document?.getElementById(id);
const validCell=/^([A-Z]{1,3})([1-9]\d{0,6})$/;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const byName=(n,t)=>Array.from(n.getElementsByTagNameNS('*',t));
const one=(n,t)=>n.getElementsByTagNameNS('*',t)[0];
const xml=(source)=>{
 if(/<!DOCTYPE|<!ENTITY/i.test(source))throw Error('DTD/엔터티를 포함한 XML은 분석하지 않습니다.');
 const d=new root.DOMParser().parseFromString(source,'application/xml');
 if(d.getElementsByTagName('parsererror').length)throw Error('시트 XML 구조가 손상되었습니다.');
 return d;
};
function columnNumber(col){let n=0;for(const c of col)n=n*26+c.charCodeAt(0)-64;return n;}
function safeFormula(value){
 return typeof value==='string'&&value.length>0&&value.length<=4096
 && !/(\[[^\]]*\]|#REF!|#SPILL!|#CALC!|_xlfn\.|INDIRECT\s*\(|OFFSET\s*\(|HYPERLINK\s*\(|WEBSERVICE\s*\(|DDE\s*\()/i.test(value)
 && !/[\x00-\x1f]/.test(value);
}
/* Avoid changing A1-looking text in string literals and quoted sheet names.
   References are rewritten only outside quoted regions. */
function formulaRefs(formula,callback){
 let out='',fragment='',quote='';
 function flush(){if(!fragment)return;out+=fragment.replace(/(^|[^A-Za-z0-9_.])(\$?)([A-Z]{1,3})(\$?)([1-9]\d{0,6})(?![A-Za-z0-9_.])/g,
  (full,lead,absCol,col,absRow,number)=>{
   const n=Number(number);if(columnNumber(col)>16384||n>1048576)return full;
   return lead+callback({absCol,col,absRow,row:n,original:full.slice(lead.length)});
  });fragment='';
 }
 for(let i=0;i<formula.length;i++){const c=formula[i];
  if(quote){out+=c;if(c===quote){if(formula[i+1]===quote){out+=formula[++i];}else quote='';}}
  else if(c==='"'||c==="'"){flush();out+=c;quote=c;}else fragment+=c;
 }
 flush();return out;
}
function signature(formula,row){
 return formulaRefs(formula,r=>r.absCol+r.col+(r.absRow?'$'+r.row:'@'+(r.row-row)));
}
function shift(formula,delta){
 let invalid=false;
 const moved=formulaRefs(formula,r=>{
  const n=r.absRow?r.row:r.row+delta;
  if(n<1||n>1048576){invalid=true;return r.original;}
  return r.absCol+r.col+r.absRow+n;
 });
 return invalid?null:moved;
}
function guess(before,after,targetRow){
 if(!before||!after||before.row!==targetRow-1||after.row!==targetRow+1)return null;
 if(!safeFormula(before.formula)||!safeFormula(after.formula))return null;
 if(signature(before.formula,before.row)!==signature(after.formula,after.row))return null;
 const prev=shift(before.formula,1),next=shift(after.formula,-1);
 return prev&&next&&prev===next&&safeFormula(prev)?prev:null;
}
function sheetPath(target){
 if(typeof target!=='string')return '';
 const p=target.startsWith('/')?target.substring(1):'xl/'+target.replace(/^\.?\//,'');
 return /^xl\/worksheets\/[^/]+\.xml$/.test(p)?p:'';
}
async function snapshot(bytes,Writer,Reader){
 if(!(bytes instanceof ArrayBuffer||ArrayBuffer.isView(bytes)))throw Error('Excel 파일 형식을 확인하세요.');
 const byteLength=bytes.byteLength;
 if(!byteLength||byteLength>Reader.LIMIT.file)throw Error('8MB 이하의 XLSX 파일만 점검합니다.');
 // This is a formula-only audit. Do not require the fixed nine-sheet
 // participant-management template used by the separate counseling editor.
 const zip=Writer.archive(bytes),find=n=>zip.items.find(i=>i.name===n);
 if(zip.items.length>Reader.LIMIT.entries)throw Error('XLSX 구성 항목이 너무 많습니다.');
 const unique=new Set(),totalSize=zip.items.reduce((n,i)=>{
  if(unique.has(i.name))throw Error('중복 ZIP 항목은 처리하지 않습니다.');
  unique.add(i.name);
  if(i.size>Reader.LIMIT.part)throw Error('용량 제한을 넘는 XLSX 구성요소가 있습니다.');
  if(i.flags&1)throw Error('암호화된 ZIP 항목은 처리하지 않습니다.');
  if(i.method!==0&&i.method!==8)throw Error('지원하지 않는 ZIP 압축 방식입니다.');
  if(i.name.includes('..')||i.name.startsWith('/'))throw Error('안전하지 않은 ZIP 경로입니다.');
  return n+i.size;
 },0);
 if(totalSize>Reader.LIMIT.total)throw Error('압축 해제 데이터가 점검 제한을 초과합니다.');
 if(zip.items.some(i=>/^_xmlsignatures\//i.test(i.name)||/vbaProject\.bin$/i.test(i.name)))throw Error('전자서명/매크로가 있는 파일은 수정사본을 만들지 않습니다.');
 async function get(n){const item=find(n);if(!item)throw Error('필수 XLSX 항목이 없습니다: '+n);return dec.decode(await Writer.inflate(zip,item));}
 const wb=xml(await get('xl/workbook.xml')),rel=xml(await get('xl/_rels/workbook.xml.rels'));
 const relMap=new Map(byName(rel,'Relationship').filter(x=>x.getAttribute('TargetMode')!=='External').map(x=>[x.getAttribute('Id'),x.getAttribute('Target')]));
 const sheets=[];let count=0,cellCount=0;
 if(byName(wb,'sheet').length>20)throw Error('20개 초과 시트는 분석할 수 없습니다.');
 for(const item of byName(wb,'sheet')){
  const rid=item.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  const path=sheetPath(relMap.get(rid)),name=item.getAttribute('name')||'';
  if(!path)throw Error('시트 참조 경로를 확인할 수 없습니다.');
  const source=await get(path),dom=xml(source),cells=new Map(),occupied=new Set(),rows=new Map();
  for(const row of byName(dom,'row')){
   const n=Number(row.getAttribute('r'));if(Number.isInteger(n))rows.set(n,row);
   for(const cell of byName(row,'c')){
    if(++cellCount>MAX_AUDIT_CELLS)throw Error('엑셀 셀 수가 점검 제한을 초과합니다.');
    const addr=String(cell.getAttribute('r')||'');if(!validCell.test(addr))continue;
    const f=one(cell,'f'),v=one(cell,'v'),type=cell.getAttribute('t')||'';
    if(f)count++;
    occupied.add(addr);
    // A counselor workbook may have 400k+ styled, otherwise blank cells.
    // Index only formula/error cells. Occupied keeps us from inserting a
    // duplicate XML cell where an apparently empty styled cell exists.
    if(f||(type==='e'&&v))cells.set(addr,{address:addr,row:n,col:validCell.exec(addr)[1],
      formula:f?.textContent||'',formulaNode:f||null,cell,cache:v?.textContent||'',type});
   }
  }
  if(count>MAX_FORMULAS)throw Error('수식이 너무 많은 파일입니다. 30,000개 이하만 분석할 수 있습니다.');
  sheets.push({name,path,source,dom,cells,occupied,rows,
   protected:!!one(dom,'sheetProtection')||!!one(dom,'tableParts'),
   formulaRanges:byName(dom,'f').map(f=>f.getAttribute('ref')).filter(Boolean),
   merges:byName(dom,'mergeCell').map(c=>c.getAttribute('ref')).filter(Boolean)});
 }
 return {zip,wb,sheets,totalFormulas:count,externalLinks:zip.items.filter(i=>/^xl\/externalLinks\/externalLink\d+\.xml$/.test(i.name)).length};
}
function within(range,address){
 const m=String(range).replace(/\$/g,'').match(/^([A-Z]{1,3})(\d+)(?::([A-Z]{1,3})(\d+))?$/),a=validCell.exec(address);
 return !!(m&&a&&columnNumber(a[1])>=columnNumber(m[1])&&columnNumber(a[1])<=columnNumber(m[3]||m[1])&&Number(a[2])>=Number(m[2])&&Number(a[2])<=Number(m[4]||m[2]));
}
function repairableTarget(sheet,address){
 if(sheet.protected||sheet.merges.some(r=>within(r,address))||sheet.formulaRanges?.some(r=>within(r,address)))return false;
 if(sheet.occupied?.has(address)&&!sheet.cells.has(address))return false;
 const cell=sheet.cells.get(address);if(!cell)return sheet.rows.has(Number(validCell.exec(address)?.[2]||0));
 if(cell.formulaNode){
  if(cell.formulaNode.attributes.length||!cell.formula||byName(cell.cell,'extLst').length)return false;
  return Array.from(cell.cell.children).every(n=>['f','v'].includes(n.localName));
 }
 return Array.from(cell.cell.children).every(n=>n.localName==='v'&&!n.textContent.trim());
}
function audit(model){
 const issues=[],counts={reference:0,cache:0,outlier:0,missing:0,external:0,repairable:0,formula:model.totalFormulas};
 let seq=0;
 function add(kind,sheet,address,before,after,reason){
  counts[kind]++;if(after)counts.repairable++;
  if(issues.length<LIMIT_ISSUES)issues.push({id:'issue-'+(++seq),kind,sheet:sheet.name,address,before:before||'',after:after||'',reason,repairable:!!after,path:sheet.path});
 }
 for(const sheet of model.sheets){
  const formulaCells=[...sheet.cells.values()].filter(c=>c.formulaNode&&c.formula);
  const perColumn=new Map();
  for(const c of formulaCells){
   if(!perColumn.has(c.col))perColumn.set(c.col,[]);
   perColumn.get(c.col).push(c);
  }
  const proposed=new Map();
  // Only two immediately adjacent formula rows of the SAME column can suggest a replacement.
  for(const [col,arr] of perColumn){
   const byRow=new Map(arr.map(c=>[c.row,c]));
   for(const first of arr){
    const after=byRow.get(first.row+2),targetRow=first.row+1;
    if(!after)continue;
    const replacement=guess(first,after,targetRow);
    if(!replacement)continue;
    const addr=col+targetRow,target=sheet.cells.get(addr);
    if(!repairableTarget(sheet,addr)||target?.formula===replacement)continue;
    if(target?.formulaNode && !target.formula)continue;
    if(target&&!target.formulaNode && Array.from(target.cell.children).some(n=>n.textContent.trim()))continue;
    proposed.set(addr,replacement);
   }
  }
  for(const [addr,replacement] of proposed){
   const target=sheet.cells.get(addr),current=target?.formula||'';
   if(current){add(/#REF!/i.test(current)?'reference':'outlier',sheet,addr,current,replacement,'인접한 위·아래 수식 패턴이 일치함. 수식 의미는 사람이 확인해야 합니다.');}
   else add('missing',sheet,addr,'',replacement,'위·아래 동일 패턴의 수식 사이에 빈 셀 또는 누락 셀 있음.');
  }
  for(const c of sheet.cells.values()){
   const already=proposed.has(c.address);
   if(c.formula&&/#REF!/i.test(c.formula)&&!already)add('reference',sheet,c.address,c.formula,'','참조 손상 수식 · 자동 복구 근거 부족');
   if(c.type==='e'&&/^#(REF!|DIV\/0!|VALUE!|NAME\?|NUM!|N\/A|NULL!|SPILL!|CALC!)$/i.test(c.cache))
    add('cache',sheet,c.address,c.formula,'','저장된 수식 결과 '+c.cache+' · Excel 재계산 필요. 수식 자체 오류인지 확인');
   if(c.formula&&/\[[^\]]+\]/.test(c.formula))add('external',sheet,c.address,c.formula,'','다른 파일 참조가 포함되어 있음');
  }
 }
 if(model.externalLinks){
  counts.external+=model.externalLinks;
  if(issues.length<LIMIT_ISSUES)issues.push({id:'issue-external',kind:'external',sheet:'통합 문서',address:'—',before:'',after:'',reason:'외부 연결 파일 '+model.externalLinks+'개 확인 · 연결 대상과 갱신 범위 검토',repairable:false,path:''});
 }
 return {issues,counts,truncated:issues.length>=LIMIT_ISSUES,sheets:model.sheets.map(x=>({name:x.name,formulas:[...x.cells.values()].filter(c=>c.formulaNode).length}))};
}
function ensureValidPatches(model,report,selectedIds){
 const selected=report.issues.filter(i=>selectedIds.has(i.id));
 if(!selected.length||selected.length>200)throw Error('한 번에 수정할 후보는 1~200개입니다.');
 for(const item of selected){
  if(!item.repairable||!safeFormula(item.after))throw Error('승인된 수정 범위를 벗어났습니다.');
  const s=model.sheets.find(x=>x.path===item.path);if(!s||!repairableTarget(s,item.address))throw Error('수정 셀 구조가 안전하지 않습니다.');
  const old=s.cells.get(item.address)?.formula||'';
  if(old!==item.before)throw Error('수식이 검사 당시와 달라졌습니다. 다시 점검하세요.');
 }
 return selected;
}
async function createCorrectedCopy(bytes,model,report,ids,Writer,Reader){
 const selected=ensureValidPatches(model,report,ids);
 if(typeof root.CompressionStream!=='function'||typeof Writer.rebuild!=='function')throw Error('안전한 수식 사본 생성 기능이 지원되지 않습니다.');
 const selectedByPath=new Map();for(const issue of selected){if(!selectedByPath.has(issue.path))selectedByPath.set(issue.path,[]);selectedByPath.get(issue.path).push(issue);}
 const replacements=new Map();
 for(const [path,changes] of selectedByPath){
  const sh=model.sheets.find(s=>s.path===path),allCells=Writer.spans(sh.source,['c']),allRows=Writer.spans(sh.source,['row']),cellSpans=new Map(),rowSpans=new Map(),patches=[];
  const attr=(tag,n)=>tag.match(new RegExp('(?:^|\\s)'+n+'="([^"]+)"'))?.[1]||'';
  for(const c of allCells){const addr=attr(c.open,'r');if(cellSpans.has(addr))throw Error('중복 셀이 있어 안전하게 수정할 수 없습니다.');cellSpans.set(addr,c);}
  for(const row of allRows)rowSpans.set(Number(attr(row.open,'r')),row);
  for(const change of [...changes].sort((a,b)=>Number(validCell.exec(a.address)[2])-Number(validCell.exec(b.address)[2])||columnNumber(validCell.exec(a.address)[1])-columnNumber(validCell.exec(b.address)[1]))){
   const current=sh.cells.get(change.address),span=cellSpans.get(change.address);
   const [col,rowNum]=[validCell.exec(change.address)[1],Number(validCell.exec(change.address)[2])];
   const prefix=sh.dom.documentElement.prefix?sh.dom.documentElement.prefix+':':'';
   let replacement;
   if(current){
    if(!span)throw Error('변경할 셀 XML을 찾지 못했습니다.');
    let open=span.open.replace(/\s+t=(?:"[^"]*"|'[^']*')/g,'').replace(/\/>$/,'>');
    replacement=open+'<'+prefix+'f>'+esc(change.after)+'</'+prefix+'f></'+prefix+'c>';
    patches.push({start:span.start,end:span.end,value:replacement});
   }else{
    const row=rowSpans.get(rowNum),domRow=sh.rows.get(rowNum);if(!row||row.self||!domRow||Array.from(domRow.children).some(n=>n.localName!=='c'))throw Error('수식 누락 행 구조가 불확실합니다.');
    const withinRow=allCells.filter(x=>x.start>=row.openEnd&&x.end<=row.end&&attr(x.open,'r'));
    const following=withinRow.find(x=>columnNumber(attr(x.open,'r').replace(/\d+/g,''))>columnNumber(col));
    const point=following?.start??row.closeStart;
    replacement='<'+prefix+'c r="'+change.address+'"><'+prefix+'f>'+esc(change.after)+'</'+prefix+'f></'+prefix+'c>';
    const existing=patches.find(x=>x.start===point&&x.end===point);
    if(existing)existing.value+=replacement;else patches.push({start:point,end:point,value:replacement});
   }
  }
  // Apply edits from right to left without reserializing the untouched sheet.
  let output=sh.source,last=output.length+1;
  for(const p of patches.sort((a,b)=>b.start-a.start)){
   if(p.end>last||p.start<0||p.end<p.start)throw Error('수식 XML 변경 위치가 겹칩니다.');
   output=output.slice(0,p.start)+p.value+output.slice(p.end);last=p.start;
  }
  xml(output);replacements.set(path,enc.encode(output));
 }
 // Respect existing workbook recalculation settings; avoid resetting official formulas.
 const wbItem=model.zip.items.find(i=>i.name==='xl/workbook.xml');
 if(!wbItem)throw Error('기본 통합 문서 정보가 없습니다.');
 const source=dec.decode(await Writer.inflate(model.zip,wbItem));
 let workbook=source;
 if(/<(?:(?:[\w.-]+):)?calcPr\b/.test(source)){
  workbook=source.replace(/(<(?:[\w.-]+:)?calcPr\b)([^>]*?)(\/?>)/,(whole,a,b,c)=>{
   const fields=b.replace(/\s+(?:fullCalcOnLoad|forceFullCalc|calcMode)\s*=\s*(?:"[^"]*"|'[^']*')/g,'');
   return a+fields+' fullCalcOnLoad="1" forceFullCalc="1" calcMode="auto"'+c;
  });
 }else{
  // Preserve XML child order by inserting after sheets or externalReferences/definedNames.
  const spans=Writer.spans(source,['sheets','definedNames','externalReferences','functionGroups']);
  const chosen=['externalReferences','definedNames','functionGroups','sheets'].map(n=>spans.find(x=>x.local===n)).find(Boolean);
  if(!chosen)throw Error('재계산 설정을 삽입할 위치가 없습니다.');
  const p=model.wb.documentElement.prefix?model.wb.documentElement.prefix+':':'';
  workbook=source.slice(0,chosen.end)+'<'+p+'calcPr fullCalcOnLoad="1" forceFullCalc="1" calcMode="auto"/>'+source.slice(chosen.end);
 }
 xml(workbook);replacements.set('xl/workbook.xml',enc.encode(workbook));
 const result=await Writer.rebuild(model.zip,replacements);
 if(result.length>Reader.LIMIT.file)throw Error('수정 사본이 용량 제한을 초과했습니다.');
 const verified=await snapshot(result,Writer,Reader);
 for(const issue of selected){
  const sh=verified.sheets.find(s=>s.path===issue.path);
  if(sh?.cells.get(issue.address)?.formula!==issue.after)throw Error('수정 결과 수식 재검증 실패: '+issue.sheet+'!'+issue.address);
 }
 // Check every pre-existing cell that was not selected for modification.
 const chosenAddresses=new Set(selected.map(i=>i.path+'!'+i.address));
 for(const originalSheet of model.sheets){
  if(!replacements.has(originalSheet.path))continue;
  const regenerated=verified.sheets.find(s=>s.path===originalSheet.path);
  if(!regenerated)throw Error('수정된 시트를 재검증하지 못했습니다.');
  for(const [address,prior] of originalSheet.cells){
   if(chosenAddresses.has(originalSheet.path+'!'+address))continue;
   const updated=regenerated.cells.get(address);
   if(!updated||prior.formula!==updated.formula||prior.cache!==updated.cache||prior.type!==updated.type)
    throw Error('수정 대상으로 선택하지 않은 셀의 값이 달라졌습니다: '+originalSheet.name+'!'+address);
  }
 }
 // No ZIP entry outside the approved worksheet(s) and recalc metadata may change.
 if(verified.zip.items.length!==model.zip.items.length)throw Error('ZIP 파일 항목 수가 변경되었습니다.');
 for(const old of model.zip.items){
  const changed=verified.zip.items.find(i=>i.name===old.name);if(!changed)throw Error('원본 ZIP 항목 누락');
  if(!replacements.has(old.name)){
   if(old.raw.length!==changed.raw.length||!old.raw.every((n,i)=>n===changed.raw[i]))
    throw Error('선택하지 않은 XLSX 항목이 변경되었습니다: '+old.name);
  }else{
   const actual=await Writer.inflate(verified.zip,changed),expected=replacements.get(old.name);
   if(actual.length!==expected.length||!actual.every((n,i)=>n===expected[i]))
    throw Error('수정된 XLSX 내용 재검증 실패');
  }
 }
 return {bytes:result,changes:selected.length};
}
function csvCell(v){
 let value=String(v??'').replace(/\r?\n/g,' ');
 // Spreadsheet applications may interpret imported CSV fields as formulas.
 if(/^[\s]*[=+@-]/.test(value))value="'"+value;
 return '"'+value.replace(/"/g,'""')+'"';
}
function download(bytes,name,type){
 const b=new Blob([bytes],{type}),u=URL.createObjectURL(b),a=root.document.createElement('a');
 a.href=u;a.download=name;root.document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);
}
function mount(){
 const panel=$('formulaAuditPanel');if(!panel)return;
 const file=$('formulaAuditFile'),status=$('formulaAuditStatus'),summary=$('formulaAuditSummary'),
  list=$('formulaAuditRows'),review=$('formulaAuditApprove'),save=$('formulaAuditSave'),
  select=$('formulaAuditSelect'),clear=$('formulaAuditClear'),exportBtn=$('formulaAuditExport');
 let data=null,model=null,report=null,origin='',picked=new Set(),busy=false,epoch=0;
 function authorized(){return root.CMIntegrated?.active===true&&!!root.CMIntegrated.access?.allowed;}
 function setStatus(msg){status.textContent=msg;}
 function controls(){const n=picked.size;save.disabled=busy||!authorized()||!n||!review.checked;select.disabled=busy||!report?.counts.repairable;clear.disabled=busy||!n;exportBtn.disabled=busy||!report;}
 function render(){
  list.replaceChildren();summary.replaceChildren();if(!report){controls();return;}
  const c=report.counts;summary.textContent='수식 '+c.formula+'개 · 참조손상 '+c.reference+'건 · 계산 오류 캐시 '+c.cache+'건 · 패턴 불일치 '+c.outlier+'건 · 누락 의심 '+c.missing+'건 · 외부참조 '+c.external+'건 · 복구 제안 '+c.repairable+'건';
  const head=['적용','시트 / 셀','분류','기존 수식','수정 제안 / 확인사항'];
  const tr=root.document.createElement('tr');for(const label of head){const th=root.document.createElement('th');th.textContent=label;tr.append(th);}list.append(tr);
  const types={reference:'참조 오류',cache:'계산 결과 오류',outlier:'수식 패턴 이상',missing:'수식 누락 의심',external:'외부 연결'};
  for(const i of report.issues){
   const row=root.document.createElement('tr'),box=root.document.createElement('input');box.type='checkbox';box.disabled=!i.repairable;box.checked=picked.has(i.id);
   box.setAttribute('aria-label',i.sheet+' '+i.address+' 수식 수정 선택');box.onchange=()=>{if(box.checked)picked.add(i.id);else picked.delete(i.id);review.checked=false;controls();};
   const td=root.document.createElement('td');td.append(box);row.append(td);
   for(const value of [i.sheet+'!'+i.address,types[i.kind]||i.kind,(i.before?'='+i.before:'(빈 셀)'),
    (i.after?'제안: ='+i.after+' / ':'')+i.reason]){
    const cell=root.document.createElement('td');cell.textContent=value;cell.style.whiteSpace='normal';cell.style.overflowWrap='anywhere';row.append(cell);
   }list.append(row);
  }
  if(report.truncated)setStatus('오류 표시가 '+LIMIT_ISSUES+'건으로 제한됐습니다. 일부 항목은 점검 결과에 나타나지 않습니다.');
  controls();
 }
 file.onchange=async()=>{
  const f=file.files?.[0],token=++epoch;data=null;model=null;report=null;picked.clear();review.checked=false;render();
  if(!f)return;
  if(!authorized()){setStatus('상담사 관리 접근 권한을 확인하세요.');return;}
  if(!/\.xlsx$/i.test(f.name)||f.size>8*1024*1024){setStatus('8MB 이하 XLSX 파일만 점검할 수 있습니다.');return;}
  busy=true;controls();setStatus('엑셀 수식과 원본 ZIP 구조를 점검 중입니다.');
  try{
   const bytes=await f.arrayBuffer(),Reader=root.CounselorExcel,Writer=root.CounselorCopyWriter;
   const current=await snapshot(bytes,Writer,Reader);if(token!==epoch)return;
   data=bytes;model=current;report=audit(current);origin=f.name;
   setStatus('로컬 점검 완료 · 원본 엑셀은 변경하지 않았습니다. 제안은 통계 산식의 정확성을 보증하지 않습니다.');
   render();
  }catch(e){if(token===epoch)setStatus('점검 중단: '+(e?.message||e));}
  finally{if(token===epoch){busy=false;controls();}}
 };
 select.onclick=()=>{picked=new Set((report?.issues||[]).filter(i=>i.repairable).slice(0,200).map(i=>i.id));review.checked=false;render();};
 clear.onclick=()=>{picked.clear();review.checked=false;render();};
 review.onchange=controls;
 exportBtn.onclick=()=>{
  if(!report)return;
  const rows=[['시트','셀','유형','기존 수식','제안 수식','점검 사유'],...report.issues.map(i=>[i.sheet,i.address,i.kind,i.before?('='+i.before):'',i.after?('='+i.after):'',i.reason])];
  const text='\ufeff'+rows.map(x=>x.map(csvCell).join(',')).join('\r\n');
  download([text],'수식_점검결과.csv','text/csv;charset=utf-8');
 };
 save.onclick=async()=>{
  if(busy||!data||!model||!report||!picked.size||!review.checked||!authorized())return;
  if(!root.confirm('선택한 '+picked.size+'개 수식 후보를 새 XLSX 사본에만 적용합니다. 공식 실적 산식은 별도로 확인해야 합니다. 계속할까요?'))return;
  busy=true;controls();setStatus('수정사본 생성 및 원본 ZIP 항목 보존을 재검증하고 있습니다.');
  try{
   const out=await createCorrectedCopy(data,model,report,picked,root.CounselorCopyWriter,root.CounselorExcel);
   if(!authorized())throw Error('로그인이 해제되어 다운로드를 중단했습니다.');
   const safeName=origin.replace(/\.xlsx$/i,'').replace(/[\\/:*?"<>|]/g,'_').slice(0,100);
   download(out.bytes,safeName+'_수식수정_검증사본.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   setStatus('선택한 '+out.changes+'개 수식에 대한 사본 저장 요청 완료 · Excel에서 다시 열어 계산 결과를 확인하세요. 원본은 그대로입니다.');
  }catch(e){setStatus('안전한 사본 생성 실패: '+(e?.message||e));}
  finally{busy=false;controls();}
 };
 root.addEventListener('cm-access-revoked',()=>{epoch++;data=null;model=null;report=null;picked.clear();review.checked=false;file.value='';render();setStatus('로그아웃되어 검사한 파일 내용을 지웠습니다.');});
 controls();
}
const api={formulaRefs,signature,shift,guess,safeFormula,audit,createCorrectedCopy,mount,snapshot};
root.CounselorFormulaAudit=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
