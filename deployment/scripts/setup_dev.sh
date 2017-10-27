#setup directories

#call from folder src/server (or similar level)

pushd `dirname $0` > /dev/null
SCRIPT_PATH="$( cd "$(dirname "$0")" ; pwd -P )"
popd > /dev/null
PROJECT_ROOT="${SCRIPT_PATH}/../../"

${PROJECT_ROOT}/deployment/scripts/setup_dirs.sh