import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reminders,dueForDevice} from './core.mjs';
const start=Date.parse('2026-11-08T17:00:00Z');
const feed={season:2026,races:[{id:'brazil',location:'São Paulo',sessions:[{id:'practice/1',name:'Libres 1',start:new Date(start).toISOString()},{id:'qualifying',name:'Clasificación',start:'invalid'},{id:'sprint-results',start:new Date(start).toISOString(),results:{rows:[['1']]}}]}]};
test('diez minutos antes para cada sesión válida y horario peninsular',()=>{
 const [notice]=reminders(feed);assert.equal(reminders(feed).length,1);assert.equal(notice.due,start-600000);assert.match(notice.body,/18:00/);assert.equal(new URL(notice.url).searchParams.get('race'),'brazil');
});
test('no adelantar, duplicar, enviar tarde ni reproducir el pasado al activar',()=>{
 const [n]=reminders(feed),device={createdAt:n.due-1,sent:{}};
 assert.equal(dueForDevice(n,device,n.due-1),false);assert.equal(dueForDevice(n,device,n.due),true);
 assert.equal(dueForDevice(n,device,n.due+90000),false);assert.equal(dueForDevice(n,{...device,createdAt:n.due+1},n.due+1),false);
 assert.equal(dueForDevice(n,{...device,sent:{[n.eventId]:n.due}},n.due+1),false);
});
test('un cambio oficial de horario crea una programación distinta',()=>{
 const [old]=reminders(feed);const updated=structuredClone(feed);updated.races[0].sessions[0].start=new Date(start+3600000).toISOString();const [next]=reminders(updated);assert.notEqual(next.eventId,old.eventId);assert.equal(next.due,old.due+3600000);
});
