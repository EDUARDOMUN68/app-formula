"""Importa exclusivamente calendario y tablas publicados por formula1.com."""
import concurrent.futures
import datetime as dt
import html
import json
import os
from pathlib import Path
import re
import urllib.request
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
