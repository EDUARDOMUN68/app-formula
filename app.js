import {sessionState, formatTime, qualifyingTable} from './logic.js?v=1.0.1';
const $=s=>document.querySelector(s);const content=$('#content');let data,tab='calendar',standing='drivers';
const countries={'australia':['🇦🇺','Australia'],'china':['🇨🇳','China'],'japan':['🇯🇵','Japón'],'miami':['🇺🇸','Miami'],'canada':['🇨🇦','Canadá'],'monaco':['🇲🇨','Mónaco'],'barcelona-catalunya':['🇪🇸','Barcelona-Cataluña'],'austria':['🇦🇹','Austria'],'great-britain':['🇬🇧','Gran Bretaña'],'belgium':['🇧🇪','Bélgica'],'hungary':['🇭🇺','Hungría'],'netherlands':['🇳🇱','Países Bajos'],'italy':['🇮🇹','Italia'],'spain':['🇪🇸','España'],'azerbaijan':['🇦🇿','Azerbaiyán'],'bahrain':['🇧🇭','Baréin'],'singapore':['🇸🇬','Singapur'],'united-states':['🇺🇸','Estados Unidos'],'mexico':['🇲🇽','México'],'brazil':['🇧🇷','Brasil'],'las-vegas':['🇺🇸','Las Vegas'],'qatar':['🇶🇦','Catar'],'united-arab-emirates':['🇦🇪','Abu Dabi']};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=v=>new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short',timeZone:'Europe/Madrid'}).format(new Date(v));
const title=r=>(countries[r.id]??['🏁',r.id]).join(' ');
const headings={'Pos.':'Pos.','No.':'N.º','Driver':'Piloto','Team':'Equipo','Laps':'Vueltas','Time / Retired':'Tiempo / Estado','Pts.':'Puntos','Nationality':'País','Q1':'Q1','Q2':'Q2','Q3':'Q3','Time':'Tiempo','Gap':'Diferencia','Time / Gap':'Tiempo / Diferencia'};
function table(t){if(!t?.rows?.length)return '<p>Resultados pendientes de publicación oficial.</p>';return `<div class="table-wrap"><table><thead><tr>${t.headers.map(h=>`<th scope="col">${esc(headings[h]??h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${row.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function render(){if(!data)return;$('#heading').textContent=tab==='calendar'?'Calendario':'Campeonato';$('#description').textContent=tab==='calendar'?'Cada gran premio. Cada sesión. Todos los resultados.':'Los puntos cuentan. Así va la temporada.';document.querySelectorAll('nav button').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false')});if(tab==='championship'){content.innerHTML=`<div class="segmented" aria-label="Tipo de campeonato"><button data-standing="drivers" class="${standing==='drivers'?'active':''}">Pilotos</button><button data-standing="constructors" class="${standing==='constructors'?'active':''}">Constructores</button></div><div class="standings">${table(data[standing])}<a class="source" href="https://www.formula1.com/en/results/${data.season}/${standing==='drivers'?'drivers':'team'}" target="_blank" rel="noopener">Consultar fuente oficial ↗</a></div>`;return;}const now=Date.now();const next=data.races.find(r=>new Date(r.sessions.find(s=>s.id==='race-result')?.end??r.end)>now);content.innerHTML=`<div class="grid">${data.races.map(r=>{const done=r.sessions.find(s=>s.id==='race-result')?.results?.rows?.length;return `<button class="race-card ${r===next?'next':''}" data-race="${esc(r.id)}"><span class="round">RONDA ${String(r.round).padStart(2,'0')}</span>${r===next?'<span class="badge">PRÓXIMO GRAN PREMIO</span>':done?'<span class="badge done">RESULTADOS</span>':''}<h2>${esc(title(r))}</h2><p class="location">${esc(r.location)}</p>${r.trackImage?`<img class="track" src="${esc(r.trackImage)}" alt="" loading="lazy">`:''}<span class="date">⚑ ${esc(day(r.sessions[0].start))} — ${esc(day(r.sessions[r.sessions.length-1].start))}</span></button>`}).join('')}</div>`;}
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
    return `<details class="session"><summary><div><h3>${esc(session.name)}</h3><small>${esc(day(session.start))} · ${esc(formatTime(session.start))} h</small></div><span class="state">${esc(state)}</span></summary><div class="session-body">${body}<a class="source" target="_blank" rel="noopener" href="${esc(session.source)}">Consultar fuente oficial ↗</a></div></details>`;
  }).join('');
  content.innerHTML = `<button class="back" id="back">← Volver al calendario</button><div class="detail-head"><p class="eyebrow">RONDA ${race.round}</p><h2>${esc(title(race))}</h2><p>${esc(race.name)}</p></div>${sessions}`;
  window.scrollTo({top: 0, behavior: 'smooth'});
}
async function load(){const b=$('#refresh');b.disabled=true;try{const response=await fetch(`data/season.json?t=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw Error('Datos no disponibles');const incoming=await response.json();if(!incoming.races?.length)throw Error('Calendario incompleto');data=incoming;try{localStorage.setItem('formula-cache',JSON.stringify(data))}catch{}$('#updated').textContent=`Datos: ${day(data.updatedAt)} · ${formatTime(data.updatedAt)} h`;$('#season').textContent=data.season;render();}catch(error){if(!data){try{data=JSON.parse(localStorage.getItem('formula-cache'))}catch{}}if(data){$('#season').textContent=data.season;render();$('#updated').textContent=`Sin conexión · copia del ${day(data.updatedAt)} ${formatTime(data.updatedAt)} h`;}else{content.innerHTML='<div class="empty">No se han podido cargar los datos oficiales. Pulsa Actualizar para volver a intentarlo.</div>';$('#updated').textContent='Datos no disponibles';}}finally{b.disabled=false;}}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.tab){tab=b.dataset.tab;render()}if(b.dataset.race)detail(b.dataset.race);if(b.dataset.standing){standing=b.dataset.standing;render()}if(b.id==='back')render();if(b.id==='refresh')load();});load();if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
