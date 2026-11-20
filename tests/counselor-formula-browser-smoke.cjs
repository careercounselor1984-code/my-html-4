'use strict';
/* Headless real Chrome smoke: synthetic workbook, no user data or server requests. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),zlib=require('node:zlib');
const html=fs.readFileSync(path.join(__dirname,'../counselor-management/index.html'),'utf8');
const audit=fs.readFileSync(path.join(__dirname,'../counselor-management/formula-audit.js'),'utf8');
function extract(marker){
 const a=html.indexOf(marker);if(a<0)throw Error('module marker not found: '+marker);
 const from=html.indexOf('(function(root)',a),end=html.indexOf("})(typeof self!=='undefined'?self:globalThis);",from);
 if(from<0||end<0)throw Error('module boundary missing: '+marker);
 return html.slice(from,end+"})(typeof self!=='undefined'?self:globalThis);".length);
}
const reader=extract('/* Read-only OOXML projection.'),writer=extract('/* Minimal OOXML edits, preserving');
const names=['21 평가기준','22 평가기준','23 평가기준','데이터(지우지말것)','직무분류2505','진행통계','평가통계','상담사관리현황','3단계 취업지원서비스'];
const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const xmlEsc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const cell=(ref,value)=>'<c r="'+ref+'" t="inlineStr"><is><t>'+xmlEsc(value)+'</t></is></c>';
const formula=(ref,value)=>'<c r="'+ref+'"><f>'+xmlEsc(value)+'</f><v>2</v></c>';
const row=(index,cells)=>'<row r="'+index+'">'+cells.join('')+'</row>';
const wrap=body=>'<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="'+ns+'"><sheetData>'+body+'</sheetData></worksheet>';
const members=wrap(
 row(5,[cell('B5','진행단계'),cell('G5','성명'),cell('J5','IAP번호'),cell('BS5','구직마감일'),cell('BT5','마지막상담일')])+
 row(6,[cell('B6','3단계'),cell('G6','가상참여자'),cell('J6','A123456789012'),cell('BS6','2027-01-31'),cell('BT6','2026-11-10')])
);
const stat=wrap(
 row(10,[formula('A10','SUM(C10:D10)'),formula('B10','SUM(E10:F10)')])+
 row(11,[formula('A11','SUM(#REF!)')])+
 row(12,[formula('A12','SUM(C12:D12)'),formula('B12','SUM(E12:F12)')])
);
const sheets=names.map((name,i)=>i===5?stat:i===7?members:wrap(''));
const workbook='<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="'+ns+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+names.map((n,i)=>'<sheet name="'+xmlEsc(n)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>';
const rels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+names.map((n,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'</Relationships>';
const contentTypes='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+names.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>';
const entries=[
 ['[Content_Types].xml',contentTypes],
 ['_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
 ['xl/workbook.xml',workbook],
 ['xl/_rels/workbook.xml.rels',rels],
 ...sheets.map((s,i)=>['xl/worksheets/sheet'+(i+1)+'.xml',s])
];
function crc32(buf){
 let crc=0xffffffff;
 for(const byte of buf){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}
function zip(files){
 const locals=[],centrals=[];let offset=0;
 for(const [name,content] of files){
  const filename=Buffer.from(name,'utf8'),raw=Buffer.from(content,'utf8'),compressed=zlib.deflateRawSync(raw),crc=crc32(raw);
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);
  header.writeUInt16LE(0x0800,6);header.writeUInt16LE(8,8);header.writeUInt32LE(crc,14);
  header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(raw.length,22);header.writeUInt16LE(filename.length,26);
  const local=Buffer.concat([header,filename,compressed]);locals.push(local);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);
  central.writeUInt16LE(20,6);central.writeUInt16LE(0x0800,8);central.writeUInt16LE(8,10);
  central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(raw.length,24);
  central.writeUInt16LE(filename.length,28);central.writeUInt32LE(offset,42);
  centrals.push(Buffer.concat([central,filename]));offset+=local.length;
 }
 const dir=Buffer.concat(centrals),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);
 end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);
 end.writeUInt32LE(dir.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,dir,end]);
}
const data=zip(entries),base64=data.toString('base64');
const probe='(async()=>{try{'+
 'const src=Uint8Array.from(atob("'+base64+'"),x=>x.charCodeAt(0));'+
 'const X=window.CounselorExcel,W=window.CounselorCopyWriter,A=window.CounselorFormulaAudit;'+
 'const model=await A.snapshot(src.buffer,W,X),report=A.audit(model);'+
 'const fixes=report.issues.filter(i=>i.repairable&&(i.address==="A11"||i.address==="B11"));'+
 'if(fixes.length!==2)throw Error("expected two approved fixes, got "+fixes.length);'+
 'const output=await A.createCorrectedCopy(src.buffer,model,report,new Set(fixes.map(i=>i.id)),W,X);'+
 'const check=await A.snapshot(output.bytes.buffer,W,X),sheet=check.sheets.find(s=>s.name==="진행통계");'+
 'if(sheet.cells.get("A11")?.formula!=="SUM(C11:D11)")throw Error("A11 unchanged");'+
 'if(sheet.cells.get("B11")?.formula!=="SUM(E11:F11)")throw Error("B11 unchanged");'+
 'if(sheet.cells.get("A10")?.formula!=="SUM(C10:D10)")throw Error("neighbor formula damaged");'+
 'document.documentElement.setAttribute("data-audit-smoke","pass");'+
 '}catch(e){document.documentElement.setAttribute("data-audit-smoke","fail");document.getElementById("result").textContent=String(e?.stack||e);}})();';
const fixture='<!doctype html><html lang="ko"><head><meta charset="UTF-8"></head><body><pre id="result"></pre><script>'+reader+'\n'+writer+'\n'+audit+'\n'+probe+'</script></body></html>';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser','/opt/google/chrome/chrome'].find(p=>fs.existsSync(p));
if(!chrome)throw Error('Chrome not available');
const location=path.resolve('.counselor-formula-smoke.html');
fs.writeFileSync(location,fixture,'utf8');
try{
 const result=cp.spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-extensions','--allow-file-access-from-files','--virtual-time-budget=15000','--dump-dom','file://'+location],{encoding:'utf8',timeout:120000,maxBuffer:24*1024*1024});
 if(!String(result.stdout).includes('data-audit-smoke="pass"')){
  const output=String(result.stdout||'');
  const marker=output.match(/data-audit-smoke="([^"]+)"/)?.[1]||'absent';
  const prefix='<pre id="result">',at=output.indexOf(prefix);
  const detail=at>=0?output.slice(at+prefix.length,output.indexOf('</pre>',at)):'No browser result detail';
  console.error('Browser smoke failed',result.status,'attribute',marker,'detail',detail.slice(0,2400),'head',output.slice(0,260),'stderr',String(result.stderr).slice(-500));
  process.exitCode=1;
 }else console.log('PASS: Real Chrome read XLSX → identify formulas → approved copy → reopen → preserve adjacent formulas');
}finally{fs.unlinkSync(location);}
