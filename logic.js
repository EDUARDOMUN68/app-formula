export function formatTime(value){return new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Europe/Madrid'}).format(new Date(value));}
export function sessionState(session,now=Date.now()){if(session.results?.rows?.length)return 'Resultados disponibles';if(now<new Date(session.start).getTime())return 'Programada';if(now<new Date(session.end).getTime())return 'Pendiente de finalizar';return 'Resultados pendientes de publicación';}

export function gridEntries(grid) {
  if (!grid?.results?.rows?.length) return null;
  const headers = grid.results.headers;
  const fields = ['Pos.', 'No.', 'Driver', 'Team'].map(name => headers.indexOf(name));
  if (fields.some(index => index < 0)) return null;
  const entries = grid.results.rows.map(row => ({
    position: /^\d+$/.test(row[fields[0]]) ? Number(row[fields[0]]) : null,
    number: row[fields[1]], driver: row[fields[2]], team: row[fields[3]],
    pitLane: (grid.pitLaneNumbers ?? []).includes(row[fields[1]])
  }));
  // Ordenar por el puesto publicado, conservando los huecos de la parrilla.
  const track = entries.filter(entry => !entry.pitLane && entry.position !== null).sort((a,b) => a.position-b.position);
  const pitLane = entries.filter(entry => entry.pitLane);
  const other = entries.filter(entry => !entry.pitLane && entry.position === null);
  return {track, pitLane, other};
}

function lapMilliseconds(value) {
  const match = /^(\d+):(\d{2})\.(\d{3})$/.exec(String(value ?? '').trim());
  if (!match || Number(match[2]) >= 60) return null;
  return (Number(match[1]) * 60 + Number(match[2])) * 1000 + Number(match[3]);
}

export function qualifyingTable(source, {season = 2026, sprint = false} = {}) {
  if (!source?.rows?.length) return source;
  const rounds = ['Q1', 'Q2', 'Q3'].map(name => source.headers.indexOf(name));
  if (rounds.some(index => index < 0)) return source;
  const positionIndex = source.headers.indexOf('Pos.');
  const driverIndex = source.headers.indexOf('Driver');
  const teamIndex = source.headers.indexOf('Team');
  const times = row => rounds.map(index => lapMilliseconds(row[index]));
  const poleRow = source.rows.find(row => String(row[positionIndex]) === '1');
  const poleTimes = poleRow ? times(poleRow) : [];
  const pole = [...poleTimes].reverse().find(time => time !== null) ?? null;
  return {
    headers: ['Pos.', 'Driver', 'Team', 'Ronda', 'Dif. pole'],
    rows: source.rows.map(row => {
      const laps = times(row);
      const position = /^\d+$/.test(String(row[positionIndex])) ? Number(row[positionIndex]) : null;
      let stage = laps[2] !== null ? 2 : laps[1] !== null ? 1 : laps[0] !== null ? 0 : null;
      // La clasificación oficial 2026 asigna Q3 a los puestos 1–10 y Q2 a 11–16,
      // incluso cuando un participante no registra un tiempo en esa ronda.
      if (season === 2026 && position !== null) {
        stage = position <= 10 ? 2 : position <= 16 ? 1 : 0;
      }
      const lastTime = stage === null ? null : laps[stage];
      let gap = 'Sin tiempo';
      if (lastTime !== null && pole !== null) {
        const delta = lastTime - pole;
        gap = `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${(Math.abs(delta) / 1000).toFixed(3).replace('.', ',')} s`;
      } else if (lastTime !== null) {
        gap = 'Pole no disponible';
      }
      return [row[positionIndex], row[driverIndex], row[teamIndex], stage === null ? '—' : `${sprint ? 'SQ' : 'Q'}${stage + 1}`, gap];
    })
  };
}
