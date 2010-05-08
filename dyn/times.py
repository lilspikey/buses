#!/usr/bin/env python2.5

from BeautifulSoup import BeautifulSoup
import simplejson
import urllib
import cgi

import cgitb
cgitb.enable()

import os.path
import sqlite3 as db

def write_output(output):
    print "Content: text/javascript"
    print
    print output

def does_stop_exist(stop):

    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_file = os.path.join(current_dir, 'buses.db')

    conn = db.connect(db_file)
    try:
        cursor = conn.cursor()

        sql = 'select name from stop where name = ?'
        
        return cursor.execute(sql, (stop,)).fetchone() is not None
    finally:
        conn.close()

def create_json(stop, times):
    json = { 'name': stop, 'times': times }
    return simplejson.dumps(json)

def main():
    form = cgi.FieldStorage()
    stop = form.getfirst('stop','')
    
    if not does_stop_exist(stop):
        json = { 'error': 'Unknown stop' }
        return write_output(simplejson.dumps(json))
    
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
    write_output(create_json(stop, times))

if __name__ == '__main__':
    main()