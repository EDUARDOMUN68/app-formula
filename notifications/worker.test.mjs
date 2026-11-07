import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker,{SessionNotices} from './worker.mjs';
import {APP_URL} from './core.mjs';
test('configuración sin claves no se presenta como servicio activado',async()=>{
 const r=await worker.fetch(new Request('https://worker/config',{headers:{Origin:new URL(APP_URL).origin}}),{});assert.equal((await r.json()).ready,false);
 const blocked=await worker.fetch(new Request('https://worker/config',{headers:{Origin:'https://other.test'}}),{});assert.equal(blocked.status,403);
});
function storageFor(entries){const map=new Map(entries);return {map,get:async k=>map.get(k),put:async(k,v)=>map.set(k,structuredClone(v)),delete:async k=>map.delete(k),list:async({prefix})=>new Map([...map].filter(([k])=>k.startsWith(prefix))),setAlarm:async date=>map.set('alarm',date),deleteAlarm:async()=>map.delete('alarm')};}
test('alarma entrega una vez al dispositivo activo y elimina suscripciones caducadas',async()=>{
 const now=Date.now(),notice={eventId:'2026:brazil:race',due:now-100,expiresAt:now+599900};
 const store=storageFor([['schedule',{updated:now,events:[notice]}],['sub:ok',{subscription:{endpoint:'ok'},createdAt:now-10000,sent:{}}],['sub:gone',{subscription:{endpoint:'gone'},createdAt:now-10000,sent:{}}]]);
 const service=new SessionNotices({storage:store},{});let calls=0;service.deliver=async sub=>{calls++;return new Response(null,{status:sub.endpoint==='gone'?410:201});};
 await service.alarm();assert.equal(calls,2);assert.equal(store.map.has('sub:gone'),false);assert.ok((await store.get('sub:ok')).sent[notice.eventId]);await service.alarm();assert.equal(calls,2);
});
test('no enviar horarios con fuente de más de seis horas',async()=>{
 const now=Date.now(),store=storageFor([['schedule',{updated:now-7*3600000,events:[{eventId:'old',due:now-1,expiresAt:now+600000}]}],['sub:a',{createdAt:now-1000,sent:{}}]]);
 const service=new SessionNotices({storage:store},{});service.deliver=async()=>{throw Error('No debe enviar');};await service.alarm();assert.equal(store.map.has('alarm'),false);
});
