#!/usr/bin/env python2.5

from bottle import route, send_file, request, response, json_dumps, run

from BeautifulSoup import BeautifulSoup

import os.path
import sqlite3 as db
import urllib
import re
import math

ROOT_PATH = os.path.dirname(os.path.abspath(__file__))
STATIC_PATH = os.path.join(ROOT_PATH, 'static')

DB_FILE = os.path.join(ROOT_PATH, 'buses.db')

def haversine(lat1, lng1, lat2, lng2):
    print lat1, lng1, lat2, lng2
    return 0
#    (6371 * acos(cos(radians(38.7666667))
#          * cos(radians(stop.lat))
#          * cos(radians(stop.lng) - radians(-3.3833333))
#          + sin(radians(38.7666667))
#          * sin(radians(stop.lat))))

def with_db_cursor(fn):
    def _decorated(*arg, **kw):
        conn = db.connect(DB_FILE)
        
        conn.create_function('haversine', 4, haversine)
        try:
            cursor = conn.cursor()
            return fn(cursor, *arg, **kw)
        finally:
            conn.close()
    return _decorated

def escape_glob(glob):
    return re.sub(r'([\\\[\]?*])', r'\\\1', glob)

def get_stops(cursor, q, ll):
    fields = ['stop_name.id', 'stop_name.name', 'stop.lat', 'stop.lng']
    clauses = ['stop_name.id = stop.name_id']
    sql_params = []
    
    if q:
        clauses.append('name glob ?')
        esq = '%s*' % escape_glob(q)
        sql_params.extend((esq,))
    elif ll:
        m = re.match(r'^(-?\d+\.?\d*),(-?\d+\.?\d*)$', ll)
        if m:
            lat, lng = m.groups()
            lat, lng = float(lat), float(lng)
            
            fields.append('haversine(stop.lat, stop.lng, ?, ?) as distance')
            sql_params.extend((lat, lng))
    
    sql = 'select %s from stop_name, stop' % (', '.join(fields))
    
    if clauses:
        sql += (' where %s' % (' and '.join(clauses)))
    
    sql += ' order by name asc limit 60'
    
    stops = cursor.execute(sql, sql_params)
    for stop in stops:
        id, name, lat, lng = stop[:4]
        json = { 'id': id, 'name': name, 'lat': lat, 'lng': lng }
        if len(stop) > 4:
            json['distance'] = stop[4]
        yield json

@with_db_cursor
def find_stop_name(cursor, name_id):
    sql = 'select name from stop_name where id = ?'
    results = cursor.execute(sql, (name_id,)).fetchone()
    if results:
        return results[0]
    return None

@route('/dyn/times/:name_id')
def times(name_id):
    stop_name = find_stop_name(name_id)
    if not stop_name:
        return { 'error': 'Unknown stop' }
    
    qs = urllib.urlencode({'stName': stop_name,
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
    
    return { 'name': stop_name, 'times': times }

@route('/dyn/search')
@with_db_cursor
def search(cursor):
    q = request.GET.get('q', None)
    ll = request.GET.get('ll', None)
    response.content_type = 'application/json'
    return json_dumps(list(get_stops(cursor, q, ll)))
    

@route('/buses.manifest')
def static_files():
    send_file('buses.manifest', root=STATIC_PATH, mimetype='text/cache-manifest')

@route('/')
@route('/(?P<filename>.*)')
def static_files(filename='index.html'):
    send_file(filename, root=STATIC_PATH)

if __name__ == '__main__':
    run()