#!/usr/bin/env python2.5

from bottle import route, send_file, request, response, json_dumps, run

from BeautifulSoup import BeautifulSoup

import os.path
import sqlite3 as db
import urllib

ROOT_PATH = os.path.dirname(os.path.abspath(__file__))
STATIC_PATH = os.path.join(ROOT_PATH, 'static')

DB_FILE = os.path.join(ROOT_PATH, 'buses.db')

def with_db_cursor(fn):
    def _decorated(*arg, **kw):
        conn = db.connect(DB_FILE)
        try:
            cursor = conn.cursor()
            return fn(cursor, *arg, **kw)
        finally:
            conn.close()
    return _decorated

def escape_glob(glob):
    import re
    return re.sub(r'([\\\[\]?*])', r'\\\1', glob)

def get_stops(cursor, q):
    sql = 'select id, name from stop_name'
    sql_params = []
    clauses = []
    
    if q:
        clauses.append('name glob ?')
        esq = '%s*' % escape_glob(q)
        sql_params.extend((esq,))
    
    if clauses:
        sql += (' where %s' % (' and '.join(clauses)))
    
    sql += ' order by name asc limit 30'
    
    stops = cursor.execute(sql, sql_params)
    for (id, name) in stops:
        yield { 'id': id, 'name': name }

@with_db_cursor
def does_stop_exist(cursor, stop):
    sql = 'select name from stop where name = ?'
    return cursor.execute(sql, (stop,)).fetchone() is not None

@route('/dyn/times/:stop')
def times(stop):
    if not does_stop_exist(stop):
        return { 'error': 'Unknown stop' }
    
    qs = urllib.urlencode({'stName': stop,
                           'allLines': 'y',
                           'nRows': '6',
                           'olifServerId': '182',
                           'autorefresh': '20'})
    html = urllib.urlopen('http://buses.citytransport.org.uk/smartinfo/service/jsp/?', qs)
    soup = BeautifulSoup(html,convertEntities=BeautifulSoup.HTML_ENTITIES)
    times = []#[dict(route='7', destination='Marina', departure='1 min')]
    table = soup.find('table', bgcolor='black')
    
    for row in table.findAll('tr'):
        spans = list(row.findAll('span', {'class': 'dfifahrten'}))
        if len(spans) == 3:
            spans = [t.string for t in spans]
            times.append(dict(route=spans[0],
                              destination=spans[1],
                              departure = spans[2]))
    
    return { 'name': stop, 'times': times }

@route('/dyn/search')
@with_db_cursor
def search(cursor):
    q = request.GET.get('q', None)
    response.content_type = 'application/json'
    return json_dumps(list(get_stops(cursor, q)))
    

@route('/buses.manifest')
def static_files():
    send_file('buses.manifest', root=STATIC_PATH, mimetype='text/cache-manifest')

@route('/')
@route('/(?P<filename>.*)')
def static_files(filename='index.html'):
    send_file(filename, root=STATIC_PATH)

if __name__ == '__main__':
    run()