const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('receptor sin ventana: deduplicación, caducidad, aislamiento y recuperación de fallo',async()=>{
 const handlers={},shown=[],seen=new Set();let fail=false;
 const scope='https://eduardomun68.github.io/app-formula/';
 const context={URL,Date,Number,Promise,self:{registration:{scope,showNotification:async(title,options)=>{if(fail)throw Error('display');shown.push({title,options});}},addEventListener:(n,f)=>handlers[n]=f}};
 vm.runInNewContext(fs.readFileSync('push-receiver.js','utf8'),context);
 context.rememberPush=async key=>{if(seen.has(key))return false;seen.add(key);return true;};context.pushRecord=async(key,value)=>{if(value===null)seen.delete(key);};
 async function push(notice){let task;handlers.push({data:{json:()=>notice},waitUntil:p=>task=p});await task;}
 const n={kind:'formula-session',eventId:'2026:brazil:qualifying',url:scope+'?race=brazil',title:'Clasificación',body:'Dentro de diez minutos',expiresAt:Date.now()+60000};
 await push(n);await push(n);assert.equal(shown.length,1);assert.match(shown[0].options.icon,/app-formula\/icon-192.png$/);
 await push({...n,eventId:'expired',expiresAt:Date.now()-1});await push({...n,eventId:'other-app',url:'https://eduardomun68.github.io/madridista-app/'});assert.equal(shown.length,1);
 fail=true;await assert.rejects(push({...n,eventId:'retry'}));fail=false;await push({...n,eventId:'retry'});assert.equal(shown.length,2);
});
