import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatTime,sessionState} from '../logic.js';
test('hora peninsular cambia con verano/invierno y cruza medianoche',()=>{
  assert.equal(formatTime('2026-10-11T12:00:00Z'),'14:00');
  assert.equal(formatTime('2026-12-06T13:00:00Z'),'14:00');
  assert.equal(formatTime('2026-11-22T23:30:00Z'),'00:30');
});
test('resultados de sprint disponibles mientras la carrera está pendiente',()=>{
  const now=Date.parse('2026-10-11T10:00:00Z');
  const sprint={start:'2026-10-10T09:00:00Z',end:'2026-10-10T09:30:00Z',results:{rows:[['1','Piloto']]}};
  const race={start:'2026-10-11T12:00:00Z',end:'2026-10-11T14:00:00Z',results:null};
  assert.equal(sessionState(sprint,now),'Resultados disponibles');
  assert.equal(sessionState(race,now),'Programada');
  assert.equal(sessionState(race,Date.parse('2026-10-11T13:00:00Z')),'Pendiente de finalizar');
  assert.equal(sessionState(race,Date.parse('2026-10-11T15:00:00Z')),'Resultados pendientes de publicación');
});
