'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const outer=fs.readFileSync('index.html','utf8'),pages=JSON.parse(outer.match(/const PAGES = (.*?);\n/s)[1]),page=Buffer.from(pages.find(p=>p.id==='p29').b64,'base64').toString('utf8');
for(const m of page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
const script=page.slice(page.indexOf("const SETTINGS_KEY="),page.indexOf("$('groupSelect').addEventListener"));
const context={document:{getElementById(){return {value:''}}},raw:{},settings:{center:'좋은일자리 북부센터',counselor:'조원희',phone:'052-913-3500',place:'울산광역시 북구 송내4길 14,2층',work24:'https://www.work24.go.kr',handbook:'https://example.com/handbook'}};
vm.createContext(context);vm.runInContext(script+"\nreadCurrentInputs=()=>raw;getSettings=()=>settings;globalThis.items=scenarios;globalThis.render=(id)=>{current=scenarios.find(x=>x.id===id);return makeText(getTemplate(current),collectValues())};",context);
context.raw={name:'홍길동',date:'2026-10-27',time:'13:00',due:'2026-10-30',type:'2유형',documents:'가족관계증명서',tests:['직업선호도검사 S형'],company:'예시회사',start:'2026-10-20',employmentType:'정규직·계약직',reason:'상담 일정 확인',custom:'내일까지 서류 보내달라고',choiceWorkType:'고용보험 취득 단시간근로(주 30시간 미만)',workHours:'주 20시간',exitOptions:[]};
assert.equal(context.items.length,22);
for(const item of context.items){const text=context.render(item.id);assert(!/\{[^}]+\}|\[\[|\]\]/.test(text),item.id+' unresolved placeholders');assert(text.startsWith('안녕하세요, 홍길동님.\n좋은일자리 북부센터 상담사 조원희입니다.'));assert.equal(text.split('문의 전화 052-913-3500').length,2,item.id+' one phone footer');assert.equal(text.split('상담사 조원희').length,2,item.id+' no repeated counselor');assert.equal(text.includes('송내4길'),['apply','initial'].includes(item.id),item.id+' address scope');assert(!text.includes('고용노동부 국민취업지원제도 상담을 담당'));assert(text.length<650,item.id+' concise');}
const initial=context.render('initial');assert(initial.includes('10월 27일(화) 오후 1:00'));assert(initial.includes('⏰ 약 30분~1시간'));assert(!/학력|경력자료|희망직무|취업지원 방향/.test(initial));
assert(!context.render('handbook').includes('지정일'));context.raw.type='1유형';assert(context.render('handbook').includes('지정일'));
let allowance=context.render('allowance');for(const term of ['소득 신고','저장만 하면 제출되지 않습니다','제출예약','지정일'])assert(allowance.includes(term),term);
assert(context.render('psych').includes('PC·휴대전화'));context.raw.tests=['직업선호도검사 L형'];assert(context.render('psych').includes('휴대전화 불가'));
context.raw.place2='학교 상담실';assert(context.render('appointment').includes('학교 상담실'));assert(!context.render('appointment').includes('송내4길'));
context.raw.exitOptions=['successTarget'];assert(context.render('incomplete_employment_exit').includes('취업성공수당 대상이 되지 않습니다'));
assert(page.includes("kakao_memo_templates_v7_compact"),'updated defaults bypass legacy long saved templates');assert(page.includes("kakao_simple_settings_v2"),'fixed settings kept');
console.log('PASS: all 22 compact Kakao scenarios, address scope, single signature/phone, type-specific notice, required submission steps, device guide, changed venue and saved-settings compatibility');
