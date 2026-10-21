/* Strict detail-field reader. List rows and arbitrary page text are never identity evidence. */
(function(root){'use strict';
function scanWork24Detail(){
 const clean=v=>String(v||'').replace(/\s+/g,'').replace(/[:：*]/g,'');
 const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
 const values={},ids=new Set(),ambiguous=new Set();
 const labels={IAP등록번호:'regNo',취업활동계획등록번호:'regNo',IAP번호:'regNo',성명:'name',참여자명:'name',구직인증번호:'jobCertNo',구직인증만료일:'jobCertExpire',구직인증기간만료일:'jobCertExpire',IAP수립일:'iapDate',취업지원서비스만료일:'serviceEnd',취업지원기간만료일:'serviceEnd',지정일:'dueDate'};
 function add(key,value){value=String(value||'').trim();if(!value)return;if(key==='regNo'){const no=value.toUpperCase();if(/^A\d{10,30}$/.test(no))ids.add(no);return}if(key!=='name'&&key!=='jobCertNo'){const m=value.match(/^(\d{4})[-./](\d{2})[-./](\d{2})$/);if(!m)return;value=m.slice(1).join('-')}if(value.length>100)return;if(values[key]&&values[key]!==value)ambiguous.add(key);else values[key]=value;}
 for(const el of document.querySelectorAll('input,select,textarea')){
  if(!visible(el)||el.closest('[role=grid],.jqgrid,.grid-body,.w2grid'))continue;
  const tokens=[el.name,el.id].filter(Boolean).map(clean);
  if(tokens.some(token=>/^(?:iapRegNo|iapNo|iapSn|iapMngNo)$/i.test(token)))add('regNo',el.value);
  const label=el.labels?.length===1?clean(el.labels[0].textContent):'';if(labels[label])add(labels[label],el.value);
 }
 for(const label of document.querySelectorAll('th,dt')){
  if(!visible(label))continue;const key=labels[clean(label.textContent)];if(!key)continue;
  const next=label.nextElementSibling;if(!next||!['TD','DD'].includes(next.tagName)||next.colSpan>4)continue;
  const table=label.closest('table');if(table?.querySelector('thead')||table?.matches('[role=grid],.jqgrid,.w2grid'))continue;
  if(table&&[...table.querySelectorAll('th')].filter(x=>labels[clean(x.textContent)]==='regNo').length>1){ambiguous.add('identity');continue;}
  const input=next.querySelector('input,select');add(key,input?input.value:next.textContent);
 }
 for(const key of ambiguous)delete values[key];
 return {status:ids.size>1||ambiguous.has('identity')?'conflict':ids.size===1?'single':'none',regNo:ids.size===1?[...ids][0]:'',values};
}
function combine(results){const live=results.filter(Boolean);if(live.some(x=>x.status==='conflict'||x.status==='unavailable'))return {status:'conflict'};const found=live.filter(x=>x.status==='single'),ids=new Set(found.map(x=>x.regNo));if(ids.size!==1)return {status:ids.size>1?'conflict':'none'};const values={};const disputed=new Set();for(const r of found)for(const [k,v]of Object.entries(r.values||{})){if(values[k]&&values[k]!==v)disputed.add(k);else values[k]=v}for(const k of disputed)delete values[k];return {status:'single',regNo:[...ids][0],values};}
root.ClientContextCore={scanWork24Detail,combine};if(typeof module!=='undefined')module.exports=root.ClientContextCore;
})(typeof globalThis==='undefined'?this:globalThis);
