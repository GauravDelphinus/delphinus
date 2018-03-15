#Set up the default .env file for CI machines

pushd `dirname $0` > /dev/null
SCRIPT_PATH="$( cd "$(dirname "$0")" ; pwd -P )"
popd > /dev/null
PROJECT_ROOT="${SCRIPT_PATH}/../../"

cp ${PROJECT_ROOT}/deployment/.env_ci ${PROJECT_ROOT}/src/server/.env