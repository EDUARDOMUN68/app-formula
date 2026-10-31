import {sessionState, formatTime, qualifyingTable, gridEntries} from './logic.js?v=1.1.0';
const $=s=>document.querySelector(s);const content=$('#content');let data,tab='calendar',standing='drivers';
const countries={'australia':['🇦🇺','Australia'],'china':['🇨🇳','China'],'japan':['🇯🇵','Japón'],'miami':['🇺🇸','Miami'],'canada':['🇨🇦','Canadá'],'monaco':['🇲🇨','Mónaco'],'barcelona-catalunya':['🇪🇸','Barcelona-Cataluña'],'austria':['🇦🇹','Austria'],'great-britain':['🇬🇧','Gran Bretaña'],'belgium':['🇧🇪','Bélgica'],'hungary':['🇭🇺','Hungría'],'netherlands':['🇳🇱','Países Bajos'],'italy':['🇮🇹','Italia'],'spain':['🇪🇸','España'],'azerbaijan':['🇦🇿','Azerbaiyán'],'bahrain':['🇧🇭','Baréin'],'singapore':['🇸🇬','Singapur'],'united-states':['🇺🇸','Estados Unidos'],'mexico':['🇲🇽','México'],'brazil':['🇧🇷','Brasil'],'las-vegas':['🇺🇸','Las Vegas'],'qatar':['🇶🇦','Catar'],'united-arab-emirates':['🇦🇪','Abu Dabi']};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=v=>new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short',timeZone:'Europe/Madrid'}).format(new Date(v));
const title=r=>(countries[r.id]??['🏁',r.id]).join(' ');
const headings={'Pos.':'Pos.','No.':'N.º','Driver':'Piloto','Team':'Equipo','Laps':'Vueltas','Time / Retired':'Tiempo / Estado','Pts.':'Puntos','Nationality':'País','Q1':'Q1','Q2':'Q2','Q3':'Q3','Time':'Tiempo','Gap':'Diferencia','Time / Gap':'Tiempo / Diferencia'};
function table(t){if(!t?.rows?.length)return '<p>Resultados pendientes de publicación oficial.</p>';return `<div class="table-wrap"><table><thead><tr>${t.headers.map(h=>`<th scope="col">${esc(headings[h]??h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${row.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function render(){if(!data)return;$('#heading').textContent=tab==='calendar'?'Calendario':'Campeonato';$('#description').textContent=tab==='calendar'?'Cada gran premio. Cada sesión. Todos los resultados.':'Los puntos cuentan. Así va la temporada.';document.querySelectorAll('nav button').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false')});if(tab==='championship'){content.innerHTML=`<div class="segmented" aria-label="Tipo de campeonato"><button data-standing="drivers" class="${standing==='drivers'?'active':''}">Pilotos</button><button data-standing="constructors" class="${standing==='constructors'?'active':''}">Constructores</button></div><div class="standings">${table(data[standing])}<a class="source" href="https://www.formula1.com/en/results/${data.season}/${standing==='drivers'?'drivers':'team'}" target="_blank" rel="noopener">Consultar fuente oficial ↗</a></div>`;return;}const now=Date.now();const next=data.races.find(r=>new Date(r.sessions.find(s=>s.id==='race-result')?.end??r.end)>now);content.innerHTML=`<div class="grid">${data.races.map(r=>{const done=r.sessions.find(s=>s.id==='race-result')?.results?.rows?.length;return `<button class="race-card ${r===next?'next':''}" data-race="${esc(r.id)}"><span class="round">RONDA ${String(r.round).padStart(2,'0')}</span>${r===next?'<span class="badge">PRÓXIMO GRAN PREMIO</span>':done?'<span class="badge done">RESULTADOS</span>':''}<h2>${esc(title(r))}</h2><p class="location">${esc(r.location)}</p>${r.trackImage?`<img class="track" src="${esc(r.trackImage)}" alt="" loading="lazy">`:''}<span class="date">⚑ ${esc(day(r.sessions[0].start))} — ${esc(day(r.sessions[r.sessions.length-1].start))}</span></button>`}).join('')}</div>`;}
const teamColors = {
  'Red Bull Racing':'#245cbd', 'Mercedes':'#007f78', 'Ferrari':'#cf233b',
  'McLaren':'#b95500', 'Aston Martin':'#006950', 'Alpine':'#2470b4',
  'Williams':'#2357c5', 'Racing Bulls':'#5764c3', 'Haas F1 Team':'#7b4149',
  'Audi':'#c52d35', 'Cadillac':'#687783'
};

function gridCar(entry) {
  const color = teamColors[entry.team] ?? '#576779';
  const car = `<svg class="grid-car-art" viewBox="0 0 72 120" aria-hidden="true"><g fill="#586572"><rect x="6" y="26" width="13" height="24" rx="4"/><rect x="53" y="26" width="13" height="24" rx="4"/><rect x="3" y="83" width="15" height="26" rx="4"/><rect x="54" y="83" width="15" height="26" rx="4"/></g><g fill="${color}"><path d="M32 7h8l5 41 11 20-5 38H21l-5-38 11-20z"/><rect x="13" y="14" width="46" height="7" rx="2"/><rect x="17" y="106" width="38" height="8" rx="2"/></g><path d="M33 26h6v28h-6zM25 85h22v5H25z" fill="#ffffff" opacity=".8"/><ellipse cx="36" cy="68" rx="9" ry="14" fill="#f5f8fa"/><path d="M28 65q8-13 16 0" fill="none" stroke="${color}" stroke-width="4"/></svg>`;
  return `<div class="grid-car" style="--team-color:${color}">${car}<div class="grid-driver"><div class="grid-position">${entry.pitLane ? 'BOXES' : entry.position === null ? '—' : `P${entry.position}`}<span>N.º ${esc(entry.number)}</span></div><strong>${esc(entry.driver)}</strong><small>${esc(entry.team)}</small></div></div>`;
}

function renderStartingGrid(session) {
  const entries = gridEntries(session.grid);
  const sprint = session.id === 'sprint-results';
  let body = '<p class="grid-pending">Parrilla pendiente de publicación oficial.</p>';
  if (entries) {
    body = `<p class="grid-caption">Orden publicado después de las penalizaciones. Esquema de dos en dos; el lado de la pole depende del circuito.</p><div class="grid-track"><div class="starting-line"><span>LÍNEA DE SALIDA ↑</span></div><ol class="starting-lanes" aria-label="Orden de salida">${entries.track.map(entry => `<li class="grid-slot ${entry.position % 2 === 0 ? 'staggered' : ''}" style="grid-row:${Math.ceil(entry.position/2)};grid-column:${entry.position%2===0?2:1}" aria-label="Posición ${entry.position}: ${esc(entry.driver)}">${gridCar(entry)}</li>`).join('')}</ol></div>`;
    if (entries.pitLane.length) body += `<section class="pit-lane"><h4>Salen desde boxes</h4><p>No ocupan una posición en la pista.</p><ul>${entries.pitLane.map(entry => `<li>${gridCar(entry)}</li>`).join('')}</ul></section>`;
    if (entries.other.length) body += `<section class="pit-lane"><h4>Sin puesto de parrilla asignado</h4><ul>${entries.other.map(entry => `<li>${gridCar(entry)}</li>`).join('')}</ul></section>`;
    if (session.grid.notes) body += `<details class="grid-notes"><summary>Notas oficiales (inglés)</summary><p>${esc(session.grid.notes)}</p></details>`;
  }
  const source = session.grid?.source ?? session.gridSource;
  if (source) body += `<a class="source" target="_blank" rel="noopener" href="${esc(source)}">Consultar parrilla oficial ↗</a>`;
  return `<details class="session starting-grid"><summary><div><h3>Parrilla de salida${sprint ? ' · Sprint' : ''}</h3><small>${sprint ? 'Sprint' : 'Carrera'} · orden oficial</small></div><span class="state">${entries ? 'Ver parrilla' : 'Pendiente'}</span></summary><div class="session-body">${body}</div></details>`;
}

function detail(id) {
  const race = data.races.find(race => race.id === id);
  if (!race) return;
  const sessions = race.sessions.map(session => {
    const state = sessionState(session);
    let body;
    if (session.results) {
      body = table(qualifyingTable(session.results, {
        season: data.season,
        sprint: session.id === 'sprint-qualifying'
      }));
      if (session.id.includes('qualifying')) {
        body += '<p class="qualifying-note">Diferencia respecto a la pole con el tiempo de la ronda alcanzada. Cada ronda se disputa en un momento distinto.</p>';
      }
    } else {
      const message = state === 'Programada'
        ? `Inicio: ${day(session.start)}, a las ${formatTime(session.start)} h (España peninsular).`
        : `${state}.`;
      body = `<p>${esc(message)}</p>`;
    }
    const grid = ['race-result', 'sprint-results'].includes(session.id) ? renderStartingGrid(session) : '';
    return `${grid}<details class="session"><summary><div><h3>${esc(session.name)}</h3><small>${esc(day(session.start))} · ${esc(formatTime(session.start))} h</small></div><span class="state">${esc(state)}</span></summary><div class="session-body">${body}<a class="source" target="_blank" rel="noopener" href="${esc(session.source)}">Consultar fuente oficial ↗</a></div></details>`;
  }).join('');
  content.innerHTML = `<button class="back" id="back">← Volver al calendario</button><div class="detail-head"><p class="eyebrow">RONDA ${race.round}</p><h2>${esc(title(race))}</h2><p>${esc(race.name)}</p></div>${sessions}`;
  window.scrollTo({top: 0, behavior: 'smooth'});
}
async function load(){const b=$('#refresh');b.disabled=true;try{const response=await fetch(`data/season.json?t=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw Error('Datos no disponibles');const incoming=await response.json();if(!incoming.races?.length)throw Error('Calendario incompleto');data=incoming;try{localStorage.setItem('formula-cache',JSON.stringify(data))}catch{}$('#updated').textContent=`Datos: ${day(data.updatedAt)} · ${formatTime(data.updatedAt)} h`;$('#season').textContent=data.season;render();}catch(error){if(!data){try{data=JSON.parse(localStorage.getItem('formula-cache'))}catch{}}if(data){$('#season').textContent=data.season;render();$('#updated').textContent=`Sin conexión · copia del ${day(data.updatedAt)} ${formatTime(data.updatedAt)} h`;}else{content.innerHTML='<div class="empty">No se han podido cargar los datos oficiales. Pulsa Actualizar para volver a intentarlo.</div>';$('#updated').textContent='Datos no disponibles';}}finally{b.disabled=false;}}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.tab){tab=b.dataset.tab;render()}if(b.dataset.race)detail(b.dataset.race);if(b.dataset.standing){standing=b.dataset.standing;render()}if(b.id==='back')render();if(b.id==='refresh')load();});load();if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
