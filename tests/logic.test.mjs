import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatTime,sessionState,qualifyingTable} from '../logic.js';
test('hora peninsular cambia con verano/invierno y cruza medianoche',()=>{
  assert.equal(formatTime('2026-10-11T12:00:00Z'),'14:00');
  assert.equal(formatTime('2026-12-06T13:00:00Z'),'14:00');
  assert.equal(formatTime('2026-11-22T23:30:00Z'),'00:30');
});

test('clasificación compacta compara la última ronda con la pole con precisión de milisegundos',()=>{
  const source={headers:['Pos.','Driver','Team','Q1','Q2','Q3'],rows:[
    ['1','Pole','A','1:33.241','1:31.639','1:31.373'],
    ['2','Segundo','B','1:32.774','1:31.953','1:31.427'],
    ['11','Eliminado Q2','C','1:34.000','1:32.000',''],
    ['17','Eliminado Q1','D','1:35.123','',''],
    ['10','Q3 sin tiempo','E','1:33.000','1:32.000',''],
    ['RT','Sin vuelta','F','','','']
  ]};
  const result=qualifyingTable(source);
  assert.deepEqual(result.headers,['Pos.','Driver','Team','Ronda','Dif. pole']);
  assert.deepEqual(result.rows.map(row=>row.slice(3)),[
    ['Q3','0,000 s'],['Q3','+0,054 s'],['Q2','+0,627 s'],['Q1','+3,750 s'],['Q3','Sin tiempo'],['—','Sin tiempo']
  ]);
  assert.equal(source.headers.includes('Q1'),true);
  assert.equal(qualifyingTable(source,{sprint:true}).rows[2][3],'SQ2');
});

test('no inventar diferencia sin pole y no alterar campeonatos',()=>{
  const standings={headers:['Pos.','Driver','Pts.'],rows:[['1','Piloto','100']]};
  assert.equal(qualifyingTable(standings),standings);
  const source={headers:['Pos.','Driver','Team','Q1','Q2','Q3'],rows:[['2','Piloto','Equipo','','','1:30.000']]};
  assert.equal(qualifyingTable(source).rows[0][4],'Pole no disponible');
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
