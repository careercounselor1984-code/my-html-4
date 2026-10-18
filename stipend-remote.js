/* Staff-authorized allowance calculation; no payment rules are shipped here. */
(()=>{'use strict';
 const by=id=>document.getElementById(id);
 const outputIds=new Set(['logResult','kakaoResult','nextKakaoResult','baseAllowance']);
 let epoch=0,lastKey='',pending=null,flight=null,cache=null,formRevision=0;
 const sum=selector=>[...document.querySelectorAll(selector+' .inc-amt')].reduce((n,el)=>n+Number(el.value||0),0);
 function collect(){return {
  years:['startDate','endDate','counselingDate'].map(id=>Number((by(id)?.value||'').slice(0,4))||0),
  referenceYear:Number((by('counselingDate')?.value||'').slice(0,4))||new Date().getFullYear(),
  ratePct:Number(by('paymentRate')?.value||0),familyCount:Number(by('familyCount')?.value||0),
  incomeStatus:document.querySelector('input[name="incomeStatus"]:checked')?.value||'없음',
  nonProgramIncome:sum('#deductibleList'),programIncome:sum('#programIncomeList'),excludedIncome:sum('#nonDeductibleList')
 };}
 function message(text){const el=by('incomeDecisionDisplay');if(el){el.innerText=text;el.setAttribute('role','status');}}
 function unresolved(text){
  for(const id of ['criteriaDisplay','deductionAmount','finalPayment','appliedFamilyDisplay'])if(by(id))by(id).innerText='확인 중';
  if(by('baseAllowance'))by('baseAllowance').value='';message(text);
 }
 function totals(fields){
  for(const [id,key]of [['totalDeductibleDisplay','nonProgramIncome'],['totalProgramIncomeDisplay','programIncome'],['totalNonDeductibleDisplay','excludedIncome']]){
   const value=fields.incomeStatus==='있음'?fields[key]:0;if(by(id))by(id).innerText=Number.isFinite(value)?value.toLocaleString():'확인 필요';
  }
 }
 const numeric=['fullBase','fullFam','fullEntitlement','appliedBase','appliedFam','payCap','familyCount','nonProgramIncome','programIncome','reportedIncome','excludedIncome','criteria','pay'];
 function valid(calc){
  if(!calc||typeof calc!=='object'||typeof calc.decision!=='string'||calc.decision.length>250)return false;
  if(calc.futureYear===true)return calc.pay===null&&calc.criteria===null;
  return numeric.every(key=>typeof calc[key]==='number'&&Number.isFinite(calc[key])&&calc[key]>=0&&calc[key]<=1e13);
 }
 function render(calc){
  if(calc.futureYear){unresolved('해당 연도 지급기준을 확인한 후 산정해 주세요.');return;}
  if(by('baseAllowance'))by('baseAllowance').value=calc.appliedBase;
  for(const [id,key]of [['appliedFamilyDisplay','appliedFam'],['criteriaDisplay','criteria'],['finalPayment','pay']])if(by(id))by(id).innerText=calc[key].toLocaleString();
  if(by('deductionAmount'))by('deductionAmount').innerText=Math.max(0,calc.payCap-calc.pay).toLocaleString();
  message(calc.decision);
 }
 function authenticated(){try{return !!window.parent.clgJobArchiveClient?.();}catch{return false;}}
 function cancelPending(){if(pending){clearTimeout(pending.timer);pending.resolve(null);pending=null;}}
 function calculate(options={}){
  const fields=collect(),key=JSON.stringify(fields);totals(fields);
  if(key!==lastKey){lastKey=key;epoch++;cache=null;}
  const version=epoch;
  if(!authenticated()){cancelPending();unresolved('로그인 후 지급액을 계산합니다.');return Promise.resolve(null);}
  if(!options.fresh&&cache?.key===key&&Date.now()-cache.at<15000){render(cache.calc);return Promise.resolve(cache.calc);}
  if(flight?.key===key&&flight.version===version)return flight.promise;
  if(pending?.key===key&&!options.immediate)return pending.promise;
  cancelPending();unresolved('지급액을 계산하는 중입니다…');
  function run(){
   const task={key,version,promise:null};flight=task;
   task.promise=(async()=>{
    try{
     if(typeof window.parent.clgComputeStipend!=='function')throw Error('로그인한 통합본에서 지급액을 계산해 주세요.');
     const calc=await window.parent.clgComputeStipend(fields);
     if(version!==epoch||key!==JSON.stringify(collect())||!authenticated())return null;
     if(!valid(calc))throw Error('지급액 응답을 확인하지 못했습니다. 다시 계산해 주세요.');
     cache={key,calc,at:Date.now()};render(calc);return calc;
    }catch(error){
     if(version===epoch){cache=null;unresolved(error?.message||'지급액 계산에 실패했습니다. 잠시 후 다시 시도해 주세요.');}
     return null;
    }finally{if(flight===task)flight=null;}
   })();return task.promise;
  }
  if(options.immediate)return run();
  const job={key,resolve:null,timer:null,promise:null};
  job.promise=new Promise(resolve=>{job.resolve=resolve;job.timer=setTimeout(()=>{if(pending===job)pending=null;resolve(run());},400);});
  pending=job;return job.promise;
 }
 function stale(){const area=by('resultArea');if(area)area.dataset.current='0';document.querySelectorAll('#resultArea button[onclick*="copyText"]').forEach(button=>{button.disabled=true;});}
 function sourceChange(event){
  if(!event.target?.matches?.('input,select,textarea')||outputIds.has(event.target.id))return;
  formRevision++;stale();const key=JSON.stringify(collect());if(key!==lastKey)calculate();
 }
 function logout(){epoch++;cache=null;lastKey='';cancelPending();stale();unresolved('로그인 후 지급액을 계산합니다.');}
 const ready=()=>{epoch++;cache=null;calculate({immediate:true});};
 window.clgStipendCalc=calculate;
 window.clgStipendRevision=()=>formRevision;
 window.clgStipendInvalidate=stale;
 window.clgStipendMarkGenerated=()=>{if(by('resultArea'))by('resultArea').dataset.current='1';document.querySelectorAll('#resultArea button[onclick*="copyText"]').forEach(button=>{button.disabled=false;});};
 document.addEventListener('input',sourceChange,true);document.addEventListener('change',sourceChange,true);
 try{window.parent.addEventListener('clg-auth-ready',ready);window.parent.addEventListener('clg-auth-logout',logout);}catch{}
 window.addEventListener('unload',()=>{epoch++;cancelPending();try{window.parent.removeEventListener('clg-auth-ready',ready);window.parent.removeEventListener('clg-auth-logout',logout);}catch{}},{once:true});
 stale();
})();
