#Deploy to dev - call after some code changes and before running dev
#This will generate 'auto-generated' files such as minified css, js, etc.

#Call from src/server (or similar level) directory

#this doesn't actually minify but simply concats the js files
../../deployment/scripts/minify.sh --sourcejsfolder ../../src/client/web/public/js --minjsfolder ../../../public/js --sourcelessfolder ../../src/server/less --mincssfolder ../../../public/css --concatonly