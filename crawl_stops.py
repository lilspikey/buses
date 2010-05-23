#!/usr/bin/env python2.5

import httplib
import urllib2
import simplejson
import re
import sqlite3 as db
import os.path
from BeautifulSoup import BeautifulSoup
import time

def with_db_cursor(fn):
    def _decorated(*arg, **kw):
        committed = False
        current_dir = os.path.dirname(os.path.abspath(__file__))
        db_file = os.path.join(current_dir, 'buses.db')
        conn = db.connect(db_file)
        try:
            cursor = conn.cursor()
            val = fn(cursor, *arg, **kw)
            committed = True
            conn.commit()
            return val
        finally:
            if not committed:
                conn.rollback()
            conn.close()
    return _decorated

def rate_limit(fn):
    def _decorated(*arg, **kw):
        time.sleep(0.25)
        return fn(*arg, **kw)
    return _decorated

@rate_limit
def query_api(path, json):
    json = simplejson.dumps(json)
    c=httplib.HTTPConnection('buses.co.uk')
    c.request('POST',
              '/busmappingservice/BusesPublic.asmx/%s' % path,
              json,
              { 'Content-Type': 'application/json; charset=utf-8'})
    r=c.getresponse()
    reply_json = r.read()
    # response is actually a javascript string
    reply_json = simplejson.loads(reply_json)
    # strip var response =
    reply_json = re.sub(r'^var\s*\w+\s*=\s*', '', reply_json)
    # strip last semi-colon
    reply_json = re.sub(r';?$', '', reply_json)
    # quote field names
    reply_json = re.sub(r'(?:(\w+)\s*:)', r'"\1":', reply_json)
    return simplejson.loads(reply_json)

def get_service_info(service_id):
    return query_api('getServiceInfo', {'serviceid': service_id})

def get_route_stops(route_id):
    return query_api('getRouteStops', {'routeid': route_id})

def get_service_ids():
    html = urllib2.urlopen('http://buses.co.uk/')
    soup = BeautifulSoup(html,convertEntities=BeautifulSoup.HTML_ENTITIES)
    select = soup.find('select', {'id':'selectService'})
    options = select.findAll('option')
    ids = [int(o['value']) for o in options]
    return [i for i in ids if i > 0]

@with_db_cursor
def create_db(cursor):
    statements = [
        #'create table if not exists service (id integer primary key, name text, description text)',
        #'create index if not exists service_name_index on service (name)',
        #'create table if not exists route (id integer primary key, service_id integer, name text)',
        #'create index if not exists route_service_id_index on route (service_id)',
        'create table if not exists stop (id integer primary key, name text unique, lat real, lng real)',
        'create index if not exists stop_name_index on stop (name)',
        'create index if not exists stop_lat_index on stop (lat)',
        'create index if not exists stop_lng_index on stop (lng)',
        'create index if not exists stop_lat_lng_index on stop (lat,lng)',
        #'create table if not exists route_stop (route_id integer, stop_id integer, unique(route_id, stop_id))',
    ]
    for stmt in statements:
        cursor.execute(stmt)

@with_db_cursor
def insert_services(cursor, services_with_routes):
    services = [(id, name, description) for (id, name, description, _) in services_with_routes]
    cursor.executemany('insert or replace into service (id, name, description) values(?,?,?)', services)

@with_db_cursor
def insert_routes(cursor, routes):
    cursor.executemany('insert or replace into route (id, service_id, name) values(?,?,?)', routes)

@with_db_cursor
def insert_stops(cursor, stops):
    '''
    We will merge stops with the same name, as when we get times
    it is always for both/all stops with that name anyway
    '''
    
    stops_by_name = {}
    
    for stop_id, stop_name, naptan_code, lat, lng in stops:
        by_name = stops_by_name.get(stop_name, [])
        by_name.append((float(lat), float(lng)))
        stops_by_name[stop_name] = by_name
    
    names = list(stops_by_name.keys())
    names.sort()
    merged_stops = []
    for name in names:
        all_coords = stops_by_name[name]
        lat_sum, lng_sum = 0, 0
        for lat, lng in all_coords:
            lat_sum += lat
            lng_sum += lng
        lat = lat_sum/len(all_coords)
        lng = lng_sum/len(all_coords)
        merged_stops.append((name, lat, lng))
        
    cursor.executemany('insert or replace into stop (name, lat, lng) values(?,?,?)', merged_stops)

@with_db_cursor
def insert_stop_route_m2m(cursor, m2m):
    cursor.executemany('insert or replace into route_stop (route_id, stop_id) values(?,?)', m2m)

def extract_routes_from_services(services_with_routes):
    for service_id, _, _, service_routes in services_with_routes:
        for route_id, route_name in service_routes:
            yield route_id, service_id, route_name

def retrieve_services():
    for service_id in get_service_ids():
        service_info = get_service_info(service_id)
        service = service_info['service']
        service_name = service['serviceName']
        service_description = service['serviceDescription']
        routes = service.get('routes', [])
        routes = [(route['routeId'], route['routeName']) for route in routes]
        print 'Service %s' % service_name
        yield service_id, service_name, service_description, routes

def retrieve_stops_for_routes(routes):
    for route_id, service_id, route_name in routes:
        print 'Stops for route %s' % route_name
        stops_info = get_route_stops(route_id)
        stops = stops_info['stops']
        for stop in stops:
            stop_id = stop['stopId']
            stop_name = stop['gpsStopName']
            naptan_code = stop['naptanCode']
            lat = stop['Lat']
            lng = stop['Lng']
            
            yield route_id, stop_id, stop_name, naptan_code, lat, lng

def extract_stops_and_m2m(stops_for_routes):
    stops = [(stop_id, stop_name, naptan_code, lat, lng) for (_, stop_id, stop_name, naptan_code, lat, lng) in stops_for_routes]
    m2m = [(route_id, stop_id) for (route_id, stop_id, _, _, _, _) in stops_for_routes]
    
    return set(stops), m2m


def main():
    create_db()
    
    services = list(retrieve_services())
    print "Found %s services" % len(services)
    #insert_services(services)
    
    routes = list(extract_routes_from_services(services))
    print "Found %s routes" % len(routes)
    #insert_routes(routes)
    
    stops_for_routes = list(retrieve_stops_for_routes(routes))
    stops, m2m = extract_stops_and_m2m(stops_for_routes)
    
    print "Inserting %s stops" % len(stops)
    insert_stops(stops)
    
    #print "Inserting %s route/stops" % len(m2m)
    #insert_stop_route_m2m(m2m)

if __name__ == '__main__':
    main()
