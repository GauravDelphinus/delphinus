#Setup on staging - only required once (not for every check-in) for setting up directories, links, etc.

pushd `dirname $0` > /dev/null
SCRIPT_PATH="$( cd "$(dirname "$0")" ; pwd -P )"
popd > /dev/null
PROJECT_ROOT="${SCRIPT_PATH}/../../"

pm2 deploy ${PROJECT_ROOT}/deployment/aws/ecosystem.config.js staging setup