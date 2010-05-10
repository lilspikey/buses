from bottle import route, send_file, run

import os.path

ROOT_PATH = os.path.dirname(os.path.abspath(__file__))
STATIC_PATH = os.path.join(ROOT_PATH, 'static')

DB_FILE = os.path.join(ROOT_PATH, 'buses.db')

@route('/dyn/times/:stop')
def times(stop):
    pass

# TODO need to set correct mimetype for manifest

@route('/')
@route('/(?P<filename>.*)')
def static_files(filename='index.html'):
    send_file(filename, root=STATIC_PATH)

if __name__ == '__main__':
    run()