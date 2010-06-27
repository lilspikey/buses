from __future__ import with_statement
from fabric.api import local, put, cd, run

'''
Really minimal fab file, just tar.gz's content, uploads to remove directory,
unpacks then touches wsgi file

Will need to specify specific settings, e.g.:

fab --user=<user> --hosts=<host> deploy:webapps/buses/app/
'''

def deploy(remote_dir):
    local('git archive --format=tar HEAD | gzip > /tmp/buses.tar.gz')
    put('/tmp/buses.tar.gz', remote_dir)
    with cd(remote_dir):
            run('tar xzf buses.tar.gz')
            run('touch buses.wsgi')