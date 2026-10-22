/* Strict detail-field reader. List rows and arbitrary page text are never identity evidence. */
(function(root){'use strict';
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
function combine(results){const live=results.filter(Boolean);if(live.some(x=>x.status==='conflict'||x.status==='unavailable'))return {status:'conflict'};const found=live.filter(x=>x.status==='single'),ids=new Set(found.map(x=>x.regNo));if(ids.size!==1)return {status:ids.size>1?'conflict':'none'};const values={};const disputed=new Set();for(const r of found)for(const [k,v]of Object.entries(r.values||{})){if(values[k]&&values[k]!==v)disputed.add(k);else values[k]=v}for(const k of disputed)delete values[k];return {status:'single',regNo:[...ids][0],values};}
root.ClientContextCore={scanWork24Detail,combine};if(typeof module!=='undefined')module.exports=root.ClientContextCore;
})(typeof globalThis==='undefined'?this:globalThis);
