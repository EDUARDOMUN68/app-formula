"""Importa exclusivamente calendario y tablas publicados por formula1.com."""
import concurrent.futures
import datetime as dt
import html
import json
import os
from pathlib import Path
import re
import urllib.request
import urllib.error
import unicodedata
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://www.formula1.com'
YEAR = int(os.environ.get('F1_SEASON', dt.datetime.now(dt.timezone.utc).year))
LABELS = {'Practice 1':'Libres 1','Practice 2':'Libres 2','Practice 3':'Libres 3','Sprint Qualifying':'Clasificación sprint','Sprint':'Sprint','Qualifying':'Clasificación','Race':'Carrera'}
SLUGS = {'Practice 1':'practice/1','Practice 2':'practice/2','Practice 3':'practice/3','Sprint Qualifying':'sprint-qualifying','Sprint':'sprint-results','Qualifying':'qualifying','Race':'race-result'}

def fetch(path):
    req = urllib.request.Request(BASE+path, headers={'User-Agent':'Mozilla/5.0 APPFormula/1.0'})
    with urllib.request.urlopen(req, timeout=45) as response:
        return response.read().decode('utf-8')

class Table(HTMLParser):
    def __init__(self):
        super().__init__(); self.rows=[]; self.row=None; self.cell=None; self.skip=0
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag=='tr': self.row=[]
        if tag in ('td','th'): self.cell=[]
        if tag=='span' and 'md:hidden' in attrs.get('class','').split(): self.skip+=1
        elif self.skip: self.skip+=1
    def handle_endtag(self, tag):
        if self.skip: self.skip-=1; return
        if tag in ('td','th') and self.cell is not None:
            self.row.append(' '.join(''.join(self.cell).split())); self.cell=None
        if tag=='tr' and self.row:
            self.rows.append(self.row); self.row=None
    def handle_data(self, data):
        if self.cell is not None and not self.skip: self.cell.append(data.replace('\xa0',' '))

def table(source):
    match=re.search(r'<table\b.*?</table>',source,re.S)
    if not match: return None
    parser=Table(); parser.feed(match.group())
    if len(parser.rows)<2: return None
    return {'headers':parser.rows[0], 'rows':parser.rows[1:]}

def starting_grid(source):
    """Conservar el orden oficial y leer las salidas desde boxes en sus notas."""
    result = table(source)
    required = ['Pos.', 'No.', 'Driver', 'Team']
    if not result or any(name not in result['headers'] for name in required):
        return None
    if any(len(row) != len(result['headers']) for row in result['rows']):
        return None
    indices = {name: result['headers'].index(name) for name in required}
    if not all(row[indices['No.']].isdigit() for row in result['rows']):
        return None
    tail = source.partition('</table>')[2].partition('</main>')[0]
    text = ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', tail)).split())
    note = re.search(r'Note\s*[-–]\s*(.*)', text)
    notes = note.group(1) if note else ''
    def normalize(value):
        return ''.join(c for c in unicodedata.normalize('NFKD', value.casefold()) if not unicodedata.combining(c))
    pit_subjects = re.findall(r'(?:^|[.!?])\s*([^.!?]+?)\s+(?:(?:is|are)\s+)?required to start from (?:the )?pit lane', notes, re.I)
    sentences = [sentence.strip() for sentence in re.split(r'[.!?]', notes) if sentence.strip()]
    for previous, current in zip(sentences, sentences[1:]):
        if re.match(r'Required to start from (?:the )?pit lane\b', current, re.I):
            # Algunas notas continúan con una segunda frase sin repetir el apellido.
            mentioned = [row for row in result['rows'] if re.search(r'\b'+re.escape(normalize(row[indices['Driver']].split()[-1]))+r'\b', normalize(previous))]
            if len(mentioned) == 1:
                pit_subjects.append(mentioned[0][indices['Driver']])
    pit_numbers = []
    for row in result['rows']:
        surname = normalize(row[indices['Driver']].split()[-1])
        explicit = normalize(row[indices['Pos.']]) in ('pl', 'pit', 'pit lane')
        if explicit or any(re.search(r'\b'+re.escape(surname)+r'\b', normalize(subject)) for subject in pit_subjects):
            pit_numbers.append(row[indices['No.']])
    return {'results': result, 'pitLaneNumbers': pit_numbers, 'notes': notes, 'schemaVersion': 1}

def schema(source):
    for raw in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',source,re.S):
        value=json.loads(html.unescape(raw))
        if isinstance(value,dict) and value.get('subEvent'): return value
    raise ValueError('No se encontró el calendario de sesiones oficial')

def main():
    now=dt.datetime.now(dt.timezone.utc)
    previous={}
    target=ROOT/'data'/'season.json'
    if target.exists():
        previous=json.loads(target.read_text(encoding='utf8'))
    old={race['id']:race for race in previous.get('races',[]) if previous.get('season')==YEAR}
    calendar=fetch(f'/en/racing/{YEAR}')
    result_index=fetch(f'/en/results/{YEAR}/races')
    result_paths=dict((slug,path.rsplit('/',1)[0]) for path,slug in re.findall(r'href="(/en/results/\d+/races/\d+/([^/"?]+)/race-result)"',result_index))
    paths=list(dict.fromkeys(re.findall(r'href="(/en/racing/'+str(YEAR)+r'/[^"?#]+)"',calendar)))
    paths=[p for p in paths if 'testing' not in p]
    def race_data(path):
        source=fetch(path); info=schema(source); slug=path.rsplit('/',1)[-1]
        result_slug='abu-dhabi' if slug=='united-arab-emirates' else slug
        prefix=result_paths.get(result_slug)
        if not prefix: raise ValueError('Falta identificador oficial de resultados: '+slug)
        sessions=[]
        for event in info['subEvent']:
            name=event['name'].split(' - ')[0]
            if name not in LABELS: continue
            old_session=next((s for s in old.get(slug,{}).get('sessions',[]) if s['id']==SLUGS[name]),{})
            results=old_session.get('results')
            end=dt.datetime.fromisoformat(event['endDate'].replace('Z','+00:00'))
            url=prefix+'/'+SLUGS[name]
            # Volver a comprobar las sesiones recientes para recoger correcciones oficiales.
            if end<=now and (not results or now-end<dt.timedelta(days=7)):
                results=table(fetch(url))
            sessions.append({'id':SLUGS[name],'name':LABELS[name],'start':event['startDate'],'end':event['endDate'],'results':results,'source':BASE+url})
        if not sessions: raise ValueError('Sin sesiones: '+slug)
        for session in sessions:
            if session['id'] not in ('race-result', 'sprint-results'):
                continue
            qualifying_id = 'qualifying' if session['id'] == 'race-result' else 'sprint-qualifying'
            qualifying = next((s for s in sessions if s['id'] == qualifying_id), None)
            grid_path = prefix + ('/starting-grid' if session['id'] == 'race-result' else '/sprint-grid')
            old_session = next((s for s in old.get(slug, {}).get('sessions', []) if s['id'] == session['id']), {})
            grid = old_session.get('grid')
            end = dt.datetime.fromisoformat(session['end'].replace('Z', '+00:00'))
            if qualifying and dt.datetime.fromisoformat(qualifying['start'].replace('Z', '+00:00')) <= now and (not grid or grid.get('schemaVersion') != 1 or now-end < dt.timedelta(days=7)):
                try:
                    grid = starting_grid(fetch(grid_path))
                except urllib.error.HTTPError as error:
                    if error.code != 404:
                        raise
                    grid = None
            session['grid'] = {**grid, 'source': BASE+grid_path} if grid else None
            session['gridSource'] = BASE+grid_path
        track=re.search(r'<img[^>]+src="([^"]+/track/[^" ]+)"', source)
        return {'id':slug,'name':info['name'],'location':info.get('location',{}).get('name',''),'trackImage':html.unescape(track.group(1)) if track else None,'start':info['startDate'],'end':info['endDate'],'source':BASE+path,'sessions':sessions}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        races=list(pool.map(race_data,paths))
    races.sort(key=lambda r:r['start'])
    for i,race in enumerate(races,1): race['round']=i
    drivers=table(fetch(f'/en/results/{YEAR}/drivers'))
    constructors=table(fetch(f'/en/results/{YEAR}/team'))
    if len(races)<15 or not drivers or not constructors: raise ValueError('Datos incompletos; se conserva el archivo anterior')
    payload={'season':YEAR,'updatedAt':now.isoformat(),'source':BASE,'races':races,'drivers':drivers,'constructors':constructors}
    target.parent.mkdir(exist_ok=True)
    temporary=target.with_suffix('.tmp'); temporary.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf8'); temporary.replace(target)
    print(f'{YEAR}: {len(races)} grandes premios, {sum(bool(s["results"]) for r in races for s in r["sessions"])} sesiones con resultados, {len(drivers["rows"])} pilotos, {len(constructors["rows"])} constructores')

if __name__=='__main__': main()
