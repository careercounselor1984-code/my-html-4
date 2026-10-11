'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
console.log('SIZE',html.length,'lines',html.split('\n').length);
for(const name of ['script','style','body','head','html','iframe','main']){
 const open=[...html.matchAll(new RegExp('<'+name+'\\b','gi'))].map(x=>x.index);
 const close=[...html.matchAll(new RegExp('</'+name+'\\s*>','gi'))].map(x=>x.index);
 console.log('TAG',name,'opening',open.length,'closing',close.length,'first_open',open.slice(0,4),'first_close',close.slice(0,4),'last_close',close.slice(-2));
}
let scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
console.log('SCRIPTS',scripts.length);
scripts.forEach((m,i)=>{
 const code=m[2];
 try{new vm.Script(code,{filename:'inline-'+i});console.log('VALID_JS',i,code.length)}
 catch(e){ console.log('INVALID_JS',i,e.message,'code_end',code.slice(-200)); }
});
let clues=['로그인 모듈을 불러오지 못했습니다','상담사 전용 로그인입니다','로그인 화면으로 돌아가기','초기상담(Ⅰ유형)','PIN 설정','login-shell','loginOverlay','loginModal','</style','document.write','innerHTML'];
for(let term of clues){
 const hits=[];let at=-1;
 while((at=html.indexOf(term,at+1))!==-1&&hits.length<6) hits.push(at);
 console.log('HIT',term,hits);
 if(hits.length)for(const pos of hits.slice(0,2)){let s=html.slice(Math.max(0,pos-250),Math.min(html.length,pos+350)).replace(/https?:\/\/[^"'\s<>]+/g,'[URL]').replace(/[a-zA-Z0-9_\-.]+@[a-zA-Z0-9_.-]+/g,'[EMAIL]');console.log('CONTEXT',term,JSON.stringify(s));}
}
for(const [i,tag] of [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].entries()){
 console.log('STYLE',i,'length',tag[1].length,'end',tag.index+tag[0].length);
}
console.log('HTML_TAIL',JSON.stringify(html.slice(-700).replace(/https?:\/\/[^"'\s<>]+/g,'[URL]')));
