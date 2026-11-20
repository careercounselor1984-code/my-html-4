/* Internal reporting-period presets only. Not official evaluation eligibility rules. */
(function(root){'use strict';
  const MIN_YEAR=2000,MAX_YEAR=2100;
  function forYear(input){
    const year=Number(input);
    if(!Number.isInteger(year)||year<MIN_YEAR||year>MAX_YEAR)throw Error('관리연도를 확인하세요.');
    return {year,start:String(year-1)+'-11-01',end:String(year)+'-10-31'};
  }
  function detect(start,end){
    const match=/^(\d{4})-10-31$/.exec(String(end||''));
    if(!match)return 'custom';
    const year=Number(match[1]);
    if(year<MIN_YEAR||year>MAX_YEAR)return 'custom';
    return forYear(year).start===start?String(year):'custom';
  }
  const api=Object.freeze({forYear,detect});
  root.CounselorPeriodPresets=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
