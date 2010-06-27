import os
import os.path
import sys

# Change working directory so relative paths (and template lookup) work again
os.chdir(os.path.dirname(__file__))

sys.path = [os.path.dirname(__file__)] + sys.path

import bottle

import buses

application = bottle.default_app()