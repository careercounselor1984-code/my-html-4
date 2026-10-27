const {JSDOM}=require('jsdom'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path'),{webcrypto}=require('node:crypto');
const root=path.join(__dirname,'..'),wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dom=new JSDOM('<iframe></iframe>',{url:'https://careercounselor1984-code.github.io/my-html-4/',runScripts:'outside-only'});
 const w=dom.window;Object.defineProperty(w,'crypto',{value:webcrypto});w.TextEncoder=TextEncoder;
 const f=w.document.querySelector('iframe'),d=f.contentDocument;
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const encoded=index.match(/"id":"p12","title":"[^"]+","b64":"([^"]+)"/)[1];
 d.open();d.write(Buffer.from(encoded,'base64').toString('utf8'));d.close();
 let generated=0,pcSaved=0,confirmCount=0;
 f.contentWindow.generateText=()=>generated++;
 f.contentWindow.saveAndGenerate=()=>pcSaved++;
 w.confirm=()=>{confirmCount++;return true};
 const old='2026-10-20T05:00:00.000Z';
 let rows=[
 {id:'a',owner_id:'user-a',owner_name:'본인',is_shared:false,saved_at:old,job:{company:'<script>alert(1)</script>',title:'생산직',duties:'자동차 부품 조립',workHours:'09:00~18:00',location:'울산',education:'고졸',experience:'경력무관',url:'https://example.com/job'}},
 {id:'b',owner_id:'user-b',owner_name:'다른 상담사',is_shared:true,saved_at:old,job:{company:'공유기업',title:'경비원',duties:'순찰 업무',location:'북구'}}
 ];
 function query(){
  let mode='select',values={},conditions=[],start=0,end=99;
  const q={
   select(){return q},order(){return q},range(a,b){start=a;end=b;return q},
   eq(k,v){conditions.push([k,v]);return q},
   gte(k,v){conditions.push([k,v,'gte']);return q},
   lt(k,v){conditions.push([k,v,'lt']);return q},
   update(v){mode='update';values=v;return q},
   delete(){mode='delete';return q},
   upsert(v){mode='upsert';values=v;return q},
   single(){return q},
   then(resolve){
    let data=rows.filter(r=>conditions.every(([k,v,op])=>op==='gte'?r[k]>=v:op==='lt'?r[k]<v:r[k]===v));
    if(mode==='update')data.forEach(r=>Object.assign(r,values));
    if(mode==='delete')rows=rows.filter(r=>!data.includes(r));
    if(mode==='upsert'){
     let record=rows.find(r=>r.job_key===values.job_key&&r.owner_id===values.owner_id);
     if(record)Object.assign(record,values);
     else{record={id:'new-'+(rows.length+1),is_shared:false,saved_at:new Date().toISOString(),...values};rows.push(record)}
     data=record;
    }else data=data.slice(start,end+1);
    return Promise.resolve(resolve({data,error:null}));
   }
  };return q;
 }
 w.clgJobArchiveClient=()=>({auth:{getUser:async()=>({data:{user:{id:'user-a'}}})},from:()=>query()});
 w.eval(fs.readFileSync(path.join(root,'job-archive.js'),'utf8'));
 w.dispatchEvent(new w.Event('clg-tab-frame-load'));
 await wait(300);
 const panel=d.getElementById('jobArchivePanel');assert.ok(panel,'archive mounted');
 assert.ok(d.getElementById('gjArchiveStyleV2').textContent.includes('display:grid'),'responsive grid');
 const legacy=d.getElementById('gjLegacyHistory');
 assert.ok(legacy&&!legacy.open,'PC saved list and backup collapsed');
 assert.ok(legacy.contains(d.getElementById('historyList')),'old PC list preserved');
 assert.equal(panel.querySelector('[data-period]').value,'all','defaults to all dates');
 assert.equal(panel.querySelectorAll('.gja-item').length,1,'mine includes an older item');
 assert.ok(panel.textContent.includes('<script>alert(1)</script>'),'XSS text shown safely');
 assert.equal(panel.querySelector('script'),null);
 assert.equal(panel.querySelector('.gja-item').textContent.includes('자동차 부품 조립'),false,'compact listing hides verbose duties');
 panel.querySelector('.gja-item input[type="checkbox"]').click();
 assert.equal(panel.querySelector('[data-share]').disabled,false);
 panel.querySelector('[data-share]').click();await wait(80);
 assert.equal(rows[0].is_shared,true,'one-click selected sharing');
 assert.equal(confirmCount,0,'sharing never asks for confirmation');
 panel.querySelector('[data-tab="shared"]').click();await wait(80);
 assert.equal(panel.querySelectorAll('.gja-item').length,2,'shared list includes own and other shared');
 assert.ok(panel.textContent.includes('공유기업'));
 const other=[...panel.querySelectorAll('.gja-item')].find(a=>a.textContent.includes('공유기업'));
 assert.equal(other.querySelector('input[type="checkbox"]'),null,'cannot mutate other counselors posts');
 panel.querySelector('[data-tab="mine"]').click();await wait(80);
 panel.querySelector('.gja-load').click();await wait(20);
 assert.equal(d.getElementById('c_task').value,'자동차 부품 조립','form receives selected job');
 assert.equal(d.getElementById('c_work_hours').value,'09:00~18:00');
 assert.equal(generated,1);
 d.getElementById('c_title').value='새로 저장한 공고';
 d.getElementById('c_name').value='신규업체';
 d.getElementById('c_task').value='생산';
 f.contentWindow.saveAndGenerate();await wait(150);
 assert.equal(pcSaved,1,'original local save kept');
 assert.ok(rows.some(r=>r.job?.title==='새로 저장한 공고'),'save bridge writes to remote archive');
 assert.ok(panel.textContent.includes('새로 저장한 공고'),'new posting is visible in right archive');
 assert.ok(panel.textContent.includes('내 보관함에도 저장했습니다.'));
 panel.querySelector('[data-period]').value='date';
 panel.querySelector('[data-period]').dispatchEvent(new w.Event('change'));await wait(80);
 assert.equal(panel.querySelector('[data-datebar]').hidden,false,'date filter is optional');
 console.log('PASS: responsive archive, compact records, legacy PC preservation, one-click sharing, role controls, save bridge, filters');
 dom.window.close();
})().catch(e=>{console.error(e);process.exit(1)});
