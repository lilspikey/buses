#!/usr/bin/env python2.5

import httplib
import urllib2
import simplejson
import re
import sqlite3 as db
from BeautifulSoup import BeautifulSoup
import time

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

def main():
    #print simplejson.dumps(query_api('getRouteStops', {'routeid':'60'}), indent=2)

    for service_id in get_service_ids():
        service_info = get_service_info(service_id)
        service = service_info['service']
        service_name = service['serviceName']
        routes = service.get('routes', [])
        for route in routes:
            route_name = route['routeName']
            route_id   = route['routeId']
            print service_name, route_name, route_id
            stops_info = get_route_stops(route_id)
            stops = stops_info['stops']
            for stop in stops:
                stop_id = stop['stopId']
                stop_name = stop['stopName']
                naptan_code = stop['naptanCode']
                lat = stop['Lat']
                lng = stop['Lng']
                
                print ' ', stop_id, stop_name, naptan_code, lat, lng
                print ' ', service_id, route_id, stop_id
    

if __name__ == '__main__':
    main()
