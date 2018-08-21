#!/bin/bash
#Deploy to dev - call after some code changes and before running dev
#This will generate 'auto-generated' files such as minified css, js, etc.

pushd `dirname $0` > /dev/null
SCRIPT_PATH="$( cd "$(dirname "$0")" ; pwd -P )"
popd > /dev/null
PROJECT_ROOT="${SCRIPT_PATH}/../../"

#this doesn't actually minify but simply concats the js files
${PROJECT_ROOT}/deployment/scripts/minify.sh --sourcejsfolder ${PROJECT_ROOT}/src/client/web/public/js --minjsfolder ${PROJECT_ROOT}/../public/js --sourcelessfolder ${PROJECT_ROOT}/src/server/less --mincssfolder ${PROJECT_ROOT}/../public/css --concatonly