#!/usr/bin/env python2.5

import simplejson
import cgi
import os.path

import cgitb
cgitb.enable()

import sqlite3 as db

def write_output(output):
    print "Content: text/javascript"
    print
    print output

def escape_glob(glob):
    import re
    return re.sub(r'([\\*])', r'\\\1', glob)

def find_stops(q=None):
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_file = os.path.join(current_dir, 'buses.db')
    
    conn = db.connect(db_file)
    try:
        cursor = conn.cursor()
        
        sql = 'select name, naptan from stop'
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
        for name, naptan in stops:
            yield name, naptan
    finally:
        conn.close()


def main():
    form = cgi.FieldStorage()
    q = form.getfirst('q','')
    
    stops = find_stops(q=q)
    
    stops = [dict(name=name, naptan=naptan) for (name, naptan) in stops]
    
    write_output(simplejson.dumps(stops))

if __name__ == '__main__':
    main()