from bottle import route, send_file, request, response, json_dumps, run

import os.path
import sqlite3 as db

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
    sql = 'select distinct name from stop'
    sql_params = []
    clauses = []
    
    if q:
        clauses.append('name glob ? or naptan = ?')
        esq = '%s*' % escape_glob(q)
        sql_params.extend((esq, q))
    
    if clauses:
        sql += (' where %s' % (' and '.join(clauses)))
    
    sql += ' order by name asc limit 30'
    
    stops = cursor.execute(sql, sql_params)
    for (name,) in stops:
        yield name

@route('/dyn/times/:stop')
def times(stop):
    pass

@route('/dyn/search')
@with_db_cursor
def search(cursor):
    q = request.GET.get('q', None)
    response.content_type = 'application/json'
    return json_dumps(list(get_stops(cursor, q)))
    

# TODO need to set correct mimetype for manifest

@route('/')
@route('/(?P<filename>.*)')
def static_files(filename='index.html'):
    send_file(filename, root=STATIC_PATH)

if __name__ == '__main__':
    run()