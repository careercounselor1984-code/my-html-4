const assert=require('node:assert/strict');
(async()=>{const {courseInfo,scheduleResult,timetableDates}=await import('../supabase/training-schedule/schedule.mjs');
const id={trainingId:'TEST202600000001',round:'4',institutionId:'500020000001'};
const html='<form id="searchForm1">'+Object.entries({tracseId:id.trainingId,tracseTme:id.round,trainstCstmrId:id.institutionId,tracseBeginDe:'20261203',tracseEndDe:'20261226',cherNm:'DO NOT FORWARD',cherCryalTelno:'PRIVATE'}).map(([name,value])=>`<input name="${name}" value="${value}">`).join('')+'</form><em class="tit">훈련시간</em><p>2일, 총 8시간</p>';
const info=courseInfo(html,id);assert.equal(info.totalDays,2);assert.equal(info.totalHours,8);assert(!info.params.toString().includes('PRIVATE'));assert(!info.params.has('cherNm'));assert.throws(()=>courseInfo(html,{...id,round:'5'}),/불일치/);
const cell=(date,text)=>`<td class="btlL timtbl-cal dt2-${date}" data-itemtype="${date}"><a>${text}</a></td>`;
const table=cell('20261203','훈련')+cell('20261203','점심')+cell('20261226','훈련')+cell('20261226','훈련')+cell('20261224','점심')+cell('20270101','훈련');
assert.deepEqual(timetableDates(table,info.start,info.end),['2026-12-03','2026-12-26']);assert(scheduleResult(info,table).complete);assert(!scheduleResult({...info,totalDays:3},table).complete);assert(!scheduleResult(info,'로그인이 필요합니다').complete);
console.log('PASS: public timetable parser verifies course/round/institution, rejects lunch and duplicate sessions, includes weekends, bounds dates and withholds incomplete schedules');})().catch(e=>{console.error(e);process.exitCode=1});
