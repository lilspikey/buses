import os
import os.path

# Change working directory so relative paths (and template lookup) work again
os.chdir(os.path.dirname(__file__))

import bottle

import buses

application = bottle.default_app()